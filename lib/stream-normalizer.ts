/**
 * Normalizes provider-specific SSE streams (Groq = OpenAI-compatible,
 * Gemini = its own SSE shape) into one plain text token stream the
 * client can read identically regardless of which real backend answered.
 */

export function normalizeStream(
  upstream: ReadableStream<Uint8Array>,
  provider: "groq" | "gemini"
): ReadableStream<Uint8Array> {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.replace(/^data:\s*/, "");
        if (data === "[DONE]") continue;

        try {
          const json = JSON.parse(data);
          let token = "";

          if (provider === "groq") {
            token = json.choices?.[0]?.delta?.content ?? "";
          } else {
            token = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          }

          if (token) controller.enqueue(encoder.encode(token));
        } catch {
          // Skip malformed/partial SSE chunks silently — never leak
          // raw provider payloads to the client.
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}
