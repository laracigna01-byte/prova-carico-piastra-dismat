import ExcelJS from 'exceljs';
import {captureOriginalPlatePdf} from '../office/pdfSnapshot.js';
import {classifyDocument} from '../office/officeData.js';
import {laboratorySignature} from '../office/laboratoryFields.js';

// Layout della prima pagina COPIATO dal generatore Palo approvato.
// La Piastra conserva i propri dati tecnici, risultati e PDF originale.
const clean = value => String(value ?? '');
const numeric = value => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const wrap = (ws, from, to, label, value) => {
  ws.mergeCells(from);
  ws.mergeCells(to);
  const l = ws.getCell(from.split(':')[0]);
  const v = ws.getCell(to.split(':')[0]);
  l.value = label; v.value = clean(value);
  l.font = {name:'Arial',size:8,bold:true,color:{argb:'FF4D4D4D'}};
  v.font = {name:'Arial',size:8,color:{argb:'FF292929'}};
  l.alignment = {vertical:'middle'};
  v.alignment = {vertical:'middle',wrapText:true};
  v.border = {bottom:{style:'hair',color:{argb:'FFBBBBBB'}}};
};
const band = (ws, range, caption) => {
  ws.mergeCells(range);
  const c = ws.getCell(range.split(':')[0]);
  c.value = caption;
  c.font = {name:'Arial',size:8,bold:true,color:{argb:'FF292929'}};
  c.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FFE8EAED'}};
  c.alignment = {vertical:'middle'};
};
const addPng = (workbook,uri) => {
  if (typeof uri !== 'string') return null;
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(uri);
  if (!m) return null;
  return workbook.addImage({base64:uri,extension:m[1].toLowerCase()==='png'?'png':'jpeg'});
};
const styleSheet = (ws) => {
  ws.getRow(1).font = {name:'Arial',size:10,bold:true,color:{argb:'FFFFFFFF'}};
  ws.getRow(1).fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF303030'}};
  ws.getRow(1).alignment = {vertical:'middle'};
  ws.getRow(1).height = 22;
  ws.views = [{state:'frozen',ySplit:1}];
};
const setCell = (ws,cell,value) => {ws.getCell(cell).value = value ?? '';};
const fmt = n => n === null ? '' : n;

// Identico testo di intestazione usato nell'Excel Palo.
const LAB_HEADER = "L A B O R A T O R I O\nD I S M A T\nSperimentazione sulle Strutture e sui Materiali da Costruzione\nAutorizzato ai sensi dell'art. 20 Legge 1086/71 con D.M. 415 del 01/12/2020\nc/da Andolina S.S. 122 Km 28 92024 CANICATTI' (AG)\nPI/CF 04534491008 - Reg. Imprese di Agrigento - Cap. Sociale € 280.300 i.v.\ntel. 0922 859406 - info.dismat@gmail.com - www.dismat.it";

export function buildPiastraExcel(d={}) {
  const book = new ExcelJS.Workbook();
  book.creator = 'DISMAT Elaborazioni Piastra';
  book.calcProperties.fullCalcOnLoad = true;
  const ws = book.addWorksheet('MINUTA',{views:[{showGridLines:false}]});

  // Le stesse colonne, altezze, margini, impostazioni e firme di Palo.
  for (let i=1;i<=41;i++) ws.getColumn(i).width = 621/256;
  ws.getColumn(1).width = 146/256;
  ws.getColumn(42).width = 1206/256;
  for (let i=1;i<=61;i++) ws.getRow(i).height = 12.95;
  ws.getRow(1).height = 76;
  ws.pageSetup = {
    paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:1,
    margins:{left:0.16,right:0.16,top:0.17,bottom:0.17,header:0,footer:0},
    printArea:'A1:AN61'
  };
  ws.properties.pageSetUpPr = {fitToPage:true};
  const logo = addPng(book,d.logoDataUrl);
  if (logo !== null) ws.addImage(logo,{tl:{col:1,row:0.2},ext:{width:76,height:66}});
  ws.mergeCells('G1:AN1');
  const h = ws.getCell('G1');
  h.value = LAB_HEADER;
  h.font = {name:'Arial',size:7,bold:true,color:{argb:'FF292929'}};
  h.alignment = {horizontal:'right',vertical:'middle',wrapText:true};

  const numeroDoc = numeric(d.numeroDocumento);
  const threshold = numeric(d.sogliaDocumento) ?? 135000;
  const mode = ['rapporto','certificato'].includes(d.modalitaDocumento) ? d.modalitaDocumento : 'auto';
  const type = classifyDocument(numeroDoc,threshold,mode);
  const numberLabel = type==='CERTIFICATO DI PROVA'?'Certificato nr.':type==='RAPPORTO DI PROVA'?'Rapporto nr.':'Documento nr.';

  // Le stesse otto caselle del blocco superiore di Palo.
  wrap(ws,'B2:F2','G2:N2',numberLabel,fmt(numeroDoc));
  ws.getCell('G2').value = numeroDoc ?? '';
  ws.getCell('B2').value = {
    formula:'IF(PARAMETRI!B6="CERTIFICATO DI PROVA","Certificato nr.",IF(PARAMETRI!B6="RAPPORTO DI PROVA","Rapporto nr.","Documento nr."))',
    result:numberLabel
  };
  wrap(ws,'O2:R2','S2:Z2','Data',d.dataDocumento);
  wrap(ws,'AA2:AF2','AG2:AN2','Natura campioni',d.naturaCampioni||d.testConfig?.label||'Piastra');
  wrap(ws,'B3:F3','G3:N3','Protocollo',d.protocollo);
  wrap(ws,'O3:R3','S3:Z3','Data',d.dataProtocollo);
  wrap(ws,'AA3:AF3','AG3:AN3','Data prova',d.dataProva);
  wrap(ws,'B4:F4','G4:N4','Verbale accett.',d.verbaleAccettazione);
  wrap(ws,'O4:R4','S4:Z4','Data',d.dataAccettazione);

  const adminRows = [
    ['Oggetto dei lavori',d.oggettoLavori],
    ['Ubicazione cantiere',d.ubicazioneCantiere||d.cantiere],
    ['Richiedente',d.richiedente||d.committente],
    ['Direttore dei lavori',d.direttoreLavori],
    ['Impresa',d.impresa],
    ...(d.mostraProprietario===true?[['Proprietario / Ente appaltante',d.proprietario]]:[]),
    ['Direttore di stabilimento/produzione',d.direttoreStabilimento],
    ['Prova eseguita da',d.nomeSperimentatore||d.provaEseguitaDa||d.tecnico]
  ];
  adminRows.forEach(([label,value],i) => {
    const row=i+5;
    wrap(ws,'B'+row+':N'+row,'O'+row+':AN'+row,label,value);
  });
  ws.getRow(5).height=37;
  ws.getCell('O5').alignment={vertical:'middle',wrapText:true};
  ws.getRow(15).height=16;
  band(ws,'B15:AN15',(type==='DA DEFINIRE'?'':type+' - CARICO STATICO SU PIASTRA'));
  ws.getCell('B15').value={
    formula:'IF(PARAMETRI!B6="DA DEFINIRE","",PARAMETRI!B6&" - CARICO STATICO SU PIASTRA")',
    result:type==='DA DEFINIRE'?'':type+' - CARICO STATICO SU PIASTRA'
  };

  // Stessa area sotto la barra tecnica di Palo, solo che Piastra usa
  // il ritaglio PDF autentico contenente foto, tabella e grafico di Piastra.
  // Proporzioni 190x175, senza stretch o alterazione del grafico.
  const snapshot=addPng(book,d.reportImage);
  if(snapshot!==null) {
    const imageWidth=735;
    const imageHeight=Math.round(imageWidth*175/190);
    ws.addImage(snapshot,{tl:{col:1,row:16},ext:{width:imageWidth,height:imageHeight}});
  }

  // La firma autografa del tecnico viene gia mostrata nel riquadro tecnico
  // del PDF della Piastra catturato sopra. Non duplicarla nel blocco firme.
  // Il firmatario del Laboratorio resta identico a Palo, nella stessa posizione.
  const firma=laboratorySignature(d);
  ws.mergeCells('V58:AN58');setCell(ws,'V58',firma.qualifica);
  ws.mergeCells('V59:AN59');setCell(ws,'V59',firma.nome);
  for(const ref of ['V58','V59']){
    ws.getCell(ref).alignment={horizontal:'center'};
    ws.getCell(ref).font={name:'Arial',size:8,bold:ref.endsWith('59')};
  }

  // Gli altri fogli restano consultabili/editabili e non alterano il PDF cantiere.
  const readings=book.addWorksheet('LETTURE');
  readings.columns=[
    {header:'Ciclo',key:'cycle',width:14},
    {header:'Fase',key:'phase',width:16},
    {header:'Carico (kPa)',key:'pressure',width:17},
    {header:'Numero lettura',key:'number',width:20},
    {header:'Lettura (mm)',key:'value',width:19},
    {header:'Ultima (mm)',key:'last',width:19},
    {header:'Note',key:'note',width:24}
  ];
  styleSheet(readings);
  const config=d.testConfig||{};
  for(const [label,src,steps] of [['C1',d.c1||{},config.ciclo1||[]],['C2',d.c2||{},config.ciclo2||[]]]){
    for(const p of steps){
      const vals=src['p'+p]||[];
      const last=[...vals].reverse().map(numeric).find(v=>v!==null)??null;
      for(let i=0;i<vals.length;i++)if(numeric(vals[i])!==null){
        readings.addRow({cycle:label,phase:'Carico',pressure:p,number:i+1,value:numeric(vals[i]),last:fmt(last),note:''});
      }
    }
    const key=label==='C1'?'scarico50':'scarico';
    const load=label==='C1'?config.scarico1:config.scarico2;
    for(let i=0;i<(src[key]||[]).length;i++)if(numeric(src[key][i])!==null){
      readings.addRow({cycle:label,phase:'Scarico',pressure:load,number:i+1,value:numeric(src[key][i]),last:'',note:''});
    }
  }

  const graph=book.addWorksheet('GRAFICO');
  const graphHeaders=['C1: carico','C1: spost.','Scarico 1: carico','Scarico 1: spost.','C2: carico','C2: spost.','Scarico 2: carico','Scarico 2: spost.'];
  graph.columns=graphHeaders.map((header,i)=>({header,key:'c'+i,width:24}));
  styleSheet(graph);
  const chartSeries=[d.chart1||[],d.chartScarico1||[],d.chart2||[],d.chartScarico2||[]];
  for(let i=0;i<Math.max(0,...chartSeries.map(x=>x.length));i++){
    graph.addRow(Object.fromEntries(chartSeries.flatMap((series,k)=>[
      ['c'+(2*k),numeric(series[i]?.x)],
      ['c'+(2*k+1),numeric(series[i]?.y)]
    ])));
  }

  const param=book.addWorksheet('PARAMETRI');
  param.columns=[{header:'Parametro',key:'name',width:38},{header:'Valore',key:'value',width:30}];
  styleSheet(param);
  setCell(param,'A3','Numero documento (MINUTA!G2)');
  setCell(param,'B3',{formula:'IF(ISNUMBER(MINUTA!G2),MINUTA!G2,"")',result:numeroDoc??''});
  setCell(param,'A4','Soglia automatica (avanzata)');setCell(param,'B4',threshold);
  setCell(param,'A5','Modalità documento');
  setCell(param,'B5',mode==='rapporto'?'RAPPORTO DI PROVA':mode==='certificato'?'CERTIFICATO DI PROVA':'AUTOMATICO');
  setCell(param,'A6','Titolo risultante');
  setCell(param,'B6',{
    formula:'IF(B5="RAPPORTO DI PROVA","RAPPORTO DI PROVA",IF(B5="CERTIFICATO DI PROVA","CERTIFICATO DI PROVA",IF(ISNUMBER(B3),IF(B3<B4,"RAPPORTO DI PROVA","CERTIFICATO DI PROVA"),"DA DEFINIRE")))',
    result:type
  });
  setCell(param,'A8','La soglia cambia solo il tipo documento automatico: verificare prima dell’emissione.');
  param.getCell('A8').alignment={wrapText:true};
  param.getRow(8).height=30;
  return book;
}

export async function exportPiastraExcel(data) {
  // Il PDF tecnico di Piastra viene catturato dal motore esistente, non ridisegnato.
  const response=await fetch('/logo-dismat.jpg');
  if(!response.ok)throw new Error('Logo DISMAT non disponibile.');
  const logoBlob=await response.blob();
  const logoDataUrl=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error('Lettura logo non riuscita.'));
    reader.readAsDataURL(logoBlob);
  });
  const reportImage=await captureOriginalPlatePdf(data);
  if(!/^data:image\/png;base64,[A-Za-z0-9+/=]{100,}$/.test(reportImage)){
    throw new Error('Immagine del PDF Piastra non generata.');
  }
  const book=buildPiastraExcel({...data,logoDataUrl,reportImage});
  const bytes=await book.xlsx.writeBuffer();
  const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const name=clean(data?.verbale||'senza-numero').replace(/[^A-Za-z0-9_-]/g,'_');
  a.href=url;
  a.download='minuta-CAST-GRIGLIA-CAST-V8-'+name+'.xlsx';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}
