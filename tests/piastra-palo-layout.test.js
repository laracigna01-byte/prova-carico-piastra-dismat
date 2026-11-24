import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPiastraExcel} from '../src/excel/piastraExcel.js';
import {laboratorySignature} from '../src/office/laboratoryFields.js';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+XKk64QAAAABJRU5ErkJggg==';
const input={
 numeroDocumento:'145000',dataDocumento:'24/11/2026',protocollo:'66912',testConfig:{label:'Fondazione',ciclo1:[20,50],ciclo2:[20],scarico1:50,scarico2:20},
 oggettoLavori:'Ponte - manutenzione strutturale',cantiere:'SS 114',richiedente:'ANAS',direttoreLavori:'Ing. Rossi',
 impresa:'COS.EDIL',direttoreStabilimento:'Ing. Bianchi',tecnico:'Tecnico prova',
 chart1:[{x:20,y:0.1},{x:50,y:0.2}],chart2:[{x:20,y:0.12}],c1:{p20:['1.1','1.2']},c2:{p20:['0.1']},
 reportImage:png,logoDataUrl:png
};
test('Piastra usa esattamente le misure, i merge, e le firme del certificato Palo',()=>{
 const b=buildPiastraExcel(input);
 const ws=b.getWorksheet('MINUTA');
 assert.equal(ws.pageSetup.printArea,'A1:AN61');
 assert.equal(ws.pageSetup.orientation,'portrait');
 assert.equal(ws.getRow(1).height,76);
 assert.equal(ws.getRow(5).height,37);
 assert.equal(ws.getRow(15).height,16);
 assert.equal(ws.getCell('G1').master.address,'G1');
 for(const [cell,value] of [['B5','Oggetto dei lavori'],['O5','Ponte - manutenzione strutturale'],['B6','Ubicazione cantiere'],['B7','Richiedente'],['B8','Direttore dei lavori'],['B9','Impresa'],['B10','Direttore di stabilimento/produzione'],['B11','Prova eseguita da'],['B58','Lo Sperimentatore'],['B59','Tecnico prova'],['V58','Il Direttore del Laboratorio'],['V59','Dott. Ing. Elio Lo Giudice']]) {
   assert.equal(ws.getCell(cell).value,value,cell);
 }
 assert.equal(ws.getCell('B2').result,'Certificato nr.');
 assert.equal(ws.getCell('G2').value,145000);
 assert.equal(ws.getCell('B15').result,'CERTIFICATO DI PROVA - CARICO STATICO SU PIASTRA');
 assert.equal(ws.getCell('O5').alignment.wrapText,true);
 assert.equal(ws.getCell('O5').font.size,8);
 assert.equal(ws.getImages().length,2);
 const image=ws.getImages()[1];
 assert.equal(image.range.tl.nativeCol,1);
 assert.equal(image.range.tl.nativeRow,16);
 assert.equal(image.range.ext.width,735);
 assert.equal(image.range.ext.height,Math.round(735*175/190));
 assert.equal(b.getWorksheet('LETTURE').getRow(2).getCell(5).value,1.1);
 assert.equal(b.getWorksheet('GRAFICO').getCell('A2').value,20);
});
test('Vice, proprietario e soglia documento; non copia numeri fra prove',()=>{
 const b=buildPiastraExcel({...input,ruoloFirmatarioLaboratorio:'vice',mostraProprietario:true,proprietario:'Ente',numeroDocumento:'120'});
 const ws=b.getWorksheet('MINUTA');
 assert.equal(ws.getCell('B10').value,'Proprietario / Ente appaltante');
 assert.equal(ws.getCell('B11').value,'Direttore di stabilimento/produzione');
 assert.equal(ws.getCell('B12').value,'Prova eseguita da');
 assert.equal(ws.getCell('V58').value,'Il Vicedirettore del Laboratorio');
 assert.equal(ws.getCell('V59').value,'Dott. Ing Giuseppe Navarra');
 assert.equal(ws.getCell('B2').result,'Rapporto nr.');
 assert.equal(ws.getCell('B15').result,'RAPPORTO DI PROVA - CARICO STATICO SU PIASTRA');
 assert.equal(b.getWorksheet('PARAMETRI').getCell('B4').value,135000);
 assert.equal(laboratorySignature({ruoloFirmatarioLaboratorio:'vice'}).nome,'Dott. Ing Giuseppe Navarra');
});
