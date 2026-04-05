import { MATCH_STATUS } from "../validation/matches.js";

export function getMatchStatus(
  startTime,
  endTime,
  currentStatus,
  now = new Date(),
) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  // ✅ finished always final
  if (now >= end) {
    return MATCH_STATUS.FINISHED;
  }

  // ✅ once live → always live (until finished)
  if (currentStatus === MATCH_STATUS.LIVE) {
    return MATCH_STATUS.LIVE;
  }

  // ✅ normal flow
  if (now >= start) {
    return MATCH_STATUS.LIVE;
  }

  return MATCH_STATUS.SCHEDULED;
}

export async function syncMatchStatus(match, updateStatus) {
  const nextStatus = getMatchStatus(
    match.startTime,
    match.endTime,
    match.status,
  );

  if (!nextStatus) {
    return match.status;
  }

  if (match.status !== nextStatus) {
    await updateStatus(nextStatus);
    match.status = nextStatus;
  }

  return match.status;
}
