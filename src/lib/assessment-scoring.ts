export function sumQuestionScores(scores: Record<string, number | string>): number {
  return Object.values(scores).reduce<number>((sum, val) => sum + (Number(val) || 0), 0);
}

export function computeFinalAssessmentScore(opts: {
  rawScore: number;
  integrityDeduction?: number;
  lateDueDeduction?: number;
  lateTimerDeduction?: number;
  maxScore?: number;
}): number {
  const {
    rawScore,
    integrityDeduction = 0,
    lateDueDeduction = 0,
    lateTimerDeduction = 0,
    maxScore,
  } = opts;

  const final = Math.max(
    0,
    rawScore - integrityDeduction - lateDueDeduction - lateTimerDeduction,
  );

  if (maxScore !== undefined) {
    return Math.min(final, maxScore);
  }

  return final;
}

export function suggestedLateDueDeduction(
  isLateDue: boolean,
  penaltyPoints?: number | null,
): number {
  if (!isLateDue) return 0;
  return Math.max(0, Number(penaltyPoints) || 0);
}

export function suggestedLateTimerDeduction(
  isLateTimer: boolean,
  penaltyPoints?: number | null,
): number {
  if (!isLateTimer) return 0;
  return Math.max(0, Number(penaltyPoints) || 0);
}
