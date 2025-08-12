import React from 'react';
import type { TailManualLabels } from '../types/tail';

type Props = {
  side: 'left' | 'right';
  outerW: number;      // mm
  outerH: number;      // mm
  frameVert: number;   // mm (grubość profilu = grubość ramy)
  scale: number;       // px/mm
  baseLen: number;     // mm (długość podstawy ogona w podglądzie)
  labels?: TailManualLabels;
};

export default function TailManual({
  side, outerW, outerH, frameVert, scale, baseLen, labels = {},
}: Props) {
  const tPx = frameVert * scale;
  const Hpx = outerH * scale;

  // punkt zaczepienia do korpusu bramy (dolny narożnik przy ramie)
  const xAttach = (side === 'left' ? 0 : outerW) * scale;
  const yBase = Hpx - tPx / 2;     // środek linii podstawy (przy dolnej ramie)
  const dir = side === 'left' ? -1 : 1;

  const baseLenPx = baseLen * scale;
  const xFar = xAttach + dir * baseLenPx;

  // pomocnicze punkty (lekko „umowne”, zgodne ze szkicem)
  const yTop = tPx / 2;                        // górny poziom (tu kończy się duża przekątna)
  const ySupportTop = Hpx - tPx * 2.6;         // wyjście wspornika na pion
  const xSupportStart = xAttach + dir * (baseLenPx * 0.35); // początek wspornika na podstawie

  const textStyle: React.CSSProperties = {
    paintOrder: 'stroke',
    stroke: '#fff',
    strokeWidth: 3,
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <g>
      {/* PODSTAWA */}
      <line
        x1={xAttach} y1={yBase}
        x2={xFar}    y2={yBase}
        stroke="#333" strokeWidth={tPx} strokeLinecap="square"
      />

      {/* PION na końcu ogona */}
      <line
        x1={xFar} y1={yTop}
        x2={xFar} y2={Hpx - yTop}
        stroke="#333" strokeWidth={tPx} strokeLinecap="square"
      />

      {/* PRZEKĄTNA (duża) od narożnika bramy do wierzchołka pionu */}
      <line
        x1={xAttach} y1={yBase}
        x2={xFar}    y2={yTop}
        stroke="#333" strokeWidth={tPx} strokeLinecap="square"
      />

      {/* WSPORNIK (mniejsza przekątna) od podstawy do pionu, niżej */}
      <line
        x1={xSupportStart} y1={Hpx - tPx * 1.2}
        x2={xFar}          y2={ySupportTop}
        stroke="#333" strokeWidth={tPx} strokeLinecap="square"
      />

      {/* Etykiety — tylko jeśli są wpisane */}
      {labels.base && (
        <text x={(xAttach + xFar) / 2} y={yBase - 6} fontSize={11} textAnchor="middle" style={textStyle}>
          {labels.base}
        </text>
      )}
      {labels.vertical && (
        <text x={xFar + dir * (tPx * 0.8)} y={Hpx / 2} fontSize={11} textAnchor={side === 'left' ? 'end' : 'start'} style={textStyle}>
          {labels.vertical}
        </text>
      )}
      {labels.diagonal && (
        <text x={xAttach + dir * (baseLenPx * 0.55)} y={(yBase + yTop) / 2 - 6} fontSize={11} textAnchor={side === 'left' ? 'end' : 'start'} style={textStyle}>
          {labels.diagonal}
        </text>
      )}
      {labels.support && (
        <text x={xSupportStart + dir * (baseLenPx * 0.25)} y={(Hpx - tPx * 1.2 + ySupportTop) / 2 - 6} fontSize={11} textAnchor={side === 'left' ? 'end' : 'start'} style={textStyle}>
          {labels.support}
        </text>
      )}
      {labels.omega && (
        <text x={xFar - dir * (tPx * 1.4)} y={Hpx - tPx * 0.4} fontSize={11} textAnchor={side === 'left' ? 'start' : 'end'} style={textStyle}>
          {labels.omega}
        </text>
      )}
    </g>
  );
}
