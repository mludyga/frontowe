// src/types/tail.ts
export type TailMode = 'auto' | 'manual';

export interface TailManualLabels {
  vertical?: string;   // pion
  diagonal?: string;   // przekątna (duża)
  base?: string;       // podstawa
  omega?: string;      // omega
  support?: string;    // wspornik
}

export interface TailSettings {
  enabled: boolean;
  side: 'left' | 'right';
  /** długość ogona w podglądzie = heightMm * viewLengthRatio */
  viewLengthRatio: number;
  mode: TailMode;
  labels: TailManualLabels;
}
