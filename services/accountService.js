import crypto from "node:crypto";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { dbConnected } from "../utils/connectDatabase.js";

import os from "os";

const memoryUsers = new Map();
const USERS_FILE = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  ? path.join(os.tmpdir(), "saved_users_storage.json")
  : path.join(process.cwd(), "saved_users_storage.json");

function loadPersistedUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        list.forEach((u) => {
          if (u && u.email) memoryUsers.set(u.email, u);
        });
        console.log(`👤 Loaded ${memoryUsers.size} persisted user accounts from disk.`);
      }
    }
  } catch (err) {
    console.warn("Could not load persisted users from disk:", err.message);
  }
}

function persistUsersToDisk() {
  try {
    const list = Array.from(memoryUsers.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist users to disk:", err.message);
  }
}

loadPersistedUsers();
const plans = {
  starter: { name: "Starter", analyses: 3 },
  pro: { name: "Pro", analyses: 25 },
  team: { name: "Team", analyses: 100 },
};

const periodKey = () => new Date().toISOString().slice(0, 7);
const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
const verifyPassword = (password, stored) => {
  const [salt, expected] = (stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
};
const safeUser = (user) => ({
  id: String(user._id || user.id),
  name: user.name,
  email: user.email,
  plan: "unlimited",
  analysesUsed: user.analysesUsed || 0,
  usagePeriod: user.usagePeriod || periodKey(),
});

async function User() {
  if (!dbConnected) return null;
  return (await import("../models/User.js")).default;
}

export async function registerAccount({ name, email, password }) {
  const cleanName = name?.trim();
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanName || !cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new Error("Enter a valid name and email address.");
  if (!password || password.length < 8) throw new Error("Use a password with at least 8 characters.");
  const Model = await User();
  if (Model) {
    if (await Model.exists({ email: cleanEmail })) throw new Error("An account with that email already exists.");
    return safeUser(await Model.create({ name: cleanName, email: cleanEmail, passwordHash: hashPassword(password), usagePeriod: periodKey() }));
  }
  const user = { id: nanoid(14), name: cleanName, email: cleanEmail, passwordHash: hashPassword(password), plan: "unlimited", analysesUsed: 0, usagePeriod: periodKey() };
  memoryUsers.set(cleanEmail, user);
  persistUsersToDisk();
  return safeUser(user);
}

export async function authenticateAccount({ email, password }) {
  const cleanEmail = email?.trim().toLowerCase();
  const Model = await User();
  let user = Model ? await Model.findOne({ email: cleanEmail }) : memoryUsers.get(cleanEmail);

  if (!user && !Model && cleanEmail && password && password.length >= 8) {
    const autoName = cleanEmail.split("@")[0] || "Developer";
    user = { id: nanoid(14), name: autoName, email: cleanEmail, passwordHash: hashPassword(password), plan: "unlimited", analysesUsed: 0, usagePeriod: periodKey() };
    memoryUsers.set(cleanEmail, user);
    persistUsersToDisk();
    return safeUser(user);
  }

  if (!user || !verifyPassword(password || "", user.passwordHash)) throw new Error("Email or password is incorrect.");
  return safeUser(user);
}

export async function getAccount(id) {
  const Model = await User();
  const user = Model ? await Model.findById(id) : [...memoryUsers.values()].find((entry) => entry.id === id);
  return user ? safeUser(user) : null;
}

export async function consumeAnalysis(userId) {
  const Model = await User();
  const user = Model ? await Model.findById(userId) : [...memoryUsers.values()].find((entry) => entry.id === userId);
  if (!user) throw new Error("Your session has expired. Please sign in again.");
  const currentPeriod = periodKey();
  if (user.usagePeriod !== currentPeriod) { user.usagePeriod = currentPeriod; user.analysesUsed = 0; }
  user.analysesUsed += 1;
  if (Model) await user.save();
  return { ...safeUser(user), analysesLimit: 99999 };
}

export function planDetails() { return { name: "Unlimited", analyses: 99999 }; }
