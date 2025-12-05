const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-70b-instruct';
const OPENROUTER_APP_URL = process.env.OPENROUTER_APP_URL || 'http://localhost:5173';
const OPENROUTER_APP_NAME = process.env.OPENROUTER_APP_NAME || 'Avatar Realtime Agent';

interface CompleteResponse {
  content: string;
}

//@ts-ignore
export async function complete(body: any): Promise<CompleteResponse> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const messages = body.messages || [];
  const model = body.model || OPENROUTER_MODEL;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': OPENROUTER_APP_URL,
      'X-Title': OPENROUTER_APP_NAME,
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return {
    content: content,
  };
}
