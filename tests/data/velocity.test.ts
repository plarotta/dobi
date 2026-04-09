import { describe, it, expect } from "vitest";
import { computeVelocity } from "../../src/data/velocity.js";
import type { SprintSummary } from "../../src/data/sprints.js";

function makeSummary(num: number, planned: number, completed: number, status: "active" | "closed" = "closed"): SprintSummary {
  return {
    number: num,
    goal: `Sprint ${num}`,
    plannedPoints: planned,
    completedPoints: completed,
    status,
    startDate: "2026-01-01",
    endDate: "2026-01-14",
  };
}

describe("computeVelocity", () => {
  it("returns zero velocity for no sprints", () => {
    const result = computeVelocity([]);
    expect(result.averageVelocity).toBe(0);
    expect(result.sprints).toEqual([]);
    expect(result.trend).toBe("stable");
  });

  it("ignores active sprints", () => {
    const result = computeVelocity([makeSummary(1, 10, 8, "active")]);
    expect(result.averageVelocity).toBe(0);
    expect(result.sprints).toEqual([]);
  });

  it("computes average from closed sprints", () => {
    const summaries = [
      makeSummary(1, 10, 8),
      makeSummary(2, 12, 10),
      makeSummary(3, 11, 12),
    ];
    const result = computeVelocity(summaries);
    expect(result.averageVelocity).toBe(10);
    expect(result.sprints).toHaveLength(3);
  });

  it("uses window size to limit sprints", () => {
    const summaries = [
      makeSummary(1, 10, 5),
      makeSummary(2, 10, 8),
      makeSummary(3, 10, 10),
      makeSummary(4, 10, 12),
    ];
    const result = computeVelocity(summaries, 2);
    expect(result.sprints).toHaveLength(2);
    expect(result.sprints[0].number).toBe(3);
    expect(result.sprints[1].number).toBe(4);
    expect(result.averageVelocity).toBe(11);
  });

  it("detects upward trend", () => {
    const summaries = [makeSummary(1, 10, 8), makeSummary(2, 10, 12)];
    expect(computeVelocity(summaries).trend).toBe("up");
  });

  it("detects downward trend", () => {
    const summaries = [makeSummary(1, 10, 12), makeSummary(2, 10, 8)];
    expect(computeVelocity(summaries).trend).toBe("down");
  });

  it("detects stable trend", () => {
    const summaries = [makeSummary(1, 10, 10), makeSummary(2, 10, 10)];
    expect(computeVelocity(summaries).trend).toBe("stable");
  });
});
