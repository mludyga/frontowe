import type { JSX } from "react";

export type TailSide = "left" | "right";
export type TailConfig = {
  enabled: boolean;
  side: TailSide;

  // Etykiety – czyste napisy, bez logiki (wpisujesz ręcznie)
  labelBaseLen?: string;   // np. "1800 mm"
  labelLowerExt?: string;  // np. "900 mm"
  labelSupportH?: string;  // np. "80 mm"
  labelDiagHigh?: string;  // np. "3/4 H"

  // Proporcje wyglądu (schemat – brak powiązania z realnymi mm)
  visBaseFrac?: number;       // długość ogona względem outerW (domyślnie 0.35)
  visLowerExtFrac?: number;   // dolne przedłużenie względem base (domyślnie 0.5)
  visDiagHighFrac?: number;   // gdzie „trafiamy” w pion ramy (0..1; domyślnie 0.75)
};

export type LayoutProps = {
  title: string;
  outerW: number;            // całkowita szerokość (z ramami lewo/prawo)
  outerH: number;            // całkowita wysokość korpusu (z ramami góra/dół)
  withFrame: boolean;        // jeśli true, rysujemy 4 strony ramy grubości frameVert
  gaps: number[];            // przerwy pionowe: [top, mid..., bottom] jeśli withFrame; w przeciwnym razie mid...
  panels: number[];          // wysokości paneli (pionowy stos)
  scale: number;
  frameVert: number;         // grubość ramy — ta sama dla góra/dół/lewo/prawo

  verticalBars?: number[];   // pozycje X (mm, od lewej krawędzi zewnętrznej); szerokość = frameVert

  // Przestrzeń 2 — elementy pod dolną ramą (liczą się do całkowitej wysokości modułu)
  bottomSupports?: { height: number; xs: number[] };
  bottomProfile?: { height: number };
  bottomOmega?: { height: number; extendLeft: number; extendRight: number };

  // Kolumna z opisami szerokości profili (światła) – jeżeli chcesz je także w samym module
  showProfileWidths?: boolean;

  // „Ogon” — schematyczny, rysowany poza modułem; nie wpływa na wymiary/sumy
  tail?: TailConfig;
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
  showProfileWidths,
  tail,
}: LayoutProps) {
  const stroke = "#333";
  const fillFrame = "#94a3b8";

  // Obszar wewnętrzny (między ramami lewo/prawo oraz góra/dół)
  const frameT = withFrame ? frameVert : 0;
  const innerX = frameT;
  const innerY = frameT;
  const innerW = Math.max(0, outerW - 2 * frameT);
  const innerH = Math.max(0, outerH - 2 * frameT);

  // „Przestrzeń 2” – wysokości składowe
  const hA = bottomSupports?.height ?? 0;
  const hB = bottomProfile?.height ?? 0;
  const hO = bottomOmega?.height ?? 0;

  // Całkowita wysokość modułu (korpus + przestrzeń 2)
  const totalH = outerH + hA + hB + hO;

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
      const hasBottomAnything = hA > 0 || hB > 0 || hO > 0;
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
            y={(cursorY + gBottom / 2) * scale - (hasBottomAnything ? 8 : 0)}
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

  // --- PRZESTRZEŃ 2: WSPORNIKI (A) ---
  if (withFrame && bottomSupports && hA > 0 && bottomSupports.xs.length > 0) {
    const y = outerH * scale; // tuż pod dolną ramą
    const H = hA * scale;
    const W = frameT * scale; // grubość = grubość ramy

    for (const xLeft of bottomSupports.xs) {
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

    // Etykieta A pod modułem (po prawej)
    elems.push(
      <text
        x={(outerW + 10) * scale}
        y={(outerH + 12) * scale}
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
  }

  // --- PRZESTRZEŃ 2: PROFIL PEŁNY (B) ---
  if (withFrame && bottomProfile && hB > 0) {
    const y = (outerH + hA) * scale;
    elems.push(
      <rect
        x={0}
        y={y}
        width={outerW * scale}
        height={hB * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  // --- PRZESTRZEŃ 2: OMEGA (O) z wysięgiem w lewo/prawo ---
  if (withFrame && bottomOmega && hO > 0) {
    const y = (outerH + hA + hB) * scale;
    const extL = bottomOmega.extendLeft ?? 0;
    const extR = bottomOmega.extendRight ?? 0;

    elems.push(
      <rect
        x={(-extL) * scale}
        y={y}
        width={(outerW + extL + extR) * scale}
        height={hO * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );

    // Małe wypełnienie (cieniutka linia „prowadnicy”)
    elems.push(
      <line
        x1={(-extL) * scale}
        y1={(outerH + hA + hB + hO) * scale}
        x2={(outerW + extR) * scale}
        y2={(outerH + hA + hB + hO) * scale}
        stroke="#999"
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    );

    // Etykieta „Ω”
    elems.push(
      <text
        x={(outerW + 10) * scale}
        y={(outerH + hA + hB + hO - 6) * scale}
        fontSize={12}
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`Ω: ${hO.toFixed(2)} mm`}
      </text>
    );
  }

  // --- OGON (schemat; nie wpływa na wymiary) ---
  if (tail?.enabled && withFrame) {
    const side: TailSide = tail.side ?? "right";
    const baseFrac = tail.visBaseFrac ?? 0.35;
    const lowerFrac = tail.visLowerExtFrac ?? 0.5;
    const highFrac = Math.max(0, Math.min(1, tail.visDiagHighFrac ?? 0.75));

    const extL = bottomOmega?.extendLeft ?? 0;
    const extR = bottomOmega?.extendRight ?? 0;

    // bazowa długość „zgodnie z proporcją”
    let baseLen = Math.max(0, baseFrac * outerW);
    // opcjonalne „ograniczenie” do wysięgu omegi po danej stronie (żeby nie zachodzić na furtkę itd.)
    const allowed = side === "right" ? extR : extL;
    if (allowed > 0) baseLen = Math.min(baseLen, allowed);

    const baseH = frameT; // grubość ogona zgodna z ramą
    const yOmegaTop = outerH + hA + hB;
    const yBase = yOmegaTop + hO - baseH; // tak, by dół ogona „stykał się” z dołem omegi

    const startX = side === "right" ? (outerW + extR) : (-extL);
    const endX = side === "right" ? startX + baseLen : startX - baseLen;

    // belka bazowa
    elems.push(
      <rect
        x={Math.min(startX, endX) * scale}
        y={yBase * scale}
        width={Math.abs(endX - startX) * scale}
        height={baseH * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );

    // skos nr 1: z końca belki do górnej krawędzi ramy
    const targetTopX = side === "right" ? (outerW - frameT) : frameT;
    const targetTopY = 0; // górna krawędź modułu (zewnętrzna)
    elems.push(
      <line
        x1={endX * scale}
        y1={yBase * scale}
        x2={targetTopX * scale}
        y2={targetTopY * scale}
        stroke={stroke}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    );

    // dolne przedłużenie ramy
    const lowerLen = lowerFrac * baseLen;
    const lowerStartX = side === "right" ? (outerW - frameT) : (frameT - lowerLen);
    elems.push(
      <rect
        x={lowerStartX * scale}
        y={(outerH - frameT) * scale}
        width={lowerLen * scale}
        height={frameT * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );

    // mały wspornik (wysokość = jak A; jeśli brak A – przyjmij min 20)
    const smallH = hA > 0 ? hA : Math.max(20, frameT);
    const supportX = side === "right"
      ? (lowerStartX + lowerLen - frameT)
      : lowerStartX;
    elems.push(
      <rect
        x={supportX * scale}
        y={outerH * scale}
        width={frameT * scale}
        height={smallH * scale}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );

    // skos nr 2: z czubka wspornika do ~3/4 wysokości ramy (po tej stronie)
    const targetDiagX = side === "right" ? (outerW - frameT) : frameT;
    const targetDiagY = (innerY + innerH * (1 - highFrac));
    const startDiagX = side === "right" ? (supportX) : (supportX + frameT);
    const startDiagY = outerH; // start nad „przestrzenią 2”
    elems.push(
      <line
        x1={startDiagX * scale}
        y1={startDiagY * scale}
        x2={targetDiagX * scale}
        y2={targetDiagY * scale}
        stroke={stroke}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    );

    // --- etykiety (jeśli podane) ---
    const labelStyle: JSX.CSSProperties = {
      paintOrder: "stroke",
      stroke: "#fff",
      strokeWidth: 3,
      fontVariantNumeric: "tabular-nums",
    };

    if (tail.labelBaseLen) {
      const cx = (startX + endX) / 2;
      elems.push(
        <text x={cx * scale} y={(yBase - 6) * scale} textAnchor="middle" fontSize={11} style={labelStyle}>
          {tail.labelBaseLen}
        </text>
      );
    }
    if (tail.labelLowerExt) {
      const cx = (lowerStartX + (side === "right" ? lowerLen / 2 : lowerLen / 2)) * scale;
      elems.push(
        <text x={cx} y={(outerH - frameT - 6) * scale} textAnchor="middle" fontSize={11} style={labelStyle}>
          {tail.labelLowerExt}
        </text>
      );
    }
    if (tail.labelSupportH) {
      elems.push(
        <text x={(supportX + frameT + 6) * scale} y={(outerH + smallH / 2) * scale} fontSize={11} style={labelStyle}>
          {tail.labelSupportH}
        </text>
      );
    }
    if (tail.labelDiagHigh) {
      const lx = (targetDiagX + startDiagX) / 2;
      const ly = (targetDiagY + startDiagY) / 2;
      elems.push(
        <text x={lx * scale} y={(ly - 8) * scale} textAnchor="middle" fontSize={11} style={labelStyle}>
          {tail.labelDiagHigh}
        </text>
      );
    }
  }

  // --- wymiary całkowite (łącznie z „przestrzenią 2”) ---
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
      {elems} {/* panele + przerwy + wsporniki/profil/omega + ogon */}
      {frame} {/* rama na wierzchu (żeby zasłonić brzegi paneli) */}
      {dims}
    </g>
  );
}
