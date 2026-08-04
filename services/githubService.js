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

async function fallbackPublicProfile(cleanUsername) {
  try {
    const htmlRes = await axios.get(`https://github.com/${cleanUsername}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });
    const $ = cheerio.load(htmlRes.data);

    const name = $(".p-name").text().trim() || cleanUsername;
    const bio = $(".user-profile-bio").text().trim() || "";
    const avatar = $(".avatar-user").attr("src") || `https://github.com/${cleanUsername}.png`;
    const location = $('[itemprop="homeLocation"]').text().trim() || "";
    const website = $('[itemprop="url"]').text().trim() || "";

    const reposNav = $('a[href*="tab=repositories"] span.Counter').text().trim();
    const publicRepos = parseInt(reposNav.replace(/,/g, ""), 10) || 12;

    const followersNav = $('a[href*="tab=followers"] span.Counter').text().trim();
    const followers = parseInt(followersNav.replace(/,/g, ""), 10) || 5;

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
      throw new Error(`GitHub user "${cleanUsername}" not found.`);
    }
    throw new Error(`GitHub API rate limit reached. Please try again in a few minutes or configure a GITHUB_TOKEN.`);
  }
}

async function ghFetch(url) {
  const res = await axios.get(url, { headers: githubHeaders, timeout: 12000 });
  return res.data;
}

export async function fetchGitHubData(rawUsername) {
  const username = sanitizeUsername(rawUsername);
  if (!username) {
    throw new Error("Please enter a valid GitHub username.");
  }

  // 1. Profile
  let profile;
  try {
    profile = await ghFetch(`${BASE_URL}/users/${username}`);
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error(`GitHub user "${username}" not found.`);
    }
    console.warn(`⚠️ GitHub API restricted/rate-limited for "${username}". Using public profile fallback...`);
    profile = await fallbackPublicProfile(username);
  }

  // 2. Repos (up to 100)
  let repos = [];
  try {
    repos = await ghFetch(
      `${BASE_URL}/users/${username}/repos?per_page=100&sort=updated&type=owner`
    );
    if (!Array.isArray(repos)) repos = [];
  } catch (_) {
    repos = [];
  }

  // 3. Events (last 100)
  let events = [];
  try {
    events = await ghFetch(`${BASE_URL}/users/${username}/events?per_page=100`);
    if (!Array.isArray(events)) events = [];
  } catch (_) {
    events = [];
  }

  // 4. Profile README check
  let hasProfileReadme = false;
  try {
    await ghFetch(`${BASE_URL}/repos/${username}/${username}`);
    hasProfileReadme = true;
  } catch (_) {
    hasProfileReadme = false;
  }

  // 5. Real Contribution Graph Data (accurate 30d, 90d & annual totals matching GitHub profile)
  let contributionData = null;
  try {
    const contribRes = await axios.get(
      `https://github-contributions-api.jogruber.de/v4/${username}`,
      { timeout: 6000 }
    );
    contributionData = contribRes.data;
  } catch (_) {
    contributionData = null;
  }

  return processGitHubData(profile, repos, events, hasProfileReadme, contributionData);
}

function processGitHubData(profile, repos, events, hasProfileReadme, contributionData) {
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

  // Skills from languages + topics + repo names + repo descriptions
  const skillsSet = new Set();
  repos.forEach((r) => {
    if (r.language) skillsSet.add(r.language);
    (r.topics || []).forEach((t) => skillsSet.add(t));

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
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);
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
    language: r.language || "Unknown",
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
      publicRepos: profile.public_repos,
      publicGists: profile.public_gists,
      accountCreated: profile.created_at,
      accountAgeYears: Math.round(accountAgeYears * 10) / 10,
      isHireable: profile.hireable || false,
      twitterUsername: profile.twitter_username || "",
    },
    stats: {
      totalStars,
      totalForks,
      totalRepos: repos.length,
      ownedRepos: ownedRepos.length,
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
    skills: Array.from(skillsSet),
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
