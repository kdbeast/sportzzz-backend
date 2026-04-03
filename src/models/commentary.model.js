import mongoose from "mongoose";

const commentarySchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
    },
    minute: Number,
    message: String,
    eventType: String,
    actor: String,
    team: String,
    metadata: Object,
    tags: [String],
  },
  { timestamps: true },
);

export const Commentary = mongoose.model("Commentary", commentarySchema);
