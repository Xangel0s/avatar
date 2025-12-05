const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-70b-instruct';
const OPENROUTER_APP_URL = process.env.OPENROUTER_APP_URL || 'http://localhost:5173';
const OPENROUTER_APP_NAME = process.env.OPENROUTER_APP_NAME || 'Avatar Realtime Agent';

interface StreamResponse {
  id: string;
  created: number;
  choices: { delta: { content: string } }[];
}

//@ts-ignore
export async function stream(
  body: any
): Promise<AsyncIterable<StreamResponse>> {
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
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  return {
    [Symbol.asyncIterator]: async function* () {
      let buffer = '';
      let chunkId = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                yield {
                  id: parsed.id || `chunk-${chunkId++}`,
                  created: parsed.created || Date.now(),
                  choices: parsed.choices || [{ delta: { content: '' } }],
                };
              } catch (e) {
                // Skip invalid JSON
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}
