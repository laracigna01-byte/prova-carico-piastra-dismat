// Campi di laboratorio riutilizzabili fra prove: non includere identificativi,
// date, numero di documento, letture, carichi, grafici e altri risultati tecnici.
export const LABORATORY_SHARED_KEYS = Object.freeze([
  'oggettoLavori','richiedente','direttoreLavori','impresa','proprietario',
  'mostraProprietario','direttoreStabilimento','ruoloFirmatarioLaboratorio'
]);

export function laboratorySignature(values={}) {
  const ruolo=values.ruoloFirmatarioLaboratorio??values.ruoloDirezioneLavori??'direttore';
  return ruolo==='vice'
    ? {qualifica:'Il Vicedirettore del Laboratorio',nome:'Dott. Ing Giuseppe Navarra'}
    : {qualifica:'Il Direttore del Laboratorio',nome:'Dott. Ing. Elio Lo Giudice'};
}

export function latestLaboratoryData(records=[],targetId) {
  const saved=records.filter(r=>r&&r.id!==targetId&&r.officeSavedAt&&r.office&&typeof r.office==='object')
    .sort((a,b)=>String(b.officeSavedAt).localeCompare(String(a.officeSavedAt)));
  for(const source of saved) {
    const values={};
    for(const key of LABORATORY_SHARED_KEYS){
      const fromOffice=source.office[key];
      const value=fromOffice!==undefined&&fromOffice!==null?fromOffice:source.data?.[key];
      if(value!==undefined&&value!==null&&value!==''&&typeof value!=='object')values[key]=value;
    }
    if(Object.keys(values).length)return {source,values};
  }
  return null;
}
