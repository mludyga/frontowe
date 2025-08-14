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

  // delikatne nadrysowanie tylko dla SKOSÓW (żeby nie było „szparek” przy łączeniach)
  const EPS = 1.75 / Math.max(scale, 1e-6);

  // poziomy
  const yOmegaTop = outerH + hA + hP;
  const yBottomTop = outerH - frameT;       // górna krawędź dolnej ramy
  const omegaAxisY = yOmegaTop + hO / 2;

  // podstawa ogona (wizualnie)
  const baseLen = Math.max(0, outerH * visBaseFrac);
  const baseStartX = side === "right" ? outerW : 0;
  const baseEndX = baseStartX + dir * baseLen;

  // oś pionu przy ramie i górna rama
  const rightAxisX = side === "right" ? outerW - frameT / 2 : frameT / 2;
  const topAxisY = frameT / 2;

  // ===== skos #1: wektor + normalna =====
  const dx1 = rightAxisX - baseEndX;
  const dy1 = topAxisY - omegaAxisY;
  const L1 = Math.hypot(dx1, dy1) || 1;
  const ux1 = dx1 / L1, uy1 = dy1 / L1;
  const nx = -uy1, ny = ux1;
  const nSign = side === "right" ? 1 : -1;

  // Funkcja: x(y) dla linii RÓWNOLEGŁEJ do skosu #1 przechodzącej przez (x0, y0)
  const xOnParallelThrough = (x0: number, y0: number, y: number) => {
    const k = Math.abs(dy1) < 1e-9 ? 0 : dx1 / dy1;       // nachylenie w ukł. (x od y)
    // równanie rodziny: x - k*y = const
    const C = x0 - k * y0;
    return C + k * y;
  };

  // pomocnik – „pas” o grubości t z osobnym overdraw na początku/końcu
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

  // ===== 1) OMEGA – przedłużenie cięte linią równoległą do skosu #1 przez KONIEC ogona =====
  // (tu zostawiamy drobny overdraw na skosie; omega sama nie ma shiftu – skos to przykryje)
  const xCutTopOmega = xOnParallelThrough(baseEndX, omegaAxisY, yOmegaTop);
  const xCutBotOmega = xOnParallelThrough(baseEndX, omegaAxisY, yOmegaTop + hO);

  const omegaExt =
    side === "right" ? (
      <polygon
        points={[
          [baseStartX, yOmegaTop],
          [xCutTopOmega, yOmegaTop],
          [xCutBotOmega, yOmegaTop + hO],
          [baseStartX, yOmegaTop + hO],
        ].map(([x, y]) => `${mm(x)},${mm(y)}`).join(" ")}
        fill={fillFrame}
        vectorEffect="non-scaling-stroke"
      />
    ) : (
      <polygon
        points={[
          [baseStartX, yOmegaTop],
          [baseStartX, yOmegaTop + hO],
          [xCutBotOmega, yOmegaTop + hO],
          [xCutTopOmega, yOmegaTop],
        ].map(([x, y]) => `${mm(x)},${mm(y)}`).join(" ")}
        fill={fillFrame}
        vectorEffect="non-scaling-stroke"
      />
    );

  // ===== 2) DOLNA RAMA – LICZONA po PODSTAWIE OMEGI i BEZ „cutShift” =====
  // Chcemy 50% (lub bottomExtFrac) długości podstawy ogona liczonej od ramy.
  const baseY = yOmegaTop + hO; // podstawa omegi
  const anchorBaseX = baseStartX + dir * (baseLen * Math.max(0, Math.min(1, bottomExtFrac)));

  // Docinamy dolną ramę równoległą do skosu #1 PRZEZ (anchorBaseX, baseY)
  const xCutTopBot  = xOnParallelThrough(anchorBaseX, baseY, yBottomTop);
  const xCutBotBot  = xOnParallelThrough(anchorBaseX, baseY, yBottomTop + frameT);

  const bottomExt =
    side === "right" ? (
      <polygon
        points={[
          [baseStartX, yBottomTop],
          [xCutTopBot, yBottomTop],
          [xCutBotBot, yBottomTop + frameT],
          [baseStartX, yBottomTop + frameT],
        ].map(([x, y]) => `${mm(x)},${mm(y)}`).join(" ")}
        fill={fillFrame}
        vectorEffect="non-scaling-stroke"
      />
    ) : (
      <polygon
        points={[
          [baseStartX, yBottomTop],
          [baseStartX, yBottomTop + frameT],
          [xCutBotBot, yBottomTop + frameT],
          [xCutTopBot, yBottomTop],
        ].map(([x, y]) => `${mm(x)},${mm(y)}`).join(" ")}
        fill={fillFrame}
        vectorEffect="non-scaling-stroke"
      />
    );

  // ===== 3) SKOSY – overdraw tylko OD STRONY RAMY (na czubku = 0) =====
  const skew1 = Band(
    baseEndX, omegaAxisY,   // czubek ogona
    rightAxisX, topAxisY,   // przy ramie
    frameT,
    0, EPS
  );

  const s2x0 = baseStartX + dir * (baseLen * Math.max(0, Math.min(1, skew2Frac)));
  const s2y0 = omegaAxisY;
  const s2x1 = rightAxisX;
  const s2y1 = outerH * Math.max(0, Math.min(1, skew2TargetHFrac));
  const skew2 = Band(s2x0, s2y0, s2x1, s2y1, frameT, 0, EPS);

  // ===== 4) (opcjonalne) etykiety =====
  const textStyle = {
    paintOrder: "stroke",
    stroke: "#fff",
    strokeWidth: 3,
    fontVariantNumeric: "tabular-nums",
  } as const;

  const labelsG = (
    <g>
      {labels?.omega && (
        <text x={mm(baseStartX + (side === "right" ? 8 : -8))}
              y={mm(yOmegaTop + hO) - 6}
              fontSize={11}
              textAnchor={side === "right" ? "start" : "end"}
              style={textStyle}>
          {labels.omega}
        </text>
      )}
      {labels?.base && (
        <text x={mm((baseStartX + baseEndX) / 2)} y={mm(yOmegaTop) - 6}
              fontSize={11} textAnchor="middle" style={textStyle}>
          {labels.base}
        </text>
      )}
      {labels?.vertical && (
        <text x={mm(rightAxisX)} y={mm(outerH * 0.15)}
              fontSize={11} textAnchor="middle" style={textStyle}>
          {labels.vertical}
        </text>
      )}
      {labels?.diagonal && (
        <text x={mm((rightAxisX + baseEndX) / 2)} y={mm((topAxisY + omegaAxisY) / 2) - 6}
              fontSize={11} textAnchor="middle" style={textStyle}>
          {labels.diagonal}
        </text>
      )}
      {labels?.support && (
        <text x={mm((baseStartX + baseEndX) / 2)} y={mm(yBottomTop) - 6}
              fontSize={11} textAnchor="middle" style={textStyle}>
          {labels.support}
        </text>
      )}
    </g>
  );

  return (
    <g style={{ pointerEvents: "none" }}>
      {bottomExt}
      {omegaExt}
      {skew1}
      {skew2}
      {labelsG}
    </g>
  );
}
