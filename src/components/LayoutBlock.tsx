// src/components/LayoutBlock.tsx
import type { JSX } from "react";
import type { TailMode, TailManualLabels } from "../types/tail";

/** Stała szerokości kolumny z etykietami */
export const LABEL_COL_MM = 148;

export type LayoutProps = {
  title: string;
  outerW: number;          // szerokość korpusu (mm)
  outerH: number;          // wysokość korpusu (mm)
  withFrame: boolean;
  gaps: number[];          // [top, mid..., bottom] gdy withFrame, inaczej mid...
  panels: number[];        // wysokości paneli
  scale: number;
  frameVert: number;       // grubość ramy (ta sama na wszystkich krawędziach)

  /** pionowe wzmocnienia – x-lewe w mm liczone od LEWEJ krawędzi zewnętrznej */
  verticalBars?: number[];

  /** Przestrzeń 2 – krótkie wsporniki A (pod dolną ramą) */
  bottomSupports?: {
    height: number;
    xs: number[];          // x-lewe każdego wspornika (mm; 0 = lewa krawędź zewnętrzna)
  };

  /** Przestrzeń 2 – pełny profil pod wspornikami */
  bottomProfile?: { height: number };

  /** Przestrzeń 2 – omega (najniżej) + wysięgi L/P (opcjonalne – możesz zostawić 0) */
  bottomOmega?: {
    height: number;
    extendLeft?: number;
    extendRight?: number;
  };

  /** Czy rysować etykiety szerokości światła między pionami */
  showProfileWidths?: boolean;

  /** OGON (wizualny; wyłącznie dla bramy przesuwnej) */
  tailEnabled?: boolean;
  tailSide?: "left" | "right"; // domyślnie "right"
  /** długość podstawy ogona jako ułamek wysokości korpusu (np. 0.8) */
  tailVisBaseFrac?: number;

  /** Adnotacje (teksty w mm) – tylko wyświetlamy */
  tailAnnBaseMM?: number | null;
  tailAnnDiag1MM?: number | null;
  tailAnnDiag2MM?: number | null;

  /** tryb/etykiety – jeżeli chcesz używać */
  tailMode?: TailMode;
  tailManualLabels?: TailManualLabels;

  /** Parametry ogona (pozycje poglądowe) */
  tailSkew2Frac?: number;       // gdzie zaczyna się skos #2 na podstawie (0..1), domyślnie 0.6
  tailBottomExtFrac?: number;   // ile długości podstawy ma mieć przedłużenie dolnej ramy (0..1), domyślnie 0.5
};

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
  tailEnabled = false,
  tailSide = "right",
  tailVisBaseFrac = 0.8,
  tailAnnBaseMM,
  tailAnnDiag1MM,
  tailAnnDiag2MM,
  tailSkew2Frac = 0.6,
  tailBottomExtFrac = 0.5,
}: LayoutProps) {
  const stroke = "#333";
  const fillFrame = "#94a3b8";

  // --- geometra korpusu ---
  const frameT = withFrame ? frameVert : 0;
  const innerX = frameT;
  const innerY = frameT;
  const innerW = Math.max(0, outerW - 2 * frameT);
  const innerH = Math.max(0, outerH - 2 * frameT);

  // --- Przestrzeń 2 – wysokości składowych (A, profil, omega) ---
  const hA = Math.max(0, bottomSupports?.height ?? 0);
  const hP = Math.max(0, bottomProfile?.height ?? 0);
  const hO = Math.max(0, bottomOmega?.height ?? 0);
  const totalH = outerH + hA + hP + hO;

  // pomocnicze
  const mm = (v: number) => v * scale;

  function rect(
    x: number,
    y: number,
    w: number,
    h: number,
    label?: string,
    fill = "#ddd",
    s = "#333"
  ) {
    return (
      <g>
        <rect
          x={mm(x)}
          y={mm(y)}
          width={mm(w)}
          height={mm(h)}
          fill={fill}
          stroke={s}
          vectorEffect="non-scaling-stroke"
        />
        {label ? (
          <text
            x={mm(outerW + 6)} // kolumna etykiet
            y={mm(y + h / 2)}
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

  // === OGON – przygotowanie kształtów (rysujemy go NAJPIERW, bez obrysu) ===
  // helper: „belka” o grubości t między punktami (ax,ay)->(bx,by)
  const strutPoly = (ax: number, ay: number, bx: number, by: number, t: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) return null;
    const ux = dx / L;
    const uy = dy / L;
    // wektor normalny (w dół ekranu rośnie y – ale dla wielokąta nie ma to znaczenia)
    const nx = -uy * (t / 2);
    const ny =  ux * (t / 2);
    const p1 = `${mm(ax + nx)},${mm(ay + ny)}`;
    const p2 = `${mm(ax - nx)},${mm(ay - ny)}`;
    const p3 = `${mm(bx - nx)},${mm(by - ny)}`;
    const p4 = `${mm(bx + nx)},${mm(by + ny)}`;
    return <polygon points={`${p1} ${p2} ${p3} ${p4}`} fill={fillFrame} stroke="none" />;
  };

  let tailElems: JSX.Element | null = null;

  if (tailEnabled && hO > 0) {
    const dir = tailSide === "right" ? 1 : -1;

    // podstawa ogona (przedłużenie omegi) – ta sama grubość co omega
    const baseLen = Math.max(outerH * Math.max(0, Math.min(1, tailVisBaseFrac)), 0);
    const baseTopY = outerH + hA + hP;      // górna krawędź omegi
    const baseX0 = tailSide === "right" ? outerW : outerW - baseLen; // tak, by „szła” w prawo/lewo
    const baseX1 = baseX0 + dir * baseLen;

    // skos #1: od końca podstawy do górnego rogu po stronie ogona
    const topX = tailSide === "right" ? outerW : 0;
    const topY = 0;

    // skos #2: od ~60% podstawy do połowy prawego/lewego słupka
    const frac2 = Math.max(0, Math.min(1, tailSkew2Frac));
    const s2x = baseX0 + dir * (baseLen * frac2);
    const s2y = baseTopY + hO / 2; // mniej więcej środek „belki” podstawy
    const midX = tailSide === "right" ? outerW : 0;
    const midY = outerH / 2;

    // przedłużenie dolnej ramy (grubość = frameT) do 50% (parametr) długości podstawy poza ramą
    const extFrac = Math.max(0, Math.min(1, tailBottomExtFrac));
    const baseExtLen = baseLen * extFrac;
    const botY = outerH - frameT; // tak jak dolna rama
    const botX0 = tailSide === "right" ? outerW : outerW - baseExtLen;
    const botX1 = botX0 + dir * baseExtLen;

    tailElems = (
      <g>
        {/* Podstawa ogona = prostokąt, bez obrysu */}
        <rect
          x={mm(Math.min(baseX0, baseX1))}
          y={mm(baseTopY)}
          width={mm(Math.abs(baseX1 - baseX0))}
          height={mm(hO)}
          fill={fillFrame}
          stroke="none"
        />

        {/* Skos #1 i #2 – grubość = hO */}
        {strutPoly(baseX1, baseTopY + hO / 2, topX, topY, hO)}
        {strutPoly(s2x,   s2y,                midX, midY, hO)}

        {/* Przedłużenie dolnej ramy – grubość = frameT */}
        <rect
          x={mm(Math.min(botX0, botX1))}
          y={mm(botY)}
          width={mm(Math.abs(botX1 - botX0))}
          height={mm(frameT)}
          fill={fillFrame}
          stroke="none"
        />

        {/* Ewentualne adnotacje tekstowe (jeśli podasz) */}
        {tailAnnBaseMM != null && (
          <text
            x={mm((baseX0 + baseX1) / 2)}
            y={mm(baseTopY + hO) - 6}
            fontSize={11}
            textAnchor="middle"
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
          >
            {`${tailAnnBaseMM} mm`}
          </text>
        )}
        {tailAnnDiag1MM != null && (
          <text
            x={mm((baseX1 + topX) / 2)}
            y={mm((baseTopY + hO / 2 + topY) / 2) - 6}
            fontSize={11}
            textAnchor="middle"
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
          >
            {`${tailAnnDiag1MM} mm`}
          </text>
        )}
        {tailAnnDiag2MM != null && (
          <text
            x={mm((s2x + midX) / 2)}
            y={mm((s2y + midY) / 2) - 6}
            fontSize={11}
            textAnchor="middle"
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
          >
            {`${tailAnnDiag2MM} mm`}
          </text>
        )}
      </g>
    );
  }

  // --- rama (4 strony) + obrys całego modułu (z kolumną etykiet) ---
  const frame = (
    <g>
      {/* obrys modułu (z kolumną etykiet) */}
      <rect
        x={0}
        y={0}
        width={mm(outerW + LABEL_COL_MM)}
        height={mm(totalH)}
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

  // --- panele i przerwy ---
  const elems: JSX.Element[] = [];
  let cursorY = innerY;
  let gapIdx = 0;

  // przerwa TOP
  if (withFrame) {
    const gTop = gaps[0] ?? 0;
    if (gTop > 0) {
      elems.push(
        <g>
          <rect
            x={mm(innerX)}
            y={mm(innerY)}
            width={mm(innerW)}
            height={mm(gTop)}
            fill="#f1f5f9"
            stroke="#64748b"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={mm(outerW + 10)}
            y={mm(innerY + gTop / 2)}
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

  // panele + przerwy środkowe
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
              x={mm(innerX)}
              y={mm(cursorY)}
              width={mm(innerW)}
              height={mm(g)}
              fill="#f1f5f9"
              stroke="#64748b"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={mm(outerW + 10)}
              y={mm(cursorY + g / 2)}
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

  // przerwa BOTTOM (tylko przy ramie)
  if (withFrame) {
    const gBottom = gaps[gaps.length - 1] ?? 0;
    if (gBottom > 0) {
      const hasExtras = hA > 0 || hP > 0 || hO > 0;
      elems.push(
        <g>
          <rect
            x={mm(innerX)}
            y={mm(cursorY)}
            width={mm(innerW)}
            height={mm(gBottom)}
            fill="#f1f5f9"
            stroke="#64748b"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={mm(outerW + 10)}
            y={mm(cursorY + gBottom / 2) - (hasExtras ? 8 : 0)}
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

  // --- pionowe wzmocnienia wewnątrz korpusu ---
  if (withFrame && verticalBars.length > 0) {
    for (const xLeft of verticalBars) {
      const clampedX = Math.max(frameT, Math.min(outerW - frameT - frameT, xLeft));
      elems.push(
        <rect
          x={mm(clampedX)}
          y={mm(innerY)}
          width={mm(frameT)}
          height={mm(innerH)}
          fill={fillFrame}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
  }

  // === PRZESTRZEŃ 2 ===
  // 1) wsporniki A
  if (hA > 0 && bottomSupports?.xs?.length) {
    const yTop = outerH * scale;
    const H = hA * scale;
    const W = frameT * scale;

    for (const raw of bottomSupports.xs) {
      const clamped = Math.max(0, Math.min(outerW - frameVert, raw));
      elems.push(
        <rect
          x={mm(clamped)}
          y={yTop}
          width={W}
          height={H}
          fill={fillFrame}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    elems.push(
      <text
        x={mm(outerW + 10)}
        y={mm(outerH) + H - 4}
        fontSize={12}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`A: ${hA.toFixed(2)} mm`}
      </text>
    );
  }

  // 2) pełny profil
  if (hP > 0) {
    const y = (outerH + hA) * scale;
    elems.push(
      <rect
        x={0}
        y={y}
        width={mm(outerW)}
        height={mm(hP)}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  // 3) OMEGA (najniżej) + opcjonalne wysięgi (jeśli nadal używasz)
  if (hO > 0) {
    const y = (outerH + hA + hP) * scale;
    const extL = Math.max(0, bottomOmega?.extendLeft ?? 0);
    const extR = Math.max(0, bottomOmega?.extendRight ?? 0);

    elems.push(
      <rect
        x={0}
        y={y}
        width={mm(outerW)}
        height={mm(hO)}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
    if (extL > 0) {
      elems.push(
        <rect
          x={mm(0 - extL)}
          y={y}
          width={mm(extL)}
          height={mm(hO)}
          fill={fillFrame}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    if (extR > 0) {
      elems.push(
        <rect
          x={mm(outerW)}
          y={y}
          width={mm(extR)}
          height={mm(hO)}
          fill={fillFrame}
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    elems.push(
      <text
        x={mm(outerW + 10)}
        y={mm(outerH + hA + hP) + mm(hO) - 4}
        fontSize={12}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`Ω: ${hO.toFixed(2)} mm`}
      </text>
    );
  }

  // --- (opcjonalnie) szerokości świateł między pionami ---
  if (showProfileWidths) {
    const segs: Array<[number, number]> = [];
    const rightIn = outerW - frameT;
    let start = frameT;
    const bars = (verticalBars ?? [])
      .map((x) => Math.max(frameT, Math.min(outerW - frameT - frameT, x)))
      .sort((a, b) => a - b);
    for (const x of bars) {
      const end = Math.min(x, rightIn);
      if (end > start) segs.push([start, end]);
      start = Math.min(x + frameT, rightIn);
    }
    if (rightIn > start) segs.push([start, rightIn]);
    if (segs.length === 0) segs.push([frameT, rightIn]);

    segs.forEach(([a, b]) => {
      const cx = (a + b) / 2;
      const text = `${(b - a).toFixed(0)} mm`;
      elems.push(
        <text
          x={mm(cx)}
          y={mm(6)}
          fontSize={11}
          textAnchor="middle"
          style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
        >
          {text}
        </text>
      );
    });
  }

  // --- wymiary całkowite (szerokość korpusu + wysokość całkowita z Przestrzenią 2) ---
  const dims = (
    <g>
      {/* szerokość */}
      <line
        x1={0}
        y1={mm(totalH + 28)}
        x2={mm(outerW + LABEL_COL_MM)}
        y2={mm(totalH + 28)}
        stroke={stroke}
        markerEnd="url(#arrowhead)"
        markerStart="url(#arrowhead)"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={mm((outerW + LABEL_COL_MM) / 2)}
        y={mm(totalH + 22)}
        textAnchor="middle"
        fontSize={12}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`${outerW} mm`}
      </text>

      {/* wysokość całkowita */}
      <line
        x1={mm(outerW + LABEL_COL_MM + 28)}
        y1={0}
        x2={mm(outerW + LABEL_COL_MM + 28)}
        y2={mm(totalH)}
        stroke={stroke}
        markerEnd="url(#arrowhead)"
        markerStart="url(#arrowhead)"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={mm(outerW + LABEL_COL_MM + 36)}
        y={mm(totalH / 2)}
        fontSize={12}
        transform={`rotate(90 ${mm(outerW + LABEL_COL_MM + 36)} ${mm(totalH / 2)})`}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`${totalH} mm`}
      </text>

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
      {tailElems /* ogon – na spodzie, bez obrysu, więc nie zasłania wymiarów */}
      {elems /* panele + przerwy + wzmocnienia + Przestrzeń 2 */}
      {frame /* rama na wierzchu */}
      {dims}
    </g>
  );
}
