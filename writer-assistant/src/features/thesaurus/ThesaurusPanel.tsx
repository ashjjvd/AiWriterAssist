import {useEffect,useRef,useState} from 'react';
import {Search,Copy} from 'lucide-react';
import {writeText} from '@tauri-apps/plugin-clipboard-manager';
import {api} from '../../services/tauriClient';
import {errorMessage,type Synonym} from '../../types';
import {Button,Card,Input,Notice} from '../../components/ui/primitives';
export default function ThesaurusPanel({source,onPreview}:{source:string;onPreview:(text:string)=>void}) {
 const [word,setWord]=useState(()=>source.trim().split(/\s+/)[0]?.replace(/^[^\p{L}]+|[^\p{L}]+$/gu,'')||''),[mode,setMode]=useState<'best'|'all'>('best');
 const [filter,setFilter]=useState(''),[entries,setEntries]=useState<Synonym[]>([]),[next,setNext]=useState<number|undefined>(),[total,setTotal]=useState(0),[selected,setSelected]=useState<Synonym|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const nonce=useRef(0);
 useEffect(()=>{setWord(source.trim().split(/\s+/)[0]?.replace(/^[^\p{L}]+|[^\p{L}]+$/gu,'')||'')},[source]);
 useEffect(()=>{const id=++nonce.current;setError('');setEntries([]);setNext(undefined);setSelected(null);
  if(!word.trim())return;
  setBusy(true);api.synonyms(word,mode,filter,0).then(r=>{if(id===nonce.current){setEntries(r.groups);setNext(r.nextCursor);setTotal(r.totalUniqueTerms)}}).catch(e=>{if(id===nonce.current)setError(errorMessage(e))}).finally(()=>{if(id===nonce.current)setBusy(false)});
  return()=>{nonce.current++};
 },[word,mode,filter]);
 const loadMore=async()=>{if(next===undefined||busy)return;setBusy(true);try{const r=await api.synonyms(word,mode,filter,next);setEntries(v=>[...v,...r.groups]);setNext(r.nextCursor)}catch(e){setError(errorMessage(e))}finally{setBusy(false)}};
 const preview=()=>{if(!selected)return;const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const replaced=source.replace(new RegExp(`\\b${escaped}\\b`,'i'),selected.term);if(replaced===source){setError('The searched word was not found in the selection. Use Copy word or adjust the lookup.');return}onPreview(replaced)};
 return <div className="space-y-3"><h2 className="font-semibold">English thesaurus</h2>
  <div className="flex gap-2"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-3 opacity-50"/><Input value={word} onChange={e=>setWord(e.target.value)} aria-label="Word to find" placeholder="Look up word" className="pl-9"/></div><div className="flex overflow-hidden rounded-lg border border-border">{(['best','all'] as const).map(m=><button className={`px-3 text-sm ${mode===m?'bg-primary text-white':'bg-card'}`} key={m} onClick={()=>setMode(m)}>{m==='best'?'Best':'All'}</button>)}</div></div>
  <Input aria-label="Filter synonyms" placeholder="Search within results" value={filter} onChange={e=>setFilter(e.target.value)}/>
  <p className="text-xs opacity-60">{busy?'Searching…':`${total} unique terms · ${entries.length} loaded`} · Source-defined meanings, not guaranteed substitutions</p>
  {error&&<Notice kind="error">{error}</Notice>}
  <div className="max-h-64 space-y-1 overflow-y-auto scrollarea" role="list">{entries.map((entry,index)=><button role="listitem" key={`${entry.term}-${entry.source}-${index}`} onClick={()=>setSelected(entry)} className={`w-full rounded-md border px-3 py-2 text-left ${selected===entry?'border-primary bg-muted':'border-transparent hover:bg-muted'}`}><span className="font-medium">{entry.term}</span><span className="ml-2 text-xs opacity-60">{entry.relationType.replace(/_/g,' ')} · {entry.source}</span>{entry.definition&&<p className="line-clamp-2 text-xs opacity-65">{entry.definition}</p>}</button>)}
  </div>{next!==undefined&&<Button variant="outline" disabled={busy} onClick={()=>void loadMore()}>Load more</Button>}
  {selected&&<Card className="space-y-2"><p className="font-medium">{selected.term}</p>{selected.usageWarning&&<Notice>{selected.usageWarning}</Notice>}<p className="text-xs opacity-60">Preview this term before manually replacing the original selection.</p><div className="flex gap-2"><Button onClick={preview}>Preview replacement</Button><Button variant="outline" onClick={()=>void writeText(selected.term)}><Copy size={14}/>Copy word</Button></div></Card>}
 </div>
}
