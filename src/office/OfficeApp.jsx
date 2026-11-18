import {useEffect,useMemo,useRef,useState} from 'react';
import {LoginGate} from '../security/LoginGate';
import {useAuth} from '../security/AuthContext';
import {exportMinutaExcel} from '../excel/minutaExcel';
import {parseOfficeJson,buildOfficeReport,classifyDocument} from './officeData';
import {loadOfficeRecords,saveOfficeRecord} from './officeStore';
import './office.css';

const FIELDS=[
 ['numeroDocumento','Numero rapporto / certificato'],
 ['dataDocumento','Data documento'],
 ['protocollo','Protocollo'],
 ['dataProtocollo','Data protocollo'],
 ['verbaleAccettazione','Verb. accettazione nr.'],
 ['dataAccettazione','Data accettazione'],
 ['consegnaLaboratorio','Consegna in Laboratorio'],
 ['dataConsegna','Data consegna'],
 ['emendamentoNumero','Emendamento al cert. nr.'],
 ['oggettoLavori','Oggetto dei lavori'],
 ['ubicazioneCantiere','Ubicazione Cantiere (se diversa)'],
 ['richiedente','Richiedente'],
 ['letteraRichiesta','Lettera di richiesta'],
 ['direttoreLavori','Direttore dei Lavori'],
 ['impresa','Impresa'],
 ['proprietario','Proprietario / Ente appaltante']
];
function displayNumber(n,digits=2){return typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('it-IT',{minimumFractionDigits:digits,maximumFractionDigits:digits}):'—'}
function OfficeContent(){
  const {logout}=useAuth();
  const fileRef=useRef(null);
  const [records,setRecords]=useState([]);
  const [selectedId,setSelectedId]=useState('');
  const [draft,setDraft]=useState({});
  const [dirty,setDirty]=useState(false);
  const [loading,setLoading]=useState(true);
  const [importing,setImporting]=useState(false);
  const [message,setMessage]=useState('');
  const [search,setSearch]=useState('');
  const selected=records.find(r=>r.id===selectedId)||null;
  const detail=useMemo(()=>{
    if(!selected)return null;
    try{return buildOfficeReport(selected,draft)}catch(error){return {error:error.message}}
  },[selected,draft]);
  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return records.filter(r=>!q||[r.originalId,r.sourceName,r.data?.verbale,r.data?.cantiere,r.data?.committente]
      .some(v=>String(v||'').toLowerCase().includes(q)));
  },[records,search]);

  useEffect(()=>{
    let active=true;
    loadOfficeRecords().then(list=>{
      if(!active)return;
      setRecords(list);
      if(list.length){setSelectedId(list[0].id);setDraft(list[0].office||{})}
      setLoading(false);
    }).catch(err=>{if(active){setMessage('Archivio ufficio non disponibile: '+err.message);setLoading(false)}});
    return ()=>{active=false};
  },[]);

  function selectRecord(record){
    if(dirty&&!window.confirm('Hai modifiche ufficio non salvate. Passare a un’altra prova senza salvarle?'))return;
    setSelectedId(record.id);setDraft(record.office||{});setDirty(false);setMessage('');
  }
  async function importFiles(files){
    if(!files?.length)return;
    setImporting(true);setMessage('');
    let n=0,invalid=0;const added=[];const failures=[];
    for(const file of Array.from(files)){
      try{
        const parsed=parseOfficeJson(await file.text(),file.name);
        for(const item of parsed.records){await saveOfficeRecord(item);added.push(item);n++}
        invalid+=parsed.ignored;
      }catch(error){failures.push(file.name+': '+error.message)}
    }
    if(added.length){
      const next=[...added.reverse(),...records];
      setRecords(next);setSelectedId(next[0].id);setDraft({});setDirty(false);
    }
    const report=n+' prova/e importata/e nell’archivio ufficio.'+(invalid?' '+invalid+' record ignorati.':'');
    setMessage(report+(failures.length?' Problemi: '+failures.join(' | '):''));
    setImporting(false);
  }
  async function saveDraft(){
    if(!selected)throw new Error('Seleziona prima una prova.');
    const next={...selected,office:{...draft},officeSavedAt:new Date().toISOString()};
    await saveOfficeRecord(next);
    setRecords(prev=>prev.map(item=>item.id===next.id?next:item));
    setDirty(false);setMessage('Completamento ufficio salvato. Il JSON originale non è stato modificato.');
    return next;
  }
  async function save(){
    try{await saveDraft()}catch(error){setMessage('Salvataggio non riuscito: '+error.message)}
  }
  async function downloadExcel(){
    if(!selected||detail?.error)return;
    try{
      if(dirty)await saveDraft();
      await exportMinutaExcel(buildOfficeReport(selected,draft));
      setMessage('Minuta Excel generata dai dati di cantiere e dalle integrazioni ufficio.');
    }catch(error){setMessage('Esportazione non riuscita: '+error.message)}
  }
  return <main className="office-root">
    <header className="office-header">
      <div className="office-brand"><img src="/logo-dismat.jpg" alt="Logo DISMAT"/>
        <div><strong>LABORATORIO DISMAT</strong><span>Prova di carico su piastra · Elaborazione ufficio</span></div>
      </div>
      <div className="office-header-actions"><a href="/">Apri app cantiere</a><button type="button" onClick={logout}>Esci</button></div>
    </header>
    <div className="office-layout">
      <aside className="office-sidebar">
        <div className="office-section-caption">AREA RISERVATA ALL’ELABORAZIONE</div>
        <h1>Minute e rapporti</h1>
        <p>Importa il JSON dei tecnici. Completa solo i dati di ufficio e genera la minuta modificabile.</p>
        <button className="office-import" disabled={importing||loading} type="button" onClick={()=>fileRef.current?.click()}>
          {importing?'Importazione…':'Importa JSON dal cantiere'}
        </button>
        <input ref={fileRef} hidden multiple type="file" accept=".json,application/json"
          onChange={event=>{void importFiles(event.target.files);event.target.value=''}}/>
        <label className="office-search-label">Cerca tra le prove importate
          <input type="search" value={search} placeholder="Numero, cantiere, committente…" onChange={e=>setSearch(e.target.value)}/>
        </label>
        <div className="office-record-count">{visible.length} prove nell’elenco</div>
        <div className="office-records">
          {loading?<p>Caricamento archivio ufficio…</p>:visible.length===0?<p>Nessuna prova importata.</p>:visible.map(rec=>
            <button type="button" key={rec.id} className={rec.id===selectedId?'office-record selected':'office-record'} onClick={()=>selectRecord(rec)}>
              <strong>{rec.data?.verbale||rec.originalId||'Prova'}</strong>
              <span>{rec.data?.cantiere||'Cantiere non indicato'}</span>
              <small>{rec.data?.dataProva||'Data non indicata'}</small>
            </button>
          )}
        </div>
      </aside>
      <section className="office-main">
        <div className="office-banner"><span className="office-banner-dot"/> I dati del cantiere sono di sola lettura. L’archivio dei tecnici rimane separato e invariato.</div>
        {message&&<div className="office-message" role="status">{message}</div>}
        {!selected?<div className="office-empty"><h2>Seleziona o importa una prova</h2><p>Puoi caricare il backup JSON dell’archivio Piastra o il JSON di una singola prova.</p></div>:
          <>
            <div className="office-titleline"><div><span className="office-section-caption">ELABORAZIONE DOCUMENTALE</span>
              <h2>Prova {selected.data?.verbale||selected.originalId}</h2><p>Origine: {selected.sourceName} · importata il {new Date(selected.importedAt).toLocaleString('it-IT')}</p>
            </div><span className="office-status">{dirty?'Modifiche non salvate':'Pronta per completamento'}</span></div>
            {detail?.error?<div className="office-message">Dati non leggibili: {detail.error}</div>:
            <>
              {detail?.technicalMismatch&&<div className="office-warning">Attenzione: i risultati memorizzati nel JSON non coincidono con quelli ricalcolati dalle letture. Verifica la prova prima della consegna; nessun valore viene alterato automaticamente.</div>}
              <div className="office-card">
                <div className="office-cardhead"><h3>01 · Dati ricevuti dal cantiere</h3><span>Non modificabili</span></div>
                <div className="office-metadata">
                  <div><small>Committente</small><strong>{detail.committente||'—'}</strong></div>
                  <div><small>Cantiere</small><strong>{detail.cantiere||'—'}</strong></div>
                  <div><small>Data prova</small><strong>{detail.dataProva||'—'}</strong></div>
                  <div><small>Tipologia / strato</small><strong>{detail.testConfig.label}</strong></div>
                  <div><small>Diametro piastra</small><strong>{detail.diametro||'—'} mm</strong></div>
                  <div><small>Tecnico</small><strong>{detail.tecnico||'—'}</strong></div>
                </div>
                <div className="office-resultstrip">
                  <div><span>Md · 1° ciclo</span><strong>{displayNumber(detail.md,3)}</strong><small>N/mm²</small></div>
                  <div><span>Md’ · 2° ciclo</span><strong>{displayNumber(detail.mdp,3)}</strong><small>N/mm²</small></div>
                  <div><span>Rapporto Md/Md’</span><strong>{displayNumber(detail.rapporto,3)}</strong><small>—</small></div>
                </div>
                <p className="office-small">Letture C1 e C2, grafico, foto e risultati vengono trasferiti direttamente dal JSON nella minuta Excel.</p>
              </div>
              <div className="office-card">
                <div className="office-cardhead"><h3>02 · Completamento dell’architetto</h3><span>Modificabile</span></div>
                <div className="office-fields">
                  {FIELDS.map(([name,label])=>
                    <label key={name}>{label}<input type="text" inputMode={name==='numeroDocumento'?'numeric':'text'}
                      value={draft[name]??''} onChange={e=>{setDraft(prev=>({...prev,[name]:e.target.value}));setDirty(true)}}/></label>
                  )}
                  <label>Soglia tipo documento
                    <input type="number" min="0" value={draft.sogliaDocumento??135000} onChange={e=>{setDraft(prev=>({...prev,sogliaDocumento:e.target.value}));setDirty(true)}}/>
                  </label>
                </div>
                <div className="office-type"><span>Tipologia suggerita dal numero</span><strong>{classifyDocument(draft.numeroDocumento,draft.sogliaDocumento??135000)}</strong></div>
                <p className="office-small">La soglia riproduce la regola del modello Excel. La tipologia definitiva resta soggetta alla verifica e all’approvazione del responsabile.</p>
              </div>
              <div className="office-actions">
                <button type="button" className="office-save" onClick={()=>void save()}>Salva completamento</button>
                <button type="button" className="office-export" onClick={()=>void downloadExcel()}>Genera minuta Excel</button>
              </div>
            </>}
          </>
        }
      </section>
    </div>
  </main>;
}
export default function OfficeApp(){
  return <LoginGate appName="Sistema Gestione Prove DISMAT" moduleName="Elaborazione ufficio · Piastra"><OfficeContent/></LoginGate>;
}
