import { jsPDF } from "jspdf";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─── design tokens ────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#0d1117",
    surface: "#161b22",
    surfaceHigh: "#1c2330",
    border: "#30363d",
    borderHigh: "#484f58",
    accent: "#3fb950",
    accentBlue: "#58a6ff",
    accentOrange: "#f0883e",
    accentRed: "#f85149",
    accentYellow: "#d29922",
    text: "#e6edf3",
    textMuted: "#8b949e",
    textDim: "#484f58",
    cycle1: "#58a6ff",
    cycle2: "#f0883e",
  },
  light: {
    bg: "#f4f6f8",
    surface: "#ffffff",
    surfaceHigh: "#eef2f7",
    border: "#d1d5db",
    borderHigh: "#9ca3af",
    accent: "#16a34a",
    accentBlue: "#2563eb",
    accentOrange: "#ea580c",
    accentRed: "#dc2626",
    accentYellow: "#ca8a04",
    text: "#111827",
    textMuted: "#6b7280",
    textDim: "#9ca3af",
    cycle1: "#2563eb",
    cycle2: "#ea580c",
  },
};

let T = THEMES.dark;
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


function SignatureBox({ label, value, onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const cssWidth = Math.max(parent?.clientWidth || 320, 280);
    const cssHeight = 130;
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(cssWidth * ratio);
    canvas.height = Math.floor(cssHeight * ratio);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = T.text;

    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
      img.src = value;
    }
  }, [value]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  };

  const startDrawing = (event) => {
    event.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(event);
  };

  const draw = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const point = getPoint(event);
    const last = lastPointRef.current;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
  };

  const stopDrawing = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    drawingRef.current = false;
    lastPointRef.current = null;
    saveSignature();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, rect.width, rect.height);

    onChange(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: T.textMuted, textTransform: "uppercase" }}>
          {label}
        </label>
        <button
          type="button"
          onClick={clearSignature}
          style={{
            background: T.surfaceHigh,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            color: T.textMuted,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
            padding: "6px 10px",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Cancella firma
        </button>
      </div>

      <div
        style={{
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          padding: 8,
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
          style={{
            display: "block",
            width: "100%",
            height: 130,
            borderRadius: 6,
            touchAction: "none",
            cursor: "crosshair",
            background: T.bg,
          }}
        />
        <div style={{ marginTop: 6, fontSize: 10, color: T.textDim }}>
          Firma con dito, penna touch o mouse. La firma verrà riportata nel PDF.
        </div>
      </div>
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
  presenti, setPresenti, fotoProva, setFotoProva, firmaTecnico, setFirmaTecnico
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

          <SectionHeader label="Firma elettronica" step="C" />
          <SignatureBox
            label="Firma tecnico esecutore"
            value={firmaTecnico}
            onChange={setFirmaTecnico}
          />
        </div>
      )}
    </div>
  );
}

export default function App() {
    const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  T = THEMES[theme];

  useEffect(() => {
    
    localStorage.setItem("theme", theme);
    document.body.style.background = T.bg;
  }, [theme]);
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
  const [firmaTecnico, setFirmaTecnico] = useState(null);
  const [c1, setC1]                   = useState(INIT_C1);
  const [c2, setC2]                   = useState(INIT_C2);
  const setC1step = (key) => (rows) => setC1((p) => ({ ...p, [key]: rows }));
  const setC2step = (key) => (rows) => setC2((p) => ({ ...p, [key]: rows }));
  
  const chartRef = useRef(null);
  const hiddenChartRef = useRef(null); // Ref per il grafico nascosto fisso (evita bug tab nascoste)
  const [exporting, setExporting] = useState(false);
  const STORAGE_KEY = "prova-piastra-dati-v1";

useEffect(() => {
  
  const saved = localStorage.getItem(STORAGE_KEY);
  console.log("CARICAMENTO", saved);
  if (!saved) return;

  try {
    const data = JSON.parse(saved);

    setVerbale(data.verbale || "");
    setCantiere(data.cantiere || "");
    setCommittente(data.committente || "");
    setDiametro(data.diametro || "300");
    setDataProva(data.dataProva || "");
    setProvaGiorno(data.provaGiorno || "");
    setTratta(data.tratta || "");
    setKm(data.km || "");
    setSezione(data.sezione || "");
    setTerra(data.terra || "");
    setStrato(data.strato || "");
    setQuota(data.quota || "");
    setDistBordo(data.distBordo || "");
    setTecnico(data.tecnico || "");
    setPresenti(data.presenti || "");
    setFotoProva(data.fotoProva || null);
    setFirmaTecnico(data.firmaTecnico || null);
    setC1(data.c1 || INIT_C1);
    setC2(data.c2 || INIT_C2);
  } catch {
    console.error("Errore caricamento dati salvati");
  }
}, []);

useEffect(() => {
  const data = {
    verbale,
    cantiere,
    committente,
    diametro,
    dataProva,
    provaGiorno,
    tratta,
    km,
    sezione,
    terra,
    strato,
    quota,
    distBordo,
    tecnico,
    presenti,
    fotoProva,
    firmaTecnico,
    c1,
    c2,
  };

console.log("SALVATAGGIO", data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}, [
  verbale,
  cantiere,
  committente,
  diametro,
  dataProva,
  provaGiorno,
  tratta,
  km,
  sezione,
  terra,
  strato,
  quota,
  distBordo,
  tecnico,
  presenti,
  fotoProva,
  firmaTecnico,
  c1,
  c2,
]);

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

    const PW = 210;
    const PH = 297;
    const ML = 10;
    const CW = PW - ML * 2;

    function section(x, y, w, title) {
      pdf.setFillColor(235, 238, 242);
      pdf.rect(x, y, w, 5.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.8);
      pdf.setTextColor(20, 20, 20);
      pdf.text(title, x + 1.5, y + 3.8);
      return y + 7;
    }

    function cell(x, y, w, h, label, value) {
      pdf.setDrawColor(185, 185, 185);
      pdf.rect(x, y, w, h);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.4);
      pdf.setTextColor(90, 90, 90);
      pdf.text(label, x + 1.3, y + 3);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(0, 0, 0);
      pdf.text(String(value || "—"), x + 1.3, y + 7.1, { maxWidth: w - 2.5 });
    }

    function drawPdfChart(x, y, w, h) {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(x, y, w, h, "F");
      pdf.setDrawColor(170, 170, 170);
      pdf.rect(x, y, w, h);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.setTextColor(20, 20, 20);
      pdf.text("Diagramma cedimento - carico", x + 2, y + 4.5);

      const allPoints = [
        ...chart1,
        ...chartScarico1,
        ...chart2,
        ...chartScarico2,
      ].filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));

      if (!allPoints.length) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(90, 90, 90);
        pdf.text("Grafico disponibile dopo inserimento letture.", x + w / 2, y + h / 2, {
          align: "center",
        });
        return;
      }

      const plotX = x + 13;
      const plotY = y + 11;
      const plotW = w - 20;
      const plotH = h - 20;

      const maxX = 500;
      const maxY = Math.max(...allPoints.map((p) => p.y), 1) + 0.5;

      pdf.setDrawColor(225, 225, 225);
      for (let i = 1; i <= 4; i++) {
        const gx = plotX + (plotW / 5) * i;
        const gy = plotY + (plotH / 5) * i;
        pdf.line(gx, plotY, gx, plotY + plotH);
        pdf.line(plotX, gy, plotX + plotW, gy);
      }

      pdf.setDrawColor(70, 70, 70);
      pdf.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
      pdf.line(plotX, plotY, plotX, plotY + plotH);

      function px(p) {
        return plotX + (p.x / maxX) * plotW;
      }

      function py(p) {
        return plotY + (p.y / maxY) * plotH;
      }

      function drawSeries(points, color, dashed = false) {
        if (!points.length) return;

        pdf.setDrawColor(...color);
        pdf.setFillColor(...color);

        if (dashed) pdf.setLineDashPattern([2, 2], 0);
        else pdf.setLineDashPattern([], 0);

        let prev = null;

        points.forEach((p) => {
          const cx = px(p);
          const cy = py(p);

          if (prev) pdf.line(prev.x, prev.y, cx, cy);

          if (!dashed) pdf.circle(cx, cy, 1.1, "F");

          prev = { x: cx, y: cy };
        });

        pdf.setLineDashPattern([], 0);
      }

      drawSeries(chart1, [40, 99, 180], false);
      drawSeries(chartScarico1, [40, 99, 180], true);
      drawSeries(chart2, [210, 110, 35], false);
      drawSeries(chartScarico2, [210, 110, 35], true);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(4.8);
      pdf.setTextColor(70, 70, 70);

      pdf.text("Carico [kPa]", plotX + plotW / 2, y + h - 3, { align: "center" });
      pdf.text("Cedimento [mm]", x + 4.5, plotY + plotH / 2, { angle: 90 });

      pdf.text("0", plotX, plotY + plotH + 3);
      pdf.text("500", plotX + plotW, plotY + plotH + 3, { align: "right" });
      pdf.text(maxY.toFixed(1), plotX - 2, plotY + 1.5, { align: "right" });

      pdf.setFontSize(5.2);
      pdf.setTextColor(40, 99, 180);
      pdf.text("1° ciclo", x + w - 34, y + 5);
      pdf.setTextColor(210, 110, 35);
      pdf.text("2° ciclo", x + w - 18, y + 5);
    }

    // SFONDO
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, PW, PH, "F");

    // HEADER
    try {
      const logo = await fetch("/logo-dismat.jpg")
        .then((r) => r.blob())
        .then(
          (blob) =>
            new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            })
        );

      pdf.addImage(logo, "JPEG", ML, 8, 18, 18);
    } catch {}

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text("L A B O R A T O R I O   D I S M A T", ML + 23, 12);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.2);
    pdf.text("Sperimentazione sulle Strutture e sui Materiali da Costruzione", ML + 23, 16);
    pdf.text("CNR 146/92 - Prova di carico su piastra - Determinazione dei moduli di deformazione", ML + 23, 19.8);
    pdf.text("Procedura interna DISMAT - IO 07-11-B", ML + 23, 23.5);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("MINUTA DI PROVA", PW - ML, 12, { align: "right" });
    pdf.setFontSize(7);
    pdf.text("PROVA DI CARICO SU PIASTRA", PW - ML, 17, { align: "right" });

    pdf.setDrawColor(60, 60, 60);
    pdf.line(ML, 29, PW - ML, 29);

    // DATI GENERALI + FOTO
    let y = 34;
    const leftW = 112;
    const rightX = ML + leftW + 6;
    const rightW = CW - leftW - 6;

    let gy = section(ML, y, leftW, "DATI GENERALI");

    const h = 9.2;
    const w2 = leftW / 2;

    cell(ML, gy, w2, h, "Verbale n.", verbale);
    cell(ML + w2, gy, w2, h, "Data prova", dataProva);
    gy += h;

    cell(ML, gy, w2, h, "Committente", committente);
    cell(ML + w2, gy, w2, h, "Cantiere", cantiere);
    gy += h;

    cell(ML, gy, w2, h, "Tratta / km", `${tratta || "—"} ${km || ""}`);
    cell(ML + w2, gy, w2, h, "Sezione / quota", `${sezione || "—"} ${quota || ""}`);
    gy += h;

    cell(ML, gy, w2, h, "Terreno / strato", `${terra || "—"} ${strato || ""}`);
    cell(ML + w2, gy, w2, h, "Diametro piastra", `${diametro || "—"} mm`);
    gy += h;

    cell(ML, gy, w2, h, "Tecnico esecutore", tecnico);
    cell(ML + w2, gy, w2, h, "Presenti", presenti);
    gy += h;

   let fy = section(rightX, y, rightW, "FOTO PROVA");

const photoH = 56;

pdf.setDrawColor(185, 185, 185);
pdf.rect(rightX, fy, rightW, photoH);

if (fotoProva) {
  try {
    pdf.addImage(fotoProva, "JPEG", rightX + 1.5, fy + 1.5, rightW - 3, photoH - 3);
      } catch {
        pdf.setFontSize(7);
        pdf.text("Foto non leggibile", rightX + rightW / 2, fy + 23, { align: "center" });
      }
    } else {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(90, 90, 90);
      pdf.text("Foto prova non inserita", rightX + rightW / 2, fy + photoH / 2, { align: "center" });
    }

    // RISULTATI
    y = 88;
    let ry = section(ML, y, CW, "RISULTATI DELLA PROVA");

    const resW = CW / 4;

    cell(ML, ry, resW, 11, "Md - 1° ciclo", md !== null ? `${md.toFixed(2)} MPa` : "—");
    cell(ML + resW, ry, resW, 11, "Md' - 2° ciclo", mdp !== null ? `${mdp.toFixed(2)} MPa` : "—");
    cell(ML + 2 * resW, ry, resW, 11, "Rapporto Md/Md'", rapporto !== null ? rapporto.toFixed(3) : "—");
    cell(
      ML + 3 * resW,
      ry,
      resW,
      11,
      "Esito",
      rapporto !== null ? (provaValida ? "VALIDA" : "NON VALIDA") : "—"
    );

    // TABELLA
    y = 108;
    let ty = section(ML, y, 82, "TABELLA LETTURE STABILIZZATE");

    const tx = ML;
    const col = [18, 16, 16, 16, 16];
    const heads = ["kPa", "L1", "s1", "L2", "s2"];

    pdf.setFillColor(245, 245, 245);
    pdf.rect(tx, ty, 82, 6, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.8);
    pdf.setTextColor(40, 40, 40);

    let cx = tx;
    heads.forEach((head, i) => {
      pdf.text(head, cx + 1.5, ty + 4);
      cx += col[i];
    });

    ty += 6;

    tableRows.forEach(({ p, r1, s1: s1Val, r2, s2: s2Val }) => {
      pdf.setDrawColor(210, 210, 210);
      pdf.rect(tx, ty, 82, 7);

      const vals = [
        p,
        r1 !== null ? r1.toFixed(2) : "—",
        s1Val !== null ? s1Val.toFixed(3) : "—",
        r2 !== null ? r2.toFixed(2) : "—",
        s2Val !== null ? s2Val.toFixed(3) : "—",
      ];

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5.8);
      pdf.setTextColor(0, 0, 0);

      cx = tx;
      vals.forEach((v, i) => {
        pdf.text(String(v), cx + 1.3, ty + 4.7, { maxWidth: col[i] - 2 });
        cx += col[i];
      });

      ty += 7;
    });

    // FORMULE + NOTE
    let ny = section(ML, ty + 5, 82, "FORMULE E NOTE");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.7);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Md = (Δp / Δs) · D", ML + 1.5, ny + 1);
    pdf.text("Intervallo di calcolo: 0,25 - 0,35 MPa", ML + 1.5, ny + 5);
    pdf.text("Prova valida se Md/Md' < 1", ML + 1.5, ny + 9);
    pdf.text("Norma: CNR 146/92", ML + 1.5, ny + 13);

    // GRAFICO
    const chartX = ML + 88;
    const chartY = 108;
    const chartW = CW - 88;
    const chartH = 105;

    section(chartX, chartY, chartW, "GRAFICO CARICO - CEDIMENTO");
    drawPdfChart(chartX, chartY + 7, chartW, chartH - 7);

    // FIRMA
    const signY = 224;

    if (firmaTecnico) {
      try {
        pdf.addImage(firmaTecnico, "PNG", ML + 4, signY - 22, 62, 18);
      } catch {
        // Se la firma non è leggibile, resta comunque la riga firma.
      }
    }

    pdf.setDrawColor(180, 180, 180);
    pdf.line(ML, signY, ML + 72, signY);
    pdf.line(PW - ML - 72, signY, PW - ML, signY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(60, 60, 60);
    pdf.text("Il tecnico esecutore", ML, signY + 5);
    pdf.text("Direzione lavori / Committente", PW - ML - 72, signY + 5);

    // FOOTER
    pdf.setDrawColor(100, 100, 100);
    pdf.line(ML, PH - 13, PW - ML, PH - 13);

    pdf.setFontSize(6);
    pdf.setTextColor(90, 90, 90);
    pdf.text("DISMAT - CNR 146/92 - Prova di carico su piastra", ML, PH - 8);
    pdf.text("Pagina 1/1", PW - ML, PH - 8, { align: "right" });

    const filename = `Prova_Piastra_${verbale || "report"}_${
      (dataProva || "").replace(/[/]/g, "-") || new Date().toISOString().slice(0, 10)
    }.pdf`;

    const blob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(blob);

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
    alert(
      "Errore nella generazione del PDF: " +
        (err && err.message ? err.name + " - " + err.message : String(err))
    );
  } finally {
    setExporting(false);
  }
}, [
  committente,
  cantiere,
  verbale,
  dataProva,
  provaGiorno,
  tratta,
  km,
  sezione,
  quota,
  distBordo,
  tecnico,
  presenti,
  diametro,
  terra,
  strato,
  md,
  mdp,
  rapporto,
  provaValida,
  tableRows,
  fotoProva,
  firmaTecnico,
  chart1,
  chartScarico1,
  chart2,
  chartScarico2,
]);
     
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

      <header
  style={{
    background: T.surface,
    borderBottom: `1px solid ${T.border}`,
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    position: "sticky",
    top: 0,
    zIndex: 100,
    flexWrap: "wrap",
  }}
  
>
  <img
    src="/logo-dismat.jpg"
    alt="Laboratorio DISMAT"
    style={{
      width: 46,
      height: 46,
      borderRadius: 8,
      objectFit: "cover",
      background: "#fff",
    }}
  />
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
        <div
  style={{
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  }}
>
          <button
  type="button"
  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
  style={{
    background: T.surfaceHigh,
    color: T.text,
    border: `1px solid ${T.border}`,
    borderRadius: 7,
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    minWidth: 92,
  }}
>
  {theme === "dark" ? "☀️ Chiaro" : "🌙 Scuro"}
</button>
<button
  type="button"
  onClick={() => {
    if (window.confirm("Vuoi iniziare una nuova prova? Tutti i dati verranno cancellati.")) {
      localStorage.removeItem("prova-piastra-dati-v1");
      window.location.reload();
    }
  }}
  style={{
    background: T.accentRed,
    color: "#fff",
    border: "none",
    borderRadius: 7,
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    minWidth: 92,
  }}
>
  Nuova prova
</button>
          <button
            onClick={() => exportPDF(true)}
            disabled={exporting}
            style={{
              background: exporting ? T.border : T.surfaceHigh,
              color: exporting ? T.textMuted : T.text,
              border: `1px solid ${T.border}`, borderRadius: 7,
              padding: "8px 12px", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.06em", cursor: exporting ? "default" : "pointer",
              WebkitTapHighlightColor: "transparent",minWidth: 92,
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
              WebkitTapHighlightColor: "transparent",minWidth: 92,
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
        firmaTecnico={firmaTecnico} setFirmaTecnico={setFirmaTecnico}
      />
      <div
  style={{
    margin: "12px 16px 0",
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: "12px 14px",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  }}
>
  <div>
    <div
      style={{
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: T.textMuted,
      }}
    >
      Riferimento normativo
    </div>
    <div
      style={{
        marginTop: 3,
        fontSize: 14,
        fontWeight: 800,
        color: T.text,
      }}
    >
      CNR 146/92 · Determinazione dei moduli di deformazione Md e Md'
    </div>
  </div>

  <div
    style={{
      fontSize: 12,
      color: T.textMuted,
      fontWeight: 700,
    }}
  >
    Procedura interna DISMAT · IO 07-11-B
  </div>
</div>

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
  );}
