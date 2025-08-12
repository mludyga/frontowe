import type { JSX } from "react";

export type LayoutProps = {
  title: string;
  outerW: number;
  outerH: number;
  withFrame: boolean;
  gaps: number[];
  panels: number[];
  scale: number;
  frameVert: number;
  verticalBars?: number[];

  // Przestrzeń 2
  bottomSupports?: { height: number; xs: number[] };
  bottomProfile?: { height: number };
  bottomOmega?: { height: number; extendLeft?: number; extendRight?: number };

  // Wymiary profili w podsumowaniu (włącz/wyłącz)
  showProfileWidths?: boolean;

  // OGON – rysunek symboliczny (nie wymiarujemy geometrii, tylko wygląd + opisy)
  tailEnabled?: boolean;
  tailSide?: "left" | "right";                 // domyślnie 'right'
  tailVisBaseFrac?: number;                    // jaka część wysięgu omegi ma być rysowana (0..1, domyślnie 1)
  tailAnn?: { base?: number; diag1?: number; diag2?: number }; // opisy (mm) wpisywane ręcznie
};

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
  showProfileWidths = false,   // <— to zostaw
  tailEnabled = false,
  tailSide = "right",
  tailVisBaseFrac = 1,
  tailAnn,
  
}: LayoutProps) {
  const stroke = "#333";
  const fillFrame = "#94a3b8";

  // ramy / wnętrze
  const frameT = withFrame ? frameVert : 0;
  const innerX = frameT;
  const innerY = frameT;
  const innerW = Math.max(0, outerW - 2 * frameT);
  const innerH = Math.max(0, outerH - 2 * frameT);

  // Pas pod ramą (A + profil + omega)
  const A = bottomSupports?.height ?? 0;
  const P = bottomProfile?.height ?? 0;
  const OM = bottomOmega?.height ?? 0;
  const totalH = outerH + A + P + OM;

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

  // Rama
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

  // Górna przerwa
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

  // Panele + przerwy środkowe
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

  // Dolna przerwa
  if (withFrame) {
    const gBottom = gaps[gaps.length - 1] ?? 0;
    if (gBottom > 0) {
      const hasBottom = (A > 0) || (P > 0) || (OM > 0);
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
            y={(cursorY + gBottom / 2) * scale - (hasBottom ? 8 : 0)}
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

  // pionowe wzmocnienia
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

  // PRZESTRZEŃ 2 – wsporniki
  if (withFrame && bottomSupports && bottomSupports.height > 0 && bottomSupports.xs.length > 0) {
    const h = bottomSupports.height;
    const y = outerH * scale;
    const H = h * scale;
    const W = frameT * scale;

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

    // opis A (przesunięty poniżej pasa)
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
        {`A: ${h.toFixed(2)} mm`}
      </text>
    );
  }

  // PRZESTRZEŃ 2 – profil pełny
  if (bottomProfile && bottomProfile.height > 0) {
    elems.push(
      <rect
        x={0}
        y={(outerH + A) * scale}
        width={outerW * scale}
        height={bottomProfile.height * scale}
        fill="#cbd5e1"
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  // PRZESTRZEŃ 2 – omega
  const extendLeft = bottomOmega?.extendLeft ?? 0;
  const extendRight = bottomOmega?.extendRight ?? 0;
  if (bottomOmega && bottomOmega.height > 0) {
    const baseY = (outerH + A + P) * scale;
    // sama omega pod modułem
    elems.push(
      <rect
        x={0}
        y={baseY}
        width={outerW * scale}
        height={bottomOmega.height * scale}
        fill="#94a3b8"
        stroke={stroke}
        vectorEffect="non-scaling-stroke"
      />
    );
    // wysięgi omegi na zewnątrz
    if (extendLeft > 0) {
      elems.push(
        <rect
          x={(0 - extendLeft) * scale}
          y={(outerH + A + P + OM - bottomOmega.height) * scale}
          width={extendLeft * scale}
          height={bottomOmega.height * scale}
          fill="#94a3b8"
          stroke={stroke}
        />
      );
    }
    if (extendRight > 0) {
      elems.push(
        <rect
          x={outerW * scale}
          y={(outerH + A + P + OM - bottomOmega.height) * scale}
          width={extendRight * scale}
          height={bottomOmega.height * scale}
          fill="#94a3b8"
          stroke={stroke}
        />
      );
    }
    // opis omegi
    elems.push(
      <text
        x={(outerW + 10) * scale}
        y={(outerH + A + P + OM - 2) * scale}
        fontSize={12}
        style={{
          paintOrder: "stroke",
          stroke: "#fff",
          strokeWidth: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`Ω: ${bottomOmega.height.toFixed(2)} mm`}
      </text>
    );
  }

  // OGON – grubość = grubość ramy; rysunek symboliczny
  if (tailEnabled && bottomOmega) {
    const baseYmm = outerH + A + P + OM;                   // spód (po omegach)
    const baseY = baseYmm * scale;
    const tW = frameT * scale;                             // grubość = grubość ramy
    const visLen =
      (tailSide === "right" ? extendRight : extendLeft) * Math.max(0, Math.min(1, tailVisBaseFrac));

    if (visLen > 0) {
      if (tailSide === "right") {
        // podstawa
        elems.push(
          <line x1={outerW * scale} y1={baseY} x2={(outerW + visLen) * scale} y2={baseY}
            stroke={stroke} strokeWidth={tW} />
        );
        // długi skos do prawego-górnego narożnika
        elems.push(
          <line x1={outerW * scale} y1={0 + tW / 2} x2={(outerW + visLen) * scale} y2={baseY}
            stroke={stroke} strokeWidth={tW} />
        );
        // krótki skos od połowy podstawy do ~3/4 wysokości
        elems.push(
          <line x1={(outerW + visLen * 0.5) * scale} y1={baseY}
            x2={outerW * scale} y2={(outerH * 0.25) * scale}
            stroke={stroke} strokeWidth={tW} />
        );
        // krótki pion wspornika w połowie wysięgu (wysokość = A)
        if (A > 0) {
          elems.push(
            <line
              x1={(outerW + visLen * 0.5) * scale}
              y1={baseY}
              x2={(outerW + visLen * 0.5) * scale}
              y2={(baseYmm - A) * scale}
              stroke={stroke}
              strokeWidth={tW}
            />
          );
        }
        // opisy (wpisywane ręcznie)
        if (tailAnn?.base != null) {
          elems.push(
            <text x={(outerW + visLen * 0.5) * scale} y={(baseYmm + 8) * scale}
              fontSize={11} textAnchor="middle"
              style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}>
              {`${tailAnn.base} mm`}
            </text>
          );
        }
        if (tailAnn?.diag1 != null) {
          elems.push(
            <text x={(outerW + visLen * 0.7) * scale} y={(baseYmm - outerH * 0.35) * scale}
              fontSize={11}
              style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}>
              {`${tailAnn.diag1} mm`}
            </text>
          );
        }
        if (tailAnn?.diag2 != null) {
          elems.push(
            <text x={(outerW + visLen * 0.35) * scale} y={(baseYmm - outerH * 0.25) * scale}
              fontSize={11}
              style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}>
              {`${tailAnn.diag2} mm`}
            </text>
          );
        }
      } else {
        // LEWY ogon – lustrzane odbicie
        elems.push(
          <line x1={0} y1={baseY} x2={(-visLen) * scale} y2={baseY}
            stroke={stroke} strokeWidth={tW} />
        );
        elems.push(
          <line x1={0} y1={0 + tW / 2} x2={(-visLen) * scale} y2={baseY}
            stroke={stroke} strokeWidth={tW} />
        );
        elems.push(
          <line x1={(-visLen * 0.5) * scale} y1={baseY}
            x2={0} y2={(outerH * 0.25) * scale}
            stroke={stroke} strokeWidth={tW} />
        );
        if (A > 0) {
          elems.push(
            <line
              x1={(-visLen * 0.5) * scale}
              y1={baseY}
              x2={(-visLen * 0.5) * scale}
              y2={(baseYmm - A) * scale}
              stroke={stroke}
              strokeWidth={tW}
            />
          );
        }
        if (tailAnn?.base != null) {
          elems.push(
            <text x={(-visLen * 0.5) * scale} y={(baseYmm + 8) * scale}
              fontSize={11} textAnchor="middle"
              style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}>
              {`${tailAnn.base} mm`}
            </text>
          );
        }
        if (tailAnn?.diag1 != null) {
          elems.push(
            <text x={(-visLen * 0.7) * scale} y={(baseYmm - outerH * 0.35) * scale}
              fontSize={11}
              style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}>
              {`${tailAnn.diag1} mm`}
            </text>
          );
        }
        if (tailAnn?.diag2 != null) {
          elems.push(
            <text x={(-visLen * 0.35) * scale} y={(baseYmm - outerH * 0.25) * scale}
              fontSize={11}
              style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}>
              {`${tailAnn.diag2} mm`}
            </text>
          );
        }
      }
    }
  }

  // Wymiary całkowite
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
      {elems}
      {frame}
      {dims}
    </g>
  );
}
