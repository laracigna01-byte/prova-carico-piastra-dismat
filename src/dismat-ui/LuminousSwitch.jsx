import "./luminous-switch.css";

// Il tema resta gestito dall'applicazione: nessun nuovo archivio o localStorage.
export function LuminousSwitch({ dark, onToggle }) {
  return (
    <button type="button" className={`du-luminous-switch${dark ? " is-night" : ""}`}
      role="switch" aria-label="Tema scuro" aria-checked={dark}
      title={dark ? "Passa al tema chiaro" : "Passa al tema scuro"} onClick={onToggle}>
      <span className="du-sky" aria-hidden="true">
        <span className="du-cloud du-cloud-1" /><span className="du-cloud du-cloud-2" /><span className="du-cloud du-cloud-3" />
        <span className="du-stars"><i>✦</i><i>✧</i><i>·</i><i>✦</i><i>·</i></span>
        <span className="du-orbit du-orbit-1" /><span className="du-orbit du-orbit-2" />
        <span className="du-orb">
          <span className="du-sun"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="16" cy="16" r="6"/><path d="M16 3v3m0 20v3M3 16h3m20 0h3M7 7l2 2m14 14 2 2M25 7l-2 2M9 23l-2 2"/></svg></span>
          <span className="du-moon"><svg viewBox="0 0 32 32" fill="currentColor"><path d="M26 21A13 13 0 0 1 11 5a12 12 0 1 0 15 16Z"/><path d="m22 5 1.2 3.5L27 10l-3.8 1.2L22 15l-1.2-3.8L17 10l3.8-1.5Z"/></svg></span>
        </span>
      </span>
    </button>
  );
}
