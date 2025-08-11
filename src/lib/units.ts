// src/lib/units.ts
// Konwersje jednostek używane w całej aplikacji.

export type Unit = "mm" | "cm" | "in";

export const unitFactorToMM: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
};

export const toMM = (v: number, unit: Unit): number =>
  v * unitFactorToMM[unit];

export const fromMM = (vmm: number, unit: Unit): number =>
  vmm / unitFactorToMM[unit];

export const convertUnit = (value: number, from: Unit, to: Unit): number =>
  fromMM(toMM(value, from), to);
