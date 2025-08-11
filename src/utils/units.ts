// src/utils/units.ts
export type Unit = "mm" | "cm" | "in";

const unitFactorToMM: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
};

export const toMM = (v: number, unit: Unit): number => v * unitFactorToMM[unit];
export const fromMM = (vmm: number, unit: Unit): number =>
  vmm / unitFactorToMM[unit];
