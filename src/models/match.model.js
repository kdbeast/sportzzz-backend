import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    sport: String,
    homeTeam: String,
    awayTeam: String,
    status: {
      type: String,
      enum: ["scheduled", "live", "finished"],
      default: "scheduled",
    },
    startTime: Date,
    endTime: Date,
    homeScore: { type: Number, default: 0 },
    awayScore: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Match = mongoose.model("Match", matchSchema);
