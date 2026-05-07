export type GeminiApiRequest = {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  jsonMode?: boolean;
};

export type GeminiApiSuccess = {
  ok: true;
  text: string;
  model: string;
};

export type GeminiApiFailure = {
  ok: false;
  code: string;
  message: string;
  status?: number;
  details?: string;
};

export type GeminiApiResult = GeminiApiSuccess | GeminiApiFailure;

const API_PATH = '/api/gemini';

const toFailure = (code: string, message: string, status?: number): GeminiApiFailure => ({
  ok: false,
  code,
  message,
  ...(status ? { status } : {}),
});

export const callGeminiApi = async (request: GeminiApiRequest): Promise<GeminiApiResult> => {
  const prompt = request.prompt.trim();
  if (!prompt) return toFailure('PROMPT_REQUIRED', 'prompt is required.');

  try {
    const response = await fetch(API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction: request.systemInstruction?.trim() || undefined,
        model: request.model,
        jsonMode: request.jsonMode,
      }),
    });

    const body = await response.json().catch(() => null) as GeminiApiResult | null;
    if (!body) return toFailure('INVALID_API_RESPONSE', 'Invalid response from Gemini API route.', response.status);
    return body;
  } catch (error) {
    return toFailure(
      'GEMINI_API_NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network error while calling Gemini API.',
    );
  }
};

export const isGeminiApiConfiguredError = (result: GeminiApiResult) => {
  return !result.ok && result.code === 'GEMINI_API_KEY_MISSING';
};
