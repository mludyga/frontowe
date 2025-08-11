import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";

/** Jednostki */
type Unit = "mm" | "cm" | "in";

/** Tryb przerw w przęśle */
type GapMode = "equal" | "custom";

/** Typ bramy */
type GateType = "none" | "skrzydłowa" | "przesuwna";

/** Wariant przesuwnych (wizualny) */
type SlidingVariant = "panelowa" | "konstrukcyjna";

/** Pozycja w sekcji dolnej */
type StackKind = "omega" | "profile" | "panel-fill" | "gap";

type StackItem = {
  id: string;
  kind: StackKind;
  h: number;           // wysokość w mm (dla gap też w mm)
  label?: string;      // np. "Omega 80"
};

/** Dane o „przerwach ręcznych” */
type CustomGap = { value: number | null; locked: boolean };

/** Wynik układu paneli/przerw dla elementu */
type ElementLayout = {
  panels: number[];      // panele (z przęsła)
  gapsTopMid: number[];  // top + mid przerwy nad sekcją dolną
  gapAboveBottom: number; // przerwa tuż nad sekcją dolną (po korekcie)
  bottomStack: StackItem[]; // realnie narysowane elementy dolne (gap/profile/omega/panel)
  error?: string;
};

/** Konfiguracja elementu (wspólna dla przęsła/bram/furtki) */
type ElementConfig = {
  width: number;
  height: number;
  frameAll: number;    // ta sama wartość na górę/dół/lewo/prawo
};

const unitFactorToMM: Record<Unit, number> = { mm: 1, cm: 10, in: 25.4 };
const toMM = (v: number, unit: Unit) => v * unitFactorToMM[unit];
const fromMM = (vmm: number, unit: Unit) => vmm / unitFactorToMM[unit];

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => n.toFixed(2);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const sumStack = (items: StackItem[]) => items.reduce((acc, it) => acc + it.h, 0);
const sumGapsOnlyInStack = (items: StackItem[]) =>
  items.filter(i => i.kind === "gap").reduce((a, b) => a + b.h, 0);
const sumSolidsInStack = (items: StackItem[]) =>
  items.filter(i => i.kind !== "gap").reduce((a, b) => a + b.h, 0);

const parseNumber = (raw: string) => {
  if (raw.trim() === "") return NaN;
  const v = Number(raw.replace(",", "."));
  return isFinite(v) ? v : NaN;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/** rozdzielanie AUTO przerw wg wag */
function distributeAuto(leftover: number, autos: number, weights?: number[]) {
  if (autos <= 0) return [];
  if (!weights || weights.length === 0) return Array(autos).fill(leftover / autos);
  const s = sum(weights);
  if (s <= 0) return Array(autos).fill(leftover / autos);
  return weights.map(w => (w / s) * leftover);
}

/** stałe rysunku */
const LABEL_COL_MM = 56;        // kolumna opisów po prawej
const MODULE_GUTTER_MM = 160;   // odstęp pomiędzy modułami
const TOP_MARGIN_MM = 52;       // nagłówek SVG

/** ===== RYSOWANIE BLOKU ===== */
type LayoutProps = {
  title: string;
  cfg: ElementConfig;
  scale: number;

  // właściwe panele + przerwy
  panelHeights: number[];
  topAndMidGaps: number[]; // [top, mid1, mid2, ...]
  gapAboveBottom: number;

  // sekcja dolna
  bottomStack: StackItem[];

  // wariant przesuwnych (rysunek)
  variant?: SlidingVariant;

  // czy to skrzydło lewe/prawe (do podpisów)
  sideLabel?: string;
};

function LayoutBlock({
  title, cfg, scale,
  panelHeights, topAndMidGaps, gapAboveBottom,
  bottomStack, variant, sideLabel
}: LayoutProps) {

  const { width: outerW, height: outerH, frameAll: frameT } = cfg;
  const x0 = 0;
  const y0 = 0;
  const stroke = "#333";
  const fillFrame = "#94a3b8";

  const leftFrame = frameT;
  const rightFrame = frameT;
  const topFrame = frameT;
  const bottomFrame = frameT;

  // pomocnik do prostokątów
  function rect(x: number, y: number, w: number, h: number, fill: string, s: string = "#333") {
    return (
      <rect
        x={x * scale}
        y={y * scale}
        width={w * scale}
        height={h * scale}
        fill={fill}
        stroke={s}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  // rama (krawędź zewnętrzna)
  const outerRect = (
    <rect
      x={x0 * scale}
      y={y0 * scale}
      width={(outerW + LABEL_COL_MM) * scale}
      height={outerH * scale}
      fill="none"
      stroke={stroke}
      vectorEffect="non-scaling-stroke"
    />
  );

  // lewa/prawa rama
  const sideFrames = (
    <>
      {rect(x0, y0, leftFrame, outerH, fillFrame)}
      {rect(x0 + outerW - rightFrame, y0, rightFrame, outerH, fillFrame)}
    </>
  );

  // górna/dolna rama
  // UWAGA: dolna rama idzie nad sekcją dolną – sekcja dolna „siedzi” w przestrzeni wewnętrznej
  const frameTopRect = rect(x0 + leftFrame, y0, outerW - leftFrame - rightFrame, topFrame, fillFrame);
  const frameBottomRect = rect(x0 + leftFrame, y0 + outerH - bottomFrame, outerW - leftFrame - rightFrame, bottomFrame, fillFrame);

  // rysunek wnętrza
  const elems: JSX.Element[] = [];

  // górna przerwa (nad panelem 1)
  if (topAndMidGaps.length > 0) {
    const gTop = Math.max(0, topAndMidGaps[0]);
    if (gTop > 0) {
      elems.push(
        <g key="top-gap">
          {rect(x0 + leftFrame, y0 + topFrame, outerW - leftFrame - rightFrame, gTop, "#f1f5f9", "#64748b")}
          <text
            x={(x0 + outerW) * scale + 10}
            y={(y0 + topFrame + gTop / 2) * scale}
            dominantBaseline="middle"
            fontSize={12}
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
          >
            {`${fmt(gTop)} mm`}
          </text>
        </g>
      );
    }
  }

  // panele + przerwy środkowe
  let cy = topFrame + (topAndMidGaps[0] ?? 0);
  for (let i = 0; i < panelHeights.length; i++) {
    const t = panelHeights[i];
    // panel
    elems.push(
      <g key={`p-${i}`}>
        {rect(x0 + leftFrame, y0 + cy, outerW - leftFrame - rightFrame, t, "#ddd")}
        <text
          x={(x0 + outerW) * scale + 10}
          y={(y0 + cy + t / 2) * scale}
          dominantBaseline="middle"
          fontSize={12}
          style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
        >
          {`${fmt(t)} mm`}
        </text>
      </g>
    );
    cy += t;

    // mid gap
    if (i < panelHeights.length - 1) {
      const g = Math.max(0, topAndMidGaps[i + 1] ?? 0);
      if (g > 0) {
        elems.push(
          <g key={`g-mid-${i}`}>
            {rect(x0 + leftFrame, y0 + cy, outerW - leftFrame - rightFrame, g, "#f1f5f9", "#64748b")}
            <text
              x={(x0 + outerW) * scale + 10}
              y={(y0 + cy + g / 2) * scale}
              dominantBaseline="middle"
              fontSize={12}
              style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
            >
              {`${fmt(g)} mm`}
            </text>
          </g>
        );
      }
      cy += g;
    }
  }

  // gap nad sekcją dolną
  if (gapAboveBottom > 0) {
    elems.push(
      <g key="gap-above-bottom">
        {rect(x0 + leftFrame, y0 + cy, outerW - leftFrame - rightFrame, gapAboveBottom, "#f1f5f9", "#64748b")}
        <text
          x={(x0 + outerW) * scale + 10}
          y={(y0 + cy + gapAboveBottom / 2) * scale}
          dominantBaseline="middle"
          fontSize={12}
          style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
        >
          {`${fmt(gapAboveBottom)} mm`}
        </text>
      </g>
    );
  }
  cy += gapAboveBottom;

  // sekcja dolna (klocki + przerwy)
  for (let i = 0; i < bottomStack.length; i++) {
    const it = bottomStack[i];
    const color = it.kind === "gap" ? "#f1f5f9" : "#e5e7eb";
    const strokeCol = it.kind === "gap" ? "#64748b" : "#333";
    const dash = it.kind === "gap" ? "4 3" : undefined;

    elems.push(
      <g key={`b-${it.id}`}>
        <rect
          x={(x0 + leftFrame) * scale}
          y={(y0 + cy) * scale}
          width={(outerW - leftFrame - rightFrame) * scale}
          height={(it.h) * scale}
          fill={color}
          stroke={strokeCol}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={dash}
        />
        <text
          x={(x0 + outerW) * scale + 10}
          y={(y0 + cy + it.h / 2) * scale}
          dominantBaseline="middle"
          fontSize={12}
          style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
        >
          {`${it.label ?? (it.kind === "gap" ? "przerwa" : it.kind)} ${fmt(it.h)} mm`}
        </text>
      </g>
    );
    cy += it.h;
  }

  // dekor „konstrukcyjny” dla przesuwnych (wizualny)
  const constructionLayer = variant === "konstrukcyjna" ? (
    <g opacity="0.5">
      {/* pionowe słupki: jeden przy ~1/2; dla szerszych można rozwinąć wg preferencji */}
      <line
        x1={(x0 + leftFrame + (outerW - leftFrame - rightFrame) / 2) * scale}
        y1={(y0 + topFrame) * scale}
        x2={(x0 + leftFrame + (outerW - leftFrame - rightFrame) / 2) * scale}
        y2={(y0 + outerH - bottomFrame) * scale}
        stroke="#666"
        vectorEffect="non-scaling-stroke"
      />
      {/* ukośne */}
      <line
        x1={(x0 + leftFrame + 8) * scale}
        y1={(y0 + outerH - bottomFrame - 8) * scale}
        x2={(x0 + outerW - rightFrame - 8) * scale}
        y2={(y0 + topFrame + 8) * scale}
        stroke="#666"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  ) : null;

  // wymiary
  const dims = (
    <g>
      {/* szerokość całkowita (wraz z bocznymi ramami) */}
      <line
        x1={0}
        y1={(outerH + 28) * scale}
        x2={(outerW + LABEL_COL_MM) * scale}
        y2={(outerH + 28) * scale}
        stroke="#333"
        markerEnd="url(#arrowhead)"
        markerStart="url(#arrowhead)"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={((outerW + LABEL_COL_MM) * scale) / 2}
        y={(outerH + 22) * scale}
        textAnchor="middle"
        fontSize={12}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`${fmt(outerW)} mm`}
      </text>

      {/* wysokość całkowita */}
      <line
        x1={(outerW + LABEL_COL_MM + 28) * scale}
        y1={0}
        x2={(outerW + LABEL_COL_MM + 28) * scale}
        y2={outerH * scale}
        stroke="#333"
        markerEnd="url(#arrowhead)"
        markerStart="url(#arrowhead)"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={(outerW + LABEL_COL_MM + 36) * scale}
        y={(outerH * scale) / 2}
        fontSize={12}
        transform={`rotate(90 ${(outerW + LABEL_COL_MM + 36) * scale} ${(outerH * scale) / 2})`}
        style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
      >
        {`${fmt(outerH)} mm`}
      </text>

      {/* tytuł */}
      <text x={0} y={-8} fontSize={14} fontWeight={600} style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>
        {title}{sideLabel ? ` – ${sideLabel}` : ""}
      </text>
    </g>
  );

  return (
    <g>
      {/* zawartość */}
      {elems}
      {/* rama nad zawartością */}
      {outerRect}
      {sideFrames}
      {frameTopRect}
      {frameBottomRect}
      {/* warstwa konstrukcyjna (opcjonalnie) */}
      {constructionLayer}
      {/* wymiary */}
      {dims}
    </g>
  );
}

/** ====== KOMPONENT EDYTORA SEKCJI DOLNEJ ====== */
type BottomStackEditorProps = {
  title: string;
  items: StackItem[];
  setItems: (next: StackItem[]) => void;
  presets?: ("omega+profile" | "clear")[];
};

function BottomStackEditor({ title, items, setItems, presets = ["omega+profile", "clear"] }: BottomStackEditorProps) {
  function add(kind: StackKind) {
    const defaults: Record<StackKind, number> = {
      omega: 80,
      profile: 80,
      "panel-fill": 100,
      gap: 10,
    };
    const labels: Record<StackKind, string> = {
      omega: "Omega",
      profile: "Profil 80×20",
      "panel-fill": "Panel uzupełniający",
      gap: "Przerwa",
    };
    setItems([...items, { id: uid(), kind, h: defaults[kind], label: labels[kind] }]);
  }
  function upd(id: string, h: number) {
    setItems(items.map(it => it.id === id ? { ...it, h } : it));
  }
  function del(id: string) {
    setItems(items.filter(it => it.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const [it] = next.splice(idx, 1);
    next.splice(j, 0, it);
    setItems(next);
  }
  function applyPreset(p: "omega+profile" | "clear") {
    if (p === "clear") setItems([]);
    else setItems([
      { id: uid(), kind: "omega", h: 80, label: "Omega" },
      { id: uid(), kind: "profile", h: 80, label: "Profil 80×20" },
    ]);
  }

  return (
    <div className="space-y-2 p-2 rounded border">
      <div className="font-medium">{title}</div>
      <div className="flex flex-wrap gap-2">
        <button className="px-2 py-1 border rounded" onClick={() => add("omega")}>+ Omega 80</button>
        <button className="px-2 py-1 border rounded" onClick={() => add("profile")}>+ Profil 80×20</button>
        <button className="px-2 py-1 border rounded" onClick={() => add("panel-fill")}>+ Panel uzupełniający</button>
        <button className="px-2 py-1 border rounded" onClick={() => add("gap")}>+ Przerwa</button>
        {presets.includes("omega+profile") && (
          <button className="px-2 py-1 border rounded" onClick={() => applyPreset("omega+profile")}>Preset (Omega + 80×20)</button>
        )}
        {presets.includes("clear") && (
          <button className="px-2 py-1 border rounded" onClick={() => applyPreset("clear")}>Wyczyść</button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-gray-500">Brak pozycji.</div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="grid grid-cols-[1fr_120px_120px_120px] gap-2 items-end">
              <div className="text-sm">
                {it.label ?? it.kind}
              </div>
              <label className="text-sm">
                Wysokość (mm)
                <input
                  type="number"
                  className="input"
                  value={it.h}
                  step={0.01}
                  onChange={(e) => upd(it.id, e.currentTarget.valueAsNumber || 0)}
                />
              </label>
              <div className="flex gap-1">
                <button className="px-2 py-1 border rounded" onClick={() => move(it.id, -1)}>↑</button>
                <button className="px-2 py-1 border rounded" onClick={() => move(it.id, +1)}>↓</button>
              </div>
              <button className="px-2 py-1 border rounded" onClick={() => del(it.id)}>Usuń</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** ====== APLIKACJA ====== */
export default function App() {
  /** Jednostki i przęsło */
  const [unit, setUnit] = useState<Unit>("mm");
  const [spanCfg, setSpanCfg] = useState<ElementConfig>({ width: 2000, height: 1200, frameAll: 60 });

  /** Panele (grupy uproszczone – jedna grupa jak u klienta w przykładach) */
  const [panelCount, setPanelCount] = useState(6);
  const [panelHeight, setPanelHeight] = useState(200);

  /** Przerwy przęsła */
  const [gapMode, setGapMode] = useState<GapMode>("equal");
  const nPanels = panelCount;
  const panelList = useMemo(() => Array.from({ length: Math.max(0, nPanels) }, () => panelHeight), [nPanels, panelHeight]);
  const sumPanels = useMemo(() => sum(panelList), [panelList]);

  const gapCountSpan = useMemo(() => (nPanels <= 0 ? 0 : (spanCfg.frameAll > 0 ? nPanels + 1 : Math.max(0, nPanels - 1))), [nPanels, spanCfg.frameAll]);
  const [customGaps, setCustomGaps] = useState<CustomGap[]>([]);
  useEffect(() => {
    setCustomGaps(prev => {
      if (prev.length === gapCountSpan) return prev;
      return Array.from({ length: gapCountSpan }, (_, i) => prev[i] ?? { value: null, locked: false });
    });
  }, [gapCountSpan]);

  const spanInternalHeight = useMemo(
    () => Math.max(0, spanCfg.height - 2 * spanCfg.frameAll),
    [spanCfg.height, spanCfg.frameAll]
  );

  const spanCalc = useMemo(() => {
    if (nPanels === 0) return { gaps: [] as number[], error: "Brak paneli" };
    if (sumPanels > spanInternalHeight + 1e-9) return { gaps: [], error: "Suma paneli > wysokość wewnętrzna przęsła" };

    if (gapMode === "equal") {
      const count = gapCountSpan;
      if (count === 0) return { gaps: [], error: "" };
      const g = (spanInternalHeight - sumPanels) / count;
      const rounded = round2(g);
      const gaps = Array(count).fill(rounded);
      const corr = round2(spanInternalHeight - sumPanels - sum(gaps));
      if (Math.abs(corr) >= 0.005) gaps[gaps.length - 1] = round2(gaps[gaps.length - 1] + corr);
      return { gaps, error: "" };
    }
    // custom
    const vec = Array.from({ length: gapCountSpan }, (_, i) => customGaps[i] ?? { value: null, locked: false });
    const fixed = sum(vec.map(v => (v.value != null ? v.value : 0)));
    const autos = vec.filter(v => v.value == null).length;
    const leftover = spanInternalHeight - sumPanels - fixed;
    if (leftover < -1e-6) return { gaps: [], error: "Za duże ręczne przerwy" };

    const autosVals = distributeAuto(leftover, autos);
    const out: number[] = [];
    let ap = 0;
    for (let i = 0; i < vec.length; i++) out.push(round2(vec[i].value == null ? autosVals[ap++] : vec[i].value!));
    const corr = round2(spanInternalHeight - sumPanels - sum(out));
    if (Math.abs(corr) >= 0.005) out[out.length - 1] = round2(out[out.length - 1] + corr);
    return { gaps: out, error: "" };
  }, [nPanels, sumPanels, spanInternalHeight, gapMode, gapCountSpan, customGaps]);

  const spanGaps = spanCalc.gaps;
  const spanGapError = spanCalc.error;

  const spanTopGap = spanCfg.frameAll > 0 ? (spanGaps[0] ?? 0) : (spanGaps[0] ?? 0);
  const spanMidGaps = useMemo(() => {
    const midCount = Math.max(0, nPanels - 1);
    return spanCfg.frameAll > 0 ? spanGaps.slice(1, 1 + midCount) : spanGaps.slice(0, midCount);
  }, [spanGaps, nPanels, spanCfg.frameAll]);

  /** Bramy i furtki */
  const [gateType, setGateType] = useState<GateType>("skrzydłowa");
  const [slidingVariant, setSlidingVariant] = useState<SlidingVariant>("panelowa");

  const [gateCfg, setGateCfg] = useState<ElementConfig>({ width: 4000, height: 1400, frameAll: 60 });
  const [wicketCfg, setWicketCfg] = useState<ElementConfig>({ width: 1000, height: 1400, frameAll: 60 });

  // sekcje dolne
  const [gateLeftStack, setGateLeftStack] = useState<StackItem[]>([]);
  const [gateRightStack, setGateRightStack] = useState<StackItem[]>([]);
  const [gateSlidingStack, setGateSlidingStack] = useState<StackItem[]>([
    { id: uid(), kind: "omega", h: 80, label: "Omega" },
    { id: uid(), kind: "profile", h: 80, label: "Profil 80×20" },
  ]);
  const [wicketStack, setWicketStack] = useState<StackItem[]>([]);

  /** Layout elementu na bazie przęsła + sekcji dolnej */
  function computeElementLayout(el: ElementConfig, bottom: StackItem[]): ElementLayout {
    if (nPanels === 0) return { panels: [], gapsTopMid: [], gapAboveBottom: 0, bottomStack: bottom, error: "Brak paneli przęsła" };
    const internal = Math.max(0, el.height - 2 * el.frameAll);
    const bottomSum = sumStack(bottom);
    const top = spanTopGap;
    const mids = [...spanMidGaps];
    const used = sumPanels + top + sum(mids) + bottomSum;

    const gapAbove = round2(internal - used);
    if (gapAbove < -1e-6) {
      return { panels: panelList, gapsTopMid: [top, ...mids], gapAboveBottom: 0, bottomStack: bottom, error: "Za mała wysokość dla wybranego układu (sekcja dolna + panele + przerwy)" };
    }
    return {
      panels: panelList,
      gapsTopMid: [round2(top), ...mids.map(round2)],
      gapAboveBottom: round2(gapAbove),
      bottomStack: bottom,
    };
  }

  const gateLeft = useMemo(() => {
    if (gateType !== "skrzydłowa") return null;
    return computeElementLayout({ ...gateCfg, width: gateCfg.width / 2 }, gateLeftStack);
  }, [gateType, gateCfg, gateLeftStack, spanTopGap, spanMidGaps, panelList]);

  const gateRight = useMemo(() => {
    if (gateType !== "skrzydłowa") return null;
    return computeElementLayout({ ...gateCfg, width: gateCfg.width / 2 }, gateRightStack);
  }, [gateType, gateCfg, gateRightStack, spanTopGap, spanMidGaps, panelList]);

  const gateSliding = useMemo(() => {
    if (gateType !== "przesuwna") return null;
    return computeElementLayout(gateCfg, gateSlidingStack);
  }, [gateType, gateCfg, gateSlidingStack, spanTopGap, spanMidGaps, panelList]);

  const wicket = useMemo(() => {
    if (gateType === "none") return null;
    return computeElementLayout(wicketCfg, wicketStack);
  }, [gateType, wicketCfg, wicketStack, spanTopGap, spanMidGaps, panelList]);

  /** Sumy do podsumowania (wysokości, do ramy itd.) */
  function totals(el: ElementConfig, layout: ElementLayout | null) {
    if (!layout) return null;
    const gapsTopMidSum = sum(layout.gapsTopMid);
    const gapsBottomStack = sumGapsOnlyInStack(layout.bottomStack);
    const bottomSolids = sumSolidsInStack(layout.bottomStack);

    const total = round2(sumPanels + gapsTopMidSum + layout.gapAboveBottom + gapsBottomStack + bottomSolids + 2 * el.frameAll);
    const doRamy = round2(el.height - sumStack(layout.bottomStack)); // bez sekcji dolnej
    return {
      panels: sumPanels,
      gapsTopMidSum,
      gapAbove: layout.gapAboveBottom,
      gapsBottomStack,
      bottomSolids,
      total,
      doRamy,
    };
  }

  const gateLeftTotals = totals({ ...gateCfg, width: gateCfg.width / 2 }, gateLeft);
  const gateRightTotals = totals({ ...gateCfg, width: gateCfg.width / 2 }, gateRight);
  const gateSlidingTotals = totals(gateCfg, gateSliding);
  const wicketTotals = totals(wicketCfg, wicket);

  /** SVG export/PNG export */
  const svgRef = useRef<SVGSVGElement | null>(null);
  const MM_TO_IN = 1 / 25.4;
  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function exportSVG() {
    if (!svgRef.current) return;
    const xml = new XMLSerializer().serializeToString(svgRef.current);
    downloadBlob("projekt-ogrodzenia.svg", new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  }
  function exportPNG(dpi = 300) {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const totalWmm = svg.width.baseVal.value / scale;
      const totalHmm = svg.height.baseVal.value / scale;
      const W = Math.round(totalWmm * MM_TO_IN * dpi);
      const H = Math.round(totalHmm * MM_TO_IN * dpi);
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(W / svg.width.baseVal.value, 0, 0, H / svg.height.baseVal.value, 0, 0);
      ctx.drawImage(img, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      canvas.toBlob(b => b && downloadBlob(`projekt-ogrodzenia-${dpi}dpi.png`, b), "image/png");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  /** Skala i nagłówek */
  const [scale, setScale] = useState(0.2);
  const [orderNo, setOrderNo] = useState("");

  const totalWidthMM = useMemo(() => {
    let w = spanCfg.width + LABEL_COL_MM;
    if (gateType !== "none") {
      w += MODULE_GUTTER_MM;
      if (gateType === "skrzydłowa") {
        w += gateCfg.width + 2 * LABEL_COL_MM + 10;
      } else {
        w += gateCfg.width + LABEL_COL_MM;
      }
      w += MODULE_GUTTER_MM;
      w += wicketCfg.width + LABEL_COL_MM;
    }
    return w + 60;
  }, [spanCfg.width, gateType, gateCfg.width, wicketCfg.width]);

  const maxHeightMM = useMemo(() => {
    let h = spanCfg.height;
    if (gateType !== "none") h = Math.max(h, gateCfg.height, wicketCfg.height);
    return h + TOP_MARGIN_MM + 60;
  }, [spanCfg.height, gateType, gateCfg.height, wicketCfg.height]);

  /** ===== RENDER ===== */
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Kalkulator ogrodzeń palisadowych – PRO</h1>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* KOLUMNA 1 – przęsło */}
        <div className="space-y-3 p-3 rounded-xl border">
          <div className="font-semibold">Przęsło</div>
          <div className="flex gap-2">
            {(["mm", "cm", "in"] as Unit[]).map(u => (
              <button key={u} onClick={() => setUnit(u)} className={`px-3 py-1 border rounded ${unit === u ? "bg-black text-white" : ""}`}>{u}</button>
            ))}
          </div>
          <label className="block">Szerokość ({unit})
            <input type="number" className="input" value={fromMM(spanCfg.width, unit)}
                   onChange={e => setSpanCfg({ ...spanCfg, width: toMM(e.currentTarget.valueAsNumber || 0, unit) })} />
          </label>
          <label className="block">Wysokość ({unit})
            <input type="number" className="input" value={fromMM(spanCfg.height, unit)}
                   onChange={e => setSpanCfg({ ...spanCfg, height: toMM(e.currentTarget.valueAsNumber || 0, unit) })} />
          </label>
          <label className="block">Rama (mm) – jednakowa góra/dół/lewo/prawo
            <div className="flex gap-2">
              {[40, 60, 80, 100].map(p => (
                <button key={p} className="px-2 py-1 border rounded" onClick={() => setSpanCfg({ ...spanCfg, frameAll: p })}>{p}</button>
              ))}
              <input type="number" className="input w-28" value={spanCfg.frameAll}
                     step={0.01}
                     onChange={e => setSpanCfg({ ...spanCfg, frameAll: e.currentTarget.valueAsNumber || 0 })} />
            </div>
          </label>

          <div className="font-semibold mt-2">Panele</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">Ilość
              <input type="number" className="input" value={panelCount} min={1}
                     onChange={e => setPanelCount(e.currentTarget.valueAsNumber || 0)} />
            </label>
            <label className="block">Wys. panelu (mm)
              <input type="number" className="input" value={panelHeight} min={1} step={0.01}
                     onChange={e => setPanelHeight(e.currentTarget.valueAsNumber || 0)} />
            </label>
          </div>

          <div className="font-semibold mt-2">Przerwy (przęsło)</div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2"><input type="radio" checked={gapMode === "equal"} onChange={() => setGapMode("equal")} /> Równe</label>
            <label className="flex items-center gap-2"><input type="radio" checked={gapMode === "custom"} onChange={() => setGapMode("custom")} /> Niestandardowe</label>
          </div>
          {gapMode === "custom" && (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: gapCountSpan }).map((_, i) => (
                <input
                  key={i}
                  className="input"
                  placeholder={`g${i + 1}`}
                  value={customGaps[i]?.value ?? ""}
                  onChange={(e) => {
                    const v = parseNumber(e.currentTarget.value);
                    setCustomGaps(prev => {
                      const next = [...prev];
                      next[i] = { value: isNaN(v) ? null : v, locked: !isNaN(v) };
                      return next;
                    });
                  }}
                />
              ))}
            </div>
          )}
          {spanGapError && <div className="text-red-600 text-sm">{spanGapError}</div>}
        </div>

        {/* KOLUMNA 2 – bramy i furtki */}
        <div className="space-y-3 p-3 rounded-xl border">
          <div className="font-semibold">Brama i furtka</div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2"><input type="radio" checked={gateType === "none"} onChange={() => setGateType("none")} /> Brak</label>
            <label className="flex items-center gap-2"><input type="radio" checked={gateType === "skrzydłowa"} onChange={() => setGateType("skrzydłowa")} /> Skrzydłowa</label>
            <label className="flex items-center gap-2"><input type="radio" checked={gateType === "przesuwna"} onChange={() => setGateType("przesuwna")} /> Przesuwna</label>
          </div>

          {/* BRAMA */}
          {gateType !== "none" && (
            <>
              <div className="font-medium mt-2">Brama</div>
              <label className="block">Szerokość ({unit})
                <input type="number" className="input" value={fromMM(gateCfg.width, unit)}
                       onChange={e => setGateCfg({ ...gateCfg, width: toMM(e.currentTarget.valueAsNumber || 0, unit) })} />
              </label>
              <label className="block">Wysokość ({unit})
                <input type="number" className="input" value={fromMM(gateCfg.height, unit)}
                       onChange={e => setGateCfg({ ...gateCfg, height: toMM(e.currentTarget.valueAsNumber || 0, unit) })} />
              </label>
              <label className="block">Rama (mm)
                <div className="flex gap-2">
                  {[40, 60, 80, 100].map(p => (
                    <button key={p} className="px-2 py-1 border rounded" onClick={() => setGateCfg({ ...gateCfg, frameAll: p })}>{p}</button>
                  ))}
                  <input type="number" className="input w-28" step={0.01} value={gateCfg.frameAll}
                         onChange={e => setGateCfg({ ...gateCfg, frameAll: e.currentTarget.valueAsNumber || 0 })} />
                </div>
              </label>

              {gateType === "przesuwna" && (
                <div className="flex items-center gap-4">
                  <span>Wariant: </span>
                  <label className="flex items-center gap-2"><input type="radio" checked={slidingVariant === "panelowa"} onChange={() => setSlidingVariant("panelowa")} /> Panelowa</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={slidingVariant === "konstrukcyjna"} onChange={() => setSlidingVariant("konstrukcyjna")} /> Konstrukcyjna</label>
                </div>
              )}
            </>
          )}

          {/* FURTKA */}
          {gateType !== "none" && (
            <>
              <div className="font-medium mt-4">Furtka</div>
              <label className="block">Szerokość ({unit})
                <input type="number" className="input" value={fromMM(wicketCfg.width, unit)}
                       onChange={e => setWicketCfg({ ...wicketCfg, width: toMM(e.currentTarget.valueAsNumber || 0, unit) })} />
              </label>
              <label className="block">Wysokość ({unit})
                <input type="number" className="input" value={fromMM(wicketCfg.height, unit)}
                       onChange={e => setWicketCfg({ ...wicketCfg, height: toMM(e.currentTarget.valueAsNumber || 0, unit) })} />
              </label>
              <label className="block">Rama (mm)
                <div className="flex gap-2">
                  {[40, 60, 80, 100].map(p => (
                    <button key={p} className="px-2 py-1 border rounded" onClick={() => setWicketCfg({ ...wicketCfg, frameAll: p })}>{p}</button>
                  ))}
                  <input type="number" className="input w-28" step={0.01} value={wicketCfg.frameAll}
                         onChange={e => setWicketCfg({ ...wicketCfg, frameAll: e.currentTarget.valueAsNumber || 0 })} />
                </div>
              </label>
            </>
          )}
        </div>

        {/* KOLUMNA 3 – podsumowanie */}
        <div className="space-y-2 p-3 rounded-xl border text-sm">
          <div className="font-semibold">Podsumowanie</div>

          <div className="font-medium mt-1">Przęsło</div>
          <div>Panele: <b>{fmt(sumPanels)} mm</b></div>
          <div>Przerwy (suma): <b>{fmt(sum(spanGaps))} mm</b></div>
          <div>Rama: <b>{fmt(2 * spanCfg.frameAll)} mm</b></div>
          <div>Suma: <b>{fmt(sumPanels + sum(spanGaps) + 2 * spanCfg.frameAll)} mm</b> (zadane: {fmt(spanCfg.height)} mm)</div>

          {gateType === "skrzydłowa" && (
            <>
              <div className="font-medium mt-3">Brama skrzydłowa</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="underline">Skrzydło L</div>
                  {gateLeftTotals ? (
                    <>
                      <div>Panele: <b>{fmt(gateLeftTotals.panels)} mm</b></div>
                      <div>Przerwy (top+mid+nad sekcją): <b>{fmt(gateLeftTotals.gapsTopMidSum + gateLeftTotals.gapAbove)} mm</b></div>
                      <div>Przerwy w sekcji dolnej: <b>{fmt(gateLeftTotals.gapsBottomStack)} mm</b></div>
                      <div>Omega/profil/panel: <b>{fmt(gateLeftTotals.bottomSolids)} mm</b></div>
                      <div>Rama: <b>{fmt(2 * gateCfg.frameAll)} mm</b></div>
                      <div>Suma: <b>{fmt(gateLeftTotals.total)} mm</b> (zadane: {fmt(gateCfg.height)} mm)</div>
                      <div>Wysokość do ramy: <b>{fmt(gateLeftTotals.doRamy)} mm</b></div>
                    </>
                  ) : <div>-</div>}
                </div>
                <div>
                  <div className="underline">Skrzydło P</div>
                  {gateRightTotals ? (
                    <>
                      <div>Panele: <b>{fmt(gateRightTotals.panels)} mm</b></div>
                      <div>Przerwy (top+mid+nad sekcją): <b>{fmt(gateRightTotals.gapsTopMidSum + gateRightTotals.gapAbove)} mm</b></div>
                      <div>Przerwy w sekcji dolnej: <b>{fmt(gateRightTotals.gapsBottomStack)} mm</b></div>
                      <div>Omega/profil/panel: <b>{fmt(gateRightTotals.bottomSolids)} mm</b></div>
                      <div>Rama: <b>{fmt(2 * gateCfg.frameAll)} mm</b></div>
                      <div>Suma: <b>{fmt(gateRightTotals.total)} mm</b> (zadane: {fmt(gateCfg.height)} mm)</div>
                      <div>Wysokość do ramy: <b>{fmt(gateRightTotals.doRamy)} mm</b></div>
                    </>
                  ) : <div>-</div>}
                </div>
              </div>
            </>
          )}

          {gateType === "przesuwna" && (
            <>
              <div className="font-medium mt-3">Brama przesuwna</div>
              {gateSlidingTotals ? (
                <>
                  <div>Panele: <b>{fmt(gateSlidingTotals.panels)} mm</b></div>
                  <div>Przerwy (top+mid+nad sekcją): <b>{fmt(gateSlidingTotals.gapsTopMidSum + gateSlidingTotals.gapAbove)} mm</b></div>
                  <div>Przerwy w sekcji dolnej: <b>{fmt(gateSlidingTotals.gapsBottomStack)} mm</b></div>
                  <div>Omega/profil/panel: <b>{fmt(gateSlidingTotals.bottomSolids)} mm</b></div>
                  <div>Rama: <b>{fmt(2 * gateCfg.frameAll)} mm</b></div>
                  <div>Suma: <b>{fmt(gateSlidingTotals.total)} mm</b> (zadane: {fmt(gateCfg.height)} mm)</div>
                  <div>Wysokość do ramy: <b>{fmt(gateSlidingTotals.doRamy)} mm</b></div>
                </>
              ) : <div>-</div>}
            </>
          )}

          {gateType !== "none" && (
            <>
              <div className="font-medium mt-3">Furtka</div>
              {wicketTotals ? (
                <>
                  <div>Panele: <b>{fmt(wicketTotals.panels)} mm</b></div>
                  <div>Przerwy (top+mid+nad sekcją): <b>{fmt(wicketTotals.gapsTopMidSum + wicketTotals.gapAbove)} mm</b></div>
                  <div>Przerwy w sekcji dolnej: <b>{fmt(wicketTotals.gapsBottomStack)} mm</b></div>
                  <div>Omega/profil/panel: <b>{fmt(wicketTotals.bottomSolids)} mm</b></div>
                  <div>Rama: <b>{fmt(2 * wicketCfg.frameAll)} mm</b></div>
                  <div>Suma: <b>{fmt(wicketTotals.total)} mm</b> (zadane: {fmt(wicketCfg.height)} mm)</div>
                  <div>Wysokość do ramy: <b>{fmt(wicketTotals.doRamy)} mm</b></div>
                </>
              ) : <div>-</div>}
            </>
          )}
        </div>
      </div>

      {/* Edytory sekcji dolnych */}
      {gateType === "skrzydłowa" && (
        <div className="grid md:grid-cols-2 gap-3">
          <BottomStackEditor title="Skrzydło L – sekcja dolna" items={gateLeftStack} setItems={setGateLeftStack} />
          <BottomStackEditor title="Skrzydło P – sekcja dolna" items={gateRightStack} setItems={setGateRightStack} />
        </div>
      )}
      {gateType === "przesuwna" && (
        <BottomStackEditor title="Brama przesuwna – sekcja dolna" items={gateSlidingStack} setItems={setGateSlidingStack} />
      )}
      {gateType !== "none" && (
        <BottomStackEditor title="Furtka – sekcja dolna" items={wicketStack} setItems={setWicketStack} />
      )}

      {/* Pasek eksportu */}
      <div className="p-3 rounded-xl border flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="block text-sm font-medium">Skala (px/mm – podgląd)</span>
          <input type="range" min={0.05} max={0.6} step={0.01} value={scale} onChange={e => setScale(e.currentTarget.valueAsNumber || 0.2)} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium">Nr zlecenia/oferty</span>
          <input type="text" className="input" value={orderNo} onChange={e => setOrderNo(e.currentTarget.value)} />
        </label>
        <div className="flex gap-2 ml-auto">
          <button className="px-3 py-2 rounded border" onClick={() => exportSVG()}>Pobierz SVG</button>
          <button className="px-3 py-2 rounded border" onClick={() => exportPNG(300)}>PNG 300 DPI</button>
          <button className="px-3 py-2 rounded border" onClick={() => exportPNG(150)}>PNG 150 DPI</button>
        </div>
      </div>

      {/* RYSUNEK */}
      <div className="p-3 rounded-xl border overflow-auto bg-white">
        <svg ref={svgRef} width={totalWidthMM * scale} height={maxHeightMM * scale}>
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L6,3 L0,6 z" fill="#333" />
            </marker>
          </defs>

          {/* NAGŁÓWEK */}
          <g>
            <text x={10} y={12} fontSize={12} fontWeight={600}>Nr zlecenia/oferty: {orderNo || "-"}</text>
            <text x={260} y={12} fontSize={12}>Skala podglądu: {scale.toFixed(2)} px/mm</text>
            <text x={10} y={24} fontSize={11}>
              {`Przęsło – panele: ${fmt(sumPanels)}; przerwy: ${fmt(sum(spanGaps))}; rama: ${fmt(2*spanCfg.frameAll)}; suma: ${fmt(sumPanels + sum(spanGaps) + 2*spanCfg.frameAll)} (zadane: ${fmt(spanCfg.height)})`}
            </text>
            {gateType === "skrzydłowa" && gateLeftTotals && gateRightTotals && (
              <>
                <text x={10} y={36} fontSize={11}>
                  {`Brama L – panele ${fmt(gateLeftTotals.panels)}, przerwy ${fmt(gateLeftTotals.gapsTopMidSum + gateLeftTotals.gapAbove + gateLeftTotals.gapsBottomStack)}, dodatki ${fmt(gateLeftTotals.bottomSolids)}, rama ${fmt(2*gateCfg.frameAll)}, suma ${fmt(gateLeftTotals.total)}, do ramy ${fmt(gateLeftTotals.doRamy)} (zadane: ${fmt(gateCfg.height)})`}
                </text>
                <text x={10} y={48} fontSize={11}>
                  {`Brama P – panele ${fmt(gateRightTotals.panels)}, przerwy ${fmt(gateRightTotals.gapsTopMidSum + gateRightTotals.gapAbove + gateRightTotals.gapsBottomStack)}, dodatki ${fmt(gateRightTotals.bottomSolids)}, rama ${fmt(2*gateCfg.frameAll)}, suma ${fmt(gateRightTotals.total)}, do ramy ${fmt(gateRightTotals.doRamy)} (zadane: ${fmt(gateCfg.height)})`}
                </text>
              </>
            )}
            {gateType === "przesuwna" && gateSlidingTotals && (
              <text x={10} y={36} fontSize={11}>
                {`Brama przesuwna – panele ${fmt(gateSlidingTotals.panels)}, przerwy ${fmt(gateSlidingTotals.gapsTopMidSum + gateSlidingTotals.gapAbove + gateSlidingTotals.gapsBottomStack)}, dodatki ${fmt(gateSlidingTotals.bottomSolids)}, rama ${fmt(2*gateCfg.frameAll)}, suma ${fmt(gateSlidingTotals.total)}, do ramy ${fmt(gateSlidingTotals.doRamy)} (zadane: ${fmt(gateCfg.height)})`}
              </text>
            )}
            {wicketTotals && (
              <text x={10} y={gateType === "none" ? 36 : 48} fontSize={11}>
                {`Furtka – panele ${fmt(wicketTotals.panels)}, przerwy ${fmt(wicketTotals.gapsTopMidSum + wicketTotals.gapAbove + wicketTotals.gapsBottomStack)}, dodatki ${fmt(wicketTotals.bottomSolids)}, rama ${fmt(2*wicketCfg.frameAll)}, suma ${fmt(wicketTotals.total)}, do ramy ${fmt(wicketTotals.doRamy)} (zadane: ${fmt(wicketCfg.height)})`}
              </text>
            )}
          </g>

          {/* PRZĘSŁO */}
          {(() => {
            const x = 10 * scale;
            const y = TOP_MARGIN_MM * scale;
            if (spanGapError) {
              return (
                <g transform={`translate(${x}, ${y})`}>
                  <rect x={0} y={0} width={(spanCfg.width + LABEL_COL_MM) * scale} height={spanCfg.height * scale} fill="#fff" stroke="#333" vectorEffect="non-scaling-stroke" opacity="0.6" />
                  <text x={0} y={-8} fill="#d00" fontSize={12} fontWeight={700}>{`Błąd: ${spanGapError}`}</text>
                </g>
              );
            }
            return (
              <g transform={`translate(${x}, ${y})`}>
                <LayoutBlock
                  title="Przęsło"
                  cfg={spanCfg}
                  scale={scale}
                  panelHeights={panelList}
                  topAndMidGaps={[spanTopGap, ...spanMidGaps]}
                  gapAboveBottom={0}
                  bottomStack={[]}
                />
              </g>
            );
          })()}

          {/* BRAMY + FURTKA */}
          {gateType !== "none" && (() => {
            const y = TOP_MARGIN_MM * scale;
            const xGate = (10 + spanCfg.width + LABEL_COL_MM + MODULE_GUTTER_MM) * scale;

            const gateBlock = gateType === "skrzydłowa"
              ? (
                <g transform={`translate(${xGate}, ${y})`}>
                  {gateLeft && (
                    <LayoutBlock
                      title="Brama skrzydłowa"
                      sideLabel="skrzydło L"
                      cfg={{ ...gateCfg, width: gateCfg.width / 2 }}
                      scale={scale}
                      panelHeights={gateLeft.panels}
                      topAndMidGaps={gateLeft.gapsTopMid}
                      gapAboveBottom={gateLeft.gapAboveBottom}
                      bottomStack={gateLeft.bottomStack}
                    />
                  )}
                  <g transform={`translate(${(gateCfg.width / 2 + 10) * scale}, 0)`}>
                    {gateRight && (
                      <LayoutBlock
                        title="Brama skrzydłowa"
                        sideLabel="skrzydło P"
                        cfg={{ ...gateCfg, width: gateCfg.width / 2 }}
                        scale={scale}
                        panelHeights={gateRight.panels}
                        topAndMidGaps={gateRight.gapsTopMid}
                        gapAboveBottom={gateRight.gapAboveBottom}
                        bottomStack={gateRight.bottomStack}
                      />
                    )}
                  </g>
                </g>
              )
              : (
                <g transform={`translate(${xGate}, ${y})`}>
                  {gateSliding && (
                    <LayoutBlock
                      title="Brama przesuwna"
                      cfg={gateCfg}
                      scale={scale}
                      panelHeights={gateSliding.panels}
                      topAndMidGaps={gateSliding.gapsTopMid}
                      gapAboveBottom={gateSliding.gapAboveBottom}
                      bottomStack={gateSliding.bottomStack}
                      variant={slidingVariant}
                    />
                  )}
                </g>
              );

            const gateWidthWithLabels = gateType === "skrzydłowa"
              ? gateCfg.width + 2 * LABEL_COL_MM + 10
              : gateCfg.width + LABEL_COL_MM;

            const xWicket = (
              10 + spanCfg.width + LABEL_COL_MM + MODULE_GUTTER_MM + gateWidthWithLabels + MODULE_GUTTER_MM
            ) * scale;

            const wicketBlock = wicket ? (
              <g transform={`translate(${xWicket}, ${y})`}>
                <LayoutBlock
                  title="Furtka"
                  cfg={wicketCfg}
                  scale={scale}
                  panelHeights={wicket.panels}
                  topAndMidGaps={wicket.gapsTopMid}
                  gapAboveBottom={wicket.gapAboveBottom}
                  bottomStack={wicket.bottomStack}
                />
              </g>
            ) : null;

            return (
              <g>
                {gateBlock}
                {wicketBlock}
              </g>
            );
          })()}
        </svg>
      </div>

      <div className="text-xs text-gray-500">
        * Obliczenia i korekty przerw do 0,01 mm. „Wysokość do ramy” = całkowita wysokość elementu bez sekcji dolnej (omega/profil/panel/przerwy).
      </div>
    </div>
  );
}
