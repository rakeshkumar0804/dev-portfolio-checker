import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import puppeteer from "puppeteer-core";
import { assertPublicHttpUrl, isUnsafeHost } from "../utils/publicUrl.js";

const CRAWL_TIMEOUT_MS = 5500;
const NAVIGATION_TIMEOUT_MS = 4000;

// Launches a browser compatible with both Vercel serverless and local environments
async function launchBrowser(options = {}) {
  const timeout = options.timeout || CRAWL_TIMEOUT_MS;

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium-min")).default;
    const executablePath = await chromium.executablePath(
      "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
    );
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
      timeout,
    });
  }

  const localPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Google\\Chrome Beta\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  const executablePath = localPaths.find((p) => {
    try { return fs.existsSync(p); } catch (_) { return false; }
  });
  if (!executablePath) throw new Error("No local Chrome/Chromium found. Install Google Chrome.");

  return puppeteer.launch({
    executablePath,
    headless: true,
    timeout,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
    ],
  });
}

function isUnhydratedShell(html) {
  if (!html || typeof html !== "string") return true;
  const $ = cheerio.load(html);
  const root = $("#root, #app, #__next");
  const hasEmptyRoot = root.length > 0 && root.children().length === 0 && root.text().trim().length === 0;
  const bodyText = $("body").text().trim();
  const realAnchors = $("a[href]").filter((_, el) => !$(el).closest("noscript").length);
  if (hasEmptyRoot && (bodyText.length < 350 || realAnchors.length === 0)) {
    return true;
  }
  return false;
}

export async function fetchPortfolioData(url) {
  let targetUrl = url.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  try {
    targetUrl = (await assertPublicHttpUrl(targetUrl)).toString();
  } catch (err) {
    return buildResult(null, targetUrl, false, err.message, 400, null, "failed");
  }

  let html = "";
  let fetchError = null;
  let finalUrl = targetUrl;
  let isHttps = targetUrl.startsWith("https://");
  let statusCode = null;
  let responseTimeMs = null;
  let inspectionStatus = "complete"; // "complete" | "incomplete_shell" | "failed"

  const startTime = Date.now();

  // 1. Fast static fetch via Axios for headers, status, response time
  try {
    const { response, finalUrl: resolvedUrl } = await fetchPublicPage(targetUrl);
    html = response.data || "";
    finalUrl = resolvedUrl;
    isHttps = finalUrl.startsWith("https://");
    statusCode = response.status;
    responseTimeMs = Date.now() - startTime;
  } catch (err) {
    if (err.code === "ECONNABORTED" || err.message?.toLowerCase().includes("timeout")) {
      fetchError = "Website request timed out.";
    } else {
      fetchError = err.message;
    }
    responseTimeMs = Date.now() - startTime;
    return buildResult(null, targetUrl, isHttps, fetchError, statusCode, responseTimeMs, "failed");
  }

  // 2. Headless Puppeteer render for SPA JavaScript hydration (React, Vite, Vue, Next.js)
  let renderedHtml = html;
  let browser = null;
  let isCancelled = false;
  let crawlTimer = null;

  try {
    const browserPromise = launchBrowser({ timeout: CRAWL_TIMEOUT_MS }).then((b) => {
      if (isCancelled) {
        if (b) b.close().catch(() => {});
        return null;
      }
      browser = b;
      return b;
    });

    const crawlWork = (async () => {
      const b = await browserPromise;
      if (!b) return html;

      const page = await b.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
      page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);

      // Subresource SSRF protection
      await page.setRequestInterception(true);
      page.on("request", async (interceptedReq) => {
        const reqUrl = interceptedReq.url();
        if (reqUrl.startsWith("data:")) return interceptedReq.continue();

        try {
          const parsed = new URL(reqUrl);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return interceptedReq.abort("blockedbyclient");
          }
          if (parsed.username || parsed.password) {
            return interceptedReq.abort("blockedbyclient");
          }
          if (isUnsafeHost(parsed.hostname)) {
            return interceptedReq.abort("blockedbyclient");
          }
          if (interceptedReq.isNavigationRequest()) {
            await assertPublicHttpUrl(reqUrl);
          }
          return interceptedReq.continue();
        } catch {
          return interceptedReq.abort("blockedbyclient");
        }
      });

      // Navigate with DOM content loaded
      await page.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });

      // Observable readiness condition: wait for SPA hydration
      await page.waitForFunction(() => {
        const root = document.getElementById("root") || document.getElementById("app") || document.getElementById("__next");
        if (root && root.children.length > 0) return true;
        if (document.querySelector("h1, h2, nav, main, section")) return true;
        if (document.querySelectorAll("a[href]").length >= 3) return true;
        if (document.body && document.body.innerText.trim().length > 300) return true;
        return false;
      }, { timeout: 2000 }).catch(() => {});

      return await page.content();
    })();

    const timeoutPromise = new Promise((_, reject) => {
      crawlTimer = setTimeout(() => {
        isCancelled = true;
        reject(new Error("Headless render timed out"));
      }, CRAWL_TIMEOUT_MS);
    });

    renderedHtml = await Promise.race([crawlWork, timeoutPromise]);
    inspectionStatus = "complete";
  } catch (renderErr) {
    console.warn("⚠️ Headless render fallback check:", renderErr.message?.slice(0, 100));
    if (isUnhydratedShell(html)) {
      inspectionStatus = "incomplete_shell";
      fetchError = "Client-side rendering timed out; page requires JavaScript hydration.";
    } else {
      inspectionStatus = "complete";
      renderedHtml = html;
    }
  } finally {
    isCancelled = true;
    if (crawlTimer) {
      clearTimeout(crawlTimer);
      crawlTimer = null;
    }
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
      browser = null;
    }
  }

  const $ = cheerio.load(renderedHtml);
  return buildResult($, finalUrl, isHttps, fetchError, statusCode, responseTimeMs, inspectionStatus);
}

async function fetchPublicPage(initialUrl) {
  let currentUrl = initialUrl;
  for (let redirects = 0; redirects <= 2; redirects++) {
    await assertPublicHttpUrl(currentUrl);
    const response = await axios.get(currentUrl, {
      timeout: 3500,
      maxRedirects: 0,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DevPortfolioChecker/2.1)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      validateStatus: () => true,
    });
    if (response.status < 300 || response.status >= 400) return { response, finalUrl: currentUrl };
    const location = response.headers.location;
    if (!location) return { response, finalUrl: currentUrl };
    currentUrl = new URL(location, currentUrl).toString();
  }
  throw new Error("Too many redirects while loading that website.");
}

export function buildResult($, url, isHttps, fetchError, statusCode, responseTimeMs, inspectionStatus = "complete") {
  if (!$ || fetchError || inspectionStatus === "incomplete_shell" || inspectionStatus === "failed") {
    const isShell = inspectionStatus === "incomplete_shell";
    return {
      url,
      accessible: false,
      inspectionStatus: inspectionStatus || "failed",
      fetchError: fetchError || (isShell ? "Page requires client-side JavaScript hydration." : "Could not load page"),
      isHttps,
      statusCode,
      responseTimeMs,
      seo: {},
      content: {},
      accessibility: {},
      social: {},
      checklist: buildFailedChecklist(isShell ? "unavailable" : "absent", fetchError),
    };
  }

  // ── SEO ──
  const title = $("title").first().text().trim();
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";
  const ogImage = $('meta[property="og:image"]').attr("content") || "";
  
  // Exclude noscript h1 if body has rendered elements
  const allH1 = $("h1").map((_, el) => $(el).text().trim()).get();
  const nonNoScriptH1 = $("body h1").not("noscript h1").map((_, el) => $(el).text().trim()).get();
  const h1Tags = nonNoScriptH1.length > 0 ? nonNoScriptH1 : allH1;
  const viewportMeta = $('meta[name="viewport"]').attr("content") || "";

  // ── Body text analysis ──
  const bodyText = $("body").text().toLowerCase();
  const htmlContent = $("body").html() || "";

  // ── Email detection ──
  const emailSet = new Set();
  const addEmail = (raw) => {
    if (!raw) return;
    try {
      const decoded = decodeURIComponent(raw).toLowerCase().trim();
      const match = decoded.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) {
        const e = match[0];
        if (!e.includes("example") && !e.includes("placeholder") && !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".svg")) {
          emailSet.add(e);
        }
      }
    } catch (_) {}
  };

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const rawEmails = htmlContent.match(emailRegex) || [];
  rawEmails.forEach(addEmail);

  // ── Comprehensive Link Detection with Resolved URLs & Accessible Names ──
  const rawLinks = [];
  $("a").each((_, el) => {
    const rawHref = ($(el).attr("href") || "").trim();
    const text = $(el).text().trim();
    const aria = ($(el).attr("aria-label") || $(el).attr("aria-labelledby") || "").trim();
    const titleAttr = ($(el).attr("title") || "").trim();
    const download = ($(el).attr("download") || "").trim();
    
    // Check child SVG or icon titles/labels
    const childSvgAria = $(el).find("svg[aria-label], svg[role='img']").attr("aria-label") || "";
    const childSvgTitle = $(el).find("svg title").text().trim();
    const combinedAccessibleName = [aria, titleAttr, childSvgAria, childSvgTitle].filter(Boolean).join(" ");

    let resolvedUrl = null;
    let hostname = "";
    let pathname = "";
    if (rawHref) {
      try {
        const u = new URL(rawHref, url);
        resolvedUrl = u.toString();
        hostname = u.hostname.toLowerCase();
        pathname = u.pathname;
      } catch (_) {}
    }

    rawLinks.push({
      rawHref,
      resolvedUrl,
      hostname,
      pathname,
      text,
      accessibleName: combinedAccessibleName,
      download,
    });

    if (rawHref.includes("mailto:") || rawHref.includes("to=") || /email|mail/i.test(combinedAccessibleName) || /email|mail/i.test(text)) {
      addEmail(rawHref);
    }
  });

  const emailsFound = Array.from(emailSet);

  // 1. Resume / CV Link Detection
  let detectedResume = null;
  for (const l of rawLinks) {
    const rawH = l.rawHref.toLowerCase();
    const resH = (l.resolvedUrl || "").toLowerCase();
    const t = l.text.toLowerCase();
    const a = l.accessibleName.toLowerCase();
    const d = l.download.toLowerCase();
    const path = l.pathname.toLowerCase();

    // Check extension
    const hasDocExt = /\.(pdf|docx?)(?:[?#]|$)/i.test(path) || /\.(pdf|docx?)(?:[?#]|$)/i.test(rawH);
    // Check keywords
    const hasResumeKeyword = /resume|curriculum[-_]?vitae|\bcv\b/i.test(rawH) ||
      /resume|curriculum[-_]?vitae|\bcv\b/i.test(resH) ||
      /resume|curriculum\s*vitae|\bcv\b|credentials/i.test(t) ||
      /resume|curriculum\s*vitae|\bcv\b/i.test(a) ||
      /resume|curriculum\s*vitae|\bcv\b/i.test(d);
    // Known doc hosts
    const isDocHost = /drive\.google\.com|docs\.google\.com\/document|dropbox\.com|notion\.so|notion\.site|rxresu\.me|flowcv\.me|read\.cv|canva\.com/i.test(resH);

    if (hasDocExt || (hasResumeKeyword && (l.resolvedUrl || l.rawHref)) || isDocHost) {
      detectedResume = {
        url: l.resolvedUrl || l.rawHref,
        text: l.text || l.accessibleName || "Download Resume",
        method: hasDocExt ? "Document file (.pdf/.doc)" : isDocHost ? "Hosted document link" : "Resume anchor match",
      };
      break;
    }
  }

  // 2. GitHub Link Detection
  let detectedGithub = null;
  for (const l of rawLinks) {
    const isGhHost = l.hostname === "github.com" || l.hostname.endsWith(".github.com");
    const hasGhHref = l.rawHref.includes("github.com/");
    const hasGhAria = /github/i.test(l.accessibleName) || /github/i.test(l.text);

    if ((isGhHost || hasGhHref || hasGhAria) && l.rawHref && !l.rawHref.endsWith("github.com") && !l.rawHref.endsWith("github.com/")) {
      detectedGithub = {
        url: l.resolvedUrl || l.rawHref,
        text: l.text || l.accessibleName || "GitHub",
        method: isGhHost ? "Resolved GitHub hostname" : "GitHub anchor match",
      };
      break;
    }
  }

  // 3. LinkedIn Link Detection
  let detectedLinkedin = null;
  for (const l of rawLinks) {
    const isLiHost = l.hostname === "linkedin.com" || l.hostname.endsWith(".linkedin.com");
    const hasLiHref = l.rawHref.includes("linkedin.com/in/") || l.rawHref.includes("linkedin.com/pub/");
    const hasLiAria = /linkedin/i.test(l.accessibleName) || /linkedin/i.test(l.text);

    if ((isLiHost || hasLiHref || hasLiAria) && l.rawHref) {
      detectedLinkedin = {
        url: l.resolvedUrl || l.rawHref,
        text: l.text || l.accessibleName || "LinkedIn",
        method: isLiHost ? "Resolved LinkedIn hostname" : "LinkedIn anchor match",
      };
      break;
    }
  }

  // 4. Twitter / X Link Detection
  let detectedTwitter = null;
  for (const l of rawLinks) {
    const isTwHost = l.hostname === "twitter.com" || l.hostname === "x.com" || l.hostname.endsWith(".x.com");
    const hasTwHref = l.rawHref.includes("twitter.com/") || l.rawHref.includes("x.com/");
    const hasTwAria = /twitter|\bx\.com\b/i.test(l.accessibleName);

    if ((isTwHost || hasTwHref || hasTwAria) && l.rawHref) {
      detectedTwitter = {
        url: l.resolvedUrl || l.rawHref,
        text: l.text || l.accessibleName || "Twitter/X",
        method: isTwHost ? "Resolved Twitter/X hostname" : "Twitter/X anchor match",
      };
      break;
    }
  }

  // ── Content Sections ──
  const projectElements = $('[id*="project"], [class*="project"], [id*="work"], [class*="work"], [id="systems"], section[id*="system"]');
  const hasProjectHeading = $("h1, h2, h3, h4").filter((_, el) => /project|portfolio|work|deployed\s*systems/i.test($(el).text())).length > 0;
  const hasProjectSection = projectElements.length > 0 || hasProjectHeading || bodyText.includes("project") || bodyText.includes("portfolio");

  const contactElements = $('[id*="contact"], [class*="contact"], [id*="comms"], [class*="comms"], section[id="contact"]');
  const hasContactHeading = $("h1, h2, h3, h4").filter((_, el) => /contact|get in touch|reach out|establish\s*comms/i.test($(el).text())).length > 0;
  const hasContactForm = $("form").length > 0;
  const hasContactSection = contactElements.length > 0 || hasContactHeading || hasContactForm || emailsFound.length > 0 || bodyText.includes("contact");

  // ── Accessibility ──
  const imgTags = $("img");
  const imgsTotal = imgTags.length;
  const imgsWithAlt = imgTags.filter((_, el) => ($(el).attr("alt") || "").trim().length > 0).length;

  let altTagCheck;
  if (imgsTotal === 0) {
    altTagCheck = {
      pass: false,
      status: "not_applicable",
      label: "Image Alt Tags (N/A — No images)",
      importance: "medium",
      hint: "No image elements found on page. Check is not applicable.",
      evidence: "No <img> elements found on page (check is not applicable)",
    };
  } else {
    const ratio = imgsWithAlt / imgsTotal;
    const isPass = ratio >= 0.8;
    altTagCheck = {
      pass: isPass,
      status: isPass ? "present" : "absent",
      label: "Image Alt Texts",
      importance: "medium",
      hint: "Add alt attributes to all your <img> tags for accessibility and SEO.",
      evidence: `${imgsWithAlt}/${imgsTotal} images have descriptive alt text (${Math.round(ratio * 100)}%)`,
    };
  }

  // ── Page size estimate ──
  const htmlSize = htmlContent.length;
  const hasReasonableSize = htmlSize < 500000;

  const checklist = {
    isHttps: {
      pass: isHttps,
      status: isHttps ? "present" : "absent",
      label: "HTTPS Secure",
      importance: "critical",
      hint: "Deploy your site to HTTPS. Netlify and Vercel provide this automatically.",
      evidence: isHttps ? "Site served over secure HTTPS protocol" : "Site is served over unencrypted HTTP",
    },
    isAccessible: {
      pass: statusCode >= 200 && statusCode < 400,
      status: (statusCode >= 200 && statusCode < 400) ? "present" : "absent",
      label: "Site Accessible",
      importance: "critical",
      hint: "Make sure your site is publicly accessible.",
      evidence: `HTTP status code ${statusCode || 200} (response time: ${responseTimeMs || 0}ms)`,
    },
    hasTitle: {
      pass: title.length > 0,
      status: title.length > 0 ? "present" : "absent",
      label: "Page Title",
      importance: "high",
      hint: "Add a <title> tag to your HTML head.",
      evidence: title.length > 0 ? `<title>: "${title.slice(0, 60)}"` : "Missing <title> tag in HTML head",
    },
    hasTitleOptimal: {
      pass: title.length >= 20 && title.length <= 70,
      status: (title.length >= 20 && title.length <= 70) ? "present" : "absent",
      label: "Title Length (20–70)",
      importance: "medium",
      hint: "Make your title 20–70 characters for best SEO.",
      evidence: `Title length is ${title.length} characters (${title.length >= 20 && title.length <= 70 ? "optimal" : "suboptimal"})`,
    },
    hasMetaDescription: {
      pass: metaDesc.length > 0,
      status: metaDesc.length > 0 ? "present" : "absent",
      label: "Meta Description",
      importance: "high",
      hint: 'Add <meta name="description" content="..."> to your HTML head.',
      evidence: metaDesc.length > 0 ? `Meta description present (${metaDesc.length} chars)` : "Missing meta description",
    },
    hasMetaDescriptionOptimal: {
      pass: metaDesc.length >= 50 && metaDesc.length <= 160,
      status: (metaDesc.length >= 50 && metaDesc.length <= 160) ? "present" : "absent",
      label: "Description Length (50–160)",
      importance: "medium",
      hint: "Keep your meta description 50–160 characters.",
      evidence: `Meta description length is ${metaDesc.length} characters`,
    },
    hasH1: {
      pass: h1Tags.length > 0,
      status: h1Tags.length > 0 ? "present" : "absent",
      label: "H1 Heading",
      importance: "high",
      hint: "Add exactly one <h1> tag on your page for SEO.",
      evidence: h1Tags.length > 0 ? `Found ${h1Tags.length} H1 heading: "${h1Tags[0].slice(0, 60)}"` : "No <h1> heading detected on page",
    },
    hasSingleH1: {
      pass: h1Tags.length === 1,
      status: h1Tags.length === 1 ? "present" : "absent",
      label: "Single H1",
      importance: "medium",
      hint: "Use exactly one <h1> per page — multiple H1s confuse search engines.",
      evidence: `Found ${h1Tags.length} <h1> tag(s)`,
    },
    hasOgTags: {
      pass: ogTitle.length > 0 || ogDesc.length > 0,
      status: (ogTitle.length > 0 || ogDesc.length > 0) ? "present" : "absent",
      label: "Open Graph Tags",
      importance: "medium",
      hint: "Add og:title, og:description, og:image meta tags for social sharing.",
      evidence: (ogTitle || ogDesc) ? `Found Open Graph metadata (${ogTitle || ogDesc})` : "Missing Open Graph tags",
    },
    hasOgImage: {
      pass: ogImage.length > 0,
      status: ogImage.length > 0 ? "present" : "absent",
      label: "OG Social Image",
      importance: "low",
      hint: 'Add <meta property="og:image" content="..."> for beautiful social previews.',
      evidence: ogImage ? `OG image configured (${ogImage.slice(0, 50)})` : "Missing og:image social preview",
    },
    hasViewport: {
      pass: viewportMeta.toLowerCase().includes("width=device-width"),
      status: viewportMeta.toLowerCase().includes("width=device-width") ? "present" : "absent",
      label: "Mobile Viewport",
      importance: "critical",
      hint: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to your HTML head.',
      evidence: viewportMeta ? "Mobile viewport configured in head" : "Missing mobile viewport meta tag",
    },
    hasEmail: {
      pass: emailsFound.length > 0,
      status: emailsFound.length > 0 ? "present" : "absent",
      label: "Email Address",
      importance: "high",
      hint: "Add your email address visibly on your site so recruiters can contact you.",
      evidence: emailsFound.length > 0 ? `Found contact email: ${emailsFound[0]}` : "No email address found in page text or links",
    },
    hasContactSection: {
      pass: hasContactSection,
      status: hasContactSection ? "present" : "absent",
      label: "Contact Section",
      importance: "high",
      hint: "Add a dedicated contact section or page.",
      evidence: hasContactSection ? "Dedicated contact section or transmission channel verified" : "No contact section detected",
    },
    hasGithubLink: {
      pass: !!detectedGithub,
      status: detectedGithub ? "present" : "absent",
      label: "GitHub Link",
      importance: "high",
      hint: "Add a link to your GitHub profile in your navigation or footer.",
      evidence: detectedGithub ? `Verified GitHub link: ${detectedGithub.url} (${detectedGithub.text})` : "No link to GitHub profile detected",
      detectedUrl: detectedGithub?.url || null,
    },
    hasLinkedinLink: {
      pass: !!detectedLinkedin,
      status: detectedLinkedin ? "present" : "absent",
      label: "LinkedIn Link",
      importance: "medium",
      hint: "Add your LinkedIn profile link — many recruiters go straight there.",
      evidence: detectedLinkedin ? `Verified LinkedIn link: ${detectedLinkedin.url} (${detectedLinkedin.text})` : "No link to LinkedIn profile detected",
      detectedUrl: detectedLinkedin?.url || null,
    },
    hasTwitterLink: {
      pass: !!detectedTwitter,
      status: detectedTwitter ? "present" : "absent",
      label: "Twitter/X Link",
      importance: "low",
      hint: "Add your Twitter/X link if active in the developer community.",
      evidence: detectedTwitter ? `Verified Twitter/X link: ${detectedTwitter.url}` : "No link to Twitter/X detected",
      detectedUrl: detectedTwitter?.url || null,
    },
    hasResumeLink: {
      pass: !!detectedResume,
      status: detectedResume ? "present" : "absent",
      label: "Resume/CV Link",
      importance: "critical",
      hint: "Add a downloadable PDF resume link. This is the #1 thing recruiters look for.",
      evidence: detectedResume ? `Verified resume link: ${detectedResume.url} (${detectedResume.text})` : "No downloadable resume link or hosted document detected",
      detectedUrl: detectedResume?.url || null,
    },
    hasProjectSection: {
      pass: hasProjectSection,
      status: hasProjectSection ? "present" : "absent",
      label: "Projects Section",
      importance: "critical",
      hint: "Add a section showcasing your best 3–5 projects with descriptions and links.",
      evidence: hasProjectSection ? "Dedicated projects or deployed systems section verified" : "No projects section detected",
    },
    hasGoodAltTags: altTagCheck,
    hasReasonableSize: {
      pass: hasReasonableSize,
      status: hasReasonableSize ? "present" : "absent",
      label: "Page Size OK",
      importance: "low",
      hint: "Your page HTML is large. Optimize images and minimize unused code.",
      evidence: `HTML payload size is ${Math.round(htmlSize / 1024)} KB (< 500 KB)`,
    },
  };

  return {
    url,
    accessible: true,
    inspectionStatus: "complete",
    isHttps,
    statusCode,
    responseTimeMs,
    seo: {
      title,
      titleLength: title.length,
      metaDescription: metaDesc,
      metaDescriptionLength: metaDesc.length,
      ogTitle,
      ogDescription: ogDesc,
      ogImage,
      h1Tags,
      h1Count: h1Tags.length,
    },
    content: {
      hasProjectSection,
      hasContactSection,
      hasResumeLink: !!detectedResume,
      resumeUrl: detectedResume?.url || null,
      emailsFound: emailsFound.slice(0, 3),
    },
    accessibility: {
      hasGoodAltTags: altTagCheck.pass,
      imgsTotal,
      imgsWithAlt,
      altStatus: altTagCheck.status,
    },
    social: {
      hasGithubLink: !!detectedGithub,
      githubUrl: detectedGithub?.url || null,
      hasLinkedinLink: !!detectedLinkedin,
      linkedinUrl: detectedLinkedin?.url || null,
      hasTwitterLink: !!detectedTwitter,
      twitterUrl: detectedTwitter?.url || null,
    },
    checklist,
  };
}

function buildFailedChecklist(status = "unavailable", reason = null) {
  const isUnavail = status === "unavailable";
  const defaultEvidence = isUnavail
    ? "Inspection unavailable: page requires client-side JavaScript hydration which timed out"
    : "Inspection failed: site could not be accessed";

  const makeItem = (label, importance, hint) => ({
    pass: false,
    status,
    label,
    importance,
    hint,
    evidence: reason ? `${defaultEvidence} (${reason})` : defaultEvidence,
  });

  return {
    isHttps:            makeItem("HTTPS Secure", "critical", "Deploy your site to HTTPS."),
    isAccessible:       makeItem("Site Accessible", "critical", "Make sure your site is publicly accessible."),
    hasTitle:           makeItem("Page Title", "high", "Add a <title> tag to your HTML head."),
    hasMetaDescription: makeItem("Meta Description", "high", 'Add <meta name="description" content="..."> to head.'),
    hasH1:              makeItem("H1 Heading", "high", "Add exactly one <h1> tag on your page for SEO."),
    hasViewport:        makeItem("Mobile Viewport", "critical", 'Add viewport meta tag to HTML head.'),
    hasEmail:           makeItem("Email Address", "high", "Add your contact email visibly on your site."),
    hasResumeLink:      makeItem("Resume/CV Link", "critical", "Add a downloadable PDF resume link."),
    hasProjectSection:  makeItem("Projects Section", "critical", "Add a section showcasing your best projects."),
    hasGithubLink:      makeItem("GitHub Link", "high", "Add a link to your GitHub profile."),
    hasLinkedinLink:    makeItem("LinkedIn Link", "medium", "Add your LinkedIn profile link."),
    hasGoodAltTags:     makeItem("Image Alt Texts", "medium", "Add alt attributes to all <img> tags."),
    hasOgTags:          makeItem("Open Graph Tags", "medium", "Add Open Graph meta tags."),
    hasContactSection:  makeItem("Contact Section", "high", "Add a dedicated contact section."),
    hasReasonableSize:  makeItem("Page Size OK", "low", "Optimize page asset size."),
    hasOgImage:         makeItem("OG Social Image", "low", "Add og:image for social previews."),
    hasTwitterLink:     makeItem("Twitter/X Link", "low", "Add Twitter/X profile link."),
  };
}
