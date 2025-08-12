import type { JSX } from "react";
import type { TailManualLabels } from "../types/tail";

type TailManualProps = {
  side: "left" | "right";
  outerW: number;        // szerokość korpusu
  outerH: number;        // wysokość korpusu
  frameT: number;        // grubość ramy (mm)
  omegaH: number;        // wysokość (grubość) omegi (mm)
  omegaTopY: number;     // pozycja Y górnej krawędzi omegi (mm) = outerH + hA + hP
  visBaseFrac: number;   // ułamek wysokości korpusu -> długość ogona L
  skew2Frac: number;     // ułamek długości L, gdzie zaczyna się skos #2 (np. 0.6)
  bottomExtFrac: number; // ułamek L dla przedłużenia dolnej ramy (np. 0.5)
  labels?: TailManualLabels;
  scale: number;
  stroke?: string;
  fillFrame?: string;
};

export default function TailManual({
  side,
  outerW,
  outerH,
  frameT,
  omegaH,
  omegaTopY,
  visBaseFrac,
  skew2Frac,
  bottomExtFrac,
  labels,
  scale,
  stroke = "#333",
  fillFrame = "#94a3b8",
}: TailManualProps): JSX.Element | null {
  if (omegaH <= 0 || visBaseFrac <= 0) return null;

  const mm = (v: number) => v * scale;
  const dir = side === "right" ? 1 : -1;

  // długość ogona L (poglądowa, z ułamka wysokości korpusu)
  const L = Math.max(0, outerH * visBaseFrac);

  // --- 1) przedłużenie omegi (w linii omegi), grubość = omegaH ---
  const extX = side === "right" ? outerW : outerW - L; // dla lewej rysujemy w lewo
  const extW = L;
  const extY = omegaTopY;
  const extH = omegaH;

  // --- 2) przedłużenie dolnej ramy (na dole korpusu) ---
  const bottomLen = Math.max(0, L * Math.max(0, Math.min(1, bottomExtFrac)));
  const bottomX = side === "right" ? outerW : outerW - bottomLen * (dir === -1 ? 1 : 0) - bottomLen * (dir === -1 ? 0 : 1);
  // prościej:
  const bX = side === "right" ? outerW : outerW - bottomLen;
  const bY = outerH - frameT;

  // --- 3) skosy (belki o grubości = frameT) ---
  // skos #1: od końca omegi do górnego narożnika ramy
  const s1x1 = side === "right" ? outerW + L : outerW - L;
  const s1y1 = extY;                    // górna krawędź omegi
  const s1x2 = side === "right" ? outerW : 0;
  const s1y2 = 0;

  // skos #2: od ~skew2Frac * L (liczone od ramy) do środka pionu
  const frac = Math.max(0, Math.min(1, skew2Frac));
  const s2x1 = side === "right" ? outerW + L * frac : outerW - L * frac;
  const s2y1 = extY;
  const s2x2 = side === "right" ? outerW - frameT / 2 : frameT / 2; // do pionu (środek profilu)
  const s2y2 = outerH / 2;

  // pomocnicze: rysowanie "belki" jako obróconego prostokąta o grubości frameT
  function beam(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null;
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    return (
      <g transform={`translate(${mm(x1)} ${mm(y1)}) rotate(${ang})`}>
        <rect
          x={0}
          y={mm(-frameT / 2)}
          width={mm(len)}
          height={mm(frameT)}
          fill={fillFrame}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  // styl napisów (użytkownik wpisuje własne wartości)
  const txt = {
    paintOrder: "stroke",
    stroke: "#fff",
    strokeWidth: 3,
    fontVariantNumeric: "tabular-nums",
  } as const;

  // środki elementów do opisów
  const mid = (a: number, b: number) => (a + b) / 2;

  return (
    <g>
      {/* przedłużenie omegi */}
      <rect
        x={mm(extX)}
        y={mm(extY)}
        width={mm(extW)}
        height={mm(extH)}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
      {labels?.omega && (
        <text x={mm(extX + extW / 2)} y={mm(extY) - 6} fontSize={11} textAnchor="middle" style={txt}>
          {labels.omega}
        </text>
      )}

      {/* przedłużenie dolnej ramy */}
      <rect
        x={mm(bX)}
        y={mm(bY)}
        width={mm(bottomLen)}
        height={mm(frameT)}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
      {labels?.base && (
        <text x={mm(bX + bottomLen / 2)} y={mm(bY) - 6} fontSize={11} textAnchor="middle" style={txt}>
          {labels.base}
        </text>
      )}

      {/* skosy */}
      {beam(s1x1, s1y1, s1x2, s1y2)}
      {labels?.diagonal && (
        <text x={mm(mid(s1x1, s1x2))} y={mm(mid(s1y1, s1y2)) - 6} fontSize={11} textAnchor="middle" style={txt}>
          {labels.diagonal}
        </text>
      )}

      {beam(s2x1, s2y1, s2x2, s2y2)}
      {labels?.vertical && (
        <text x={mm(mid(s2x1, s2x2))} y={mm(mid(s2y1, s2y2)) - 6} fontSize={11} textAnchor="middle" style={txt}>
          {labels.vertical}
        </text>
      )}

      {/* opcjonalny dodatkowy podpis */}
      {labels?.support && (
        <text x={mm(s1x2)} y={mm(s1y2) + 14} fontSize={11} textAnchor={side === "right" ? "end" : "start"} style={txt}>
          {labels.support}
        </text>
      )}
    </g>
  );
}
