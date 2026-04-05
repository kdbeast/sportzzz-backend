import mongoose from "mongoose";
import { Router } from "express";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";
import { Match } from "../models/match.model.js";
import { getMatchStatus } from "../utils/match-status.js";
import { Commentary } from "../models/commentary.model.js";
import { matchIdParamSchema } from "../validation/matches.js";

const MAX_LIMIT = 100;

export const commentaryRouter = Router({ mergeParams: true });

/* ===================== GET ===================== */

commentaryRouter.get("/", async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({
      error: "Invalid match ID.",
      details: paramsResult.error.issues,
    });
  }

  const queryResult = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({
      error: "Invalid query parameters.",
      details: queryResult.error.issues,
    });
  }

  try {
    const { id: matchId } = paramsResult.data;
    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(400).json({ error: "Invalid match ID." });
    }

    const { limit = 10 } = queryResult.data;
    const safeLimit = Math.min(limit, MAX_LIMIT);

    const results = await Commentary.find({ matchId })
      .sort({ createdAt: -1 })
      .limit(safeLimit);

    res.status(200).json({ data: results });
  } catch (error) {
    console.error("Failed to fetch commentary:", error);
    res.status(500).json({ error: "Failed to fetch commentary." });
  }
});

/* ===================== POST ===================== */

commentaryRouter.post("/", async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({
      error: "Invalid match ID.",
      details: paramsResult.error.issues,
    });
  }

  const bodyResult = createCommentarySchema.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({
      error: "Invalid commentary payload.",
      details: bodyResult.error.issues,
    });
  }

  try {
    const matchId = paramsResult.data.id;
    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(400).json({ error: "Invalid match ID." });
    }

    // ✅ STEP 1: Check match exists
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // ✅ STEP 2: Update match status dynamically
    const updatedStatus = getMatchStatus(match.startTime, match.endTime, match.status);

    if (match.status !== updatedStatus) {
      match.status = updatedStatus;
      await match.save();
    }

    // ✅ STEP 3: Allow only if LIVE
    if (match.status !== "live") {
      return res.status(400).json({
        error: `Cannot add commentary. Match is ${match.status}`,
      });
    }

    // ✅ STEP 4: Create commentary
    const { minute, ...rest } = bodyResult.data;

    const result = await Commentary.create({
      matchId,
      minute,
      ...rest,
    });

    // ✅ STEP 5: Broadcast
    if (res.app.locals.broadcastCommentary) {
      res.app.locals.broadcastCommentary(result.matchId, result);
    }

    res.status(201).json({ data: result });
  } catch (error) {
    console.error("Failed to create commentary:", error);
    res.status(500).json({ error: "Failed to create commentary." });
  }
});
