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
  /** Udział długości przedłużenia dolnej ramy (0..1) względem podstawy ogona */
  bottomExtFrac?: number;
  /** Gdzie startuje skos #2 wzdłuż podstawy ogona (0..1) */
  skew2Frac?: number;
  /** Do jakiej wysokości (ułamkiem outerH) celuje skos #2 przy ramie */
  skew2TargetHFrac?: number;
};

export default function TailManual({
  outerW, outerH, frameT, hA, hP, hO, scale, side, labels,
  visBaseFrac = 0.8,
  bottomExtFrac = 0.5,
  skew2Frac = 0.6,
  skew2TargetHFrac = 0.5,
}: TailManualProps) {
  const mm = (v: number) => v * scale;
  const fillFrame = "#94a3b8";
  const dir = side === "right" ? 1 : -1;

  // lekkie nadrysowanie TYLKO od strony ramy (żeby zniknęły mikro-szczeliny)
  const EPS = 1.75 / Math.max(scale, 1e-6);

  // poziomy
  const yOmegaTop = outerH + hA + hP;
  const yBottomTop = outerH - frameT;     // górna krawędź dolnej ramy
  const omegaAxisY = yOmegaTop + hO / 2;

  // podstawa ogona (wizualnie)
  const baseLen = Math.max(0, outerH * visBaseFrac);
  const baseStartX = side === "right" ? outerW : 0;
  const baseEndX = baseStartX + dir * baseLen;

  // oś przy ramie + górna rama
  const rightAxisX = side === "right" ? outerW - frameT / 2 : frameT / 2;
  const topAxisY = frameT / 2;

  // ===== skos #1: kierunek i funkcja równoległej =====
  const dx1 = rightAxisX - baseEndX;
  const dy1 = topAxisY - omegaAxisY;

  // Równoległa do skosu #1 przechodząca przez (x0,y0):
  // x - k*y = C, k = dx1/dy1 (gdy dy1~0 => k=0)
  const xOnParallelThrough = (x0: number, y0: number, y: number) => {
    const k = Math.abs(dy1) < 1e-9 ? 0 : dx1 / dy1;
    const C = x0 - k * y0;
    return C + k * y;
  };

  // helper: „pas” o grubości t, z nadrysowaniem na początku/końcu
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

  // ===== 1) OMEGA – przedłużenie cięte równoległą do skosu #1 przez koniec ogona =====
  const xCutTopOmega = xOnParallelThrough(baseEndX, omegaAxisY, yOmegaTop);
  const xCutBotOmega = xOnParallelThrough(baseEndX, omegaAxisY, yOmegaTop + hO);

  const omegaExtPointsRight: Array<[number, number]> = [
    [baseStartX, yOmegaTop],
    [xCutTopOmega, yOmegaTop],
    [xCutBotOmega, yOmegaTop + hO],
    [baseStartX, yOmegaTop + hO],
  ];
  const omegaExtPointsLeft: Array<[number, number]> = [
    [baseStartX, yOmegaTop],
    [baseStartX, yOmegaTop + hO],
    [xCutBotOmega, yOmegaTop + hO],
    [xCutTopOmega, yOmegaTop],
  ];
  const omegaExtPts = (side === "right" ? omegaExtPointsRight : omegaExtPointsLeft)
    .map(([x, y]) => `${mm(x)},${mm(y)}`).join(" ");

  // ===== 2) DOLNA RAMA – bez przesunięcia; liczona po podstawie omegi =====
  const baseY = yOmegaTop + hO;
  const anchorBaseX = baseStartX + dir * (baseLen * Math.max(0, Math.min(1, bottomExtFrac)));

  const xCutTopBot = xOnParallelThrough(anchorBaseX, baseY, yBottomTop);
  const xCutBotBot = xOnParallelThrough(anchorBaseX, baseY, yBottomTop + frameT);

  const bottomExtPointsRight: Array<[number, number]> = [
    [baseStartX, yBottomTop],
    [xCutTopBot, yBottomTop],
    [xCutBotBot, yBottomTop + frameT],
    [baseStartX, yBottomTop + frameT],
  ];
  const bottomExtPointsLeft: Array<[number, number]> = [
    [baseStartX, yBottomTop],
    [baseStartX, yBottomTop + frameT],
    [xCutBotBot, yBottomTop + frameT],
    [xCutTopBot, yBottomTop],
  ];
  const bottomExtPts = (side === "right" ? bottomExtPointsRight : bottomExtPointsLeft)
    .map(([x, y]) => `${mm(x)},${mm(y)}`).join(" ");

  // ===== 3) SKOSY – overdraw tylko przy ramie =====
  const skew1 = Band(
    baseEndX, omegaAxisY,      // czubek ogona
    rightAxisX, topAxisY,      // przy ramie
    frameT,
    0, EPS
  );

  const s2x0 = baseStartX + dir * (baseLen * Math.max(0, Math.min(1, skew2Frac)));
  const s2y0 = omegaAxisY;
  const s2x1 = rightAxisX;
  const s2y1 = outerH * Math.max(0, Math.min(1, skew2TargetHFrac));
  const skew2 = Band(s2x0, s2y0, s2x1, s2y1, frameT, 0, EPS);

  // ===== 4) etykiety (opcjonalne) =====
  const textStyle: React.CSSProperties = {
    paintOrder: "stroke",
    stroke: "#fff",
    strokeWidth: 3,
    fontVariantNumeric: "tabular-nums",
  } as unknown as React.CSSProperties;

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
