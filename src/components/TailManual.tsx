// components/TailManual.tsx
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

  visBaseFrac?: number;
  bottomExtFrac?: number;
  skew2Frac?: number;
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

  // odrobina "overdraw", żeby absolutnie nic nie prześwitywało
  const EPS = 1.75 / Math.max(scale, 1e-6);

  // poziomy
  const yOmegaTop = outerH + hA + hP;
  const yBottomTop = outerH - frameT;

  // podstawa ogona (wizualnie)
  const baseLen = Math.max(0, outerH * visBaseFrac);
  const baseStartX = side === "right" ? outerW : 0;
  const baseEndX = baseStartX + dir * baseLen;

  // oś pionu po stronie ogona i oś górnej ramy
  const rightAxisX = side === "right" ? outerW - frameT / 2 : frameT / 2;
  const topAxisY = frameT / 2;

  // pomocnicza funkcja rysowania "pasów"
  const Band = (x1: number, y1: number, x2: number, y2: number, t: number, ext = 0) => {
    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const ox = -uy * (t / 2), oy = ux * (t / 2);

    const ax = x1 - ux * ext, ay = y1 - uy * ext;
    const bx = x2 + ux * ext, by = y2 + uy * ext;

    const pts = [
      [ax + ox, ay + oy],
      [bx + ox, by + oy],
      [bx - ox, by - oy],
      [ax - ox, ay - oy],
    ];
    const d = pts.map(([px, py]) => `${mm(px)},${mm(py)}`).join(" ");
    return <polygon points={d} fill={fillFrame} vectorEffect="non-scaling-stroke" />;
  };

  // ===== skos #1 – kierunek/cięcie =====
  // Oś skosu #1: (baseEndX, yOmegaTop + hO/2) -> (rightAxisX, topAxisY)
  const omegaAxisY = yOmegaTop + hO / 2;
  const dx1 = rightAxisX - baseEndX;
  const dy1 = topAxisY - omegaAxisY;
  const L1 = Math.hypot(dx1, dy1) || 1;
  const ux1 = dx1 / L1, uy1 = dy1 / L1;
  // normalna i przesunięcie cięcia "na zewnątrz"
  const nx = -uy1, ny = ux1;
  const nSign = side === "right" ? 1 : -1;
  const cutShiftX = nx * EPS * nSign;
  const cutShiftY = ny * EPS * nSign;

  // równoległa do skosu #1: x(y)
  const xOnCut = (y: number) =>
    baseEndX + (Math.abs(dy1) < 1e-9 ? 0 : (y - omegaAxisY) * (dx1 / dy1));

  // ===== 1) OMEGA – przedłużenie z ukosem =====
  {
    const y0 = yOmegaTop, y1 = yOmegaTop + hO;
    const xCutTop = xOnCut(y0) + cutShiftX;
    const xCutBot = xOnCut(y1) + cutShiftX;
    const yCutTop = y0 + cutShiftY;
    const yCutBot = y1 + cutShiftY;

    const pts =
      side === "right"
        ? [
            [baseStartX, y0],
            [xCutTop,    yCutTop],
            [xCutBot,    yCutBot],
            [baseStartX, y1],
          ]
        : [
            [baseStartX, y0],
            [baseStartX, y1],
            [xCutBot,    yCutBot],
            [xCutTop,    yCutTop],
          ];

    // rysuj
    const p = pts.map(([x, y]) => `${mm(x)},${mm(y)}`).join(" ");
    // @ts-ignore - zwracamy w <g> na końcu
    var omegaExt = <polygon points={p} fill={fillFrame} vectorEffect="non-scaling-stroke" />;
  }

  // ===== 2) DOLNA RAMA – przedłużenie z tym samym ukosem (zamiast płaskiego końca) =====
  {
    const extLen = baseLen * Math.max(0, Math.min(1, bottomExtFrac));
    const xFlatEnd = baseStartX + dir * extLen;

    // tniemy ten "prostokąt" linią równoległą do skosu #1
    const yTop = yBottomTop, yBot = yBottomTop + frameT;
    const xCutTop = xOnCut(yTop) + cutShiftX;
    const xCutBot = xOnCut(yBot) + cutShiftX;
    const yCutTop = yTop + cutShiftY;
    const yCutBot = yBot + cutShiftY;

    const pts =
      side === "right"
        ? [
            [baseStartX, yTop],
            [xCutTop,    yCutTop],
            [xCutBot,    yCutBot],
            [baseStartX, yBot],
          ]
        : [
            [baseStartX, yTop],
            [baseStartX, yBot],
            [xCutBot,    yCutBot],
            [xCutTop,    yCutTop],
          ];

    const p = pts.map(([x, y]) => `${mm(x)},${mm(y)}`).join(" ");
    // @ts-ignore
    var bottomExt = <polygon points={p} fill={fillFrame} vectorEffect="non-scaling-stroke" />;
  }

  // ===== 3) Skosy (pasy z "overdraw" na końcach) =====
  const skew1 = Band(
    baseEndX, omegaAxisY,
    rightAxisX, topAxisY,
    frameT, EPS
  );

  const s2x0 = baseStartX + dir * (baseLen * Math.max(0, Math.min(1, skew2Frac)));
  const s2y0 = omegaAxisY;
  const s2x1 = rightAxisX;
  const s2y1 = outerH * Math.max(0, Math.min(1, skew2TargetHFrac));
  const skew2 = Band(s2x0, s2y0, s2x1, s2y1, frameT, EPS);

  // ===== 4) Etykiety (opcjonalnie) =====
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
