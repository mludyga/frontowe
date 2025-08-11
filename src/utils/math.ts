// src/utils/math.ts
export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

export const fmt2 = (n: number): string => round2(n).toFixed(2);

// pomocnicze – jeśli będziesz chciał je importować zamiast trzymać lokalnie
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export function parseNumber(raw: string): number {
  if (raw.trim() === "") return NaN;
  const v = Number(raw.replace(",", "."));
  return Number.isFinite(v) ? v : NaN;
}
