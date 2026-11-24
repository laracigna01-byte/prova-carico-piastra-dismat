import test from 'node:test';
import assert from 'node:assert/strict';
import {laboratorySignature,latestLaboratoryData,LABORATORY_SHARED_KEYS} from '../src/office/laboratoryFields.js';

test('firmatario unico: direttore o vice; nessuna modifica alla direzione lavori',()=>{
 assert.deepEqual(laboratorySignature({ruoloFirmatarioLaboratorio:'direttore'}),
   {qualifica:'Il Direttore del Laboratorio',nome:'Dott. Ing. Elio Lo Giudice'});
 assert.deepEqual(laboratorySignature({ruoloFirmatarioLaboratorio:'vice'}),
   {qualifica:'Il Vicedirettore del Laboratorio',nome:'Dott. Ing Giuseppe Navarra'});
});
test('duplica soltanto valori laboratorio e ignora date, numeri, grafico, letture',()=>{
 const source={id:'uno',officeSavedAt:'2026-11-24T09:00:00Z',data:{verbale:'123',direttoreLavori:'Ing. Rossi',c1:{p20:[1,2]},c2:{},dataProva:'ieri'},
 office:{oggettoLavori:'Ponte prova',richiedente:'ANAS',mostraProprietario:true,proprietario:'Ente',ruoloFirmatarioLaboratorio:'vice',numeroDocumento:'12345',protocollo:'ZZ',c1:{p20:[99]}}};
 const other={id:'due',data:{verbale:'456',direttoreLavori:'Ing. Bianchi',c1:{p20:[2,3]}}};
 const result=latestLaboratoryData([other,source],'due');
 assert.equal(result.source.id,'uno');
 assert.deepEqual(result.values,{oggettoLavori:'Ponte prova',richiedente:'ANAS',direttoreLavori:'Ing. Rossi',proprietario:'Ente',mostraProprietario:true,ruoloFirmatarioLaboratorio:'vice'});
 for(const key of ['c1','c2','dataProva','numeroDocumento','protocollo','verbale','md','mdp','foto'])assert.equal(LABORATORY_SHARED_KEYS.includes(key),false);
 assert.equal(other.data.verbale,'456');
});
