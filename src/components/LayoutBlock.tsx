import type { JSX } from "react";

export type LayoutProps = {
  title: string;
  outerW: number;            // całkowita szerokość (z ramami lewo/prawo)
  outerH: number;            // całkowita wysokość (z ramami góra/dół)
  withFrame: boolean;        // jeśli true, rysujemy 4 strony ramy grubości frameVert
  gaps: number[];            // przerwy pionowe: [top, mid..., bottom] jeśli withFrame; w przeciwnym razie mid...
  panels: number[];          // wysokości paneli (pionowy stos)
  scale: number;
  frameVert: number;         // grubość ramy — ta sama dla góra/dół/lewo/prawo
  verticalBars?: number[];   // pozycje X (mm, od lewej krawędzi zewnętrznej); szer. = frameVert
  bottomSupports?: {         // pas krótkich wsporników (przestrzeń nr 2)
    height: number;          // wysokość wspornika (mm)
    xs: number[];            // x-lewe (mm) każdego wspornika względem lewej krawędzi zewnętrznej
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
}: LayoutProps) {
  const stroke = "#333";
  const fillFrame = "#94a3b8";

  // Obszar wewnętrzny (między ramami lewo/prawo oraz góra/dół)
  const frameT = withFrame ? frameVert : 0;
  const innerX = frameT;
  const innerY = frameT;
  const innerW = Math.max(0, outerW - 2 * frameT);
  const innerH = Math.max(0, outerH - 2 * frameT);

  // Wysokość całkowita modułu (rama + ewentualny pas wsporników)
  const extraBottom = bottomSupports?.height ?? 0;
  const totalH = outerH + extraBottom;

  function rect(
    x: number,
    y: number,
    w: number,
    h: number,
    label?: string,
    fill = "#ddd",
    s = "#333"
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
        <g key="top-gap">
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

  // --- panele + przerwy środkowe ---
  for (let i = 0; i < panels.length; i++) {
    const t = panels[i];
    elems.push(rect(innerX, cursorY, innerW, t, `${t} mm`));
    cursorY += t;
    if (i < panels.length - 1) {
      const g = gaps[gapIdx++] ?? 0;
      if (g > 0) {
        elems.push(
          <g key={`mid-gap-${i}`}>
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

  // --- przerwa BOTTOM (tylko jeśli jest rama) ---
  if (withFrame) {
    const gBottom = gaps[gaps.length - 1] ?? 0;
    if (gBottom > 0) {
      const hasBottomSupports =
        !!(bottomSupports && bottomSupports.height > 0 && bottomSupports.xs.length > 0);

      elems.push(
        <g key="bottom-gap">
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
            y={((cursorY + gBottom / 2) * scale) - (hasBottomSupports ? 8 : 0)}
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

  // --- wzmocnienia pionowe (np. brama przesuwna) ---
  if (withFrame && verticalBars.length > 0) {
    for (const xLeft of verticalBars) {
      // przycinamy w obszarze między górną a dolną ramą
      const clampedX = Math.max(frameT, Math.min(outerW - frameT - frameT, xLeft));
      elems.push(
        <rect
          key={`vbar-${clampedX}`}
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

  // --- PRZESTRZEŃ 2: pas krótkich wsporników POD dolną ramą (wizualnie pod ramą) ---
  if (withFrame && bottomSupports && bottomSupports.height > 0 && bottomSupports.xs.length > 0) {
    const h = bottomSupports.height;
    const y = outerH * scale;        // start tuż pod dolną ramą
    const H = h * scale;
    const W = frameVert * scale;     // szerokość = grubość ramy

    for (const xLeft of bottomSupports.xs) {
      // pilnujemy, żeby wspornik nie wyszedł poza moduł
      const clampedX = Math.max(0, Math.min(outerW - frameVert, xLeft));
      const X = clampedX * scale;
      elems.push(
        <rect
          key={`bs-${clampedX}`}
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

    // etykieta wysokości pasa wsporników — pod modułem
    const ySupportLabel = (outerH + 12) * scale; // 12 px poniżej modułu
    elems.push(
      <text
        key="bs-label"
        x={(outerW + 10) * scale}
        y={ySupportLabel}
        fontSize={12}
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`A: ${h.toFixed(2)} mm`}
      </text>
    );
  }

  // --- wymiary całkowite (łącznie z pasem wsporników) ---
  const dims = (
    <g>
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
      {elems} {/* panele + przerwy + wsporniki */}
      {frame} {/* rama na wierzchu (żeby zasłonić brzegi paneli) */}
      {dims}
    </g>
  );
}
