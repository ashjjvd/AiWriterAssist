import {useEffect,useState} from 'react';
import {CheckCircle2,RefreshCcw} from 'lucide-react';
import {api} from '../../services/tauriClient';
import type {GrammarResult,GrammarIssue} from '../../types';
import {errorMessage} from '../../types';
import {Button,Card,Notice} from '../../components/ui/primitives';
export default function GrammarPanel({text,onChange}:{text:string;onChange:(text:string)=>void}) {
 const [result,setResult]=useState<GrammarResult|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;setBusy(true);setResult(null);api.grammar(text).then(v=>{if(alive)setResult(v)}).catch(e=>{if(alive)setError(errorMessage(e))}).finally(()=>{if(alive)setBusy(false)});return()=>{alive=false}},[text]);
 const apply=async (issue:GrammarIssue,replacement:string)=>{try{onChange(await api.fix(text,issue,replacement))}catch(e){setError(errorMessage(e))}};
 const applyAll=async()=>{if(!result)return;try{const edits=result.issues.filter(i=>i.suggestions.length).map(i=>[i,i.suggestions[0]] as [GrammarIssue,string]);onChange(await api.fixAll(text,edits))}catch(e){setError(errorMessage(e))}};
 return <div className="space-y-3">
  <div className="flex items-center justify-between"><div><h2 className="font-semibold">Offline grammar</h2><p className="text-xs opacity-60">Powered by Harper · English</p></div><Button variant="outline" disabled={busy||!result?.issues.some(i=>i.suggestions.length)} onClick={applyAll}>Apply all safe fixes</Button></div>
  {error&&<Notice kind="error">{error}</Notice>}{busy&&<div role="status" className="text-sm opacity-60">Checking writing…</div>}
  {result?.warnings.map(w=><Notice key={w}>{w}</Notice>)}
  {result&&<div className="text-xs opacity-60">{result.issues.length} issues found · {result.analyzedCharacterCount} characters · {result.durationMs} ms</div>}
  {result?.issues.length===0&&<Card className="flex items-center gap-2 text-sm"><CheckCircle2 size={18}/> No supported issues found.</Card>}
  {result?.issues.map(i=><Card className="space-y-2" key={i.issueId}><div className="flex gap-2 justify-between"><strong className="text-sm">{i.originalText}</strong><span className="text-xs opacity-60">{i.category}</span></div><p className="text-xs text-foreground/70">{i.explanation}</p><div className="flex flex-wrap gap-1.5">{i.suggestions.map(s=><Button key={s} variant="outline" className="text-xs py-1" onClick={()=>void apply(i,s)}><RefreshCcw size={12}/>{s||'(remove)'}</Button>)}</div></Card>)}
 </div>
}
