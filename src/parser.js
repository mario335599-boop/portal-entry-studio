import { FIELDS } from './fields.js';
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const aliases = FIELDS.filter(f=>f.id!=='unclassified').flatMap(f=>f.aliases.map(a=>({id:f.id,a}))).sort((a,b)=>b.a.length-a.a.length);
const byAlias = new Map(aliases.map(a=>[a.a,a.id]));
const labelPattern = aliases.map(({a})=>[...a].map(escape).join('[ \\t]*')).join('|');
export function parsePages(property, pages) {
  property.pages=pages;
  for(const page of pages) {
    const lines=page.text.replace(/\r/g,'').split('\n').filter(l=>l.trim());
    for(const line of lines) {
      const re=new RegExp(`(?:^|[\\s|｜;；])(${labelPattern})\\s*[:：]?\\s*`,'g');
      const hits=[...line.matchAll(re)];
      let recognized=false;
      hits.forEach((hit,i)=>{
        const value=line.slice(hit.index+hit[0].length,hits[i+1]?.index ?? line.length).trim();
        if(!value) return;
        const id=byAlias.get(hit[1].replace(/[ \t]/g,''));
        add(property.fields[id],value,line,page);
        recognized=true;
      });
      if(!recognized) add(property.fields.unclassified,line,line,page);
    }
  }
  return property;
}
function add(field,value,text,page) {
  if(!field.sources.some(s=>s.value===value && s.page===page.number)) field.sources.push({value,text,page:page.number,method:page.method});
  const values=[...new Set(field.sources.map(s=>s.value))];
  field.originalValue=values.join('\n');
  field.value=field.originalValue;
  // Multiple candidates remain visible, and are never silently selected.
  field.status=values.length>1||field.sources.some(s=>s.method==='OCR')?'review':'unreviewed';
}
