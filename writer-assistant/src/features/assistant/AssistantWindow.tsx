import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeftRight,BookOpen,CheckCheck,ClipboardCopy,Command,LoaderCircle,PenLine,Settings2,Sparkles,X} from 'lucide-react';
import {writeText} from '@tauri-apps/plugin-clipboard-manager';
import type {Analysis,AppSettings,SelectionSession,AiEvent} from '../../types';
import {errorMessage} from '../../types';
import {api,events} from '../../services/tauriClient';
import {buildInstruction,QUICK_ACTIONS,type AssistantPhase,type AssistantView} from '../../store/assistant';
import {Button,Card,Textarea,Notice} from '../../components/ui/primitives';
import GrammarPanel from '../grammar/GrammarPanel';
import ThesaurusPanel from '../thesaurus/ThesaurusPanel';
export default function AssistantWindow(){
 const [settings,setSettings]=useState<AppSettings|null>(null),[session,setSession]=useState<SelectionSession|null>(null),[phase,setPhase]=useState<AssistantPhase>('IDLE'),[view,setView]=useState<AssistantView>('improve');
 const [original,setOriginal]=useState(''),[draft,setDraft]=useState(''),[result,setResult]=useState(''),[analysis,setAnalysis]=useState<Analysis|null>(null),[selectedAction,setSelectedAction]=useState(''),[custom,setCustom]=useState(''),[error,setError]=useState(''),[compare,setCompare]=useState(false);
 const currentSession=useRef(''),activeRequest=useRef('');
 const openSession=useCallback((next:SelectionSession,config:AppSettings|null)=>{
  if(activeRequest.current){void api.cancel(activeRequest.current);activeRequest.current=''}
  currentSession.current=next.sessionId;setSession(next);setOriginal(next.capturedText);setDraft(next.capturedText);setResult('');setAnalysis(null);setSelectedAction('');setCustom('');setError('');setPhase('READY');setView('improve');
  if(config?.cloudConsent==='true'&&config.automaticAnalysis==='true'){
   setPhase('ANALYZING');api.analyze(next.capturedText).then(data=>{if(currentSession.current===next.sessionId){setAnalysis(data);setPhase('SUGGESTIONS_READY')}}).catch(e=>{if(currentSession.current===next.sessionId){setError(errorMessage(e));setPhase('READY')}});
  }
 },[]);
 const configRef=useRef<AppSettings|null>(null);
 useEffect(()=>{let active=true;const cleanups:(()=>void)[]=[];
  const listenAll=async()=>{const handlers=await Promise.all([
   events.captured(s=>{if(active)openSession(s,configRef.current)}),
   events.cleared(()=>{currentSession.current='';activeRequest.current='';setSession(null);setOriginal('');setDraft('');setResult('');setAnalysis(null);setError('');setPhase('IDLE')}),
   events.failed(e=>{if(active){currentSession.current='';setSession(null);setPhase('ERROR');setError(errorMessage(e))}}),
   events.ai('delta',(event:AiEvent)=>{if(activeRequest.current===event.requestId&&currentSession.current===event.sessionId)setResult(r=>r+(event.text||''))}),
   events.ai('completed',event=>{if(activeRequest.current===event.requestId&&currentSession.current===event.sessionId){setResult(event.text||'');setPhase('RESULT_READY');activeRequest.current=''}}),
   events.ai('failed',event=>{if(activeRequest.current===event.requestId&&currentSession.current===event.sessionId){setPhase('ERROR');setError(event.error?.message||'AI generation failed');activeRequest.current=''}}),
   events.ai('cancelled',event=>{if(activeRequest.current===event.requestId){setPhase('READY');activeRequest.current=''}})
  ]);if(active)cleanups.push(...handlers);else handlers.forEach(f=>f());};
  void listenAll();api.settings().then(s=>{if(!active)return;setSettings(s);configRef.current=s;return api.session().then(v=>{if(active&&v)openSession(v,s)})}).catch(e=>{if(active)setError(errorMessage(e))});
  return()=>{active=false;cleanups.forEach(stop=>stop())};
 },[openSession]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){void api.hide()}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[]);
 const generate=async()=>{if(!session||!draft)return;if(settings?.cloudConsent!=='true'){setError('Cloud AI is disabled. Enable consent in Settings → Privacy.');return}
  try{const instruction=buildInstruction(selectedAction,custom);const requestId=crypto.randomUUID();activeRequest.current=requestId;setResult('');setError('');setPhase('GENERATING');await api.rewrite({sessionId:session.sessionId,requestId,text:draft,instruction})}catch(e){activeRequest.current='';setPhase('ERROR');setError(errorMessage(e))}
 };
 const cancel=()=>{if(activeRequest.current)void api.cancel(activeRequest.current)};
 const copy=async(text:string)=>{try{await writeText(text)}catch(e){setError(errorMessage(e))}};
 const replace=async()=>{if(!session)return;setPhase('APPLYING');try{await api.replace(session.sessionId,result);setPhase('READY')}catch(e){setError(errorMessage(e));setPhase('RESULT_READY')}};
 return <div className="flex h-screen flex-col overflow-hidden bg-background">
  <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-5 py-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary p-2 text-white"><PenLine size={18}/></div><div><strong>Writer Assistant</strong><p className="text-[11px] text-foreground/60">{settings?.cloudConsent==='true'?'Cloud enabled · local tools available':'Private · offline tools available'}</p></div></div><div className="flex gap-1"><button aria-label="Settings" title="Open settings" onClick={()=>void api.openSettings().catch(e=>setError(errorMessage(e)))} className="rounded-lg p-2 hover:bg-muted"><Settings2 size={17}/></button><button aria-label="Close assistant" className="rounded-lg p-2 hover:bg-muted" onClick={()=>void api.hide()}><X size={18}/></button></div></header>
  <nav aria-label="Assistant views" className="flex shrink-0 gap-1 border-b border-border px-4 pt-3">{([['improve',Sparkles,'Improve'],['synonyms',BookOpen,'Synonyms'],['grammar',CheckCheck,'Grammar']] as const).map(([key,Icon,label])=><button key={key} className={`flex items-center gap-2 border-b-2 px-3 pb-3 text-sm ${view===key?'border-primary font-semibold text-primary':'border-transparent text-foreground/60 hover:text-foreground'}`} onClick={()=>setView(key)}><Icon size={15}/>{label}</button>)}</nav>
  <div className="scrollarea flex-1 overflow-y-auto px-5 py-4"><div className="mx-auto max-w-2xl space-y-4">
   {!session&&<Card className="space-y-3 text-center"><Command size={24} className="mx-auto opacity-50"/><h2 className="font-semibold">Select text, then use your shortcut</h2><p className="text-sm text-foreground/65">{settings?.shortcut||'Ctrl/Cmd + Shift + Space'} in another application opens this assistant with your writing.</p></Card>}
   {error&&<Notice kind="error">{error}</Notice>}
   {session&&<><Card className="space-y-2"><div className="flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-wider opacity-60">Selected text</h2><Button variant="ghost" className="px-2 py-1 text-xs" onClick={()=>void copy(draft)}><ClipboardCopy size={13}/> Copy</Button></div><div dir="auto" className="text-content max-h-32 overflow-y-auto text-sm">{draft}</div></Card>
    {view==='grammar'&&<GrammarPanel text={draft} onChange={setDraft}/>}
    {view==='synonyms'&&<ThesaurusPanel source={draft} onPreview={v=>{setResult(v);setPhase('RESULT_READY');setView('improve')}}/>}
    {view==='improve'&&<>
     <div className="space-y-2"><h2 className="text-xs font-semibold uppercase tracking-wider opacity-60">Quick actions</h2><div className="grid grid-cols-2 gap-2">{QUICK_ACTIONS.map(a=><Button key={a.id} variant={selectedAction===a.instruction?'primary':'outline'} className="justify-start" onClick={()=>setSelectedAction(selectedAction===a.instruction?'':a.instruction)}>{a.title}</Button>)}</div></div>
     {(analysis||phase==='ANALYZING')&&<div className="space-y-2"><h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-60"><Sparkles size={14}/> Smart suggestions {phase==='ANALYZING'&&<LoaderCircle className="animate-spin" size={13}/>}</h2>{analysis?.overall_assessment&&<p className="text-xs text-foreground/65">{analysis.overall_assessment}</p>}{analysis?.suggestions.map(s=><button className={`w-full rounded-xl border p-3 text-left ${selectedAction===s.transformation_instruction?'border-primary bg-muted':'border-border bg-card hover:bg-muted'}`} key={s.id} onClick={()=>setSelectedAction(s.transformation_instruction)}><strong className="text-sm">{s.title}</strong><p className="mt-1 text-xs text-foreground/65">{s.rationale}</p></button>)}</div>}
     <div className="space-y-2"><label className="text-xs font-semibold uppercase tracking-wider opacity-60" htmlFor="custom">Your instruction</label><Textarea id="custom" rows={3} value={custom} onChange={e=>setCustom(e.target.value)} placeholder="E.g. make it clearer while keeping my tone…"/>
     <div className="flex gap-2">{phase==='GENERATING'?<Button className="w-full" variant="outline" onClick={cancel}>Cancel generation</Button>:<Button className="w-full" disabled={!selectedAction.trim()&&!custom.trim()} onClick={()=>void generate()}><Sparkles size={15}/>Generate improvement</Button>}</div></div>
     {(result||phase==='GENERATING')&&<Card className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold">{phase==='GENERATING'?'Generating…':phase==='ERROR'?'Incomplete output':'Improved writing'}</h2><Button variant="ghost" onClick={()=>setCompare(v=>!v)}><ArrowLeftRight size={14}/> {compare?'Single':'Compare'}</Button></div>{compare&&<div className="rounded-lg bg-muted p-3"><p className="text-xs font-semibold opacity-60">Original</p><div dir="auto" className="text-content">{original}</div></div>}<div dir="auto" className="text-content rounded-lg bg-muted p-3">{result}{phase==='GENERATING'&&<span className="animate-pulse">▍</span>}</div>{phase!=='RESULT_READY'&&<p className="text-xs opacity-60">Partial output — do not use until generation completes.</p>}<div className="flex flex-wrap gap-2"><Button disabled={phase!=='RESULT_READY'} onClick={()=>void copy(result)}><ClipboardCopy size={14}/>Copy</Button><Button variant="outline" disabled={phase!=='RESULT_READY'||session.replacementCapability==='copy_only'} onClick={()=>void replace()}>Replace Selection</Button></div>{session.replacementCapability==='copy_only'&&<p className="text-xs text-foreground/60">For safety, use Copy and paste manually; automatic replacement is not verified for this control.</p>}</Card>}
    </>}
   </>}
  </div></div><footer className="shrink-0 border-t border-border px-5 py-3 text-[11px] text-foreground/50"><span className="flex items-center justify-between"><span>Local checks stay on your device</span><span>{phase.replaceAll('_',' ').toLowerCase()}</span></span></footer>
 </div>
}
