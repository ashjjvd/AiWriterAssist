import {describe,it,expect} from 'vitest';
import {buildInstruction,QUICK_ACTIONS} from './assistant';
describe('writing actions',()=>{
 it('always includes four universal actions',()=>expect(QUICK_ACTIONS).toHaveLength(4));
 it('retains explicit user instruction',()=>expect(buildInstruction('Shorten','Keep greeting')).toContain('Keep greeting'));
 it('rejects an empty request',()=>expect(()=>buildInstruction('','')).toThrow());
});
