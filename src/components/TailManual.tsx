// src/components/TailManual.tsx
import type { CSSProperties } from "react";
import type { TailManualLabels } from "../types/tail";

export type TailManualProps = {
  outerW: number;
  outerH: number;
  frameT: number;
  hA: number;
  hP: number;
  hO: number;
  scale: number;
  side: "left" | "right";
  labels?: TailManualLabels;

  visBaseFrac?: number;        // długość podstawy ogona = frac * outerH
  bottomExtFrac?: number;      // 0..1 – przedłużenie dolnej ramy
  omegaExtFrac?: number;       // 0..1 – przedłużenie omegi
  skew2Frac?: number;          // start skosu #2 po podstawie (0..1)
  skew2TargetHFrac?: number;   // wysokość celu skosu #2 przy ramie (0..1)
};

export default function TailManual({
  outerW, outerH, frameT, hA, hP, hO, scale, side, labels,
  visBaseFrac = 0.8,
  bottomExtFrac = 0.5,
  omegaExtFrac = 1,
  skew2Frac = 0.6,
  skew2TargetHFrac = 0.5,
}: TailManualProps) {
  const mm = (v: number) => v * scale;
  const fillFrame = "#94a3b8";
  const stroke = "#333";
  const dir = side === "right" ? 1 : -1;

  // overdraw w pikselach (przeliczane na mm)
  const PX = 1 / Math.max(scale, 1e-6);
  const EPS_START = 0.25 * PX; // ~0.25 px – delikatnie na początku
  const EPS_END   = 0.90 * PX; // ~0.9  px – mocniej przy ramie

  // poziomy referencyjne
  const yOmegaTop = outerH + hA + hP;
  const yBottomTop = outerH - frameT;
  const omegaAxisY = yOmegaTop + hO / 2;

  // podstawa ogona
  const baseLen = Math.max(0, outerH * visBaseFrac);
  const baseStartX = side === "right" ? outerW : 0;
  const baseEndX = baseStartX + dir * baseLen;

  // oś przy ramie + top frame
  const rightAxisX = side === "right" ? outerW - frameT / 2 : frameT / 2;
  const topAxisY = frameT / 2;

  // skos #1 (wektor)
  const dx1 = rightAxisX - baseEndX;
  const dy1 = topAxisY - omegaAxisY;

  // równoległa do skosu #1 przechodząca przez (x0, y0)
  const xOnParallelThrough = (x0: number, y0: number, y: number) => {
    const k = Math.abs(dy1) < 1e-9 ? 0 : dx1 / dy1;
    const C = x0 - k * y0;
    return C + k * y;
  };

  // „pas” o grubości t, z nadrysowaniem na początku/końcu
  const Band = (
    x1: number, y1: number, x2: number, y2: number, t: number,
    startExt = 0, endExt = 0
  ) => {
    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const ox = -uy * (t / 2), oy = ux * (t / 2);

    const ax = x1 - ux * startExt, ay = y1 - uy * startExt;
    const bx = x2 + ux * endExt,   by = y2 + uy * endExt;

    const pts = [
      [ax + ox, ay + oy],
      [bx + ox, by + oy],
      [bx - ox, by - oy],
      [ax - ox, ay - oy],
    ];
    const d = pts.map(([px, py]) => `${mm(px)},${mm(py)}`).join(" ");
    return <polygon points={d} fill={fillFrame} vectorEffect="non-scaling-stroke" />;
  };

  // 1) OMEGA – przedłużenie cięte równoległą do skosu #1
  const omegaAnchorX = baseStartX + dir * (baseLen * clamp01(omegaExtFrac));
  const xCutTopOmega = xOnParallelThrough(omegaAnchorX, omegaAxisY, yOmegaTop);
  const xCutBotOmega = xOnParallelThrough(omegaAnchorX, omegaAxisY, yOmegaTop + hO);

  const omegaExtPts = (side === "right"
    ? [
        [baseStartX, yOmegaTop],
        [xCutTopOmega, yOmegaTop],
        [xCutBotOmega, yOmegaTop + hO],
        [baseStartX, yOmegaTop + hO],
      ]
    : [
        [baseStartX, yOmegaTop],
        [baseStartX, yOmegaTop + hO],
        [xCutBotOmega, yOmegaTop + hO],
        [xCutTopOmega, yOmegaTop],
      ]
  ).map(([x, y]) => `${mm(x)},${mm(y)}`).join(" ");

  // 2) DOLNA RAMA – przedłużenie liczone po podstawie ogona
  const baseY = yOmegaTop + hO;
  const anchorBaseX = baseStartX + dir * (baseLen * clamp01(bottomExtFrac));
  const xCutTopBot = xOnParallelThrough(anchorBaseX, baseY, yBottomTop);
  const xCutBotBot = xOnParallelThrough(anchorBaseX, baseY, yBottomTop + frameT);

  const bottomExtPts = (side === "right"
    ? [
        [baseStartX, yBottomTop],
        [xCutTopBot, yBottomTop],
        [xCutBotBot, yBottomTop + frameT],
        [baseStartX, yBottomTop + frameT],
      ]
    : [
        [baseStartX, yBottomTop],
        [baseStartX, yBottomTop + frameT],
        [xCutBotBot, yBottomTop + frameT],
        [xCutTopBot, yBottomTop],
      ]
  ).map(([x, y]) => `${mm(x)},${mm(y)}`).join(" ");

  // 3) SKOSY – z lekkim overdrawem na obu końcach
  const skew1 = Band(
    baseEndX, omegaAxisY,
    rightAxisX, topAxisY,
    frameT,
    EPS_START,   // nowość
    EPS_END
  );

  const s2x0 = baseStartX + dir * (baseLen * clamp01(skew2Frac));
  const s2y0 = omegaAxisY;
  const s2x1 = rightAxisX;
  const s2y1 = outerH * clamp01(skew2TargetHFrac);
  const skew2 = Band(
    s2x0, s2y0,
    s2x1, s2y1,
    frameT,
    EPS_START,   // nowość
    EPS_END
  );

  // 4) Etykiety (poglądowe)
  const textStyle: CSSProperties = {
    paintOrder: "stroke",
    stroke: "#fff",
    strokeWidth: 3,
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* przedłużenie dolnej ramy */}
      <polygon points={bottomExtPts} fill={fillFrame} vectorEffect="non-scaling-stroke" />
      {/* przedłużenie omegi */}
      <polygon points={omegaExtPts} fill={fillFrame} vectorEffect="non-scaling-stroke" />
      {/* skosy */}
      {skew1}
      {skew2}

      {/* (opcjonalne) opisy użytkownika */}
      {labels?.omega && (
        <text
          x={mm(baseStartX + (side === "right" ? 8 : -8))}
          y={mm(yOmegaTop + hO) - 6}
          fontSize={11}
          textAnchor={side === "right" ? "start" : "end"}
          style={textStyle}
          fill={stroke}
        >
          {labels.omega}
        </text>
      )}
      {labels?.base && (
        <text
          x={mm((baseStartX + baseEndX) / 2)}
          y={mm(yOmegaTop) - 6}
          fontSize={11}
          textAnchor="middle"
          style={textStyle}
          fill={stroke}
        >
          {labels.base}
        </text>
      )}
      {labels?.vertical && (
        <text
          x={mm(rightAxisX)}
          y={mm(outerH * 0.15)}
          fontSize={11}
          textAnchor="middle"
          style={textStyle}
          fill={stroke}
        >
          {labels.vertical}
        </text>
      )}
      {labels?.diagonal && (
        <text
          x={mm((rightAxisX + baseEndX) / 2)}
          y={mm((topAxisY + omegaAxisY) / 2) - 6}
          fontSize={11}
          textAnchor="middle"
          style={textStyle}
          fill={stroke}
        >
          {labels.diagonal}
        </text>
      )}
      {labels?.support && (
        <text
          x={mm((baseStartX + baseEndX) / 2)}
          y={mm(yBottomTop) - 6}
          fontSize={11}
          textAnchor="middle"
          style={textStyle}
          fill={stroke}
        >
          {labels.support}
        </text>
      )}
    </g>
  );
}

function clamp01(v: number) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
