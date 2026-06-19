import { useState, useCallback, useMemo, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─── design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#0d1117", surface: "#161b22", surfaceHigh: "#1c2330",
  border: "#30363d", borderHigh: "#484f58",
  accent: "#3fb950", accentBlue: "#58a6ff",
  accentOrange: "#f0883e", accentRed: "#f85149",
  accentYellow: "#d29922",
  text: "#e6edf3", textMuted: "#8b949e", textDim: "#484f58",
  cycle1: "#58a6ff", cycle2: "#f0883e",
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function interp(x, xp, fp) {
  if (x <= xp[0]) return fp[0];
  if (x >= xp[xp.length - 1]) return fp[fp.length - 1];
  for (let i = 0; i < xp.length - 1; i++) {
    if (x >= xp[i] && x <= xp[i + 1])
      return fp[i] + ((fp[i + 1] - fp[i]) * (x - xp[i])) / (xp[i + 1] - xp[i]);
  }
  return 0;
}

function lastValid(rows) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = parseFloat(rows[i]);
    if (!isNaN(v)) return v;
  }
  return null;
}

function stabilityInfo(rows, threshold = 0.02, minCount = 3) {
  const vals = rows.map((r) => parseFloat(r)).filter((v) => !isNaN(v));
  if (vals.length < 2) return { stable: false, delta: null, count: vals.length };
  const last = vals.slice(-minCount);
  if (last.length < 2) return { stable: false, delta: null, count: vals.length };
  const delta = Math.max(...last) - Math.min(...last);
  return { stable: delta <= threshold, delta, count: vals.length };
}

// ─── struttura dati iniziale ─────────────────────────────────────────────────
const EMPTY_ROWS = () => Array(10).fill("");
const INIT_C1 = {
  p20:   EMPTY_ROWS(),
  p50:   EMPTY_ROWS(),
  p150:  EMPTY_ROWS(),
  p250:  EMPTY_ROWS(),
  p350:  EMPTY_ROWS(),
  p450:  EMPTY_ROWS(),
  scarico50: EMPTY_ROWS(),
};
const INIT_C2 = {
  p50:   EMPTY_ROWS(),
  p150:  EMPTY_ROWS(),
  p250:  EMPTY_ROWS(),
  p350:  EMPTY_ROWS(),
  scarico: EMPTY_ROWS(),
};

// ─── componente tabella gradino ───────────────────────────────────────────────
function StepTable({ label, kpa, rows, onChange, color, threshold = 0.02 }) {
  const { stable, delta, count } = stabilityInfo(rows, threshold);
  const stab = count >= 3 ? stable : null;
  const last = lastValid(rows);

  const borderColor = stab === null ? T.border : stab ? T.accent : T.accentYellow;

  return (
    <div style={{
      background: T.bg,
      border: `1px solid ${borderColor}`,
      borderRadius: 8,
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 10px",
        background: T.surfaceHigh,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color, fontFamily: "monospace" }}>
            {kpa} kPa
          </span>
          {label && <span style={{ fontSize: 10, color: T.textDim }}>{label}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {last !== null && (
            <span style={{ fontSize: 11, fontFamily: "monospace", color: T.text }}>
              ult: <strong>{last.toFixed(2)}</strong> mm
            </span>
          )}
          {stab !== null && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
              padding: "2px 7px", borderRadius: 20,
              background: stab ? `${T.accent}20` : `${T.accentYellow}20`,
              color: stab ? T.accent : T.accentYellow,
            }}>
              {stab ? "✓ STABILE" : `Δ ${delta !== null ? delta.toFixed(3) : "—"} mm`}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: T.border }}>
        {rows.map((val, i) => (
          <div key={i} style={{ background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 2px", gap: 2 }}>
            <span style={{ fontSize: 8, color: T.textDim, fontFamily: "monospace" }}>{i + 1}</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={val}
              onChange={(e) => {
                const next = [...rows];
                next[i] = e.target.value;
                onChange(next);
              }}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                borderBottom: val !== "" ? `1px solid ${color}40` : `1px solid ${T.border}`,
                color: val !== "" ? T.text : T.textDim,
                fontFamily: "monospace",
                fontSize: 16,
                textAlign: "center",
                padding: "2px 0",
                outline: "none",
                WebkitAppearance: "none",
                MozAppearance: "textfield",
                transform: "scale(0.85)",
                transformOrigin: "center center",
              }}
              onFocus={(e) => { e.target.style.borderBottomColor = color; }}
              onBlur={(e) => { e.target.style.borderBottomColor = val !== "" ? `${color}40` : T.border; }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── subcomponents ────────────────────────────────────────────────────────────
function TextInput({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: T.textMuted, textTransform: "uppercase" }}>{label}</label>
      <input type="text" value={value} placeholder={placeholder || ""} onChange={(e) => onChange(e.target.value)}
        style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontSize: 16, padding: "6px 10px", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = T.accentBlue)}
        onBlur={(e) => (e.target.style.borderColor = T.border)} />
    </div>
  );
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: T.textMuted, textTransform: "uppercase" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontFamily: "monospace", fontSize: 16, padding: "6px 10px", outline: "none", cursor: "pointer", appearance: "none" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// Elemento invisibile o visibile per clonare temporaneamente il grafico nel PDF
const FixedChartContainer = ({ chart1, chartScarico1, chart2, chartScarico2, innerRef }) => {
  return (
    <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
      <div ref={innerRef} style={{ width: "650px", height: "300px", background: "#161b22", padding: "20px" }}>
        <div style={{ color: "#fff", fontFamily: "sans-serif", fontSize: "14px", marginBottom: "10px", fontWeight: "bold" }}>Diagramma Cedimento — Carico</div>
        <div style={{ width: "100%", height: "240px", fontSize: 10, fontFamily: "monospace" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: -25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis type="number" dataKey="x" name="Carico" unit="kPa" domain={[0, 500]} stroke={T.textMuted} tickLine={false} />
              <YAxis type="number" dataKey="y" name="Cedimento" unit="mm" domain={["dataMax + 0.5", 0]} stroke={T.textMuted} tickLine={false} />
              <Scatter name="1° Ciclo" data={chart1} line={{ stroke: T.cycle1, strokeWidth: 2 }} fill={T.cycle1} shape="circle" />
              <Scatter name="Scarico C1" data={chartScarico1} line={{ stroke: T.cycle1, strokeWidth: 1.5, strokeDasharray: "4 4" }} fill="none" shape="none" />
              <Scatter name="2° Ciclo" data={chart2} line={{ stroke: T.cycle2, strokeWidth: 2 }} fill={T.cycle2} shape="circle" />
              <Scatter name="Scarico C2" data={chartScarico2} line={{ stroke: T.cycle2, strokeWidth: 1.5, strokeDasharray: "4 4" }} fill="none" shape="none" />
              <ReferenceLine x={250} stroke={`${T.accentBlue}25`} strokeDasharray="3 3" />
              <ReferenceLine x={350} stroke={`${T.accentBlue}25`} strokeDasharray="3 3" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

function SectionHeader({ label, step, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 8px" }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: color || T.accentBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#000", flexShrink: 0 }}>{step}</div>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: T.textMuted, textTransform: "uppercase" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

function ResultCard({ label, value, unit, color, sub, highlight }) {
  return (
    <div style={{ background: T.surface, border: `2px solid ${highlight || T.border}`, borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: T.textMuted, textTransform: "uppercase" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontFamily: "monospace", fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: T.textMuted }}>{unit}</span>}
      </div>
      {sub && <span style={{ fontSize: 9, color: highlight || T.textDim, fontWeight: highlight ? 700 : 400 }}>{sub}</span>}
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.surfaceHigh, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, fontFamily: "monospace" }}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.stroke || T.text }}>
          {p.name}: {Number(p.payload.x).toFixed(0)} kPa → {Number(p.payload.y).toFixed(3)} mm
        </div>
      ))}
    </div>
  );
};

// Funzione di compressione immagine per prevenire i crash della memoria su mobile
function compressImage(file, maxWidth = 1000) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7)); // Compressione JPEG al 70%
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function LegendDot({ color, label, dashed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 12, height: 3, background: color, borderStyle: dashed ? "dashed" : "solid" }} />
      <span style={{ fontSize: 10, color: T.textMuted }}>{label}</span>
    </div>
  );
}

function Pill({ label, value, unit, color, bold }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
      <span style={{ fontSize: 8, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
        <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: bold ? 800 : 600, color }}>{value}</span>
        {unit && <span style={{ fontSize: 9, color: T.textDim }}>{unit}</span>}
      </div>
    </div>
  );
}

function DismantLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#1c2330" />
      <path d="M12 12H28V16H16V20H24V24H16V28H12V12Z" fill="#58a6ff" />
    </svg>
  );
}

function GeneralInfoPanel({
  verbale, setVerbale, cantiere, setCantiere, committente, setCommittente,
  diametro, setDiametro, dataProva, setDataProva, provaGiorno, setProvaGiorno,
  tratta, setTratta, km, setKm, sezione, setSezione, terra, setTerra,
  strato, setStrato, quota, setQuota, distBordo, setDistBordo, tecnico, setTecnico,
  presenti, setPresenti, fotoProva, setFotoProva
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFoto = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file, 1000);
      setFotoProva(compressed);
    }
  };

  return (
    <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, transition: "all 0.2s" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%", background: "none", border: "none", padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          color: T.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer",
          outline: "none", WebkitTapHighlightColor: "transparent"
        }}
      >
        <span>{isOpen ? "🔼 NASCONDI DATI GENERALI" : "🔽 MOSTRA DATI GENERALI"}</span>
        {verbale && <span style={{ fontFamily: "monospace", color: T.accentBlue }}>Verb. {verbale}</span>}
      </button>

      {isOpen && (
        <div style={{ padding: "0 16px 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <TextInput label="Verbale N°" value={verbale} onChange={setVerbale} />
            <TextInput label="Data Prova" value={dataProva} onChange={setDataProva} placeholder="GG/MM/AAAA" />
            <TextInput label="Prova N° del giorno" value={provaGiorno} onChange={setProvaGiorno} />
            <SelectInput label="Diametro Piastra" value={diametro} onChange={setDiametro} options={[{ value: "300", label: "300 mm" }, { value: "600", label: "600 mm" }, { value: "450", label: "450 mm" }]} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            <TextInput label="Cantiere" value={cantiere} onChange={setCantiere} />
            <TextInput label="Committente" value={committente} onChange={setCommittente} />
          </div>

          <SectionHeader label="Localizzazione e Materiale" step="A" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            <TextInput label="Tratta" value={tratta} onChange={setTratta} />
            <TextInput label="Km" value={km} onChange={setKm} />
            <TextInput label="Sezione" value={sezione} onChange={setSezione} />
            <TextInput label="Quota" value={quota} onChange={setQuota} />
            <TextInput label="Dist. dal bordo" value={distBordo} onChange={setDistBordo} />
            <TextInput label="Tipo Terreno" value={terra} onChange={setTerra} />
            <TextInput label="Strato" value={strato} onChange={setStrato} />
          </div>

          <SectionHeader label="Personale e Foto" step="B" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <TextInput label="Tecnico Esecutore" value={tecnico} onChange={setTecnico} />
            <TextInput label="Presenti" value={presenti} onChange={setPresenti} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <label style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: T.surfaceHigh, border: `1px solid ${T.border}`, borderRadius: 6,
                padding: "10px", cursor: "pointer", fontSize: 13, color: T.textMuted,
                WebkitTapHighlightColor: "transparent"
              }}>
                <span style={{ fontSize: 18 }}>📷</span>
                <span>{fotoProva ? "Cambia foto" : "Carica foto"}</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{ display: "none" }} />
              </label>
              {fotoProva && (
                <div style={{ position: "relative" }}>
                  <img src={fotoProva} alt="Foto prova" style={{ height: 50, width: 50, borderRadius: 6, border: `1px solid ${T.border}`, objectFit: "cover" }} />
                  <button
                    onClick={() => setFotoProva(null)}
                    style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: T.accentRed, border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >✕</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [verbale, setVerbale]         = useState("");
  const [cantiere, setCantiere]       = useState("");
  const [committente, setCommittente] = useState("");
  const [diametro, setDiametro]       = useState("300");
  const [tab, setTab]                 = useState("c1");
  const [dataProva, setDataProva]     = useState("");
  const [provaGiorno, setProvaGiorno] = useState("");
  const [tratta, setTratta]           = useState("");
  const [km, setKm]                   = useState("");
  const [sezione, setSezione]         = useState("");
  const [terra, setTerra]             = useState("");
  const [strato, setStrato]           = useState("");
  const [quota, setQuota]             = useState("");
  const [distBordo, setDistBordo]     = useState("");
  const [tecnico, setTecnico]         = useState("");
  const [presenti, setPresenti]       = useState("");
  const [fotoProva, setFotoProva]     = useState(null);
  const [c1, setC1]                   = useState(INIT_C1);
  const [c2, setC2]                   = useState(INIT_C2);
  const setC1step = (key) => (rows) => setC1((p) => ({ ...p, [key]: rows }));
  const setC2step = (key) => (rows) => setC2((p) => ({ ...p, [key]: rows }));
  
  const chartRef = useRef(null);
  const hiddenChartRef = useRef(null); // Ref per il grafico nascosto fisso (evita bug tab nascoste)
  const [exporting, setExporting] = useState(false);

  const { md, mdp, rapporto, chart1, chartScarico1, chart2, chartScarico2, tableRows, rScarico2, sScarico2 } = useMemo(() => {
    const D = parseFloat(diametro) || 300;

    const p1keys = ["p20", "p50", "p150", "p250", "p350", "p450"];
    const p1vals = [20, 50, 150, 250, 350, 450];
    const p2keys = ["p50", "p150", "p250", "p350"];
    const p2vals = [50, 150, 250, 350];
    const r1 = p1keys.map((k) => lastValid(c1[k]));
    const r2 = p2keys.map((k) => lastValid(c2[k]));
    const rScarico1 = lastValid(c1.scarico50);
    const rScarico2 = lastValid(c2.scarico);

    const zero = r1[0];
    const s1 = r1.map((v) => (v !== null && zero !== null ? Math.abs(v - zero) : null));
    const sScarico1 = (rScarico1 !== null && zero !== null) ? Math.abs(rScarico1 - zero) : null;
    const s2 = r2.map((v) => (v !== null && zero !== null ? Math.abs(v - zero) : null));
    const sScarico2 = (rScarico2 !== null && zero !== null) ? Math.abs(rScarico2 - zero) : null;

    const s1clean = s1.map((v) => v ?? 0);
    const s2clean = s2.map((v) => v ?? 0);

    const def025c1 = interp(250, p1vals, s1clean);
    const def035c1 = interp(350, p1vals, s1clean);
    const ds1 = Math.abs(def035c1 - def025c1);

    const def025c2 = interp(250, p2vals, s2clean);
    const def035c2 = interp(350, p2vals, s2clean);
    const ds2 = Math.abs(def035c2 - def025c2);

    const hasC1 = r1.some((v) => v !== null);
    const hasC2 = r2.some((v) => v !== null);

    const md  = ds1 > 0 && hasC1 ? (0.10 / ds1) * D : null;
    const mdp = ds2 > 0 && hasC2 ? (0.10 / ds2) * D : null;
    const rapporto = md !== null && mdp !== null && mdp > 0 ? md / mdp : null;

    const chart1 = hasC1 ? p1vals.map((p, i) => s1[i] !== null ? { x: p, y: s1[i] } : null).filter(Boolean) : [];
    const lastC1 = s1[5];
    const chartScarico1 = (lastC1 !== null && sScarico1 !== null) ? [{ x: 450, y: lastC1 }, { x: 50, y: sScarico1 }] : [];
    const chart2 = hasC2 ? [ ...(sScarico1 !== null ? [{ x: 50, y: sScarico1 }] : []), ...p2vals.map((p, i) => s2[i] !== null ? { x: p, y: s2[i] } : null).filter(Boolean) ] : [];
    const lastC2 = s2[s2.length - 1];
    const chartScarico2 = (lastC2 !== null && sScarico2 !== null) ? [{ x: 350, y: lastC2 }, { x: 20, y: sScarico2 }] : [];

    const allP = [20, 50, 150, 250, 350, 450];
    const tableRows = allP.map((p, i) => {
      const i2 = p2vals.indexOf(p);
      return {
        p,
        r1: r1[i],
        s1: s1[i],
        r2: i2 >= 0 ? r2[i2] : null,
        s2: i2 >= 0 ? s2[i2] : null,
        isRef: p === 250 || p === 350,
      };
    });

    return { md, mdp, rapporto, chart1, chartScarico1, chart2, chartScarico2, tableRows, rScarico2, sScarico2 };
  }, [diametro, c1, c2]);

  const provaValida = rapporto !== null && rapporto < 1;
  const rapportoColor = rapporto === null ? T.textMuted : provaValida ? T.accent : T.accentRed;

  const exportPDF = useCallback(async (preview = false) => {
    setExporting(true);

    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const PW = 210, ML = 14, CW = PW - ML * 2;
      let y = 12;

      pdf.setFillColor(22, 27, 34);
      pdf.rect(0, 0, PW, 18, "F");
      pdf.setFontSize(14); pdf.setFont("helvetica", "bold"); pdf.setTextColor(232, 237, 243);
      pdf.text("DISMAT", ML, 11);
      pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(139, 148, 158);
      pdf.text("CNR 146/92 · Determinazione dei Moduli di Deformazione · IO 07-11-B", ML, 15.5);
      y = 26;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold"); pdf.setTextColor(88, 166, 255);
      pdf.text("DATI GENERALI", ML, y); y += 5;
      pdf.setDrawColor(48, 54, 61);
      pdf.line(ML, y, PW - ML, y); y += 5;

      const fields = [
        ["Committente", committente], ["Cantiere", cantiere], ["Verbale N°", verbale],
        ["Data Prova", dataProva], ["Prova n°", provaGiorno], ["Tratta", tratta],
        ["km", km], ["Sezione", sezione], ["Quota", quota],
        ["Dist. dal bordo", distBordo], ["Tecnico Esecutore", tecnico], ["Presenti", presenti],
        ["Diametro Piastra", diametro + " mm"], ["Terra", terra], ["Strato", strato],
      ].filter(([, v]) => v);
      pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(230, 237, 243);
      const colW = CW / 2;
      fields.forEach(([label, val], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = ML + col * colW;
        const cy = y + row * 6;
        pdf.setTextColor(139, 148, 158); pdf.text(label + ":", cx, cy);
        pdf.setTextColor(230, 237, 243); pdf.text(String(val), cx + 38, cy);
      });
      y += Math.ceil(fields.length / 2) * 6 + 6;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold"); pdf.setTextColor(88, 166, 255);
      pdf.text("RISULTATI DEL CALCOLO", ML, y); y += 5;
      pdf.setDrawColor(48, 54, 61);
      pdf.line(ML, y, PW - ML, y); y += 6;

      const res = [
        ["Md — 1° Ciclo (0.25–0.35 MPa)", md !== null ? md.toFixed(2) + " MPa" : "—", [88,166,255]],
        ["Md' — 2° Ciclo (0.25–0.35 MPa)", mdp !== null ? mdp.toFixed(2) + " MPa" : "—", [240,136,62]],
        ["Rapporto Md / Md'", rapporto !== null ? rapporto.toFixed(3) : "—", provaValida ? [63,185,80] : [248,81,73]],
        ["Esito Prova", rapporto !== null ? (provaValida ? "VALIDA (Md/Md' < 1)" : "NON VALIDA (Md/Md' >= 1)") : "—", provaValida ? [63,185,80] : [248,81,73]],
      ];
      res.forEach(([label, val, col]) => {
        pdf.setFont("helvetica", "normal"); pdf.setTextColor(139, 148, 158);
        pdf.text(label + ":", ML, y);
        pdf.setFont("helvetica", "bold"); pdf.setTextColor(...col);
        pdf.text(val, ML + 90, y);
        y += 6;
      });
      y += 4;

      pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(88, 166, 255);
      pdf.text("TABELLA LETTURE STABILIZZATE", ML, y); y += 5;
      pdf.setDrawColor(48, 54, 61); pdf.line(ML, y, PW - ML, y); y += 5;
      const headers = ["Carico (kPa)", "Lett. C1 (mm)", "s1 (mm)", "Lett. C2 (mm)", "s2 (mm)"];
      const colXs = [ML, ML+30, ML+66, ML+100, ML+136];
      const colWs = [28, 34, 32, 34, 32];
      pdf.setFontSize(8); pdf.setFont("helvetica", "bold"); pdf.setTextColor(139,148,158);
      headers.forEach((h, i) => pdf.text(h, colXs[i], y, { maxWidth: colWs[i] }));
      y += 5;
      pdf.setDrawColor(48,54,61); pdf.line(ML, y, PW-ML, y);
      y += 3;

      tableRows.forEach(({ p, r1, s1: s1Val, r2, s2: s2Val, isRef }) => {
        pdf.setFont("helvetica", isRef ? "bold" : "normal");
        pdf.setTextColor(isRef ? 88 : 230, isRef ? 166 : 237, isRef ? 255 : 243);
        pdf.text(String(p), colXs[0], y);
        pdf.setTextColor(88,166,255); pdf.text(r1 !== null ? r1.toFixed(2) : "—", colXs[1], y);
        pdf.setTextColor(230,237,243); pdf.text(s1Val !== null ? s1Val.toFixed(3) : "—", colXs[2], y);
        pdf.setTextColor(240,136,62); pdf.text(r2 !== null ? r2.toFixed(2) : "—", colXs[3], y);
        pdf.setTextColor(230,237,243); pdf.text(s2Val !== null ? s2Val.toFixed(3) : "—", colXs[4], y);
        y += 5;
      });
      y += 4;

      // FIX: Uso il container nascosto fisso (hiddenChartRef) così html2canvas non fallisce se si è su altri tab
      const targetChart = hiddenChartRef.current || chartRef.current;
      if (targetChart && (chart1.length > 0 || chart2.length > 0)) {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold"); pdf.setTextColor(88, 166, 255);
        pdf.text("DIAGRAMMA CEDIMENTO — CARICO", ML, y); y += 5;
        pdf.setDrawColor(48, 54, 61);
        pdf.line(ML, y, PW - ML, y); y += 3;
        
        const canvas = await html2canvas(targetChart, { backgroundColor: "#161b22", scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const imgH = (canvas.height / canvas.width) * CW;
        const availH = 297 - y - 14;
        const finalH = Math.min(imgH, availH);
        pdf.addImage(imgData, "PNG", ML, y, CW, finalH);
        y += finalH + 4;
      }

      if (fotoProva) {
        if (y + 60 > 287) { pdf.addPage(); y = 14; }
        pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(88, 166, 255);
        pdf.text("FOTO DELLA PROVA", ML, y); y += 5;
        pdf.setDrawColor(48, 54, 61); pdf.line(ML, y, PW - ML, y); y += 3;
        const img = new Image(); img.src = fotoProva;
        await new Promise(r => { img.onload = r; });
        const fW = CW, fH = Math.min((img.height / img.width) * fW, 70);
        pdf.addImage(fotoProva, "JPEG", ML, y, fW, fH);
      }

      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setTextColor(72, 79, 88);
        pdf.text(`DISMAT · IO 07-11-B · CNR 146/92`, ML, 293);
        pdf.text(`Pag. ${i}/${pageCount}`, PW - ML, 293, { align: "right" });
      }

      const filename = `Prova_Piastra_${verbale || "report"}_${(dataProva || "").replace(/[/]/g,"-") || new Date().toISOString().slice(0,10)}.pdf`;
      const blob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(blob);

      // FIX: Per l'anteprima, creiamo un link sicuro cliccabile via codice ad esecuzione terminata.
      // Questo bypassa il blocco pop-up asincrono in iOS/Android.
      if (preview) {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        pdf.save(filename);
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    } catch (err) {
      console.error(err);
      alert("Errore nella generazione del PDF: " + (err && err.message ? err.name + " - " + err.message : String(err)));
    } finally {
      setExporting(false);
    }
  }, [committente, cantiere, verbale, dataProva, provaGiorno, tratta, km, sezione, quota,
      distBordo, tecnico, presenti, diametro, terra, strato,
      md, mdp, rapporto, provaValida, tableRows, fotoProva, chart1, chart2]);

  const tabs = [
    { id: "c1", label: "1° Ciclo" },
    { id: "c2", label: "2° Ciclo" },
    { id: "results", label: "Risultati" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      
      {/* Container invisibile per consentire ad html2canvas di fotografare il grafico anche se l'utente si trova in un tab differente */}
      <FixedChartContainer 
        chart1={chart1} chartScarico1={chartScarico1} 
        chart2={chart2} chartScarico2={chartScarico2} 
        innerRef={hiddenChartRef} 
      />

      <header style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
        <DismantLogo size={30} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", color: T.text }}>DISMAT</div>
          <div style={{ fontSize: 9, color: T.textMuted, letterSpacing: "0.04em" }}>CNR 146/92 · Prova di Carico su Piastra</div>
        </div>
        <div style={{ flex: 1 }} />
        {rapporto !== null && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Pill label="Md" value={md !== null ? md.toFixed(1) : "—"} unit="MPa" color={T.cycle1} />
            <Pill label="Md'" value={mdp !== null ? mdp.toFixed(1) : "—"} unit="MPa" color={T.cycle2} />
            <Pill label="Md/Md'" value={rapporto.toFixed(3)} color={rapportColor} bold />
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => exportPDF(true)}
            disabled={exporting}
            style={{
              background: exporting ? T.border : T.surfaceHigh,
              color: exporting ? T.textMuted : T.text,
              border: `1px solid ${T.border}`, borderRadius: 7,
              padding: "8px 12px", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.06em", cursor: exporting ? "default" : "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Anteprima
          </button>
          <button
            onClick={() => exportPDF(false)}
            disabled={exporting}
            style={{
              background: exporting ? T.border : `linear-gradient(135deg, ${T.accent}, #2ea043)`,
              color: exporting ? T.textMuted : "#000",
              border: "none", borderRadius: 7,
              padding: "8px 14px", fontSize: 11, fontWeight: 800,
              letterSpacing: "0.08em", cursor: exporting ? "default" : "pointer",
              whiteSpace: "nowrap", flexShrink: 0,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {exporting ? "⏳ Generando..." : "↓ PDF"}
          </button>
        </div>
      </header>

      <GeneralInfoPanel
        verbale={verbale} setVerbale={setVerbale}
        cantiere={cantiere} setCantiere={setCantiere}
        committente={committente} setCommittente={setCommittente}
        diametro={diametro} setDiametro={setDiametro}
        dataProva={dataProva} setDataProva={setDataProva}
        provaGiorno={provaGiorno} setProvaGiorno={setProvaGiorno}
        tratta={tratta} setTratta={setTratta}
        km={km} setKm={setKm}
        sezione={sezione} setSezione={setSezione}
        terra={terra} setTerra={setTerra}
        strato={strato} setStrato={setStrato}
        quota={quota} setQuota={setQuota}
        distBordo={distBordo} setDistBordo={setDistBordo}
        tecnico={tecnico} setTecnico={setTecnico}
        presenti={presenti} setPresenti={setPresenti}
        fotoProva={fotoProva} setFotoProva={setFotoProva}
      />

      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", padding: "0 16px" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "12px 18px", fontSize: 12, fontWeight: 700,
              color: tab === t.id ? T.accentBlue : T.textMuted,
              borderBottom: `2px solid ${tab === t.id ? T.accentBlue : "transparent"}`,
              transition: "all 0.15s", WebkitTapHighlightColor: "transparent",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {tab === "c1" && (
          <div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
              Inserisci le letture del comparatore (mm) per ogni gradino. Ogni cella è una misurazione temporale (minuto 1…10). Il badge <span style={{ color: T.accent }}>STABILE</span> appare quando le ultime 3 letture hanno scarto ≤ 0.02 mm.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              <StepTable label="Carico iniziale" kpa={20} rows={c1.p20} onChange={setC1step("p20")} color={T.cycle1} />
              <StepTable kpa={50} rows={c1.p50} onChange={setC1step("p50")} color={T.cycle1} />
              <StepTable kpa={150} rows={c1.p150} onChange={setC1step("p150")} color={T.cycle1} />
              <StepTable kpa={250} rows={c1.p250} onChange={setC1step("p250")} color={T.cycle1} />
              <StepTable kpa={350} rows={c1.p350} onChange={setC1step("p350")} color={T.cycle1} />
              <StepTable kpa={450} rows={c1.p450} onChange={setC1step("p450")} color={T.cycle1} />
              <StepTable label="Scarico →" kpa={50} rows={c1.scarico50} onChange={setC1step("scarico50")} color={T.accentBlue} threshold={0.05} />
            </div>
          </div>
        )}

        {tab === "c2" && (
          <div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
              2° ciclo di carico (50 → 350 kPa) + scarico finale a 20 kPa.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              <StepTable kpa={50} rows={c2.p50} onChange={setC2step("p50")} color={T.cycle2} />
              <StepTable kpa={150} rows={c2.p150} onChange={setC2step("p150")} color={T.cycle2} />
              <StepTable kpa={250} rows={c2.p250} onChange={setC2step("p250")} color={T.cycle2} />
              <StepTable kpa={350} rows={c2.p350} onChange={setC2step("p350")} color={T.cycle2} />
              <StepTable label="Scarico" kpa={20} rows={c2.scarico} onChange={setC2step("scarico")} color={T.accentOrange} />
            </div>
          </div>
        )}

        {tab === "results" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
              <ResultCard label="Md — 1° Ciclo" value={md !== null ? md.toFixed(2) : "—"} unit="MPa" color={T.cycle1} sub="Intervallo 0.25–0.35 MPa" />
              <ResultCard label="Md' — 2° Ciclo" value={mdp !== null ? mdp.toFixed(2) : "—"} unit="MPa" color={T.cycle2} sub="Intervallo 0.25–0.35 MPa" />
              <ResultCard label="Rapporto Md / Md'" value={rapporto !== null ? rapporto.toFixed(3) : "—"} unit="—" color={rapportoColor} highlight={rapporto !== null ? rapportoColor : undefined} sub={rapporto === null ? "In attesa dati" : provaValida ? "✓ Prova VALIDA (< 1)" : "✗ Prova NON VALIDA (≥ 1)"} />
            </div>

            <div ref={chartRef} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 10px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Diagramma Cedimento — Carico</div>
                  <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>Asse Y invertito (direzione geotecnica)</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <LegendDot color={T.cycle1} label="1° Ciclo" />
                  <LegendDot color={T.cycle1} label="Scarico C1" dashed />
                  <LegendDot color={T.cycle2} label="2° Ciclo" />
                  <LegendDot color={T.cycle2} label="Scarico C2" dashed />
                </div>
              </div>

              {chart1.length === 0 && chart2.length === 0 && chartScarico1.length === 0 ? (
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.textDim, border: `1px dashed ${T.border}`, borderRadius: 8 }}>
                  Nessun dato inserito. Il grafico comparirà appena digiti le letture.
                </div>
              ) : (
                <div style={{ width: "100%", height: 220, fontSize: 10, fontFamily: "monospace" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                      <XAxis type="number" dataKey="x" name="Carico" unit="kPa" domain={[0, 500]} stroke={T.textMuted} tickLine={false} />
                      <YAxis type="number" dataKey="y" name="Cedimento" unit="mm" domain={["dataMax + 0.5", 0]} stroke={T.textMuted} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Scatter name="1° Ciclo" data={chart1} line={{ stroke: T.cycle1, strokeWidth: 2 }} fill={T.cycle1} shape="circle" />
                      <Scatter name="Scarico C1" data={chartScarico1} line={{ stroke: T.cycle1, strokeWidth: 1.5, strokeDasharray: "4 4" }} fill="none" shape="none" />
                      <Scatter name="2° Ciclo" data={chart2} line={{ stroke: T.cycle2, strokeWidth: 2 }} fill={T.cycle2} shape="circle" />
                      <Scatter name="Scarico C2" data={chartScarico2} line={{ stroke: T.cycle2, strokeWidth: 1.5, strokeDasharray: "4 4" }} fill="none" shape="none" />
                      <ReferenceLine x={250} stroke={`${T.accentBlue}25`} strokeDasharray="3 3" />
                      <ReferenceLine x={350} stroke={`${T.accentBlue}25`} strokeDasharray="3 3" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 700 }}>
                Tabella Riepilogativa Letture Stabilizzate
              </div>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 11, fontFamily: "monospace", minWidth: 400 }}>
                  <thead>
                    <tr style={{ background: T.surfaceHigh, borderBottom: `1px solid ${T.border}`, color: T.textMuted }}>
                      <th style={{ padding: "8px 12px" }}>Carico (kPa)</th>
                      <th style={{ padding: "8px 12px", color: T.cycle1 }}>Lett. C1 (mm)</th>
                      <th style={{ padding: "8px 12px" }}>s1 (mm)</th>
                      <th style={{ padding: "8px 12px", color: T.cycle2 }}>Lett. C2 (mm)</th>
                      <th style={{ padding: "8px 12px" }}>s2 (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map(({ p, r1, s1: s1Val, r2, s2: s2Val, isRef }) => (
                      <tr key={p} style={{ borderBottom: `1px solid ${T.border}`, background: isRef ? `${T.accentBlue}08` : "transparent" }}>
                        <td style={{ padding: "8px 12px", fontWeight: isRef ? 800 : 400, color: isRef ? T.accentBlue : T.text }}>{p}</td>
                        <td style={{ padding: "8px 12px", color: T.cycle1 }}>{r1 !== null ? r1.toFixed(2) : "—"}</td>
                        <td style={{ padding: "8px 12px" }}>{s1Val !== null ? s1Val.toFixed(3) : "—"}</td>
                        <td style={{ padding: "8px 12px", color: T.cycle2 }}>{r2 !== null ? r2.toFixed(2) : "—"}</td>
                        <td style={{ padding: "8px 12px" }}>{s2Val !== null ? s2Val.toFixed(3) : "—"}</td>
                      </tr>
                    ))}
                    <tr style={{ background: T.surfaceHigh }}>
                      <td style={{ padding: "8px 12px", color: T.accentBlue }}>Scarico finale</td>
                      <td style={{ padding: "8px 12px" }}>—</td>
                      <td style={{ padding: "8px 12px" }}>—</td>
                      <td style={{ padding: "8px 12px", color: T.cycle2 }}>{rScarico2 !== null ? rScarico2.toFixed(2) : "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{sScarico2 !== null ? sScarico2.toFixed(3) : "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}