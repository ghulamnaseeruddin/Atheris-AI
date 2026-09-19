/**
 * Atheris AI Model Router
 * ------------------------------------------------------------------
 * Public model ids are opaque ("atheris-3f9a2b") and resolved against
 * the live catalog in lib/model-catalog.ts. Real provider/model names
 * are never sent to the client, logged where the client can read them,
 * or included in error messages.
 *
 * If the requested model's provider errors (rate limit, downtime), the
 * router falls back to the balanced-tier model on the OTHER provider,
 * so a single provider outage doesn't take the whole app down.
 */

import { getModelCatalog, resolveModel, getDefaultModelId } from "./model-catalog";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  /** Base64 data URIs (e.g. "data:image/png;base64,...") — vision only. */
  images?: string[];
}

async function callGroq(model: string, messages: ChatMessage[]): Promise<Response> {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    }),
  });
}

async function callGemini(model: string, messages: ChatMessage[]): Promise<Response> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      const parts: Record<string, unknown>[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const img of m.images ?? []) {
        const match = img.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
          parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });

  const systemInstruction = messages.find((m) => m.role === "system")?.content;

  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(systemInstruction && {
          systemInstruction: { parts: [{ text: systemInstruction }] },
        }),
      }),
    }
  );
}

async function callProvider(
  provider: "groq" | "gemini",
  realModel: string,
  messages: ChatMessage[]
): Promise<Response> {
  return provider === "groq" ? callGroq(realModel, messages) : callGemini(realModel, messages);
}

/**
 * Routes a chat request to the requested public model id. Falls back to
 * the balanced-tier model on the other provider if the first choice
 * errors, so the user gets an answer even if one provider is down.
 */
export async function routeChat(
  publicModelId: string,
  messages: ChatMessage[]
): Promise<{ response: Response; provider: "groq" | "gemini" }> {
  const resolved = (await resolveModel(publicModelId)) ?? (await resolveModel(await getDefaultModelId()));
  if (!resolved) {
    throw new Error("Atheris couldn't find an available model right now.");
  }

  let lastError: unknown;
  try {
    const res = await callProvider(resolved.provider, resolved.realModel, messages);
    if (res.ok) return { response: res, provider: resolved.provider };
    lastError = new Error(`Upstream ${resolved.provider} responded ${res.status}`);
  } catch (err) {
    lastError = err;
  }

  // Fallback: balanced-tier model on the OTHER provider.
  const catalog = await getModelCatalog();
  const fallback = catalog.find(
    (e) => e.provider !== resolved.provider && e.tier === "balanced"
  ) ?? catalog.find((e) => e.provider !== resolved.provider);

  if (fallback) {
    try {
      const res = await callProvider(fallback.provider, fallback.realModel, messages);
      if (res.ok) return { response: res, provider: fallback.provider };
      lastError = new Error(`Upstream ${fallback.provider} responded ${res.status}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Atheris is temporarily unavailable for this request. (${
      lastError instanceof Error ? lastError.message : "unknown error"
    })`
  );
}
