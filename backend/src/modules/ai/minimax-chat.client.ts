import { env } from "../../config/env.js";
import { AppError } from "../../shared/app-error.js";

type OpenAiStyleChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: { message?: string; code?: string };
};

const minimaxChatCompletionsUrl = (): string => `${env.minimaxOpenAiBaseUrl}/chat/completions`;

export async function callMiniMaxChatCompletion(options: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const response = await fetch(minimaxChatCompletionsUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: options.model.trim(),
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      temperature: options.temperature ?? 0.45,
      max_tokens: options.maxTokens ?? 4096,
    }),
  });

  const rawText = await response.text();
  let data: OpenAiStyleChatResponse;
  try {
    data = JSON.parse(rawText) as OpenAiStyleChatResponse;
  } catch {
    throw new AppError("MiniMax returned non-JSON response", {
      statusCode: 502,
      category: "internal",
      code: "ai.minimax_invalid_response",
      details: { status: response.status, snippet: rawText.slice(0, 200) },
    });
  }

  if (!response.ok) {
    const msg = data.error?.message ?? rawText.slice(0, 300);
    throw new AppError(`MiniMax request failed (${response.status}): ${msg}`, {
      statusCode: 502,
      category: "internal",
      code: "ai.minimax_http_error",
      details: { status: response.status },
    });
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new AppError("MiniMax returned empty content", {
      statusCode: 502,
      category: "internal",
      code: "ai.minimax_empty_content",
    });
  }

  return content;
}
