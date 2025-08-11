import type { JSX } from "react";

export type LayoutProps = {
  title: string;
  outerW: number;            // szerokość modułu (rama wliczona)
  outerH: number;            // wysokość modułu (rama wliczona)
  withFrame: boolean;
  gaps: number[];            // [top, mid..., bottom] gdy withFrame, w pp. same midy
  panels: number[];
  scale: number;
  frameVert: number;         // grubość ramy (ta sama na 4 krawędziach)

  // wzmocnienia pionowe (np. brama przesuwna)
  verticalBars?: number[];   // x-lewe w mm, szerokość = frameVert

  // PRZESTRZEŃ 2
  bottomSupports?: {         // krótkie wsporniki tuż pod dolną ramą
    height: number;          // wysokość wspornika
    xs: number[];            // x-lewe każdego wspornika
  };
  bottomStrip?: {            // pełny profil na całą długość, POD wspornikami
    height: number;
  };
  omega?: {                  // najniższy profil – może wystawać lewo/prawo
    height: number;
    overhangL?: number;      // wysunięcie poza lewą krawędź modułu
    overhangR?: number;      // wysunięcie poza prawą krawędź modułu
  };
};

// kolumna etykiet po prawej
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

  // wymiary wewnętrzne (obszar paneli)
  const frameT = withFrame ? frameVert : 0;
  const innerX = frameT;
  const innerY = frameT;
  const innerW = Math.max(0, outerW - 2 * frameT);
  const innerH = Math.max(0, outerH - 2 * frameT);

  // PRZESTRZEŃ 2 — wysokości składowe
  const supportsH = Math.max(0, bottomSupports?.height ?? 0);
  const stripH    = Math.max(0, bottomStrip?.height ?? 0);
  const omegaH    = Math.max(0, omega?.height ?? 0);
  const extraBottom = supportsH + stripH + omegaH;        // SUMA (nowe wymaganie)
  const totalH      = outerH + extraBottom;               // wysokość całkowita modułu

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
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
          >
            {label}
          </text>
        ) : null}
      </g>
    );
  }

  // --- rama (4 strony) + obrys z kolumną etykiet ---
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

  // --- TOP GAP (gdy jest rama) ---
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

  // --- PANELS + MIDDLE GAPS ---
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

  // --- BOTTOM GAP (gdy jest rama) ---
  if (withFrame) {
    const gBottom = gaps[gaps.length - 1] ?? 0;
    if (gBottom > 0) {
      const labelLiftPx = extraBottom > 0 ? 12 : 0; // unieś napis, by nie kolidował z Przestrzenią 2
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
            y={(cursorY + gBottom / 2) * scale - labelLiftPx}
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

  // --- WZMOCNIENIA PIONOWE ---
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

  // === PRZESTRZEŃ 2 (od góry do dołu): wsporniki -> strip -> omega ===
  // rysujemy NAJPIERW strip i omegę (niżej), POTEM wsporniki na wierzchu,
  // żeby nic ich nie zasłaniało wizualnie.

  // 1) STRIP (pełny profil) – pod wspornikami
  if (stripH > 0) {
    const yStrip = (outerH + supportsH) * scale;
    elems.push(
      <rect
        x={0}
        y={yStrip}
        width={outerW * scale}
        height={stripH * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  // 2) OMEGA – najniżej; może wystawać lewo/prawo
  if (omegaH > 0) {
    const overL = Math.max(0, omega?.overhangL ?? 0);
    const overR = Math.max(0, omega?.overhangR ?? 0);
    const xOmega = -overL;
    const wOmega = outerW + overL + overR;
    const yOmega = (outerH + supportsH + stripH) * scale;

    elems.push(
      <rect
        x={xOmega * scale}
        y={yOmega}
        width={wOmega * scale}
        height={omegaH * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  // 3) WSPORNIKI – tuż pod dolną ramą, rysowane NA KOŃCU (na wierzchu)
  if (supportsH > 0 && bottomSupports && bottomSupports.xs.length > 0) {
    const ySup = outerH * scale;
    const H = supportsH * scale;
    const W = frameT * scale; // szerokość = grubość ramy

    for (const xLeft of bottomSupports.xs) {
      // nie wyjdź poza moduł
      const clampedX = Math.max(0, Math.min(outerW - frameVert, xLeft));
      const X = clampedX * scale;
      elems.push(
        <rect
          x={X}
          y={ySup}
          width={W}
          height={H}
          fill={fillFrame}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );
    }

    // etykieta Przestrzeni 2 (łączna wysokość A)
    elems.push(
      <text
        x={(outerW + 10) * scale}
        y={(outerH + extraBottom - 4) * scale}
        fontSize={12}
        dominantBaseline="ideographic"
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`A: ${extraBottom.toFixed(2)} mm`}
      </text>
    );
  } else if (extraBottom > 0) {
    // brak wsporników, ale jest strip/omega – też pokaż łączną A
    elems.push(
      <text
        x={(outerW + 10) * scale}
        y={(outerH + extraBottom - 4) * scale}
        fontSize={12}
        dominantBaseline="ideographic"
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`A: ${extraBottom.toFixed(2)} mm`}
      </text>
    );
  }

  // --- WYMIARY CAŁKOWITE (z Przestrzenią 2) ---
  const dims = (
    <g>
      {/* szerokość */}
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
      >{`${outerW} mm`}</text>

      {/* wysokość */}
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
      >{`${totalH} mm`}</text>

      {/* tytuł */}
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
      {elems}  {/* panele + przerwy + piony + Przestrzeń 2 */}
      {frame}  {/* rama na wierzchu (przykrywa krawędzie paneli) */}
      {dims}
    </g>
  );
}
