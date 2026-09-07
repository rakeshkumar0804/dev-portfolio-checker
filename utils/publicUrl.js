import { promises as dns } from "node:dns";
import net from "node:net";

export function isPrivateIpv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;
  const [a, b, c, d] = parts;
  return (
    a === 0 || // 0.0.0.0/8 Current network
    a === 10 || // 10.0.0.0/8 Private network
    a === 127 || // 127.0.0.0/8 Loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 Carrier-Grade NAT
    (a === 169 && b === 254) || // 169.254.0.0/16 Link-local / Cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 Private network
    (a === 192 && b === 0 && c === 0) || // 192.0.0.0/24 IETF Protocol
    (a === 192 && b === 0 && c === 2) || // 192.0.2.0/24 TEST-NET-1
    (a === 192 && b === 88 && c === 99) || // 192.88.99.0/24 6to4 relay
    (a === 192 && b === 168) || // 192.168.0.0/16 Private network
    (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15 Benchmarking
    (a === 198 && b === 51 && c === 100) || // 198.51.100.0/24 TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // 203.0.113.0/24 TEST-NET-3
    a >= 224 // 224.0.0.0/4 Multicast & 240.0.0.0/4 Reserved/Broadcast
  );
}

export function isPrivateIpv6(address) {
  const clean = address.replace(/^\[|\]$/g, "").toLowerCase();

  // Unspecified & Loopback
  if (
    clean === "::" ||
    clean === "::1" ||
    clean === "0:0:0:0:0:0:0:1" ||
    clean === "0:0:0:0:0:0:0:0"
  ) {
    return true;
  }

  // Unique Local Address (fc00::/7 -> starts with fc or fd)
  if (clean.startsWith("fc") || clean.startsWith("fd")) {
    return true;
  }

  // Link-local unicast (fe80::/10 -> starts with fe8, fe9, fea, feb)
  if (
    clean.startsWith("fe8") ||
    clean.startsWith("fe9") ||
    clean.startsWith("fea") ||
    clean.startsWith("feb")
  ) {
    return true;
  }

  // Site-local unicast (fec0::/10 -> starts with fec, fed, fee, fef)
  if (
    clean.startsWith("fec") ||
    clean.startsWith("fed") ||
    clean.startsWith("fee") ||
    clean.startsWith("fef")
  ) {
    return true;
  }

  // Multicast (ff00::/8)
  if (clean.startsWith("ff")) {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:x.x.x.x or ::ffff:hex:hex)
  if (clean.includes("::ffff:")) {
    const tail = clean.split("::ffff:")[1];
    if (tail) {
      if (net.isIP(tail) === 4) {
        return isPrivateIpv4(tail);
      }
      const hexParts = tail.split(":");
      if (hexParts.length === 2) {
        const p1 = parseInt(hexParts[0], 16);
        const p2 = parseInt(hexParts[1], 16);
        if (!isNaN(p1) && !isNaN(p2)) {
          const octet1 = (p1 >> 8) & 0xff;
          const octet2 = p1 & 0xff;
          const octet3 = (p2 >> 8) & 0xff;
          const octet4 = p2 & 0xff;
          const mappedIpv4 = `${octet1}.${octet2}.${octet3}.${octet4}`;
          return isPrivateIpv4(mappedIpv4);
        }
      }
    }
    return true; // Reject unparseable IPv4-mapped IPv6
  }

  return false;
}

export function isPrivateAddress(address) {
  if (!address) return false;
  const clean = address.replace(/^\[|\]$/g, "");
  const ipVer = net.isIP(clean);
  if (ipVer === 4) return isPrivateIpv4(clean);
  if (ipVer === 6) return isPrivateIpv6(clean);
  return false;
}

export function isUnsafeHost(hostname) {
  if (!hostname) return true;
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal")
  ) {
    return true;
  }

  if (
    h === "metadata.google.internal" ||
    h === "metadata.azure.com" ||
    h === "instance-data" ||
    h === "metadata"
  ) {
    return true;
  }

  if (isPrivateAddress(h)) {
    return true;
  }

  return false;
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
    const err = new Error("Enter a valid public website URL.");
    err.statusCode = 400;
    throw err;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    const err = new Error("Only public HTTP(S) URLs are allowed.");
    err.statusCode = 400;
    throw err;
  }

  if (url.username || url.password) {
    const err = new Error("Only public HTTP(S) URLs are allowed.");
    err.statusCode = 400;
    throw err;
  }

  const hostname = url.hostname.toLowerCase();
  if (isUnsafeHost(hostname)) {
    const err = new Error("Private or local network addresses cannot be scanned.");
    err.statusCode = 400;
    throw err;
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname.replace(/^\[|\]$/g, ""), { all: true, verbatim: true });
  } catch {
    const err = new Error("That website could not be resolved.");
    err.statusCode = 400;
    throw err;
  }

  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    const err = new Error("Private or local network addresses cannot be scanned.");
    err.statusCode = 400;
    throw err;
  }

  return url;
}
