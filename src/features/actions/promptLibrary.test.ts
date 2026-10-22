import {describe,expect,it} from 'vitest';
import {DEFAULT_PROMPT_ACTIONS,readPromptActions,validatePromptActions} from './promptLibrary';

describe('saved prompt library',()=>{
  it('loads the fixed writing presets when no library was saved',()=>{
    expect(readPromptActions().map(a=>a.label)).toContain('Refine Prompt');
    expect(readPromptActions('').some(a=>a.favorite)).toBe(true);
  });
  it('preserves user-edited prompts and ordering',()=>{
    const actions=[{...DEFAULT_PROMPT_ACTIONS[0],instruction:'User supplied translation preference.'}];
    expect(readPromptActions(JSON.stringify(actions))).toEqual(actions);
  });
  it('rejects duplicate IDs or malformed saved actions',()=>{
    const dupe=[DEFAULT_PROMPT_ACTIONS[0],DEFAULT_PROMPT_ACTIONS[0]];
    expect(validatePromptActions(dupe)).toBe(false);
    expect(readPromptActions(JSON.stringify(dupe))).toHaveLength(DEFAULT_PROMPT_ACTIONS.length);
  });
});
