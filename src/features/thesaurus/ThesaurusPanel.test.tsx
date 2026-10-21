import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import ThesaurusPanel from './ThesaurusPanel';
const mock=vi.hoisted(()=>({synonyms:vi.fn()}));
vi.mock('../../services/tauriClient',()=>({api:mock}));
vi.mock('@tauri-apps/plugin-clipboard-manager',()=>({writeText:vi.fn()}));
describe('thesaurus panel',()=>{
 it('labels broad Moby associations as related, not exact synonyms',async()=>{
  mock.synonyms.mockResolvedValue({searchedWord:'nice',normalizedWord:'nice',totalUniqueTerms:1,totalRelationships:1,groups:[{term:'pleasant',partOfSpeech:'',relationType:'related',source:'Moby Thesaurus II',relevanceScore:20,usageWarning:'Related concept; not necessarily interchangeable.'}],nextCursor:undefined});
  render(<ThesaurusPanel source="nice idea" onPreview={()=>{}}/>);
  await screen.findByText('pleasant');expect(screen.getByText(/related · Moby/)).toBeInTheDocument();
  fireEvent.click(screen.getByText('pleasant'));await waitFor(()=>expect(screen.getByText(/not necessarily interchangeable/)).toBeInTheDocument());
 });
});
