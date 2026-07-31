import mongoose from "mongoose";

const scoreBreakdownSchema = new mongoose.Schema(
  {
    score: Number,
    max: Number,
    label: String,
    evidence: String,
  },
  { _id: false }
);

const improvementSchema = new mongoose.Schema(
  {
    action: String,
    why: String,
    how: String,
    points: Number,
    difficulty: String,
    timeMinutes: Number,
    priority: Number,
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    shareId: { type: String, required: true, unique: true, index: true },
    githubUsername: { type: String, required: true, index: true },
    portfolioUrl: { type: String, default: null },
    targetRole: { type: String, default: "fullstack" },

    scores: {
      github: Number,
      portfolio: Number,
      projectQuality: Number,
      documentation: Number,
      hiringReadiness: Number,
      overall: Number,
    },

    scoreBreakdowns: {
      github: [scoreBreakdownSchema],
      documentation: [scoreBreakdownSchema],
      projectQuality: [scoreBreakdownSchema],
      portfolio: [scoreBreakdownSchema],
    },

    improvements: [improvementSchema],
    careerRoadmap: mongoose.Schema.Types.Mixed,

    githubData: mongoose.Schema.Types.Mixed,
    portfolioData: mongoose.Schema.Types.Mixed,
    aiFeedback: mongoose.Schema.Types.Mixed,
    resumeAnalysis: mongoose.Schema.Types.Mixed,

    skillsDetected: [String],
  },
  { timestamps: true }
);

// TTL: auto-delete reports older than 48 hours
reportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

const Report = mongoose.model("Report", reportSchema);
export default Report;
