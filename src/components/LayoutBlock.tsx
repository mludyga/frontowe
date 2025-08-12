import type { JSX } from "react";

export type LayoutProps = {
  title: string;
  outerW: number;            // całkowita szerokość (z ramami lewo/prawo)
  outerH: number;            // całkowita wysokość (korpus, bez pasów poniżej)
  withFrame: boolean;        // 4 strony ramy grubości frameVert
  gaps: number[];            // przerwy pionowe: [top, mid..., bottom] jeśli withFrame; inaczej: mid...
  panels: number[];          // wysokości paneli
  scale: number;
  frameVert: number;         // grubość ramy

  // Wzmocnienia pionowe (np. dla bramy przesuwnej). Każda wartość to X-lewy w mm od krawędzi zewnętrznej.
  verticalBars?: number[];

  // PRZESTRZEŃ 2 (kolejno od góry do dołu)
  bottomSupports?: { height: number; xs: number[] }; // „A”
  bottomProfile?:  { height: number };               // profil pełny
  bottomOmega?:    { height: number; extendLeft?: number; extendRight?: number }; // omega

  // OGON (tylko rysunek – proporcjonalny)
  tailEnabled?: boolean;
  tailSide?: "left" | "right";
  tailVisBaseMM?: number; // horyzontalny „zasięg” ogona użyty do rysunku (i do odsuwania furtki po stronie App)
  tailAnn?: { base?: number | null; diag1?: number | null; diag2?: number | null }; // adnotacje tekstowe (mm)

  // tylko po to, by TS nie krzyczał – nic nie robi wizualnie
  showProfileWidths?: boolean;
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
  bottomProfile,
  bottomOmega,
  tailEnabled = false,
  tailSide = "right",
  tailVisBaseMM = 0,
  tailAnn,
  showProfileWidths = false,
}: LayoutProps) {
  const stroke = "#333";
  const fillFrame = "#94a3b8";

  // Obszar wewnętrzny korpusu
  const frameT = withFrame ? frameVert : 0;
  const innerX = frameT;
  const innerY = frameT;
  const innerW = Math.max(0, outerW - 2 * frameT);
  const innerH = Math.max(0, outerH - 2 * frameT);

  // wysokości pasa pod ramą
  const hA = bottomSupports?.height ?? 0;
  const hP = bottomProfile?.height ?? 0;
  const hO = bottomOmega?.height ?? 0;
  const extraBottom = hA + hP + hO;

  // całkowita wysokość modułu razem z pasami
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

  // --- przerwa TOP (jeśli jest rama) ---
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
    elems.push(rect(innerX, cursorY, innerW, t, `${t.toFixed(2)} mm`));
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

  // --- przerwa BOTTOM (jeśli jest rama) ---
  if (withFrame) {
    const gBottom = gaps[gaps.length - 1] ?? 0;
    if (gBottom > 0) {
      const hasBottomStuff = hA + hP + hO > 0;
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
            y={(cursorY + gBottom / 2) * scale - (hasBottomStuff ? 8 : 0)}
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

  // --- PRZESTRZEŃ 2 (pod ramą, od góry do dołu): A -> profil -> omega ---
  let yBelow = outerH * scale;

  // wsporniki A
  if (hA > 0 && bottomSupports && bottomSupports.xs.length > 0) {
    const H = hA * scale;
    const W = frameT * scale;
    for (const xLeft of bottomSupports.xs) {
      const clampedX = Math.max(0, Math.min(outerW - frameVert, xLeft));
      const X = clampedX * scale;
      elems.push(
        <rect
          key={`A-${X}`}
          x={X}
          y={yBelow}
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
        key="A-label"
        x={(outerW + 10) * scale}
        y={(outerH + 12) * scale}
        fontSize={12}
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >{`A: ${hA.toFixed(2)} mm`}</text>
    );
    yBelow += H;
  }

  // profil pełny
  if (hP > 0) {
    const H = hP * scale;
    elems.push(
      <rect
        key="prof"
        x={0}
        y={yBelow}
        width={outerW * scale}
        height={H}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
    elems.push(
      <text
        key="P-label"
        x={(outerW + 10) * scale}
        y={(outerH + hA + 12 + 14) * scale}
        fontSize={12}
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >{`Profil: ${hP.toFixed(2)} mm`}</text>
    );
    yBelow += H;
  }

  // omega (może wystawać w lewo/prawo)
  if (hO > 0) {
    const H = hO * scale;
    const addL = (bottomOmega?.extendLeft ?? 0) * scale;
    const addR = (bottomOmega?.extendRight ?? 0) * scale;
    elems.push(
      <rect
        key="omega"
        x={-addL}
        y={yBelow}
        width={(outerW * scale) + addL + addR}
        height={H}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
    elems.push(
      <text
        key="O-label"
        x={(outerW + 10) * scale}
        y={(outerH + hA + hP + 12 + 28) * scale}
        fontSize={12}
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >{`Ω: ${hO.toFixed(2)} mm`}</text>
    );
    yBelow += H;
  }

  // --- OGON (stylizowany, proporcjonalny) ---
  if (tailEnabled && tailVisBaseMM > 0) {
    const base = tailVisBaseMM;
    const t = frameT; // grubość = grubość ramy

    // poziom bazowy ogona – przedłużenie od górnej krawędzi omegi
    const yBase = (outerH + hA + hP) * scale;

    // kierunek
    const dir = tailSide === "right" ? 1 : -1;

    // segment poziomy
    elems.push(
      <rect
        key="tail-base"
        x={(tailSide === "right" ? outerW * scale : (0 - base * scale))}
        y={yBase}
        width={base * scale}
        height={t * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );

    // „główna” przekątna do górnej krawędzi ramy
    const x0 = tailSide === "right" ? outerW * scale + base * scale : 0 - t * scale;
    const y0 = yBase;
    const x1 = tailSide === "right" ? (outerW - t) * scale : (t) * scale;
    const y1 = (0 + t) * scale;

    const dx = (t * scale) * dir;
    const dy = 0;

    const poly1 = [
      [x0, y0],
      [x0 + dx, y0 + dy],
      [x1 + dx, y1 + dy],
      [x1, y1],
    ]
      .map((p) => p.join(","))
      .join(" ");

    elems.push(
      <polygon
        key="tail-diag1"
        points={poly1}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );

    // mały słupek na ~1/2 długości podstawy
    const xPost = (tailSide === "right" ? outerW + base / 2 - t / 2 : 0 - base / 2 - t / 2) * scale;
    elems.push(
      <rect
        key="tail-post"
        x={xPost}
        y={outerH * scale}
        width={t * scale}
        height={(hA + hP) * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );

    // druga, krótsza przekątna – do ~3/4 wysokości ramy
    const x2a = xPost + (t * scale) * (tailSide === "right" ? 1 : -1);
    const y2a = outerH * scale;
    const x2b = tailSide === "right" ? (outerW - t) * scale : (t) * scale;
    const y2b = (outerH * 0.25) * scale;

    const poly2 = [
      [x2a, y2a],
      [x2a + dx, y2a + dy],
      [x2b + dx, y2b + dy],
      [x2b, y2b],
    ]
      .map((p) => p.join(","))
      .join(" ");

    elems.push(
      <polygon
        key="tail-diag2"
        points={poly2}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );

    // Adnotacje (mm) – tylko teksty, które wpiszesz ręcznie w App
    if (tailAnn?.base != null) {
      elems.push(
        <text
          key="tail-ann-base"
          x={(tailSide === "right" ? (outerW + base / 2) * scale : (-base / 2) * scale)}
          y={(outerH + hA + hP + t + 16) * scale}
          textAnchor="middle"
          fontSize={12}
          style={{
            paintOrder: "stroke",
            stroke: "#fff",
            strokeWidth: 3,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {`${tailAnn.base} mm`}
        </text>
      );
    }
    if (tailAnn?.diag1 != null) {
      elems.push(
        <text
          key="tail-ann-d1"
          x={(tailSide === "right" ? (outerW + base * 0.75) * scale : (-base * 0.75) * scale)}
          y={(outerH * 0.45) * scale}
          fontSize={12}
          style={{
            paintOrder: "stroke",
            stroke: "#fff",
            strokeWidth: 3,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {`${tailAnn.diag1} mm`}
        </text>
      );
    }
    if (tailAnn?.diag2 != null) {
      elems.push(
        <text
          key="tail-ann-d2"
          x={(tailSide === "right" ? (outerW + base * 0.5) * scale : (-base * 0.5) * scale)}
          y={(outerH * 0.75) * scale}
          fontSize={12}
          style={{
            paintOrder: "stroke",
            stroke: "#fff",
            strokeWidth: 3,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {`${tailAnn.diag2} mm`}
        </text>
      );
    }
  }

  // --- wymiary całkowite (łącznie z pasami) ---
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
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >{`${outerW} mm`}</text>

      {/* wysokość całkowita */}
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
    <g data-spw={showProfileWidths ? 1 : 0}>
      {elems}
      {frame}
      {dims}
    </g>
  );
}
