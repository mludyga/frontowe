import { useEffect, useMemo, useRef, useState } from "react";
import LayoutBlock, { LABEL_COL_MM } from "./components/LayoutBlock";
import { toMM, fromMM, type Unit } from "./utils/units";
import { round2, fmt2 } from "./utils/math";

type PanelGroup = { qty: number; t: number; inGate?: boolean };
type GapMode = "equal" | "custom";
type GateType = "none" | "skrzydłowa" | "przesuwna";
type CustomGap = { value: number | null; locked: boolean };
type GateLayout = { panels: number[]; gaps: number[]; error?: string };

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

const MODULE_GUTTER_MM = 180;
const TOP_MARGIN_MM = 446;

export default function App() {
  const [unit, setUnit] = useState<Unit>("mm");

  // PRZĘSŁO
  const [spanWidth, setSpanWidth] = useState(2000);
  const [spanHeight, setSpanHeight] = useState(1200);
  const [hasFrame, setHasFrame] = useState(false);
  const [frameVert, setFrameVert] = useState(60);

  const [groups, setGroups] = useState<PanelGroup[]>([{ qty: 6, t: 100, inGate: true }]);
  const [gapMode, setGapMode] = useState<GapMode>("equal");
  const [weightedAuto, setWeightedAuto] = useState(false);
  const [customGaps, setCustomGaps] = useState<CustomGap[]>([]);

  // BRAMA / FURTKA
  const [gateType, setGateType] = useState<GateType>("none");
  const [gateWidth, setGateWidth] = useState(4000);
  const [gateHeight, setGateHeight] = useState(1400);

  // Przestrzeń 2 – wsporniki
  const [gateBottomEnabled, setGateBottomEnabled] = useState(false);
  const [gateBottomSupportH, setGateBottomSupportH] = useState(80);
  const [gateBottomExtraPerSpan, setGateBottomExtraPerSpan] = useState(0);

  // Dodatkowy profil (nad omegą)
  const [gateBottomProfileEnabled, setGateBottomProfileEnabled] = useState(false);
  const [gateBottomProfileH, setGateBottomProfileH] = useState(40);

  // Omega (najniżej)
  const [gateOmegaEnabled, setGateOmegaEnabled] = useState(true);
  const [gateOmegaH, setGateOmegaH] = useState(80);
  const [gateOmegaOverhangL, setGateOmegaOverhangL] = useState(0);
  const [gateOmegaOverhangR, setGateOmegaOverhangR] = useState(0);

  // Furtka
  const [wicketWidth, setWicketWidth] = useState(1000);
  const [wicketHeight, setWicketHeight] = useState(1400);

  // dodatkowe panele
  const [gateExtraPanels, setGateExtraPanels] = useState<number[]>([]);
  const [gateGapAfterBase, setGateGapAfterBase] = useState(0);
  const [gateGapBetweenExtras, setGateGapBetweenExtras] = useState(0);
  const [wicketExtraPanels, setWicketExtraPanels] = useState<number[]>([]);
  const [wicketGapAfterBase, setWicketGapAfterBase] = useState(0);
  const [wicketGapBetweenExtras, setWicketGapBetweenExtras] = useState(0);

  const [orderNo, setOrderNo] = useState("");
  const [scale, setScale] = useState(0.2);

  // listy paneli
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

  const spanInternalHeight = useMemo(
    () => (hasFrame ? Math.max(0, spanHeight - 2 * frameVert) : spanHeight),
    [hasFrame, spanHeight, frameVert]
  );

  const gapCountSpan = useMemo(() => {
    if (nPanels <= 0) return 0;
    return hasFrame ? nPanels + 1 : Math.max(0, nPanels - 1);
  }, [nPanels, hasFrame]);

  const baseError: string | null = useMemo(() => {
    if (nPanels === 0) return "Dodaj przynajmniej jeden panel";
    if (sumPanels > spanInternalHeight + 1e-6) return "Suma wysokości paneli przekracza wysokość przęsła";
    return null;
  }, [nPanels, sumPanels, spanInternalHeight]);

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
    const corr = spanInternalHeight - sumPanels - sum(out);
    if (Math.abs(corr) >= 0.5) out[out.length - 1] = round2(out[out.length - 1] + corr);
    return { gaps: out, error: "" };
  }, [nPanels, gapMode, gapCountSpan, customGaps, weightedAuto, hasFrame, panelList, spanInternalHeight, sumPanels]);

  const spanGaps = spanCalc.gaps;
  const spanGapError = spanCalc.error;

  const spanMidGaps = useMemo(() => {
    const countMid = Math.max(0, nPanels - 1);
    return hasFrame ? spanGaps.slice(1, 1 + countMid) : spanGaps.slice(0, countMid);
  }, [hasFrame, spanGaps, nPanels]);

  const baseMidGapsGate = useMemo(() => {
    const mids: number[] = [];
    for (let i = 0; i < Math.max(0, nPanels - 1); i++) {
      const both = (includeMask[i] ?? true) && (includeMask[i + 1] ?? true);
      if (both) mids.push(spanMidGaps[i] ?? 0);
    }
    return mids;
  }, [includeMask, nPanels, spanMidGaps]);

  const typicalSpanMid = spanMidGaps[0] ?? 0;
  const topGapForGateValue = useMemo(
    () => (hasFrame ? (spanGaps[0] ?? 0) : typicalSpanMid),
    [hasFrame, spanGaps, typicalSpanMid]
  );

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
    if (gateType === "none") return null;
    return computeGateLayout(
      wicketHeight,
      panelsForGate,
      baseMidGapsGate,
      topGapForGateValue,
      wicketExtraPanels,
      wicketGapAfterBase,
      wicketGapBetweenExtras
    );
  }, [gateType, wicketHeight, panelsForGate, baseMidGapsGate, topGapForGateValue, wicketExtraPanels, wicketGapAfterBase, wicketGapBetweenExtras]);

  const sumSpanGaps = useMemo(() => sum(spanGaps), [spanGaps]);
  const spanTotalByParts = useMemo(
    () => sumPanels + sumSpanGaps + (hasFrame ? 2 * frameVert : 0),
    [sumPanels, sumSpanGaps, hasFrame, frameVert]
  );

  // dodatki pod bramą / furtką
  const gateExtraH = useMemo(
    () =>
      (gateBottomEnabled ? gateBottomSupportH : 0) +
      (gateBottomProfileEnabled ? gateBottomProfileH : 0) +
      (gateOmegaEnabled ? gateOmegaH : 0),
    [gateBottomEnabled, gateBottomSupportH, gateBottomProfileEnabled, gateBottomProfileH, gateOmegaEnabled, gateOmegaH]
  );

  const wicketExtraH = useMemo(
    () => (gateBottomProfileEnabled ? gateBottomProfileH : 0) + (gateOmegaEnabled ? gateOmegaH : 0),
    [gateBottomProfileEnabled, gateBottomProfileH, gateOmegaEnabled, gateOmegaH]
  );

  const gateTotals = useMemo(() => {
    if (!gate) return null;
    const p = sum(gate.panels);
    const gsum = sum(gate.gaps);
    const total = p + gsum + 2 * frameVert + gateExtraH;
    return { p, gsum, total };
  }, [gate, frameVert, gateExtraH]);

  const wicketTotals = useMemo(() => {
    if (!wicket) return null;
    const p = sum(wicket.panels);
    const gsum = sum(wicket.gaps);
    const total = p + gsum + 2 * frameVert + wicketExtraH;
    return { p, gsum, total };
  }, [wicket, frameVert, wicketExtraH]);

  // pionowe wzmocnienia przesuwnej
  const slidingVerticalBars = useMemo(() => {
    if (gateType !== "przesuwna") return [];
    const f = frameVert;
    const innerW = Math.max(0, gateWidth - 2 * f);
    if (innerW <= 0) return [];
    if (gateWidth < 5000) return [f + innerW / 2 - f / 2];
    return [f + innerW / 3 - f / 2, f + (2 * innerW) / 3 - f / 2];
  }, [gateType, gateWidth, frameVert]);

  // pozycje wsporników
  const gateBottomXs = useMemo(() => {
    if (gateType === "none" || !gateBottomEnabled) return [];
    const f = frameVert;
    const anchors: number[] = [0, gateWidth - f];
    if (gateType === "przesuwna") anchors.push(...slidingVerticalBars);
    else if (gateType === "skrzydłowa") anchors.push(gateWidth / 2 - f, gateWidth / 2);
    const uniq = Array.from(new Set(anchors.map(a => Math.round(a * 1000) / 1000))).sort((a, b) => a - b);
    const out: number[] = [...uniq];
    if (gateBottomExtraPerSpan > 0) {
      for (let i = 0; i < uniq.length - 1; i++) {
        const a = uniq[i], b = uniq[i + 1];
        for (let k = 1; k <= gateBottomExtraPerSpan; k++) {
          const center = a + (b - a) * (k / (gateBottomExtraPerSpan + 1));
          out.push(center - f / 2);
        }
      }
    }
    return out.sort((a, b) => a - b);
  }, [gateType, gateWidth, frameVert, slidingVerticalBars, gateBottomEnabled, gateBottomExtraPerSpan]);

  // eksport
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
    const xml = new XMLSerializer().serializeToString(svgRef.current.cloneNode(true) as SVGSVGElement);
    downloadBlob("projekt-ogrodzenia.svg", new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  }
  function exportPNG(dpi = 300) {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const totalWidthMM = svg.width.baseVal.value / scale;
      const totalHeightMM = svg.height.baseVal.value / scale;
      const targetWpx = Math.round(totalWidthMM * MM_TO_IN * dpi);
      const targetHpx = Math.round(totalHeightMM * MM_TO_IN * dpi);
      const canvas = document.createElement("canvas");
      canvas.width = targetWpx; canvas.height = targetHpx;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, targetWpx, targetHpx);
      ctx.setTransform(targetWpx / svg.width.baseVal.value, 0, 0, targetHpx / svg.height.baseVal.value, 0, 0);
      ctx.drawImage(img, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      canvas.toBlob((b) => { if (b) downloadBlob(`projekt-ogrodzenia-${dpi}dpi.png`, b); URL.revokeObjectURL(url); }, "image/png");
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }

  // omega / profil config (wspólne dla bramy i furtki)
  const omegaCfg = useMemo(
    () => (gateOmegaEnabled ? { height: gateOmegaH, overhangL: gateOmegaOverhangL, overhangR: gateOmegaOverhangR } : undefined),
    [gateOmegaEnabled, gateOmegaH, gateOmegaOverhangL, gateOmegaOverhangR]
  );
  const profileCfg = useMemo(
    () => (gateBottomProfileEnabled ? { height: gateBottomProfileH } : undefined),
    [gateBottomProfileEnabled, gateBottomProfileH]
  );

  // rozmiary całego rysunku
  const totalWidthMM = useMemo(() => {
    let w = 0;
    const ol = omegaCfg?.overhangL ?? 0;
    const or = omegaCfg?.overhangR ?? 0;

    w += spanWidth + LABEL_COL_MM;

    if (gateType !== "none") {
      // przejście SPAN -> GATE (dołóż wysięg lewy)
      w += MODULE_GUTTER_MM + ol;

      const gateWidthWithLabels =
        gateType === "skrzydłowa"
          ? gateWidth + 2 * LABEL_COL_MM + 10
          : gateWidth + LABEL_COL_MM;

      // sam blok bramy
      w += gateWidthWithLabels;

      // wysięg prawy + przejście do furtki + wysięg lewy furtki
      w += or + MODULE_GUTTER_MM + ol;

      // furtka + etykiety
      w += wicketWidth + LABEL_COL_MM;

      // wysięg prawy furtki
      w += or;
    }
    return w + 60;
  }, [spanWidth, gateType, gateWidth, wicketWidth, omegaCfg]);

  const maxHeightMM = useMemo(() => {
    let h = spanHeight;
    if (gateType !== "none") {
      h = Math.max(h, gateHeight + gateExtraH, wicketHeight + wicketExtraH);
    }
    return h + TOP_MARGIN_MM + 60;
  }, [spanHeight, gateType, gateHeight, wicketHeight, gateExtraH, wicketExtraH]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Kalkulator ogrodzeń palisadowych – PRO</h1>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Kolumna 1 */}
        <div className="space-y-2 p-3 rounded-xl border">
          <div className="font-semibold">Jednostki</div>
          <div className="flex gap-2">
            {(["mm", "cm", "in"] as Unit[]).map((u) => (
              <button key={u} onClick={() => setUnit(u)} className={`px-3 py-1 rounded border ${unit === u ? "bg-black text-white" : ""}`}>{u}</button>
            ))}
          </div>

          <div className="mt-4 font-semibold">Przęsło</div>
          <label className="block">Szerokość ({unit})
            <input type="number" className="input" value={fromMM(spanWidth, unit)} onChange={(e) => setSpanWidth(toMM(e.currentTarget.valueAsNumber || 0, unit))} />
          </label>
          <label className="block">Wysokość ({unit})
            <input type="number" className="input" value={fromMM(spanHeight, unit)} onChange={(e) => setSpanHeight(toMM(e.currentTarget.valueAsNumber || 0, unit))} />
          </label>

          <label className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={hasFrame} onChange={(e) => setHasFrame(e.currentTarget.checked)} />
            <span>Przęsło z ramą (góra/dół/lewo/prawo – {frameVert} mm)</span>
          </label>
          {hasFrame && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">Grubość ramy (mm)
                <input type="number" className="input" value={frameVert} onChange={(e) => setFrameVert(e.currentTarget.valueAsNumber || 0)} />
              </label>
              <div />
            </div>
          )}

          <div className="mt-4 font-semibold">Grupy paneli</div>
          <div className="space-y-2">
            {groups.map((g, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 items-end">
                <label className="block">Ilość
                  <input type="number" className="input" value={g.qty} min={1} onChange={(e) => {
                    const v = e.currentTarget.valueAsNumber || 0; const next = [...groups]; next[idx] = { ...g, qty: v }; setGroups(next);
                  }} />
                </label>
                <label className="block">Wys. panelu (mm)
                  <input type="number" className="input" value={g.t} min={1} onChange={(e) => {
                    const v = e.currentTarget.valueAsNumber || 0; const next = [...groups]; next[idx] = { ...g, t: v }; setGroups(next);
                  }} />
                </label>
                <div className="flex gap-2 items-center">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={g.inGate === false} onChange={(e) => {
                      const next = [...groups]; next[idx] = { ...g, inGate: !e.currentTarget.checked }; setGroups(next);
                    }} />
                    <span>Nie stosuj w bramie i furtce</span>
                  </label>
                  <button className="px-2 py-1 border rounded" onClick={() => setGroups(groups.filter((_, i) => i !== idx))}>Usuń</button>
                </div>
              </div>
            ))}
            <button className="px-3 py-1 border rounded" onClick={() => setGroups([...groups, { qty: 1, t: 100, inGate: true }])}>+ Dodaj grupę</button>
          </div>

          <div className="mt-4 font-semibold">Przerwy</div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2"><input type="radio" name="gap" checked={gapMode === "equal"} onChange={() => setGapMode("equal")} /> Równe</label>
            <label className="flex items-center gap-2"><input type="radio" name="gap" checked={gapMode === "custom"} onChange={() => setGapMode("custom")} /> Niestandardowe</label>
          </div>
          {gapMode === "custom" && (
            <div className="space-y-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={weightedAuto} onChange={(e) => setWeightedAuto(e.currentTarget.checked)} /> Rozkładaj AUTO proporcjonalnie do szerokości paneli</label>
              <div className="text-sm text-gray-600">Długość wektora przerw: {gapCountSpan}. Pozostaw puste = AUTO.</div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: gapCountSpan }).map((_, i) => (
                  <input key={i} placeholder={`g${i + 1} (mm)`} className="input"
                    value={customGaps[i]?.value ?? ""}
                    onChange={(e) => {
                      const v = parseNumber(e.currentTarget.value);
                      setCustomGaps((prev) => { const next = [...prev]; next[i] = { value: isNaN(v) ? null : v, locked: !isNaN(v) }; return next; });
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
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2"><input type="radio" name="gate" checked={gateType === "none"} onChange={() => setGateType("none")} /> Brak</label>
            <label className="flex items-center gap-2"><input type="radio" name="gate" checked={gateType === "skrzydłowa"} onChange={() => setGateType("skrzydłowa")} /> Skrzydłowa</label>
            <label className="flex items-center gap-2"><input type="radio" name="gate" checked={gateType === "przesuwna"} onChange={() => setGateType("przesuwna")} /> Przesuwna</label>
          </div>

          {gateType !== "none" && (
            <div>
              <label className="block">Szerokość bramy ({unit})
                <input type="number" className="input" value={fromMM(gateWidth, unit)} onChange={(e) => setGateWidth(toMM(e.currentTarget.valueAsNumber || 0, unit))} />
                {gateType === "skrzydłowa" && <div className="text-xs text-gray-600">2 równe skrzydła po {fmt2(gateWidth / 2)} mm.</div>}
              </label>
              <label className="block">Wysokość bramy ({unit})
                <input type="number" className="input" value={fromMM(gateHeight, unit)} onChange={(e) => setGateHeight(toMM(e.currentTarget.valueAsNumber || 0, unit))} />
              </label>

              {/* wsporniki */}
              <div className="mt-3 font-medium">Przestrzeń 2 – wsporniki</div>
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={gateBottomEnabled} onChange={(e) => setGateBottomEnabled(e.currentTarget.checked)} />
                <span>Włącz pas wsporników</span>
              </label>
              {gateBottomEnabled && (
                <div className="grid grid-cols-3 gap-2">
                  <label className="block">Wys. wspornika (mm)
                    <input type="number" className="input" value={gateBottomSupportH} onChange={(e) => setGateBottomSupportH(e.currentTarget.valueAsNumber || 0)} />
                  </label>
                  <label className="block">Dodatkowe / przerwa
                    <input type="number" className="input" min={0} value={gateBottomExtraPerSpan} onChange={(e) => setGateBottomExtraPerSpan(Math.max(0, e.currentTarget.valueAsNumber || 0))} />
                  </label>
                  <div className="text-xs text-gray-600 self-end">Kotwy: boki ramy + wzmocnienia. Dodatkowe równomiernie.</div>
                </div>
              )}

              {/* profil */}
              <div className="mt-3 font-medium">Profil pod ramą (na całą długość)</div>
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={gateBottomProfileEnabled} onChange={(e) => setGateBottomProfileEnabled(e.currentTarget.checked)} />
                <span>Dodaj profil (nad omegą)</span>
              </label>
              {gateBottomProfileEnabled && (
                <div className="grid grid-cols-3 gap-2">
                  <label className="block">Wysokość (mm)
                    <input type="number" className="input" value={gateBottomProfileH} onChange={(e) => setGateBottomProfileH(e.currentTarget.valueAsNumber || 0)} />
                  </label>
                  <div className="col-span-2 text-xs text-gray-600 self-end">Wliczany do wysokości całkowitej.</div>
                </div>
              )}

              {/* omega */}
              <div className="mt-3 font-medium">Omega (najniżej)</div>
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={gateOmegaEnabled} onChange={(e) => setGateOmegaEnabled(e.currentTarget.checked)} />
                <span>Dodaj omegę pod profilem</span>
              </label>
              {gateOmegaEnabled && (
                <div className="grid grid-cols-4 gap-2">
                  <label className="block col-span-1">Wysokość (mm)
                    <input type="number" className="input" value={gateOmegaH} onChange={(e) => setGateOmegaH(e.currentTarget.valueAsNumber || 0)} />
                  </label>
                  <label className="block col-span-1">Wysięg L (mm)
                    <input type="number" className="input" value={gateOmegaOverhangL} onChange={(e) => setGateOmegaOverhangL(e.currentTarget.valueAsNumber || 0)} />
                  </label>
                  <label className="block col-span-1">Wysięg P (mm)
                    <input type="number" className="input" value={gateOmegaOverhangR} onChange={(e) => setGateOmegaOverhangR(e.currentTarget.valueAsNumber || 0)} />
                  </label>
                  <div className="text-xs text-gray-600 self-end col-span-1">Wysięgi rozsuwają elementy, żeby nic się nie nakładało.</div>
                </div>
              )}

              {/* dodatkowe panele – brama */}
              <div className="mt-3 font-medium">Dodatkowe panele – BRAMA</div>
              {gateExtraPanels.map((t, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <label className="block grow">Wys. panelu (mm)
                    <input type="number" className="input" value={t} onChange={(e) => {
                      const v = e.currentTarget.valueAsNumber || 0; const next = [...gateExtraPanels]; next[i] = v; setGateExtraPanels(next);
                    }} />
                  </label>
                  <button className="px-2 py-1 border rounded" onClick={() => setGateExtraPanels(gateExtraPanels.filter((_, k) => k !== i))}>Usuń</button>
                </div>
              ))}
              <button className="px-3 py-1 border rounded" onClick={() => setGateExtraPanels([...gateExtraPanels, 100])}>+ Dodaj panel</button>
              {gateExtraPanels.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label className="block">Przerwa po wzorze (mm)
                    <input type="number" className="input" value={gateGapAfterBase} onChange={(e) => setGateGapAfterBase(e.currentTarget.valueAsNumber || 0)} />
                  </label>
                  <label className="block">Przerwa między dodatkowymi (mm)
                    <input type="number" className="input" value={gateGapBetweenExtras} onChange={(e) => setGateGapBetweenExtras(e.currentTarget.valueAsNumber || 0)} />
                  </label>
                </div>
              )}

              {/* furtka */}
              <div className="mt-4 font-medium">Furtka (opcjonalnie)</div>
              <label className="block">Szerokość furtki ({unit})
                <input type="number" className="input" value={fromMM(wicketWidth, unit)} onChange={(e) => setWicketWidth(toMM(e.currentTarget.valueAsNumber || 0, unit))} />
              </label>
              <label className="block">Wysokość furtki ({unit})
                <input type="number" className="input" value={fromMM(wicketHeight, unit)} onChange={(e) => setWicketHeight(toMM(e.currentTarget.valueAsNumber || 0, unit))} />
              </label>
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
            Składniki: panele <b>{fmt2(sumPanels)}</b> + przerwy <b>{fmt2(sumSpanGaps)}</b>
            {hasFrame ? <> + rama <b>{2 * frameVert}</b></> : null}
            &nbsp;= <b>{fmt2(spanTotalByParts)} mm</b>
            {Math.abs(spanTotalByParts - spanHeight) > 0 ? <span className="text-red-600"> (≠ {fmt2(spanHeight)} mm)</span> : null}
          </div>

          {baseError ? (
            <div className="text-red-600">{baseError}</div>
          ) : spanGapError ? (
            <div className="text-red-600">{spanGapError}</div>
          ) : (
            <div>
              <div className="mt-1">Przerwy (lista):</div>
              <div className="flex flex-wrap gap-1">
                {spanGaps.map((g, i) => <span key={i} className="px-2 py-1 bg-slate-100 rounded">{`${g.toFixed(2)} mm`}</span>)}
              </div>
            </div>
          )}

          {gateType !== "none" && (
            <>
              <div className="font-medium mt-3">Brama</div>
              {gate?.error ? (
                <div className="text-red-600">{gate.error}</div>
              ) : (
                <>
                  <div>Wysokość (zadana): <b>{fmt2(gateHeight)} mm</b></div>
                  <div>Wysokość całkowita (z dołem): <b>{fmt2(gateHeight + gateExtraH)} mm</b></div>
                  <div>
                    Składniki: panele <b>{gateTotals ? fmt2(gateTotals.p) : 0}</b> + przerwy <b>{gateTotals ? fmt2(gateTotals.gsum) : 0}</b> + rama <b>{2 * frameVert}</b>
                    &nbsp;= <b>{gateTotals ? fmt2(gateTotals.total) : 0} mm</b>
                  </div>
                </>
              )}

              <div className="font-medium mt-3">Furtka</div>
              {wicket?.error ? (
                <div className="text-red-600">{wicket.error}</div>
              ) : (
                <>
                  <div>Wysokość (zadana): <b>{fmt2(wicketHeight)} mm</b></div>
                  <div>Wysokość całkowita (z dołem): <b>{fmt2(wicketHeight + wicketExtraH)} mm</b></div>
                  <div>
                    Składniki: panele <b>{wicketTotals ? fmt2(wicketTotals.p) : 0}</b> + przerwy <b>{wicketTotals ? fmt2(wicketTotals.gsum) : 0}</b> + rama <b>{2 * frameVert}</b>
                    &nbsp;= <b>{wicketTotals ? fmt2(wicketTotals.total) : 0} mm</b>
                  </div>
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
          <input type="range" min={0.05} max={0.6} step={0.01} value={scale} onChange={(e) => setScale(e.currentTarget.valueAsNumber || 0.2)} />
        </label>

        <label className="block">
          <span className="block text-sm font-medium">Nr zlecenia/oferty</span>
          <input type="text" className="input" value={orderNo} onChange={(e) => setOrderNo(e.currentTarget.value)} />
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

          {/* nagłówek */}
          <g>
            <text x={10} y={12} fontSize={12} fontWeight={600}>Nr zlecenia/oferty: {orderNo || "-"}</text>
            <text x={260} y={12} fontSize={12}>Skala podglądu: {scale.toFixed(2)} px/mm</text>
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
                />
              </g>
            );
          })()}

          {/* BRAMA + FURTKA */}
          {gateType !== "none" && (() => {
            const gateYOffset = TOP_MARGIN_MM * scale;
            const wicketYOffset = gateYOffset;

            const ol = omegaCfg?.overhangL ?? 0;
            const or = omegaCfg?.overhangR ?? 0;

            // brama dosunięta o lewy wysięg, żeby nie wchodziła na przęsło
            const xGate = (10 + spanWidth + LABEL_COL_MM + MODULE_GUTTER_MM + ol) * scale;

            const bottomSupports = gateBottomEnabled ? { height: gateBottomSupportH, xs: gateBottomXs } : undefined;

            const gateBlock = gate ? (
              gateType === "skrzydłowa" ? (
                <g transform={`translate(${xGate}, ${gateYOffset})`}>
                  <LayoutBlock
                    title="Brama skrzydłowa – skrzydło L"
                    outerW={gateWidth / 2}
                    outerH={gateHeight}
                    withFrame
                    gaps={gate.gaps}
                    panels={gate.panels}
                    scale={scale}
                    frameVert={frameVert}
                    bottomSupports={bottomSupports}
                    bottomProfile={profileCfg}
                    omega={omegaCfg}
                  />
                  <g transform={`translate(${(gateWidth / 2 + 10) * scale}, 0)`}>
                    <LayoutBlock
                      title="Brama skrzydłowa – skrzydło P"
                      outerW={gateWidth / 2}
                      outerH={gateHeight}
                      withFrame
                      gaps={gate.gaps}
                      panels={gate.panels}
                      scale={scale}
                      frameVert={frameVert}
                      bottomSupports={bottomSupports}
                      bottomProfile={profileCfg}
                      omega={omegaCfg}
                    />
                  </g>
                </g>
              ) : (
                <g transform={`translate(${xGate}, ${gateYOffset})`}>
                  <LayoutBlock
                    title="Brama przesuwna"
                    outerW={gateWidth}
                    outerH={gateHeight}
                    withFrame
                    gaps={gate.gaps}
                    panels={gate.panels}
                    scale={scale}
                    frameVert={frameVert}
                    verticalBars={slidingVerticalBars}
                    bottomSupports={bottomSupports}
                    bottomProfile={profileCfg}
                    omega={omegaCfg}
                  />
                </g>
              )
            ) : null;

            // furtka: bazowy x + prawy wysięg bramy + lewy wysięg furtki
            const gateWidthWithLabels =
              gateType === "skrzydłowa"
                ? gateWidth + 2 * LABEL_COL_MM + 10
                : gateWidth + LABEL_COL_MM;

            const xWicket =
              (10 + spanWidth + LABEL_COL_MM + MODULE_GUTTER_MM + ol + gateWidthWithLabels + or + MODULE_GUTTER_MM + ol) * scale;

            const wicketBlock = wicket ? (
              <g transform={`translate(${xWicket}, ${wicketYOffset})`}>
                <LayoutBlock
                  title="Furtka"
                  outerW={wicketWidth}
                  outerH={wicketHeight}
                  withFrame
                  gaps={wicket.gaps}
                  panels={wicket.panels}
                  scale={scale}
                  frameVert={frameVert}
                  bottomProfile={profileCfg}
                  omega={omegaCfg}
                />
              </g>
            ) : null;

            // Δ wysokości (liczymy z dodatkami pod spodem)
            const xDeltaGate = (10 + spanWidth + LABEL_COL_MM + MODULE_GUTTER_MM / 2) * scale;
            const xDeltaWicket =
              (10 + spanWidth + LABEL_COL_MM + MODULE_GUTTER_MM + (gateWidthWithLabels + ol + or) + MODULE_GUTTER_MM / 2) * scale;

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

                {wicket && (
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
                      {`Δ: ${Math.abs((wicketHeight + wicketExtraH) - spanHeight)} mm`}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}
        </svg>
      </div>

      <div className="text-xs text-gray-500">
        * Panele i przerwy liczone do wysokości ramy. Pod ramą rysujemy (od góry): wsporniki A, profil B, omegę Ω z wysięgami L/P. Wszystkie warstwy są wliczane do wysokości całkowitej, a furtka jest automatycznie odsuwana o wysięgi, by nic się nie nakładało.
      </div>
    </div>
  );
}
