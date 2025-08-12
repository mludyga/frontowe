import { useEffect, useMemo, useRef, useState } from "react";
import LayoutBlock, { LABEL_COL_MM } from "./components/LayoutBlock";
import { toMM, fromMM, type Unit } from "./utils/units";
import { round2, fmt2 } from "./utils/math";
import type { TailMode, TailManualLabels } from './types/tail';

// Typy pomocnicze
type PanelGroup = { qty: number; t: number; inGate?: boolean };
type GapMode = "equal" | "custom";
type GateType = "none" | "skrzydłowa" | "przesuwna";
type CustomGap = { value: number | null; locked: boolean };
type GateLayout = { panels: number[]; gaps: number[]; error?: string };

// Utils
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const parseNumber = (raw: string) => {
  if (raw.trim() === "") return NaN;
  const v = Number(raw.replace(",", "."));
  return isFinite(v) ? v : NaN;
};
function distributeAutoGaps(leftover: number, autos: number, weights?: number[]): number[] {
  if (autos <= 0) return [];
  if (!weights || weights.length === 0) return Array(autos).fill(leftover / autos);
  const wsum = sum(weights);
  if (wsum <= 0) return Array(autos).fill(leftover / autos);
  return weights.map((w) => (w / wsum) * leftover);
}

// Szerokości profili (światła między pionami)
function computeProfileWidths(outerW: number, frameVert: number, verticalBars: number[] = []) {
  const frameT = frameVert;
  const leftIn = frameT;
  const rightIn = outerW - frameT;

  const bars = verticalBars
    .map((x) => Math.max(frameT, Math.min(outerW - frameT - frameT, x)))
    .sort((a, b) => a - b);

  const segs: Array<[number, number]> = [];
  let start = leftIn;
  for (const xLeft of bars) {
    const end = Math.min(xLeft, rightIn);
    if (end > start) segs.push([start, end]);
    start = Math.min(xLeft + frameT, rightIn);
  }
  if (rightIn > start) segs.push([start, rightIn]);
  if (segs.length === 0) segs.push([leftIn, rightIn]);

  return segs.map(([a, b]) => +(b - a).toFixed(2));
}


// Stałe layoutu
const MODULE_GUTTER_MM = 180;
const TOP_MARGIN_MM = 446;

export default function App() {
   [unit, setUnit] = useState<Unit>("mm");

  // PRZĘSŁO
   [spanWidth, setSpanWidth] = useState<number>(2000);
   [spanHeight, setSpanHeight] = useState<number>(1200);
   [hasFrame, setHasFrame] = useState<boolean>(false);
   [frameVert, setFrameVert] = useState<number>(60);

  // Grupy paneli przęsła
   [groups, setGroups] = useState<PanelGroup[]>([{ qty: 6, t: 100, inGate: true }]);
   [gapMode, setGapMode] = useState<GapMode>("equal");
   [weightedAuto, setWeightedAuto] = useState<boolean>(false);
   [customGaps, setCustomGaps] = useState<CustomGap[]>([]);

  // BRAMA + FURTKA
   [gateType, setGateType] = useState<GateType>("none");
   [gateWidth, setGateWidth] = useState<number>(4000);
   [gateHeight, setGateHeight] = useState<number>(1400);
   [gateEqualBays, setGateEqualBays] = useState<boolean>(true); // równe światła dla przesuwnej

  // Pokazywanie furtki
   [showWicket, setShowWicket] = useState<boolean>(true);

  // Przestrzeń 2 – BRAMA
   [gateBottomEnabled, setGateBottomEnabled] = useState<boolean>(false);
  const [gateBottomSupportH, setGateBottomSupportH] = useState<number>(80);
  const [gateBottomExtraPerSpan, setGateBottomExtraPerSpan] = useState<number>(0);

  const [gateBottomProfileEnabled, setGateBottomProfileEnabled] = useState<boolean>(false);
  const [gateBottomProfileH, setGateBottomProfileH] = useState<number>(0);

  const [gateOmegaEnabled, setGateOmegaEnabled] = useState<boolean>(true);
  const [gateOmegaH, setGateOmegaH] = useState<number>(80);
  const [gateOmegaExtLeft, setGateOmegaExtLeft] = useState<number>(0);
  const [gateOmegaExtRight, setGateOmegaExtRight] = useState<number>(0);

  // OGON – tylko brama przesuwna (wizualny)
  const [tailEnabled, setTailEnabled] = useState<boolean>(false);
  const [tailSide, setTailSide] = useState<"left" | "right">("right");
  const [tailVisBaseFrac, setTailVisBaseFrac] = useState<number>(0.8);
  const [tailAnnBaseMM, setTailAnnBaseMM] = useState<number | null>(null);
  const [tailAnnDiag1MM, setTailAnnDiag1MM] = useState<number | null>(null);
  const [tailAnnDiag2MM, setTailAnnDiag2MM] = useState<number | null>(null);
  const [tailMode, setTailMode] = useState<TailMode>('auto'); // przełącznik manual/auto
  const [tailLabels, setTailLabels] = useState<TailManualLabels>({
  vertical: '',
  diagonal: '',
  base: '',
  omega: '',
  support: '',
});
  const updateTailLabel = (key: keyof TailManualLabels, val: string) =>
  setTailLabels((s) => ({ ...s, [key]: val }));

  // FURTKA
  const [wicketWidth, setWicketWidth] = useState<number>(1000);
  const [wicketHeight, setWicketHeight] = useState<number>(1400);

  // FURTKA – Przestrzeń 2 (bez wysięgów poziomych)
  const [wicketBottomEnabled, setWicketBottomEnabled] = useState<boolean>(false);
  const [wicketBottomSupportH, setWicketBottomSupportH] = useState<number>(80);
  const [wicketBottomExtraPerSpan, setWicketBottomExtraPerSpan] = useState<number>(0);

  const [wicketBottomProfileEnabled, setWicketBottomProfileEnabled] = useState<boolean>(false);
  const [wicketBottomProfileH, setWicketBottomProfileH] = useState<number>(0);

  const [wicketOmegaEnabled, setWicketOmegaEnabled] = useState<boolean>(false);
  const [wicketOmegaH, setWicketOmegaH] = useState<number>(80);

  // Dodatkowe panele – BRAMA / FURTKA
  const [gateExtraPanels, setGateExtraPanels] = useState<number[]>([]);
  const [gateGapAfterBase, setGateGapAfterBase] = useState<number>(0);
  const [gateGapBetweenExtras, setGateGapBetweenExtras] = useState<number>(0);

  const [wicketExtraPanels, setWicketExtraPanels] = useState<number[]>([]);
  const [wicketGapAfterBase, setWicketGapAfterBase] = useState<number>(0);
  const [wicketGapBetweenExtras, setWicketGapBetweenExtras] = useState<number>(0);

  // UX
  const [orderNo, setOrderNo] = useState<string>("");
  const [scale, setScale] = useState<number>(0.2);

  // listy paneli dla przęsła
  const panelList = useMemo(() => {
    const arr: number[] = [];
    for (const g of groups) for (let i = 0; i < g.qty; i++) arr.push(g.t);
    return arr;
  }, [groups]);

  const includeMask = useMemo(() => {
    const mask: boolean[] = [];
    for (const g of groups) {
      const inc = g.inGate !== false;
      for (let i = 0; i < g.qty; i++) mask.push(inc);
    }
    return mask;
  }, [groups]);

  const panelsForGate = useMemo(() => {
    const arr: number[] = [];
    for (const g of groups) {
      if (g.inGate === false) continue;
      for (let i = 0; i < g.qty; i++) arr.push(g.t);
    }
    return arr;
  }, [groups]);

  const nPanels = panelList.length;
  const sumPanels = useMemo(() => sum(panelList), [panelList]);

  // wysokość wewnętrzna przęsła
  const spanInternalHeight = useMemo(
    () => (hasFrame ? Math.max(0, spanHeight - 2 * frameVert) : spanHeight),
    [hasFrame, spanHeight, frameVert]
  );

  // ile przerw w przęśle
  const gapCountSpan = useMemo(() => {
    if (nPanels <= 0) return 0;
    return hasFrame ? nPanels + 1 : Math.max(0, nPanels - 1);
  }, [nPanels, hasFrame]);

  const baseError: string | null = useMemo(() => {
    if (nPanels === 0) return "Dodaj przynajmniej jeden panel";
    if (sumPanels > spanInternalHeight + 1e-6) return "Suma wysokości paneli przekracza wysokość przęsła";
    return null;
  }, [nPanels, sumPanels, spanInternalHeight]);

  // zsynchronizuj wektor przerw custom
  useEffect(() => {
    setCustomGaps((prev) => {
      const expected = gapCountSpan;
      if (prev.length === expected) return prev;
      return Array.from({ length: expected }, (_, i) => prev[i] ?? { value: null, locked: false });
    });
  }, [gapCountSpan]);

  // przerwy przęsła
  const spanCalc = useMemo(() => {
    if (nPanels === 0) return { gaps: [] as number[], error: "" };

    if (gapMode === "equal") {
      const count = gapCountSpan;
      if (count === 0) return { gaps: [], error: "" };
      const g = (spanInternalHeight - sumPanels) / count;
      const rounded = round2(g);
      const gaps = Array(count).fill(rounded);
      return { gaps, error: "" };
    }

    const expected = gapCountSpan;
    const vec = Array.from({ length: expected }, (_, i) => customGaps[i] ?? { value: null, locked: false });
    const fixedSum = sum(vec.map((g) => (g.value != null ? g.value : 0)));
    const autos = vec.filter((g) => g.value == null).length;
    const leftover = spanInternalHeight - sumPanels - fixedSum;
    if (leftover < -0.0001) return { gaps: [], error: "Za duże przerwy ręczne względem wysokości" };

    let weights: number[] | undefined;
    if (weightedAuto) {
      const mids: number[] = [];
      if (hasFrame) {
        mids.push(panelList[0]);
        for (let i = 1; i < nPanels; i++) mids.push((panelList[i - 1] + panelList[i]) / 2);
        mids.push(panelList[nPanels - 1]);
      } else {
        for (let i = 1; i < nPanels; i++) mids.push((panelList[i - 1] + panelList[i]) / 2);
      }
      weights = mids.filter((_, idx) => vec[idx].value == null);
    }
    const autosVals = distributeAutoGaps(leftover, autos, weights);
    const out: number[] = [];
    let ap = 0;
    for (let i = 0; i < expected; i++) out.push(round2(vec[i].value == null ? autosVals[ap++] : vec[i].value!));
    // korekta końcowa
    const corr = spanInternalHeight - sumPanels - sum(out);
    if (Math.abs(corr) >= 0.5) out[out.length - 1] = round2(out[out.length - 1] + corr);
    return { gaps: out, error: "" };
  }, [nPanels, gapMode, gapCountSpan, customGaps, weightedAuto, hasFrame, panelList, spanInternalHeight, sumPanels]);

  const spanGaps = spanCalc.gaps;
  const spanGapError = spanCalc.error;

  // przerwy środkowe przęsła
  const spanMidGaps = useMemo(() => {
    const countMid = Math.max(0, nPanels - 1);
    return hasFrame ? spanGaps.slice(1, 1 + countMid) : spanGaps.slice(0, countMid);
  }, [hasFrame, spanGaps, nPanels]);

  // przerwy środkowe do bramy/furtki (tylko między panelami, które wchodzą do bramy)
  const baseMidGapsGate = useMemo(() => {
    const mids: number[] = [];
    for (let i = 0; i < Math.max(0, nPanels - 1); i++) {
      const both = (includeMask[i] ?? true) && (includeMask[i + 1] ?? true);
      if (both) mids.push(spanMidGaps[i] ?? 0);
    }
    return mids;
  }, [includeMask, nPanels, spanMidGaps]);

  // górna przerwa bramy/furtki
  const typicalSpanMid = spanMidGaps[0] ?? 0;
  const topGapForGateValue = useMemo(
    () => (hasFrame ? (spanGaps[0] ?? 0) : typicalSpanMid),
    [hasFrame, spanGaps, typicalSpanMid]
  );

  // układ pionowy bramy/furtki
  function computeGateLayout(
    height: number,
    basePanels: number[],
    baseMidGaps: number[],
    topGap: number,
    extraPanels: number[],
    extraGapAfterBase: number,
    extraBetweenGap: number
  ): GateLayout {
    if (basePanels.length === 0) return { panels: [], gaps: [] };
    const internal = Math.max(0, height - 2 * frameVert);
    const combinedPanels = [...basePanels, ...extraPanels];
    const gaps: number[] = [];

    gaps.push(round2(topGap));
    gaps.push(...baseMidGaps.map(round2));

    if (extraPanels.length > 0) {
      gaps.push(round2(Math.max(0, extraGapAfterBase)));
      for (let i = 1; i < extraPanels.length; i++) gaps.push(round2(Math.max(0, extraBetweenGap)));
    }

    const used = sum(basePanels) + sum(extraPanels) + sum(gaps);
    const leftover = internal - used;
    if (leftover < -0.001) return { panels: combinedPanels, gaps, error: "Za mała wysokość bramy/furtki dla wybranego układu" };

    gaps.push(round2(leftover));
    const corr = internal - (sum(basePanels) + sum(extraPanels)) - sum(gaps);
    if (Math.abs(corr) >= 0.5) gaps[gaps.length - 1] = round2(gaps[gaps.length - 1] + corr);

    return { panels: combinedPanels, gaps };
  }

  const gate = useMemo(() => {
    if (gateType === "none") return null;
    return computeGateLayout(
      gateHeight,
      panelsForGate,
      baseMidGapsGate,
      topGapForGateValue,
      gateExtraPanels,
      gateGapAfterBase,
      gateGapBetweenExtras
    );
  }, [gateType, gateHeight, panelsForGate, baseMidGapsGate, topGapForGateValue, gateExtraPanels, gateGapAfterBase, gateGapBetweenExtras]);

  const wicket = useMemo(() => {
    if (gateType === "none" || !showWicket) return null;
    return computeGateLayout(
      wicketHeight,
      panelsForGate,
      baseMidGapsGate,
      topGapForGateValue,
      wicketExtraPanels,
      wicketGapAfterBase,
      wicketGapBetweenExtras
    );
  }, [gateType, showWicket, wicketHeight, panelsForGate, baseMidGapsGate, topGapForGateValue, wicketExtraPanels, wicketGapAfterBase, wicketGapBetweenExtras]);

  // sumy składowe
  const sumSpanGaps = useMemo(() => sum(spanGaps), [spanGaps]);
  const spanTotalByParts = useMemo(
    () => sumPanels + sumSpanGaps + (hasFrame ? 2 * frameVert : 0),
    [sumPanels, sumSpanGaps, hasFrame, frameVert]
  );

  // ekstra wysokości (Przestrzeń 2)
  const gateExtraH =
    (gateBottomEnabled ? gateBottomSupportH : 0) +
    (gateBottomProfileEnabled ? gateBottomProfileH : 0) +
    (gateOmegaEnabled ? gateOmegaH : 0);

  const wicketExtraH =
    (wicketBottomEnabled ? wicketBottomSupportH : 0) +
    (wicketBottomProfileEnabled ? wicketBottomProfileH : 0) +
    (wicketOmegaEnabled ? wicketOmegaH : 0);

  // pionowe wzmocnienia dla przesuwnej
  const slidingVerticalBars = useMemo(() => {
    if (gateType !== "przesuwna") return [];
    const f = frameVert;
    const innerW = Math.max(0, gateWidth - 2 * f);
    if (innerW <= 0) return [];

    if (gateWidth < 5000) {
      // jedno wzmocnienie na środku
      return [f + innerW / 2 - f / 2];
    }
    // ≥ 5 m
    if (gateEqualBays) {
      // równe światła: 3S + 2f = innerW => S = (innerW - 2f)/3
      const S = (innerW - 2 * f) / 3;
      const x1 = f + S;
      const x2 = f + 2 * S + f;
      return [x1, x2];
    } else {
      // przybliżone 1/3 i 2/3
      return [f + innerW / 3 - f / 2, f + (2 * innerW) / 3 - f / 2];
    }
  }, [gateType, gateWidth, frameVert, gateEqualBays]);

  // Wsporniki krótkie – pozycje X (BRAMA)
  const gateBottomXs = useMemo(() => {
    if (gateType === "none" || !gateBottomEnabled) return [];
    const anchors: number[] = [];
    const f = frameVert;
    anchors.push(0, gateWidth - f);
    if (gateType === "przesuwna") anchors.push(...slidingVerticalBars);
    else if (gateType === "skrzydłowa") anchors.push(gateWidth / 2 - f, gateWidth / 2);

    const uniq = Array.from(new Set(anchors.map((a) => Math.round(a * 1000) / 1000))).sort((a, b) => a - b);
    const out: number[] = [...uniq];

    if (gateBottomExtraPerSpan > 0) {
      for (let i = 0; i < uniq.length - 1; i++) {
        const a = uniq[i];
        const b = uniq[i + 1];
        for (let k = 1; k <= gateBottomExtraPerSpan; k++) {
          const center = a + (b - a) * (k / (gateBottomExtraPerSpan + 1));
          out.push(center - f / 2);
        }
      }
    }
    return out.sort((a, b) => a - b);
  }, [gateType, gateWidth, frameVert, slidingVerticalBars, gateBottomEnabled, gateBottomExtraPerSpan]);

  // Wsporniki – FURTKA
  const wicketBottomXs = useMemo(() => {
    if (gateType === "none" || !showWicket || !wicketBottomEnabled) return [];
    const anchors: number[] = [];
    const f = frameVert;
    anchors.push(0, wicketWidth - f);
    const uniq = Array.from(new Set(anchors.map((a) => Math.round(a * 1000) / 1000))).sort((a, b) => a - b);
    const out: number[] = [...uniq];

    if (wicketBottomExtraPerSpan > 0) {
      for (let i = 0; i < uniq.length - 1; i++) {
        const a = uniq[i];
        const b = uniq[i + 1];
        for (let k = 1; k <= wicketBottomExtraPerSpan; k++) {
          const center = a + (b - a) * (k / (wicketBottomExtraPerSpan + 1));
          out.push(center - f / 2);
        }
      }
    }
    return out.sort((a, b) => a - b);
  }, [gateType, showWicket, wicketWidth, frameVert, wicketBottomEnabled, wicketBottomExtraPerSpan]);

  // --- eksport ---
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
    const node = svgRef.current.cloneNode(true) as SVGSVGElement;
    const xml = new XMLSerializer().serializeToString(node);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob("projekt-ogrodzenia.svg", blob);
  }

  function exportPNG(dpi = 300) {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const totalWidthMM = svg.width.baseVal.value / scale;
      const totalHeightMM = svg.height.baseVal.value / scale;

      const targetWpx = Math.round(totalWidthMM * MM_TO_IN * dpi);
      const targetHpx = Math.round(totalHeightMM * MM_TO_IN * dpi);

      const canvas = document.createElement("canvas");
      canvas.width = targetWpx;
      canvas.height = targetHpx;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetWpx, targetHpx);

      ctx.setTransform(
        targetWpx / svg.width.baseVal.value,
        0,
        0,
        targetHpx / svg.height.baseVal.value,
        0,
        0
      );
      ctx.drawImage(img, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) downloadBlob(`projekt-ogrodzenia-${dpi}dpi.png`, blob);
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }

  // --- wymiary całego rysunku (mm; przed skalą) ---
  // ogon – bazowa długość (wizualnie; zależna od wysokości korpusu bramy)
  const tailBaseLen = useMemo(() => {
    if (!(tailEnabled && gateType === "przesuwna")) return 0;
    return Math.max(0, gateHeight * tailVisBaseFrac);
  }, [tailEnabled, gateType, gateHeight, tailVisBaseFrac]);

  const gateLeftExtras = (gateOmegaEnabled ? gateOmegaExtLeft : 0) + (tailEnabled && gateType === "przesuwna" && tailSide === "left" ? tailBaseLen : 0);
  const gateRightExtras = (gateOmegaEnabled ? gateOmegaExtRight : 0) + (tailEnabled && gateType === "przesuwna" && tailSide === "right" ? tailBaseLen : 0);
  
  const totalWidthMM = useMemo(() => {
    let w = 0;
    w += spanWidth + LABEL_COL_MM;
    if (gateType !== "none") {
      w += MODULE_GUTTER_MM + gateLeftExtras; // miejsce na wysięg/ogon po lewej
      if (gateType === "skrzydłowa") w += gateWidth + 2 * LABEL_COL_MM + 10;
      else w += gateWidth + LABEL_COL_MM;
      w += gateRightExtras; // miejsce na wysięg/ogon po prawej
      if (showWicket) {
        w += MODULE_GUTTER_MM;
        w += wicketWidth + LABEL_COL_MM;
      }
    }
    return w + 60; // margines
  }, [spanWidth, gateType, gateWidth, wicketWidth, showWicket, gateLeftExtras, gateRightExtras]);

  const maxHeightMM = useMemo(() => {
    let h = spanHeight;
    if (gateType !== "none") {
      h = Math.max(h, gateHeight + gateExtraH, showWicket ? wicketHeight + wicketExtraH : 0);
    }
    return h + TOP_MARGIN_MM + 60;
  }, [spanHeight, gateType, gateHeight, wicketHeight, gateExtraH, wicketExtraH, showWicket]);

  // Profile widths do headera
  const spanProfileW = hasFrame ? computeProfileWidths(spanWidth, frameVert) : [];
  const gateProfileW =
    gateType === "przesuwna"
      ? computeProfileWidths(gateWidth, frameVert, slidingVerticalBars)
      : gateType === "skrzydłowa"
      ? [+(gateWidth / 2 - 2 * frameVert).toFixed(2), +(gateWidth / 2 - 2 * frameVert).toFixed(2)]
      : [];
  const wicketProfileW = gateType !== "none" && showWicket ? computeProfileWidths(wicketWidth, frameVert) : [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Kalkulator ogrodzeń palisadowych – PRO</h1>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Kolumna 1 */}
        <div className="space-y-2 p-3 rounded-xl border">
          <div className="font-semibold">Jednostki</div>
          <div className="flex gap-2">
            {(["mm", "cm", "in"] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-3 py-1 rounded border ${unit === u ? "bg-black text-white" : ""}`}
              >
                {u}
              </button>
            ))}
          </div>

          <div className="mt-4 font-semibold">Przęsło</div>
          <label className="block">
            Szerokość ({unit})
            <input
              type="number"
              className="input"
              value={fromMM(spanWidth, unit)}
              onChange={(e) => setSpanWidth(toMM(e.currentTarget.valueAsNumber || 0, unit))}
            />
          </label>
          <label className="block">
            Wysokość ({unit})
            <input
              type="number"
              className="input"
              value={fromMM(spanHeight, unit)}
              onChange={(e) => setSpanHeight(toMM(e.currentTarget.valueAsNumber || 0, unit))}
            />
          </label>

          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={hasFrame}
              onChange={(e) => setHasFrame(e.currentTarget.checked)}
            />
            <span>Przęsło z ramą (góra/dół/lewo/prawo – {frameVert} mm)</span>
          </label>
          {hasFrame && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                Grubość ramy (mm)
                <input
                  type="number"
                  className="input"
                  value={frameVert}
                  onChange={(e) => setFrameVert(e.currentTarget.valueAsNumber || 0)}
                />
              </label>
              <div />
            </div>
          )}

          <div className="mt-4 font-semibold">Grupy paneli</div>
          <div className="space-y-2">
            {groups.map((g, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 items-end">
                <label className="block">
                  Ilość
                  <input
                    type="number"
                    className="input"
                    value={g.qty}
                    min={1}
                    onChange={(e) => {
                      const v = e.currentTarget.valueAsNumber || 0;
                      const next = [...groups];
                      next[idx] = { ...g, qty: v };
                      setGroups(next);
                    }}
                  />
                </label>
                <label className="block">
                  Wys. panelu (mm)
                  <input
                    type="number"
                    className="input"
                    value={g.t}
                    min={1}
                    onChange={(e) => {
                      const v = e.currentTarget.valueAsNumber || 0;
                      const next = [...groups];
                      next[idx] = { ...g, t: v };
                      setGroups(next);
                    }}
                  />
                </label>
                <div className="flex gap-2 items-center">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={g.inGate === false}
                      onChange={(e) => {
                        const next = [...groups];
                        next[idx] = { ...g, inGate: !e.currentTarget.checked };
                        setGroups(next);
                      }}
                    />
                    <span>Nie stosuj w bramie i furtce</span>
                  </label>
                  <button
                    className="px-2 py-1 border rounded"
                    onClick={() => setGroups(groups.filter((_, i) => i !== idx))}
                  >
                    Usuń
                  </button>
                </div>
              </div>
            ))}
            <button
              className="px-3 py-1 border rounded"
              onClick={() => setGroups([...groups, { qty: 1, t: 100, inGate: true }])}
            >
              + Dodaj grupę
            </button>
            <div className="text-sm text-gray-600">
              Presety:{" "}
              {[20, 40, 60, 80, 100, 120, 160, 180, 200].map((p) => (
                <button
                  key={p}
                  className="underline mr-2"
                  onClick={() => setGroups([...groups, { qty: 1, t: p, inGate: true }])}
                >
                  {p}×20
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 font-semibold">Przerwy</div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="gap"
                checked={gapMode === "equal"}
                onChange={() => setGapMode("equal")}
              />{" "}
              Równe
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="gap"
                checked={gapMode === "custom"}
                onChange={() => setGapMode("custom")}
              />{" "}
              Niestandardowe
            </label>
          </div>
          {gapMode === "custom" && (
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={weightedAuto}
                  onChange={(e) => setWeightedAuto(e.currentTarget.checked)}
                />{" "}
                Rozkładaj AUTO proporcjonalnie do szerokości paneli
              </label>
              <div className="text-sm text-gray-600">
                Długość wektora przerw: {gapCountSpan}. Pozostaw puste = AUTO.
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: gapCountSpan }).map((_, i) => (
                  <input
                    key={i}
                    placeholder={`g${i + 1} (mm)`}
                    className="input"
                    value={customGaps[i]?.value ?? ""}
                    onChange={(e) => {
                      const v = parseNumber(e.currentTarget.value);
                      setCustomGaps((prev) => {
                        const next = [...prev];
                        next[i] = { value: isNaN(v) ? null : v, locked: !isNaN(v) };
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Kolumna 2 */}
        <div className="space-y-2 p-3 rounded-xl border">
          <div className="font-semibold">Brama i furtka</div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="gate" checked={gateType === "none"} onChange={() => setGateType("none")} />
              Brak
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="gate" checked={gateType === "skrzydłowa"} onChange={() => setGateType("skrzydłowa")} />
              Skrzydłowa
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="gate" checked={gateType === "przesuwna"} onChange={() => setGateType("przesuwna")} />
              Przesuwna
            </label>

            {gateType !== "none" && (
              <label className="flex items-center gap-2 ml-auto">
                <input type="checkbox" checked={showWicket} onChange={(e) => setShowWicket(e.currentTarget.checked)} />
                <span>Pokaż furtkę</span>
              </label>
            )}
          </div>

          {gateType !== "none" && (
            <div>
              <label className="block">
                Szerokość bramy ({unit})
                <input
                  type="number"
                  className="input"
                  value={fromMM(gateWidth, unit)}
                  onChange={(e) => setGateWidth(toMM(e.currentTarget.valueAsNumber || 0, unit))}
                />
                {gateType === "skrzydłowa" && (
                  <div className="text-xs text-gray-600">
                    Rysujemy 2 równe skrzydła po {fmt2(gateWidth / 2)} mm.
                  </div>
                )}
              </label>
              <label className="block">
                Wysokość bramy ({unit})
                <input
                  type="number"
                  className="input"
                  value={fromMM(gateHeight, unit)}
                  onChange={(e) => setGateHeight(toMM(e.currentTarget.valueAsNumber || 0, unit))}
                />
              </label>

              {gateType === "przesuwna" && (
                <label className="flex items-center gap-2 mt-1">
                  <input type="checkbox" checked={gateEqualBays} onChange={(e) => setGateEqualBays(e.currentTarget.checked)} />
                  <span>Równe światła między wzmocnieniami</span>
                </label>
              )}

              {/* BRAMA – Przestrzeń 2 */}
              <div className="mt-3 font-medium">Przestrzeń 2 – BRAMA</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={gateBottomEnabled} onChange={(e) => setGateBottomEnabled(e.currentTarget.checked)} />
                  <span>Wsporniki (A)</span>
                </label>
                {gateBottomEnabled && (
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      Wys. wspornika A (mm)
                      <input type="number" className="input" value={gateBottomSupportH} onChange={(e) => setGateBottomSupportH(e.currentTarget.valueAsNumber || 0)} />
                    </label>
                    <label className="block">
                      Dodatkowe / przerwa
                      <input type="number" className="input" min={0} value={gateBottomExtraPerSpan} onChange={(e) => setGateBottomExtraPerSpan(Math.max(0, e.currentTarget.valueAsNumber || 0))} />
                    </label>
                    <div className="text-xs text-gray-600 self-end">Kotwy: lewy/prawy bok + środek(y). Dodatkowe rozmieszczane równo.</div>
                  </div>
                )}

                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={gateBottomProfileEnabled} onChange={(e) => setGateBottomProfileEnabled(e.currentTarget.checked)} />
                  <span>Profil pełny pod wspornikami</span>
                </label>
                {gateBottomProfileEnabled && (
                  <label className="block">
                    Wys. profilu (mm)
                    <input type="number" className="input" value={gateBottomProfileH} onChange={(e) => setGateBottomProfileH(e.currentTarget.valueAsNumber || 0)} />
                  </label>
                )}

                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={gateOmegaEnabled} onChange={(e) => setGateOmegaEnabled(e.currentTarget.checked)} />
                  <span>Omega (najniżej)</span>
                </label>
                {gateOmegaEnabled && (
                  <div className="grid grid-cols-4 gap-2">
                    <label className="block">
                      Wys. omegi (mm)
                      <input type="number" className="input" value={gateOmegaH} onChange={(e) => setGateOmegaH(e.currentTarget.valueAsNumber || 0)} />
                    </label>
                    <label className="block">
                      Wysięg w lewo (mm)
                      <input type="number" className="input" value={gateOmegaExtLeft} onChange={(e) => setGateOmegaExtLeft(e.currentTarget.valueAsNumber || 0)} />
                    </label>
                    <label className="block">
                      Wysięg w prawo (mm)
                      <input type="number" className="input" value={gateOmegaExtRight} onChange={(e) => setGateOmegaExtRight(e.currentTarget.valueAsNumber || 0)} />
                    </label>
                    <div />
                  </div>
                )}
              </div>

{/* OGON – tylko dla przesuwnej */}
{gateType === "przesuwna" && (
  <div className="mt-3">
    <div className="font-medium">Ogon (wizualny)</div>
    <div className="grid md:grid-cols-2 gap-2">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={tailEnabled} onChange={(e) => setTailEnabled(e.currentTarget.checked)} />
        <span>Włącz ogon</span>
      </label>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1">
          <input type="radio" name="tailSide" checked={tailSide === "left"} onChange={() => setTailSide("left")} />
          lewy
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" name="tailSide" checked={tailSide === "right"} onChange={() => setTailSide("right")} />
          prawy
        </label>
      </div>
    </div>

    {tailEnabled && (
      <>
        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={tailMode === 'manual'}
            onChange={(e) => setTailMode(e.currentTarget.checked ? 'manual' : 'auto')}
          />
          <span>Ogon — tryb manualny (poglądowy)</span>
        </label>

        <label className="block mt-2">
          Długość podstawy (proporcja wysokości korpusu)
          <input
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={tailVisBaseFrac}
            onChange={(e) => setTailVisBaseFrac(e.currentTarget.valueAsNumber || 0.8)}
          />
        </label>

        {tailMode === 'manual' ? (
          <div className="grid md:grid-cols-2 gap-2 mt-2">
            <input className="input" placeholder="Pion – etykieta"
                   value={tailLabels.vertical ?? ''} onChange={(e) => updateTailLabel('vertical', e.currentTarget.value)} />
            <input className="input" placeholder="Przekątna – etykieta"
                   value={tailLabels.diagonal ?? ''} onChange={(e) => updateTailLabel('diagonal', e.currentTarget.value)} />
            <input className="input" placeholder="Podstawa – etykieta"
                   value={tailLabels.base ?? ''} onChange={(e) => updateTailLabel('base', e.currentTarget.value)} />
            <input className="input" placeholder="Omega – etykieta"
                   value={tailLabels.omega ?? ''} onChange={(e) => updateTailLabel('omega', e.currentTarget.value)} />
            <input className="input" placeholder="Wspornik – etykieta"
                   value={tailLabels.support ?? ''} onChange={(e) => updateTailLabel('support', e.currentTarget.value)} />
            <div className="col-span-full text-xs text-gray-600">
              W trybie manualnym wszystkie elementy ogona mają grubość = <b>grubość ramy</b>. Powyższe pola to czysty tekst na rysunku.
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-2 mt-2">
            <label className="block">
              Adnotacja – podstawa (mm)
              <input
                type="number"
                className="input"
                value={tailAnnBaseMM ?? ""}
                onChange={(e) => setTailAnnBaseMM(Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : null)}
              />
            </label>
            <label className="block">
              Adnotacja – skos 1 (mm)
              <input
                type="number"
                className="input"
                value={tailAnnDiag1MM ?? ""}
                onChange={(e) => setTailAnnDiag1MM(Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : null)}
              />
            </label>
            <label className="block">
              Adnotacja – skos 2 (mm)
              <input
                type="number"
                className="input"
                value={tailAnnDiag2MM ?? ""}
                onChange={(e) => setTailAnnDiag2MM(Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : null)}
              />
            </label>
          </div>
        )}
      </>
    )}
  </div>
)}

              {/* BRAMA – dodatkowe panele */}
              <div className="mt-3 font-medium">Dodatkowe panele – tylko BRAMA</div>
              {gateExtraPanels.map((t, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <label className="block grow">
                    Wys. panelu (mm)
                    <input
                      type="number"
                      className="input"
                      value={t}
                      onChange={(e) => {
                        const v = e.currentTarget.valueAsNumber || 0;
                        const next = [...gateExtraPanels];
                        next[i] = v;
                        setGateExtraPanels(next);
                      }}
                    />
                  </label>
                  <button
                    className="px-2 py-1 border rounded"
                    onClick={() => setGateExtraPanels(gateExtraPanels.filter((_, k) => k !== i))}
                  >
                    Usuń
                  </button>
                </div>
              ))}
              <button className="px-3 py-1 border rounded" onClick={() => setGateExtraPanels([...gateExtraPanels, 100])}>
                + Dodaj panel
              </button>
              {gateExtraPanels.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label className="block">
                    Przerwa po wzorze przęsła (mm)
                    <input
                      type="number"
                      className="input"
                      value={gateGapAfterBase}
                      onChange={(e) => setGateGapAfterBase(e.currentTarget.valueAsNumber || 0)}
                    />
                  </label>
                  <label className="block">
                    Przerwa między dodatkowymi (mm)
                    <input
                      type="number"
                      className="input"
                      value={gateGapBetweenExtras}
                      onChange={(e) => setGateGapBetweenExtras(e.currentTarget.valueAsNumber || 0)}
                    />
                  </label>
                </div>
              )}

              {/* FURTKA */}
              {showWicket && (
                <>
                  <div className="mt-4 font-medium">Furtka (opcjonalnie)</div>
                  <label className="block">
                    Szerokość furtki ({unit})
                    <input
                      type="number"
                      className="input"
                      value={fromMM(wicketWidth, unit)}
                      onChange={(e) => setWicketWidth(toMM(e.currentTarget.valueAsNumber || 0, unit))}
                    />
                  </label>
                  <label className="block">
                    Wysokość furtki ({unit})
                    <input
                      type="number"
                      className="input"
                      value={fromMM(wicketHeight, unit)}
                      onChange={(e) => setWicketHeight(toMM(e.currentTarget.valueAsNumber || 0, unit))}
                    />
                  </label>

                  {/* FURTKA – Przestrzeń 2 (bez wysięgów) */}
                  <div className="mt-3 font-medium">Przestrzeń 2 – FURTKA</div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={wicketBottomEnabled} onChange={(e) => setWicketBottomEnabled(e.currentTarget.checked)} />
                    <span>Wsporniki (A)</span>
                  </label>
                  {wicketBottomEnabled && (
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block">
                        Wys. wspornika A (mm)
                        <input type="number" className="input" value={wicketBottomSupportH} onChange={(e) => setWicketBottomSupportH(e.currentTarget.valueAsNumber || 0)} />
                      </label>
                      <label className="block">
                        Dodatkowe / przerwa
                        <input type="number" className="input" min={0} value={wicketBottomExtraPerSpan} onChange={(e) => setWicketBottomExtraPerSpan(Math.max(0, e.currentTarget.valueAsNumber || 0))} />
                      </label>
                      <div />
                    </div>
                  )}

                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={wicketBottomProfileEnabled} onChange={(e) => setWicketBottomProfileEnabled(e.currentTarget.checked)} />
                    <span>Profil pełny pod wspornikami</span>
                  </label>
                  {wicketBottomProfileEnabled && (
                    <label className="block">
                      Wys. profilu (mm)
                      <input type="number" className="input" value={wicketBottomProfileH} onChange={(e) => setWicketBottomProfileH(e.currentTarget.valueAsNumber || 0)} />
                    </label>
                  )}

                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={wicketOmegaEnabled} onChange={(e) => setWicketOmegaEnabled(e.currentTarget.checked)} />
                    <span>Omega (najniżej)</span>
                  </label>
                  {wicketOmegaEnabled && (
                    <label className="block">
                      Wys. omegi (mm)
                      <input type="number" className="input" value={wicketOmegaH} onChange={(e) => setWicketOmegaH(e.currentTarget.valueAsNumber || 0)} />
                    </label>
                  )}

                  {/* FURTKA – dodatkowe panele */}
                  <div className="mt-3 font-medium">Dodatkowe panele – tylko FURTKA</div>
                  {wicketExtraPanels.map((t, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <label className="block grow">
                        Wys. panelu (mm)
                        <input
                          type="number"
                          className="input"
                          value={t}
                          onChange={(e) => {
                            const v = e.currentTarget.valueAsNumber || 0;
                            const next = [...wicketExtraPanels];
                            next[i] = v;
                            setWicketExtraPanels(next);
                          }}
                        />
                      </label>
                      <button
                        className="px-2 py-1 border rounded"
                        onClick={() => setWicketExtraPanels(wicketExtraPanels.filter((_, k) => k !== i))}
                      >
                        Usuń
                      </button>
                    </div>
                  ))}
                  <button className="px-3 py-1 border rounded" onClick={() => setWicketExtraPanels([...wicketExtraPanels, 100])}>
                    + Dodaj panel
                  </button>
                  {wicketExtraPanels.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <label className="block">
                        Przerwa po wzorze przęsła (mm)
                        <input
                          type="number"
                          className="input"
                          value={wicketGapAfterBase}
                          onChange={(e) => setWicketGapAfterBase(e.currentTarget.valueAsNumber || 0)}
                        />
                      </label>
                      <label className="block">
                        Przerwa między dodatkowymi (mm)
                        <input
                          type="number"
                          className="input"
                          value={wicketGapBetweenExtras}
                          onChange={(e) => setWicketGapBetweenExtras(e.currentTarget.valueAsNumber || 0)}
                        />
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Kolumna 3 – Podsumowanie */}
        <div className="space-y-2 p-3 rounded-xl border text-sm">
          <div className="font-semibold">Podsumowanie</div>

          <div className="font-medium mt-1">Przęsło</div>
          <div>Suma paneli: <b>{fmt2(sumPanels)} mm</b></div>
          <div>Wysokość przęsła (zadana): <b>{fmt2(spanHeight)} mm</b></div>
          <div>
            Składniki:&nbsp;
            panele <b>{fmt2(sumPanels)}</b> + przerwy <b>{fmt2(sumSpanGaps)}</b>
            {hasFrame ? <> + rama <b>{2 * frameVert}</b></> : null}
            &nbsp;= <b>{fmt2(spanTotalByParts)} mm</b>
            {Math.abs(spanTotalByParts - spanHeight) > 0 ? (
              <span className="text-red-600"> (≠ {fmt2(spanHeight)} mm)</span>
            ) : null}
          </div>

          <div className="text-xs text-gray-700">
            Szer. profilu (światło): {spanProfileW.length ? spanProfileW.join(" / ") + " mm" : "-"}
          </div>

          {gateType !== "none" && (
            <>
              <div className="font-medium mt-3">Brama</div>
              {gate?.error ? (
                <div className="text-red-600">{gate.error}</div>
              ) : (
                <>
                  <div>Wysokość bramy (zadana – korpus): <b>{fmt2(gateHeight)} mm</b></div>
                  <div>Wysokość całkowita bramy (z pasem): <b>{fmt2(gateHeight + gateExtraH)} mm</b></div>
                  <div>
                    Składniki korpusu:&nbsp;
                    panele <b>{gate ? fmt2(sum(gate.panels)) : 0}</b> +
                    przerwy <b>{gate ? fmt2(sum(gate.gaps)) : 0}</b> +
                    rama <b>{2 * frameVert}</b>
                    &nbsp;= <b>{gate ? fmt2(sum(gate.panels) + sum(gate.gaps) + 2 * frameVert) : 0} mm</b>
                  </div>
                  <div className="text-xs text-gray-700">
                    Szer. profili: {gateProfileW.length ? gateProfileW.join(" / ") + " mm" : "-"}
                  </div>
                </>
              )}

              {showWicket && (
                <>
                  <div className="font-medium mt-3">Furtka</div>
                  {wicket?.error ? (
                    <div className="text-red-600">{wicket.error}</div>
                  ) : (
                    <>
                      <div>Wysokość furtki (zadana – korpus): <b>{fmt2(wicketHeight)} mm</b></div>
                      <div>Wysokość całkowita furtki (z pasem): <b>{fmt2(wicketHeight + wicketExtraH)} mm</b></div>
                      <div>
                        Składniki korpusu:&nbsp;
                        panele <b>{wicket ? fmt2(sum(wicket.panels)) : 0}</b> +
                        przerwy <b>{wicket ? fmt2(sum(wicket.gaps)) : 0}</b> +
                        rama <b>{2 * frameVert}</b>
                        &nbsp;= <b>{wicket ? fmt2(sum(wicket.panels) + sum(wicket.gaps) + 2 * frameVert) : 0} mm</b>
                      </div>
                      <div className="text-xs text-gray-700">
                        Szer. profilu: {wicketProfileW.length ? wicketProfileW.join(" / ") + " mm" : "-"}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pasek eksportu */}
      <div className="p-3 rounded-xl border flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="block text-sm font-medium">Skala (px/mm – podgląd)</span>
          <input
            type="range"
            min={0.05}
            max={0.6}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(e.currentTarget.valueAsNumber || 0.2)}
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Nr zlecenia/oferty</span>
          <input
            type="text"
            className="input"
            value={orderNo}
            onChange={(e) => setOrderNo(e.currentTarget.value)}
          />
        </label>

        <div className="flex gap-2 ml-auto">
          <button className="px-3 py-2 rounded border" onClick={() => exportSVG()}>
            Pobierz SVG
          </button>
          <button className="px-3 py-2 rounded border" onClick={() => exportPNG(300)}>
            PNG 300 DPI
          </button>
          <button className="px-3 py-2 rounded border" onClick={() => exportPNG(150)}>
            PNG 150 DPI
          </button>
        </div>
      </div>

      {/* Rysunek */}
      <div className="p-3 rounded-xl border overflow-auto bg-white">
        <svg ref={svgRef} width={totalWidthMM * scale} height={maxHeightMM * scale}>
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L6,3 L0,6 z" fill="#333" />
            </marker>
          </defs>

          {/* Nagłówek + skrót w SVG */}
          <g>
            <text x={10} y={12} fontSize={12} fontWeight={600}>
              Nr zlecenia/oferty: {orderNo || "-"}
            </text>
            <text x={260} y={12} fontSize={12}>
              Skala podglądu: {scale.toFixed(2)} px/mm
            </text>
            {[
              `Przęsło – panele: ${fmt2(sumPanels)}; przerwy: ${fmt2(sumSpanGaps)}; rama: ${hasFrame ? 2 * frameVert : 0}; suma: ${fmt2(spanTotalByParts)} (zadane: ${fmt2(spanHeight)}); szer. profilu: ${spanProfileW.join("/") || "-"}`,
              gate && !gate.error
                ? `Brama – panele: ${fmt2(sum(gate.panels))}; przerwy: ${fmt2(sum(gate.gaps))}; rama: ${2 * frameVert}; suma: ${fmt2(sum(gate.panels) + sum(gate.gaps) + 2 * frameVert)} (zadane: ${fmt2(gateHeight)}); szer. profili: ${gateProfileW.join("/") || "-"}`
                : null,
              showWicket && wicket && !wicket.error
                ? `Furtka – panele: ${fmt2(sum(wicket.panels))}; przerwy: ${fmt2(sum(wicket.gaps))}; rama: ${2 * frameVert}; suma: ${fmt2(sum(wicket.panels) + sum(wicket.gaps) + 2 * frameVert)} (zadane: ${fmt2(wicketHeight)}); szer. profilu: ${wicketProfileW.join("/") || "-"}`
                : null,
            ]
              .filter(Boolean)
              .map((line, i) => (
                <text key={i} x={10} y={24 + i * 12} fontSize={11}>
                  {line as string}
                </text>
              ))}
          </g>

          {/* PRZĘSŁO */}
          {(() => {
            const yOffset = TOP_MARGIN_MM * scale;
            const xSpan = 10 * scale;
            if (baseError || spanGapError) return null;

            return (
              <g transform={`translate(${xSpan}, ${yOffset})`}>
                <LayoutBlock
                  title="Przęsło"
                  outerW={spanWidth}
                  outerH={spanHeight}
                  withFrame={hasFrame}
                  gaps={spanGaps}
                  panels={panelList}
                  scale={scale}
                  frameVert={frameVert}
                  showProfileWidths={hasFrame}
                />
              </g>
            );
          })()}

          {/* BRAMA + FURTKA */}
          {gateType !== "none" && (() => {
            const gateYOffset = TOP_MARGIN_MM * scale;

            // BRAMA: odsuwamy całość w prawo o wysięg/ogon po LEWEJ
            const xGate =
              (10 + spanWidth + LABEL_COL_MM + MODULE_GUTTER_MM + gateLeftExtras) * scale;

            const bottomGate = {
              bottomSupports: gateBottomEnabled ? { height: gateBottomSupportH, xs: gateBottomXs } : undefined,
              bottomProfile: gateBottomProfileEnabled ? { height: gateBottomProfileH } : undefined,
              bottomOmega: gateOmegaEnabled ? { height: gateOmegaH, extendLeft: gateOmegaExtLeft, extendRight: gateOmegaExtRight } : undefined,
            } as const;

            const tailProps =
              gateType === "przesuwna"
                ? {
                    tailEnabled,
                    tailSide,
                    tailVisBaseFrac,
                    tailAnnBaseMM,
                    tailAnnDiag1MM,
                    tailAnnDiag2MM,
                  }
                : {
                    tailEnabled: false,
                    tailSide: "right" as const,
                    tailVisBaseFrac: 0.8,
                    tailAnnBaseMM: null as number | null,
                    tailAnnDiag1MM: null as number | null,
                    tailAnnDiag2MM: null as number | null,
                  };

            const gateBlock = gate ? (
              gateType === "skrzydłowa" ? (
                <g transform={`translate(${xGate}, ${gateYOffset})`}>
                  <LayoutBlock
                    title={`Brama skrzydłowa – skrzydło L`}
                    outerW={gateWidth / 2}
                    outerH={gateHeight}
                    withFrame={true}
                    gaps={gate.gaps}
                    panels={gate.panels}
                    scale={scale}
                    frameVert={frameVert}
                    showProfileWidths
                    {...bottomGate}
                  />
                  <g transform={`translate(${(gateWidth / 2 + 10) * scale}, 0)`}>
                    <LayoutBlock
                      title={`Brama skrzydłowa – skrzydło P`}
                      outerW={gateWidth / 2}
                      outerH={gateHeight}
                      withFrame={true}
                      gaps={gate.gaps}
                      panels={gate.panels}
                      scale={scale}
                      frameVert={frameVert}
                      showProfileWidths
                      {...bottomGate}
                    />
                  </g>
                </g>
              ) : (
                <g transform={`translate(${xGate}, ${gateYOffset})`}>
                  <LayoutBlock
                    title={`Brama przesuwna`}
                    outerW={gateWidth}
                    outerH={gateHeight}
                    withFrame={true}
                    gaps={gate.gaps}
                    panels={gate.panels}
                    scale={scale}
                    frameVert={frameVert}
                    verticalBars={slidingVerticalBars}
                    showProfileWidths
                    {...bottomGate}
                    {...tailProps}
                  />
                </g>
              )
            ) : null;

            // szerokość bramy z kolumną etykiet
            const gateWidthWithLabels =
              gateType === "skrzydłowa"
                ? gateWidth + 2 * LABEL_COL_MM + 10
                : gateWidth + LABEL_COL_MM;

            // FURTKA: po PRAWEJ dokładamy odsuw o wysięg omegi i ogon po prawej
            const wicketYOffset = gateYOffset;
            const xWicket =
              (10 +
                spanWidth +
                LABEL_COL_MM +
                MODULE_GUTTER_MM +
                gateLeftExtras +
                gateWidthWithLabels +
                gateRightExtras +
                (showWicket ? MODULE_GUTTER_MM : 0)) *
              scale;

            const bottomWicket = {
              bottomSupports: wicketBottomEnabled ? { height: wicketBottomSupportH, xs: wicketBottomXs } : undefined,
              bottomProfile: wicketBottomProfileEnabled ? { height: wicketBottomProfileH } : undefined,
              bottomOmega: wicketOmegaEnabled ? { height: wicketOmegaH, extendLeft: 0, extendRight: 0 } : undefined,
            } as const;

            const wicketBlock = showWicket && wicket ? (
              <g transform={`translate(${xWicket}, ${wicketYOffset})`}>
                <LayoutBlock
                  title="Furtka"
                  outerW={wicketWidth}
                  outerH={wicketHeight}
                  withFrame={true}
                  gaps={wicket.gaps}
                  panels={wicket.panels}
                  scale={scale}
                  frameVert={frameVert}
                  showProfileWidths
                  {...bottomWicket}
                />
              </g>
            ) : null;

            // Δ wysokości względem przęsła (pomocnicze)
            const xDeltaGate = (10 + spanWidth + LABEL_COL_MM + MODULE_GUTTER_MM / 2) * scale;
            const xDeltaWicket =
              (10 +
                spanWidth +
                LABEL_COL_MM +
                MODULE_GUTTER_MM +
                gateLeftExtras +
                gateWidthWithLabels +
                gateRightExtras +
                MODULE_GUTTER_MM / 2) *
              scale;

            return (
              <g>
                {gateBlock}
                {wicketBlock}

                {gate && (
                  <g>
                    <line
                      x1={xDeltaGate}
                      x2={xDeltaGate}
                      y1={(TOP_MARGIN_MM + spanHeight) * scale}
                      y2={(TOP_MARGIN_MM + (gateHeight + gateExtraH)) * scale}
                      stroke="#333"
                      markerStart="url(#arrowhead)"
                      markerEnd="url(#arrowhead)"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      x={xDeltaGate + 3}
                      y={(TOP_MARGIN_MM + Math.min(gateHeight + gateExtraH, spanHeight) + Math.abs(gateHeight + gateExtraH - spanHeight) / 2) * scale}
                      fontSize={12}
                      style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
                    >
                      {`Δ: ${Math.abs(gateHeight + gateExtraH - spanHeight)} mm`}
                    </text>
                  </g>
                )}

                {showWicket && wicket && (
                  <g>
                    <line
                      x1={xDeltaWicket}
                      x2={xDeltaWicket}
                      y1={(TOP_MARGIN_MM + spanHeight) * scale}
                      y2={(TOP_MARGIN_MM + (wicketHeight + wicketExtraH)) * scale}
                      stroke="#333"
                      markerStart="url(#arrowhead)"
                      markerEnd="url(#arrowhead)"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      x={xDeltaWicket + 3}
                      y={(TOP_MARGIN_MM + Math.min(wicketHeight + wicketExtraH, spanHeight) + Math.abs(wicketHeight + wicketExtraH - spanHeight) / 2) * scale}
                      fontSize={12}
                      style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
                    >
                      {`Δ: ${Math.abs(wicketHeight + wicketExtraH - spanHeight)} mm`}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}
        </svg>
      </div>

      <div className="text-xs text-gray-500">
        * Zaokrąglanie do 0,01 mm. Panele są wyrównane pionowo między elementami.
        Brama skrzydłowa rysowana jako dwa równe skrzydła; brama przesuwna ma pionowe wzmocnienia zależnie od szerokości (z opcją równych świateł).
        „Przestrzeń 2” (wsporniki / profil / omega) jest rysowana pod dolną ramą i wliczana do wysokości całkowitej. Ogon jest elementem wizualnym.
      </div>
    </div>
  );
}
