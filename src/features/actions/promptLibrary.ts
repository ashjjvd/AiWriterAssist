/** Local configuration only: these are instructions, never selected user text. */
export type PromptAction = {
  id: string;
  label: string;
  instruction: string;
  enabled: boolean;
  favorite: boolean;
};

export const DEFAULT_PROMPT_ACTIONS: PromptAction[] = [
  {id:'translate',label:'Translate',instruction:'Translate the selected text into natural, fluent English. Preserve meaning, technical terminology, names and facts. Return only the translation.',enabled:true,favorite:true},
  {id:'shorten',label:'Shorten',instruction:'Make the selected text more concise without removing essential details, constraints or meaning. Retain the source language.',enabled:true,favorite:true},
  {id:'expand',label:'Expand',instruction:'Expand the selected text with clearer wording and useful organization. Do not add unverified facts or new claims. Retain the source language.',enabled:true,favorite:true},
  {id:'polish',label:'Polish',instruction:'Polish the wording for readability, flow and precision. Preserve the original language, tone, message and facts.',enabled:true,favorite:true},
  {id:'grammar',label:'Fix Grammar',instruction:'Correct grammar, spelling and punctuation while keeping the original language, wording and intent as much as possible.',enabled:true,favorite:true},
  {id:'refine-prompt',label:'Refine Prompt',instruction:'Rewrite the text as a clearer, more precise AI prompt. Improve instructions, context, requirements and expected output structure only where supported. Never invent missing details.',enabled:true,favorite:true},
  {id:'professional',label:'Professional',instruction:'Use a professional, clear tone that suits the content and audience while preserving meaning and language.',enabled:true,favorite:false},
  {id:'friendly',label:'Friendly',instruction:'Make the writing warm and approachable without losing clarity, information or its original language.',enabled:true,favorite:false},
  {id:'simplify',label:'Simplify',instruction:'Explain the same ideas using simpler language and shorter sentences, without losing important facts.',enabled:true,favorite:false},
  {id:'summarize',label:'Summarize',instruction:'Summarize the selected content into a short, accurate overview. Do not invent any facts.',enabled:true,favorite:false},
  {id:'key-points',label:'Key Points',instruction:'Extract the main factual points into concise bullet points. Preserve the source language and do not invent details.',enabled:true,favorite:false},
  {id:'academic',label:'Academic',instruction:'Improve clarity and formal academic style. Retain citations, uncertainty and technical terms; do not fabricate references or findings.',enabled:true,favorite:false},
  {id:'features',label:'Product Features',instruction:'Present explicitly stated product capabilities as clear feature bullets. Do not invent features or specifications.',enabled:true,favorite:false}
];

export function validatePromptActions(value: unknown): value is PromptAction[] {
  return Array.isArray(value) && value.length <= 30 && value.every(a =>
    a && typeof a === 'object' &&
    typeof a.id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(a.id) &&
    typeof a.label === 'string' && a.label.trim().length > 0 && a.label.length <= 32 &&
    typeof a.instruction === 'string' && a.instruction.trim().length > 0 && a.instruction.length <= 4000 &&
    typeof a.enabled === 'boolean' && typeof a.favorite === 'boolean'
  ) && (new Set(value.map(a => a.id))).size === value.length;
}

export function readPromptActions(serialized?: string | null): PromptAction[] {
  if (!serialized || !serialized.trim()) return DEFAULT_PROMPT_ACTIONS.map(a => ({...a}));
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (validatePromptActions(parsed)) return parsed.map(a => ({...a}));
  } catch { /* Invalid saved data must not hide built-in actions. */ }
  return DEFAULT_PROMPT_ACTIONS.map(a => ({...a}));
}
