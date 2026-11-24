import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMinutaExcel} from '../src/excel/minutaExcel.js';

// ZIP STORE produced by the approved native generator.
async function entry(blob,name){
 const bytes=new Uint8Array(await blob.arrayBuffer());
 const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const decoder=new TextDecoder();
 let p=0;
 while(p+30<=bytes.length&&dv.getUint32(p,true)===0x04034b50){
   const method=dv.getUint16(p+8,true);
   const length=dv.getUint32(p+18,true);
   const nameLen=dv.getUint16(p+26,true);
   const extraLen=dv.getUint16(p+28,true);
   const found=decoder.decode(bytes.subarray(p+30,p+30+nameLen));
   const start=p+30+nameLen+extraLen;
   if(found===name){
     assert.equal(method,0,'ZIP entry must be STORE');
     return decoder.decode(bytes.subarray(start,start+length));
   }
   p=start+length;
 }
 throw new Error('Missing XLSX part '+name);
}
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XKk64QAAAABJRU5ErkJggg==';
const basic={
 numeroDocumento:'145000',dataDocumento:'24/11/2026',
 oggettoLavori:'Ponte',cantiere:'SS 114',richiedente:'ANAS',
 direttoreLavori:'Ing. Rossi',impresa:'COS.EDIL',direttoreStabilimento:'Ing. Bianchi',
 tecnico:'Tecnico prova',reportImage:png,logoDataUrl:png
};
test('Firma Direttore solo a pie di pagina, senza cambiare print area',async()=>{
 const b=buildMinutaExcel({...basic,ruoloFirmatarioLaboratorio:'direttore'});
 const ws=await entry(b,'xl/worksheets/sheet1.xml');
 assert.match(ws,/<headerFooter><oddFooter>/);
 assert.match(ws,/Lo Sperimentatore/);
 assert.match(ws,/Il Direttore del Laboratorio/);
 assert.match(ws,/Dott. Ing. Elio Lo Giudice/);
 assert.doesNotMatch(ws,/<c r="B16"/);
 assert.match(ws,/<c r="B12"[^>]*>.*?Direttore di Stabilimento\/Produzione:/);
 assert.match(ws,/<c r="B13"[^>]*>.*?Prova eseguita da:/);
 assert.match(ws,/pageSetup orientation="portrait" paperSize="9" fitToWidth="1" fitToHeight="1"/);
 assert.match(await entry(b,'xl/workbook.xml'),/MINUTA!\$A\$1:\$AR\$54/);
});
test('Vice e proprietario opzionale: riquadro fotografico e grafico intatti',async()=>{
 const b=buildMinutaExcel({...basic,mostraProprietario:true,proprietario:'ANAS SPA',ruoloFirmatarioLaboratorio:'vice'});
 const ws=await entry(b,'xl/worksheets/sheet1.xml');
 assert.match(ws,/Il Vicedirettore del Laboratorio/);
 assert.match(ws,/Dott. Ing Giuseppe Navarra/);
 assert.doesNotMatch(ws,/<c r="B16"/);
 assert.match(ws,/<c r="B12"[^>]*>.*?Proprietario \/ Ente appaltante:/);
 assert.match(ws,/<c r="B13"[^>]*>.*?Direttore di Stabilimento\/Produzione:/);
 assert.match(ws,/<c r="B14"[^>]*>.*?Prova eseguita da:/);
 const drawing=await entry(b,'xl/drawings/drawing1.xml');
 assert.match(drawing,/<xdr:col>1<\/xdr:col>.*?<xdr:row>18<\/xdr:row>/);
 assert.match(drawing,/cx="6840000" cy="6300000"/,'Snapshot dimensions unchanged');
 const graph=await entry(b,'xl/charts/chart1.xml');
 assert.match(graph,/Carico - spostamento/);
 const noOwner=buildMinutaExcel({...basic,ruoloFirmatarioLaboratorio:'vice'});
 assert.doesNotMatch(await entry(noOwner,'xl/worksheets/sheet1.xml'),/Proprietario \/ Ente appaltante:/);
});
