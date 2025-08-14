import type { TailManualLabels } from "../types/tail";

export type TailManualProps = {
  outerW: number;
  outerH: number;
  frameT: number;
  hA: number;
  hP: number;
  hO: number;
  scale: number;
  side: "left" | "right";
  labels?: TailManualLabels | undefined;
};

export default function TailManual({
  outerW,
  outerH,
  frameT,
  hA,
  hP,
  hO,
  scale,
  side,
  labels,
}: TailManualProps) {
  const mm = (v: number) => v * scale;
  const textStyle = {
    paintOrder: "stroke",
    stroke: "#fff",
    strokeWidth: 3,
    fontVariantNumeric: "tabular-nums",
  } as const;

  // pomocnicze pozycje
  const baseY = outerH + hA + hP + hO; // dół omegi
  const omegaY = outerH + hA + hP;     // góra omegi
  const supportY = outerH + hA;        // górna krawędź profilu pod wspornikami (jeśli jest)
  const sideX = side === "right" ? outerW + 8 : -8;
  const anchor = side === "right" ? "start" : "end";

  return (
    <g>
      {/* proste etykiety – czysty tekst, nic nie zakrywa wymiarów */}
      {labels?.base && (
        <text x={mm(sideX)} y={mm(baseY) - 6} textAnchor={anchor} fontSize={11} style={textStyle}>
          {labels.base}
        </text>
      )}
      {labels?.omega && (
        <text x={mm(sideX)} y={mm(omegaY) - 6} textAnchor={anchor} fontSize={11} style={textStyle}>
          {labels.omega}
        </text>
      )}
      {labels?.support && (
        <text x={mm(sideX)} y={mm(supportY) - 6} textAnchor={anchor} fontSize={11} style={textStyle}>
          {labels.support}
        </text>
      )}
      {labels?.vertical && (
        <text x={mm(side === "right" ? outerW - frameT : frameT)} y={mm(outerH * 0.15)} textAnchor="middle" fontSize={11} style={textStyle}>
          {labels.vertical}
        </text>
      )}
      {labels?.diagonal && (
        <text x={mm(outerW)} y={mm(outerH * 0.4)} textAnchor={anchor} fontSize={11} style={textStyle}>
          {labels.diagonal}
        </text>
      )}
    </g>
  );
}
