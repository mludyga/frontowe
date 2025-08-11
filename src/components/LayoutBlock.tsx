import type { JSX } from "react";

export type LayoutProps = {
  title: string;
  outerW: number;            // całkowita szerokość (z ramami lewo/prawo)
  outerH: number;            // wysokość korpusu (do dolnej ramy)
  withFrame: boolean;        // rysować ramę 4-stronną
  gaps: number[];            // przerwy pionowe: [top, mid..., bottom] gdy withFrame; inaczej: mid...
  panels: number[];          // wysokości paneli (pionowy stos)
  scale: number;
  frameVert: number;         // grubość ramy (ta sama na wszystkich krawędziach)

  // Dodatkowe elementy:
  verticalBars?: number[];   // pozycje X (mm od lewej zewnętrznej), szer. = frameVert
  bottomSupports?: {         // pas krótkich wsporników (przestrzeń nr 2)
    height: number;          // wysokość wspornika (mm)
    xs: number[];            // x-lewe (mm) każdego wspornika
  };
  bottomStrip?: {            // pełny profil na całą długość (tuż pod dolną ramą)
    height: number;          // wysokość (mm)
  };
  omega?: {                  // najniższy profil (może wystawać poza ramę)
    height: number;          // wysokość (mm)
    overhangL: number;       // wysunięcie w lewo (mm)
    overhangR: number;       // wysunięcie w prawo (mm)
  };
};

// Kolumna etykiet
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
  bottomStrip,
  omega,
}: LayoutProps) {
  const stroke = "#333";
  const fillFrame = "#94a3b8";

  // Wymiary obszarów
  const frameT = withFrame ? frameVert : 0;
  const innerX = frameT;
  const innerY = frameT;
  const innerW = Math.max(0, outerW - 2 * frameT);
  const innerH = Math.max(0, outerH - 2 * frameT);

  // Przestrzeń 2 – wysokości
  const hSupports =
    bottomSupports && bottomSupports.height > 0 && bottomSupports.xs.length > 0
      ? bottomSupports.height
      : 0;
  const hStrip = bottomStrip?.height ? Math.max(0, bottomStrip.height) : 0;
  const hOmega = omega?.height ? Math.max(0, omega.height) : 0;

  // Całkowita „dodatkowa” wysokość na dole:
  // - wsporniki mogą sięgać niżej niż strip+omega (lub odwrotnie) – bierzemy maksimum
  const extraBottom = Math.max(hSupports, hStrip + hOmega);
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
    const W = w * scale;
    const H = h * scale;
    const X = x * scale;
    const Y = y * scale;
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

  // --- rama (4 strony) + obrys całości (wys. totalH) ---
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
          {/* lewo / prawo (tylko do wysokości korpusu, bez przestrzeni 2) */}
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
      const hasBottomZone = extraBottom > 0;
      const liftPx = hasBottomZone ? 10 : 0; // unieś etykietę, żeby nie zasłaniały jej elementy w Przestrzeni 2
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
            y={(cursorY + gBottom / 2) * scale - liftPx}
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
      const clampedX = Math.max(frameT, Math.min(outerW - frameT - frameT, xLeft));
      elems.push(
        <rect
          key={`vbar-${xLeft}`}
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

  // --- PRZESTRZEŃ 2 ---
  // 1) Pełny profil (strip) – pod dolną ramą, na całej długości
  if (hStrip > 0) {
    elems.push(
      <rect
        key="bottom-strip"
        x={0}
        y={outerH * scale}
        width={outerW * scale}
        height={hStrip * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  // 2) Krótkie wsporniki – szerokość = frameVert, y = outerH
  if (hSupports > 0 && bottomSupports) {
    const W = frameVert * scale;
    const y = outerH * scale;
    for (const xLeftRaw of bottomSupports.xs) {
      const xLeft = Math.max(0, Math.min(outerW - frameVert, xLeftRaw));
      elems.push(
        <rect
          key={`support-${xLeftRaw}`}
          x={xLeft * scale}
          y={y}
          width={W}
          height={hSupports * scale}
          fill={fillFrame}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
  }

  // 3) Omega – najniższy profil, może wystawać poza ramę
  if (hOmega > 0 && omega) {
    const overL = Math.max(0, omega.overhangL || 0);
    const overR = Math.max(0, omega.overhangR || 0);
    const x = -overL;
    const w = outerW + overL + overR;
    const y = (outerH + hStrip) * scale; // pod stripem (jeśli jest)
    elems.push(
      <rect
        key="omega"
        x={x * scale}
        y={y}
        width={w * scale}
        height={hOmega * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  // Etykieta wysokości A (łączna wysokość przestrzeni 2)
  if (extraBottom > 0) {
    elems.push(
      <text
        key="label-A"
        x={(outerW + 10) * scale}
        y={(outerH + extraBottom / 2) * scale}
        dominantBaseline="middle"
        fontSize={12}
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`A: ${extraBottom.toFixed(2)} mm`}
      </text>
    );
  }

  // --- wymiary całkowite (poziome i pionowe) ---
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
      >
        {`${outerW} mm`}
      </text>

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
      {elems}  {/* panele + przerwy + przestrzeń 2 */}
      {frame}  {/* rama na wierzchu */}
      {dims}
    </g>
  );
}
