import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import puppeteer from "puppeteer-core";

// Launches a browser compatible with both Vercel serverless and local environments
async function launchBrowser() {
  // Vercel / AWS Lambda: use @sparticuz/chromium (serverless-compatible Chromium)
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  // Local development: find system Chrome/Chromium installation
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
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
    ],
  });
}

export async function fetchPortfolioData(url) {
  let targetUrl = url.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  let html = "";
  let fetchError = null;
  let finalUrl = targetUrl;
  let isHttps = targetUrl.startsWith("https://");
  let statusCode = null;
  let responseTimeMs = null;

  const startTime = Date.now();

  // 1. Fast static fetch via Axios for headers, status, response time
  try {
    const response = await axios.get(targetUrl, {
      timeout: 12000,
      maxRedirects: 5,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      validateStatus: (status) => status < 500,
    });
    html = response.data;
    finalUrl = response.request?.res?.responseUrl || targetUrl;
    isHttps = finalUrl.startsWith("https://");
    statusCode = response.status;
    responseTimeMs = Date.now() - startTime;
  } catch (err) {
    fetchError = err.message;
    responseTimeMs = Date.now() - startTime;
    return buildResult(null, targetUrl, isHttps, fetchError, statusCode, responseTimeMs);
  }

  // 2. Headless Puppeteer render for SPA JavaScript hydration (React, Vite, Vue, Next.js)
  let renderedHtml = html;
  try {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: 12000 });
    // Allow SPA React/Vite script to execute & hydrate DOM
    await new Promise((r) => setTimeout(r, 2000));
    renderedHtml = await page.content();
    await browser.close();
  } catch (renderErr) {
    console.warn("⚠️ Headless render fallback to static HTML:", renderErr.message?.slice(0, 100));
    // Fall back to static Axios HTML if headless render fails
    renderedHtml = html;
  }

  const $ = cheerio.load(renderedHtml);
  return buildResult($, finalUrl, isHttps, null, statusCode, responseTimeMs);
}

function buildResult($, url, isHttps, fetchError, statusCode, responseTimeMs) {
  if (!$ || fetchError) {
    return {
      url, accessible: false, fetchError: fetchError || "Could not load page",
      isHttps, statusCode, responseTimeMs,
      seo: {}, content: {}, accessibility: {}, social: {},
      checklist: buildFailedChecklist(),
    };
  }

  // ── SEO ──
  const title = $("title").first().text().trim();
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";
  const ogImage = $('meta[property="og:image"]').attr("content") || "";
  const h1Tags = $("h1").map((_, el) => $(el).text().trim()).get();
  const viewportMeta = $('meta[name="viewport"]').attr("content") || "";

  // ── Body text analysis ──
  const bodyText = $("body").text().toLowerCase();
  const htmlContent = $("body").html() || "";

  // ── Email detection ──
  const emailSet = new Set();

  // Helper to sanitize & add emails
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

  // 1. Plain text email regex match in HTML body
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const rawEmails = htmlContent.match(emailRegex) || [];
  rawEmails.forEach(addEmail);

  // 2. mailto: links AND Webmail links (e.g. mail.google.com/?to=user%40gmail.com)
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const aria = $(el).attr("aria-label") || "";
    const title = $(el).attr("title") || "";

    // Check if href contains mailto: or webmail to= or email pattern
    if (href.includes("mailto:") || href.includes("to=") || /email|mail/i.test(aria) || /email|mail/i.test(title)) {
      addEmail(href);
    }
  });

  const emailsFound = Array.from(emailSet);

  // ── Link analysis ──
  const allLinks = $("a[href]").map((_, el) => $(el).attr("href") || "").get();
  const hasGithubLink = allLinks.some((l) => l.includes("github.com"));
  const hasLinkedinLink = allLinks.some((l) => l.includes("linkedin.com"));
  const hasTwitterLink = allLinks.some((l) => l.includes("twitter.com") || l.includes("x.com"));
  const hasResumeLink = allLinks.some((l) =>
    /resume|cv|download/i.test(l) || l.endsWith(".pdf")
  );

  // ── Content sections ──
  const hasProjectSection =
    bodyText.includes("project") ||
    bodyText.includes("portfolio") ||
    bodyText.includes("work") ||
    $('[id*="project"], [class*="project"], [id*="work"], [class*="work"]').length > 0;

  const hasContactSection =
    bodyText.includes("contact") ||
    bodyText.includes("get in touch") ||
    bodyText.includes("reach out") ||
    $('[id*="contact"], [class*="contact"]').length > 0;

  // ── Accessibility ──
  const imgTags = $("img");
  const imgsWithAlt = $("img[alt]").length;
  const hasGoodAltTags = imgTags.length === 0 || imgsWithAlt / imgTags.length >= 0.8;

  // ── Page size estimate ──
  const htmlSize = htmlContent.length;
  const hasReasonableSize = htmlSize < 500000; // < 500KB HTML

  const checklist = {
    isHttps:            { pass: isHttps,                                      label: "HTTPS Secure",          importance: "critical", hint: "Deploy your site to HTTPS. Netlify and Vercel provide this automatically." },
    isAccessible:       { pass: statusCode >= 200 && statusCode < 400,        label: "Site Accessible",       importance: "critical", hint: "Make sure your site is publicly accessible." },
    hasTitle:           { pass: title.length > 0,                             label: "Page Title",            importance: "high",     hint: "Add a <title> tag to your HTML head." },
    hasTitleOptimal:    { pass: title.length >= 20 && title.length <= 70,     label: "Title Length (20–70)",  importance: "medium",   hint: "Make your title 20–70 characters for best SEO." },
    hasMetaDescription: { pass: metaDesc.length > 0,                          label: "Meta Description",      importance: "high",     hint: 'Add <meta name="description" content="..."> to your HTML head.' },
    hasMetaDescriptionOptimal: { pass: metaDesc.length >= 50 && metaDesc.length <= 160, label: "Description Length (50–160)", importance: "medium", hint: "Keep your meta description 50–160 characters." },
    hasH1:              { pass: h1Tags.length > 0,                            label: "H1 Heading",            importance: "high",     hint: "Add exactly one <h1> tag on your page for SEO." },
    hasSingleH1:        { pass: h1Tags.length === 1,                          label: "Single H1",             importance: "medium",   hint: "Use exactly one <h1> per page — multiple H1s confuse search engines." },
    hasOgTags:          { pass: ogTitle.length > 0 || ogDesc.length > 0,      label: "Open Graph Tags",       importance: "medium",   hint: "Add og:title, og:description, og:image meta tags for social sharing." },
    hasOgImage:         { pass: ogImage.length > 0,                           label: "OG Social Image",       importance: "low",      hint: 'Add <meta property="og:image" content="..."> for beautiful social previews.' },
    hasViewport:        { pass: viewportMeta.toLowerCase().includes("width=device-width"), label: "Mobile Viewport",  importance: "critical", hint: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to your HTML head.' },
    hasEmail:           { pass: emailsFound.length > 0,                       label: "Email Address",         importance: "high",     hint: "Add your email address visibly on your site so recruiters can contact you." },
    hasContactSection:  { pass: hasContactSection,                            label: "Contact Section",       importance: "high",     hint: "Add a dedicated contact section or page." },
    hasGithubLink:      { pass: hasGithubLink,                                label: "GitHub Link",           importance: "high",     hint: "Add a link to your GitHub profile in your navigation or footer." },
    hasLinkedinLink:    { pass: hasLinkedinLink,                              label: "LinkedIn Link",         importance: "medium",   hint: "Add your LinkedIn profile link — many recruiters go straight there." },
    hasTwitterLink:     { pass: hasTwitterLink,                               label: "Twitter/X Link",        importance: "low",      hint: "Add your Twitter/X link if active in the developer community." },
    hasResumeLink:      { pass: hasResumeLink,                                label: "Resume/CV Link",        importance: "critical", hint: "Add a downloadable PDF resume link. This is the #1 thing recruiters look for." },
    hasProjectSection:  { pass: hasProjectSection,                            label: "Projects Section",      importance: "critical", hint: "Add a section showcasing your best 3–5 projects with descriptions and links." },
    hasGoodAltTags:     { pass: hasGoodAltTags,                               label: "Image Alt Texts",       importance: "medium",   hint: "Add alt attributes to all your <img> tags for accessibility and SEO." },
    hasReasonableSize:  { pass: hasReasonableSize,                            label: "Page Size OK",          importance: "low",      hint: "Your page HTML is large. Optimize images and minimize unused code." },
  };

  return {
    url,
    accessible: true,
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
      hasResumeLink,
      emailsFound: emailsFound.slice(0, 3),
    },
    accessibility: {
      hasGoodAltTags,
      imgsTotal: imgTags.length,
      imgsWithAlt,
    },
    social: {
      hasGithubLink,
      hasLinkedinLink,
      hasTwitterLink,
    },
    checklist,
  };
}

function buildFailedChecklist() {
  return {
    isHttps: { pass: false, label: "HTTPS Secure", importance: "critical" },
    isAccessible: { pass: false, label: "Site Accessible", importance: "critical" },
    hasTitle: { pass: false, label: "Page Title", importance: "high" },
    hasMetaDescription: { pass: false, label: "Meta Description", importance: "high" },
    hasH1: { pass: false, label: "H1 Heading", importance: "high" },
    hasViewport: { pass: false, label: "Mobile Viewport", importance: "critical" },
    hasEmail: { pass: false, label: "Email Address", importance: "high" },
    hasResumeLink: { pass: false, label: "Resume/CV Link", importance: "critical" },
    hasProjectSection: { pass: false, label: "Projects Section", importance: "critical" },
    hasGithubLink: { pass: false, label: "GitHub Link", importance: "high" },
    hasLinkedinLink: { pass: false, label: "LinkedIn Link", importance: "medium" },
    hasGoodAltTags: { pass: false, label: "Image Alt Texts", importance: "medium" },
    hasOgTags: { pass: false, label: "Open Graph Tags", importance: "medium" },
    hasContactSection: { pass: false, label: "Contact Section", importance: "high" },
    hasReasonableSize: { pass: false, label: "Page Size OK", importance: "low" },
    hasOgImage: { pass: false, label: "OG Social Image", importance: "low" },
    hasTwitterLink: { pass: false, label: "Twitter/X Link", importance: "low" },
  };
}
