import type { JSX } from "react";
import TailManual from "./TailManual";
import type { TailMode, TailManualLabels } from "../types/tail";

/** Szerokość kolumny z etykietami */
export const LABEL_COL_MM = 148;

export type LayoutProps = {
  title: string;
  outerW: number;            // szerokość korpusu (mm)
  outerH: number;            // wysokość korpusu (mm)
  withFrame: boolean;
  gaps: number[];            // [top, mid..., bottom] gdy withFrame, inaczej mid...
  panels: number[];          // wysokości paneli
  scale: number;
  frameVert: number;         // grubość ramy (mm, ta sama wszędzie)
  verticalBars?: number[];   // x-lewe w mm od lewej zewn. krawędzi

  // Przestrzeń 2
  bottomSupports?: { height: number; xs: number[] };
  bottomProfile?: { height: number };
  bottomOmega?: { height: number; extendLeft?: number; extendRight?: number };

  showProfileWidths?: boolean;

  // OGON (wizualny, tylko przesuwna)
  tailEnabled?: boolean;
  tailSide?: "left" | "right";
  tailVisBaseFrac?: number;              // długość podstawy jako ułamek outerH

  // parametry ogona – edytowalne
  tailBottomExtFrac?: number;            // ile podstawy idzie „przedłużenie dolnej ramy”
  tailSkew2Frac?: number;                // gdzie startuje skos2 wzdłuż podstawy
  tailSkew2TargetHFrac?: number;         // na jakiej wysokości pionu kończy się skos2 (0=góra,1=dół)

  // tryb manualny (czyste etykiety)
  tailMode?: TailMode;                   // 'auto' | 'manual'
  tailManualLabels?: TailManualLabels;

  // Adnotacje (tylko tekst, opcjonalnie)
  tailAnnBaseMM?: number | null;
  tailAnnDiag1MM?: number | null;
  tailAnnDiag2MM?: number | null;
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
  // ogon
  tailEnabled = false,
  tailSide = "right",
  tailVisBaseFrac = 0.8,
  tailBottomExtFrac = 0.5,
  tailSkew2Frac = 0.6,
  tailSkew2TargetHFrac = 0.5,
  tailMode = "auto",
  tailManualLabels,
  tailAnnBaseMM,
  tailAnnDiag1MM,
  tailAnnDiag2MM,
}: LayoutProps) {
  // kolory/rysowanie
  const stroke = "#333";
  const fillMetal = "#94a3b8";   // „metal”
  const fillPanel = "#e5e7eb";   // wypełnienie paneli
  const gapStroke = "#64748b";

  // mm -> px
  const mm = (v: number) => v * scale;

  // geometra korpusu
  const frameT = withFrame ? frameVert : 0;
  const innerX = frameT;
  const innerY = frameT;
  const innerW = Math.max(0, outerW - 2 * frameT);
  const innerH = Math.max(0, outerH - 2 * frameT);

  // Przestrzeń 2
  const hA = Math.max(0, bottomSupports?.height ?? 0);
  const hP = Math.max(0, bottomProfile?.height ?? 0);
  const hO = Math.max(0, bottomOmega?.height ?? 0);
  const totalH = outerH + hA + hP + hO;

  // pomocniczy „rect” bez obrysu (by nie było „ramek” wewnątrz)
  const solidRect = (x: number, y: number, w: number, h: number, fill = fillMetal) => (
    <rect
      x={mm(x)}
      y={mm(y)}
      width={mm(w)}
      height={mm(h)}
      fill={fill}
      stroke="none"
      vectorEffect="non-scaling-stroke"
    />
  );

  // === rama (obrys modułu + wypełnienia bez stroke) ===
  const frameLayer = (
    <g>
      {/* obrys całego modułu (z kolumną etykiet) */}
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
          {solidRect(0, 0, outerW, frameT)}                {/* góra */}
          {solidRect(0, outerH - frameT, outerW, frameT)}  {/* dół */}
          {solidRect(0, 0, frameT, outerH)}                {/* lewo */}
          {solidRect(outerW - frameT, 0, frameT, outerH)}  {/* prawo */}
        </>
      )}
    </g>
  );

  // === panele + przerwy (panele bez stroke, przerwy jako przerywana siatka) ===
  const elems: JSX.Element[] = [];
  let cursorY = innerY;
  let gapIdx = 0;

  // TOP gap (tylko przy ramie)
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
            stroke={gapStroke}
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

  for (let i = 0; i < panels.length; i++) {
    const t = panels[i];
    // panel – bez obrysu
    elems.push(solidRect(innerX, cursorY, innerW, t, fillPanel));
    // etykieta panelu
    elems.push(
      <text
        x={mm(outerW + 10)}
        y={mm(cursorY + t / 2)}
        dominantBaseline="middle"
        fontSize={12}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`${t} mm`}
      </text>
    );

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
              stroke={gapStroke}
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

  // BOTTOM gap (jeśli jest rama)
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
            stroke={gapStroke}
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

  // wzmocnienia pionowe – wypełnienia bez obrysu
  if (withFrame && verticalBars.length > 0) {
    for (const xLeft of verticalBars) {
      const clampedX = Math.max(frameT, Math.min(outerW - frameT - frameT, xLeft));
      elems.push(solidRect(clampedX, innerY, frameT, innerH));
    }
  }

  // === Przestrzeń 2 (A -> profil -> Ω) – wszystkie jako pełne wypełnienia, bez stroke ===
  if (hA > 0 && bottomSupports?.xs?.length) {
    const yTop = outerH; // start bezpośrednio pod korpusem (w mm)
    for (const raw of bottomSupports.xs) {
      const clamped = Math.max(0, Math.min(outerW - frameVert, raw));
      elems.push(solidRect(clamped, yTop, frameT, hA));
    }
    // opis wysokości A
    elems.push(
      <text
        x={mm(outerW + 10)}
        y={mm(outerH + hA) - 6}
        fontSize={12}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`A: ${hA.toFixed(2)} mm`}
      </text>
    );
  }

  if (hP > 0) {
    elems.push(solidRect(0, outerH + hA, outerW, hP));
  }

  if (hO > 0) {
    // Tylko „korpusowa” omega – przedłużenie wykonamy w OGONIE
    elems.push(solidRect(0, outerH + hA + hP, outerW, hO));
    elems.push(
      <text
        x={mm(outerW + 10)}
        y={mm(outerH + hA + hP + hO) - 6}
        fontSize={12}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`Ω: ${hO.toFixed(2)} mm`}
      </text>
    );
  }

  // --- OGON (AUTO) – wszystko grubością ramy, bez „wystawania” ---
  if (tailEnabled && hO > 0) {
    if (tailMode === "manual") {
      // tryb manualny – gotowy wrapper (etykiety tekstowe)
      elems.push(
        <TailManual
          outerW={outerW}
          outerH={outerH}
          frameT={frameT}
          hA={hA}
          hP={hP}
          hO={hO}
          scale={scale}
          side={tailSide}
          labels={tailManualLabels}
        />
      );
    } else {
      const dir = tailSide === "right" ? 1 : -1;
      const baseLen = Math.max(0, outerH * tailVisBaseFrac);
      const baseStartX = tailSide === "right" ? outerW : 0;
      const baseEndX = baseStartX + dir * baseLen;
      const baseY = outerH + hA + hP + hO; // dół omegi

      // 1) przedłużenie OMEGI – grubość = hO, w osi omegi
      const omegaY = outerH + hA + hP;
      elems.push(
        solidRect(Math.min(baseStartX, baseEndX), omegaY, Math.abs(baseEndX - baseStartX), hO)
      );

      // 2) przedłużenie DOLNEJ RAMY – grubość = frameT
      const frameExtLen = baseLen * Math.max(0, Math.min(1, tailBottomExtFrac));
      const frameExtEndX = baseStartX + dir * frameExtLen;
      const frameY = outerH - frameT;
      elems.push(
        solidRect(Math.min(baseStartX, frameExtEndX), frameY, Math.abs(frameExtEndX - baseStartX), frameT)
      );

      // Skosy rysujemy kreską o grubości = frameT (bez wypełnień – nie zakrywają opisów)
      const thick = mm(frameT);
      const lineStyle = {
        stroke: fillMetal,
        strokeWidth: thick,
        strokeLinecap: "square" as const,
        strokeLinejoin: "miter" as const,
      };

      // 3) SKOS #1 – od końca omegi do prawego górnego rogu ramy
      const topCornerX = tailSide === "right" ? outerW : 0;
      const topCornerY = 0;
      elems.push(
        <line
          x1={mm(baseEndX)}
          y1={mm(baseY)}
          x2={mm(topCornerX)}
          y2={mm(topCornerY)}
          {...lineStyle}
        />
      );

      // 4) SKOS #2 – od ~tailSkew2Frac podstawy do tailSkew2TargetHFrac wysokości pionu
      const skew2StartX = baseStartX + dir * baseLen * Math.max(0, Math.min(1, tailSkew2Frac));
      const skew2StartY = baseY;
      const skew2EndX = topCornerX;
      const skew2EndY = outerH * Math.max(0, Math.min(1, tailSkew2TargetHFrac));
      elems.push(
        <line
          x1={mm(skew2StartX)}
          y1={mm(skew2StartY)}
          x2={mm(skew2EndX)}
          y2={mm(skew2EndY)}
          {...lineStyle}
        />
      );

      // Opcjonalne adnotacje (czysty tekst – nic nie wymiarujemy)
      const textStyle = {
        paintOrder: "stroke",
        stroke: "#fff",
        strokeWidth: 3,
        fontVariantNumeric: "tabular-nums",
      } as const;

      if (tailAnnBaseMM != null) {
        const cx = (baseStartX + baseEndX) / 2;
        elems.push(
          <text x={mm(cx)} y={mm(baseY) - 6} fontSize={11} textAnchor="middle" style={textStyle}>
            {`${tailAnnBaseMM} mm`}
          </text>
        );
      }
      if (tailAnnDiag1MM != null) {
        const cx = (baseEndX + topCornerX) / 2;
        const cy = (baseY + topCornerY) / 2;
        elems.push(
          <text x={mm(cx)} y={mm(cy) - 6} fontSize={11} textAnchor="middle" style={textStyle}>
            {`${tailAnnDiag1MM} mm`}
          </text>
        );
      }
      if (tailAnnDiag2MM != null) {
        const cx = (skew2StartX + skew2EndX) / 2;
        const cy = (skew2StartY + skew2EndY) / 2;
        elems.push(
          <text x={mm(cx)} y={mm(cy) - 6} fontSize={11} textAnchor="middle" style={textStyle}>
            {`${tailAnnDiag2MM} mm`}
          </text>
        );
      }
    }
  }

  // --- (opcjonalnie) szerokości świateł między pionami – krótki opis przy górnej ramie ---
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

  // --- wymiary całkowite (rysowane na samym końcu, żeby nic ich nie zasłaniało) ---
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
      {/* kolejność = warstwy: najpierw wnętrze, potem rama, na koniec wymiary */}
      {elems}
      {frameLayer}
      {dims}
    </g>
  );
}
