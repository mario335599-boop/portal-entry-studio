import * as pdfjs from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
const asset = path => new URL(`vendor/${path}`,document.baseURI).href;
pdfjs.GlobalWorkerOptions.workerSrc=asset('pdf.worker.min.mjs');
export async function loadPDF(blob) {
  const task=pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer()),cMapUrl:asset('pdf/cmaps/'),cMapPacked:true,standardFontDataUrl:asset('pdf/standard_fonts/'),wasmUrl:asset('pdf/wasm/'),isEvalSupported:false,enableXfa:false});
  task.onPassword=()=>task.destroy();
  return task.promise;
}
export function textLines(items) {
  // Preserve geometric row order, keeping wide table cells separated.
  const rows=[];
  for(const item of items) {
    if(!item.str?.trim()) continue;
    const y=item.transform[5];
    let row=rows.find(r=>Math.abs(r.y-y)<Math.max(2,item.height*0.3));
    if(!row) {row={y,items:[]};rows.push(row);}
    row.items.push(item);
  }
  return rows.sort((a,b)=>b.y-a.y).map(r=>r.items.sort((a,b)=>a.transform[4]-b.transform[4]).map((item,i,items)=>{
    const prev=items[i-1];
    const gap=prev?item.transform[4]-prev.transform[4]-prev.width:0;
    return `${prev&&gap>Math.max(2,item.height*.25)?' ':''}${item.str}`;
  }).join('')).join('\n');
}
function bounded(promise,signal,milliseconds=180000) {
  return new Promise((resolve,reject)=>{
    let done=false;
    const finish=(callback,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);callback(value);};
    const cancel=()=>finish(reject,new DOMException('処理を中止しました','AbortError'));
    const timer=setTimeout(()=>finish(reject,new Error('処理がタイムアウトしました')),milliseconds);
    signal?.addEventListener('abort',cancel,{once:true});
    if(signal?.aborted)cancel();
    promise.then(value=>finish(resolve,value),e=>finish(reject,e));
  });
}
async function prepareOCR(workerFactory,signal,logger) {
  // Fetch language files before worker initialization: Tesseract 6 does not reject
  // its initialization promise on every language download error.
  await Promise.all(['jpn','eng'].map(async code=>{
    const response=await fetch(asset(`lang/${code}.traineddata.gz`),{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(120000)]):AbortSignal.timeout(120000)});
    if(!response.ok)throw new Error(`OCR辞書 ${code} を読み込めません (${response.status})`);
    await response.arrayBuffer();
  }));
  let rejectInit;
  const failed=new Promise((_,reject)=>{rejectInit=reject;});
  const creating=workerFactory('jpn+eng',1,{workerPath:asset('worker.min.js'),corePath:asset('core/'),langPath:asset('lang/'),workerBlobURL:false,errorHandler:e=>rejectInit(new Error(String(e))),logger});
  let abandoned=false;
  creating.then(w=>{if(abandoned)w.terminate();},()=>{});
  try{return await bounded(Promise.race([creating,failed]),signal);}catch(e){abandoned=true;throw e;}
}
export async function renderPage(pdf,number,canvas,scale=1.3) {
  const page=await pdf.getPage(number);
  const original=page.getViewport({scale});
  const limit=Math.min(1,Math.sqrt(14_000_000/(original.width*original.height)));
  const viewport=page.getViewport({scale:scale*limit});
  canvas.width=Math.floor(viewport.width);canvas.height=Math.floor(viewport.height);
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
}
export async function extractPDF(blob,onProgress,signal,{open=loadPDF,workerFactory=createWorker}={}) {
  let pdf,worker;
  const pages=[],errors=[];
  const abort=()=>{if(signal?.aborted) throw new DOMException('処理を中止しました','AbortError');};
  const stop=()=>worker?.terminate();
  signal?.addEventListener('abort',stop,{once:true});
  try {
    abort();onProgress('PDF解析中');pdf=await open(blob);abort();
    if(pdf.numPages>100) throw new Error('100ページを超えるPDFは分割して登録してください。');
    for(let number=1;number<=pdf.numPages;number++) {
      abort(); onProgress(`PDF解析中 ${number}/${pdf.numPages}ページ`);
      let text='';
      try {const page=await pdf.getPage(number);text=textLines((await page.getTextContent()).items);} catch(e) {errors.push(`${number}ページ: テキスト取得失敗 (${e.message})`);}
      let method='PDF TEXT';
      if(text.replace(/[\s\uFFFD]/g,'').length<20) {
        const partial=text;
        try {
          if(!worker) {
            onProgress('OCR準備中（日本語・英語）');
            worker=await prepareOCR(workerFactory,signal,m=>{if(!signal?.aborted)onProgress(`OCR処理中 ${number}/${pdf.numPages}ページ · ${m.status} ${Math.round((m.progress||0)*100)}%`);});
            await worker.setParameters({tessedit_pageseg_mode:'11'});
          }
          abort();const canvas=document.createElement('canvas');await renderPage(pdf,number,canvas,2);
          const result=await bounded(worker.recognize(canvas),signal);text=[partial,result.data.text].filter(Boolean).join('\n');method='OCR';
          canvas.width=canvas.height=1;
          if(!text.trim()) errors.push(`${number}ページ: OCRで文字を取得できませんでした。原本を確認してください。`);
        } catch(e) {abort();await worker?.terminate();worker=null;errors.push(`${number}ページ: OCR失敗 (${e.message||e})。原本から手動入力してください。`);text=partial;}
      }
      pages.push({number,text,method});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    abort();onProgress('項目解析中');return {pages,errors};
  } finally {signal?.removeEventListener('abort',stop);await worker?.terminate();await pdf?.destroy();}
}
