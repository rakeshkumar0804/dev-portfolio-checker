import axios from "axios";

const BASE_URL = "https://api.github.com";

const githubHeaders = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "DevPortfolioHealthChecker/2.0",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

async function ghFetch(url) {
  const res = await axios.get(url, { headers: githubHeaders, timeout: 12000 });
  return res.data;
}

export async function fetchGitHubData(username) {
  // 1. Profile
  let profile;
  try {
    profile = await ghFetch(`${BASE_URL}/users/${username}`);
  } catch (err) {
    if (err.response?.status === 404)
      throw new Error(`GitHub user "${username}" not found.`);
    if (err.response?.status === 403 || err.response?.status === 429)
      throw new Error(
        "GitHub API rate limit reached (60 req/hr unauthenticated). Add a GITHUB_TOKEN to backend/.env to increase this to 5000/hr."
      );
    throw new Error("Failed to fetch GitHub profile. Please try again.");
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

  return processGitHubData(profile, repos, events, hasProfileReadme);
}

function processGitHubData(profile, repos, events, hasProfileReadme) {
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

  // Skills from languages + topics
  const skillsSet = new Set();
  repos.forEach((r) => {
    if (r.language) skillsSet.add(r.language);
    (r.topics || []).forEach((t) => skillsSet.add(t));
  });

  // Commit activity
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const pushEvents = events.filter((e) => e.type === "PushEvent");
  const commitCount90Days = pushEvents
    .filter((e) => new Date(e.created_at).getTime() > ninetyDaysAgo)
    .reduce((sum, e) => sum + (e.payload?.commits?.length || 1), 0);
  const commitCount30Days = pushEvents
    .filter((e) => new Date(e.created_at).getTime() > thirtyDaysAgo)
    .reduce((sum, e) => sum + (e.payload?.commits?.length || 1), 0);

  // Streak calculation
  const activeDays = new Set(
    pushEvents.map((e) => new Date(e.created_at).toDateString())
  );
  let currentStreak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 86400000).toDateString();
    if (activeDays.has(d)) currentStreak++;
    else break;
  }

  // Weekly activity heatmap (12 weeks)
  const weeklyActivity = buildWeeklyActivity(events);

  // Repo stats
  const ownedRepos = repos.filter((r) => !r.fork);
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);
  const reposWithDescription = repos.filter(
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
