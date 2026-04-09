import { Match } from "../models/match.model.js";
import { getMatchStatus } from "./match-status.js";

const outcomes = [0, 1, 2, 3, 4, 6]; // realistic cricket

function getRandomOutcome() {
  const isWicket = Math.random() < 0.1; // 10% chance wicket

  if (isWicket) return "W";

  return outcomes[Math.floor(Math.random() * outcomes.length)];
}

export function startScoreSimulation(broadcastMatchUpdated) {
  setInterval(async () => {
    const matches = await Match.find();
    let updated = false;

    for (const match of matches) {
      const status = getMatchStatus(match.startTime, match.endTime);

      // 🔥 update DB status
      if (match.status !== status) {
        match.status = status;
        updated = true;
      }

      if (status !== "live") {
        if (updated) {
          await match.save();
          broadcastMatchUpdated(match);
        }
        continue;
      }

      const outcome = getRandomOutcome();
      const isHomeBatting = Math.random() > 0.5;

      if (outcome === "W") {
        console.log(`WICKET in ${match.homeTeam} vs ${match.awayTeam}`);
      } else {
        if (isHomeBatting) {
          match.homeScore += outcome;
        } else {
          match.awayScore += outcome;
        }
        updated = true;
      }

      // ✅ Save only if something changed
      if (updated) {
        await match.save();
        broadcastMatchUpdated(match);
      }
    }
  }, 2000); // every 2 sec (feels live)
}
