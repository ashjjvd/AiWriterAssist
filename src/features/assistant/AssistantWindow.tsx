import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeftRight,Check,ClipboardCopy,LoaderCircle,Settings2,Sparkles,X} from 'lucide-react';
import {writeText} from '@tauri-apps/plugin-clipboard-manager';
import type {Analysis,AppSettings,SelectionSession,AiEvent} from '../../types';
import {errorMessage} from '../../types';
import {api,events} from '../../services/tauriClient';
import {buildInstruction,QUICK_ACTIONS,type AssistantPhase} from '../../store/assistant';
import {Button,Notice} from '../../components/ui/primitives';
import GrammarPanel from '../grammar/GrammarPanel';

const toMessage=(e:unknown)=>errorMessage(e);

export default function AssistantWindow(){
 const [settings,setSettings]=useState<AppSettings|null>(null);
 const [session,setSession]=useState<SelectionSession|null>(null);
 const [phase,setPhase]=useState<AssistantPhase>('IDLE');
 const [original,setOriginal]=useState('');
 const [draft,setDraft]=useState('');
 const [result,setResult]=useState('');
 const [analysis,setAnalysis]=useState<Analysis|null>(null);
 const [custom,setCustom]=useState('');
 const [error,setError]=useState('');
 const [compare,setCompare]=useState(false);
 const [showGrammar,setShowGrammar]=useState(false);
 const currentSession=useRef('');
 const activeRequest=useRef('');
 const runGeneration=async(instruction:string,extra:string,selection= session,source=draft,config=settings)=>{
  if(!selection||!source.trim())return;
  if(config?.cloudConsent!=='true') {setError('Enable Cloud AI in Settings > Privacy.');return;}
  const requestId=crypto.randomUUID();
  const instructionText=buildInstruction(instruction,extra);
  if(activeRequest.current)void api.cancel(activeRequest.current);
  activeRequest.current=requestId;
  setResult('');setError('');setCompare(false);setPhase('GENERATING');
  try{await api.rewrite({sessionId:selection.sessionId,requestId,text:source,instruction:instructionText});}
  catch(e){if(activeRequest.current===requestId){activeRequest.current='';setPhase('ERROR');setError(toMessage(e));}}
 };
 const openSession=useCallback(async(next:SelectionSession)=>{
  // Refresh consent and provider readiness for EVERY selection, not just first mount.
  if(activeRequest.current){void api.cancel(activeRequest.current);activeRequest.current='';}
  currentSession.current=next.sessionId;
  setSession(next);setOriginal(next.capturedText);setDraft(next.capturedText);
  setAnalysis(null);setResult('');setCustom('');setError('');setCompare(false);setShowGrammar(false);setPhase('READY');
  try{
   const latest=await api.settings();
   if(currentSession.current!==next.sessionId)return;
   setSettings(latest);
   if(latest.cloudConsent!=='true'||latest.automaticAnalysis!=='true')return;
   setPhase('ANALYZING');
   const data=await api.analyze(next.capturedText);
   if(currentSession.current!==next.sessionId)return;
   setAnalysis(data);if(!activeRequest.current)setPhase('SUGGESTIONS_READY');
  }catch(e){if(currentSession.current===next.sessionId&&!activeRequest.current){setError(toMessage(e));setPhase('READY');}}
 },[]);
 useEffect(()=>{
  let live=true;const unsub:(()=>void)[]=[];
  const subscribe=async()=>{
   const items=await Promise.all([
    events.captured(s=>{if(live)void openSession(s)}),
    events.cleared(()=>{if(!live)return;currentSession.current='';activeRequest.current='';setSession(null);setDraft('');setOriginal('');setAnalysis(null);setResult('');setError('');setPhase('IDLE');}),
    events.failed(e=>{if(live){currentSession.current='';setSession(null);setError(toMessage(e));setPhase('ERROR');}}),
    events.ai('delta',(e:AiEvent)=>{if(live&&activeRequest.current===e.requestId&&currentSession.current===e.sessionId)setResult(s=>s+(e.text||''));}),
    events.ai('completed',e=>{if(live&&activeRequest.current===e.requestId&&currentSession.current===e.sessionId){setResult(e.text||'');setPhase('RESULT_READY');activeRequest.current='';}}),
    events.ai('failed',e=>{if(live&&activeRequest.current===e.requestId&&currentSession.current===e.sessionId){setPhase('ERROR');setError(e.error?.message||'Generation failed');activeRequest.current='';}}),
    events.ai('cancelled',e=>{if(live&&activeRequest.current===e.requestId){activeRequest.current='';setPhase('READY');setResult('');}})
   ]);
   if(live)unsub.push(...items);else items.forEach(fn=>fn());
  };
  void subscribe().catch(e=>{if(live)setError(toMessage(e));});
  void api.settings().then(s=>{if(live)setSettings(s)}).catch(e=>{if(live)setError(toMessage(e));});
  return()=>{live=false;unsub.forEach(fn=>fn());};
 },[openSession]);
 useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape')void api.hide();};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
 const copy=async(t:string)=>{try{await writeText(t);}catch(e){setError(toMessage(e));}};
 const replace=async()=>{if(!session||phase!=='RESULT_READY')return;setPhase('APPLYING');try{await api.replace(session.sessionId,result);setPhase('READY');}catch(e){setError(toMessage(e));setPhase('RESULT_READY');}};
 const cancel=()=>{if(activeRequest.current)void api.cancel(activeRequest.current);};
 const suggestionList=analysis?.suggestions||[];
 return <div className="flex h-screen flex-col overflow-hidden bg-background">
  <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
   <div className="flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-primary"/> Improve Writing</div>
   <div className="flex items-center gap-1"><button aria-label="Settings" className="rounded-md p-1.5 hover:bg-muted" onClick={()=>void api.openSettings().catch(e=>setError(toMessage(e)))}><Settings2 size={16}/></button><button aria-label="Close" className="rounded-md p-1.5 hover:bg-muted" onClick={()=>void api.hide()}><X size={17}/></button></div>
  </header>
  <main className="scrollarea min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
   {session&&<div className="rounded-lg border border-border bg-card px-3 py-2.5"><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-medium text-foreground/50">Selected text</span><button aria-label="Copy selected text" className="p-1 text-foreground/60 hover:text-primary" onClick={()=>void copy(draft)}><ClipboardCopy size={14}/></button></div><p dir="auto" className="text-content max-h-24 overflow-y-auto text-sm">{draft}</p></div>}
   {!session&&phase==='IDLE'&&<p className="py-4 text-center text-sm text-foreground/60">Select text and press your writing shortcut.</p>}
   {error&&<Notice kind="error">{error}</Notice>}
   {session&&<>
    {phase==='ANALYZING'&&<div className="flex items-center gap-2 text-xs text-foreground/60"><LoaderCircle size={14} className="animate-spin"/> Analyzing...</div>}
    {suggestionList.length>0&&<div className="flex flex-wrap gap-1.5" aria-label="AI suggestions">{suggestionList.map(s=><button key={s.id} title={s.rationale} disabled={phase==='GENERATING'||phase==='APPLYING'} onClick={()=>void runGeneration(s.transformation_instruction,custom)} className="rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-40">{s.title}</button>)}</div>}
    {settings?.cloudConsent==='true'&&<div className="flex flex-wrap gap-1.5" aria-label="Quick writing actions">{QUICK_ACTIONS.map(action=><button key={action.id} disabled={phase==='GENERATING'||phase==='APPLYING'} onClick={()=>void runGeneration(action.instruction,custom)} className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-muted disabled:opacity-40">{action.title}</button>)}</div>}
    {settings?.cloudConsent!=='true'&&<button className="text-sm text-primary underline" onClick={()=>void api.openSettings()}>Enable Cloud AI</button>}
    <div className="rounded-lg border border-border bg-card p-2"><textarea aria-label="Custom instruction" className="block min-h-14 w-full resize-y bg-transparent p-1.5 text-sm outline-none" rows={2} value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Custom instruction..."/><div className="flex items-center justify-between gap-2"><button className="text-xs text-foreground/60 hover:text-primary" onClick={()=>setShowGrammar(v=>!v)}>{showGrammar?'Hide grammar':'Local grammar'}</button>{phase==='GENERATING'?<Button variant="outline" className="py-1.5" onClick={cancel}>Cancel</Button>:<Button className="py-1.5" disabled={!custom.trim()||phase==='APPLYING'} onClick={()=>void runGeneration('',custom)}>Generate</Button>}</div></div>
    {showGrammar&&<GrammarPanel text={draft} onChange={v=>{setDraft(v);setAnalysis(null);setResult('');setPhase('READY');}}/>}
    {(result||phase==='GENERATING')&&<div className="rounded-lg border border-border bg-card p-3 space-y-2"><div className="flex items-center justify-between"><strong className="text-xs">{phase==='GENERATING'?'Generating...':phase==='RESULT_READY'?'Result':'Incomplete result'}</strong><button className="flex items-center gap-1 text-xs text-foreground/60" onClick={()=>setCompare(v=>!v)}><ArrowLeftRight size={13}/> Compare</button></div>{compare&&<p dir="auto" className="text-content rounded-md bg-muted px-2 py-2 text-xs">{original}</p>}<p dir="auto" className="text-content rounded-md bg-muted p-2.5 text-sm">{result}{phase==='GENERATING'&&<span className="animate-pulse">▍</span>}</p><div className="flex gap-2"><Button className="flex-1" disabled={phase!=='RESULT_READY'} onClick={()=>void copy(result)}><ClipboardCopy size={14}/>Copy</Button><Button variant="outline" disabled={phase!=='RESULT_READY'||session.replacementCapability==='copy_only'} onClick={()=>void replace()}><Check size={14}/>Replace</Button></div></div>}
   </>}
  </main>
 </div>;
}
