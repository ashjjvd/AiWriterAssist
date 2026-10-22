import {beforeEach,describe,it,expect,vi} from 'vitest';
import {act,render,screen,waitFor,fireEvent} from '@testing-library/react';
import AssistantWindow from './AssistantWindow';
import {DEFAULT_PROMPT_ACTIONS} from '../actions/promptLibrary';

const mock=vi.hoisted(()=>({listeners:new Map<string,(v:unknown)=>void>(),settings:vi.fn(),analyze:vi.fn(),rewrite:vi.fn(),cancel:vi.fn(),hide:vi.fn(),replace:vi.fn()}));
vi.mock('../../services/tauriClient',()=>({
  api:{settings:mock.settings,analyze:mock.analyze,rewrite:mock.rewrite,cancel:mock.cancel,openSettings:vi.fn().mockResolvedValue(undefined),hide:mock.hide,replace:mock.replace},
  events:{captured:async(fn:(s:unknown)=>void)=>{mock.listeners.set('captured',fn);return()=>{};},cleared:async(fn:(s:unknown)=>void)=>{mock.listeners.set('cleared',fn);return()=>{};},failed:async(fn:(s:unknown)=>void)=>{mock.listeners.set('failed',fn);return()=>{};},ai:async(kind:string,fn:(s:unknown)=>void)=>{mock.listeners.set(kind,fn);return()=>{};}}
}));
vi.mock('@tauri-apps/plugin-clipboard-manager',()=>({writeText:vi.fn()}));
vi.mock('../grammar/GrammarPanel',()=>({default:()=>null}));
const selection={sessionId:'session1',capturedText:'ye test kaisy karain?',replacementCapability:'copy_only',sourcePlatform:'windows',sourceProcessId:2,sourceWindowIdentifier:'1',capturedTextHash:'h',capturedAt:0,selectionIsEditable:false};
const config={cloudConsent:'true',automaticAnalysis:'true',promptActions:JSON.stringify(DEFAULT_PROMPT_ACTIONS)};

beforeEach(()=>{
  mock.listeners.clear();mock.settings.mockReset();mock.analyze.mockReset();mock.rewrite.mockReset();mock.cancel.mockReset();mock.hide.mockReset();mock.replace.mockReset();mock.hide.mockResolvedValue(undefined);mock.replace.mockResolvedValue(undefined);
  mock.settings.mockResolvedValue(config);
  mock.rewrite.mockResolvedValue(undefined);
  mock.analyze.mockResolvedValue({language:'Roman Urdu',script:'Latin',intent_summary:'question',overall_assessment:'fine',suggestions:[{id:'1',title:'Clarify Question',rationale:'More specific',transformation_instruction:'Clarify the actual question',priority:1}]});
});

describe('on-demand improvement assistant',()=>{
  it('closes when Escape is pressed while a text control has focus',async()=>{
    render(<AssistantWindow/>);
    await screen.findByRole('button',{name:'Close'});
    fireEvent.keyDown(document,{key:'Escape'});
    await waitFor(()=>expect(mock.hide).toHaveBeenCalledTimes(1));
  });

  it('replaces only when Windows reports a verified editable selection',async()=>{
    render(<AssistantWindow/>);
    await waitFor(()=>expect(mock.listeners.has('captured')).toBe(true));
    const edit={...selection,selectionIsEditable:true,replacementCapability:'verified_keyboard_replace'};
    await act(async()=>{mock.listeners.get('captured')?.(edit)});
    fireEvent.click(await screen.findByRole('button',{name:'Shorten'}));
    await waitFor(()=>expect(mock.rewrite).toHaveBeenCalledTimes(1));
    const requestId=mock.rewrite.mock.calls[0][0].requestId;
    await act(async()=>{mock.listeners.get('completed')?.({requestId,sessionId:'session1',text:'Improved text'})});
    const replace=await screen.findByRole('button',{name:'Replace'});
    expect(replace).not.toBeDisabled();
    fireEvent.click(replace);
    await waitFor(()=>expect(mock.replace).toHaveBeenCalledWith('session1','Improved text'));
    expect(mock.hide).toHaveBeenCalled();
  });

  it('does not analyze on capture; saved buttons send their instructions straight to rewrite',async()=>{
    render(<AssistantWindow/>);
    await waitFor(()=>expect(mock.listeners.has('captured')).toBe(true));
    await act(async()=>{mock.listeners.get('captured')?.(selection)});
    await screen.findByRole('button',{name:'Shorten'});
    expect(mock.analyze).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Shorten'}));
    await waitFor(()=>expect(mock.rewrite).toHaveBeenCalledTimes(1));
    const request=mock.rewrite.mock.calls[0][0];
    expect(request.text).toBe(selection.capturedText);
    expect(request.instruction).toContain('more concise');
    expect(mock.analyze).not.toHaveBeenCalled();
  });

  it('asks AI for context-aware suggestions only after the Custom Suggestions click',async()=>{
    render(<AssistantWindow/>);
    await waitFor(()=>expect(mock.listeners.has('captured')).toBe(true));
    await act(async()=>{mock.listeners.get('captured')?.(selection)});
    await screen.findByRole('button',{name:'Custom Suggestions'});
    expect(mock.analyze).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Custom Suggestions'}));
    await waitFor(()=>expect(mock.analyze).toHaveBeenCalledTimes(1));
    expect(mock.analyze.mock.calls[0][0]).toBe(selection.capturedText);
    expect(mock.analyze.mock.calls[0][1]).toContain('Translate');
    fireEvent.click(await screen.findByRole('button',{name:'Clarify Question'}));
    await waitFor(()=>expect(mock.rewrite).toHaveBeenCalledTimes(1));
    expect(mock.rewrite.mock.calls[0][0].instruction).toContain('Clarify the actual question');
  });
});
