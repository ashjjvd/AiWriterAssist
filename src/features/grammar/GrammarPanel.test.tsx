import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import GrammarPanel from './GrammarPanel';
const mock=vi.hoisted(()=>({grammar:vi.fn(),fix:vi.fn()}));
vi.mock('../../services/tauriClient',()=>({api:mock}));
describe('offline grammar panel',()=>{
 it('renders real analysis output contract and applies the chosen correction',async()=>{
  mock.grammar.mockResolvedValue({issues:[{issueId:'x',startOffset:8,endOffset:10,originalText:'an',category:'Grammar',priority:1,explanation:'Article mismatch',suggestions:['a'],ruleIdentifier:'article'}],analyzedCharacterCount:11,durationMs:3,warnings:[]});
  mock.fix.mockResolvedValue('This is a test');const onChange=vi.fn();
  render(<GrammarPanel text="This is an test" onChange={onChange}/>);
  await screen.findByText('Article mismatch');fireEvent.click(screen.getByRole('button',{name:/^a$/i}));
  await waitFor(()=>expect(onChange).toHaveBeenCalledWith('This is a test'));
 });
});
