import type { TailManualLabels } from "../types/tail";

/**
 * Manualny ogon – rysuje:
 *  - przedłużenie Omegi (pas o grubości = hO),
 *  - skos nr 1: od końca Omegi do górnej krawędzi prawej/lewej ramy (grubość = frameT),
 *  - skos nr 2: od (skew2Frac * podstawa) do (skew2TargetHFrac * wysokości ramy) na pionie (grubość = frameT),
 *  - przedłużenie dolnej ramy: bottomExtFrac * długości podstawy (grubość = frameT).
 *
 * Wszystko rysowane jako wypełnione kształty bez obrysu, żeby wyglądało jak jeden element.
 */
export type TailManualProps = {
  outerW: number;
  outerH: number;
  frameT: number;    // grubość ramy
  hA: number;        // wysokość wsporników (A) – tylko do wyliczenia pozycji w pionie
  hP: number;        // wysokość profilu pełnego – jw.
  hO: number;        // wysokość Omegi (i grubość przedłużenia Omegi)
  scale: number;
  side: "left" | "right";
  labels?: TailManualLabels;

  // opcjonalne parametry poglądowe (nie wymiarujemy automatycznie)
  visBaseFrac?: number;       // dł. podstawy jako ułamek wysokości korpusu (domyślnie 0.8)
  bottomExtFrac?: number;     // jak długa jest przedłużona dolna rama (ułamek podstawy, domyślnie 0.5)
  skew2Frac?: number;         // gdzie zaczyna się skos #2 (0..1 od początku podstawy, domyślnie 0.6)
  skew2TargetHFrac?: number;  // na jakiej wysokości pionu kończy się skos #2 (0..1, domyślnie 0.5 = połowa)
};

export default function TailManual(props: TailManualProps) {
  const {
    outerW, outerH, frameT, hA, hP, hO, scale, side, labels,
    visBaseFrac = 0.8,
    bottomExtFrac = 0.5,
    skew2Frac = 0.6,
    skew2TargetHFrac = 0.5,
  } = props;

  const mm = (v: number) => v * scale;
  const fillFrame = "#94a3b8";

  // kierunek (prawy/lewy ogon)
  const dir = side === "right" ? 1 : -1;

  // Pozycje referencyjne
  const yOmegaTop = outerH + hA + hP;     // górna krawędź Omegi
  const yOmegaBot = yOmegaTop + hO;       // dolna krawędź Omegi
  const yBottomFrameTop = outerH - frameT;// górna krawędź dolnej ramy

  // Długość podstawy (poglądowo) i start na zewnętrznej krawędzi korpusu
  const baseLen = Math.max(0, outerH * visBaseFrac);
  const baseStartX = side === "right" ? outerW : 0;
  const baseEndX = baseStartX + dir * baseLen;

  // Pomoc: prostokąt jako <rect> (fill bez obrysu)
  const R = (x: number, y: number, w: number, h: number) => (
    <rect x={mm(Math.min(x, x + w))}
          y={mm(Math.min(y, y + h))}
          width={mm(Math.abs(w))}
          height={mm(Math.abs(h))}
          fill={fillFrame}
          vectorEffect="non-scaling-stroke" />
  );

  // Pomoc: pas grubości t wzdłuż odcinka (x1,y1)-(x2,y2) jako <polygon>
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

  // --- 1) Przedłużenie OMEGI (pas równoległy do omegi, grubość = hO) ---
  const omegaExt = R(baseStartX, yOmegaTop, dir * baseLen, hO);

  // --- 2) Przedłużenie DOLNEJ RAMY (grubość = frameT, długość = bottomExtFrac * baseLen) ---
  const botExtLen = baseLen * Math.max(0, Math.min(1, bottomExtFrac));
  const bottomExt = R(baseStartX, yBottomFrameTop, dir * botExtLen, frameT);

  // --- 3) Skos nr 1: od końca omegi do górnego wierzchołka ramy ---
  const topCornerX = side === "right" ? outerW : 0;
  const topCornerY = 0;
  const skew1 = Band(baseEndX, yOmegaTop, topCornerX, topCornerY, frameT);

  // --- 4) Skos nr 2: od (skew2Frac * podstawa) do (skew2TargetHFrac * wysokości) na pionie ramy ---
  const s2x0 = baseStartX + dir * (baseLen * Math.max(0, Math.min(1, skew2Frac)));
  const s2y0 = yOmegaTop; // startujemy na górnej krawędzi omegi (zgodnie z poglądem)
  const s2x1 = side === "right" ? outerW : 0;
  const s2y1 = outerH * Math.max(0, Math.min(1, skew2TargetHFrac));
  const skew2 = Band(s2x0, s2y0, s2x1, s2y1, frameT);

  // --- 5) Etykiety (czysty tekst – klient wpisuje wartości) ---
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
      {/* kolejność: najpierw wypełnienia, na końcu same napisy */}
      {omegaExt}
      {bottomExt}
      {skew1}
      {skew2}
      {labelsG}
    </g>
  );
}
