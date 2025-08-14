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

  /** Wizualna długość podstawy ogona = visBaseFrac * outerH */
  visBaseFrac?: number;

  /** Udział długości przedłużenia dolnej ramy względem podstawy ogona (0..1) */
  bottomExtFrac?: number;

  /** Gdzie startuje skos #2 wzdłuż podstawy ogona (0..1) */
  skew2Frac?: number;

  /** Do jakiej wysokości (ułamkiem outerH) celuje skos #2 przy ramie (0..1) */
  skew2TargetHFrac?: number;

  /** Naddatek (mm) – o ile WYDŁUŻYĆ trapez omegi poza standardowe cięcie */
  omegaExtExtraMM?: 200;

  /** Naddatek (mm) – o ile WYDŁUŻYĆ przedłużenie dolnej ramy */
  bottomExtExtraMM?: 200;
};

export default function TailManual({
  outerW, outerH, frameT, hA, hP, hO, scale, side, labels,
  visBaseFrac = 0.8,
  bottomExtFrac = 0.5,
  skew2Frac = 0.6,
  skew2TargetHFrac = 0.5,
  omegaExtExtraMM = 12,      // <— TUTAJ regulujesz długość omegi (mm)
  bottomExtExtraMM = 12,     // <— TUTAJ regulujesz długość dolnej ramy (mm)
}: TailManualProps) {
  const mm = (v: number) => v * scale;
  const fillFrame = "#94a3b8";
  const dir = side === "right" ? 1 : -1;

  // overdraw (w px) zamieniony na mm – żeby domknąć styk skosów
  const PX = 1 / Math.max(scale, 1e-6);
  const EPS_START = 0.25 * PX; // delikatnie na początku
  const EPS_END   = 0.90 * PX; // mocniej przy ramie

  // poziomy odniesienia
  const yOmegaTop = outerH + hA + hP;
  const yBottomTop = outerH - frameT;
  const omegaAxisY = yOmegaTop + hO / 2;

  // podstawa ogona
  const baseLen = Math.max(0, outerH * visBaseFrac);
  const baseStartX = side === "right" ? outerW : 0;
  const baseEndX = baseStartX + dir * baseLen;

  // oś przy ramie + górna rama
  const rightAxisX = side === "right" ? outerW - frameT / 2 : frameT / 2;
  const topAxisY = frameT / 2;

  // wektor skosu #1 (od czubka ogona do ramy)
  const dx1 = rightAxisX - baseEndX;
  const dy1 = topAxisY - omegaAxisY;
  const L1 = Math.hypot(dx1, dy1) || 1;
  const ux1 = dx1 / L1;
  const uy1 = dy1 / L1;

  // równoległa do skosu #1 przechodząca przez (x0, y0) => x - k*y = C
  const xOnParallelThrough = (x0: number, y0: number, y: number) => {
    const k = Math.abs(dy1) < 1e-9 ? 0 : dx1 / dy1;
    const C = x0 - k * y0;
    return C + k * y;
  };

  // helper: „pas” o grubości t (bez stroke), z nadrysowaniem na końcach
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

  // ===== 1) OMEGA – trapez z naddatkiem wzdłuż kierunku skosu #1 =====
  // bazowo tniemy równoległą przez (baseEndX, omegaAxisY); żeby wydłużyć,
  // przesuwamy punkt „przez który prowadzimy” O W D O Ł kwestii skosu #1.
  const omegaShiftX = -ux1 * omegaExtExtraMM;
  const omegaShiftY = -uy1 * omegaExtExtraMM;
  const xCutTopOmega = xOnParallelThrough(baseEndX + omegaShiftX, omegaAxisY + omegaShiftY, yOmegaTop);
  const xCutBotOmega = xOnParallelThrough(baseEndX + omegaShiftX, omegaAxisY + omegaShiftY, yOmegaTop + hO);

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

  // ===== 2) DOLNA RAMA – przedłużenie z naddatkiem w tym samym kierunku =====
  const baseY = yOmegaTop + hO;
  const anchorBaseX = baseStartX + dir * (baseLen * clamp01(bottomExtFrac));
  const xCutTopBot = xOnParallelThrough(anchorBaseX - ux1 * bottomExtExtraMM, baseY - uy1 * bottomExtExtraMM, yBottomTop);
  const xCutBotBot = xOnParallelThrough(anchorBaseX - ux1 * bottomExtExtraMM, baseY - uy1 * bottomExtExtraMM, yBottomTop + frameT);

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

  // ===== 3) SKOSY – z lekkim overdrawem na obu końcach =====
  const skew1 = Band(
    baseEndX, omegaAxisY,
    rightAxisX, topAxisY,
    frameT,
    EPS_START, EPS_END
  );

  const s2x0 = baseStartX + dir * (baseLen * clamp01(skew2Frac));
  const s2y0 = omegaAxisY;
  const s2x1 = rightAxisX;
  const s2y1 = outerH * clamp01(skew2TargetHFrac);
  const skew2 = Band(
    s2x0, s2y0,
    s2x1, s2y1,
    frameT,
    EPS_START, EPS_END
  );

  // ===== 4) Etykiety (opcjonalne, wpisywane ręcznie przez klienta) =====
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

      {/* etykiety (jeśli podane) */}
      {labels?.omega && (
        <text
          x={mm(baseStartX + (side === "right" ? 8 : -8))}
          y={mm(yOmegaTop + hO) - 6}
          fontSize={11}
          textAnchor={side === "right" ? "start" : "end"}
          style={textStyle}
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
