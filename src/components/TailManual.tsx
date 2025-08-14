import type { TailManualLabels } from "../types/tail";

export type TailManualProps = {
  outerW: number;
  outerH: number;
  frameT: number;    // grubość ramy
  hA: number;        // wysokość wsporników (A)
  hP: number;        // wysokość profilu pełnego
  hO: number;        // wysokość Omegi (i grubość przedłużenia Omegi)
  scale: number;
  side: "left" | "right";
  labels?: TailManualLabels;

  // opcjonalne parametry (poglądowe)
  visBaseFrac?: number;       // długość podstawy jako ułamek H korpusu (domyślnie 0.8)
  bottomExtFrac?: number;     // przedłużenie dolnej ramy w % podstawy (domyślnie 0.5)
  skew2Frac?: number;         // gdzie startuje skos #2 (0..1 od początku podstawy, domyślnie 0.6)
  skew2TargetHFrac?: number;  // na jakiej wysokości pionu kończy skos #2 (0..1, domyślnie 0.5)
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

  // pozycje referencyjne
  const yOmegaTop = outerH + hA + hP;     // górna krawędź Omegi
  const yBottomFrameTop = outerH - frameT;// górna krawędź dolnej ramy

  // długość podstawy (pogląd) i jej położenie
  const baseLen = Math.max(0, outerH * visBaseFrac);
  const baseStartX = side === "right" ? outerW : 0;
  const baseEndX = baseStartX + dir * baseLen;

  // helpery rysujące „lite” bryły (fill bez stroke)
  const R = (x: number, y: number, w: number, h: number) => (
    <rect
      x={mm(Math.min(x, x + w))}
      y={mm(Math.min(y, y + h))}
      width={mm(Math.abs(w))}
      height={mm(Math.abs(h))}
      fill={fillFrame}
      vectorEffect="non-scaling-stroke"
    />
  );

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
    const d = pts.map(p => `${mm(p[0])},${mm(p[1])}`).join(" ");
    return <polygon points={d} fill={fillFrame} vectorEffect="non-scaling-stroke" />;
  };

  // 1) przedłużenie omegi – grubość = hO
  const omegaExt = R(baseStartX, yOmegaTop, dir * baseLen, hO);

  // 2) przedłużenie dolnej ramy – długość = bottomExtFrac * baseLen, grubość = frameT
  const botExtLen = baseLen * Math.max(0, Math.min(1, bottomExtFrac));
  const bottomExt = R(baseStartX, yBottomFrameTop, dir * botExtLen, frameT);

  // 3) skos nr 1 – od końca omegi do górnej krawędzi pionu
  const topCornerX = side === "right" ? outerW : 0;
  const topCornerY = 0;
  const skew1 = Band(baseEndX, yOmegaTop, topCornerX, topCornerY, frameT);

  // 4) skos nr 2 – od (skew2Frac * podstawa) do (skew2TargetHFrac * H) na pionie
  const s2x0 = baseStartX + dir * (baseLen * Math.max(0, Math.min(1, skew2Frac)));
  const s2y0 = yOmegaTop;
  const s2x1 = side === "right" ? outerW : 0;
  const s2y1 = outerH * Math.max(0, Math.min(1, skew2TargetHFrac));
  const skew2 = Band(s2x0, s2y0, s2x1, s2y1, frameT);

  // 5) napisy – czysty tekst, klient wpisuje własne wartości
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
        <text x={mm(side === "right" ? outerW - frameT / 2 : frameT / 2)} y={mm(outerH * 0.15)} fontSize={11} textAnchor="middle" style={textStyle}>
          {labels.vertical}
        </text>
      )}
      {labels?.diagonal && (
        <text x={mm((baseEndX + topCornerX) / 2)} y={mm((yOmegaTop + topCornerY) / 2) - 6} fontSize={11} textAnchor="middle" style={textStyle}>
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
