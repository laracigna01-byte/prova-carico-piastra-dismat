import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { exportReport } from "./pdf/exportReport";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  listTests,
  saveTest,
  deleteTest,
  writeTests,
  loadServerTests,
  syncServerTests,
  nextReportId,
} from "./utils/storage";
import { LoginGate } from "./security/LoginGate";
import { useAuth } from "./security/AuthContext";

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

// ─── configurazioni dei tipi di prova ────────────────────────────────────────
const TEST_TYPES = {
  fondazione: {
    label: "Fondazione",
    ciclo1: [20, 50, 150, 250, 350, 450],
    scarico1: 50,
    ciclo2: [50, 150, 250, 350],
    scarico2: 20,
    md: [250, 350],
    mdp: [250, 350],
  },
  fondo_scavo: {
    label: "Fondo scavo",
    ciclo1: [20, 50, 100, 150, 200],
    scarico1: 50,
    ciclo2: [50, 100, 150],
    scarico2: 20,
    md: [50, 150],
    mdp: [50, 150],
  },
  rilevato: {
    label: "Rilevato",
    ciclo1: [20, 50, 150, 250, 350],
    scarico1: 50,
    ciclo2: [50, 150, 250],
    scarico2: 20,
    md: [150, 250],
    mdp: [150, 250],
  },
};

const stepKey = (kpa) => `p${kpa}`;

// ─── struttura dati iniziale ─────────────────────────────────────────────────
const EMPTY_ROWS = () => Array(10).fill("");
const INIT_C1 = {
  p20:   EMPTY_ROWS(),
  p50:   EMPTY_ROWS(),
  p100:  EMPTY_ROWS(),
  p150:  EMPTY_ROWS(),
  p250:  EMPTY_ROWS(),
  p350:  EMPTY_ROWS(),
  p450:  EMPTY_ROWS(),
  scarico50: EMPTY_ROWS(),
};
const INIT_C2 = {
  p50:   EMPTY_ROWS(),
  p100:  EMPTY_ROWS(),
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
    ctx.strokeStyle = "#000000";

    ctx.fillStyle = "#ffffff";
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

    ctx.fillStyle = "#ffffff";
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
const FixedChartContainer = ({
  chart1,
  chartScarico1,
  chart2,
  chartScarico2,
  innerRef,
  testConfig,
  chartMaxX
}) => {
  return (
    <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
      <div ref={innerRef} style={{ width: "650px", height: "300px", background: "#161b22", padding: "20px" }}>
        <div style={{ color: "#fff", fontFamily: "sans-serif", fontSize: "14px", marginBottom: "10px", fontWeight: "bold" }}>GRAFICO CARICO - SPOSTAMENTO</div>
        <div style={{ width: "100%", height: "240px", fontSize: 10, fontFamily: "monospace" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
  margin={{
    top: 38,
    right: 20,
    bottom: 8,
    left: 5,
  }}
>
  <CartesianGrid
    strokeDasharray="3 3"
    stroke="#30363d"
  />

  <XAxis
    type="number"
    dataKey="x"
    name="Carico"
    unit="kPa"
    domain={[0, chartMaxX]}
    orientation="top"
    stroke={T.textMuted}
    tickLine={false}
    axisLine={true}
    label={{
      value: "Carico [kPa]",
      position: "top",
      offset: 14,
      fill: T.textMuted,
    }}
  />

  <YAxis
    type="number"
    dataKey="y"
    name="Spostamento"
    unit="mm"
    domain={[0, "dataMax + 0.5"]}
    reversed={true}
    stroke={T.textMuted}
    tickLine={false}
    axisLine={true}
    tickFormatter={(value) => Number(value).toFixed(2)}
    label={{
      value: "Spostamento [mm]",
      angle: -90,
      position: "insideLeft",
      offset: 10,
      fill: T.textMuted,
    }}
  />

  <Scatter
    name="1° Ciclo"
    data={chart1}
    line={{
      stroke: T.cycle1,
      strokeWidth: 2,
    }}
    fill={T.cycle1}
    shape="circle"
  />

  <Scatter
    name="Scarico C1"
    data={chartScarico1}
    line={{
      stroke: T.cycle1,
      strokeWidth: 1.5,
      strokeDasharray: "4 4",
    }}
    fill="none"
    shape="none"
  />

  <Scatter
    name="2° Ciclo"
    data={chart2}
    line={{
      stroke: T.cycle2,
      strokeWidth: 2,
    }}
    fill={T.cycle2}
    shape="circle"
  />
              <ReferenceLine
  x={testConfig.md[0]}
  stroke={T.accentBlue}
  strokeWidth={1.5}
  strokeDasharray="6 4"
/>

<ReferenceLine
  x={testConfig.md[1]}
  stroke={T.accentBlue}
  strokeWidth={1.5}
  strokeDasharray="6 4"
/>

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
 verbale, setVerbale,
  cantiere, setCantiere,
  committente, setCommittente,
  diametro, setDiametro,
  tipoProva, handleTipoProvaChange,
  dataProva, setDataProva,
  km, setKm,
  sezione, setSezione,
  quota, setQuota,
  tecnico, setTecnico,
  presenti, setPresenti,
  fotoProva, setFotoProva,
  firmaTecnico, setFirmaTecnico
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
           <TextInput
  label="N. prova"
  value={verbale}
  onChange={setVerbale}
/>

<TextInput
  label="Data"
  value={dataProva}
  onChange={setDataProva}
  placeholder="GG/MM/AAAA"
/>

<SelectInput
  label="Strato"
  value={tipoProva}
  onChange={handleTipoProvaChange}
  options={Object.entries(TEST_TYPES).map(([value, config]) => ({
    value,
    label: config.label,
  }))}
/>

<SelectInput
  label="Diametro piastra"
  value={diametro}
  onChange={setDiametro}
  options={[
    { value: "300", label: "300 mm" },
    { value: "450", label: "450 mm" },
    { value: "600", label: "600 mm" },
  ]}
/>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            <TextInput label="Cantiere" value={cantiere} onChange={setCantiere} />
            <TextInput label="Committente" value={committente} onChange={setCommittente} />
          </div>

          <SectionHeader label="Localizzazione e Materiale" step="A" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
           <TextInput
  label="Km"
  value={km}
  onChange={setKm}
/>

<TextInput
  label="Sezione / Quota"
  value={`${sezione}${sezione && quota ? " / " : ""}${quota}`}
  onChange={(value) => {
    const [nuovaSezione = "", nuovaQuota = ""] = value.split("/");

    setSezione(nuovaSezione.trim());
    setQuota(nuovaQuota.trim());
  }}
/>
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
                <input type="file" accept="image/*" onChange={handleFoto} style={{ display: "none" }} />
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


function ArchivePanel({ items = [], onOpen, onDuplicate, onDelete, onExport }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return [...items]
      .sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0))
      .filter((item) => {
        if (!q) return true;

        const text = [
          item.id,
          item.data?.verbale,
          item.data?.cantiere,
          item.data?.committente,
          item.data?.dataProva,
          item.data?.tecnico,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(q);
      });
  }, [items, query]);

  function handleDelete(item) {
    const ok = window.confirm(
      `Eliminare definitivamente la prova ${item.id || item.data?.verbale || ""}?`
    );

    if (!ok) return;

    onDelete(item.id);
  }

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>Archivio prove</div>
          <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>
            Archivio locale con IndexedDB, utilizzabile anche offline.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca prova..."
            style={{
              background: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: 7,
              color: T.text,
              fontSize: 12,
              padding: "7px 10px",
              outline: "none",
              minWidth: 180,
            }}
          />
          <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "monospace" }}>
            {filtered.length} / {items.length} prove
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 18, color: T.textMuted, fontSize: 12 }}>
          Nessuna prova salvata. Usa “Salva” dalla barra in alto dopo aver compilato la scheda.
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 18, color: T.textMuted, fontSize: 12 }}>
          Nessuna prova trovata con questa ricerca.
        </div>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 11, fontFamily: "monospace", minWidth: 820 }}>
            <thead>
              <tr style={{ background: T.surfaceHigh, color: T.textMuted }}>
                <th style={{ padding: "9px 12px" }}>ID</th>
                <th style={{ padding: "9px 12px" }}>Salvata il</th>
                <th style={{ padding: "9px 12px" }}>Data prova</th>
                <th style={{ padding: "9px 12px" }}>Verbale</th>
                <th style={{ padding: "9px 12px" }}>Strato</th>
                <th style={{ padding: "9px 12px" }}>Cantiere</th>
                <th style={{ padding: "9px 12px" }}>Committente</th>
                <th style={{ padding: "9px 12px" }}>Azioni</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} style={{ borderTop: `1px solid ${T.border}` }}>
                  <td style={{ padding: "9px 12px", color: T.accentBlue, fontWeight: 800 }}>{item.id || "—"}</td>
                  <td style={{ padding: "9px 12px" }}>{item.savedAt ? new Date(item.savedAt).toLocaleString("it-IT") : "—"}</td>
                  <td style={{ padding: "9px 12px" }}>{item.data?.dataProva || "—"}</td>
                  <td style={{ padding: "9px 12px" }}>{item.data?.verbale || "—"}</td>
                  <td style={{ padding: "9px 12px" }}>
                            {TEST_TYPES[item.data?.tipoProva]?.label || "Fondazione"}
                  </td>
                  <td style={{ padding: "9px 12px" }}>{item.data?.cantiere || "—"}</td>
                  <td style={{ padding: "9px 12px" }}>{item.data?.committente || "—"}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => onOpen(item)} style={{ background: T.surfaceHigh, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>Apri</button>
                      <button type="button" onClick={() => onDuplicate(item)} style={{ background: T.surfaceHigh, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>Duplica</button>
                      <button type="button" onClick={() => onExport(item)} style={{ background: T.surfaceHigh, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>PDF</button>
                      <button type="button" onClick={() => handleDelete(item)} style={{ background: `${T.accentRed}22`, color: T.accentRed, border: `1px solid ${T.accentRed}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>Elimina</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button
      type="button"
      onClick={logout}
      style={{
        background: "#d71920",
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
      🔒 Esci
    </button>
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
  const [committente, setCommittente] = useState("Cogen SRL");
  const [diametro, setDiametro]       = useState("300");
  const [tipoProva, setTipoProva]     = useState("fondazione");
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
  const [archive, setArchive] = useState(listTests);
  const testConfig = TEST_TYPES[tipoProva] || TEST_TYPES.fondazione;
  const firstC2Key = stepKey(testConfig.ciclo2[0] || 50);
  const autoFillFirstC2Ref = useRef(false);
  const lastAutoFilledFirstC2Ref = useRef(null);
  const chartMaxX = Math.max(
  ...testConfig.ciclo1,
  ...testConfig.ciclo2,
  testConfig.scarico1,
  testConfig.scarico2
);
  const setC1step = (key) => (rows) => setC1((p) => ({ ...p, [key]: rows }));
  const setC2step = (key) => (rows) => setC2((p) => ({ ...p, [key]: rows }));
  const setFirstC2Step = (rows) => {
    autoFillFirstC2Ref.current = true;
    setC2((p) => ({ ...p, [firstC2Key]: rows }));
  };

 
  useEffect(() => {
  const autoValue = lastValid(c1.scarico50 || []);

  // Aspetta che sia stata inserita almeno una lettura nello scarico C1.
  if (autoValue === null) return;

  // Se l’utente ha già modificato manualmente il primo gradino C2,
  // non deve essere sovrascritto.
  if (autoFillFirstC2Ref.current) return;

  const nextValue = String(autoValue);

  setC2((prev) => {
    const currentRows = prev[firstC2Key] || EMPTY_ROWS();
    const currentValue = currentRows[0];

    if (currentValue === nextValue) {
      return prev;
    }

    const nextRows = [...currentRows];

    // La prima lettura del primo gradino C2 coincide
    // con l’ultima lettura dello scarico C1.
    nextRows[0] = nextValue;

    lastAutoFilledFirstC2Ref.current = nextValue;

    return {
      ...prev,
      [firstC2Key]: nextRows,
    };
  });
}, [c1.scarico50, firstC2Key]);
  const hasInsertedReadings = () => {
  const hasC1Readings = Object.values(c1).some((rows) =>
    rows.some((value) => String(value).trim() !== "")
  );
  

  const hasC2Readings = Object.values(c2).some((rows) =>
    rows.some((value) => String(value).trim() !== "")
  );

  return hasC1Readings || hasC2Readings;
};
const handleTipoProvaChange = (nuovoTipo) => {
  if (nuovoTipo === tipoProva) return;

  if (hasInsertedReadings()) {
    const conferma = window.confirm(
      "Cambiando il tipo di prova verranno eliminate tutte le letture inserite e i risultati calcolati. Continuare?"
    );

    if (!conferma) return;
  }

  autoFillFirstC2Ref.current = false;
  lastAutoFilledFirstC2Ref.current = null;
  setC1(INIT_C1);
  setC2(INIT_C2);
  setTipoProva(nuovoTipo);
  setTab("c1");
};
  
  const chartRef = useRef(null);
  const hiddenChartRef = useRef(null); // Ref per il grafico nascosto fisso (evita bug tab nascoste)
  const [exporting, setExporting] = useState(false);
  const [storageLoaded, setStorageLoaded] = useState(false);
  useEffect(() => {
  (async () => {
    const savedArchive = await loadServerTests();
    if (savedArchive.length) setArchive(savedArchive);
  })();
}, []);

useEffect(() => {
  writeTests(archive);
  syncServerTests(archive);
}, [archive]);
  const STORAGE_KEY = "prova-piastra-dati-v1";
  

useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  console.log("CARICAMENTO", saved);

  if (!saved) {
    setStorageLoaded(true);
    return;
  }

  try {
    const data = JSON.parse(saved);

    setVerbale(data.verbale || "");
    setCantiere(data.cantiere || "");
    setCommittente(data.committente || "Cogen SRL");
    setDiametro(data.diametro || "300");
    setTipoProva(data.tipoProva || "fondazione");
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
  } catch (error) {
    console.error("Errore caricamento dati salvati", error);
  } finally {
    setStorageLoaded(true);
  }
}, []);

useEffect(() => {
    if (!storageLoaded) return;
  const data = {
    verbale,
    cantiere,
    committente,
    diametro,
    tipoProva,
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
  storageLoaded,
  verbale,
  cantiere,
  committente,
  diametro,
  tipoProva,
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
    const p1vals = testConfig.ciclo1;
    const p2vals = testConfig.ciclo2;
    const p1keys = p1vals.map(stepKey);
    const p2keys = p2vals.map(stepKey);
    const r1 = p1keys.map((k) => lastValid(c1[k] || []));
    const r2 = p2keys.map((k) => lastValid(c2[k] || []));
    const rScarico1 = lastValid(c1.scarico50 || []);
    const rScarico2 = lastValid(c2.scarico || []);

    const zero = r1[0];
    const s1 = r1.map((v) => (v !== null && zero !== null ? Math.abs(v - zero) : null));
    const sScarico1 = rScarico1 !== null && zero !== null ? Math.abs(rScarico1 - zero) : null;
    const s2 = r2.map((v) => (v !== null && zero !== null ? Math.abs(v - zero) : null));
    const sScarico2 = rScarico2 !== null && zero !== null ? Math.abs(rScarico2 - zero) : null;

    const s1clean = s1.map((v) => v ?? 0);
    const s2clean = s2.map((v) => v ?? 0);
    const [mdFrom, mdTo] = testConfig.md;
    const [mdpFrom, mdpTo] = testConfig.mdp;
    const ds1 = Math.abs(interp(mdTo, p1vals, s1clean) - interp(mdFrom, p1vals, s1clean));
    const ds2 = Math.abs(interp(mdpTo, p2vals, s2clean) - interp(mdpFrom, p2vals, s2clean));
    const deltaP1 = (mdTo - mdFrom) / 1000;
    const deltaP2 = (mdpTo - mdpFrom) / 1000;

    const hasC1 = r1.some((v) => v !== null);
    const hasC2 = r2.some((v) => v !== null);
    const md = ds1 > 0 && hasC1 ? (deltaP1 / ds1) * D : null;
    const mdp = ds2 > 0 && hasC2 ? (deltaP2 / ds2) * D : null;
    const rapporto = md !== null && mdp !== null && mdp > 0 ? md / mdp : null;

    const chart1 = hasC1 ? p1vals.map((p, i) => s1[i] !== null ? { x: p, y: s1[i] } : null).filter(Boolean) : [];
    const lastC1 = s1[s1.length - 1];
    const chartScarico1 = lastC1 !== null && sScarico1 !== null ? [{ x: p1vals[p1vals.length - 1], y: lastC1 }, { x: testConfig.scarico1, y: sScarico1 }] : [];
    const chart2 = hasC2 ? [ ...(sScarico1 !== null ? [{ x: testConfig.scarico1, y: sScarico1 }] : []), ...p2vals.map((p, i) => s2[i] !== null ? { x: p, y: s2[i] } : null).filter(Boolean) ] : [];
    const lastC2 = s2[s2.length - 1];
    const chartScarico2 = lastC2 !== null && sScarico2 !== null ? [{ x: p2vals[p2vals.length - 1], y: lastC2 }, { x: testConfig.scarico2, y: sScarico2 }] : [];

    const allP = [...new Set([...p1vals, ...p2vals])].sort((a, b) => a - b);
    const tableRows = allP.map((p) => {
      const i1 = p1vals.indexOf(p);
      const i2 = p2vals.indexOf(p);
      return {
        p,
        r1: i1 >= 0 ? r1[i1] : null,
        s1: i1 >= 0 ? s1[i1] : null,
        r2: i2 >= 0 ? r2[i2] : null,
        s2: i2 >= 0 ? s2[i2] : null,
        isRef: testConfig.md.includes(p) || testConfig.mdp.includes(p),
      };
    });

    return { md, mdp, rapporto, chart1, chartScarico1, chart2, chartScarico2, tableRows, rScarico2, sScarico2 };
  }, [diametro, c1, c2, testConfig]);

  const provaValida = rapporto !== null && rapporto < 1;
  const rapportoColor = rapporto === null ? T.textMuted : provaValida ? T.accent : T.accentRed;

  const exportPDF = useCallback(async (preview = false) => {
    setExporting(true);

    try {
      await exportReport(
        {
          chartMaxX,
          tipoProva,
          testConfig,
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
        },
        preview
      );
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
    chartMaxX,
    tipoProva,
    testConfig,
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
function currentRecordData(extra = {}) {
  return {
    verbale,
    cantiere,
    committente,
    diametro,
    tipoProva,
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
    rapporto,
    provaValida,
    md,
    mdp,
    ...extra,
  };
}

function saveCurrent() {
  const id = verbale || nextReportId();
  if (!verbale) setVerbale(id);

  const data = currentRecordData({ verbale: id });
  const record = { id, savedAt: new Date().toISOString(), data };

  setArchive(saveTest(record));
  window.alert(`Prova ${id} salvata in archivio.`);
}

function openRecord(record) {
  const d = record.data || {};

  setVerbale(d.verbale || record.id || "");
  setCantiere(d.cantiere || "");
  setCommittente(d.committente || "Cogen SRL");
  setDiametro(d.diametro || "300");
  setTipoProva(d.tipoProva || "fondazione");
  setDataProva(d.dataProva || "");
  setProvaGiorno(d.provaGiorno || "");
  setTratta(d.tratta || "");
  setKm(d.km || "");
  setSezione(d.sezione || "");
  setTerra(d.terra || "");
  setStrato(d.strato || "");
  setQuota(d.quota || "");
  setDistBordo(d.distBordo || "");
  setTecnico(d.tecnico || "");
  setPresenti(d.presenti || "");
  setFotoProva(d.fotoProva || null);
  setFirmaTecnico(d.firmaTecnico || null);
  setC1(d.c1 || INIT_C1);
  setC2(d.c2 || INIT_C2);
  setTab("c1");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function duplicateRecord(record) {
  const newId = nextReportId();

  const duplicatedData = {
    ...(record.data || {}),
    verbale: newId,
  };

  const duplicatedRecord = {
    id: newId,
    savedAt: new Date().toISOString(),
    data: duplicatedData,
  };

  setArchive(saveTest(duplicatedRecord));
  openRecord(duplicatedRecord);
  window.alert(`Prova duplicata come ${newId}.`);
}

function exportRecord(record) {
  openRecord(record);
  window.alert("Prova aperta. Ora puoi generare il PDF dal pulsante in alto.");
}

     
  const tabs = [
    { id: "c1", label: "1° Ciclo" },
    { id: "c2", label: "2° Ciclo" },
    { id: "results", label: "Risultati" },
    { id: "archive", label: "Archivio" },
  ];

  return (
     
     <LoginGate
    appName="Sistema Gestione Prove DISMAT"
    moduleName="Prova di carico su piastra"
    >
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      
      {/* Container invisibile per consentire ad html2canvas di fotografare il grafico anche se l'utente si trova in un tab differente */}
      <FixedChartContainer 
        chart1={chart1} chartScarico1={chartScarico1} 
        chart2={chart2} chartScarico2={chartScarico2} 
        innerRef={hiddenChartRef}  testConfig={testConfig}
        chartMaxX={chartMaxX}
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
            <Pill label="Md/Md'" value={rapporto.toFixed(2)} color={rapportoColor} bold />
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
<LogoutButton />
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
          <button
  type="button"
  onClick={saveCurrent}
  style={{
    background: T.surfaceHigh,
    color: T.text,
    border: `1px solid ${T.border}`,
    borderRadius: 7,
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    minWidth: 92,
  }}
>
  Salva
</button>
        </div>

      </header>

      <GeneralInfoPanel
        verbale={verbale} setVerbale={setVerbale}
        cantiere={cantiere} setCantiere={setCantiere}
        committente={committente} setCommittente={setCommittente}
        diametro={diametro} setDiametro={setDiametro}
        tipoProva={tipoProva} 
        dataProva={dataProva} setDataProva={setDataProva}
        handleTipoProvaChange={handleTipoProvaChange}
        
        km={km} setKm={setKm}
        sezione={sezione} setSezione={setSezione}
        
        quota={quota} setQuota={setQuota}
  
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
              {testConfig.ciclo1.map((kpa, index) => (
                <StepTable key={kpa} label={index === 0 ? "Carico iniziale" : undefined} kpa={kpa} rows={c1[stepKey(kpa)] || EMPTY_ROWS()} onChange={setC1step(stepKey(kpa))} color={T.cycle1} />
              ))}
              <StepTable label="Scarico →" kpa={testConfig.scarico1} rows={c1.scarico50} onChange={setC1step("scarico50")} color={T.accentBlue} threshold={0.05} />
            </div>
          </div>
        )}

        {tab === "c2" && (
          <div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
              2° ciclo di carico ({testConfig.ciclo2[0]} → {testConfig.ciclo2[testConfig.ciclo2.length - 1]} kPa) + scarico finale a {testConfig.scarico2} kPa.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {testConfig.ciclo2.map((kpa, index) => (
                <StepTable
                  key={kpa}
                  kpa={kpa}
                  rows={c2[stepKey(kpa)] || EMPTY_ROWS()}
                  onChange={index === 0 ? setFirstC2Step : setC2step(stepKey(kpa))}
                  color={T.cycle2}
                />
              ))}
              <StepTable label="Scarico" kpa={testConfig.scarico2} rows={c2.scarico} onChange={setC2step("scarico")} color={T.accentOrange} />
            </div>
          </div>
        )}

        {tab === "results" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
              <ResultCard label="Md — 1° Ciclo" value={md !== null ? md.toFixed(1) : "—"} unit="MPa" color={T.cycle1} sub={`Intervallo ${testConfig.md[0]}–${testConfig.md[1]} kPa`} />
              <ResultCard label="Md' — 2° Ciclo" value={mdp !== null ? mdp.toFixed(1) : "—"} unit="MPa" color={T.cycle2} sub={`Intervallo ${testConfig.mdp[0]}–${testConfig.mdp[1]} kPa`} />
              <ResultCard label="Rapporto Md / Md'" value={rapporto !== null ? rapporto.toFixed(2) : "—"} unit="—" color={rapportoColor} highlight={rapporto !== null ? rapportoColor : undefined} sub={rapporto === null ? "In attesa dati" : undefined} />
            </div>
            <div ref={chartRef} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 10px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>GRAFICO CARICO - SPOSTAMENTO</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <LegendDot color={T.cycle1} label="1° Ciclo" />
                  <LegendDot color={T.cycle1} label="Scarico C1" dashed />
                  <LegendDot color={T.cycle2} label="2° Ciclo" />
                </div>
              </div>

              {chart1.length === 0 && chart2.length === 0 && chartScarico1.length === 0 ? (
                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.textDim, border: `1px dashed ${T.border}`, borderRadius: 8 }}>
                  Nessun dato inserito. Il grafico comparirà appena digiti le letture.
                </div>
              ) : (
                <div style={{ width: "100%", height: 220, fontSize: 10, fontFamily: "monospace" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
  margin={{
    top: 38,
    right: 20,
    bottom: 8,
    left: 5,
  }}
>
  <CartesianGrid
    strokeDasharray="3 3"
    stroke="#30363d"
  />

  <XAxis
    type="number"
    dataKey="x"
    name="Carico"
    unit="kPa"
    domain={[0, chartMaxX]}
    orientation="top"
    stroke={T.textMuted}
    tickLine={false}
    axisLine={true}
    label={{
      value: "Carico [kPa]",
      position: "top",
      offset: 14,
      fill: T.textMuted,
    }}
  />

  <YAxis
    type="number"
    dataKey="y"
    name="Spostamento"
    unit="mm"
    domain={[0, "dataMax + 0.5"]}
    reversed={true}
    stroke={T.textMuted}
    tickLine={false}
    axisLine={true}
    tickFormatter={(value) => Number(value).toFixed(2)}
    label={{
      value: "Spostamento [mm]",
      angle: -90,
      position: "insideLeft",
      offset: 10,
      fill: T.textMuted,
    }}
  />

  <Scatter
    name="1° Ciclo"
    data={chart1}
    line={{
      stroke: T.cycle1,
      strokeWidth: 2,
    }}
    fill={T.cycle1}
    shape="circle"
  />

  <Scatter
    name="Scarico C1"
    data={chartScarico1}
    line={{
      stroke: T.cycle1,
      strokeWidth: 1.5,
      strokeDasharray: "4 4",
    }}
    fill="none"
    shape="none"
  />

  <Scatter
    name="2° Ciclo"
    data={chart2}
    line={{
      stroke: T.cycle2,
      strokeWidth: 2,
    }}
    fill={T.cycle2}
    shape="circle"
  />
                      <ReferenceLine
  x={testConfig.md[0]}
  stroke={T.accentBlue}
  strokeWidth={1.5}
  strokeDasharray="6 4"
/>

<ReferenceLine
  x={testConfig.md[1]}
  stroke={T.accentBlue}
  strokeWidth={1.5}
  strokeDasharray="6 4"
/>

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

        {tab === "archive" && (
          <ArchivePanel
            items={archive}
            onOpen={openRecord}
            onDuplicate={duplicateRecord}
            onDelete={(id) => setArchive(deleteTest(id))}
            onExport={exportRecord}
          />
        )}

      </div>
    </div>
    </LoginGate>
  );}
