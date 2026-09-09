// ═══════════════════════════════════════════════════════════════════════════════
// Topic & Domain Filter Utility: Exclude Generic & Domain Tags from Skill Recommendations
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Known genuine technical tools, libraries, frameworks, languages, databases,
 * and infrastructure that must ALWAYS remain eligible as technical skills.
 */
export const KNOWN_GENUINE_TOOLS = new Set([
  // Frontend & UI
  "vite", "vitest", "d3", "d3.js", "d3js", "react", "react.js", "reactjs",
  "react-native", "reactnative", "vue", "vue.js", "vuejs", "angular", "angularjs",
  "svelte", "sveltekit", "next", "next.js", "nextjs", "nuxt", "nuxt.js", "nuxtjs",
  "remix", "astro", "gatsby", "html", "html5", "css", "css3", "sass", "scss",
  "less", "tailwind", "tailwindcss", "bootstrap", "mui", "material-ui",
  "chakra-ui", "shadcn", "radix", "styled-components", "jquery",

  // Backend, Frameworks & Languages
  "node", "node.js", "nodejs", "express", "express.js", "expressjs", "nestjs",
  "fastify", "koa", "hapi", "python", "django", "flask", "fastapi", "tornado",
  "celery", "java", "spring", "spring-boot", "springboot", "hibernate", "maven",
  "gradle", "kotlin", "scala", "clojure", "groovy", "c", "c++", "cpp", "c#",
  "csharp", "dotnet", ".net", "asp.net", "aspnet", "go", "golang", "rust",
  "ruby", "rails", "ruby-on-rails", "php", "laravel", "symfony", "javascript",
  "js", "typescript", "ts", "r", "elixir", "erlang", "haskell", "perl", "lua",

  // Databases & ORMs
  "sql", "mysql", "postgresql", "postgres", "sqlite", "mariadb", "oracle",
  "sql-server", "mssql", "mongodb", "mongo", "mongoose", "redis", "cassandra",
  "dynamodb", "couchdb", "neo4j", "supabase", "prisma", "typeorm", "sequelize",
  "knex", "drizzle", "drizzle-orm", "alembic",

  // APIs, Messaging & Protocols
  "graphql", "apollo", "rest", "rest-api", "restapi", "restful", "grpc",
  "trpc", "soap", "websockets", "socket.io", "kafka", "rabbitmq", "activemq",
  "zeromq", "sqs", "sns",

  // Cloud, DevOps & Containers
  "docker", "kubernetes", "k8s", "helm", "terraform", "ansible", "puppet",
  "chef", "vagrant", "jenkins", "github-actions", "gitlab-ci", "circleci",
  "travis-ci", "argo-cd", "argocd", "aws", "azure", "gcp", "google-cloud",
  "firebase", "cloudflare", "heroku", "vercel", "netlify",

  // System, Shell & Servers
  "linux", "unix", "ubuntu", "debian", "centos", "redhat", "alpine", "bash",
  "shell", "powershell", "zsh", "nginx", "apache", "caddy", "traefik", "envoy",

  // Data Science, ML & AI
  "pandas", "numpy", "scipy", "scikit-learn", "sklearn", "matplotlib", "seaborn",
  "pytorch", "tensorflow", "keras", "opencv", "nltk", "spacy", "huggingface",
  "transformers", "langchain", "llamaindex",

  // Testing & Build Tools
  "jest", "mocha", "chai", "cypress", "playwright", "selenium", "puppeteer",
  "junit", "pytest", "webpack", "rollup", "babel", "esbuild", "turbopack",
  "parcel", "eslint", "prettier",

  // State Management & Architecture
  "redux", "redux-toolkit", "zustand", "mobx", "recoil", "jotai", "react-query",
  "tanstack-query", "swr", "microservices"
]);

/**
 * Exact non-technical metadata and domain acronym tags.
 */
export const GENERIC_DOMAIN_AND_PROJECT_TAGS = new Set([
  // Domain acronyms commonly used as project tags
  "hrms", "hrm", "lms", "cms", "crm", "erp", "pos", "ems", "hms",

  // Metadata / Repository classification
  "resume", "portfolio", "ats", "developer-tools", "developertools",
  "project", "projects", "sample", "demo", "demos", "assignment", "assignments",
  "homework", "practice", "personal-website", "portfolio-website", "website",
  "web-application", "web-app", "app", "application", "challenge", "tutorial",
  "tutorials", "learning", "starter", "starter-kit", "boilerplate", "template",
  "templates", "hackathon", "career", "career-development", "careerdevelopment",
  "github", "showcase", "showcases", "docs", "documentation", "guide",
  "collection", "exercises", "notes", "resources", "resource", "interview",
  "interview-prep", "test", "testing-ground", "sandbox", "example", "examples",
  "student", "beginner", "free", "open-source", "opensource", "frontend-mentor",
  "coding-challenge", "mini-project", "coursework", "capstone", "final-project",
  "crud", "landing-page",

  // Common application/domain categories
  "ecommerce", "e-commerce", "shopping-cart", "online-store", "online-shop",
  "food-delivery", "social-network", "social-media", "social-platform",
  "real-estate", "healthcare", "telemedicine", "job-board", "blog", "blogging",
  "management-system", "management",

  // Broad roles & non-tool professions
  "fullstack", "full-stack", "fullstack-developer", "frontend", "front-end",
  "frontend-developer", "backend", "back-end", "backend-developer", "web-developer",
  "web-development", "software-engineer", "software-engineering", "developer",
  "engineer", "programmer", "mobile-developer", "mobile-development"
]);

/**
 * Regex patterns identifying project types, domain apps, clones, trackers, and systems.
 */
const DOMAIN_COMPOUND_PATTERNS = [
  // Suffixes like -management-system, -management, -system, -systems
  /-(?:management-system|management|system|systems)$/i,
  // Suffixes like -tracker, -trackers
  /-(?:tracker|trackers)$/i,
  // Suffixes like -portal, -portals
  /-(?:portal|portals)$/i,
  // Suffixes like -dashboard, -panel
  /-(?:dashboard|dashboards|panel|panels)$/i,
  // Suffixes like -clone, -clones
  /-(?:clone|clones)$/i,
  // Suffixes like -app, -application, -webapp
  /-(?:app|apps|application|applications|webapp|webapps)$/i,
  // Suffixes like -generator, -calculator, -bot, -game, -player
  /-(?:generator|generators|calculator|calculators|bot|bots|game|games|player|players)$/i,
  // Suffixes like -website, -site, -page
  /-(?:website|websites|site|sites|page|pages)$/i,
  // Prefix patterns like clone-, demo-, sample-
  /^(?:clone|demo|sample|test|tutorial)-/i
];

/**
 * Determines whether a given tag or skill string represents a generic project,
 * domain, or application category rather than an actionable technical skill/tool.
 *
 * @param {string} tag
 * @returns {boolean} True if generic/domain tag (should be excluded from skill recommendations)
 */
export function isGenericProjectOrDomainTag(tag) {
  if (!tag || typeof tag !== "string") return false;

  const raw = tag.trim().toLowerCase();
  if (!raw) return false;

  const clean = raw.replace(/^#/, "");
  const stripped = clean.replace(/[^a-z0-9]/g, "");

  // 1. Whitelist exemption: Genuine technical tools must NEVER be excluded
  if (KNOWN_GENUINE_TOOLS.has(clean) || KNOWN_GENUINE_TOOLS.has(stripped)) {
    return false;
  }

  // 2. Exact match against generic domain and project tags
  if (
    GENERIC_DOMAIN_AND_PROJECT_TAGS.has(clean) ||
    GENERIC_DOMAIN_AND_PROJECT_TAGS.has(stripped) ||
    GENERIC_DOMAIN_AND_PROJECT_TAGS.has(raw)
  ) {
    return true;
  }

  // 3. Pattern match for compound domain/project tags (e.g. leave-management-system, expense-tracker)
  for (const pattern of DOMAIN_COMPOUND_PATTERNS) {
    if (pattern.test(clean)) {
      return true;
    }
  }

  return false;
}

/**
 * Canonical tool alias mapping to normalize technical skill variations (e.g. d3js -> D3.js).
 */
export const SKILL_ALIAS_MAP = {
  "d3js": "D3.js",
  "d3": "D3.js",
  "d3.js": "D3.js",
  "reactjs": "React",
  "react.js": "React",
  "react": "React",
  "nodejs": "Node.js",
  "node.js": "Node.js",
  "node": "Node.js",
  "expressjs": "Express",
  "express.js": "Express",
  "express": "Express",
  "nextjs": "Next.js",
  "next.js": "Next.js",
  "next": "Next.js",
  "vuejs": "Vue.js",
  "vue.js": "Vue.js",
  "vue": "Vue.js",
  "angularjs": "Angular",
  "angular": "Angular",
  "sveltekit": "SvelteKit",
  "svelte": "Svelte",
  "tailwindcss": "Tailwind",
  "tailwind": "Tailwind",
  "html5": "HTML",
  "html": "HTML",
  "css3": "CSS",
  "css": "CSS",
  "js": "JavaScript",
  "javascript": "JavaScript",
  "ts": "TypeScript",
  "typescript": "TypeScript",
  "py": "Python",
  "python": "Python",
  "golang": "Go",
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "mongo": "MongoDB",
  "mongodb": "MongoDB",
  "rest": "REST API",
  "restapi": "REST API",
  "rest-api": "REST API",
  "restful": "REST API",
  "fastapi": "FastAPI",
  "docker": "Docker",
  "prisma": "Prisma",
  "graphql": "GraphQL",
  "vite": "Vite",
  "vitest": "Vitest",
  "webpack": "Webpack",
  "kubernetes": "Kubernetes",
  "redux": "Redux",
};

/**
 * Normalizes a raw skill string or alias into its canonical representation.
 *
 * @param {string} skill
 * @returns {string} Normalized skill string
 */
export function normalizeSkillAlias(skill) {
  if (!skill || typeof skill !== "string") return skill;
  const clean = skill.trim();
  const lower = clean.toLowerCase();
  const stripped = lower.replace(/[^a-z0-9]/g, "");
  return SKILL_ALIAS_MAP[lower] || SKILL_ALIAS_MAP[stripped] || clean;
}

/**
 * Filters out generic project, domain, and category tags from an array of skill tags,
 * and normalizes tool aliases (e.g. d3js -> D3.js).
 *
 * @param {string[]} skills
 * @returns {string[]} Filtered skills containing only genuine technical skills
 */
export function filterGenericTopics(skills) {
  if (!Array.isArray(skills)) return [];
  const set = new Set();
  skills.forEach((s) => {
    if (s && !isGenericProjectOrDomainTag(s)) {
      set.add(normalizeSkillAlias(s));
    }
  });
  return Array.from(set);
}
