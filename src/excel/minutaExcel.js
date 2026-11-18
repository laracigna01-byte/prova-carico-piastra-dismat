/* Minuta Cast: intestazione originale e screenshot PDF generato automaticamente. */
import {captureOriginalPlatePdf} from '../office/pdfSnapshot';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CT = 'http://schemas.openxmlformats.org/package/2006/content-types';
const XL_CHART = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const XL_DRAW = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const ESC = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
const TXT = new TextEncoder();
const co = (i) => { let t=''; for (let n=i; n>0; n=Math.floor((n-1)/26)) t=String.fromCharCode(65+(n-1)%26)+t; return t; };
function sheet() { return {cells:new Map(), merges:[], heights:new Map(), cols:[], drawing:false, width:12}; }
function put(s,row,col,val,style=0) {
 const key=`${co(col)}${row}`;
 if(val===null||val===undefined||val==='') return;
 const type=typeof val==='number'&&Number.isFinite(val)?'n':'s';
 s.cells.set(key,{row,col,val,type,style});
}
function frm(s,row,col,formula,cached,style=0) {
 s.cells.set(`${co(col)}${row}`,{row,col,formula,cached,style,type:'f'});
}
function band(s,row,from,to,label,style=2){put(s,row,from,label,style);s.merges.push(`${co(from)}${row}:${co(to)}${row}`);}
function pairs(s,row,l1,v1,l2,v2){put(s,row,1,l1,3);put(s,row,4,v1,4);put(s,row,7,l2,3);put(s,row,10,v2,4);for(const [a,b] of [[1,3],[4,6],[7,9],[10,12]])s.merges.push(`${co(a)}${row}:${co(b)}${row}`);if(!s.heights.has(row))s.heights.set(row,15);}
function xmlSheet(s){
 const grouped=new Map();for(const c of s.cells.values()){if(!grouped.has(c.row))grouped.set(c.row,[]);grouped.get(c.row).push(c)}for(const row of s.heights.keys())if(!grouped.has(row))grouped.set(row,[]);
 const data=[...grouped.entries()].sort((a,b)=>a[0]-b[0]).map(([row,cells])=>{
  const inner=cells.sort((a,b)=>a.col-b.col).map(c=>{
   const ref=`${co(c.col)}${c.row}`;
   if(c.type==='f') return `<c r="${ref}" s="${c.style}"${typeof c.cached==='string'?' t="str"':''}><f>${ESC(c.formula)}</f><v>${ESC(c.cached??'')}</v></c>`;
   if(c.type==='n') return `<c r="${ref}" s="${c.style}"><v>${c.val}</v></c>`;
   return `<c r="${ref}" s="${c.style}" t="inlineStr"><is><t xml:space="preserve">${ESC(c.val)}</t></is></c>`;
  }).join('');return `<row r="${row}"${s.heights.has(row)?` ht="${s.heights.get(row)}" customHeight="1"`:''}>${inner}</row>`;
 }).join('');
 const widths=(s.cols.length?s.cols:Array.from({length:s.width},(_,i)=>[i+1,14])).map(([i,w])=>`<col min="${i}" max="${i}" width="${w}" customWidth="1"/>`).join('');
 const merged=s.merges.length?`<mergeCells count="${s.merges.length}">${s.merges.map(x=>`<mergeCell ref="${x}"/>`).join('')}</mergeCells>`:'';
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}" xmlns:r="${REL}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="${s.isMinuta?14:21}"/><cols>${widths}</cols><sheetData>${data}</sheetData>${merged}<printOptions horizontalCentered="1"/><pageMargins left="0.35" right="0.35" top="0.42" bottom="0.42" header="0.15" footer="0.15"/><pageSetup orientation="${s.isMinuta?'portrait':'landscape'}" paperSize="9" fitToWidth="1" fitToHeight="${s.isMinuta?1:0}"/>${s.drawing?'<drawing r:id="rId1"/>':''}</worksheet>`;
}
const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.000"/></numFmts><fonts count="8"><font><sz val="10"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="16"/><name val="Aptos Display"/></font><font><b/><color rgb="FF302E2A"/><sz val="10"/></font><font><color rgb="FF786F61"/><sz val="9"/></font><font><color rgb="FF965B34"/><sz val="10"/></font><font><b/><color rgb="FF4A3611"/><sz val="11"/></font><font><b/><color rgb="FF26201B"/><sz val="21"/><name val="Aptos Display"/></font><font><color rgb="FF3B352E"/><sz val="8.3"/><name val="Aptos"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF302E2A"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F0E8"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2D7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="hair"><color rgb="FFD4CDBF"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="12"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="164" fontId="5" fillId="4" borderId="1" xfId="0"/><xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1"/></xf><xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
function crctable(){let a=[];for(let n=0;n<256;n++){let c=n;for(let j=0;j<8;j++)c=c&1?0xEDB88320^(c>>>1):c>>>1;a[n]=c>>>0}return a;}const CRC=crctable();
function checksum(bytes){let c=0xFFFFFFFF;for(const b of bytes)c=CRC[(c^b)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function set16(a,pos,n){a[pos]=n&255;a[pos+1]=(n>>>8)&255;}
function set32(a,pos,n){set16(a,pos,n);set16(a,pos+2,Math.floor(n/65536));}
function zipFile(entries){
 let pos=0;const local=[],dir=[];
 for(const [name,content] of entries){const nm=TXT.encode(name);const data=typeof content==='string'?TXT.encode(content):content;const crc=checksum(data);
  const head=new Uint8Array(30+nm.length);set32(head,0,0x04034b50);set16(head,4,20);set16(head,6,0x800);set32(head,14,crc);set32(head,18,data.length);set32(head,22,data.length);set16(head,26,nm.length);head.set(nm,30);local.push(head,data);
  const cd=new Uint8Array(46+nm.length);set32(cd,0,0x02014b50);set16(cd,4,20);set16(cd,6,20);set16(cd,8,0x800);set32(cd,16,crc);set32(cd,20,data.length);set32(cd,24,data.length);set16(cd,28,nm.length);set32(cd,42,pos);cd.set(nm,46);dir.push(cd);pos+=head.length+data.length;
 }
 const dsize=dir.reduce((a,b)=>a+b.length,0);const end=new Uint8Array(22);set32(end,0,0x06054b50);set16(end,8,entries.length);set16(end,10,entries.length);set32(end,12,dsize);set32(end,16,pos);
 return new Blob([...local,...dir,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
const numeric=x=>{if(x===null||x===undefined||String(x).trim()==='')return null;const n=Number(String(x).replace(',','.'));return Number.isFinite(n)?n:null};
function photoBytes(uri){if(typeof uri!=='string')return null;const m=/^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/i.exec(uri);if(!m)return null;try{const raw=atob(m[2]);const a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return {data:a,ext:m[1].toLowerCase()==='png'?'png':'jpeg'};}catch{return null}}
function chartXML(){
 const specs=[['1 ciclo',1,2,'564F49'],['Scarico 1',3,4,'564F49'],['2 ciclo',5,6,'9B4D3D'],['Scarico 2',7,8,'9B4D3D']];
 const ser=specs.map(([label,x,y,color],i)=>`<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${label}</c:v></c:tx><c:spPr><a:ln w="22000"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill>${i===1||i===3?'<a:prstDash val="dash"/>':''}</a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="4"/></c:marker><c:xVal><c:numRef><c:f>GRAFICO!$${co(x)}$3:$${co(x)}$28</c:f></c:numRef></c:xVal><c:yVal><c:numRef><c:f>GRAFICO!$${co(y)}$3:$${co(y)}$28</c:f></c:numRef></c:yVal><c:smooth val="0"/></c:ser>`).join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="${XL_CHART}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${REL}"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="it-IT"/><a:t>Carico - spostamento</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:plotArea><c:layout/><c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>${ser}<c:axId val="12345"/><c:axId val="12346"/></c:scatterChart><c:valAx><c:axId val="12345"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="12346"/><c:crosses val="min"/></c:valAx><c:valAx><c:axId val="12346"/><c:scaling><c:orientation val="maxMin"/></c:scaling><c:axPos val="l"/><c:crossAx val="12345"/><c:crosses val="max"/></c:valAx></c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/></c:chart></c:chartSpace>`;
}
function drawingXML(photo,logo){
 const r='xmlns:r="'+REL+'"';
 const coords=(x,y)=>`<xdr:from><xdr:col>${x}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${y}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>`;
 const to=(x,y)=>`<xdr:to><xdr:col>${x}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${y}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>`;
 const pic=photo?`<xdr:twoCellAnchor editAs="oneCell">${coords(0,13)}${to(12,55)}<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Foto prova"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`:'';
 const logoAnchor=logo?`<xdr:twoCellAnchor editAs="oneCell">${coords(0,0)}${to(2,1)}<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="3" name="Logo DISMAT"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId3"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`:'';
 const chart=`<xdr:twoCellAnchor editAs="oneCell">${coords(0,39)}${to(12,51)}<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="1" name="Grafico carico spostamento"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${XL_CHART}"><c:chart xmlns:c="${XL_CHART}" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="${XL_DRAW}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ${r}>${logoAnchor}${pic}</xdr:wsDr>`;
}
function rels(items){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PKG}">${items.map(([id,type,target])=>`<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join('')}</Relationships>`;}
export function buildMinutaExcel(d){
 const test=d||{}, rows=Array.isArray(test.tableRows)?test.tableRows:[], config=test.testConfig||{}, photo=photoBytes(test.reportImage),logo=photoBytes(test.logoDataUrl);
 const numeroDoc=numeric(test.numeroDocumento), soglia=numeric(test.sogliaDocumento)??135000;
 const tipo=numeroDoc===null?'DA DEFINIRE':numeroDoc<soglia?'RAPPORTO DI PROVA':'CERTIFICATO DI PROVA';





 const main=sheet();main.cols=[[1,13],[2,6],[3,7],[4,9],[5,7],[6,7],[7,13],[8,7],[9,9],[10,8],[11,7],[12,8]];main.drawing=true;main.isMinuta=true;
 for(let row=1;row<=56;row++)main.heights.set(row,12);
 main.heights.set(1,75);
 for(let row=2;row<=11;row++)main.heights.set(row,16);
 main.heights.set(5,20);main.heights.set(12,22);main.heights.set(13,4);main.heights.set(56,3);
 const heading="L A B O R A T O R I O\nD I S M A T\nSperimentazione sulle Strutture e sui Materiali da Costruzione\nAutorizzato ai sensi dell'art. 20 Legge 1086/71 con D.M. 415 del 01/12/2020\nc/da Andolina S.S. 122 Km 28 92024  CANICATTI'  (AG)\nPI/CF 04534491008 - Reg. Imprese di Agrigento - Cap. Sociale € 280.300 i.v.\ntel. 0922 859406  - info.dismat@gmail.com - www.dismat.it";
 band(main,1,3,12,heading,11);
 // Solo le voci del modello "28) PROVA SU PIASTRA" fornito da Cast.
 pairs(main,2,'Rapporto nr.',numeroDoc,'Data:',test.dataDocumento);
 frm(main,2,1,'IF(PARAMETRI!B6="CERTIFICATO DI PROVA","Certificato nr.",IF(PARAMETRI!B6="RAPPORTO DI PROVA","Rapporto nr.","Documento nr."))',tipo==='CERTIFICATO DI PROVA'?'Certificato nr.':tipo==='RAPPORTO DI PROVA'?'Rapporto nr.':'Documento nr.',3);
 pairs(main,3,'Protocollo:',test.protocollo,'Data:',test.dataProtocollo);
 pairs(main,4,'Verb. accettazione nr:',test.verbaleAccettazione,'Data:',test.dataAccettazione);
 function single(row,label,value){
   put(main,row,1,label,3);put(main,row,5,value,4);
   main.merges.push('A'+row+':D'+row,'E'+row+':L'+row);
 }
 single(5,'Oggetto dei lavori:',test.oggettoLavori);
 single(6,'Ubicazione Cantiere:',test.ubicazioneCantiere||test.cantiere);
 single(7,'Richiedente:',test.richiedente||test.committente);
 single(8,'Direttore dei Lavori:',test.direttoreLavori);
 single(9,'Impresa:',test.impresa);
 single(10,'Proprietario / Ente appaltante:',test.proprietario);
 single(11,'Tecnico esecutore:',test.tecnico);
 band(main,12,1,12,tipo,9);frm(main,12,1,'PARAMETRI!B6',tipo,9);
 // Il PDF della Piastra è riportato una sola volta, a tutta larghezza
 // senza ricopiare tabelle, grafico, risultati o inserire nuove date.
 const reading=sheet();reading.width=7;reading.cols=[[1,16],[2,18],[3,16],[4,17],[5,19],[6,19],[7,24]];
 band(reading,1,1,7,test.technicalEdited?'LETTURE DELLA COPIA UFFICIO - VERIFICARE LE CORREZIONI':'LETTURE ORIGINALI IMPORTATE DAL CANTIERE',1);reading.heights.set(1,32);
 ['Ciclo','Fase','Carico (kPa)','Numero lettura','Lettura (mm)','Ultima (mm)','Note'].forEach((t,i)=>put(reading,3,i+1,t,2));let line=4;
 for(const [label,src,steps] of [['C1',test.c1||{},config.ciclo1||[]],['C2',test.c2||{},config.ciclo2||[]]]){
  for(const p of steps){const vals=src[`p${p}`]||[];const last=[...vals].reverse().map(numeric).find(v=>v!==null)??null;
   for(let j=0;j<vals.length;j++){if(numeric(vals[j])===null)continue;[label,'Carico',p,j+1,numeric(vals[j]),last,''].forEach((v,k)=>put(reading,line,k+1,v,4));line++;}}
  const sk=label==='C1'?'scarico50':'scarico';const sr=src[sk]||[];const p=label==='C1'?config.scarico1:config.scarico2;
  for(let j=0;j<sr.length;j++){if(numeric(sr[j])===null)continue;[label,'Scarico',p,j+1,numeric(sr[j]),null,''].forEach((v,k)=>put(reading,line,k+1,v,4));line++;}
 }
 const graph=sheet();graph.cols=Array.from({length:8},(_,i)=>[i+1,19]);band(graph,1,1,8,'DATI DEL GRAFICO - MODIFICABILI',1);
 ['C1: carico','C1: spost.','Scarico 1: carico','Scarico 1: spost.','C2: carico','C2: spost.','Scarico 2: carico','Scarico 2: spost.'].forEach((x,i)=>put(graph,2,i+1,x,2));
 [test.chart1,test.chartScarico1,test.chart2,test.chartScarico2].forEach((values,k)=>{(values||[]).forEach((p,i)=>{put(graph,i+3,k*2+1,numeric(p.x),7);put(graph,i+3,k*2+2,numeric(p.y),7);});});
 const param=sheet();param.cols=[[1,30],[2,28],[3,24],[4,18]];band(param,1,1,4,'PARAMETRI AMMINISTRATIVI',1);param.heights.set(1,32);
 put(param,3,1,'Numero documento (MINUTA!D2)',3);frm(param,3,2,'IF(ISNUMBER(MINUTA!D2),MINUTA!D2,"")',numeroDoc??'',4);
 put(param,4,1,'Soglia (modificabile)',3);put(param,4,2,soglia,4);
 put(param,6,1,'Tipo suggerito',2);frm(param,6,2,'IF(ISNUMBER(B3),IF(B3<B4,"RAPPORTO DI PROVA","CERTIFICATO DI PROVA"),"DA DEFINIRE")',tipo,6);
 band(param,8,1,4,'Modifica il numero in MINUTA!D2 oppure la soglia qui in B4: titolo e intestazione si aggiornano. Verificare prima dell’emissione.',8);
 const sheets=[main,reading,graph,param];
 const book=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${REL}"><bookViews><workbookView/></bookViews><sheets>${['MINUTA','LETTURE','GRAFICO','PARAMETRI'].map((n,i)=>`<sheet name="${n}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">MINUTA!$A$1:$L$56</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
 const parts=[['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="${CT}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${[...new Set([photo?.ext,logo?.ext].filter(Boolean))].map(ext=>`<Default Extension="${ext}" ContentType="image/${ext==='jpeg'?'jpeg':ext}"/>`).join('')}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`],
 ['_rels/.rels',rels([['rId1',REL+'/officeDocument','xl/workbook.xml']])],
 ['xl/workbook.xml',book],
 ['xl/_rels/workbook.xml.rels',rels([...sheets.map((_,i)=>[`rId${i+1}`,REL+'/worksheet',`worksheets/sheet${i+1}.xml`]),['rId5',REL+'/styles','styles.xml']])],
 ['xl/styles.xml',styles],
 ...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,xmlSheet(s)]),
 ['xl/worksheets/_rels/sheet1.xml.rels',rels([['rId1',REL+'/drawing','../drawings/drawing1.xml']])],
 ['xl/drawings/drawing1.xml',drawingXML(photo,logo)],
 ['xl/drawings/_rels/drawing1.xml.rels',rels([['rId1',REL+'/chart','../charts/chart1.xml'],...(photo?[['rId2',REL+'/image',`../media/image1.${photo.ext}`]]:[]),...(logo?[['rId3',REL+'/image',`../media/image2.${logo.ext}`]]:[])])],
 ['xl/charts/chart1.xml',chartXML()],
 ];if(photo)parts.push([`xl/media/image1.${photo.ext}`,photo.data]);if(logo)parts.push([`xl/media/image2.${logo.ext}`,logo.data]);return zipFile(parts);
}
export async function exportMinutaExcel(data){
 const response=await fetch('/logo-dismat.jpg');
 if(!response.ok)throw new Error('Logo DISMAT non disponibile. Impossibile generare la minuta senza intestazione completa.');
 const awaitLogoBlob=await response.blob();
 const logoDataUrl=await new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(reader.result);
   reader.onerror=()=>reject(new Error('Lettura logo DISMAT non riuscita.'));
   reader.readAsDataURL(awaitLogoBlob);
 });
 const reportImage=await captureOriginalPlatePdf(data);
 if(!/^data:image\/png;base64,[A-Za-z0-9+/=]{100,}$/.test(reportImage))throw new Error('Immagine del PDF non generata: minuta non esportata.');
 const blob=buildMinutaExcel({...data,logoDataUrl,reportImage});const url=URL.createObjectURL(blob);const a=document.createElement('a');const name=String(data?.verbale||'senza-numero').replace(/[^A-Za-z0-9_-]/g,'_');a.href=url;a.download=`minuta-CAST-PDF19cm-V3-${name}.xlsx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);}