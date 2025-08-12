import type { JSX, CSSProperties } from "react";

export type LayoutProps = {
  title: string;
  outerW: number;            // całkowita szerokość (z ramami lewo/prawo)
  outerH: number;            // całkowita wysokość (z ramami góra/dół)
  withFrame: boolean;        // jeśli true, rysujemy 4 strony ramy grubości frameVert
  gaps: number[];            // przerwy pionowe: [top, mid..., bottom] jeśli withFrame; w przeciwnym razie mid...
  panels: number[];          // wysokości paneli (pionowy stos)
  scale: number;
  frameVert: number;         // grubość ramy — ta sama dla góra/dół/lewo/prawo
  verticalBars?: number[];   // pozycje X (mm od lewej krawędzi zewnętrznej); szerokość = frameVert

  // Przestrzeń 2 (pod dolną ramą – liczone do wysokości całkowitej)
  bottomSupports?: {         // A – krótkie wsporniki (kotwy)
    height: number;          // wysokość wspornika (mm)
    xs: number[];            // x-lewe każdego wspornika względem lewej krawędzi zewn.
  };
  bottomProfile?: {          // B – profil pełny pod wspornikami
    height: number;          // wysokość profilu (mm)
  };
  bottomOmega?: {            // Ω – omega (najniżej)
    height: number;          // wysokość omegi (mm)
    extendLeft?: number;     // wysięg w lewo poza moduł (mm)
    extendRight?: number;    // wysięg w prawo poza moduł (mm)
  };

  // „Ogon” – element schematyczny dla bramy przesuwnej (tylko wizualny)
  tail?: {
    enabled: boolean;
    side: "left" | "right";
    // Etykiety (dowolny tekst)
    labelBaseLen?: string;    // opis długości bazowej ogona
    labelLowerExt?: string;   // opis dolnego przedłużenia
    labelSupportH?: string;   // opis wysokości wspornika ogona
    labelDiagHigh?: string;   // opis wysokości skosu
    // Proporcje wizualne (0..1) – tylko wygląd
    visBaseFrac?: number;     // długość bazowa vs outerW (default 0.35)
    visLowerExtFrac?: number; // dolne przedłużenie vs wysięg omegi po danej stronie (default 0.5)
    visDiagHighFrac?: number; // wysokość skosu vs outerH (default 0.75)
  };
};

// Te same stałe co w widoku
export const LABEL_COL_MM = 148;

export default function LayoutBlock({
  title,
  outerW,
  outerH,
  withFrame,
  gaps,
  panels,
  scale,
  frameVert,
  verticalBars = [],
  bottomSupports,
  bottomProfile,
  bottomOmega,
  tail,
}: LayoutProps) {
  const stroke = "#333";
  const fillFrame = "#94a3b8";
  const fillPanel = "#ddd";
  const fillGap = "#f1f5f9";

  // Obszar wewnętrzny (między ramami lewo/prawo oraz góra/dół)
  const frameT = withFrame ? frameVert : 0;
  const innerX = frameT;
  const innerY = frameT;
  const innerW = Math.max(0, outerW - 2 * frameT);
  const innerH = Math.max(0, outerH - 2 * frameT);

  // Przestrzeń 2 (A + B + Ω) – wszystko pod dolną ramą
  const extraA = bottomSupports?.height ?? 0;
  const extraB = bottomProfile?.height ?? 0;
  const extraO = bottomOmega?.height ?? 0;
  const totalH = outerH + extraA + extraB + extraO;

  const textStrokeStyle: CSSProperties = {
    paintOrder: "stroke",
    stroke: "#fff",
    strokeWidth: 3,
    fontVariantNumeric: "tabular-nums",
  };

  function rect(
    x: number,
    y: number,
    w: number,
    h: number,
    label?: string,
    fill = fillPanel,
    s = stroke
  ) {
    const W = w * scale,
      H = h * scale,
      X = x * scale,
      Y = y * scale;
    return (
      <g>
        <rect
          x={X}
          y={Y}
          width={W}
          height={H}
          fill={fill}
          stroke={s}
          vectorEffect="non-scaling-stroke"
        />
        {label ? (
          <text
            x={(outerW + 6) * scale} // etykiety w kolumnie
            y={Y + H / 2}
            dominantBaseline="middle"
            fontSize={12}
            style={textStrokeStyle}
          >
            {label}
          </text>
        ) : null}
      </g>
    );
  }

  // --- rama (4 strony) ---
  const frame = (
    <g>
      {/* zewnętrzny obrys modułu + kolumna etykiet */}
      <rect
        x={0}
        y={0}
        width={(outerW + LABEL_COL_MM) * scale}
        height={totalH * scale}
        fill="none"
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
      {withFrame && (
        <>
          {/* góra / dół */}
          {rect(0, 0, outerW, frameT, undefined, fillFrame)}
          {rect(0, outerH - frameT, outerW, frameT, undefined, fillFrame)}
          {/* lewo / prawo */}
          {rect(0, 0, frameT, outerH, undefined, fillFrame)}
          {rect(outerW - frameT, 0, frameT, outerH, undefined, fillFrame)}
        </>
      )}
    </g>
  );

  const elems: JSX.Element[] = [];

  // --- przerwa TOP (tylko jeśli jest rama) ---
  let cursorY = innerY;
  let gapIdx = 0;

  if (withFrame) {
    const gTop = gaps[0] ?? 0;
    if (gTop > 0) {
      elems.push(
        <g>
          <rect
            x={innerX * scale}
            y={innerY * scale}
            width={innerW * scale}
            height={gTop * scale}
            fill={fillGap}
            stroke="#64748b"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={(outerW + 10) * scale}
            y={(innerY + gTop / 2) * scale}
            dominantBaseline="middle"
            fontSize={12}
            style={textStrokeStyle}
          >
            {`${gTop.toFixed(2)} mm`}
          </text>
        </g>
      );
    }
    cursorY += gTop;
    gapIdx = 1;
  }

  // --- panele + przerwy środkowe ---
  for (let i = 0; i < panels.length; i++) {
    const t = panels[i];
    elems.push(rect(innerX, cursorY, innerW, t, `${t} mm`));
    cursorY += t;
    if (i < panels.length - 1) {
      const g = gaps[gapIdx++] ?? 0;
      if (g > 0) {
        elems.push(
          <g>
            <rect
              x={innerX * scale}
              y={cursorY * scale}
              width={innerW * scale}
              height={g * scale}
              fill={fillGap}
              stroke="#64748b"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={(outerW + 10) * scale}
              y={(cursorY + g / 2) * scale}
              dominantBaseline="middle"
              fontSize={12}
              style={textStrokeStyle}
            >
              {`${g.toFixed(2)} mm`}
            </text>
          </g>
        );
      }
      cursorY += g;
    }
  }

  // --- przerwa BOTTOM (tylko jeśli jest rama) ---
  if (withFrame) {
    const gBottom = gaps[gaps.length - 1] ?? 0;
    if (gBottom > 0) {
      const hasExtras = extraA + extraB + extraO > 0;
      elems.push(
        <g>
          <rect
            x={innerX * scale}
            y={cursorY * scale}
            width={innerW * scale}
            height={gBottom * scale}
            fill={fillGap}
            stroke="#64748b"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={(outerW + 10) * scale}
            y={(cursorY + gBottom / 2) * scale - (hasExtras ? 8 : 0)} // unieś opis jeśli pod spodem rysujemy A/B/Ω
            dominantBaseline="middle"
            fontSize={12}
            style={textStrokeStyle}
          >
            {`${gBottom.toFixed(2)} mm`}
          </text>
        </g>
      );
    }
  }

  // --- wzmocnienia pionowe (np. brama przesuwna) ---
  if (withFrame && verticalBars.length > 0) {
    for (const xLeft of verticalBars) {
      const clampedX = Math.max(frameT, Math.min(outerW - 2 * frameT, xLeft));
      elems.push(
        <rect
          x={clampedX * scale}
          y={innerY * scale}
          width={frameT * scale}
          height={innerH * scale}
          fill={fillFrame}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
  }

  // --- PRZESTRZEŃ 2: A – krótkie wsporniki tuż pod modułem ---
  if (bottomSupports && bottomSupports.height > 0 && bottomSupports.xs.length > 0) {
    const h = bottomSupports.height;
    const y = outerH * scale;       // start zaraz pod modułem
    const H = h * scale;
    const W = frameT * scale;       // szerokość = grubość ramy

    for (const xLeft of bottomSupports.xs) {
      // wspornik może leżeć idealnie pod ramą L/P
      const clampedX = Math.max(0, Math.min(outerW - frameVert, xLeft));
      const X = clampedX * scale;
      elems.push(
        <rect
          x={X}
          y={y}
          width={W}
          height={H}
          fill={fillFrame}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );
    }

    // etykieta A
    elems.push(
      <text
        x={(outerW + 10) * scale}
        y={(outerH + h / 2) * scale}
        dominantBaseline="middle"
        fontSize={12}
        style={textStrokeStyle}
      >
        {`A: ${h.toFixed(2)} mm`}
      </text>
    );
  }

  // --- PRZESTRZEŃ 2: B – profil pełny pod wspornikami ---
  if (bottomProfile && bottomProfile.height > 0) {
    const h = bottomProfile.height;
    const y = (outerH + extraA) * scale;
    elems.push(
      <rect
        x={0}
        y={y}
        width={outerW * scale}
        height={h * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
    elems.push(
      <text
        x={(outerW + 10) * scale}
        y={(outerH + extraA + h / 2) * scale}
        dominantBaseline="middle"
        fontSize={12}
        style={textStrokeStyle}
      >
        {`B: ${h.toFixed(2)} mm`}
      </text>
    );
  }

  // --- PRZESTRZEŃ 2: Ω – omega (z wysięgami) ---
  if (bottomOmega && bottomOmega.height > 0) {
    const h = bottomOmega.height;
    const extL = Math.max(0, bottomOmega.extendLeft ?? 0);
    const extR = Math.max(0, bottomOmega.extendRight ?? 0);
    const y = (outerH + extraA + extraB) * scale;
    const X = -extL * scale;
    const W = (outerW + extL + extR) * scale;

    elems.push(
      <rect
        x={X}
        y={y}
        width={W}
        height={h * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );

    // etykieta Ω przy korpusie
    elems.push(
      <text
        x={(outerW + 10) * scale}
        y={(outerH + extraA + extraB + h / 2) * scale}
        dominantBaseline="middle"
        fontSize={12}
        style={textStrokeStyle}
      >
        {`Ω: ${h.toFixed(2)} mm`}
      </text>
    );
  }

  // --- OGON (schematyczny – tylko wizualny) ---
  if (tail?.enabled && bottomOmega && bottomOmega.height > 0) {
    const side = tail.side ?? "right";
    const extL = Math.max(0, bottomOmega.extendLeft ?? 0);
    const extR = Math.max(0, bottomOmega.extendRight ?? 0);

    const baseFrac = tail.visBaseFrac ?? 0.35;
    const lowerFrac = tail.visLowerExtFrac ?? 0.5;
    const diagFrac = tail.visDiagHighFrac ?? 0.75;

    const baseLen = Math.max(30, outerW * baseFrac);  // mm
    const omegaTop = outerH + extraA + extraB;
    const omegaH = bottomOmega.height;

    // 1) Bazowe przedłużenie omegi
    const baseX = (side === "right" ? outerW : -baseLen) * scale;
    elems.push(
      <rect
        x={baseX}
        y={omegaTop * scale}
        width={baseLen * scale}
        height={omegaH * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );

    // 2) Skos do ~3/4 wysokości ramy
    const baseEndX = (side === "right" ? outerW + baseLen : -baseLen) * scale;
    const diagTopX = (side === "right" ? (outerW - frameT) : frameT) * scale;
    const diagTopY = (innerY + innerH * (1 - diagFrac)) * scale;

    elems.push(
      <line
        x1={baseEndX}
        y1={omegaTop * scale}
        x2={diagTopX}
        y2={diagTopY}
        stroke={stroke}
        strokeWidth={frameT * scale}
        vectorEffect="non-scaling-stroke"
      />
    );

    // 3) Dolne przedłużenie od dolnej ramy
    const sideExt = side === "right" ? extR : extL;
    const lowerLen = Math.max(0, sideExt * lowerFrac);
    if (lowerLen > 0) {
      const yLower = (outerH - frameT) * scale;
      const lowerX = (side === "right" ? outerW : -lowerLen) * scale;
      elems.push(
        <rect
          x={lowerX}
          y={yLower}
          width={lowerLen * scale}
          height={frameT * scale}
          fill={fillFrame}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );

      // 4) pionowy wspornik ogona
      const suppX = (side === "right" ? (outerW + lowerLen - frameT) : (-lowerLen)) * scale;
      const suppH = bottomSupports?.height ?? frameT;
      elems.push(
        <rect
          x={suppX}
          y={outerH * scale}
          width={frameT * scale}
          height={suppH * scale}
          fill={fillFrame}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );

      // 5) wewnętrzny skos do ~3/4 wysokości
      const innerDiagX1 = (side === "right" ? (outerW + lowerLen) : (-lowerLen)) * scale;
      const innerDiagY1 = (outerH) * scale;
      const innerDiagX2 = (side === "right" ? (outerW - frameT) : frameT) * scale;
      const innerDiagY2 = (innerY + innerH * (1 - diagFrac)) * scale;
      elems.push(
        <line
          x1={innerDiagX1}
          y1={innerDiagY1}
          x2={innerDiagX2}
          y2={innerDiagY2}
          stroke={stroke}
          strokeWidth={(frameT * 0.8) * scale}
          vectorEffect="non-scaling-stroke"
        />
      );
    }

    // Etykiety (jeśli podane)
    const labelX = (outerW + 10) * scale;
    const labels: Array<[number, string | undefined]> = [
      [omegaTop + omegaH / 2, tail.labelBaseLen],
      [outerH - frameT / 2, tail.labelLowerExt],
      [outerH + (bottomSupports?.height ?? frameT) / 2, tail.labelSupportH],
      [innerY + innerH * (1 - (tail.visDiagHighFrac ?? 0.75)), tail.labelDiagHigh],
    ];
    labels.forEach(([yy, txt]) => {
      if (!txt) return;
      elems.push(
        <text x={labelX} y={yy * scale} dominantBaseline="middle" fontSize={12} style={textStrokeStyle}>
          {txt}
        </text>
      );
    });
  }

  // --- wymiary całkowite (łącznie z przestrzenią 2) ---
  const dims = (
    <g>
      <line
        x1={0}
        y1={(totalH + 28) * scale}
        x2={(outerW + LABEL_COL_MM) * scale}
        y2={(totalH + 28) * scale}
        stroke={stroke}
        markerEnd="url(#arrowhead)"
        markerStart="url(#arrowhead)"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={((outerW + LABEL_COL_MM) * scale) / 2}
        y={(totalH + 22) * scale}
        textAnchor="middle"
        fontSize={12}
        style={textStrokeStyle}
      >{`${outerW} mm`}</text>

      <line
        x1={(outerW + LABEL_COL_MM + 28) * scale}
        y1={0}
        x2={(outerW + LABEL_COL_MM + 28) * scale}
        y2={totalH * scale}
        stroke={stroke}
        markerEnd="url(#arrowhead)"
        markerStart="url(#arrowhead)"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={(outerW + LABEL_COL_MM + 36) * scale}
        y={(totalH * scale) / 2}
        fontSize={12}
        transform={`rotate(90 ${(outerW + LABEL_COL_MM + 36) * scale} ${(totalH * scale) / 2})`}
        style={textStrokeStyle}
      >{`${totalH} mm`}</text>

      <text
        x={0}
        y={-8}
        fontSize={14}
        fontWeight={600}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}
      >
        {title}
      </text>
    </g>
  );

  return (
    <g>
      {elems} {/* panele + przerwy + wsporniki + profil + omega + ogon */}
      {frame} {/* rama na wierzchu (żeby zasłonić brzegi paneli) */}
      {dims}
    </g>
  );
}
