import {z} from 'zod';
export type AppError={code:string;message:string;recovery:string};
export type AppSettings={theme:'system'|'light'|'dark';shortcut:string;synonymShortcut:string;cloudConsent:string;automaticAnalysis:string;proxyMode:string};
export type SelectionSession={sessionId:string;sourcePlatform:string;sourceProcessId:number;sourceWindowIdentifier:string;capturedText:string;capturedTextHash:string;capturedAt:number;replacementCapability:'copy_only'|'native'|'guarded_paste';captureWarning?:string;selectionIsEditable:boolean};
export type GrammarIssue={issueId:string;startOffset:number;endOffset:number;originalText:string;category:string;priority:number;explanation:string;suggestions:string[];ruleIdentifier:string};
export type GrammarResult={issues:GrammarIssue[];analyzedCharacterCount:number;durationMs:number;warnings:string[]};
export type Synonym={term:string;partOfSpeech:string;relationType:string;definition?:string;source:string;relevanceScore:number;usageWarning?:string};
export type Lookup={searchedWord:string;normalizedWord:string;totalUniqueTerms:number;totalRelationships:number;groups:Synonym[];nextCursor?:number};
export type ProviderDefinition={id:string;name:string;baseUrl:string;protocols:string[];documentation:string};
export type ProviderConfig={id:string;providerType:string;friendlyName:string;baseUrl:string;selectedModelId:string;protocolSelection:'chat'|'responses'|'messages';proxyProfileId:string|null;secureApiKeyReference:string|null;isDefault:boolean};
export type ProxyProfile={id:string;name:string;scheme:'http'|'https'|'socks5'|'socks5h';hostname:string;port:number;username:string|null;passwordSecretReference:string|null};
export const suggestionSchema=z.object({id:z.string(),title:z.string().min(1).max(100),rationale:z.string(),transformation_instruction:z.string().min(1),priority:z.number().int().min(0).max(5)}).strip();
export const analysisSchema=z.object({language:z.string(),script:z.string(),intent_summary:z.string(),overall_assessment:z.string(),suggestions:z.array(suggestionSchema).max(5)}).strip();
export type WritingSuggestion=z.infer<typeof suggestionSchema>;
export type Analysis=z.infer<typeof analysisSchema>;
export type AiEvent={requestId:string;sessionId:string;sequence?:number;text?:string;error?:AppError};
export type ProviderTest={authenticationSuccess:boolean;modelAccessible:boolean;textGenerated:boolean;streamingTested:boolean;latencyMs:number};
export function errorMessage(error:unknown):string {if(error && typeof error==='object' && 'message' in error){return String((error as {message:unknown}).message)}return String(error)}
