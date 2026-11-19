// Modulo indipendente per l'elaborazione ufficio. Nessun accesso all'archivio cantiere.
export const TEST_TYPES = {
  fondazione: {label:'Fondazione',ciclo1:[20,50,150,250,350,450],scarico1:50,ciclo2:[50,150,250,350],scarico2:20,md:[250,350],mdp:[250,350]},
  fondo_scavo: {label:'Fondo scavo',ciclo1:[20,50,100,150,200],scarico1:50,ciclo2:[50,100,150],scarico2:20,md:[50,150],mdp:[50,150]},
  rilevato: {label:'Rilevato',ciclo1:[20,50,150,250,350],scarico1:50,ciclo2:[50,150,250],scarico2:20,md:[150,250],mdp:[150,250]}
};
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const numeric = v => {
  if(v===null||v===undefined||String(v).trim()==='') return NaN;
  const text=String(v).trim().replace(/\s/g,'');
  const comma=text.includes(','),dot=text.includes('.');
  if(comma&&dot)return Number(text.lastIndexOf(',')>text.lastIndexOf('.')?text.replace(/\./g,'').replace(',','.'):text.replace(/,/g,''));
  return Number(comma?text.replace(',','.'):text);
};
const lastValid = rows => {
  for(let i=(rows||[]).length-1;i>=0;i--){const n=numeric(rows[i]);if(Number.isFinite(n))return n}
  return null;
};
const interp = (x,xp,fp) => {
  if(x<=xp[0])return fp[0];
  if(x>=xp[xp.length-1])return fp[fp.length-1];
  for(let i=0;i<xp.length-1;i++)if(x>=xp[i]&&x<=xp[i+1])return fp[i]+((fp[i+1]-fp[i])*(x-xp[i]))/(xp[i+1]-xp[i]);
  return 0;
};
// La scelta manuale vale solo per la copia di ufficio e non modifica i dati tecnici.
export function classifyDocument(num,threshold=135000,mode='auto'){
  if(mode==='rapporto')return 'RAPPORTO DI PROVA';
  if(mode==='certificato')return 'CERTIFICATO DI PROVA';
  const n=numeric(num),t=numeric(threshold);
  if(!Number.isFinite(n))return 'DA DEFINIRE';
  return n<(Number.isFinite(t)?t:135000)?'RAPPORTO DI PROVA':'CERTIFICATO DI PROVA';
}
// Accetta i JSON creati dalla Piastra, anche nelle versioni con un ciclo
// incompleto. Non altera mai i dati nel file originale.
const normalizeTestType = value => {
  const raw=String(value??'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[-_]/g,' ');
  if(raw==='fondazione')return 'fondazione';
  if(raw==='fondo scavo')return 'fondo_scavo';
  if(raw==='rilevato')return 'rilevato';
  return null;
};
export function parseOfficeJson(text,sourceName='prova.json'){
  let parsed;
  try{
    parsed=JSON.parse(String(text??'').replace(/^\uFEFF/,'').trim());
  }catch(error){
    throw new Error('Il file non contiene JSON leggibile. Verifica che sia il backup esportato dalla Piastra (può anche avere estensione .txt). Dettaglio: '+error.message);
  }
  const items=Array.isArray(parsed)?parsed:
    Array.isArray(parsed?.records)?parsed.records:
    Array.isArray(parsed?.tests)?parsed.tests:
    Array.isArray(parsed?.prove)?parsed.prove:
    [parsed];
  const records=[],problems=[];
  for(let i=0;i<items.length;i++){
    const r=items[i];
    const data=isObj(r?.data)?r.data:r;
    const indexLabel=String(r?.id??r?.data?.verbale??'record '+(i+1));
    if(!isObj(data)){
      problems.push(indexLabel+': dati prova assenti');continue;
    }
    const c1=isObj(data.c1),c2=isObj(data.c2);
    if(!c1&&!c2){
      problems.push(indexLabel+': mancano le letture C1/C2 della Piastra');continue;
    }
    const type=normalizeTestType(data.tipoProva??data.testConfig?.label);
    if(!type){
      problems.push(indexLabel+': tipologia prova non riconosciuta ('
        +String(data.tipoProva??'non indicata')+')');continue;
    }
    const normalized={...data,tipoProva:type,c1:c1?data.c1:{},c2:c2?data.c2:{}};
    records.push({
      id:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'office-'+Date.now()+'-'+Math.random().toString(36).slice(2),
      originalId:String(r?.id||data.verbale||'prova-'+(i+1)),
      sourceName,importedAt:new Date().toISOString(),
      data:structuredClone(normalized),office:{},
      importNote:(!c1||!c2)?'Prova parziale: un ciclo non è presente nel JSON. Verificare prima della consegna.':null
    });
  }
  if(!records.length){
    throw new Error('Nessuna prova Piastra importabile nel file. '
      +(problems.length?problems.slice(0,3).join(' | '):'Il backup non contiene prove.')
      +(problems.length>3?' (e altri '+(problems.length-3)+' problemi)':''));
  }
  return {records,ignored:problems.length,problems};
}
// Calcolo ricostruito dal motore corrente: lo stesso motore dei tecnici rimane intatto.
// L'ufficio usa i risultati del JSON quando disponibili, e ricostruisce solo grafico/tabella.
export function buildOfficeReport(record,office=record.office||{}){
  if(!record||!isObj(record.data))throw new Error('Prova non selezionata.');
  const source=record.data;
  // Correzioni applicate esclusivamente alla copia ufficio, senza mutare il JSON importato.
  const d={...source,...office};
  const editedTechnical=['c1','c2','diametro','tipoProva'].some(k=>Object.prototype.hasOwnProperty.call(office,k)&&JSON.stringify(office[k])!==JSON.stringify(source[k]));
  const config=TEST_TYPES[d.tipoProva];
  if(!config)throw new Error('Tipologia prova non riconosciuta: '+d.tipoProva);
  const c1=isObj(d.c1)?d.c1:{},c2=isObj(d.c2)?d.c2:{};
  const p1=config.ciclo1,p2=config.ciclo2;
  const r1=p1.map(p=>lastValid(c1['p'+p]));
  const r2=p2.map(p=>lastValid(c2['p'+p]));
  const scarico1=lastValid(c1.scarico50),scarico2=lastValid(c2.scarico);
  const zero=r1[0];
  const s1=r1.map(x=>x!==null&&zero!==null?Math.abs(x-zero):null);
  const s2=r2.map(x=>x!==null&&zero!==null?Math.abs(x-zero):null);
  const sScarico1=scarico1!==null&&zero!==null?Math.abs(scarico1-zero):null;
  const sScarico2=scarico2!==null&&zero!==null?Math.abs(scarico2-zero):null;
  const firstC2=Array.isArray(c2['p'+p2[0]])?numeric(c2['p'+p2[0]][0]):NaN;
  const rInizioC2=Number.isFinite(firstC2)?firstC2:null;
  const sInizioC2=rInizioC2!==null&&zero!==null?Math.abs(rInizioC2-zero):null;
  const [from1,to1]=config.md,[from2,to2]=config.mdp;
  const ds1=Math.abs(interp(to1,p1,s1.map(v=>v??0))-interp(from1,p1,s1.map(v=>v??0)));
  const ds2=Math.abs(interp(to2,p2,s2.map(v=>v??0))-interp(from2,p2,s2.map(v=>v??0)));
  const diameter=numeric(d.diametro)||300;
  const calcMd=ds1>0&&r1.some(v=>v!==null)?((to1-from1)/1000/ds1)*diameter:null;
  const calcMdp=ds2>0&&r2.some(v=>v!==null)?((to2-from2)/1000/ds2)*diameter:null;
  const storedMd=numeric(d.md),storedMdp=numeric(d.mdp),storedRapporto=numeric(d.rapporto);
  const md=editedTechnical?calcMd:(Number.isFinite(storedMd)?storedMd:calcMd);
  const mdp=editedTechnical?calcMdp:(Number.isFinite(storedMdp)?storedMdp:calcMdp);
  const rapporto=editedTechnical?(md!==null&&mdp>0?md/mdp:null):(Number.isFinite(storedRapporto)?storedRapporto:(md!==null&&mdp>0?md/mdp:null));
  const chart1=p1.flatMap((p,i)=>s1[i]!==null?[{x:p,y:s1[i]}]:[]);
  const lastC1=s1[s1.length-1],lastC2=s2[s2.length-1];
  const chartScarico1=lastC1!==null&&sScarico1!==null?[{x:p1[p1.length-1],y:lastC1},{x:config.scarico1,y:sScarico1}]:[];
  const chart2=r2.some(v=>v!==null)?[...(sScarico1!==null?[{x:config.scarico1,y:sScarico1}]:[]),...p2.flatMap((p,i)=>s2[i]!==null?[{x:p,y:s2[i]}]:[])]:[];
  const chartScarico2=lastC2!==null&&sScarico2!==null?[{x:p2[p2.length-1],y:lastC2},{x:config.scarico2,y:sScarico2}]:[];
  const tableRows=[...new Set([...p1,...p2])].sort((a,b)=>a-b).map(p=>{
    const i1=p1.indexOf(p),i2=p2.indexOf(p);
    return {p,r1:i1>=0?r1[i1]:null,s1:i1>=0?s1[i1]:null,r2:i2>=0?r2[i2]:null,s2:i2>=0?s2[i2]:null,isRef:config.md.includes(p)||config.mdp.includes(p)};
  });
  const mismatch=!editedTechnical&&((Number.isFinite(storedMd)&&calcMd!==null&&Math.abs(storedMd-calcMd)>0.001)||(Number.isFinite(storedMdp)&&calcMdp!==null&&Math.abs(storedMdp-calcMdp)>0.001));
  return {...d,...office,testConfig:config,md,mdp,rapporto,tableRows,chart1,chart2,chartScarico1,chartScarico2,
    rScarico2:scarico2,sScarico2,rInizioC2,sInizioC2,sourceId:record.originalId,technicalMismatch:mismatch,technicalEdited:editedTechnical};
}
