const DB='line-portal-entry-studio';
let db;
export async function openDB() {
  db=await new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>{ for(const name of ['properties','pdfs','settings']) req.result.createObjectStore(name,{keyPath:'id'}); };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(new Error('別のタブを閉じてから再読み込みしてください。'));
  });
  db.onversionchange=()=>db.close();
}
function transaction(stores,mode,run) {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(stores,mode);
    let output;
    tx.oncomplete=()=>resolve(typeof output==='function'?output():output);
    tx.onerror=()=>reject(tx.error || new Error('保存に失敗しました。'));
    tx.onabort=()=>reject(tx.error || new Error('保存を中止しました。'));
    try { output=run(tx); } catch(e) { tx.abort(); reject(e); }
  });
}
export const allProperties=()=>transaction(['properties'],'readonly',tx=>{const r=tx.objectStore('properties').getAll();return ()=>r.result;});
export const getPDF=id=>transaction(['pdfs'],'readonly',tx=>{const r=tx.objectStore('pdfs').get(id);return ()=>r.result?.blob;});
export const getSettings=()=>transaction(['settings'],'readonly',tx=>{const r=tx.objectStore('settings').get('portal');return ()=>r.result || {id:'portal',suumo:'',athome:''};});
export const saveSettings=settings=>transaction(['settings'],'readwrite',tx=>tx.objectStore('settings').put(settings));
export const saveProperty=(p,blob)=>transaction(['properties','pdfs'],'readwrite',tx=>{tx.objectStore('properties').put(p); if(blob) tx.objectStore('pdfs').put({id:p.id,blob});});
export const deleteProperty=id=>transaction(['properties','pdfs'],'readwrite',tx=>{tx.objectStore('properties').delete(id);tx.objectStore('pdfs').delete(id);});
export const restoreBackup=(data)=>transaction(['properties','pdfs','settings'],'readwrite',tx=>{
  // Merge all validated records atomically. No clear() and no partial restoration.
  for(const p of data.properties) { tx.objectStore('properties').put(p); if(data.pdfs[p.id]) tx.objectStore('pdfs').put({id:p.id,blob:data.pdfs[p.id]}); }
  tx.objectStore('settings').put(data.settings);
});
export function storageError(e) { return e?.name==='QuotaExceededError'?'ブラウザの保存容量が不足しています。バックアップ後に不要案件を整理してください。':`処理に失敗しました: ${e?.message||e}。既存の保存データは保持されています。`; }
