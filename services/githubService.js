import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://api.github.com";

const githubHeaders = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "DevPortfolioHealthChecker/2.0",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

function sanitizeUsername(input) {
  if (!input) return "";
  let clean = input.trim();
  clean = clean.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  clean = clean.replace(/\/.*$/, "");
  clean = clean.replace(/^@/, "");
  return clean.trim();
}

async function fallbackPublicRepos(cleanUsername) {
  try {
    const res = await axios.get(`https://github.com/${cleanUsername}?tab=repositories`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 3500,
    });
    const $ = cheerio.load(res.data);
    const repos = [];
    const repoItems = $("#user-repositories-list li");
    const blankslate = $(".blankslate, [data-target='empty-state']");
    const hasRepoContainer = $("#user-repositories-list").length > 0 || blankslate.length > 0 || repoItems.length > 0;

    if (!hasRepoContainer) {
      return null;
    }

    repoItems.each((i, el) => {
      const name = $(el).find('a[itemprop*="codeRepository"]').text().trim();
      const desc = $(el).find('p[itemprop="description"]').text().trim();
      const lang = $(el).find('span[itemprop="programmingLanguage"]').text().trim();
      const isFork = $(el).find('span:contains("Forked from")').length > 0;
      if (name) {
        repos.push({
          name,
          description: desc,
          stargazers_count: 0,
          forks_count: 0,
          language: lang || null,
          topics: [],
          html_url: `https://github.com/${cleanUsername}/${name}`,
          pushed_at: new Date().toISOString(),
          fork: isFork,
          license: null,
          homepage: "",
        });
      }
    });
    return repos;
  } catch (err) {
    console.warn(`Fallback repository scrape failed for ${cleanUsername}:`, err.message);
    return null;
  }
}

async function fallbackPublicProfile(cleanUsername) {
  try {
    const htmlRes = await axios.get(`https://github.com/${cleanUsername}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 3500,
    });
    const $ = cheerio.load(htmlRes.data);

    const name = $(".p-name").text().trim() || cleanUsername;
    const bio = $(".user-profile-bio").text().trim() || "";
    const avatar = $(".avatar-user").attr("src") || `https://github.com/${cleanUsername}.png`;
    const location = $('[itemprop="homeLocation"]').text().trim() || "";
    const website = $('[itemprop="url"]').text().trim() || "";

    const reposNav = $('a[href*="tab=repositories"] span.Counter').first().text().trim();
    const parsedRepos = parseInt(reposNav.replace(/,/g, ""), 10);
    const publicRepos = Number.isInteger(parsedRepos) && parsedRepos >= 0 ? parsedRepos : null;

    const followersNav = $('a[href*="tab=followers"] span.Counter').first().text().trim();
    const parsedFollowers = parseInt(followersNav.replace(/,/g, ""), 10);
    const followers = Number.isInteger(parsedFollowers) && parsedFollowers >= 0 ? parsedFollowers : null;

    return {
      login: cleanUsername,
      username: cleanUsername,
      name,
      bio,
      avatar_url: avatar,
      avatar,
      location,
      blog: website,
      website,
      public_repos: publicRepos,
      publicRepos,
      followers,
      html_url: `https://github.com/${cleanUsername}`,
      githubUrl: `https://github.com/${cleanUsername}`,
    };
  } catch (fallbackErr) {
    if (fallbackErr.response?.status === 404) {
      const notFoundErr = new Error(`GitHub user "${cleanUsername}" not found.`);
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }
    const rateLimitErr = new Error(`GitHub service is temporarily unavailable. Please retry in a few minutes or configure a GITHUB_TOKEN.`);
    rateLimitErr.statusCode = 502;
    throw rateLimitErr;
  }
}

async function ghFetch(url, timeoutMs = 4500) {
  try {
    const res = await axios.get(url, { headers: githubHeaders, timeout: timeoutMs });
    return res.data;
  } catch (err) {
    if (err.code === "ECONNABORTED" || err.message?.toLowerCase().includes("timeout")) {
      const timeoutErr = new Error("GitHub request timed out.");
      timeoutErr.statusCode = 504;
      throw timeoutErr;
    }
    throw err;
  }
}

export async function fetchGitHubData(rawUsername) {
  const username = sanitizeUsername(rawUsername);
  if (!username) {
    const err = new Error("Please enter a valid GitHub username.");
    err.statusCode = 400;
    throw err;
  }

  // 1. Profile (validate user identity & existence)
  let profile;
  try {
    profile = await ghFetch(`${BASE_URL}/users/${username}`, 4500);
  } catch (err) {
    if (err.response?.status === 404) {
      const notFoundErr = new Error(`GitHub user "${username}" not found.`);
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }
    if (err.statusCode === 504) throw err;
    console.warn(`⚠️ GitHub API restricted/rate-limited for "${username}". Using public profile fallback...`);
    profile = await fallbackPublicProfile(username);
  }

  // 2–5. Fetch Repos, Events, README & Contributions concurrently
  const [reposResult, eventsResult, readmeResult, contribResult] = await Promise.allSettled([
    ghFetch(`${BASE_URL}/users/${username}/repos?per_page=100&sort=updated&type=owner`, 4500),
    ghFetch(`${BASE_URL}/users/${username}/events?per_page=100`, 4500),
    ghFetch(`${BASE_URL}/repos/${username}/${username}`, 3500),
    axios.get(`https://github-contributions-api.jogruber.de/v4/${username}`, { timeout: 3000 }),
  ]);

  let repos = [];
  let repoFetchStatus = "fetched"; // "fetched" | "empty" | "unavailable"

  const knownPublicRepos = Number.isInteger(profile.public_repos)
    ? profile.public_repos
    : Number.isInteger(profile.publicRepos)
    ? profile.publicRepos
    : null;

  if (reposResult.status === "fulfilled" && Array.isArray(reposResult.value)) {
    repos = reposResult.value;
    repoFetchStatus = repos.length > 0 ? "fetched" : "empty";
  } else {
    console.warn(`⚠️ GitHub API repo fetch failed/rate-limited for "${username}". Attempting public profile repository fallback...`);
    const scrapedRepos = await fallbackPublicRepos(username);
    if (Array.isArray(scrapedRepos)) {
      if (scrapedRepos.length > 0) {
        repos = scrapedRepos;
        repoFetchStatus = "fetched";
      } else {
        repos = [];
        repoFetchStatus = "empty";
      }
    } else {
      if (knownPublicRepos === 0) {
        repos = [];
        repoFetchStatus = "empty";
      } else {
        repos = [];
        repoFetchStatus = "unavailable";
      }
    }
  }

  const events = (eventsResult.status === "fulfilled" && Array.isArray(eventsResult.value)) ? eventsResult.value : [];
  const hasProfileReadme = readmeResult.status === "fulfilled";
  const contributionData = (contribResult.status === "fulfilled" && contribResult.value?.data) ? contribResult.value.data : null;

  return processGitHubData(profile, repos, events, hasProfileReadme, contributionData, repoFetchStatus);
}

function processGitHubData(profile, repos, events, hasProfileReadme, contributionData, repoFetchStatus = "fetched") {
  // Language distribution
  const langCount = {};
  repos.forEach((r) => {
    if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
  });
  const totalReposWithLang = Object.values(langCount).reduce((s, v) => s + v, 0);
  const languageDistribution = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([language, count]) => ({
      language,
      count,
      percentage: totalReposWithLang > 0 ? Math.round((count / totalReposWithLang) * 100) : 0,
    }));

  // Generic non-technical metadata topics that must not become skill recommendations
  const GENERIC_PROJECT_TOPICS = new Set([
    "resume", "portfolio", "ats", "developer-tools", "developertools",
    "project", "projects", "sample", "demo", "demos", "assignment", "assignments",
    "homework", "practice", "personal-website", "portfolio-website", "website",
    "web-application", "web-app", "app", "application", "challenge", "tutorial",
    "tutorials", "learning", "starter", "starter-kit", "boilerplate", "template",
    "hackathon", "career", "career-development", "careerdevelopment", "github",
    "showcase", "showcases", "docs", "documentation", "guide", "collection",
    "exercises", "notes", "resources", "resource", "interview", "interview-prep",
    "test", "testing-ground", "sandbox", "example", "examples", "student",
    "beginner", "free", "open-source", "opensource", "frontend-mentor",
    "coding-challenge", "mini-project", "coursework"
  ]);

  // Skills from languages + topics + repo names + repo descriptions
  const skillsSet = new Set();
  repos.forEach((r) => {
    if (r.language) skillsSet.add(r.language);
    (r.topics || []).forEach((t) => {
      const clean = (t || "").trim().toLowerCase();
      const stripped = clean.replace(/[^a-z0-9]/g, "");
      if (clean && !GENERIC_PROJECT_TOPICS.has(clean) && !GENERIC_PROJECT_TOPICS.has(stripped)) {
        skillsSet.add(t);
      }
    });

    const combinedText = `${r.name || ""} ${r.description || ""} ${(r.topics || []).join(" ")}`.toLowerCase();
    
    if (combinedText.includes("node") || combinedText.includes("express") || combinedText.includes("mern")) {
      skillsSet.add("Node.js");
      skillsSet.add("Express");
    }
    if (combinedText.includes("react")) skillsSet.add("React");
    if (combinedText.includes("mongo")) skillsSet.add("MongoDB");
    if (combinedText.includes("python") || combinedText.includes("django") || combinedText.includes("flask")) skillsSet.add("Python");
    if (combinedText.includes("java") || combinedText.includes("spring")) skillsSet.add("Java");
    if (combinedText.includes("sql") || combinedText.includes("postgres") || combinedText.includes("mysql")) skillsSet.add("SQL");
    if (combinedText.includes("docker") || combinedText.includes("container")) skillsSet.add("Docker");
    if (combinedText.includes("rest")) skillsSet.add("REST API");
  });

  const pushEvents = events.filter((e) => e.type === "PushEvent");

  // Calculate live event contributions for zero-delay accuracy
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const liveCommitCount30Days = pushEvents
    .filter((e) => new Date(e.created_at).getTime() >= thirtyDaysAgo)
    .reduce((sum, e) => sum + (e.payload?.commits?.length || 1), 0);

  const liveCommitCount90Days = pushEvents
    .filter((e) => new Date(e.created_at).getTime() >= ninetyDaysAgo)
    .reduce((sum, e) => sum + (e.payload?.commits?.length || 1), 0);

  let commitCount90Days = liveCommitCount90Days;
  let commitCount30Days = liveCommitCount30Days;
  let totalContributionsYear = 0;

  if (contributionData && Array.isArray(contributionData.contributions)) {
    const api30Days = contributionData.contributions
      .filter((c) => new Date(c.date).getTime() >= thirtyDaysAgo)
      .reduce((sum, c) => sum + c.count, 0);

    const api90Days = contributionData.contributions
      .filter((c) => new Date(c.date).getTime() >= ninetyDaysAgo)
      .reduce((sum, c) => sum + c.count, 0);

    // Use the max of live events vs graph API for 30d/90d (live events are truly real-time)
    commitCount30Days = Math.max(liveCommitCount30Days, api30Days);
    commitCount90Days = Math.max(liveCommitCount90Days, api90Days);

    // Year total: graph API total + live events that happened AFTER the API's last cached day
    const currentYear = new Date().getFullYear().toString();
    const apiYearTotal = contributionData.total?.[currentYear] || 0;

    // Find the latest date present in the contribution graph data
    const apiDates = contributionData.contributions
      .filter((c) => c.date.startsWith(currentYear) && c.count > 0)
      .map((c) => c.date)
      .sort();
    const apiLastDate = apiDates[apiDates.length - 1] || `${currentYear}-01-01`;
    const apiLastDateMs = new Date(apiLastDate).getTime();

    // Count live push-event commits that happened AFTER the API's last recorded date
    const realTimeDelta = pushEvents
      .filter((e) => {
        const d = new Date(e.created_at);
        return d.getFullYear() === new Date().getFullYear() &&
               d.getTime() > apiLastDateMs + 86400000; // strictly after last API day
      })
      .reduce((sum, e) => sum + (e.payload?.commits?.length || 1), 0);

    totalContributionsYear = apiYearTotal + realTimeDelta;
  } else {
    totalContributionsYear = liveCommitCount90Days;
  }

  // Streak calculation
  let currentStreak = 0;
  if (contributionData && Array.isArray(contributionData.contributions)) {
    const activeDays = new Set(
      contributionData.contributions.filter((c) => c.count > 0).map((c) => c.date)
    );
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      if (activeDays.has(d)) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }
  } else {
    const activeDays = new Set(
      pushEvents.map((e) => new Date(e.created_at).toDateString())
    );
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.now() - i * 86400000).toDateString();
      if (activeDays.has(d)) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }
  }

  // Weekly activity heatmap (12 weeks)
  const weeklyActivity = buildWeeklyActivity(events);

  // Repo stats — Non-forked repositories matching GitHub profile badge
  const ownedRepos = repos.filter((r) => !r.fork);
  const knownCount = Number.isInteger(profile.publicRepos)
    ? profile.publicRepos
    : Number.isInteger(profile.public_repos)
    ? profile.public_repos
    : null;
  const ownedReposCount = (repoFetchStatus === "unavailable" && knownCount !== null && knownCount > 0)
    ? knownCount
    : ownedRepos.length;
  const totalReposCount = (repoFetchStatus === "unavailable" && knownCount !== null && knownCount > 0)
    ? knownCount
    : repos.length;
  const totalStars = repoFetchStatus === "unavailable" ? null : repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
  const totalForks = repoFetchStatus === "unavailable" ? null : repos.reduce((s, r) => s + (r.forks_count || 0), 0);
  const reposWithDescription = ownedRepos.filter(
    (r) => r.description && r.description.trim().length > 5
  ).length;
  const reposWithTopics = repos.filter(
    (r) => r.topics && r.topics.length > 0
  ).length;
  const reposWithLicense = repos.filter((r) => r.license?.spdx_id).length;
  const reposWithHomepage = repos.filter((r) => r.homepage && r.homepage.trim()).length;

  // README quality: infer from repo metadata
  const topReposRaw = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 8);

  const reposWithGoodReadme = topReposRaw.filter((r) => {
    return (
      r.description &&
      r.description.trim().length > 20 &&
      r.topics &&
      r.topics.length > 0
    );
  }).length;

  const avgReadmeScore = topReposRaw.length > 0
    ? Math.round(
        topReposRaw.reduce((sum, r) => {
          let s = 0;
          if (r.description && r.description.trim().length > 20) s += 40;
          if (r.topics && r.topics.length > 0) s += 20;
          if (r.homepage) s += 20;
          if (r.stargazers_count > 0) s += 10;
          if (r.license?.spdx_id) s += 10;
          return sum + s;
        }, 0) / topReposRaw.length
      )
    : 0;

  // Account age
  const accountAgeYears =
    (Date.now() - new Date(profile.created_at).getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);

  // Top repos
  const topRepos = topReposRaw.slice(0, 6).map((r) => ({
    name: r.name,
    description: r.description || "",
    stars: r.stargazers_count,
    forks: r.forks_count,
    language: r.language && r.language !== "Unknown" ? r.language : null,
    topics: r.topics || [],
    url: r.html_url,
    lastPushed: r.pushed_at,
    isForked: r.fork,
    hasLicense: !!r.license?.spdx_id,
    hasHomepage: !!(r.homepage && r.homepage.trim()),
    hasReadme: !!(r.description && r.description.trim().length > 20 && r.topics?.length > 0),
    readmeScore: (() => {
      let s = 0;
      if (r.description && r.description.trim().length > 20) s += 40;
      if (r.topics && r.topics.length > 0) s += 20;
      if (r.homepage) s += 20;
      if (r.stargazers_count > 0) s += 10;
      if (r.license?.spdx_id) s += 10;
      return s;
    })(),
  }));

  return {
    profile: {
      username: profile.login,
      name: profile.name || profile.login,
      bio: profile.bio || "",
      avatar: profile.avatar_url,
      location: profile.location || "",
      website: profile.blog || "",
      company: profile.company || "",
      email: profile.email || "",
      githubUrl: profile.html_url,
      followers: profile.followers,
      following: profile.following,
      publicRepos: profile.publicRepos !== undefined ? profile.publicRepos : profile.public_repos,
      public_repos: profile.publicRepos !== undefined ? profile.publicRepos : profile.public_repos,
      publicGists: profile.public_gists,
      accountCreated: profile.created_at,
      accountAgeYears: Math.round(accountAgeYears * 10) / 10,
      isHireable: profile.hireable || false,
      twitterUsername: profile.twitter_username || "",
    },
    stats: {
      totalStars,
      totalForks,
      totalRepos: totalReposCount,
      ownedRepos: ownedReposCount,
      repoFetchStatus,
      reposUnavailable: repoFetchStatus === "unavailable",
      forkedRepos: repos.filter((r) => r.fork).length,
      reposWithDescription,
      reposWithTopics,
      reposWithLicense,
      reposWithHomepage,
      reposWithGoodReadme,
      avgReadmeScore,
      commitCount90Days,
      commitCount30Days,
      totalContributionsYear,
      currentStreak,
      weeklyActivity,
    },
    languageDistribution,
    topRepos,
    skills: Array.from(skillsSet).filter(s => s && s !== "Unknown"),
    hasProfileReadme,
  };
}

function buildWeeklyActivity(events) {
  const weeks = {};
  const now = Date.now();
  const twelveWeeksAgo = now - 12 * 7 * 24 * 60 * 60 * 1000;

  events
    .filter((e) => new Date(e.created_at).getTime() > twelveWeeksAgo)
    .forEach((e) => {
      const d = new Date(e.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split("T")[0];
      weeks[key] = (weeks[key] || 0) + 1;
    });

  const result = [];
  for (let i = 11; i >= 0; i--) {
    const weekDate = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
    weekDate.setDate(weekDate.getDate() - weekDate.getDay());
    const key = weekDate.toISOString().split("T")[0];
    result.push({ week: key, count: weeks[key] || 0 });
  }
  return result;
}
