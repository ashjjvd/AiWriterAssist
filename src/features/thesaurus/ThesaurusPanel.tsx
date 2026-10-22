import {useEffect,useRef,useState} from 'react';
import {Search,Copy,ChevronLeft,ChevronRight} from 'lucide-react';
import {writeText} from '@tauri-apps/plugin-clipboard-manager';
import {api} from '../../services/tauriClient';
import {errorMessage,type Synonym} from '../../types';
import {Button,Input,Notice} from '../../components/ui/primitives';

function firstWord(text:string){return text.trim().split(/\s+/)[0]?.replace(/^[^\p{L}]+|[^\p{L}]+$/gu,'')||'';}
function groupHeading(item:Synonym){
 if(item.relationType==='related')return 'Related terms';
 if(item.definition?.trim())return item.definition.trim();
 return item.relationType==='antonym'?'Opposites':'Similar meaning';
}
export default function ThesaurusPanel({source,onPreview}:{source:string;onPreview?:(text:string)=>void}){
 const [word,setWord]=useState(()=>firstWord(source));
 const [mode,setMode]=useState<'best'|'all'>('best');
 const [filter,setFilter]=useState('');
 const [entries,setEntries]=useState<Synonym[]>([]);
 const [cursor,setCursor]=useState(0);
 const [history,setHistory]=useState<number[]>([]);
 const [next,setNext]=useState<number|undefined>();
 const [total,setTotal]=useState(0);
 const [selected,setSelected]=useState<Synonym|null>(null);
 const [previewText,setPreviewText]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const nonce=useRef(0);
 useEffect(()=>{setWord(firstWord(source));},[source]);
 useEffect(()=>{setCursor(0);setHistory([]);},[word,mode,filter]);
 useEffect(()=>{
  const id=++nonce.current;setError('');setEntries([]);setSelected(null);setPreviewText('');
  if(!word.trim()){setBusy(false);return;}
  setBusy(true);
  void api.synonyms(word,mode,filter,cursor,40).then(r=>{if(id===nonce.current){setEntries(r.groups);setNext(r.nextCursor);setTotal(r.totalUniqueTerms);}}).catch(e=>{if(id===nonce.current)setError(errorMessage(e));}).finally(()=>{if(id===nonce.current)setBusy(false);});
  return()=>{nonce.current=id+1;};
 },[word,mode,filter,cursor]);
 const groups=new Map<string,Synonym[]>();
 for(const item of entries){const label=groupHeading(item);groups.set(label,[...(groups.get(label)||[]),item]);}
 const preview=(entry:Synonym)=>{
  setSelected(entry);
  const pos=source.toLocaleLowerCase().indexOf(word.toLocaleLowerCase());
  if(pos<0){setPreviewText('');return;}
  const after=source.slice(pos+word.length);
  const before=source.slice(0,pos);
  const updated=before+entry.term+after;
  setPreviewText(updated);
  onPreview?.(updated);
 };
 return <div className="space-y-3">
  <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search size={14} className="absolute left-2.5 top-3 text-foreground/45"/><Input aria-label="Word to find" placeholder="Search word" value={word} onChange={e=>setWord(e.target.value)} className="pl-8 py-2"/></div><div className="flex shrink-0 overflow-hidden rounded-lg border border-border">{(['best','all'] as const).map(v=><button key={v} className={`px-3 text-xs ${mode===v?'bg-primary text-white':'bg-card hover:bg-muted'}`} onClick={()=>setMode(v)}>{v==='best'?'Best':'All'}</button>)}</div></div>
  {mode==='all'&&<Input aria-label="Filter synonyms" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter terms..." className="py-2"/>}
  {busy&&<p className="text-xs text-foreground/50">Searching...</p>}
  {error&&<Notice kind="error">{error}</Notice>}
  {!busy&&entries.length===0&&!error&&<p className="text-sm text-foreground/60">No matching terms.</p>}
  <div className="space-y-3">{[...groups].map(([meaning,items],index)=><section key={meaning} className="flex gap-2"><span className="pt-0.5 text-xs text-foreground/50">{index+1}.</span><div className="min-w-0 flex-1 space-y-2"><p className="text-sm leading-5">{meaning}</p><div className="flex flex-wrap gap-1.5">{items.map((entry,i)=><button title={entry.usageWarning||entry.source} key={`${entry.term}-${entry.relationType}-${i}`} onClick={()=>preview(entry)} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${selected===entry?'bg-primary text-white':'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-muted dark:text-foreground'}`}>{entry.term}</button>)}</div></div></section>)}</div>
  {!busy&&(history.length>0||next!==undefined)&&<div className="flex items-center justify-between text-xs text-foreground/60"><span>{total} unique terms</span><div className="flex gap-1"><button disabled={!history.length} onClick={()=>{const h=[...history];const prev=h.pop();if(prev!==undefined){setHistory(h);setCursor(prev);}}} aria-label="Previous results" className="rounded border border-border p-1 disabled:opacity-30"><ChevronLeft size={15}/></button><button disabled={next===undefined} onClick={()=>{if(next===undefined)return;setHistory(h=>[...h,cursor]);setCursor(next);}} aria-label="Next results" className="rounded border border-border p-1 disabled:opacity-30"><ChevronRight size={15}/></button></div></div>}
  {selected&&<div className="space-y-2 rounded-lg border border-border bg-card p-3"><p className="text-xs text-foreground/65">{selected.relationType.replaceAll('_',' ')} · {selected.source}</p>{selected.usageWarning&&<p className="text-xs text-foreground/60">{selected.usageWarning}</p>}{previewText&&<p dir="auto" className="text-content max-h-24 overflow-auto rounded bg-muted p-2 text-sm">{previewText}</p>}<Button className="py-1.5" onClick={()=>void writeText(previewText||selected.term).catch(e=>setError(errorMessage(e)))}><Copy size={13}/>Copy {previewText?'preview':'word'}</Button></div>}
 </div>;
}
