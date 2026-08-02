import { promises as dns } from "node:dns";
import net from "node:net";

function isPrivateIpv4(address) {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateAddress(address) {
  if (net.isIP(address) === 4) return isPrivateIpv4(address);
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") ||
    normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

/**
 * Validates a user-supplied URL before the server makes an outbound request.
 * This protects internal services and cloud metadata endpoints from SSRF.
 */
export async function assertPublicHttpUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid public website URL.");
  }

  if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
    throw new Error("Only public HTTP(S) URLs are allowed.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || net.isIP(hostname) && isPrivateAddress(hostname)) {
    throw new Error("Private or local network addresses cannot be scanned.");
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("That website could not be resolved.");
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private or local network addresses cannot be scanned.");
  }

  return url;
}
