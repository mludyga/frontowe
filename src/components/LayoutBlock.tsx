import type { JSX } from "react";

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
  bottomProfile?: {
    height: number;
  };

  /** Przestrzeń 2 – omega (najniżej) + wysięgi L/P */
  bottomOmega?: {
    height: number;
    extendLeft?: number;   // ile wystaje w lewo (mm)
    extendRight?: number;  // ile wystaje w prawo (mm)
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

  // przerwa BOTTOM (tylko przy ramie)
  if (withFrame) {
    const gBottom = gaps[gaps.length - 1] ?? 0;
    if (gBottom > 0) {
      // jeśli poniżej będą wsporniki/profil/omega – podnieś napis odrobinę
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

  // --- pionowe wzmocnienia wewnątrz korpusu ---
  if (withFrame && verticalBars.length > 0) {
    for (const xLeft of verticalBars) {
      // docinamy do obszaru korpusu (między lewą a prawą ramą)
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

  // === PRZESTRZEŃ 2 (pod korpusem, od góry: A -> profil -> omega) ===

  // 1) wsporniki A (krótkie, pod dolną ramą korpusu)
  if (hA > 0 && bottomSupports?.xs?.length) {
    const yTop = outerH * scale;           // start tuż pod korpusem
    const H = hA * scale;
    const W = frameT * scale;

    for (const raw of bottomSupports.xs) {
      // dla skrajnych: równo do pionów ramy (0 oraz outerW-frameT)
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

    // opis wysokości A
    elems.push(
      <text
        x={mm(outerW + 10)}
        y={mm(outerH) + H - 4}
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

  // 2) pełny profil pod wspornikami
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

  // 3) OMEGA (najniżej) z wysięgami
  if (hO > 0) {
    const y = (outerH + hA + hP) * scale;
    const extL = Math.max(0, bottomOmega?.extendLeft ?? 0);
    const extR = Math.max(0, bottomOmega?.extendRight ?? 0);

    // korpusowa część omegi
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
    // wysięg w lewo
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
    // wysięg w prawo
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

    // etykieta wysokości omegi
    elems.push(
      <text
        x={mm(outerW + 10)}
        y={mm(outerH + hA + hP) + mm(hO) - 4}
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

  // --- (opcjonalnie) szerokości świateł między pionami (krótki opis przy górnej ramie) ---
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

    segs.forEach(([a, b], i) => {
      const cx = (a + b) / 2;
      const text = `${(b - a).toFixed(0)} mm`;
      elems.push(
        <text
          x={mm(cx)}
          y={mm(6)} // tuż pod górną ramą
          fontSize={11}
          textAnchor="middle"
          style={{
            paintOrder: "stroke",
            stroke: "#fff",
            strokeWidth: 3,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {text}
        </text>
      );
    });
  }

  // --- OGON (wizualny) ---
  if (tailEnabled && hO > 0) {
    const extL = Math.max(0, bottomOmega?.extendLeft ?? 0);
    const extR = Math.max(0, bottomOmega?.extendRight ?? 0);
    const dir = tailSide === "right" ? 1 : -1;

    // podstawa ogona startuje na ZEWNĘTRZNEJ krawędzi omegi (z wysięgiem)
    const baseStartX =
      tailSide === "right" ? outerW + extR : 0 - extL;
    const baseY = outerH + hA + hP + hO; // dół omegi
    const baseLen = Math.max(outerH * tailVisBaseFrac, 0); // tylko wizual

    const baseEndX = baseStartX + dir * baseLen;

    // wierzchołek na górnej krawędzi ramy po stronie ogona
    const topX = tailSide === "right" ? outerW : 0;
    const topY = 0;

    // mały pionowy słupek ~ w połowie podstawy
    const postX = baseStartX + dir * baseLen * 0.5 - frameT / 2;
    const postH = Math.max(hA, 1); // taka sama wysokość jak wsporniki A (wizualnie)
    elems.push(
      <rect
        x={mm(postX)}
        y={mm(baseY - postH)}
        width={mm(frameT)}
        height={mm(postH)}
        fill={fillFrame}
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );

    // kontur ogona (trójkąt) + wewnętrzne przekątne
    const tailStroke = { fill: "none", stroke, vectorEffect: "non-scaling-stroke" } as any;

    // podstawa
    elems.push(
      <line x1={mm(baseStartX)} y1={mm(baseY)} x2={mm(baseEndX)} y2={mm(baseY)} {...tailStroke} />
    );
    // skos do górnej ramy
    elems.push(
      <line x1={mm(baseEndX)} y1={mm(baseY)} x2={mm(topX)} y2={mm(topY)} {...tailStroke} />
    );
    // wewnętrzny skos od początku podstawy do ~60% wysokości
    const innerX = baseStartX + dir * baseLen * 0.35;
    const innerY = outerH * 0.4; // tylko wizual
    elems.push(
      <line x1={mm(baseStartX)} y1={mm(baseY)} x2={mm(innerX)} y2={mm(innerY)} {...tailStroke} />
    );
    // skos od czubka słupka do ~3/4 wysokości przy ramie
    const nearFrameX = tailSide === "right" ? outerW - frameT * 0.5 : frameT * 0.5;
    const nearFrameY = outerH * 0.25;
    elems.push(
      <line x1={mm(postX + frameT / 2)} y1={mm(baseY - postH)} x2={mm(nearFrameX)} y2={mm(nearFrameY)} {...tailStroke} />
    );

    // Adnotacje (tylko teksty)
    const textStyle = {
      paintOrder: "stroke",
      stroke: "#fff",
      strokeWidth: 3,
      fontVariantNumeric: "tabular-nums",
    } as any;

    if (tailAnnBaseMM != null) {
      const cx = (baseStartX + baseEndX) / 2;
      elems.push(
        <text x={mm(cx)} y={mm(baseY) - 6} fontSize={11} textAnchor="middle" style={textStyle}>
          {`${tailAnnBaseMM} mm`}
        </text>
      );
    }
    if (tailAnnDiag1MM != null) {
      const cx = (baseEndX + topX) / 2;
      const cy = (baseY + topY) / 2;
      elems.push(
        <text x={mm(cx)} y={mm(cy) - 6} fontSize={11} textAnchor="middle" style={textStyle}>
          {`${tailAnnDiag1MM} mm`}
        </text>
      );
    }
    if (tailAnnDiag2MM != null) {
      const cx = (baseStartX + innerX) / 2;
      const cy = (baseY + innerY) / 2;
      elems.push(
        <text x={mm(cx)} y={mm(cy) - 6} fontSize={11} textAnchor="middle" style={textStyle}>
          {`${tailAnnDiag2MM} mm`}
        </text>
      );
    }
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
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
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
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
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
      {elems /* panele + przerwy + wzmocnienia + Przestrzeń 2 + ogon */}
      {frame /* rama na wierzchu */}
      {dims}
    </g>
  );
}
