// src/components/LayoutBlock.tsx
import type { JSX } from "react";

export type LayoutProps = {
  title: string;
  outerW: number;            // szerokość całkowita modułu (wraz z ramą lewo/prawo)
  outerH: number;            // wysokość korpusu (wraz z ramą góra/dół)
  withFrame: boolean;        // rysować ramę 4x frameVert
  gaps: number[];            // przerwy pionowe: [top, mid..., bottom] (z ramą) lub [mid...] (bez ramy)
  panels: number[];          // wysokości paneli (stack od góry)
  scale: number;
  frameVert: number;         // grubość ramy
  verticalBars?: number[];   // x-lewe (mm) wzmocnień pionowych; szerokość = frameVert

  // Przestrzeń 2 (pod dolną ramą; wliczana do całkowitej wysokości rysunku)
  bottomSupports?: {         // A – krótkie wsporniki
    height: number;          // mm
    xs: number[];            // x-lewe każdego wspornika (względem x=0 modułu)
  };
  bottomProfile?: {          // profil pełny pod wspornikami
    height: number;          // mm
  };
  bottomOmega?: {            // omega – NAJNIŻEJ
    height: number;          // mm
    extendLeft: number;      // wysunięcie w lewo poza ramę (mm)
    extendRight: number;     // wysunięcie w prawo poza ramę (mm)
  };

  // Ogon (rysunek poglądowy po stronie omegi)
  tailEnabled?: boolean;
  tailSide?: "left" | "right";
  tailVisBaseFrac?: number;

  // Akceptujemy, ale tu nie używamy — żeby App.tsx mógł przekazać bez błędów typów
  showProfileWidths?: boolean;
};

// Te same stałe co w App.tsx
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
  tailEnabled = false,
  tailSide = "right",
  tailVisBaseFrac = 0.35,
}: LayoutProps) {
  const stroke = "#333";
  const fillFrame = "#94a3b8";

  // Rama / światło
  const frameT = withFrame ? frameVert : 0;
  const innerX = frameT;
  const innerY = frameT;
  const innerW = Math.max(0, outerW - 2 * frameT);
  const innerH = Math.max(0, outerH - 2 * frameT);

  // Przestrzeń 2 — wysokości składowych
  const hA = bottomSupports?.height ?? 0; // wsporniki
  const hB = bottomProfile?.height ?? 0;  // profil
  const hC = bottomOmega?.height ?? 0;    // omega
  const totalH = outerH + hA + hB + hC;

  // Helper do prostokąta + opcjonalnej etykiety po prawej
  function rect(
    x: number,
    y: number,
    w: number,
    h: number,
    label?: string,
    fill = "#ddd",
    s = "#333"
  ) {
    const W = w * scale, H = h * scale, X = x * scale, Y = y * scale;
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
            x={(outerW + 6) * scale}
            y={Y + H / 2}
            dominantBaseline="middle"
            fontSize={12}
            style={{
              paintOrder: "stroke",
              stroke: "#fff",
              strokeWidth: 3,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {label}
          </text>
        ) : null}
      </g>
    );
  }

  // --- RAMA + obrys modułu ---
  const frame = (
    <g>
      {/* obrys modułu + kolumna etykiet */}
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

  // --- TOP gap (jeśli z ramą) ---
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
            style={{
              paintOrder: "stroke",
              stroke: "#fff",
              strokeWidth: 3,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {`${gTop.toFixed(2)} mm`}
          </text>
        </g>
      );
    }
    cursorY += gTop;
    gapIdx = 1;
  }

  // --- PANELE + przerwy środkowe ---
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
              style={{
                paintOrder: "stroke",
                stroke: "#fff",
                strokeWidth: 3,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {`${g.toFixed(2)} mm`}
            </text>
          </g>
        );
      }
      cursorY += g;
    }
  }

  // --- BOTTOM gap (jeśli z ramą) ---
  if (withFrame) {
    const gBottom = gaps[gaps.length - 1] ?? 0;
    if (gBottom > 0) {
      const hasBottomAny = hA > 0 || hB > 0 || hC > 0;
      elems.push(
        <g>
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
            y={(cursorY + gBottom / 2) * scale - (hasBottomAny ? 8 : 0)}
            dominantBaseline="middle"
            fontSize={12}
            style={{
              paintOrder: "stroke",
              stroke: "#fff",
              strokeWidth: 3,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {`${gBottom.toFixed(2)} mm`}
          </text>
        </g>
      );
    }
  }

  // --- wzmocnienia pionowe w świetle (np. przesuwna) ---
  if (withFrame && verticalBars.length > 0) {
    for (const xLeft of verticalBars) {
      const clampedX = Math.max(frameT, Math.min(outerW - frameT - frameT, xLeft));
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

  // --- PRZESTRZEŃ 2: A (wsporniki) -> profil -> omega ---
  let yBottom = outerH; // w mm, od górnego lewego (0,0)
  if (withFrame && hA > 0 && bottomSupports?.xs?.length) {
    const W = frameT * scale;
    const H = hA * scale;
    const y = yBottom * scale;

    for (const xLeft of bottomSupports.xs) {
      // pod ramą, wyrównane do pionowych słupków
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
        y={(outerH + hA / 2) * scale}
        dominantBaseline="middle"
        fontSize={12}
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`A: ${hA.toFixed(2)} mm`}
      </text>
    );

    yBottom += hA;
  }

  if (withFrame && hB > 0) {
    const y = yBottom * scale;
    elems.push(
      <rect
        x={0}
        y={y}
        width={outerW * scale}
        height={hB * scale}
        fill="#cbd5e1"
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
    // etykieta profilu
    elems.push(
      <text
        x={(outerW + 10) * scale}
        y={(outerH + hA + hB / 2) * scale}
        dominantBaseline="middle"
        fontSize={12}
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`Profil: ${hB.toFixed(2)} mm`}
      </text>
    );

    yBottom += hB;
  }

  if (withFrame && hC > 0) {
    const extL = bottomOmega?.extendLeft ?? 0;
    const extR = bottomOmega?.extendRight ?? 0;
    const y = yBottom * scale;
    elems.push(
      <rect
        x={(-extL) * scale}
        y={y}
        width={(outerW + extL + extR) * scale}
        height={hC * scale}
        fill="#64748b"
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
    // etykieta omegi
    elems.push(
      <text
        x={(outerW + 10) * scale}
        y={(outerH + hA + hB + hC / 2) * scale}
        dominantBaseline="middle"
        fontSize={12}
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`Ω: ${hC.toFixed(2)} mm`}
      </text>
    );

    // --- OGON (stylizowany, poza ramą) ---
    if (tailEnabled) {
      const dir = tailSide === "left" ? -1 : 1;
      const baseLen = Math.max(30, tailVisBaseFrac * outerW); // poglądowo
      const startX = tailSide === "right" ? outerW + extR : -extL; // koniec omegi po danej stronie
      const endX = startX + dir * baseLen;

      // 1) przedłużenie od omegi (horyzontalne na połowie wysokości omegi)
      const yMidOmega = (outerH + hA + hB + hC * 0.5) * scale;
      elems.push(
        <line
          x1={startX * scale}
          y1={yMidOmega}
          x2={endX * scale}
          y2={yMidOmega}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );

      // 2) skos do górnej wewnętrznej krawędzi ramy
      const tipX = (tailSide === "right" ? (outerW - frameT * 0.5) : (frameT * 0.5)) * scale;
      const tipY = (frameT) * scale;
      elems.push(
        <line
          x1={endX * scale}
          y1={yMidOmega}
          x2={tipX}
          y2={tipY}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );

      // 3) przedłużenie od dolnej ramy do ~połowy wysięgu
      const yLower = (outerH - frameT * 0.5) * scale;
      const halfX = startX + dir * (baseLen * 0.5);
      elems.push(
        <line
          x1={(tailSide === "right" ? outerW : 0) * scale}
          y1={yLower}
          x2={halfX * scale}
          y2={yLower}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );

      // 3a) „wspornik” na końcu tego przedłużenia (wysokość jak A)
      if (hA > 0) {
        const supW = frameT * scale;
        const supX = (halfX - frameT / 2) * scale;
        elems.push(
          <rect
            x={supX}
            y={outerH * scale}
            width={supW}
            height={(hA) * scale}
            fill={fillFrame}
            stroke={stroke}
            vectorEffect="non-scaling-stroke"
          />
        );
      }

      // 4) skos do ~3/4 wysokości ramy
      const threeQuarterY = (outerH * 0.25 + frameT) * scale;
      const innerX = (tailSide === "right" ? (outerW - frameT * 1.5) : (frameT * 1.5)) * scale;
      elems.push(
        <line
          x1={(halfX) * scale}
          y1={yLower}
          x2={innerX}
          y2={threeQuarterY}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );
    }

    yBottom += hC;
  }

  // --- wymiary całkowite (z przestrzenią 2) ---
  const dims = (
    <g>
      {/* szerokość modułu */}
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
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >{`${outerW} mm`}</text>

      {/* wysokość modułu (korpus + przestrzeń 2) */}
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
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
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
      {elems}  {/* panele + przerwy + wzmocnienia + przestrzeń 2 + ogon */}
      {frame}  {/* rama nad elementami wewnętrznymi */}
      {dims}
    </g>
  );
}
