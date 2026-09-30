import { SCHEMA, validateUrl } from './model.js';
import { FIELDS, STATUS, PROGRESS } from './fields.js';
import { getPDF } from './storage.js';
const fail=()=>{throw new Error('バックアップの形式・値・バージョンが不正です。既存データは変更していません。');};
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const str=(x,max=1_000_000)=>typeof x==='string'&&x.length<=max;
const date=x=>str(x,40)&&Number.isFinite(Date.parse(x));
const keys=(x,allowed)=>obj(x)&&Object.keys(x).every(k=>allowed.includes(k));
export function validateProperty(p) {
  if(!keys(p,['schemaVersion','id','sourceFile','createdAt','updatedAt','archived','pages','errors','fields','progress','workNotes','history'])||p.schemaVersion!==SCHEMA||!str(p.id,100)||!p.id||!str(p.sourceFile,1000)||!date(p.createdAt)||!date(p.updatedAt)||typeof p.archived!=='boolean') fail();
  if(!obj(p.fields)||Object.keys(p.fields).length!==FIELDS.length) fail();
  for(const {id} of FIELDS) {
    const f=p.fields[id];
    if(!keys(f,['value','originalValue','status','sources','confirmedAt'])||!str(f.value)||!str(f.originalValue)||!Object.hasOwn(STATUS,f.status)||!Array.isArray(f.sources)||f.sources.length>10000) fail();
    if(f.status==='confirmed'&&(!f.value.trim()||!date(f.confirmedAt))) fail();
    if(f.confirmedAt!==null&&!date(f.confirmedAt)) fail();
    for(const s of f.sources) if(!keys(s,['value','text','page','method'])||!str(s.value)||!str(s.text)||!Number.isInteger(s.page)||s.page<1||!['PDF TEXT','OCR'].includes(s.method)) fail();
  }
  if(!obj(p.progress)||Object.keys(p.progress).length!==Object.keys(PROGRESS).length) fail();
  for(const [key,[,states]] of Object.entries(PROGRESS)) if(!states.includes(p.progress[key])) fail();
  if(!Array.isArray(p.pages)||p.pages.length>100||!Array.isArray(p.errors)||p.errors.some(e=>!str(e))||!str(p.workNotes)||!Array.isArray(p.history)) fail();
  for(const page of p.pages) if(!keys(page,['number','text','method'])||!Number.isInteger(page.number)||page.number<1||!str(page.text,5_000_000)||!['PDF TEXT','OCR'].includes(page.method)) fail();
  for(const h of p.history) if(!keys(h,['at','action'])||!date(h.at)||!str(h.action)) fail();
  return p;
}
export function validateBackup(data) {
  if(!keys(data,['schemaVersion','exportedAt','properties','settings','pdfs'])||data.schemaVersion!==SCHEMA||!date(data.exportedAt)||!Array.isArray(data.properties)||data.properties.length>5000||!obj(data.pdfs)) fail();
  const ids=new Set();
  for(const p of data.properties) { validateProperty(p);if(ids.has(p.id)) fail();ids.add(p.id); }
  if(!keys(data.settings,['id','suumo','athome'])||data.settings.id!=='portal'||!str(data.settings.suumo,2000)||!str(data.settings.athome,2000)) fail();
  validateUrl(data.settings.suumo);validateUrl(data.settings.athome);
  const pdfs=Object.create(null);
  for(const [id,encoded] of Object.entries(data.pdfs)) {
    if(!ids.has(id)||!str(encoded,75_000_000)||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) fail();
    const binary=atob(encoded);if(!binary.startsWith('%PDF-')) fail();
    pdfs[id]=new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))],{type:'application/pdf'});
  }
  return {...data,pdfs};
}
export async function exportBackup(properties,settings) {
  const pdfs=Object.create(null);
  for(const p of properties) {
    const blob=await getPDF(p.id);
    if(blob) pdfs[p.id]=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  }
  const data={schemaVersion:SCHEMA,exportedAt:new Date().toISOString(),properties,settings,pdfs};
  return new Blob([JSON.stringify(data)],{type:'application/json'});
}
export function download(blob,name) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
