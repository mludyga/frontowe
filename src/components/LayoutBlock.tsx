import type { JSX } from "react";

export type LayoutProps = {
  title: string;
  outerW: number;            // całkowita szerokość (z ramami lewo/prawo)
  outerH: number;            // całkowita wysokość KORPUSU (do dolnej ramy)
  withFrame: boolean;        // jeśli true, rysujemy 4 strony ramy grubości frameVert
  gaps: number[];            // przerwy pionowe: [top, mid..., bottom] jeśli withFrame; w przeciwnym razie mid...
  panels: number[];          // wysokości paneli (pionowy stos)
  scale: number;
  frameVert: number;         // grubość ramy — ta sama dla góra/dół/lewo/prawo

  // Pionowe wzmocnienia (np. w bramie przesuwnej) – pozycje X LEWE w mm
  verticalBars?: number[];   // szerokość = frameVert

  // Przestrzeń 2 (pod dolną ramą – wliczana do całkowitej wysokości)
  bottomSupports?: { height: number; xs: number[] };                 // krótki „grzebień”
  bottomProfile?:  { height: number };                               // profil pod wspornikami (na całą szerokość)
  bottomOmega?:    { height: number; extendLeft?: number; extendRight?: number }; // najniższy profil, może wystawać

  // Pokazywanie wymiarów poziomych (szerokości profili między pionowymi przeszkodami)
  showProfileWidths?: boolean;
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
  showProfileWidths = true,
}: LayoutProps) {
  const stroke = "#333";
  const fillFrame = "#94a3b8";

  // --- geometria obszaru wewnętrznego (korpus, do dolnej ramy) ---
  const frameT = withFrame ? frameVert : 0;
  const innerX = frameT;
  const innerY = frameT;
  const innerW = Math.max(0, outerW - 2 * frameT);
  const innerH = Math.max(0, outerH - 2 * frameT);

  // --- przestrzeń 2 (liczona do całkowitej wysokości) ---
  const hSup   = bottomSupports?.height ?? 0;
  const hProf  = bottomProfile?.height  ?? 0;
  const hOmega = bottomOmega?.height    ?? 0;
  const extL   = Math.max(0, bottomOmega?.extendLeft  ?? 0);
  const extR   = Math.max(0, bottomOmega?.extendRight ?? 0);
  const extraBottom = hSup + hProf + hOmega;
  const totalH = outerH + extraBottom;

  // pomocnicze prostokąty (w skali)
  function rect(
    x: number, y: number, w: number, h: number,
    label?: string,
    fill = "#ddd", s = "#333"
  ) {
    const W = w * scale, H = h * scale, X = x * scale, Y = y * scale;
    return (
      <g>
        <rect x={X} y={Y} width={W} height={H} fill={fill} stroke={s} vectorEffect="non-scaling-stroke" />
        {label ? (
          <text
            x={(outerW + 6) * scale}
            y={Y + H / 2}
            dominantBaseline="middle"
            fontSize={12}
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
          >
            {label}
          </text>
        ) : null}
      </g>
    );
  }

  // --- rama (4 strony) + obrys modułu ---
  const frame = (
    <g>
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
        <g key="gap-top">
          <rect
            x={innerX * scale}
            y={innerY * scale}
            width={innerW * scale}
            height={gTop * scale}
            fill="#f1f5f9"
            stroke="#64748b"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={(outerW + 10) * scale}
            y={(innerY + gTop / 2) * scale}
            dominantBaseline="middle"
            fontSize={12}
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
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
          <g key={`gap-mid-${i}`}>
            <rect
              x={innerX * scale}
              y={cursorY * scale}
              width={innerW * scale}
              height={g * scale}
              fill="#f1f5f9"
              stroke="#64748b"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={(outerW + 10) * scale}
              y={(cursorY + g / 2) * scale}
              dominantBaseline="middle"
              fontSize={12}
              style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
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
      const somethingBelow = hSup + hProf + hOmega > 0;
      elems.push(
        <g key="gap-bottom">
          <rect
            x={innerX * scale}
            y={cursorY * scale}
            width={innerW * scale}
            height={gBottom * scale}
            fill="#f1f5f9"
            stroke="#64748b"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={(outerW + 10) * scale}
            y={(cursorY + gBottom / 2) * scale - (somethingBelow ? 8 : 0)}
            dominantBaseline="middle"
            fontSize={12}
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
          >
            {`${gBottom.toFixed(2)} mm`}
          </text>
        </g>
      );
    }
  }

  // --- wzmocnienia pionowe ---
  if (withFrame && verticalBars.length > 0) {
    const bars = [...verticalBars].sort((a, b) => a - b);
    for (const xLeftRaw of bars) {
      // przycinamy w obszarze między górną a dolną ramą
      const xLeft = Math.max(frameT, Math.min(outerW - frameT - frameT, xLeftRaw));
      elems.push(
        <rect
          key={`vbar-${xLeft}`}
          x={xLeft * scale}
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

  // === PRZESTRZEŃ 2 (pod dolną ramą) – kolejność: wsporniki → profil → omega ===

  // 1) krótkie wsporniki
  if (withFrame && bottomSupports && bottomSupports.height > 0 && bottomSupports.xs.length > 0) {
    const y = outerH * scale;
    const H = bottomSupports.height * scale;
    const W = frameT * scale; // szerokość = grubość ramy

    for (const xLeft of bottomSupports.xs) {
      // pilnujemy, żeby wspornik nie wyszedł poza korpus
      const clampedX = Math.max(0, Math.min(outerW - frameVert, xLeft));
      elems.push(
        <rect
          key={`bs-${clampedX}`}
          x={clampedX * scale}
          y={y}
          width={W}
          height={H}
          fill={fillFrame}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );
    }

    // etykieta A (wysokość wspornika)
    elems.push(
      <text
        key="label-A"
        x={(outerW + 10) * scale}
        y={(outerH + hSup / 2) * scale}
        dominantBaseline="middle"
        fontSize={12}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`A: ${bottomSupports.height.toFixed(2)} mm`}
      </text>
    );
  }

  // 2) pełny profil na całej szerokości (pod wspornikami)
  if (hProf > 0) {
    elems.push(
      <rect
        key="profile"
        x={0}
        y={(outerH + hSup) * scale}
        width={outerW * scale}
        height={hProf * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  // 3) omega (najniższa) – może wystawać lewo/prawo
  if (hOmega > 0) {
    const x = -extL;
    const w = outerW + extL + extR;
    elems.push(
      <rect
        key="omega"
        x={x * scale}
        y={(outerH + hSup + hProf) * scale}
        width={w * scale}
        height={hOmega * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
    // podpisy wysięgów (jeśli są)
    if (extL > 0 || extR > 0) {
      const yTxt = (outerH + hSup + hProf + hOmega / 2) * scale;
      if (extL > 0) {
        elems.push(
          <text
            key="omega-extL"
            x={(-extL / 2) * scale}
            y={yTxt}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
          >
            {`${extL.toFixed(2)} mm`}
          </text>
        );
      }
      if (extR > 0) {
        elems.push(
          <text
            key="omega-extR"
            x={(outerW + extR / 2) * scale}
            y={yTxt}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
          >
            {`${extR.toFixed(2)} mm`}
          </text>
        );
      }
    }
  }

  // === WYMIARY POZIOME PROFILI (szerokości do docięcia) ===
  if (showProfileWidths && withFrame) {
    const leftIn  = frameT;
    const rightIn = outerW - frameT;

    // posortowane lewokrawędziowe X pionowych przeszkód (wzmocnienia)
    const bars = [...verticalBars]
      .map((x) => Math.max(frameT, Math.min(outerW - frameT - frameT, x)))
      .sort((a, b) => a - b);

    type Seg = { a: number; b: number };
    const segs: Seg[] = [];
    let start = leftIn;

    for (const xLeft of bars) {
      const end = Math.min(xLeft, rightIn);
      if (end > start) segs.push({ a: start, b: end });
      start = Math.min(xLeft + frameT, rightIn); // przeskok ZA wzmocnienie
    }
    if (rightIn > start) segs.push({ a: start, b: rightIn });

    // Jeżeli brak wzmocnień – jeden segment na całą „światło”
    if (segs.length === 0) {
      segs.push({ a: leftIn, b: rightIn });
    }

    const yDim = (outerH - frameT - 8) * scale; // tuż nad dolną ramą, wewnątrz

    segs.forEach((s, i) => {
      const x1 = s.a * scale;
      const x2 = s.b * scale;
      const mid = (s.a + s.b) / 2;
      const len = (s.b - s.a).toFixed(2);

      elems.push(
        <g key={`profw-${i}`}>
          <line
            x1={x1}
            x2={x2}
            y1={yDim}
            y2={yDim}
            stroke="#333"
            markerStart="url(#arrowhead)"
            markerEnd="url(#arrowhead)"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={mid * scale}
            y={yDim - 4}
            textAnchor="middle"
            fontSize={11}
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
          >
            {`${len} mm`}
          </text>
        </g>
      );
    });
  }

  // --- wymiary całkowite (łącznie z przestrzenią 2) ---
  const dims = (
    <g>
      {/* szerokość całkowita (korpus) */}
      <line
        x1={0}
        y1={(totalH + 28) * scale}
        x2={(outerW + LABEL_COL_MM) * scale}
        y2={(totalH + 28) * scale}
        stroke="#333"
        markerEnd="url(#arrowhead)"
        markerStart="url(#arrowhead)"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={((outerW + LABEL_COL_MM) * scale) / 2}
        y={(totalH + 22) * scale}
        textAnchor="middle"
        fontSize={12}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`${outerW} mm`}
      </text>

      {/* wysokość całkowita = korpus + przestrzeń 2 */}
      <line
        x1={(outerW + LABEL_COL_MM + 28) * scale}
        y1={0}
        x2={(outerW + LABEL_COL_MM + 28) * scale}
        y2={totalH * scale}
        stroke="#333"
        markerEnd="url(#arrowhead)"
        markerStart="url(#arrowhead)"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={(outerW + LABEL_COL_MM + 36) * scale}
        y={(totalH * scale) / 2}
        fontSize={12}
        transform={`rotate(90 ${(outerW + LABEL_COL_MM + 36) * scale} ${(totalH * scale) / 2})`}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`${totalH} mm`}
      </text>

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
      {elems}   {/* panele + przerwy + piony + przestrzeń 2 + poziome wymiary profili */}
      {frame}   {/* rama na wierzchu */}
      {dims}    {/* wymiary całkowite */}
    </g>
  );
}
