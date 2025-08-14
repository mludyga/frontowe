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

  // parametry poglądowe (opcjonalne – z sensownymi domyślnymi)
  visBaseFrac?: number;       // długość podstawy jako ułamek H korpusu (domyślnie 0.8)
  bottomExtFrac?: number;     // przedłużenie dolnej ramy w % podstawy (domyślnie 0.5)
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

  // Referencje geometryczne
  const yOmegaTop = outerH + hA + hP;           // górna krawędź Omegi
  const yBottomFrameTop = outerH - frameT;      // górna krawędź dolnej ramy
  const baseLen = Math.max(0, outerH * visBaseFrac);
  const baseStartX = side === "right" ? outerW : 0;
  const baseEndX = baseStartX + dir * baseLen;

  // Oś elementów (środek grubości) – żeby łączenia były równe
  const omegaAxisY = yOmegaTop + hO / 2;
  const rightAxisX = side === "right" ? outerW - frameT / 2 : frameT / 2; // oś pionu
  const topAxisY = frameT / 2;                                            // oś górnej ramy

  // helper: „pas” o grubości t między (x1,y1) a (x2,y2) – fill-only
  const Band = (x1: number, y1: number, x2: number, y2: number, t: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const ox = -uy * (t / 2);
    const oy =  ux * (t / 2);
    const pts = [
      [x1 + ox, y1 + oy],
      [x2 + ox, y2 + oy],
      [x2 - ox, y2 - oy],
      [x1 - ox, y1 - oy],
    ];
    const d = pts.map(([px, py]) => `${mm(px)},${mm(py)}`).join(" ");
    return <polygon points={d} fill={fillFrame} vectorEffect="non-scaling-stroke" />;
  };

  // ---- 1) OMEGA – przedłużenie z fazą przy czubku (równoległą do skosu #1) ----
  // Skos #1 idzie po osi od (baseEndX, omegaAxisY) do (rightAxisX, topAxisY).
  // Robimy obcięcie prostokąta omegi po linii równoległej do tej osi.
  const dx1 = rightAxisX - baseEndX;
  const dy1 = topAxisY - omegaAxisY;
  // x na linii równoległej (przechodzącej przez punkt [baseEndX, omegaAxisY]) dla danego y:
  const xOnCut = (y: number) => baseEndX + (dy1 === 0 ? 0 : (y - omegaAxisY) * (dx1 / dy1));

  // Punkty wielokąta omegi z fazą:
  const omegaPolyPoints = (() => {
    const y0 = yOmegaTop;        // top
    const y1 = yOmegaTop + hO;   // bottom
    const xCutTop = xOnCut(y0);
    const xCutBot = xOnCut(y1);
    // Dla prawej strony idziemy zgodnie z ruchem wskazówek, dla lewej – odwrotnie
    return side === "right"
      ? [
          [baseStartX, y0],
          [xCutTop,   y0],
          [xCutBot,   y1],
          [baseStartX, y1],
        ]
      : [
          [baseStartX, y0],
          [baseStartX, y1],
          [xCutBot,   y1],
          [xCutTop,   y0],
        ];
  })();

  const omegaExt = (
    <polygon
      points={omegaPolyPoints.map(([x, y]) => `${mm(x)},${mm(y)}`).join(" ")}
      fill={fillFrame}
      vectorEffect="non-scaling-stroke"
    />
  );

  // ---- 2) Przedłużenie dolnej ramy (pozostawiamy prostokąt – tu zwykle jest OK) ----
  const botExtLen = baseLen * Math.max(0, Math.min(1, bottomExtFrac));
  const bottomExt = (
    <rect
      x={mm(Math.min(baseStartX, baseStartX + dir * botExtLen))}
      y={mm(yBottomFrameTop)}
      width={mm(Math.abs(botExtLen))}
      height={mm(frameT)}
      fill={fillFrame}
      vectorEffect="non-scaling-stroke"
    />
  );

  // ---- 3) Skos #1 (oś) – od końca omegi do osi górnej/pionu ----
  const skew1 = Band(
    baseEndX,    omegaAxisY,
    rightAxisX,  topAxisY,
    frameT
  );

  // ---- 4) Skos #2 (oś) – od części podstawy do osi pionu na zadanej wysokości ----
  const s2x0 = baseStartX + dir * (baseLen * Math.max(0, Math.min(1, skew2Frac)));
  const s2y0 = omegaAxisY;
  const s2x1 = rightAxisX;
  const s2y1 = outerH * Math.max(0, Math.min(1, skew2TargetHFrac));
  const skew2 = Band(s2x0, s2y0, s2x1, s2y1, frameT);

  // ---- 5) Napisy (poglądowo) ----
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

  return (
    <g>
      {omegaExt}
      {bottomExt}
      {skew1}
      {skew2}
      {labelsG}
    </g>
  );
}
