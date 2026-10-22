import {useEffect,useState} from 'react';
import {BookOpen,X} from 'lucide-react';
import {api,events} from '../../services/tauriClient';
import {errorMessage,type SelectionSession} from '../../types';
import ThesaurusPanel from '../thesaurus/ThesaurusPanel';
import {Notice} from '../../components/ui/primitives';

export default function SynonymsWindow(){
 const [session,setSession]=useState<SelectionSession|null>(null);
 const [error,setError]=useState('');
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
 return <div className="flex h-screen flex-col overflow-hidden bg-background">
  <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3"><div className="flex items-center gap-2 font-semibold"><BookOpen size={16} className="text-primary"/>Synonyms</div><button aria-label="Close" className="rounded-md p-1 hover:bg-muted" onClick={()=>void api.hideSynonyms()}><X size={16}/></button></header>
  <main className="scrollarea min-h-0 flex-1 overflow-y-auto p-4">{error&&<Notice kind="error">{error}</Notice>}{session?<ThesaurusPanel key={session.sessionId} source={session.capturedText}/>:!error&&<p className="text-sm text-foreground/60">Select a word and press your synonyms shortcut.</p>}</main>
 </div>;
}
