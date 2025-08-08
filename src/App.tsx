import React, { useEffect, useMemo, useRef, useState } from "react";

type Unit = "mm" | "cm" | "in";
type PanelGroup = { qty: number; t: number; inGate?: boolean };
type GapMode = "equal" | "custom";
type GateType = "none" | "skrzydłowa" | "przesuwna";
type CustomGap = { value: number | null; locked: boolean };
type GateLayout = { panels: number[]; gaps: number[]; error?: string };

type LayoutProps = {
  title: string;
  outerW: number;
  outerH: number;
  withFrame: boolean;
  gaps: number[];
  panels: number[];
  scale: number;
  frameVert: number;
};

const unitFactorToMM: Record<Unit, number> = { mm: 1, cm: 10, in: 25.4 };
const toMM = (v: number, unit: Unit) => v * unitFactorToMM[unit];
const fromMM = (vmm: number, unit: Unit) => vmm / unitFactorToMM[unit];
const roundMM = (n: number) => Math.round(n);
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

// Layout
const LABEL_COL_MM = 248;
const MODULE_GUTTER_MM = 200;
const TOP_MARGIN_MM = 546;

// === BLOK RYSUNKU ===
function LayoutBlock({
  title, outerW, outerH, withFrame, gaps, panels, scale, frameVert
}: LayoutProps) {
  const stroke = "#333";
  const fillFrame = "#94a3b8";
  const x0 = 0;
  const y0 = 0;
  const frameT = withFrame ? frameVert : 0;

  function rect(x: number, y: number, w: number, h: number, label?: string, fill = "#ddd", s = "#333") {
    const W = w * scale, H = h * scale, X = x * scale, Y = y * scale;
    return (
      <g>
        <rect x={X} y={Y} width={W} height={H} fill={fill} stroke={s} vectorEffect="non-scaling-stroke" />
        {label ? (
          <text
            x={(x + outerW) * scale + 12}
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

  const frame = (
    <g>
      <rect x={x0 * scale} y={y0 * scale} width={(outerW + LABEL_COL_MM) * scale} height={outerH * scale} fill="none" stroke={stroke} vectorEffect="non-scaling-stroke" />
      {withFrame && (
        <g>
          {rect(x0, y0, outerW, frameT, undefined, fillFrame)}
          {rect(x0, y0 + outerH - frameT, outerW, frameT, undefined, fillFrame)}
        </g>
      )}
    </g>
  );

  const elems: JSX.Element[] = [];
  let cursorY = withFrame ? frameT + (gaps[0] ?? 0) : 0;
  let gapIdx = withFrame ? 1 : 0;

  for (let i = 0; i < panels.length; i++) {
    const t = panels[i];
    elems.push(rect(x0, cursorY, outerW, t, `${t} mm`));
    cursorY += t;
    if (i < panels.length - 1) {
      const g = gaps[gapIdx++] ?? 0;
      elems.push(
        <g>
          <rect x={x0 * scale} y={cursorY * scale} width={outerW * scale} height={Math.max(0, g) * scale} fill="#f1f5f9" stroke="#64748b" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          <text
            x={(x0 + outerW) * scale + 12}
            y={(cursorY + Math.max(0, g) / 2) * scale}
            dominantBaseline="middle"
            fontSize={12}
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
          >
            {`${Math.round(g)} mm`}
          </text>
        </g>
      );
      cursorY += Math.max(0, g);
    }
  }

  if (withFrame) {
    const gBottom = gaps[gaps.length - 1] ?? 0;
    elems.push(
      <g>
        <rect x={x0 * scale} y={cursorY * scale} width={outerW * scale} height={Math.max(0, gBottom) * scale} fill="#f1f5f9" stroke="#64748b" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
        <text
          x={(x0 + outerW) * scale + 12}
          y={(cursorY + Math.max(0, gBottom) / 2) * scale}
          dominantBaseline="middle"
          fontSize={12}
          style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
        >
          {`${Math.round(gBottom)} mm`}
        </text>
      </g>
    );
  }

  const dims = (
    <g>
      <line x1={0} y1={(outerH + 20) * scale} x2={(outerW + LABEL_COL_MM) * scale} y2={(outerH + 20) * scale} stroke="#333" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" vectorEffect="non-scaling-stroke" />
      <text x={((outerW + LABEL_COL_MM) * scale) / 2} y={(outerH + 14) * scale} textAnchor="middle" fontSize={12} style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}>{`${outerW} mm`}</text>

      <line x1={(outerW + LABEL_COL_MM + 20) * scale} y1={0} x2={(outerW + LABEL_COL_MM + 20) * scale} y2={outerH * scale} stroke="#333" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" vectorEffect="non-scaling-stroke" />
      <text x={(outerW + LABEL_COL_MM + 26) * scale} y={(outerH * scale) / 2} fontSize={12} transform={`rotate(90 ${(outerW + LABEL_COL_MM + 26) * scale} ${(outerH * scale) / 2})`} style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}>{`${outerH} mm`}</text>

      <text x={0} y={-8} fontSize={14} fontWeight={600} style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}> {title} </text>
    </g>
  );

  return (
    <g>
      {frame}
      {elems}
      {dims}
    </g>
  );
}

export default function KalkulatorPalisada() {
  const [unit, setUnit] = useState<Unit>("mm");
  const [spanWidth, setSpanWidth] = useState<number>(2000);
  const [spanHeight, setSpanHeight] = useState<number>(1200);
  const [hasFrame, setHasFrame] = useState<boolean>(false);
  const [frameVert, setFrameVert] = useState<number>(60);
  const [frameHoriz, setFrameHoriz] = useState<number>(60);
  const [groups, setGroups] = useState<PanelGroup[]>([{ qty: 6, t: 100, inGate: true }]);
  const [gapMode, setGapMode] = useState<GapMode>("equal");
  const [weightedAuto, setWeightedAuto] = useState<boolean>(false);
  const [customGaps, setCustomGaps] = useState<CustomGap[]>([]);
  const [gateType, setGateType] = useState<GateType>("none");
  const [gateWidth, setGateWidth] = useState<number>(4000);
  const [gateHeight, setGateHeight] = useState<number>(1400);
  const [wicketWidth, setWicketWidth] = useState<number>(1000);
  const [wicketHeight, setWicketHeight] = useState<number>(1400);
  const [gateExtraPanels, setGateExtraPanels] = useState<number[]>([]);
  const [gateGapAfterBase, setGateGapAfterBase] = useState<number>(0);
  const [gateGapBetweenExtras, setGateGapBetweenExtras] = useState<number>(0);
  const [wicketExtraPanels, setWicketExtraPanels] = useState<number[]>([]);
  const [wicketGapAfterBase, setWicketGapAfterBase] = useState<number>(0);
  const [wicketGapBetweenExtras, setWicketGapBetweenExtras] = useState<number>(0);
  const [orderNo, setOrderNo] = useState<string>("");
  const [scale, setScale] = useState<number>(0.2);

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
  const spanInternalHeight = useMemo(() => (hasFrame ? Math.max(0, spanHeight - 2 * frameVert) : spanHeight), [hasFrame, spanHeight, frameVert]);

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

  const spanCalc = useMemo(() => {
    if (nPanels === 0) return { gaps: [] as number[], error: "" };
    if (gapMode === "equal") {
      const count = gapCountSpan;
      if (count === 0) return { gaps: [], error: "" };
      const g = (spanInternalHeight - sumPanels) / count;
      const rounded = roundMM(g);
      const gaps = Array(count).fill(rounded);
      const correction = spanInternalHeight - sumPanels - rounded * count;
      if (Math.abs(correction) >= 0.5) gaps[gaps.length - 1] = roundMM(rounded + correction);
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
    for (let i = 0; i < expected; i++) out.push(roundMM(vec[i].value == null ? autosVals[ap++] : vec[i].value!));
    const corr = spanInternalHeight - sumPanels - sum(out);
    if (Math.abs(corr) >= 0.5) out[out.length - 1] = roundMM(out[out.length - 1] + corr);
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
      // użyjemy tylko przerw między panelami, które faktycznie trafiają do bramy/furtki
      const both = (includeMask[i] ?? true) && (includeMask[i + 1] ?? true);
      if (both) mids.push(spanMidGaps[i] ?? 0);
    }
    return mids;
  }, [includeMask, nPanels, spanMidGaps]);

  const topGapForGateValue = useMemo(() => (spanGaps[0] ?? 0), [spanGaps]);

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

    gaps.push(roundMM(topGap));
    gaps.push(...baseMidGaps.map(roundMM));

    if (extraPanels.length > 0) {
      gaps.push(roundMM(Math.max(0, extraGapAfterBase)));
      for (let i = 1; i < extraPanels.length; i++) gaps.push(roundMM(Math.max(0, extraBetweenGap)));
    }

    const used = sum(basePanels) + sum(extraPanels) + sum(gaps);
    const leftover = internal - used;
    if (leftover < -0.001) return { panels: combinedPanels, gaps, error: "Za mała wysokość bramy/furtki dla wybranego układu" };

    gaps.push(roundMM(leftover));
    const corr = internal - (sum(basePanels) + sum(extraPanels)) - sum(gaps);
    if (Math.abs(corr) >= 0.5) gaps[gaps.length - 1] = roundMM(gaps[gaps.length - 1] + corr);

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

  const svgRef = useRef<SVGSVGElement | null>(null);

  // === EKSPORT ===
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
      const totalWidthMM = (svg.width.baseVal.value) / scale;
      const totalHeightMM = (svg.height.baseVal.value) / scale;

      const targetWpx = Math.round(totalWidthMM * MM_TO_IN * dpi);
      const targetHpx = Math.round(totalHeightMM * MM_TO_IN * dpi);

      const canvas = document.createElement("canvas");
      canvas.width = targetWpx;
      canvas.height = targetHpx;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetWpx, targetHpx);

      ctx.setTransform(targetWpx / svg.width.baseVal.value, 0, 0, targetHpx / svg.height.baseVal.value, 0, 0);
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

  async function exportPDFfromPNG(dpi = 300) {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgRef.current);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const pngBlob = await new Promise<Blob>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const totalWidthMM = (svgRef.current!.width.baseVal.value) / scale;
        const totalHeightMM = (svgRef.current!.height.baseVal.value) / scale;
        const targetWpx = Math.round(totalWidthMM * MM_TO_IN * dpi);
        const targetHpx = Math.round(totalHeightMM * MM_TO_IN * dpi);

        const canvas = document.createElement("canvas");
        canvas.width = targetWpx;
        canvas.height = targetHpx;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWpx, targetHpx);

        ctx.setTransform(targetWpx / svgRef.current!.width.baseVal.value, 0, 0, targetHpx / svgRef.current!.height.baseVal.value, 0, 0);
        ctx.drawImage(img, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        canvas.toBlob((b) => {
          URL.revokeObjectURL(url);
          resolve(b!);
        }, "image/png");
      };
      img.src = url;
    });

    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    const png = await pdf.embedPng(pngBytes);
    const page = pdf.addPage([png.width, png.height]);
    page.drawImage(png, { x: 0, y: 0, width: png.width, height: png.height });
    const bytes = await pdf.save();
    downloadBlob("projekt-ogrodzenia.pdf", new Blob([bytes], { type: "application/pdf" }));
  }

  const totalWidthMM = useMemo(() => {
    let w = 0;
    w += spanWidth + LABEL_COL_MM;
    if (gateType !== "none") {
      w += MODULE_GUTTER_MM;
      if (gateType === "skrzydłowa") w += gateWidth + 2 * LABEL_COL_MM + 10;
      else w += gateWidth + LABEL_COL_MM;
      w += MODULE_GUTTER_MM;
      w += wicketWidth + LABEL_COL_MM;
    }
    return w + 40;
  }, [spanWidth, gateType, gateWidth, wicketWidth]);

  const maxHeightMM = useMemo(() => {
    let h = spanHeight;
    if (gateType !== "none") h = Math.max(h, gateHeight, wicketHeight);
    return h + TOP_MARGIN_MM + 50;
  }, [spanHeight, gateType, gateHeight, wicketHeight]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Kalkulator ogrodzeń palisadowych (MVP 4)</h1>

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
            <span>Przęsło z ramą (góra/dół domyślnie 60 mm dla 60×60)</span>
          </label>
          {hasFrame && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">Profil góra/dół (mm)
                <input type="number" className="input" value={frameVert} onChange={(e) => setFrameVert(e.currentTarget.valueAsNumber || 0)} />
              </label>
              <label className="block">Profil lewo/prawo (mm)
                <input type="number" className="input" value={frameHoriz} onChange={(e) => setFrameHoriz(e.currentTarget.valueAsNumber || 0)} />
              </label>
            </div>
          )}

          <div className="mt-4 font-semibold">Grupy paneli</div>
          <div className="space-y-2">
            {groups.map((g, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 items-end">
                <label className="block">Ilość
                  <input type="number" className="input" value={g.qty} min={1} onChange={(e) => { const v = e.currentTarget.valueAsNumber || 0; const next = [...groups]; next[idx] = { ...g, qty: v }; setGroups(next); }} />
                </label>
                <label className="block">Wys. panelu (mm)
                  <input type="number" className="input" value={g.t} min={1} onChange={(e) => { const v = e.currentTarget.valueAsNumber || 0; const next = [...groups]; next[idx] = { ...g, t: v }; setGroups(next); }} />
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
                  <button className="px-2 py-1 border rounded" onClick={() => setGroups(groups.filter((_, i) => i !== idx))}>Usuń</button>
                </div>
              </div>
            ))}
            <button className="px-3 py-1 border rounded" onClick={() => setGroups([...groups, { qty: 1, t: 100, inGate: true }])}>+ Dodaj grupę</button>
            <div className="text-sm text-gray-600">Presety:{" "}
              {[20, 40, 60, 80, 100, 120, 160, 180, 200].map(p => (
                <button key={p} className="underline mr-2" onClick={() => setGroups([...groups, { qty: 1, t: p, inGate: true }])}>{p}×20</button>
              ))}
            </div>
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
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2"><input type="radio" name="gate" checked={gateType === "none"} onChange={() => setGateType("none")} /> Brak</label>
            <label className="flex items-center gap-2"><input type="radio" name="gate" checked={gateType === "skrzydłowa"} onChange={() => setGateType("skrzydłowa")} /> Skrzydłowa</label>
            <label className="flex items-center gap-2"><input type="radio" name="gate" checked={gateType === "przesuwna"} onChange={() => setGateType("przesuwna")} /> Przesuwna</label>
          </div>

          {gateType !== "none" && (
            <div>
              <label className="block">Szerokość bramy ({unit})
                <input type="number" className="input" value={fromMM(gateWidth, unit)} onChange={(e) => setGateWidth(toMM(e.currentTarget.valueAsNumber || 0, unit))} />
                <div className="text-xs text-gray-600">Dla skrzydłowej rysujemy 2 równe skrzydła po {Math.round(gateWidth / 2)} mm.</div>
              </label>
              <label className="block">Wysokość bramy ({unit})
                <input type="number" className="input" value={fromMM(gateHeight, unit)} onChange={(e) => setGateHeight(toMM(e.currentTarget.valueAsNumber || 0, unit))} />
              </label>

              <div className="mt-3 font-medium">Dodatkowe panele – tylko BRAMA</div>
              {gateExtraPanels.map((t, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <label className="block grow">Wys. panelu (mm)
                    <input type="number" className="input" value={t} onChange={(e) => {
                      const v = e.currentTarget.valueAsNumber || 0;
                      const next = [...gateExtraPanels]; next[i] = v; setGateExtraPanels(next);
                    }} />
                  </label>
                  <button className="px-2 py-1 border rounded" onClick={() => setGateExtraPanels(gateExtraPanels.filter((_, k) => k !== i))}>Usuń</button>
                </div>
              ))}
              <button className="px-3 py-1 border rounded" onClick={() => setGateExtraPanels([...gateExtraPanels, 100])}>+ Dodaj panel</button>
              {gateExtraPanels.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label className="block">Przerwa po wzorze przęsła (mm)
                    <input type="number" className="input" value={gateGapAfterBase} onChange={(e) => setGateGapAfterBase(e.currentTarget.valueAsNumber || 0)} />
                  </label>
                  <label className="block">Przerwa między dodatkowymi (mm)
                    <input type="number" className="input" value={gateGapBetweenExtras} onChange={(e) => setGateGapBetweenExtras(e.currentTarget.valueAsNumber || 0)} />
                  </label>
                </div>
              )}

              <div className="mt-4 font-medium">Furtka (opcjonalnie)</div>
              <label className="block">Szerokość furtki ({unit})
                <input type="number" className="input" value={fromMM(wicketWidth, unit)} onChange={(e) => setWicketWidth(toMM(e.currentTarget.valueAsNumber || 0, unit))} />
              </label>
              <label className="block">Wysokość furtki ({unit})
                <input type="number" className="input" value={fromMM(wicketHeight, unit)} onChange={(e) => setWicketHeight(toMM(e.currentTarget.valueAsNumber || 0, unit))} />
              </label>

              <div className="mt-3 font-medium">Dodatkowe panele – tylko FURTKA</div>
              {wicketExtraPanels.map((t, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <label className="block grow">Wys. panelu (mm)
                    <input type="number" className="input" value={t} onChange={(e) => {
                      const v = e.currentTarget.valueAsNumber || 0;
                      const next = [...wicketExtraPanels]; next[i] = v; setWicketExtraPanels(next);
                    }} />
                  </label>
                  <button className="px-2 py-1 border rounded" onClick={() => setWicketExtraPanels(wicketExtraPanels.filter((_, k) => k !== i))}>Usuń</button>
                </div>
              ))}
              <button className="px-3 py-1 border rounded" onClick={() => setWicketExtraPanels([...wicketExtraPanels, 100])}>+ Dodaj panel</button>
              {wicketExtraPanels.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label className="block">Przerwa po wzorze przęsła (mm)
                    <input type="number" className="input" value={wicketGapAfterBase} onChange={(e) => setWicketGapAfterBase(e.currentTarget.valueAsNumber || 0)} />
                  </label>
                  <label className="block">Przerwa między dodatkowymi (mm)
                    <input type="number" className="input" value={wicketGapBetweenExtras} onChange={(e) => setWicketGapBetweenExtras(e.currentTarget.valueAsNumber || 0)} />
                  </label>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Kolumna 3 – Podsumowanie */}
        <div className="space-y-2 p-3 rounded-xl border text-sm">
          <div className="font-semibold">Podsumowanie</div>
          <div>Liczba paneli (przęsło): <b>{nPanels}</b></div>
          <div>Suma paneli: <b>{Math.round(sumPanels)} mm</b></div>
          <div>Wysokość wewnętrzna przęsła: <b>{Math.round(spanInternalHeight)} mm</b></div>
          <div>Przerw (przęsło): <b>{gapCountSpan}</b></div>

          {baseError ? (
            <div className="text-red-600">{baseError}</div>
          ) : spanGapError ? (
            <div className="text-red-600">{spanGapError}</div>
          ) : (
            <div>
              <div className="font-medium mt-2">Przerwy przęsła:</div>
              <div className="flex flex-wrap gap-1">
                {spanGaps.map((g, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-100 rounded">{`${g} mm`}</span>
                ))}
              </div>
            </div>
          )}

          {gateType !== "none" && (
            <div>
              <div className="font-medium mt-2">Brama:</div>
              {gate?.error ? (
                <div className="text-red-600">{gate.error}</div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {gate?.gaps?.map((g, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 rounded">{`${g} mm`}</span>
                  ))}
                </div>
              )}

              <div className="font-medium mt-2">Furtka:</div>
              {wicket?.error ? (
                <div className="text-red-600">{wicket.error}</div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {wicket?.gaps?.map((g, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 rounded">{`${g} mm`}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
	  
	  {/* Pasek eksportu – zawsze widoczny */}
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
    {/* Jeśli chcesz też PDF z PNG:
    <button className="px-3 py-2 rounded border" onClick={() => exportPDFfromPNG(300)}>
      PDF (z PNG)
    </button> */}
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

          {/* NAGŁÓWEK + PODSUMOWANIE w SVG */}
          <g>
            <text x={10} y={12} fontSize={12} fontWeight={600}>
              Nr zlecenia/oferty: {orderNo || "-"}
            </text>
            <text x={260} y={12} fontSize={12}>
              Skala podglądu: {scale.toFixed(2)} px/mm
            </text>
            {[
              `Panele: ${nPanels} szt.; suma: ${Math.round(sumPanels)} mm; wewn. przęsła: ${Math.round(spanInternalHeight)} mm`,
              `Przerwy przęsła: ${spanGaps.join(" ") || "-"}`,
              gate ? `Brama – przerwy: ${gate.gaps.join(" ")}` : null,
              wicket ? `Furtka – przerwy: ${wicket.gaps.join(" ")}` : null,
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
                />
              </g>
            );
          })()}

          {/* BRAMA + FURTKA */}
          {gateType !== "none" && (() => {
            const gateYOffset = TOP_MARGIN_MM * scale;
            const wicketYOffset = gateYOffset;

            const xGate =
              (10 + spanWidth + LABEL_COL_MM + MODULE_GUTTER_MM) * scale;

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
                  />
                </g>
              )
            ) : null;

            const gateWidthWithLabels =
              gateType === "skrzydłowa"
                ? gateWidth + 2 * LABEL_COL_MM + 10
                : gateWidth + LABEL_COL_MM;

            const xWicket =
              (10 +
                spanWidth +
                LABEL_COL_MM +
                MODULE_GUTTER_MM +
                gateWidthWithLabels +
                MODULE_GUTTER_MM) *
              scale;

            const wicketBlock = wicket ? (
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
                />
              </g>
            ) : null;

            const xDeltaGate =
              (10 + spanWidth + LABEL_COL_MM + MODULE_GUTTER_MM / 2) * scale;
            const xDeltaWicket =
              (10 +
                spanWidth +
                LABEL_COL_MM +
                MODULE_GUTTER_MM +
                gateWidthWithLabels +
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
                      y2={(TOP_MARGIN_MM + gateHeight) * scale}
                      stroke="#333"
                      markerStart="url(#arrowhead)"
                      markerEnd="url(#arrowhead)"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      x={xDeltaGate + 3}
                      y={(TOP_MARGIN_MM + Math.min(gateHeight, spanHeight) + Math.abs(gateHeight - spanHeight) / 2) * scale}
                      fontSize={12}
                      style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
                    >
                      {`Δ: ${Math.abs(gateHeight - spanHeight)} mm`}
                    </text>
                  </g>
                )}

                {wicket && (
                  <g>
                    <line
                      x1={xDeltaWicket}
                      x2={xDeltaWicket}
                      y1={(TOP_MARGIN_MM + spanHeight) * scale}
                      y2={(TOP_MARGIN_MM + wicketHeight) * scale}
                      stroke="#333"
                      markerStart="url(#arrowhead)"
                      markerEnd="url(#arrowhead)"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      x={xDeltaWicket + 3}
                      y={(TOP_MARGIN_MM + Math.min(wicketHeight, spanHeight) + Math.abs(wicketHeight - spanHeight) / 2) * scale}
                      fontSize={12}
                      style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}
                    >
                      {`Δ: ${Math.abs(wicketHeight - spanHeight)} mm`}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}
        </svg>
      </div>

      <div className="text-xs text-gray-500">
        * Zaokrąglanie do 1 mm. Panele są wyrównane w pionie między elementami. Brama skrzydłowa rysowana jako dwa równe skrzydła.
      </div>
    </div>
  );
}
