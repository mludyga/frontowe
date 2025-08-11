import type { JSX } from "react";

export type LayoutProps = {
  title: string;
  outerW: number;            // szerokość ramy (bez wysięgów)
  outerH: number;            // wysokość do dolnej ramy
  withFrame: boolean;
  gaps: number[];            // [top, mid..., bottom] gdy withFrame; inaczej mid...
  panels: number[];          // wysokości paneli
  scale: number;
  frameVert: number;

  // pionowe wzmocnienia wewnątrz
  verticalBars?: number[];

  // krótkie wsporniki bezpośrednio pod dolną ramą (w obrębie szerokości bramy)
  bottomSupports?: { height: number; xs: number[] };

  // dodatkowy dolny profil na całą długość bramy (bez wysięgów)
  bottomProfile?: { height: number };

  // omega – najniżej, może mieć wysięgi L/R poza ramę
  omega?: { height: number; overhangL: number; overhangR: number };
};

// stałe kolumny etykiet
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
  omega,
}: LayoutProps) {
  const stroke = "#333";
  const fillFrame = "#94a3b8";

  // geometra bazowa
  const frameT = withFrame ? frameVert : 0;
  const innerX = frameT;
  const innerY = frameT;
  const innerW = Math.max(0, outerW - 2 * frameT);
  const innerH = Math.max(0, outerH - 2 * frameT);

  // warstwy poniżej dolnej ramy (od góry do dołu):
  // [ wsporniki ] -> [ profil ] -> [ omega ]
  const hSup   = bottomSupports?.height ?? 0;
  const hProf  = bottomProfile?.height ?? 0;
  const hOmega = omega?.height ?? 0;

  // całkowita wysokość modułu (do wymiarowania)
  const totalH = outerH + hSup + hProf + hOmega;

  // helper do prostokątów + etykiet
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

  // rama (4 strony) + obrys z kolumną etykiet
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
          {rect(0, 0, outerW, frameT, undefined, fillFrame)}
          {rect(0, outerH - frameT, outerW, frameT, undefined, fillFrame)}
          {rect(0, 0, frameT, outerH, undefined, fillFrame)}
          {rect(outerW - frameT, 0, frameT, outerH, undefined, fillFrame)}
        </>
      )}
    </g>
  );

  const elems: JSX.Element[] = [];

  // przerwa TOP (gdy z ramą)
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

  // przerwa BOTTOM (gdy z ramą) – lekko podnosimy etykietę jeśli są dolne warstwy
  if (withFrame) {
    const gBottom = gaps[gaps.length - 1] ?? 0;
    if (gBottom > 0) {
      const hasBelow = (hSup + hProf + hOmega) > 0;
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
            y={(cursorY + gBottom / 2) * scale - (hasBelow ? 8 : 0)}
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

  // wzmocnienia pionowe
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

  // === DÓŁ: OMEGA + PROFIL + WSPORNIKI ===
  // RYSUJEMY OD NAJNIŻSZEGO DO NAJWYŻSZEGO, a wsporniki na końcu, by były "na wierzchu"

  // omega (najniżej, może wystawać L/R)
  if (omega && omega.height > 0) {
    const x = -Math.max(0, omega.overhangL) * scale;
    const w = (outerW + Math.max(0, omega.overhangL) + Math.max(0, omega.overhangR)) * scale;
    const y = (outerH + hSup + hProf) * scale;
    const h = omega.height * scale;
    elems.push(
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="#74849c"
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  // profil (na pełną szerokość bramy)
  if (bottomProfile && bottomProfile.height > 0) {
    const y = (outerH + hSup) * scale;
    elems.push(
      <rect
        x={0}
        y={y}
        width={outerW * scale}
        height={bottomProfile.height * scale}
        fill="#8ea0b8"
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  // wsporniki — na końcu (nad profilem i omegą)
  if (withFrame && bottomSupports && bottomSupports.height > 0 && bottomSupports.xs.length > 0) {
    const y = outerH * scale;
    const H = bottomSupports.height * scale;
    const W = frameVert * scale;
    for (const xLeft of bottomSupports.xs) {
      const clampedX = Math.max(0, Math.min(outerW - frameVert, xLeft)); // równo z lewą/prawą ramą
      elems.push(
        <rect
          x={clampedX * scale}
          y={y}
          width={W}
          height={H}
          fill="#94a3b8"
          stroke={stroke}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
  }

  // etykiety warstw dolnych (pod modułem, po prawej)
  const labelX = (outerW + 10) * scale;
  let labelRow = 0;
  const pushLayerLabel = (txt: string) => {
    elems.push(
      <text
        x={labelX}
        y={(outerH + 12 + 12 * labelRow) * scale}
        fontSize={12}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {txt}
      </text>
    );
    labelRow += 1;
  };
  if (bottomSupports && bottomSupports.height > 0) pushLayerLabel(`A: ${bottomSupports.height.toFixed(2)} mm`);
  if (bottomProfile && bottomProfile.height > 0)   pushLayerLabel(`B: ${bottomProfile.height.toFixed(2)} mm`);
  if (omega && omega.height > 0)                   pushLayerLabel(`Ω: ${omega.height.toFixed(2)} mm`);

  // wymiary całkowite (z dolnymi warstwami)
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
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
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
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
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
      {elems}
      {frame}
      {dims}
    </g>
  );
}
