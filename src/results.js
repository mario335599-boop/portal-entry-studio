import { PORTAL_STATES } from './fields.js';
export function parseResults(text,properties,selectedId) {
  let parsed;
  try {parsed=JSON.parse(text.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));} catch {parsed=null;}
  if(parsed) {
    if(!Array.isArray(parsed.results)||!parsed.results.length) throw new Error('results配列が必要です。');
    const seen=new Set();
    return parsed.results.map(r=>{
      if(!properties.some(p=>p.id===r.id)||seen.has(r.id)) throw new Error('案件IDが未登録または重複しています。');
      seen.add(r.id);
      if(!PORTAL_STATES.includes(r.suumo)||!PORTAL_STATES.includes(r.athome)||typeof r.notes!=='string') throw new Error('ポータル状態または要確認事項の形式が不正です。');
      return {id:r.id,suumo:r.suumo,athome:r.athome,notes:r.notes};
    });
  }
  if(!selectedId) throw new Error('通常テキストは対象案件を1件指定してください。複数案件はID付きJSONで取り込んでください。');
  const p=properties.find(p=>p.id===selectedId);
  if(!p) throw new Error('対象案件がありません。');
  const result={id:p.id,notes:text,suumo:p.progress.suumo,athome:p.progress.athome};
  for(const [key,label] of [['suumo','SUUMO'],['athome','at home']]) {
    const matches=[...text.matchAll(new RegExp(`^${label}\\s*[:：]\\s*(未着手|作業中|下書き完了|要確認)\\s*$`,'gmi'))];
    if(matches.length===1) result[key]=matches[0][1];
  }
  return [result];
}
