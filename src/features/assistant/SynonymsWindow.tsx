import {useEffect,useRef,useState} from 'react';
import {BookOpen,X} from 'lucide-react';
import {getCurrentWindow,LogicalSize} from '@tauri-apps/api/window';
import {api,events} from '../../services/tauriClient';
import {errorMessage,type SelectionSession} from '../../types';
import ThesaurusPanel from '../thesaurus/ThesaurusPanel';
import {Notice} from '../../components/ui/primitives';

export default function SynonymsWindow(){
  const [session,setSession]=useState<SelectionSession|null>(null);
  const [error,setError]=useState('');
  const contentRef=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    let active=true;const listeners:(()=>void)[]=[];
    void Promise.all([
      events.captured(s=>{if(active){setSession(s);setError('');}}),
      events.failed(e=>{if(active){setSession(null);setError(errorMessage(e));}}),
      events.cleared(()=>{if(active){setSession(null);setError('');}})
    ]).then(unsub=>{if(active)listeners.push(...unsub);else unsub.forEach(f=>f());}).catch(e=>{if(active)setError(errorMessage(e));});
    return()=>{active=false;listeners.forEach(fn=>fn());};
  },[]);
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')void api.hideSynonyms();};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[]);
  useEffect(()=>{
    if(!('__TAURI_INTERNALS__' in window)||!contentRef.current)return;
    const content=contentRef.current;
    let height=0,frame=0;
    const resize=(force=false)=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const max=Math.min(580,Math.max(270,window.screen.availHeight-64));
        const next=Math.min(max,Math.max(225,Math.ceil(content.scrollHeight+68)));
        if(!force&&Math.abs(height-next)<3)return;
        height=next;
        void getCurrentWindow().setSize(new LogicalSize(360,next)).catch(()=>{});
      });
    };
    const observer=new ResizeObserver(()=>resize());
    const onFocus=()=>resize(true);
    observer.observe(content);window.addEventListener('focus',onFocus);resize();
    return()=>{observer.disconnect();window.removeEventListener('focus',onFocus);cancelAnimationFrame(frame);};
  },[]);
  return <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-border/70 px-3.5"><div className="flex items-center gap-2 text-sm font-semibold"><BookOpen size={15} className="text-primary"/>Synonyms</div><button aria-label="Close" className="rounded-md p-1.5 text-foreground/60 hover:bg-muted hover:text-foreground" onClick={()=>void api.hideSynonyms()}><X size={16}/></button></header>
    <main className="scrollarea min-h-0 flex-1 overflow-y-auto px-3 py-3"><div ref={contentRef}>{error&&<Notice kind="error">{error}</Notice>}{session?<ThesaurusPanel key={session.sessionId} source={session.capturedText}/>:!error&&<p className="py-2 text-xs text-foreground/60">Select a word and press your synonyms shortcut.</p>}</div></main>
  </div>;
}
