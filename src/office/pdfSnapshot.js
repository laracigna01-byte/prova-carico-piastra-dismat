import {createOfficePlatePdf} from './platePdfOffice';

// La stessa grafica PDF che Cast oggi ritaglia: rasterizzazione automatica
// a 19 cm. PDF.js e worker sono locali, senza servizi o costi esterni.
let loader;
function loadPdfJs(){
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  if(loader)return loader;
  loader=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='/office-pdf.min.js';
    script.async=true;
    script.onload=()=>window.pdfjsLib?resolve(window.pdfjsLib):reject(new Error('PDF.js non inizializzato'));
    script.onerror=()=>reject(new Error('Impossibile caricare il renderer PDF locale.'));
    document.head.appendChild(script);
  });
  return loader;
}
export async function captureOriginalPlatePdf(data){
  const pdfjs=await loadPdfJs();
  pdfjs.GlobalWorkerOptions.workerSrc='/office-pdf.worker.min.js';
  const chartMaxX=Math.max(1,...[...(data.chart1||[]),...(data.chart2||[]),...(data.chartScarico1||[]),...(data.chartScarico2||[])].map(p=>Number(p.x)||0));
  const bytes=new Uint8Array(await createOfficePlatePdf({...data,chartMaxX}));
  const task=pdfjs.getDocument({data:bytes});
  const pdf=await task.promise;
  try{
    const page=await pdf.getPage(1);
    const viewport=page.getViewport({scale:2.8});
    const full=document.createElement('canvas');
    full.width=Math.ceil(viewport.width);full.height=Math.ceil(viewport.height);
    const ctx=full.getContext('2d',{alpha:false});
    await page.render({canvasContext:ctx,viewport}).promise;
    // Area tecnica del PDF dei ragazzi: da x=10 a x=200 mm,
    // sotto la testata PDF (y=23 mm) fino alla fine del riquadro a y=198 mm.
    const scaleX=full.width/210,scaleY=full.height/297;
    const crop=document.createElement('canvas');
    crop.width=Math.round(190*scaleX);crop.height=Math.round(175*scaleY);
    const out=crop.getContext('2d',{alpha:false});
    out.fillStyle='#ffffff';out.fillRect(0,0,crop.width,crop.height);
    out.drawImage(full,10*scaleX,23*scaleY,190*scaleX,175*scaleY,0,0,crop.width,crop.height);
    return crop.toDataURL('image/png');
  }finally{await pdf.destroy()}
}
