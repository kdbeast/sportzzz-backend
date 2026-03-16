import { Router } from "express";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.js";
import {
  createMatchSchema,
  listMatchesQuerySchema,
  MATCH_STATUS,
} from "../validation/matches.js";
import { desc } from "drizzle-orm";

export const matchRouter = Router();

const MAX_LIMIT = 50;

matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);
    console.log("Matches fetched", data);
    return res.status(200).json({ data });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  const { startTime, endTime, homeScore, awayScore } = parsed.data;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime) ?? MATCH_STATUS.SCHEDULED,
      })
      .returning();

    if (res.app.locals.broadcastMatchCreated) {
      res.app.locals.broadcastMatchCreated(event);
    }

    return res.status(201).json(event);
  } catch (error) {
    console.error("Error creating match:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
