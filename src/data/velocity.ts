import type { SprintSummary } from "./sprints.js";

export interface VelocityData {
  /** Average completed points over the included sprints. */
  averageVelocity: number;
  /** Per-sprint breakdown. */
  sprints: Array<{
    number: number;
    planned: number;
    completed: number;
  }>;
  /** "up" | "down" | "stable" based on recent trend. */
  trend: "up" | "down" | "stable";
}

/**
 * Compute velocity from sprint summaries.
 * Only considers closed sprints. Uses last `windowSize` sprints (default 3).
 */
export function computeVelocity(
  summaries: SprintSummary[],
  windowSize = 3
): VelocityData {
  const closed = summaries
    .filter((s) => s.status === "closed")
    .sort((a, b) => a.number - b.number);

  const window = closed.slice(-windowSize);

  if (window.length === 0) {
    return { averageVelocity: 0, sprints: [], trend: "stable" };
  }

  const sprints = window.map((s) => ({
    number: s.number,
    planned: s.plannedPoints,
    completed: s.completedPoints,
  }));

  const totalCompleted = sprints.reduce((sum, s) => sum + s.completed, 0);
  const averageVelocity =
    Math.round((totalCompleted / sprints.length) * 10) / 10;

  let trend: VelocityData["trend"] = "stable";
  if (sprints.length >= 2) {
    const recent = sprints[sprints.length - 1].completed;
    const previous = sprints[sprints.length - 2].completed;
    if (recent > previous) trend = "up";
    else if (recent < previous) trend = "down";
  }

  return { averageVelocity, sprints, trend };
}
