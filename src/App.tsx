import {useEffect} from 'react';
import {api} from './services/tauriClient';
import AssistantWindow from './features/assistant/AssistantWindow';
import SettingsWindow from './features/settings/SettingsWindow';
export default function App(){useEffect(()=>{let active=true;const apply=()=>{void api.settings().then(s=>{if(active)document.documentElement.classList.toggle('dark',s.theme==='dark'||(s.theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))}).catch(()=>{})};apply();const media=matchMedia('(prefers-color-scheme: dark)');media.addEventListener('change',apply);return()=>{active=false;media.removeEventListener('change',apply)}},[]);
 const isAssistant=new URLSearchParams(location.search).get('window')==='assistant';return isAssistant?<AssistantWindow/>:<SettingsWindow/>;
}
