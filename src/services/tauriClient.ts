import {invoke} from '@tauri-apps/api/core';
import {listen,type UnlistenFn} from '@tauri-apps/api/event';
import {analysisSchema,type AppSettings,type SelectionSession,type GrammarResult,type GrammarIssue,type Lookup,type ProviderConfig,type ProviderDefinition,type ProxyProfile,type ProviderTest,type AiEvent} from '../types';
export const api={
 settings:()=>invoke<AppSettings>('get_app_settings'),setting:(key:string,value:string)=>invoke<void>('update_app_settings',{key,value}),
 session:()=>invoke<SelectionSession|null>('get_selection_session'),replace:(sessionId:string,text:string)=>invoke<void>('replace_selection',{sessionId,text}),
 hide:()=>invoke<void>('hide_assistant'),hideSynonyms:()=>invoke<void>('hide_synonyms'),show:()=>invoke<void>('show_assistant'),openSettings:()=>invoke<void>('open_settings'),shortcut:(shortcut:string)=>invoke<void>('set_global_shortcut',{shortcut}),synonymShortcut:(shortcut:string)=>invoke<void>('set_synonym_shortcut',{shortcut}),
 grammar:(text:string)=>invoke<GrammarResult>('check_grammar',{text}),fix:(text:string,issue:GrammarIssue,replacement:string)=>invoke<string>('apply_grammar_correction',{text,issue,replacement}),
 fixAll:(text:string,edits:[GrammarIssue,string][])=>invoke<string>('apply_all_grammar_corrections',{text,edits}),
 words:()=>invoke<string[]>('list_personal_dictionary'),addWord:(word:string)=>invoke<void>('add_personal_dictionary_word',{word}),removeWord:(word:string)=>invoke<void>('remove_personal_dictionary_word',{word}),
 synonyms:(word:string,mode:'best'|'all',searchQuery:string,cursor:number,pageSize=40)=>invoke<Lookup>('lookup_thesaurus',{word,mode,searchQuery,cursor,pageSize}),
 registry:()=>invoke<ProviderDefinition[]>('list_provider_registry'),providers:()=>invoke<ProviderConfig[]>('list_provider_configs'),saveProvider:(config:ProviderConfig)=>invoke<void>('save_provider_config',{config}),deleteProvider:(id:string)=>invoke<void>('delete_provider_config',{id}),
 saveProviderSecret:(configId:string,secret:string)=>invoke<string>('save_provider_secret',{configId,secret}),setActive:(id:string)=>invoke<void>('set_active_provider',{id}),
 models:(id:string)=>invoke<string[]>('list_provider_models',{id}),testProvider:(id:string)=>invoke<ProviderTest>('test_provider_connection',{id}),
 proxies:()=>invoke<ProxyProfile[]>('list_proxy_profiles'),saveProxy:(profile:ProxyProfile)=>invoke<void>('save_proxy_profile',{profile}),deleteProxy:(id:string)=>invoke<void>('delete_proxy_profile',{id}),saveProxySecret:(profileId:string,secret:string)=>invoke<string>('save_proxy_secret',{profileId,secret}),testProxy:(profileId:string,providerId:string)=>invoke<ProviderTest>('test_proxy_connection',{profileId,providerId}),
 analyze:(text:string,excludedTitles:string[]=[])=>invoke<unknown>('analyze_writing',{text,excludedTitles}).then(value=>analysisSchema.parse(value)),rewrite:(input:{sessionId:string;requestId:string;text:string;instruction:string})=>invoke<void>('generate_rewrite',{input}),cancel:(requestId:string)=>invoke<void>('cancel_ai_request',{requestId}),
 permissions:()=>invoke<boolean>('get_permission_status'),openPermissions:()=>invoke<void>('open_permission_settings')
};
export const events={
 captured:(fn:(s:SelectionSession)=>void):Promise<UnlistenFn>=>listen('selection://captured',e=>fn(e.payload as SelectionSession)),
 failed:(fn:(error:unknown)=>void):Promise<UnlistenFn>=>listen('selection://failed',e=>fn(e.payload)),
 cleared:(fn:()=>void):Promise<UnlistenFn>=>listen('selection://cleared',fn),
 ai:(kind:'started'|'delta'|'completed'|'failed'|'cancelled',fn:(event:AiEvent)=>void):Promise<UnlistenFn>=>listen(`ai://${kind}`,e=>fn(e.payload as AiEvent))
};
