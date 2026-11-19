// Archivio ufficio interamente separato da prova_carico_piastra_db (cantiere).
const DB_NAME='dismat_piastra_ufficio_v1';
const STORE='importazioni';
function open(){
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined'){reject(new Error('IndexedDB non disponibile su questo browser.'));return}
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{
      const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('Impossibile aprire archivio ufficio.'));
    req.onblocked=()=>reject(new Error('Archivio ufficio bloccato da un’altra scheda.'));
  });
}
export async function loadOfficeRecords(){
  const db=await open();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();
    req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(b.importedAt).localeCompare(String(a.importedAt))));
    req.onerror=()=>reject(req.error||new Error('Lettura archivio ufficio fallita.'));
  })}finally{db.close()}
}
export async function saveOfficeRecord(record){
  const db=await open();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete=()=>resolve(record);
    tx.onerror=()=>reject(tx.error||new Error('Salvataggio ufficio fallito.'));
    tx.onabort=()=>reject(tx.error||new Error('Salvataggio ufficio interrotto.'));
  })}finally{db.close()}
}
