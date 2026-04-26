import { GoogleGenerativeAI } from "@google/generative-ai";
import { marked } from "marked";

type AiProvider = 'gemini' | 'openai';

interface NeatifyTextRequest {
  apiKey: string;
  model: string;
  text: string;
  customInstructions: string | null;
  language: string | null;
}

interface OpenAiResponsesApiResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
}

function stripCodeFences(value: string) {
  return value
    .trim()
    .replace(/^```(?:html|markdown|md|text)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

async function normalizeAiOutputForTiptap(value: string) {
  const cleaned = stripCodeFences(value)

  if (!cleaned) {
    return '<p></p>'
  }

  // Use marked to robustly parse Markdown to HTML.
  // It natively handles plain text, Markdown, and even existing HTML perfectly.
  const html = await marked.parse(cleaned, { async: true })
  return html
}

function buildEditorPrompt(
  text: string,
  customInstructions: string | null,
  language: string | null
) {
  return `
You are editing note content that will be inserted into a Tiptap rich text editor.

Your job:
- fix spelling, grammar, punctuation, and awkward wording
- reorganize fragmented writing into a clearer flow
- preserve the original meaning and all important details
- make the note easier to scan with short paragraphs, headings, and lists when appropriate

Strict rules:
- do not add facts that are not present in the source
- do not turn the note into commentary about the note
- do not translate technical or product terms into parenthetical glosses
- do not add explanations in parentheses like "(*desktop*)" or "(*creator name*)"
- keep mixed-language terms natural if they already exist, keep them as names or product terms
- only use headings or lists when they genuinely improve readability
- prefer concise, well-structured writing over copying the source sentence-by-sentence

Output requirements:
- return only a valid HTML fragment
- do not use markdown
- do not use code fences
- do not include classes, styles, or attributes
- allowed tags only: <p>, <h1>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <code>, <pre>, <hr>, <br>

User custom instructions:
${customInstructions || 'No custom instructions.'}

Preferred language:
${language || 'Use the original language of the note.'}

Source note:
"""
${text}
"""
  `.trim();
}

async function requestGeminiNeatify({
  apiKey,
  model,
  text,
  customInstructions,
  language,
}: NeatifyTextRequest) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({ model });
  const result = await generativeModel.generateContent(
    buildEditorPrompt(text, customInstructions, language)
  );

  return await normalizeAiOutputForTiptap(result.response.text());
}

function extractOpenAiResponseText(payload: OpenAiResponsesApiResponse) {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  const contentText = payload.output
    ?.flatMap((outputItem) => outputItem.content ?? [])
    .filter((contentItem) => contentItem.type === 'output_text' || contentItem.type === 'text')
    .map((contentItem) => contentItem.text ?? '')
    .join('\n')
    .trim();

  return contentText ?? '';
}

async function requestOpenAiNeatify({
  apiKey,
  model,
  text,
  customInstructions,
  language,
}: NeatifyTextRequest) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions: buildEditorPrompt(text, customInstructions, language),
      input: text,
    }),
  });

  const payload = await response.json() as OpenAiResponsesApiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || 'Failed to process text with OpenAI.');
  }

  const outputText = extractOpenAiResponseText(payload);
  if (!outputText) {
    throw new Error('OpenAI returned an empty response.');
  }

  return await normalizeAiOutputForTiptap(outputText);
}

const providerHandlers: Record<AiProvider, (request: NeatifyTextRequest) => Promise<string>> = {
  gemini: requestGeminiNeatify,
  openai: requestOpenAiNeatify,
};

export async function neatifyTextWithAi(
  provider: string,
  apiKey: string,
  model: string,
  text: string,
  customInstructions: string | null,
  language: string | null
): Promise<string> {
  const normalizedProvider = provider.toLowerCase() as AiProvider;
  const handler = providerHandlers[normalizedProvider];

  if (!handler) {
    return await normalizeAiOutputForTiptap(text)
  }

  try {
    return await handler({
      apiKey,
      model,
      text,
      customInstructions,
      language,
    });
  } catch (error) {
    console.error(`Error with ${normalizedProvider} API:`, error);
    throw error instanceof Error
      ? error
      : new Error(`Failed to process text with ${normalizedProvider}.`);
  }
}
