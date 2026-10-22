import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeftRight,Check,ChevronDown,ChevronUp,ClipboardCopy,LoaderCircle,Settings2,Sparkles,X} from 'lucide-react';
import {writeText} from '@tauri-apps/plugin-clipboard-manager';
import {getCurrentWindow,LogicalSize} from '@tauri-apps/api/window';
import type {Analysis,AppSettings,SelectionSession,AiEvent} from '../../types';
import {errorMessage} from '../../types';
import {api,events} from '../../services/tauriClient';
import {buildInstruction,type AssistantPhase} from '../../store/assistant';
import {readPromptActions,type PromptAction} from '../actions/promptLibrary';
import {Button,Notice} from '../../components/ui/primitives';
import GrammarPanel from '../grammar/GrammarPanel';

const toMessage=(e:unknown)=>errorMessage(e);
const disabledPhase=(p:AssistantPhase)=>p==='GENERATING'||p==='APPLYING';

export default function AssistantWindow(){
  const [settings,setSettings]=useState<AppSettings|null>(null);
  const [actions,setActions]=useState<PromptAction[]>(readPromptActions());
  const [session,setSession]=useState<SelectionSession|null>(null);
  const [phase,setPhase]=useState<AssistantPhase>('IDLE');
  const [original,setOriginal]=useState('');
  const [draft,setDraft]=useState('');
  const [result,setResult]=useState('');
  const [analysis,setAnalysis]=useState<Analysis|null>(null);
  const [custom,setCustom]=useState('');
  const [showCustom,setShowCustom]=useState(false);
  const [more,setMore]=useState(false);
  const [error,setError]=useState('');
  const [compare,setCompare]=useState(false);
  const [showGrammar,setShowGrammar]=useState(false);
  const currentSession=useRef('');
  const activeRequest=useRef('');
  const analysisToken=useRef(0);
  const contentRef=useRef<HTMLDivElement|null>(null);

  // The window follows its content rather than leaving an empty rectangle below the buttons.
  // Very long text/results scroll inside a capped-height window.
  useEffect(()=>{
    if(!('__TAURI_INTERNALS__' in window)||!contentRef.current)return;
    const content=contentRef.current;
    let lastHeight=0;
    let frame=0;
    const resize=(force=false)=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const maximum=Math.min(690,Math.max(260,window.screen.availHeight-56));
        const target=Math.min(maximum,Math.max(210,Math.ceil(content.scrollHeight+64)));
        if(!force&&Math.abs(target-lastHeight)<3)return;
        lastHeight=target;
        void getCurrentWindow().setSize(new LogicalSize(420,target)).catch(()=>{});
      });
    };
    const observer=new ResizeObserver(()=>resize());
    const onFocus=()=>resize(true);
    observer.observe(content);
    window.addEventListener('focus',onFocus);
    resize();
    return()=>{observer.disconnect();window.removeEventListener('focus',onFocus);cancelAnimationFrame(frame);};
  },[]);

  const runGeneration=async(instruction:string,extra:string,selection=session,source=draft,config=settings)=>{
    if(!selection||!source.trim())return;
    if(config?.cloudConsent!=='true'){setError('Enable Cloud AI in Settings > Privacy.');return;}
    const instructionText=buildInstruction(instruction,extra);
    analysisToken.current+=1;
    const requestId=crypto.randomUUID();
    if(activeRequest.current)void api.cancel(activeRequest.current);
    activeRequest.current=requestId;
    setResult('');setError('');setCompare(false);setPhase('GENERATING');
    try{await api.rewrite({sessionId:selection.sessionId,requestId,text:source,instruction:instructionText});}
    catch(e){if(activeRequest.current===requestId){activeRequest.current='';setPhase('ERROR');setError(toMessage(e));}}
  };

  const openSession=useCallback(async(next:SelectionSession)=>{
    analysisToken.current+=1;
    if(activeRequest.current){void api.cancel(activeRequest.current);activeRequest.current='';}
    currentSession.current=next.sessionId;
    setSession(next);setOriginal(next.capturedText);setDraft(next.capturedText);
    setAnalysis(null);setResult('');setCustom('');setError('');setCompare(false);
    setShowGrammar(false);setShowCustom(false);setMore(false);setPhase('READY');
    try{
      const latest=await api.settings();
      if(currentSession.current!==next.sessionId)return;
      setSettings(latest);
      setActions(readPromptActions(latest.promptActions));
      // Deliberately NO cloud request here: analysis is on-demand only.
    }catch(e){if(currentSession.current===next.sessionId)setError(toMessage(e));}
  },[]);

  const requestSuggestions=async()=>{
    if(!session||!draft.trim()||phase==='ANALYZING')return;
    if(settings?.cloudConsent!=='true'){setError('Enable Cloud AI in Settings > Privacy.');return;}
    const token=++analysisToken.current;
    const sessionId=session.sessionId;
    setError('');setAnalysis(null);setResult('');setCompare(false);setPhase('ANALYZING');
    try{
      const labels=actions.filter(a=>a.enabled).map(a=>a.label);
      const data=await api.analyze(draft,labels);
      if(token!==analysisToken.current||currentSession.current!==sessionId)return;
      // Avoid showing AI suggestions that duplicate the user's fixed buttons.
      const fixed=new Set(labels.map(s=>s.trim().toLowerCase()));
      const unique=data.suggestions.filter(s=>!fixed.has(s.title.trim().toLowerCase()));
      setAnalysis({...data,suggestions:unique});
      setPhase('SUGGESTIONS_READY');
    }catch(e){
      if(token!==analysisToken.current||currentSession.current!==sessionId)return;
      setError(toMessage(e));setPhase('READY');
    }
  };

  useEffect(()=>{
    let live=true;const unsub:(()=>void)[]=[];
    const subscribe=async()=>{
      const items=await Promise.all([
        events.captured(s=>{if(live)void openSession(s)}),
        events.cleared(()=>{if(!live)return;analysisToken.current++;currentSession.current='';activeRequest.current='';setSession(null);setDraft('');setOriginal('');setAnalysis(null);setResult('');setError('');setPhase('IDLE');}),
        events.failed(e=>{if(live){analysisToken.current++;currentSession.current='';setSession(null);setError(toMessage(e));setPhase('ERROR');}}),
        events.ai('delta',(e:AiEvent)=>{if(live&&activeRequest.current===e.requestId&&currentSession.current===e.sessionId)setResult(s=>s+(e.text||''));}),
        events.ai('completed',e=>{if(live&&activeRequest.current===e.requestId&&currentSession.current===e.sessionId){setResult(e.text||'');setPhase('RESULT_READY');activeRequest.current='';}}),
        events.ai('failed',e=>{if(live&&activeRequest.current===e.requestId&&currentSession.current===e.sessionId){setPhase('ERROR');setError(e.error?.message||'Generation failed');activeRequest.current='';}}),
        events.ai('cancelled',e=>{if(live&&activeRequest.current===e.requestId){activeRequest.current='';setPhase('READY');setResult('');}})
      ]);
      if(live)unsub.push(...items);else items.forEach(fn=>fn());
    };
    void subscribe().catch(e=>{if(live)setError(toMessage(e));});
    void api.settings().then(s=>{if(live){setSettings(s);setActions(readPromptActions(s.promptActions));}}).catch(e=>{if(live)setError(toMessage(e));});
    return()=>{live=false;analysisToken.current++;unsub.forEach(fn=>fn());};
  },[openSession]);

  // Handle Escape in the capture phase, even when a textarea or embedded widget has focus.
  useEffect(()=>{
    const onEscape=(event:KeyboardEvent)=>{
      if(event.key!=='Escape'||event.isComposing)return;
      event.preventDefault();
      event.stopPropagation();
      void api.hide().catch(()=>{});
    };
    document.addEventListener('keydown',onEscape,true);
    return()=>document.removeEventListener('keydown',onEscape,true);
  },[]);
  const copy=async(t:string)=>{try{await writeText(t);}catch(e){setError(toMessage(e));}};
  const replace=async()=>{
    if(!session||phase!=='RESULT_READY'||!result.trim())return;
    if(session.replacementCapability==='copy_only'){
      setError('This editor does not support verified replacement. Use Copy instead.');
      return;
    }
    setPhase('APPLYING');
    try{
      await api.replace(session.sessionId,result);
      // Return to the source application rather than leaving a floating window over the edit.
      await api.hide();
    }catch(e){setError(toMessage(e));setPhase('RESULT_READY');}
  };
  const dragPopup=()=>{
    if('__TAURI_INTERNALS__' in window){
      void getCurrentWindow().startDragging().catch(()=>{});
    }
  };
  const cancel=()=>{if(activeRequest.current)void api.cancel(activeRequest.current);};
  const enabled=actions.filter(a=>a.enabled);
  const favorites=enabled.filter(a=>a.favorite);
  const primary=favorites.length?favorites:enabled.slice(0,6);
  const extra=enabled.filter(a=>!primary.some(p=>p.id===a.id));
  const suggestionList=analysis?.suggestions||[];
  const busy=disabledPhase(phase);

  return <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-border/70 px-3" aria-label="Drag popup header">
      <div className="flex min-w-0 flex-1 cursor-move select-none items-center gap-2 text-[13px] font-semibold" onMouseDown={event=>{if(event.button===0)dragPopup();}} title="Drag to move popup"><Sparkles size={15} className="text-primary"/>Improve Writing</div>
      <div className="flex items-center gap-0.5"><button aria-label="Settings" title="Settings" className="rounded-md p-1.5 text-foreground/60 hover:bg-muted hover:text-foreground" onClick={()=>void api.openSettings().catch(e=>setError(toMessage(e)))}><Settings2 size={16}/></button><button aria-label="Close" className="rounded-md p-1.5 text-foreground/60 hover:bg-muted hover:text-foreground" onClick={()=>void api.hide()}><X size={17}/></button></div>
    </header>
    <main className="scrollarea min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
      <div ref={contentRef} className="space-y-2">
        {session&&<div className="rounded-lg border border-border/80 bg-card px-2.5 py-1.5">
          <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">Selected text</span><button aria-label="Copy selected text" className="rounded p-1 text-foreground/45 hover:text-primary" onClick={()=>void copy(draft)}><ClipboardCopy size={14}/></button></div>
          <p dir="auto" className="text-content max-h-[60px] overflow-y-auto pr-1 text-[13px] leading-[19px]">{draft}</p>
        </div>}
        {!session&&phase==='IDLE'&&<p className="py-4 text-center text-xs text-foreground/60">Select text and press your shortcut.</p>}
        {error&&<Notice kind="error">{error}</Notice>}
        {session&&<>
          <div className="flex flex-wrap gap-1.5" aria-label="Saved writing actions">
            {primary.map(action=><button key={action.id} title={action.instruction} disabled={busy} onClick={()=>void runGeneration(action.instruction,'')} className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:opacity-40">{action.label}</button>)}
            <button aria-expanded={more} aria-label="More actions" onClick={()=>setMore(v=>!v)} className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-foreground/60 hover:bg-muted">More {more?<ChevronUp size={12}/>:<ChevronDown size={12}/>}</button>
          </div>
          {more&&<div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-2" aria-label="Additional writing actions">
            {extra.map(action=><button key={action.id} disabled={busy} onClick={()=>void runGeneration(action.instruction,'')} className="rounded-md border border-border bg-card px-2 py-1.5 text-xs hover:bg-muted disabled:opacity-40">{action.label}</button>)}
            <button className="rounded-md border border-border bg-card px-2 py-1.5 text-xs hover:bg-muted" onClick={()=>{setShowGrammar(v=>!v);setMore(false);}}>{showGrammar?'Hide local grammar':'Local grammar'}</button>
          </div>}
          <div className="border-t border-border/60 pt-2">
            <button aria-label="Custom Suggestions" disabled={busy||phase==='ANALYZING'} onClick={()=>void requestSuggestions()} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 disabled:opacity-40">
              {phase==='ANALYZING'?<LoaderCircle size={14} className="animate-spin"/>:<Sparkles size={14}/>} Custom Suggestions
            </button>
            {suggestionList.length>0&&<div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="AI suggestions">{suggestionList.map(s=><button key={s.id} title={s.rationale} disabled={busy} onClick={()=>void runGeneration(s.transformation_instruction,'')} className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-40">{s.title}</button>)}</div>}
            {analysis&&suggestionList.length===0&&<p className="mt-1 text-xs text-foreground/55">No additional suggestions. Try another action or write your own instruction.</p>}
          </div>
          {!showCustom?<button onClick={()=>setShowCustom(true)} className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-left text-xs text-foreground/50 hover:border-primary/30 hover:text-primary">+ Custom instruction...</button>:<div className="rounded-lg border border-border bg-card p-2">
            <textarea autoFocus aria-label="Custom instruction" className="block min-h-14 w-full resize-y bg-transparent px-1 py-1 text-xs leading-5 outline-none" rows={2} maxLength={4000} value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Describe how to improve this text..."/>
            <div className="flex items-center justify-between gap-2"><button className="text-[11px] text-foreground/50 hover:text-foreground" onClick={()=>{setShowCustom(false);setCustom('');}}>Close</button>{phase==='GENERATING'?<Button variant="outline" className="px-2.5 py-1 text-xs" onClick={cancel}>Cancel</Button>:<Button className="px-3 py-1.5 text-xs" disabled={!custom.trim()||busy} onClick={()=>void runGeneration('',custom)}>Generate</Button>}</div>
          </div>}
          {(phase==='GENERATING'||settings?.cloudConsent!=='true')&&<div className="flex items-center gap-3 px-1 text-[11px]">{phase==='GENERATING'&&<button className="text-primary" onClick={cancel}>Cancel generation</button>}{settings?.cloudConsent!=='true'&&<button className="text-primary underline" onClick={()=>void api.openSettings().catch(e=>setError(toMessage(e)))}>Enable Cloud AI</button>}</div>}
          {showGrammar&&<GrammarPanel text={draft} onChange={v=>{analysisToken.current++;setDraft(v);setAnalysis(null);setResult('');setPhase('READY');}}/>}
          {(result||phase==='GENERATING')&&<div className="space-y-1.5 rounded-lg border border-border bg-card p-2">
            <div className="flex items-center justify-between gap-2"><strong className="text-xs">{phase==='GENERATING'?'Generating…':phase==='RESULT_READY'?'Result':'Incomplete result'}</strong><button aria-pressed={compare} className="inline-flex items-center gap-1 text-[11px] text-foreground/50 hover:text-primary" onClick={()=>setCompare(v=>!v)}><ArrowLeftRight size={12}/>Compare</button></div>
            {compare&&<p dir="auto" className="text-content max-h-28 overflow-y-auto rounded-md bg-muted/60 px-2 py-2 text-xs">{original}</p>}
            <p dir="auto" className="text-content max-h-52 overflow-y-auto rounded-md bg-muted/70 p-2 text-[13px] leading-[19px]">{result}{phase==='GENERATING'&&<span className="animate-pulse">▍</span>}</p>
            <div className="flex gap-2"><Button className="flex-1 py-1.5 text-xs" disabled={phase!=='RESULT_READY'} onClick={()=>void copy(result)}><ClipboardCopy size={13}/>Copy</Button><Button variant="outline" className="py-1.5 text-xs" title={session.replacementCapability==='copy_only'?"Replacement unavailable in this editor; use Copy.":"Replace the verified selection in the original editor."} disabled={phase!=='RESULT_READY'||session.replacementCapability==='copy_only'} onClick={()=>void replace()}><Check size={13}/>Replace</Button></div>
          </div>}
        </>}
      </div>
    </main>
  </div>;
}
