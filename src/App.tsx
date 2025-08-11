import { useMemo, useState } from "react";
import type { JSX } from "react";

// === GŁÓWNE TYPY DANYCH ===

/** Grupa identycznych paneli do wypełnienia */
type PanelGroup = { id: number; qty: number; t: number; inGate?: boolean };

/** Typ bramy */
type GateType = "none" | "skrzydłowa" | "przesuwna";

/** Typ warstwy w konstrukcji pod ramą */
type UnderFrameLayerType = "omega" | "profil" | "wsporniki";

/** Pojedyncza warstwa w konstrukcji pod ramą */
type UnderFrameLayer = {
  id: number;
  type: UnderFrameLayerType;
  height: number;
  gapAfter: number; // Przerwa *pod* tą warstwą
  qty: number;
};

/** Pojedynczy panel dodany do wypełnienia wewnętrznego */
type InternalPanel = { 
  id: number; 
  height: number 
};

/** Kompletna struktura dla elementu zaawansowanego (brama/furtka) */
type AdvancedStructure = {
  underFrameLayers: UnderFrameLayer[];
  hasVertReinforcement: boolean;
  internalPanels: InternalPanel[];
};

/** Wynik obliczeń dla wypełnienia wewnątrz ramy */
type InternalLayoutResult = {
  panels: number[];
  gaps: number[];
  error?: string;
};

/** Właściwości komponentu rysującego */
type LayoutProps = {
  title: string;
  outerW: number; // Szerokość całkowita
  outerH: number; // Wysokość samej ramy
  withFrame: boolean;
  frameVert: number;
  frameHoriz: number;
  internalLayout: InternalLayoutResult;
  underFrameLayers: UnderFrameLayer[];
  hasVertReinforcement: boolean;
};

// === FUNKCJE POMOCNICZE ===
const roundMM = (n: number) => Math.round(n);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

// === KOMPONENT RYSUJĄCY (SVG) ===
function LayoutBlock({
  title, outerW, outerH, withFrame, frameVert, frameHoriz, internalLayout, underFrameLayers, hasVertReinforcement
}: LayoutProps) {
  const fillFrame = "#94a3b8";
  const fillStructure = "#cbd5e1";
  const x0 = 0;
  const y0 = 0;
  const frameT = withFrame ? frameVert : 0;
  const frameH = withFrame ? frameHoriz : 0;

  function rect(x: number, y: number, w: number, h: number, label?: string, fill = "#ddd", s = "#333") {
    const labelElem = label ? (
        <text x={x + w + 10} y={y + h / 2} dominantBaseline="middle" fontSize={12}
          style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, fontVariantNumeric: "tabular-nums" }}>
          {label}
        </text>
    ) : null;
    return <g><rect x={x} y={y} width={w} height={h} fill={fill} stroke={s} vectorEffect="non-scaling-stroke" />{labelElem}</g>;
  }

  // --- Główna rama ---
  const frame = withFrame ? (
    <g>
      {rect(x0, y0, outerW, frameT, undefined, fillFrame)}
      {rect(x0, y0 + outerH - frameT, outerW, frameT, undefined, fillFrame)}
      {rect(x0, y0 + frameT, frameH, outerH - 2 * frameT, undefined, fillFrame)}
      {rect(x0 + outerW - frameH, y0 + frameT, frameH, outerH - 2 * frameT, undefined, fillFrame)}
    </g>
  ) : null;

  const elems: JSX.Element[] = [];
  const innerW = outerW - 2 * frameH;
  const innerX = x0 + frameH;

  // --- Wypełnienie WEWNĄTRZ ramy ---
  const { panels, gaps } = internalLayout;
  let cursorY = frameT;
  for (let i = 0; i < panels.length; i++) {
    const g_before = gaps[i] ?? 0;
    cursorY += g_before;
    elems.push(rect(innerX, cursorY, innerW, panels[i], `${panels[i]} mm`));
    elems.push(rect(innerX, cursorY - g_before, innerW, g_before, `${roundMM(g_before)} mm`, "#f1f5f9", "#64748b"));
    cursorY += panels[i];
  }
  const g_after = gaps[panels.length] ?? 0;
  elems.push(rect(innerX, cursorY, innerW, g_after, `${roundMM(g_after)} mm`, "#f1f5f9", "#64748b"));

  // --- Wzmocnienie pionowe WEWNĄTRZ ramy ---
  if(hasVertReinforcement) {
      elems.push(rect(x0 + outerW/2 - frameH/2, y0 + frameT, frameH, outerH - 2 * frameT, undefined, fillFrame))
  }

  // --- Konstrukcja POD ramą ---
  let underFrameCursorY = outerH;
  for (const layer of underFrameLayers) {
      const layerLabel = `${layer.type === 'omega' ? 'Omega' : 'Profil'} ${layer.height}mm`;
      if (layer.type === 'wsporniki') {
          const qty = layer.qty || 0;
          const positions = [];
          if (qty > 0) positions.push(0);
          if (qty > 1) positions.push(outerW - frameH);
          if (qty > 2 && hasVertReinforcement) positions.push((outerW / 2) - (frameH/2));
          const extras = qty - positions.length;
          if (extras > 0) {
              for(let i=0; i < extras; i++) positions.push((i + 1) * (outerW / (extras + 1)) - (frameH/2));
          }
          for (let i=0; i<qty; i++) {
              elems.push(rect(x0 + positions[i], underFrameCursorY, frameH, layer.height, i===0 ? `Wsporniki ${layer.height}mm` : undefined, fillStructure));
          }
      } else {
           elems.push(rect(x0, underFrameCursorY, outerW, layer.height, layerLabel, fillStructure));
      }
      underFrameCursorY += layer.height;
      if (layer.gapAfter > 0) {
           elems.push(rect(x0, underFrameCursorY, outerW, layer.gapAfter, `${layer.gapAfter} mm`, "#f1f5f9", "#64748b"));
           underFrameCursorY += layer.gapAfter;
      }
  }
  const totalUnderFrameHeight = underFrameCursorY - outerH;
  const totalHeight = outerH + totalUnderFrameHeight;

  // --- Wymiarowanie ---
  const dims = (
    <g>
      <text x={0} y={-40} fontSize={14} fontWeight={600}>{title}</text>
      {/* Szerokość */}
      <line x1={0} y1={totalHeight + 28} x2={outerW} y2={totalHeight + 28} stroke="#333" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" />
      <text x={outerW / 2} y={totalHeight + 22} textAnchor="middle" fontSize={12}>{`${outerW} mm`}</text>
      {/* Wymiar całkowity */}
      <line x1={outerW + 60} y1={0} x2={outerW + 60} y2={totalHeight} stroke="#333" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" />
      <text x={outerW + 68} y={totalHeight / 2} fontSize={12} transform={`rotate(90 ${outerW + 68} ${totalHeight/2})`}>Całkowita: {totalHeight} mm</text>
      {/* Wymiar ramy */}
      <line x1={outerW + 28} y1={0} x2={outerW + 28} y2={outerH} stroke="#333" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" />
      <text x={outerW + 36} y={outerH / 2} fontSize={12} transform={`rotate(90 ${outerW + 36} ${outerH/2})`}>Rama: {outerH} mm</text>
      {/* Wymiar konstrukcji pod */}
      {totalUnderFrameHeight > 0 && <>
        <line x1={outerW + 28} y1={outerH} x2={outerW + 28} y2={totalHeight} stroke="#333" markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" />
        <text x={outerW + 36} y={outerH + totalUnderFrameHeight/2} fontSize={12} transform={`rotate(90 ${outerW + 36} ${outerH + totalUnderFrameHeight/2})`}>Pod: {totalUnderFrameHeight} mm</text>
      </>}
    </g>
  );

  return <g>{elems}{frame}{dims}</g>;
}

// === GŁÓWNY KOMPONENT APLIKACJI ===
export default function KalkulatorPalisada() {
  // --- Stan Aplikacji ---
  const [spanWidth, setSpanWidth] = useState<number>(2000);
  const [spanHeight, setSpanHeight] = useState<number>(1200);
  const [hasFrame, setHasFrame] = useState<boolean>(true);
  const [frameVert, setFrameVert] = useState<number>(60);
  const [frameHoriz, setFrameHoriz] = useState<number>(60);
  const [groups, setGroups] = useState<PanelGroup[]>([{ id: 1, qty: 6, t: 100, inGate: true }]);
  const [gateType, setGateType] = useState<GateType>("przesuwna");
  const [gateWidth, setGateWidth] = useState<number>(4000);
  const [gateHeight, setGateHeight] = useState<number>(1500); // Wysokość samej ramy bramy
  const [wicketWidth, setWicketWidth] = useState<number>(1000);
  const [wicketHeight, setWicketHeight] = useState<number>(1500); // Wysokość samej ramy furtki
  
  const [gateStructure, setGateStructure] = useState<AdvancedStructure>({ 
    underFrameLayers: [
        {id: 1, type: 'omega', height: 80, gapAfter: 10, qty: 1},
        {id: 2, type: 'profil', height: 60, gapAfter: 0, qty: 1},
    ], 
    hasVertReinforcement: true,
    internalPanels: []
  });
  const [wicketStructure, setWicketStructure] = useState<AdvancedStructure>({ underFrameLayers: [], hasVertReinforcement: false, internalPanels: [] });
  const [scale, setScale] = useState<number>(0.25);

  // --- Obliczenia (Memoized) ---
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

  const spanInternalHeight = useMemo(() => (hasFrame ? Math.max(0, spanHeight - 2 * frameVert) : spanHeight), [hasFrame, spanHeight, frameVert]);
  
  const spanLayout = useMemo((): InternalLayoutResult => {
    if (panelList.length === 0) return { panels: [], gaps: [], error: "Brak paneli" };
    const availableHeight = spanInternalHeight;
    const sumP = sum(panelList);
    if (sumP > availableHeight + 1e-6) return { panels: [], gaps: [], error: "Panele za wysokie" };
    const numGaps = (hasFrame ? panelList.length + 1 : (panelList.length > 1 ? panelList.length - 1 : 0));
    if (numGaps <= 0) return { panels: panelList, gaps: [], error: "" };
    const gapSize = (availableHeight - sumP) / numGaps;
    const gaps = Array(numGaps).fill(roundMM(gapSize));
    const correction = availableHeight - sumP - sum(gaps);
    if(gaps.length > 0) gaps[gaps.length-1] += correction;
    return { panels: panelList, gaps, error: "" };
  }, [panelList, spanInternalHeight, hasFrame]);

  const computeInternalLayout = (height: number, basePanels: number[], internalPanels: InternalPanel[]): InternalLayoutResult => {
      const availableHeight = Math.max(0, height - 2 * frameVert);
      const allPanels = [...basePanels, ...internalPanels.map(p => p.height)];
      const sumP = sum(allPanels);

      if (sumP > availableHeight + 1e-6) return { error: "Wypełnienie nie mieści się w ramie", panels:[], gaps:[] };
      const numGaps = allPanels.length + 1;
      const gapSize = (availableHeight - sumP) / numGaps;
      if(gapSize < 0) return { error: "Układ niemożliwy - ujemne przerwy", panels:[], gaps:[] };
      
      const gaps = Array(numGaps).fill(roundMM(gapSize));
      const correction = availableHeight - sumP - sum(gaps);
      if(gaps.length > 0) gaps[gaps.length - 1] = roundMM(gaps[gaps.length - 1] + correction);
      return { panels: allPanels, gaps };
  };

  const gateInternalLayout = useMemo(() => {
      if (gateType === 'none') return {panels: [], gaps: []};
      return computeInternalLayout(gateHeight, panelsForGate, gateStructure.internalPanels);
  }, [gateType, gateHeight, panelsForGate, gateStructure.internalPanels, frameVert]);
  
  const wicketInternalLayout = useMemo(() => {
      if (gateType === 'none') return {panels: [], gaps: []};
      return computeInternalLayout(wicketHeight, panelsForGate, wicketStructure.internalPanels);
  }, [gateType, wicketHeight, panelsForGate, wicketStructure.internalPanels, frameVert]);

  // --- Funkcje pomocnicze UI ---
  const handleFramePreset = (v: number) => {
      setFrameVert(v);
      setFrameHoriz(v);
  }

  const addLayer = (target: 'gate' | 'wicket', type: 'under' | 'internal') => {
    const setter = target === 'gate' ? setGateStructure : setWicketStructure;
    if (type === 'under') {
        const newLayer: UnderFrameLayer = { id: Date.now(), type: 'profil', height: 60, gapAfter: 20, qty: 1 };
        setter(s => ({ ...s, underFrameLayers: [...s.underFrameLayers, newLayer] }));
    } else {
        const newPanel: InternalPanel = { id: Date.now(), height: 80 };
        setter(s => ({ ...s, internalPanels: [...s.internalPanels, newPanel] }));
    }
  };

  const updateUnderLayer = (target: 'gate' | 'wicket', id: number, field: keyof UnderFrameLayer, value: any) => {
      const setter = target === 'gate' ? setGateStructure : setWicketStructure;
      setter(s => ({ ...s, underFrameLayers: s.underFrameLayers.map(l => l.id === id ? { ...l, [field]: value } : l) }));
  };
    
  const removeUnderLayer = (target: 'gate' | 'wicket', id: number) => {
    const setter = target === 'gate' ? setGateStructure : setWicketStructure;
    setter(s => ({ ...s, underFrameLayers: s.underFrameLayers.filter(l => l.id !== id) }));
  }

  const updateInternalPanel = (target: 'gate' | 'wicket', id: number, value: number) => {
    const setter = target === 'gate' ? setGateStructure : setWicketStructure;
    setter(s => ({ ...s, internalPanels: s.internalPanels.map(p => p.id === id ? {...p, height: value} : p) }));
  }

  const removeInternalPanel = (target: 'gate' | 'wicket', id: number) => {
    const setter = target === 'gate' ? setGateStructure : setWicketStructure;
    setter(s => ({ ...s, internalPanels: s.internalPanels.filter(p => p.id !== id) }));
  }

  const renderUnderFrameControls = (target: 'gate' | 'wicket', structure: AdvancedStructure) => (
    <div className="space-y-2 mt-2 border-l-2 pl-2 border-gray-200">
        {structure.underFrameLayers.map(layer => (
            <div key={layer.id} className="p-2 border rounded bg-gray-50 text-sm space-y-1">
                <div className="flex justify-between items-center"><select value={layer.type} onChange={e => updateUnderLayer(target, layer.id, 'type', e.target.value as UnderFrameLayerType)} className="input !p-1 !text-sm"><option value="profil">Profil</option><option value="omega">Omega</option><option value="wsporniki">Wsporniki</option></select><button className="px-2 py-1 border rounded text-xs hover:bg-red-100" onClick={() => removeUnderLayer(target, layer.id)}>Usuń</button></div>
                <div className="grid grid-cols-2 gap-2"><label>Wysokość (mm) <input type="number" value={layer.height} onChange={e => updateUnderLayer(target, layer.id, 'height', e.target.valueAsNumber || 0)} className="input"/></label><label>Przerwa pod (mm) <input type="number" value={layer.gapAfter} onChange={e => updateUnderLayer(target, layer.id, 'gapAfter', e.target.valueAsNumber || 0)} className="input"/></label></div>
                {layer.type === 'wsporniki' && <label>Ilość <input type="number" min={1} value={layer.qty} onChange={e => updateUnderLayer(target, layer.id, 'qty', e.target.valueAsNumber || 1)} className="input"/></label>}
            </div>
        ))}
    </div>
  );

  const renderInternalPanelControls = (target: 'gate' | 'wicket', structure: AdvancedStructure) => (
    <div className="space-y-2 mt-2 border-l-2 pl-2 border-gray-200">
        {structure.internalPanels.map(panel => (
            <div key={panel.id} className="flex gap-2 items-center">
                <label className="grow">Wys. profilu (mm)<input type="number" value={panel.height} onChange={e => updateInternalPanel(target, panel.id, e.target.valueAsNumber || 0)} className="input"/></label>
                <button className="px-2 py-1 border rounded text-xs self-end" onClick={() => removeInternalPanel(target, panel.id)}>Usuń</button>
            </div>
        ))}
    </div>
  )

  const totalDrawingWidth = useMemo(() => {
    let w = spanWidth + 200;
    if (gateType !== 'none') w += gateWidth + 200;
    if (gateType !== 'none') w += wicketWidth + 200;
    return w;
  }, [spanWidth, gateType, gateWidth, wicketWidth]);

  const totalDrawingHeight = useMemo(() => {
    const gateUnderHeight = sum(gateStructure.underFrameLayers.map(l => l.height + l.gapAfter));
    const wicketUnderHeight = sum(wicketStructure.underFrameLayers.map(l => l.height + l.gapAfter));
    return Math.max(spanHeight, gateHeight + gateUnderHeight, wicketHeight + wicketUnderHeight) + 200;
  }, [spanHeight, gateHeight, wicketHeight, gateStructure, wicketStructure]);

  // --- Renderowanie Głównego Komponentu ---
  return (
    <div className="p-4 space-y-4 bg-gray-50">
      <h1 className="text-2xl font-bold">Kalkulator Ogrodzeń v2.4</h1>
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Kolumna 1 */}
        <div className="space-y-4 p-3 rounded-xl border bg-white shadow-sm">
            <h2 className="font-semibold text-lg">1. Konfiguracja Przęsła i Paneli</h2>
            <label className="block">Szerokość przęsła (mm)<input type="number" className="input" value={spanWidth} onChange={(e) => setSpanWidth(e.currentTarget.valueAsNumber || 0)} /></label>
            <label className="block">Wysokość przęsła (mm)<input type="number" className="input" value={spanHeight} onChange={(e) => setSpanHeight(e.currentTarget.valueAsNumber || 0)} /></label>
            <div>
                <div className="font-semibold">Rama</div>
                <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={hasFrame} onChange={(e) => setHasFrame(e.currentTarget.checked)} /><span>Przęsło z ramą</span></label>
                {hasFrame && (<div className="mt-2 space-y-2"><div className="grid grid-cols-2 gap-2"><label className="block">Profil góra/dół (mm)<input type="number" className="input" value={frameVert} onChange={(e) => setFrameVert(e.currentTarget.valueAsNumber || 0)} /></label><label className="block">Profil lewo/prawo (mm)<input type="number" className="input" value={frameHoriz} onChange={(e) => setFrameHoriz(e.currentTarget.valueAsNumber || 0)} /></label></div><div className="flex gap-2 text-sm">Presety ramy: {[40, 60, 80, 100].map(p => <button key={p} className="px-2 py-0.5 border rounded hover:bg-gray-100" onClick={() => handleFramePreset(p)}>{p}x{p}</button>)}</div></div>)}
            </div>
            <div>
                <div className="font-semibold">Grupy paneli (dla przęsła i wypełnienia bram)</div>
                 {groups.map((g) => (<div key={g.id} className="grid grid-cols-3 gap-2 items-end mt-2"><label className="block">Ilość <input type="number" className="input" value={g.qty} min={1} onChange={(e) => { const v = e.currentTarget.valueAsNumber || 0; setGroups(groups.map(gr => gr.id === g.id ? {...gr, qty: v} : gr)); }} /></label><label className="block">Wys. (mm) <input type="number" className="input" value={g.t} min={1} onChange={(e) => { const v = e.currentTarget.valueAsNumber || 0; setGroups(groups.map(gr => gr.id === g.id ? {...gr, t: v} : gr)); }} /></label><button className="px-2 py-1 border rounded text-xs" onClick={() => setGroups(groups.filter((gr) => gr.id !== g.id))}>Usuń</button></div>))}
                 <button className="mt-2 px-3 py-1 border rounded text-sm" onClick={() => setGroups([...groups, { id: Date.now(), qty: 1, t: 100, inGate: true }])}>+ Dodaj grupę</button>
            </div>
        </div>
        {/* Kolumna 2 */}
        <div className="space-y-4 p-3 rounded-xl border bg-white shadow-sm">
            <h2 className="font-semibold text-lg">2. Brama i Furtka</h2>
            <div className="flex items-center gap-4"><label><input type="radio" name="gate" value="none" checked={gateType==='none'} onChange={e=>setGateType(e.target.value as GateType)}/> Brak</label><label><input type="radio" name="gate" value="przesuwna" checked={gateType==='przesuwna'} onChange={e=>setGateType(e.target.value as GateType)}/> Przesuwna</label><label><input type="radio" name="gate" value="skrzydłowa" disabled title="Wkrótce" checked={gateType==='skrzydłowa'} onChange={e=>setGateType(e.target.value as GateType)}/> Skrzydłowa</label></div>
            {gateType !== 'none' && (
            <>
              {gateType === 'przesuwna' && (
                <div>
                    <h3 className="font-medium mt-4">Konfiguracja Bramy Przesuwnej</h3>
                    <label className="block">Szerokość ramy (mm) <input type="number" className="input" value={gateWidth} onChange={e => setGateWidth(e.target.valueAsNumber || 0)} /></label>
                    <label className="block">Wysokość ramy (mm) <input type="number" className="input" value={gateHeight} onChange={e => setGateHeight(e.target.valueAsNumber || 0)} /></label>
                    <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={gateStructure.hasVertReinforcement} onChange={e => setGateStructure(s => ({...s, hasVertReinforcement: e.target.checked}))} /><span>Dodaj wzmocnienie pionowe na środku</span></label>
                    <h4 className="font-medium mt-2 text-sm">Wypełnienie wewnętrzne (Przestrzeń 1):</h4>
                    {renderInternalPanelControls('gate', gateStructure)}
                    <button className="mt-2 px-3 py-1 border rounded text-xs" onClick={() => addLayer('gate', 'internal')}>+ Dodaj profil wewnętrzny</button>
                    <h4 className="font-medium mt-4 text-sm">Konstrukcja POD BRAMĄ (Przestrzeń 2):</h4>
                    {renderUnderFrameControls('gate', gateStructure)}
                    <button className="mt-2 px-3 py-1 border rounded text-sm" onClick={() => addLayer('gate', 'under')}>+ Dodaj warstwę pod ramą</button>
                </div>
              )}
              <div>
                  <h3 className="font-medium mt-4">Konfiguracja Furtki</h3>
                  <label className="block">Szerokość ramy (mm) <input type="number" className="input" value={wicketWidth} onChange={e => setWicketWidth(e.target.valueAsNumber || 0)} /></label>
                  <label className="block">Wysokość ramy (mm) <input type="number" className="input" value={wicketHeight} onChange={e => setWicketHeight(e.target.valueAsNumber || 0)} /></label>
                  <h4 className="font-medium mt-2 text-sm">Wypełnienie wewnętrzne:</h4>
                  {renderInternalPanelControls('wicket', wicketStructure)}
                  <button className="mt-2 px-3 py-1 border rounded text-xs" onClick={() => addLayer('wicket', 'internal')}>+ Dodaj profil wewnętrzny</button>
                  <h4 className="font-medium mt-4 text-sm">Konstrukcja POD FURTKĄ:</h4>
                  {renderUnderFrameControls('wicket', wicketStructure)}
                  <button className="mt-2 px-3 py-1 border rounded text-sm" onClick={() => addLayer('wicket', 'under')}>+ Dodaj warstwę pod ramą</button>
              </div>
            </>
            )}
        </div>
        {/* Kolumna 3 */}
        <div className="space-y-2 p-3 rounded-xl border bg-white shadow-sm text-sm">
            <h2 className="font-semibold text-lg">3. Podsumowanie i Błędy</h2>
            {spanLayout?.error && <div className="p-2 bg-yellow-100 text-yellow-800 rounded">PRZĘSŁO: {spanLayout.error}</div>}
            {gateInternalLayout?.error && <div className="p-2 bg-yellow-100 text-yellow-800 rounded">BRAMA: {gateInternalLayout.error}</div>}
            {wicketInternalLayout?.error && <div className="p-2 bg-yellow-100 text-yellow-800 rounded">FURTKA: {wicketInternalLayout.error}</div>}
        </div>
      </div>
      <div className="p-3 rounded-xl border bg-white shadow-sm flex items-center gap-4">
        <label className="block"><span className="text-sm font-medium">Skala podglądu</span><input type="range" min={0.05} max={0.5} step={0.01} value={scale} onChange={e => setScale(e.target.valueAsNumber || 0.2)} /></label>
      </div>
      <div className="p-3 rounded-xl border overflow-auto bg-white shadow-lg">
          <svg width={totalDrawingWidth * scale} height={totalDrawingHeight * scale}>
            <g transform={`scale(${scale})`}>
                <defs><marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6 z" fill="#333" /></marker></defs>
                <g transform={`translate(150, 50)`}>
                    <LayoutBlock title="Przęsło" outerW={spanWidth} outerH={spanHeight} withFrame={hasFrame} frameVert={frameVert} frameHoriz={frameHoriz} internalLayout={spanLayout} underFrameLayers={[]} hasVertReinforcement={false} />
                </g>
                {gateType === 'przesuwna' && gateInternalLayout && !gateInternalLayout.error && (
                    <g transform={`translate(${150 + spanWidth + 150}, 50)`}>
                        <LayoutBlock title="Brama Przesuwna" outerW={gateWidth} outerH={gateHeight} withFrame={true} frameVert={frameVert} frameHoriz={frameHoriz} internalLayout={gateInternalLayout} underFrameLayers={gateStructure.underFrameLayers} hasVertReinforcement={gateStructure.hasVertReinforcement} />
                    </g>
                )}
                {gateType !== 'none' && wicketInternalLayout && !wicketInternalLayout.error && (
                    <g transform={`translate(${150 + spanWidth + 150 + (gateType === 'przesuwna' ? gateWidth + 150 : 0)}, 50)`}>
                        <LayoutBlock title="Furtka" outerW={wicketWidth} outerH={wicketHeight} withFrame={true} frameVert={frameVert} frameHoriz={frameHoriz} internalLayout={wicketInternalLayout} underFrameLayers={wicketStructure.underFrameLayers} hasVertReinforcement={wicketStructure.hasVertReinforcement} />
                    </g>
                )}
            </g>
          </svg>
      </div>
    </div>
  );
}
