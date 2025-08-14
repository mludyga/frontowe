// components/TailManual.tsx
import type { TailManualLabels } from "../types/tail";

export type TailManualProps = {
  outerW: number;
  outerH: number;
  frameT: number;    // grubość ramy
  hA: number;        // wysokość wsporników (A)
  hP: number;        // wysokość profilu pełnego
  hO: number;        // wysokość Omegi (i grubość jej przedłużenia)
  scale: number;
  side: "left" | "right";
  labels?: TailManualLabels;

  visBaseFrac?: number;       // długość podstawy jako ułamek H korpusu (domyślnie 0.8)
  bottomExtFrac?: number;     // przedłużenie dolnej ramy [% podstawy] (domyślnie 0.5)
  skew2Frac?: number;         // start skosu #2 na podstawie (0..1, domyślnie 0.6)
  skew2TargetHFrac?: number;  // wysokość końca skosu #2 na pionie (0..1, domyślnie 0.5)
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

  // ~1 px w mm (zależne od skali) – małe „overdraw”, żeby nic nie prześwitywało
  const EPS = 1 / Math.max(scale, 1e-6);

  // Referencje geometryczne
  const yOmegaTop = outerH + hA + hP;           // górna krawędź Omegi
  const yBottomFrameTop = outerH - frameT;      // górna krawędź dolnej ramy
  const baseLen = Math.max(0, outerH * visBaseFrac);
  const baseStartX = side === "right" ? outerW : 0;
  const baseEndX = baseStartX + dir * baseLen;

  // Osiowo rysujemy pasy – dzięki temu wszystkie grubości idealnie się kleją
  const omegaAxisY = yOmegaTop + hO / 2;
  const rightAxisX = side === "right" ? outerW - frameT / 2 : frameT / 2; // oś pionu
  const topAxisY = frameT / 2;                                            // oś górnej ramy

  // Pas o grubości t między P1 i P2, przedłużony na końcach o ext (mm).
  const Band = (x1: number, y1: number, x2: number, y2: number, t: number, ext = 0) => {
    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const ox = -uy * (t / 2), oy = ux * (t / 2);

    // przedłużenie końców o 'ext'
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

  // ---- 1) OMEGA – przedłużenie z fazą równoległą do skosu #1, z lekkim offsetem ----
  // Skos #1 (oś): (baseEndX, omegaAxisY) -> (rightAxisX, topAxisY)
  const dx1 = rightAxisX - baseEndX;
  const dy1 = topAxisY - omegaAxisY;

  // kierunek skosu #1 (unit) i jego normalna (unit)
  const L1 = Math.hypot(dx1, dy1) || 1;
  const ux1 = dx1 / L1, uy1 = dy1 / L1;
  // normalna „na zewnątrz” – kierunek w stronę czubka (dla right: +x)
  const nx = -uy1, ny = ux1;
  const nSign = side === "right" ? 1 : -1; // przesuwamy w stronę czubka
  const cutShiftX = nx * EPS * nSign;
  const cutShiftY = ny * EPS * nSign;

  // równoległa do skosu #1, przechodząca przez (baseEndX, omegaAxisY)
  const xOnCut = (y: number) =>
    baseEndX + (dy1 === 0 ? 0 : (y - omegaAxisY) * (dx1 / dy1));

  // punkty wielokąta omegi (z przesunięciem linii cięcia o EPS „na zewnątrz”)
  const y0 = yOmegaTop;
  const y1 = yOmegaTop + hO;
  const xCutTop = xOnCut(y0) + cutShiftX;
  const xCutBot = xOnCut(y1) + cutShiftX;
  const yCutTop = y0 + cutShiftY;
  const yCutBot = y1 + cutShiftY;

  const omegaPolyPoints =
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

  const omegaExt = (
    <polygon
      points={omegaPolyPoints.map(([x, y]) => `${mm(x)},${mm(y)}`).join(" ")}
      fill={fillFrame}
      vectorEffect="non-scaling-stroke"
    />
  );

  // ---- 2) Przedłużenie dolnej ramy – minimalnie dłuższe o EPS w stronę czubka ----
  const botExtLen = baseLen * Math.max(0, Math.min(1, bottomExtFrac));
  const botX0 = Math.min(baseStartX, baseStartX + dir * botExtLen) - (dir < 0 ? EPS : 0);
  const botW  = Math.abs(botExtLen) + EPS; // +EPS w stronę czubka
  const bottomExt = (
    <rect
      x={mm(botX0)}
      y={mm(yBottomFrameTop)}
      width={mm(botW)}
      height={mm(frameT)}
      fill={fillFrame}
      vectorEffect="non-scaling-stroke"
    />
  );

  // ---- 3) Skosy – pasy osiowe, przedłużone na końcach o EPS ----
  const skew1 = Band(
    baseEndX,   omegaAxisY,
    rightAxisX, topAxisY,
    frameT,
    EPS
  );

  const s2x0 = baseStartX + dir * (baseLen * Math.max(0, Math.min(1, skew2Frac)));
  const s2y0 = omegaAxisY;
  const s2x1 = rightAxisX;
  const s2y1 = outerH * Math.max(0, Math.min(1, skew2TargetHFrac));

  const skew2 = Band(s2x0, s2y0, s2x1, s2y1, frameT, EPS);

  // ---- 4) Etykiety (opcjonalnie, pogląd) ----
  const textStyle = {
    paintOrder: "stroke",
    stroke: "#fff",
    strokeWidth: 3,
    fontVariantNumeric: "tabular-nums",
  } as const;

  const txtAnchor = side === "right" ? "start" : "end";
  const txtX = side === "right" ? baseStartX + 8 : baseStartX - 8;

  const labelsG = (
    <g>
      {labels?.omega && (
        <text x={mm(txtX)} y={mm(yOmegaTop + hO) - 6} fontSize={11} textAnchor={txtAnchor} style={textStyle}>
          {labels.omega}
        </text>
      )}
      {labels?.base && (
        <text x={mm((baseStartX + baseEndX) / 2)} y={mm(yOmegaTop) - 6} fontSize={11} textAnchor="middle" style={textStyle}>
          {labels.base}
        </text>
      )}
      {labels?.vertical && (
        <text x={mm(rightAxisX)} y={mm(outerH * 0.15)} fontSize={11} textAnchor="middle" style={textStyle}>
          {labels.vertical}
        </text>
      )}
      {labels?.diagonal && (
        <text x={mm((rightAxisX + baseEndX) / 2)} y={mm((topAxisY + omegaAxisY) / 2) - 6} fontSize={11} textAnchor="middle" style={textStyle}>
          {labels.diagonal}
        </text>
      )}
      {labels?.support && (
        <text x={mm((baseStartX + baseStartX + dir * botExtLen) / 2)} y={mm(yBottomFrameTop) - 6} fontSize={11} textAnchor="middle" style={textStyle}>
          {labels.support}
        </text>
      )}
    </g>
  );

  // kolejność rysowania: najpierw podstawa/omega, potem skosy (z EPS), na końcu etykiety
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
