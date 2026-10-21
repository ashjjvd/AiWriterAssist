export type AssistantPhase='IDLE'|'CAPTURING'|'READY'|'ANALYZING'|'SUGGESTIONS_READY'|'GENERATING'|'RESULT_READY'|'APPLYING'|'ERROR';
export type AssistantView='improve'|'grammar'|'synonyms';
export const QUICK_ACTIONS=[
 {id:'professional',title:'Professional',instruction:'Improve professionalism while preserving the original facts, meaning, and language.'},
 {id:'shorten',title:'Shorten',instruction:'Remove unnecessary wording while preserving important information.'},
 {id:'friendly',title:'Friendly',instruction:'Make writing warmer and more approachable without excess informality.'},
 {id:'grammar',title:'Fix Grammar',instruction:'Correct grammar, spelling, and punctuation while preserving the intended meaning and language.'}
] as const;
export function buildInstruction(selected:string,custom:string):string {
 const parts=[selected.trim(),custom.trim()].filter(Boolean);
 if(!parts.length)throw new Error('Choose an action or enter an instruction.');
 return parts.join('\nAdditional user instruction (takes precedence if conflicting): ');
}
