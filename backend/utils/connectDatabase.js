import mongoose from "mongoose";

export let dbConnected = false;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/devportfolio";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    dbConnected = true;
    console.log("✅ MongoDB connected:", uri.split("@").pop());
  } catch (err) {
    dbConnected = false;
    console.warn("⚠️  MongoDB not available — running in memory-only mode (reports won't persist across restarts)");
    console.warn("   To enable persistence: install MongoDB or set MONGODB_URI to a MongoDB Atlas connection string");
  }
}

