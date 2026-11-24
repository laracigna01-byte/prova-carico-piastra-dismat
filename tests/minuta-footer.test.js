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

test('Piastra: intestazione, oggetto e firme nelle stesse posizioni Palo',async()=>{
 const b=buildMinutaExcel({...basic,ruoloFirmatarioLaboratorio:'direttore'});
 const ws=await entry(b,'xl/worksheets/sheet1.xml');
 assert.match(ws,/<mergeCell ref="G1:AN1"\/>/);
 assert.match(ws,/<mergeCell ref="B2:F2"\/>/);
 assert.match(ws,/<mergeCell ref="G2:N2"\/>/);
 assert.match(ws,/<mergeCell ref="O2:R2"\/>/);
 assert.match(ws,/<mergeCell ref="S2:Z2"\/>/);
 assert.match(ws,/<mergeCell ref="AA2:AF2"\/>/);
 assert.match(ws,/<mergeCell ref="AG2:AN2"\/>/);
 assert.match(ws,/<mergeCell ref="B5:N5"\/>/);
 assert.match(ws,/<mergeCell ref="O5:AN5"\/>/);
 assert.match(ws,/<row r="5" ht="37" customHeight="1"/);
 assert.match(ws,/<row r="15" ht="16" customHeight="1"/);
 assert.match(ws,/<mergeCell ref="B15:AN15"\/>/);
 assert.match(ws,/<c r="B5"[^>]*>.*?Oggetto dei lavori:/);
 assert.match(ws,/<c r="O5"[^>]*>.*?Ponte/);
 assert.match(ws,/<c r="B58"[^>]*>.*?Lo Sperimentatore/);
 assert.match(ws,/<c r="B59"[^>]*>.*?Tecnico prova/);
 assert.match(ws,/<c r="V58"[^>]*>.*?Il Direttore del Laboratorio/);
 assert.match(ws,/<c r="V59"[^>]*>.*?Dott. Ing. Elio Lo Giudice/);
 assert.doesNotMatch(ws,/<headerFooter>/);
 assert.match(ws,/pageSetup orientation="portrait" paperSize="9" fitToWidth="1" fitToHeight="1"/);
 assert.match(await entry(b,'xl/workbook.xml'),/MINUTA!\$A\$1:\$AN\$61/);
});
test('Vice e proprietario opzionale; grafico e screenshot 19cm originali',async()=>{
 const b=buildMinutaExcel({...basic,mostraProprietario:true,proprietario:'ANAS SPA',ruoloFirmatarioLaboratorio:'vice'});
 const ws=await entry(b,'xl/worksheets/sheet1.xml');
 assert.match(ws,/<c r="V58"[^>]*>.*?Il Vicedirettore del Laboratorio/);
 assert.match(ws,/<c r="V59"[^>]*>.*?Dott. Ing Giuseppe Navarra/);
 assert.match(ws,/<c r="B10"[^>]*>.*?Proprietario \/ Ente appaltante:/);
 assert.match(ws,/<c r="B11"[^>]*>.*?Direttore di Stabilimento\/Produzione:/);
 assert.match(ws,/<c r="B12"[^>]*>.*?Prova eseguita da:/);
 const drawing=await entry(b,'xl/drawings/drawing1.xml');
 assert.match(drawing,/<xdr:col>1<\/xdr:col>.*?<xdr:row>16<\/xdr:row>/);
 assert.match(drawing,/cx="6840000" cy="6300000"/,'19cm tecnico non deve cambiare dimensioni');
 assert.match(await entry(b,'xl/charts/chart1.xml'),/Carico - spostamento/);
 const noOwner=buildMinutaExcel({...basic,ruoloFirmatarioLaboratorio:'vice'});
 assert.doesNotMatch(await entry(noOwner,'xl/worksheets/sheet1.xml'),/Proprietario \/ Ente appaltante:/);
});
