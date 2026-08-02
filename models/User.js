import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    plan: { type: String, enum: ["starter", "pro", "team"], default: "starter" },
    analysesUsed: { type: Number, default: 0 },
    usagePeriod: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
