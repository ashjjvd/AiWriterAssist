import {describe,it,expect,vi} from 'vitest';
import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import AssistantWindow from './AssistantWindow';
const mock=vi.hoisted(()=>({listeners:new Map<string,(v:unknown)=>void>(),settings:vi.fn(),analyze:vi.fn(),rewrite:vi.fn(),cancel:vi.fn()}));
vi.mock('../../services/tauriClient',()=>({
 api:{settings:mock.settings,analyze:mock.analyze,rewrite:mock.rewrite,cancel:mock.cancel,openSettings:vi.fn().mockResolvedValue(undefined),hide:vi.fn()},
 events:{captured:async(fn:(s:unknown)=>void)=>{mock.listeners.set('captured',fn);return()=>{};},cleared:async(fn:(s:unknown)=>void)=>{mock.listeners.set('cleared',fn);return()=>{};},failed:async(fn:(s:unknown)=>void)=>{mock.listeners.set('failed',fn);return()=>{};},ai:async(kind:string,fn:(s:unknown)=>void)=>{mock.listeners.set(kind,fn);return()=>{};}}
}));
vi.mock('@tauri-apps/plugin-clipboard-manager',()=>({writeText:vi.fn()}));
vi.mock('../grammar/GrammarPanel',()=>({default:()=>null}));
const selection={sessionId:'session1',capturedText:'ye test kaisy karain?',replacementCapability:'copy_only',sourcePlatform:'windows',sourceProcessId:2,sourceWindowIdentifier:'1',capturedTextHash:'h',capturedAt:0,selectionIsEditable:false};
describe('compact improvement assistant',()=>{
 it('refreshes consent on capture and shows concise dynamic suggestions',async()=>{
  mock.settings.mockResolvedValueOnce({cloudConsent:'false',automaticAnalysis:'true'}).mockResolvedValueOnce({cloudConsent:'true',automaticAnalysis:'true'});
  mock.analyze.mockResolvedValue({language:'ur',script:'Latin',intent_summary:'question',overall_assessment:'fine',suggestions:[{id:'1',title:'Translate',rationale:'Translate to English',transformation_instruction:'Translate naturally to English',priority:1}]});
  mock.rewrite.mockResolvedValue(undefined);
  render(<AssistantWindow/>);
  await waitFor(()=>expect(mock.listeners.has('captured')).toBe(true));
  fireEvent.click(screen.getByRole('button',{name:'Settings'}));
  mock.listeners.get('captured')?.(selection);
  await screen.findByRole('button',{name:'Translate'});
  expect(mock.analyze).toHaveBeenCalledWith('ye test kaisy karain?');
  fireEvent.click(screen.getByRole('button',{name:'Translate'}));
  await waitFor(()=>expect(mock.rewrite).toHaveBeenCalled());
 });
});
