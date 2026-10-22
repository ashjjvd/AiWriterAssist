import {useEffect,useState} from 'react';
import {ArrowDown,ArrowUp,Plus,RotateCcw,Save,Trash2} from 'lucide-react';
import {api} from '../../services/tauriClient';
import {errorMessage} from '../../types';
import {Button,Card,Input,Notice,Textarea} from '../../components/ui/primitives';
import {DEFAULT_PROMPT_ACTIONS,readPromptActions,type PromptAction} from '../actions/promptLibrary';

const blank = (): PromptAction => ({id:'',label:'',instruction:'',enabled:true,favorite:false});

export default function PromptLibrary(){
  const [actions,setActions]=useState<PromptAction[]>([]);
  const [editing,setEditing]=useState<PromptAction|null>(null);
  const [saving,setSaving]=useState(false);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  useEffect(()=>{
    let alive=true;
    void api.settings().then(s=>{if(alive){setActions(readPromptActions(s.promptActions));setBusy(false);}})
      .catch(e=>{if(alive){setError(errorMessage(e));setBusy(false);}});
    return ()=>{alive=false};
  },[]);

  const persist=async(next:PromptAction[], message:string)=>{
    setSaving(true);setError('');setNotice('');
    try {
      await api.setting('promptActions',JSON.stringify(next));
      setActions(next);setNotice(message);setEditing(null);
    }catch(e){setError(errorMessage(e));}
    finally{setSaving(false);}
  };

  const move=(index:number,step:number)=>{
    const nextIndex=index+step;
    if(nextIndex<0||nextIndex>=actions.length)return;
    const next=[...actions];
    [next[index],next[nextIndex]]=[next[nextIndex],next[index]];
    void persist(next,'Action order saved.');
  };

  const saveEditor=()=>{
    if(!editing)return;
    const label=editing.label.trim(),instruction=editing.instruction.trim();
    if(!label||label.length>32||!instruction||instruction.length>4000){
      setError('Enter a label (1–32 characters) and instruction (1–4000 characters).');return;
    }
    const id=editing.id||`custom-${crypto.randomUUID().replace(/-/g,'')}`;
    const entry={...editing,id,label,instruction};
    const next=editing.id?actions.map(a=>a.id===id?entry:a):[...actions,entry];
    if(next.length>30){setError('You can save a maximum of 30 actions.');return;}
    void persist(next,'Action saved.');
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Prompt Library</h2><p className="text-sm text-foreground/60">One-click writing actions. No AI request until you choose an action.</p></div>
      <Button disabled={busy||saving||!!editing||actions.length>=30} onClick={()=>{setError('');setEditing(blank())}}><Plus size={15}/>Add action</Button>
    </div>
    {error&&<Notice kind="error">{error}</Notice>}{notice&&<Notice>{notice}</Notice>}
    {editing&&<Card className="space-y-3 border-primary/30">
      <div className="flex items-center justify-between"><h3 className="font-semibold">{editing.id?'Edit action':'New action'}</h3><button className="text-xs text-foreground/60 hover:text-foreground" onClick={()=>setEditing(null)}>Cancel</button></div>
      <label className="block space-y-1"><span className="text-xs font-medium">Button label</span><Input aria-label="Action label" maxLength={32} value={editing.label} placeholder="e.g. Research Abstract" onChange={e=>setEditing({...editing,label:e.target.value})}/></label>
      <label className="block space-y-1"><span className="text-xs font-medium">AI instruction</span><Textarea aria-label="Action instruction" rows={5} maxLength={4000} value={editing.instruction} placeholder="Describe exactly how the selected text should be transformed..." onChange={e=>setEditing({...editing,instruction:e.target.value})}/></label>
      <div className="flex flex-wrap items-center gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={editing.enabled} onChange={e=>setEditing({...editing,enabled:e.target.checked})}/>Enabled</label><label className="flex items-center gap-2"><input type="checkbox" checked={editing.favorite} onChange={e=>setEditing({...editing,favorite:e.target.checked})}/>Show in popup</label></div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setEditing(null)}>Cancel</Button><Button disabled={saving||!editing.label.trim()||!editing.instruction.trim()} onClick={saveEditor}><Save size={15}/>Save action</Button></div>
    </Card>}
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {actions.map((action,index)=><div key={action.id} className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3 last:border-b-0">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{action.label}</span>{action.favorite&&action.enabled&&<span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Popup</span>}{!action.enabled&&<span className="text-[11px] text-foreground/50">Disabled</span>}</div><p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground/60">{action.instruction}</p></div>
        <div className="flex shrink-0 items-center gap-1"><button aria-label={`Move ${action.label} up`} disabled={saving||index===0} onClick={()=>move(index,-1)} className="rounded-md p-1.5 hover:bg-muted disabled:opacity-30"><ArrowUp size={14}/></button><button aria-label={`Move ${action.label} down`} disabled={saving||index===actions.length-1} onClick={()=>move(index,1)} className="rounded-md p-1.5 hover:bg-muted disabled:opacity-30"><ArrowDown size={14}/></button><Button className="px-2 py-1.5 text-xs" variant="outline" disabled={saving} onClick={()=>{setError('');setEditing({...action})}}>Edit</Button><button aria-label={`Delete ${action.label}`} title="Delete" disabled={saving} onClick={()=>{if(confirm(`Delete “${action.label}”?`))void persist(actions.filter(a=>a.id!==action.id),'Action deleted.')}} className="rounded-md p-1.5 text-foreground/50 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={14}/></button></div>
      </div>)}
    </div>
    <div className="flex items-center justify-between gap-3"><span className="text-xs text-foreground/50">{actions.filter(a=>a.enabled).length} enabled · {actions.length}/30 saved</span><Button className="text-xs" variant="outline" disabled={busy||saving} onClick={()=>{if(confirm('Restore all built-in actions and remove custom actions?'))void persist(DEFAULT_PROMPT_ACTIONS.map(a=>({...a})),'Default actions restored.')}}><RotateCcw size={14}/>Restore defaults</Button></div>
  </div>;
}
