import { FIELDS, PROGRESS } from './fields.js';
export const SCHEMA = 1;
export function newProperty(filename='手動登録') {
  const now = new Date().toISOString();
  return { schemaVersion:SCHEMA, id:crypto.randomUUID(), sourceFile:filename, createdAt:now, updatedAt:now, archived:false, pages:[], errors:[], fields:Object.fromEntries(FIELDS.map(f=>[f.id,{ value:'',originalValue:'',status:'unknown',sources:[],confirmedAt:null }])), progress:Object.fromEntries(Object.entries(PROGRESS).map(([k,[,states]])=>[k,states[0]])), workNotes:'', history:[] };
}
export const title = p => p.fields.name.value || p.sourceFile;
export const unresolved = p => Object.values(p.fields).filter(f=>f.status==='review'||f.status==='unreviewed').length;
export const confirmed = p => Object.values(p.fields).filter(f=>f.status==='confirmed').length;
export const drafted = p => p.progress.suumo==='下書き完了' && p.progress.athome==='下書き完了';
export const needsReview = p => unresolved(p)>0 || p.errors.length>0 || p.workNotes.trim().length>0 || [p.progress.suumo,p.progress.athome].includes('要確認');
export const ready = p => drafted(p) && p.progress.photo==='完了' && p.progress.floorplan==='完了' && p.progress.final==='完了' && !needsReview(p);
export const pending = p => p.progress.suumo==='未着手' && p.progress.athome==='未着手';
export function touch(p, reason) {
  p.updatedAt = new Date().toISOString();
  if(reason) p.history.push({at:p.updatedAt,action:reason});
  p.history = p.history.slice(-100);
}
export function editField(p,id,value) {
  const f=p.fields[id];
  if(f.value!==value) { f.value=value; f.status=value.trim()?'unreviewed':'unknown'; f.confirmedAt=null; p.progress.final='未確認'; touch(p,`${id}: 値を変更・確認解除`); }
}
// Only URLs are accepted, and credential-bearing URL forms are deliberately rejected.
export function validateUrl(value) {
  if(!value.trim()) return '';
  const u=new URL(value.trim());
  if(u.protocol!=='https:' || u.username || u.password || u.search || u.hash) throw new Error('入稿URLは https:// で始まり、認証情報・クエリ・#を含まない固定ページURLを指定してください。');
  if(/(?:token|password|session|secret|oauth|callback|otp|captcha)/i.test(u.pathname)) throw new Error('認証情報を含む可能性があるURLは保存できません。');
  return u.href;
}
