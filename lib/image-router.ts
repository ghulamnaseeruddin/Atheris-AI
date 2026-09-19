/**
 * Atheris image generation — routes through Gemini's image-generation model.
 * Public brand name: "Atheris Image". Real model id never exposed to client.
 */

const IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";

// Basic prompt-level moderation prefilter. This is a first line of defense,
// not a complete solution — always pair with output-side review for a real
// production launch (e.g. Google's Safety Ratings on the response, or a
// dedicated moderation API).
const BLOCKED_PATTERNS: RegExp[] = [
  /\b(child|minor|kid)s?\b.{0,30}\b(nude|naked|sex|porn)/i,
  /\b(nude|naked|nsfw|explicit)\b.{0,20}\b(child|minor|kid)s?\b/i,
  /\bcsam\b/i,
];

export function isPromptBlocked(prompt: string): boolean {
  return BLOCKED_PATTERNS.some((re) => re.test(prompt));
}

export interface GeneratedImageResult {
  imageDataUri: string;
  blockedByProvider: boolean;
}

export async function generateImage(prompt: string): Promise<GeneratedImageResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Atheris Image couldn't generate that (upstream ${res.status}). ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];

  // Provider-side safety block (finishReason "SAFETY" or similar)
  if (candidate?.finishReason && candidate.finishReason !== "STOP") {
    return { imageDataUri: "", blockedByProvider: true };
  }

  const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);
  if (!imagePart) {
    throw new Error("Atheris Image didn't return an image for that prompt. Try rephrasing it.");
  }

  const { mimeType, data: base64 } = imagePart.inlineData;
  return { imageDataUri: `data:${mimeType};base64,${base64}`, blockedByProvider: false };
}
