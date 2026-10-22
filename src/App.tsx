import {useEffect} from 'react';
import {api} from './services/tauriClient';
import AssistantWindow from './features/assistant/AssistantWindow';
import SynonymsWindow from './features/assistant/SynonymsWindow';
import SettingsWindow from './features/settings/SettingsWindow';
export default function App(){
 useEffect(()=>{let active=true;const apply=()=>{void api.settings().then(s=>{if(active)document.documentElement.classList.toggle('dark',s.theme==='dark'||(s.theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))}).catch(()=>{});};apply();const media=matchMedia('(prefers-color-scheme: dark)');media.addEventListener('change',apply);return()=>{active=false;media.removeEventListener('change',apply);};},[]);
 const windowName=new URLSearchParams(location.search).get('window');
 if(windowName==='assistant')return <AssistantWindow/>;
 if(windowName==='synonyms')return <SynonymsWindow/>;
 return <SettingsWindow/>;
}
