// src/lib/math.ts
// Pomocnicze funkcje liczbowe — spójne zaokrąglanie i formatowanie (2 miejsca po przecinku)

export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

export const fmt2 = (n: number): string => round2(n).toFixed(2);

export const sum = (a: number[]): number =>
  a.reduce((acc, v) => acc + v, 0);

export const parseNumber = (raw: string): number => {
  if (raw.trim() === "") return NaN;
  const v = Number(raw.replace(",", "."));
  return Number.isFinite(v) ? v : NaN;
};
