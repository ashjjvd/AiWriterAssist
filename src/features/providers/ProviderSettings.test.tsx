import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import ProviderSettings from './ProviderSettings';
const mock=vi.hoisted(()=>({registry:vi.fn(),providers:vi.fn(),proxies:vi.fn(),saveProvider:vi.fn()}));
vi.mock('../../services/tauriClient',()=>({api:mock}));
describe('provider settings',()=>{
 it('creates a form from verified registry fields, without an invented model',async()=>{
  mock.registry.mockResolvedValue([{id:'openai',name:'OpenAI',baseUrl:'https://api.openai.com/v1',protocols:['responses','chat'],documentation:'https://platform.openai.com/docs'}]);
  mock.providers.mockResolvedValue([]);mock.proxies.mockResolvedValue([]);
  render(<ProviderSettings/>);fireEvent.click(await screen.findByRole('button',{name:/add provider/i}));
  expect(screen.getByDisplayValue('https://api.openai.com/v1')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Enter model ID')).toHaveValue('');
 });
});
