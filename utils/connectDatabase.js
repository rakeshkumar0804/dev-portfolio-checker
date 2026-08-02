import mongoose from "mongoose";

export let dbConnected = false;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    dbConnected = false;
    console.warn("⚠️  MongoDB MONGODB_URI not configured — running in memory-only mode");
    return;
  }
  if (dbConnected || mongoose.connection.readyState === 1) {
    dbConnected = true;
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    dbConnected = true;
    console.log("✅ MongoDB connected:", uri.split("@").pop());
  } catch (err) {
    dbConnected = false;
    console.warn("⚠️  MongoDB connection error — running in memory-only mode:", err.message);
  }
}

