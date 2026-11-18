import {useEffect,useMemo,useRef,useState} from 'react';
import {LoginGate} from '../security/LoginGate';
import {useAuth} from '../security/AuthContext';
import {exportMinutaExcel} from '../excel/minutaExcel';
import {parseOfficeJson,buildOfficeReport,classifyDocument} from './officeData';
import {loadOfficeRecords,saveOfficeRecord} from './officeStore';
import './office.css';

const CANTIERE_FIELDS=[
 ['verbale','Numero prova'],
 ['cantiere','Cantiere'],
 ['committente','Committente'],
 ['dataProva','Data della prova'],
 ['km','Km / Localizzazione'],
 ['sezione','Sezione'],
 ['quota','Quota'],
 ['tratta','Tratta'],
 ['terra','Terreno'],
 ['strato','Strato / Note'],
 ['distBordo','Distanza dal bordo'],
 ['tecnico','Tecnico esecutore'],
 ['presenti','Presenti']
];
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
  function editCopy(name,value){
    if(!selected)return;
    setDraft(prev=>{
      const next={...prev};
      if(value===String(selected.data?.[name]??'')){delete next[name];}
      else next[name]=value;
      return next;
    });
    setDirty(true);
  }
  function resetCopy(name){
    setDraft(prev=>{const next={...prev};delete next[name];return next;});
    setDirty(true);
  }
  function editReading(cycle,step,index,value){
    if(!selected)return;
    const source=selected.data?.[cycle]||{};
    setDraft(prev=>{
      const next={...prev};
      const updated=structuredClone(prev[cycle]||source);
      const readings=Array.isArray(updated[step])?[...updated[step]]:[];
      readings[index]=value;
      updated[step]=readings;
      if(JSON.stringify(updated)===JSON.stringify(source))delete next[cycle];
      else next[cycle]=updated;
      return next;
    });
    setDirty(true);
  }
  function resetTechnical(){
    setDraft(prev=>{
      const next={...prev};
      for(const key of ['c1','c2','diametro','tipoProva','notaCorrezioneTecnica'])delete next[key];
      return next;
    });
    setDirty(true);
  }
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
      if(detail.technicalEdited&&!String(draft.notaCorrezioneTecnica||'').trim())throw new Error('Indica il motivo delle correzioni tecniche prima di esportare.');
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
        <p>Importa il JSON dei tecnici. Correggi i dati nella copia ufficio, completa le intestazioni e genera la minuta modificabile.</p>
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
        <div className="office-banner"><span className="office-banner-dot"/> I dati del JSON sono precaricati e modificabili nella copia ufficio. Il JSON originale e l'app dei ragazzi rimangono invariati.</div>
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
                <div className="office-cardhead"><h3>01 · Dati del cantiere nella minuta</h3><span>Precompilati e modificabili</span></div>
                <p className="office-small">I campi partono dai valori del JSON. Le correzioni valgono solo per questa minuta e vengono salvate nell'archivio ufficio.</p>
                <div className="office-fields">
                  {CANTIERE_FIELDS.map(([name,label])=>
                    <label key={name}>{label}
                      <div className="office-inputrow">
                        <input type="text" value={draft[name]??selected.data?.[name]??''}
                          onChange={e=>editCopy(name,e.target.value)} />
                        {Object.prototype.hasOwnProperty.call(draft,name)&&
                          <button className="office-reset" type="button" title="Ripristina il valore ricevuto dal cantiere" onClick={()=>resetCopy(name)}>↶</button>}
                      </div>
                    </label>
                  )}
                </div>
                <div className="office-resultstrip">
                  <div><span>Md · 1° ciclo</span><strong>{displayNumber(detail.md,3)}</strong><small>N/mm²</small></div>
                  <div><span>Md’ · 2° ciclo</span><strong>{displayNumber(detail.mdp,3)}</strong><small>N/mm²</small></div>
                  <div><span>Rapporto Md/Md’</span><strong>{displayNumber(detail.rapporto,3)}</strong><small>—</small></div>
                </div>
                <p className="office-small">Le letture originali restano conservate. Se occorre correggerle nella copia ufficio, espandi la sezione tecnica in basso: i risultati vengono ricalcolati.</p>
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
              <div className="office-card office-technical">
                <details>
                  <summary>03 · Dati tecnici e letture (correzioni facoltative nella copia ufficio)</summary>
                  <p className="office-small">Le letture provengono dal JSON. Se vengono corrette, Md, Md' e il grafico sono ricalcolati solo nella minuta di Cast. Le letture originali non vengono sovrascritte.</p>
                  <div className="office-fields">
                    <label>Diametro piastra (mm)
                      <select value={draft.diametro??selected.data?.diametro??'300'} onChange={e=>editCopy('diametro',e.target.value)}>
                        {['300','450','600'].map(v=><option key={v} value={v}>{v} mm</option>)}
                      </select>
                    </label>
                    <label>Tipologia di prova
                      <select value={draft.tipoProva??selected.data?.tipoProva??'fondazione'} onChange={e=>editCopy('tipoProva',e.target.value)}>
                        <option value="fondazione">Fondazione</option>
                        <option value="fondo_scavo">Fondo scavo</option>
                        <option value="rilevato">Rilevato</option>
                      </select>
                    </label>
                  </div>
                  {[
                    ['c1','1° ciclo',[...detail.testConfig.ciclo1.map(p=>['p'+p,p+' kPa']),['scarico50','Scarico']]],
                    ['c2','2° ciclo',[...detail.testConfig.ciclo2.map(p=>['p'+p,p+' kPa']),['scarico','Scarico']]]
                  ].map(([cycle,label,steps])=>
                    <details className="office-reading-group" key={cycle}>
                      <summary>{label} · Letture in mm</summary>
                      {steps.map(([step,stepLabel])=>
                        <div className="office-readings" key={step}>
                          <strong>{stepLabel}</strong>
                          <div className="office-reading-grid">
                            {(draft[cycle]?.[step]??selected.data?.[cycle]?.[step]??[]).map((reading,index)=>
                              <label key={step+'-'+index}>Lettura {index+1}
                                <input type="text" inputMode="decimal" value={reading??''}
                                  onChange={e=>editReading(cycle,step,index,e.target.value)}/>
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </details>
                  )}
                  <label className="office-technical-note">Motivo delle correzioni tecniche
                    <textarea rows={2} value={draft.notaCorrezioneTecnica??''}
                      onChange={e=>{setDraft(prev=>({...prev,notaCorrezioneTecnica:e.target.value}));setDirty(true)}}
                      placeholder="Obbligatorio per esportare se hai modificato le letture o il diametro"/>
                  </label>
                  {detail.technicalEdited&&<div className="office-warning">
                    Le letture o i parametri tecnici sono stati modificati rispetto al JSON. Md, Md' e il grafico sono ricalcolati per la minuta. Inserisci il motivo e verifica la correttezza prima dell'emissione.
                  </div>}
                  <button type="button" className="office-save" onClick={resetTechnical}>Ripristina tutti i dati tecnici dal JSON</button>
                </details>
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
