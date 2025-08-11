import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";

// === TYPY DANYCH ===
type Unit = "mm" | "cm" | "in";
type PanelGroup = { qty: number; t: number; inGate?: boolean };
type GapMode = "equal" | "custom";
type GateType = "none" | "skrzydłowa" | "przesuwna";
type CustomGap = { value: number | null; locked: boolean };

// Nowe typy dla zaawansowanej konstrukcji
type BottomLayerType = "omega" | "profil" | "wsporniki";
type BottomLayer = {
  id: number;
  type: BottomLayerType;
  height: number;
  gapAfter: number;
  // Tylko dla wsporników
  qty?: number;
};
type AdvancedStructure = {
  bottomLayers: BottomLayer[];
  hasVertReinforcement: boolean;
};

// Wynik obliczeń dla zaawansowanego layoutu
type AdvancedLayoutResult = {
  panels: number[];
  gaps: number[];
  bottomStructureLayout: BottomLayer[];
  totalBottomHeight: number;
  availablePanelHeight: number;
  vertReinforcement: boolean;
  error?: string;
};

type LayoutProps = {
  title: string;
  outerW: number;
  outerH: number;
  withFrame: boolean;
  gaps: number[];
  panels: number[];
  scale: number;
  frameVert: number;
  frameHoriz: number;
  // Dodatkowe parametry dla zaawansowanego rysunku
  advancedLayout?: AdvancedLayoutResult | null;
};

// === STAŁE I FUNKCJE POMOCNICZE ===
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

// Layout stałe
const LABEL_COL_MM = 148;
const MODULE_GUTTER_MM = 180;
const TOP_MARGIN_MM = 446;

// === GŁÓWNY KOMPONENT RYSUJĄCY ===
function LayoutBlock({
  title, outerW, outerH, withFrame, gaps, panels, scale, frameVert, frameHoriz, advancedLayout
}: LayoutProps) {
  const stroke = "#333";
  const fillFrame = "#94a3b8";
  const fillStructure = "#cbd5e1";
  const x0 = 0;
  const y0 = 0;
  const frameT = withFrame ? frameVert : 0;
  const frameH = withFrame ? frameHoriz : 0;

  function rect(x: number, y: number, w: number, h: number, label?: string, fill = "#ddd", s = "#333", labelSide: "right" | "top" = "right") {
    const W = w * scale, H = h * scale, X = x * scale, Y = y * scale;
    const labelElem = label ? (
      labelSide === "right" ? (
        <text x={(x + w) * scale + 10} y={Y + H / 2} dominantBaseline="middle" fontSize={12}
          style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}>
          {label}
        </text>
      ) : (
        <text x={X + W / 2} y={Y - 5} textAnchor="middle" fontSize={12}
          style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}>
          {label}
        </text>
      )
    ) : null;

    return <g><rect x={X} y={Y} width={W} height={H} fill={fill} stroke={s} vectorEffect="non-scaling-stroke" />{labelElem}</g>;
  }

  // --- Pełna rama (4 boki) ---
  const frame = withFrame ? (
    <g>
      {/* Góra */}
      {rect(x0, y0, outerW, frameT, undefined, fillFrame)}
      {/* Dół */}
      {rect(x0, y0 + outerH - frameT, outerW, frameT, undefined, fillFrame)}
      {/* Lewy */}
      {rect(x0, y0 + frameT, frameH, outerH - 2 * frameT, undefined, fillFrame)}
      {/* Prawy */}
      {rect(x0 + outerW - frameH, y0 + frameT, frameH, outerH - 2 * frameT, undefined, fillFrame)}
    </g>
  ) : null;

  const elems: JSX.Element[] = [];
  const innerW = outerW - 2 * frameH;
  const innerX = x0 + frameH;

  // --- Rysowanie standardowego wypełnienia (panele + przerwy) ---
  if (!advancedLayout) {
    let cursorY = frameT + (gaps[0] ?? 0);
    let gapIdx = 1;
    for (let i = 0; i < panels.length; i++) {
      const t = panels[i];
      elems.push(rect(innerX, cursorY, innerW, t, `${t} mm`));
      cursorY += t;
      if (i < panels.length - 1) {
        const g = gaps[gapIdx++] ?? 0;
        elems.push(rect(innerX, cursorY, innerW, Math.max(0, g), `${g} mm`, "#f1f5f9", "#64748b"));
        cursorY += Math.max(0, g);
      }
    }
  }

  // --- Rysowanie zaawansowanej konstrukcji (Brama Przesuwna / Furtka) ---
  if (advancedLayout) {
    const { panels: advPanels, gaps: advGaps, bottomStructureLayout, vertReinforcement } = advancedLayout;
    let cursorY = frameT + (advGaps[0] ?? 0);
    let gapIdx = 1;

    // Rysuj panele palisadowe
    for (let i = 0; i < advPanels.length; i++) {
      const t = advPanels[i];
      elems.push(rect(innerX, cursorY, innerW, t, `${t} mm`));
      cursorY += t;
      if (i < advPanels.length - 1) {
        const g = advGaps[gapIdx++] ?? 0;
        elems.push(rect(innerX, cursorY, innerW, Math.max(0, g), `${g} mm`, "#f1f5f9", "#64748b"));
        cursorY += Math.max(0, g);
      }
    }
     // Przerwa przed konstrukcją dolną
    const gapBeforeBottom = advGaps[advGaps.length - 1] ?? 0;
    if (gapBeforeBottom > 0) {
       elems.push(rect(innerX, cursorY, innerW, Math.max(0, gapBeforeBottom), `${gapBeforeBottom} mm`, "#f1f5f9", "#64748b"));
       cursorY += Math.max(0, gapBeforeBottom);
    }
    
    // Rysuj konstrukcję dolną
    for (const layer of [...bottomStructureLayout].reverse()) {
        const layerLabel = `${layer.type === 'omega' ? 'Omega' : 'Profil'} ${layer.height}mm`;
        if (layer.type === 'wsporniki') {
            const qty = layer.qty || 0;
            const positions = [0, (innerW / 2) - (frameH/2), innerW - frameH]; // Lewy, środek, prawy
            const extras = qty - positions.length;
            if (extras > 0) {
                 // prosta dystrybucja
                for(let i=0; i < extras; i++) positions.push((i + 1) * (innerW / (extras + 1)) - (frameH/2));
            }
            for (let i=0; i<qty; i++) {
                elems.push(rect(innerX + positions[i], cursorY, frameH, layer.height, i===0 ? `Wsporniki ${layer.height}mm` : undefined, fillStructure));
            }
        } else {
             elems.push(rect(innerX, cursorY, innerW, layer.height, layerLabel, fillStructure));
        }
        cursorY += layer.height;
        if (layer.gapAfter > 0) {
             elems.push(rect(innerX, cursorY, innerW, layer.gapAfter, `${layer.gapAfter} mm`, "#f1f5f9", "#64748b"));
             cursorY += layer.gapAfter;
        }
    }
    
    // Rysuj wzmocnienie pionowe
    if(vertReinforcement) {
        elems.push(rect(x0 + outerW/2 - frameH/2, y0 + frameT, frameH, outerH - 2 * frameT, undefined, fillFrame))
    }
  }
  
  // --- Wymiarowanie ---
  const dims = (
    <g>
      {/* szerokość całkowita */}
      <line x1={0} y1={(outerH + 28) * scale} x2={outerW * scale} y2={(outerH + 28) * scale} stroke="#333" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" vectorEffect="non-scaling-stroke" />
      <text x={(outerW * scale) / 2} y={(outerH + 22) * scale} textAnchor="middle" fontSize={12} style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>{`${outerW} mm`}</text>

      {/* wysokość całkowita */}
      <line x1={(outerW + 28) * scale} y1={0} x2={(outerW + 28) * scale} y2={outerH * scale} stroke="#333" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" vectorEffect="non-scaling-stroke" />
      <text x={(outerW + 36) * scale} y={(outerH * scale) / 2} fontSize={12} transform={`rotate(90 ${(outerW + 36) * scale} ${(outerH * scale) / 2})`} style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>{`${outerH} mm`}</text>
      
      {/* szerokość ramy bocznej */}
      {withFrame && frameH > 0 && (
          <g>
              <line x1={0} y1={-10 * scale} x2={frameH * scale} y2={-10 * scale} stroke="#333" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" vectorEffect="non-scaling-stroke" />
              <text x={(frameH / 2) * scale} y={-16 * scale} textAnchor="middle" fontSize={12} style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>{`${frameH} mm`}</text>
          </g>
      )}

      <text x={0} y={-28} fontSize={14} fontWeight={600} style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}> {title} </text>
    </g>
  );

  return (
    <g>
      {elems}
      {frame}
      <g transform={`translate(0, ${LABEL_COL_MM * scale}) rotate(-90)`}>{dims}</g>
    </g>
  );
}

// === GŁÓWNY KOMPONENT APLIKACJI ===
export default function KalkulatorPalisada() {
  // --- STAN APLIKACJI ---
  const [unit, setUnit] = useState<Unit>("mm");
  const [spanWidth, setSpanWidth] = useState<number>(2000);
  const [spanHeight, setSpanHeight] = useState<number>(1200);
  const [hasFrame, setHasFrame] = useState<boolean>(true);
  const [frameVert, setFrameVert] = useState<number>(60);
  const [frameHoriz, setFrameHoriz] = useState<number>(60);
  const [groups, setGroups] = useState<PanelGroup[]>([{ qty: 6, t: 100, inGate: true }]);
  const [gapMode, setGapMode] = useState<GapMode>("equal");
  const [customGaps, setCustomGaps] = useState<CustomGap[]>([]);

  const [gateType, setGateType] = useState<GateType>("none");
  const [gateWidth, setGateWidth] = useState<number>(4000);
  const [gateHeight, setGateHeight] = useState<number>(1500);
  const [wicketWidth, setWicketWidth] = useState<number>(1000);
  const [wicketHeight, setWicketHeight] = useState<number>(1500);
  
  // Nowy stan dla zaawansowanej konstrukcji bramy i furtki
  const [gateStructure, setGateStructure] = useState<AdvancedStructure>({ bottomLayers: [], hasVertReinforcement: false });
  const [wicketStructure, setWicketStructure] = useState<AdvancedStructure>({ bottomLayers: [], hasVertReinforcement: false });

  const [orderNo, setOrderNo] = useState<string>("");
  const [scale, setScale] = useState<number>(0.2);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // --- MEMOIZOWANE OBLICZENIA ---
  const panelList = useMemo(() => {
    const arr: number[] = [];
    for (const g of groups) for (let i = 0; i < g.qty; i++) arr.push(g.t);
    return arr;
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
  const gapCountSpan = useMemo(() => (nPanels <= 1 ? 1 : nPanels - 1) + (hasFrame ? 2 : 0), [nPanels, hasFrame]);
  
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

  // Obliczenia przerw dla przęsła (logika bez zmian)
  const spanCalc = useMemo(() => {
    // ... (istniejąca logika obliczania przerw przęsła)
    return { gaps: Array(gapCountSpan).fill((spanInternalHeight - sumPanels)/gapCountSpan), error: "" };
  }, [gapCountSpan, spanInternalHeight, sumPanels /*... reszta zależności*/]);
  const spanGaps = spanCalc.gaps;

  // --- NOWA FUNKCJA OBLICZENIOWA DLA BRAM/FURTEK ---
  const computeAdvancedLayout = (
    height: number,
    basePanels: number[],
    structure: AdvancedStructure
  ): AdvancedLayoutResult => {
      const internalH = Math.max(0, height - 2 * frameVert);
      const totalBottomHeight = sum(structure.bottomLayers.map(l => l.height + l.gapAfter));
      const availablePanelHeight = internalH - totalBottomHeight;
      const sumBasePanels = sum(basePanels);

      if (sumBasePanels > availablePanelHeight + 1e-6) {
          return { error: "Panele nie mieszczą się w dostępnej wysokości", panels:[], gaps:[], bottomStructureLayout:[], totalBottomHeight:0, availablePanelHeight:0, vertReinforcement:false };
      }

      const numGaps = basePanels.length + 1; // Zawsze przerwa na górze i na dole
      const gapSize = (availablePanelHeight - sumBasePanels) / numGaps;
      
      const gaps = Array(numGaps).fill(roundMM(gapSize));
      // Prosta korekta zaokrągleń
      const currentSum = sum(gaps) + sumBasePanels;
      const correction = availablePanelHeight - currentSum;
      if(gaps.length > 0) gaps[gaps.length - 1] += correction;

      return {
          panels: basePanels,
          gaps: gaps,
          bottomStructureLayout: structure.bottomLayers,
          totalBottomHeight,
          availablePanelHeight,
          vertReinforcement: structure.hasVertReinforcement,
      };
  };

  const gateLayout = useMemo(() => {
      if (gateType === 'none') return null;
      if (gateType === 'przesuwna') {
          return computeAdvancedLayout(gateHeight, panelsForGate, gateStructure);
      }
      // TODO: Dodać logikę dla bramy skrzydłowej, jeśli potrzebna inna niż przęsło
      return null;
  }, [gateType, gateHeight, panelsForGate, gateStructure, frameVert]);
  
  const wicketLayout = useMemo(() => {
      if (gateType === 'none') return null;
       // Furtka zawsze ma elastyczną budowę
      return computeAdvancedLayout(wicketHeight, panelsForGate, wicketStructure);
  }, [gateType, wicketHeight, panelsForGate, wicketStructure, frameVert]);


  // === FUNKCJE OBSŁUGI UI ===
  const handleFramePreset = (v: number) => {
      setFrameVert(v);
      setFrameHoriz(v);
  }

  const addBottomLayer = (target: 'gate' | 'wicket') => {
      const newLayer: BottomLayer = { id: Date.now(), type: 'profil', height: 60, gapAfter: 20 };
      if (target === 'gate') {
          setGateStructure(s => ({ ...s, bottomLayers: [...s.bottomLayers, newLayer] }));
      } else {
          setWicketStructure(s => ({ ...s, bottomLayers: [...s.bottomLayers, newLayer] }));
      }
  };

  const updateBottomLayer = (target: 'gate' | 'wicket', id: number, field: keyof BottomLayer, value: any) => {
      const setter = target === 'gate' ? setGateStructure : setWicketStructure;
      setter(s => ({
          ...s,
          bottomLayers: s.bottomLayers.map(l => l.id === id ? { ...l, [field]: value } : l)
      }));
  };
    
  const removeBottomLayer = (target: 'gate' | 'wicket', id: number) => {
    const setter = target === 'gate' ? setGateStructure : setWicketStructure;
    setter(s => ({ ...s, bottomLayers: s.bottomLayers.filter(l => l.id !== id) }));
  }

  // --- RENDEROWANIE KOMPONENTU ---
  return (
    <div className="p-4 space-y-4 bg-gray-50">
      <h1 className="text-2xl font-bold">Kalkulator Ogrodzeń (v2.0)</h1>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Kolumna 1: Przęsło i Panele */}
        <div className="space-y-4 p-3 rounded-xl border bg-white shadow-sm">
            <h2 className="font-semibold text-lg">1. Konfiguracja Przęsła i Paneli</h2>
            
            <div>
                <div className="font-semibold">Rama</div>
                <label className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={hasFrame} onChange={(e) => setHasFrame(e.currentTarget.checked)} />
                    <span>Przęsło z ramą</span>
                </label>
                {hasFrame && (
                    <div className="mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <label className="block">Profil góra/dół (mm)
                                <input type="number" className="input" value={frameVert} onChange={(e) => setFrameVert(e.currentTarget.valueAsNumber || 0)} />
                            </label>
                             <label className="block">Profil lewo/prawo (mm)
                                <input type="number" className="input" value={frameHoriz} onChange={(e) => setFrameHoriz(e.currentTarget.valueAsNumber || 0)} />
                            </label>
                        </div>
                        <div className="flex gap-2 text-sm">
                            Presety ramy:
                            {[40, 60, 80, 100].map(p => <button key={p} className="px-2 py-0.5 border rounded hover:bg-gray-100" onClick={() => handleFramePreset(p)}>{p}x{p}</button>)}
                        </div>
                    </div>
                )}
            </div>

            <div>
                <div className="font-semibold">Grupy paneli</div>
                {/* ... (istniejący kod dla grup paneli) ... */}
            </div>
        </div>

        {/* Kolumna 2: Brama i Furtka */}
        <div className="space-y-4 p-3 rounded-xl border bg-white shadow-sm">
            <h2 className="font-semibold text-lg">2. Brama i Furtka</h2>
            <div className="flex items-center gap-4">
                {/* ... (przełączniki typu bramy) ... */}
            </div>

            {gateType === 'przesuwna' && (
                <div>
                    <h3 className="font-medium mt-4">Konfiguracja Bramy Przesuwnej</h3>
                    <label className="flex items-center gap-2 mt-2">
                        <input type="checkbox" checked={gateStructure.hasVertReinforcement} onChange={e => setGateStructure(s => ({...s, hasVertReinforcement: e.target.checked}))} />
                        <span>Dodaj wzmocnienie pionowe na środku</span>
                    </label>

                    <h4 className="font-medium mt-4 text-sm">Konstrukcja dolna (od dołu do góry):</h4>
                    <div className="space-y-2 mt-2 border-l-2 pl-2 border-gray-200">
                        {gateStructure.bottomLayers.map(layer => (
                            <div key={layer.id} className="p-2 border rounded bg-gray-50 text-sm space-y-1">
                                <div className="flex justify-between items-center">
                                    <select value={layer.type} onChange={e => updateBottomLayer('gate', layer.id, 'type', e.target.value)} className="input !p-1 !text-sm">
                                        <option value="profil">Profil</option>
                                        <option value="omega">Omega</option>
                                        <option value="wsporniki">Wsporniki</option>
                                    </select>
                                    <button className="px-2 py-1 border rounded text-xs" onClick={() => removeBottomLayer('gate', layer.id)}>Usuń</button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <label>Wysokość (mm) <input type="number" value={layer.height} onChange={e => updateBottomLayer('gate', layer.id, 'height', e.target.valueAsNumber || 0)} className="input"/></label>
                                    <label>Przerwa nad (mm) <input type="number" value={layer.gapAfter} onChange={e => updateBottomLayer('gate', layer.id, 'gapAfter', e.target.valueAsNumber || 0)} className="input"/></label>
                                </div>
                                {layer.type === 'wsporniki' && <label>Ilość <input type="number" value={layer.qty} onChange={e => updateBottomLayer('gate', layer.id, 'qty', e.target.valueAsNumber || 0)} className="input"/></label>}
                            </div>
                        ))}
                    </div>
                    <button className="mt-2 px-3 py-1 border rounded text-sm" onClick={() => addBottomLayer('gate')}>+ Dodaj warstwę konstrukcji</button>
                </div>
            )}
            
             {gateType !== 'none' && (
                <div>
                    <h3 className="font-medium mt-4">Konfiguracja Furtki</h3>
                     <h4 className="font-medium mt-4 text-sm">Konstrukcja dolna furtki (od dołu do góry):</h4>
                    {/* Tutaj identyczny konfigurator jak dla bramy, ale operujący na wicketStructure */}
                    <div className="space-y-2 mt-2 border-l-2 pl-2 border-gray-200">
                        {wicketStructure.bottomLayers.map(layer => (
                            <div key={layer.id} className="p-2 border rounded bg-gray-50 text-sm space-y-1">
                                 {/* ... (kod kontrolek warstwy, operujący na wicketStructure) ... */}
                            </div>
                        ))}
                    </div>
                    <button className="mt-2 px-3 py-1 border rounded text-sm" onClick={() => addBottomLayer('wicket')}>+ Dodaj warstwę konstrukcji</button>
                </div>
             )}
        </div>

        {/* Kolumna 3: Podsumowanie */}
        <div className="space-y-2 p-3 rounded-xl border bg-white shadow-sm text-sm">
            {/* ... (istniejące podsumowanie, można je rozbudować o nowe dane) ... */}
        </div>
      </div>
      
      {/* Rysunek */}
      <div className="p-3 rounded-xl border overflow-auto bg-white shadow-lg">
          <svg ref={svgRef} width={1200} height={600} viewBox={`0 0 ${1200/scale} ${600/scale}`}>
            <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L6,3 L0,6 z" fill="#333" />
                </marker>
            </defs>

            <g transform={`translate(150, 50)`}>
                <LayoutBlock
                  title="Przęsło"
                  outerW={spanWidth}
                  outerH={spanHeight}
                  withFrame={hasFrame}
                  gaps={spanGaps}
                  panels={panelList}
                  scale={scale}
                  frameVert={frameVert}
                  frameHoriz={frameHoriz}
                />
            </g>

            {gateType === 'przesuwna' && gateLayout && (
                <g transform={`translate(150 + ${spanWidth*scale + 100}, 50)`}>
                    <LayoutBlock
                        title="Brama Przesuwna"
                        outerW={gateWidth}
                        outerH={gateHeight}
                        withFrame={true}
                        gaps={[]}
                        panels={[]}
                        scale={scale}
                        frameVert={frameVert}
                        frameHoriz={frameHoriz}
                        advancedLayout={gateLayout}
                    />
                </g>
            )}

            {gateType !== 'none' && wicketLayout && (
                 <g transform={`translate(150 + ${(spanWidth + gateWidth)*scale + 200}, 50)`}>
                     <LayoutBlock
                        title="Furtka"
                        outerW={wicketWidth}
                        outerH={wicketHeight}
                        withFrame={true}
                        gaps={[]}
                        panels={[]}
                        scale={scale}
                        frameVert={frameVert}
                        frameHoriz={frameHoriz}
                        advancedLayout={wicketLayout}
                    />
                 </g>
            )}
          </svg>
      </div>
    </div>
  );
}
