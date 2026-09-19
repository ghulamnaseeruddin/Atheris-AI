/**
 * Atheris Model Catalog
 * ------------------------------------------------------------------
 * Instead of a hardcoded list (which goes stale as providers add/remove
 * free models), this queries Groq's and Gemini's live model-list
 * endpoints, filters to usable chat models, classifies each by real
 * capability (size/context/vision), and assigns an Atheris-branded name.
 *
 * The client only ever receives { id, name, description, vision }.
 * The id is an opaque short hash — never the real provider or model
 * name — but is deterministically recomputed server-side from the same
 * live list, so no database or cross-request cache is required.
 */

export interface CatalogEntry {
  id: string; // opaque, e.g. "atheris-3f9a2b"
  name: string; // public brand name, e.g. "Atheris Pro"
  description: string;
  provider: "groq" | "gemini";
  realModel: string; // NEVER sent to the client
  vision: boolean;
  tier: "lite" | "balanced" | "pro" | "vision" | "coder";
}

// Deterministic, edge-runtime-safe hash (Node's `crypto` module isn't
// available in the Edge runtime, and this file is imported by edge chat/
// image routes). Doesn't need to be cryptographically secure — just
// stable and opaque.
function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function makeId(provider: string, realModel: string): string {
  return "atheris-" + fnv1aHash(`${provider}:${realModel}`);
}

// Simple module-level cache to avoid re-fetching provider model lists on
// every request within the same warm serverless instance. Best-effort —
// a cold start just re-fetches, which is fine.
let cachedCatalog: { entries: CatalogEntry[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchGroqModels(): Promise<CatalogEntry[]> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const models: { id: string; context_window?: number }[] = data.data ?? [];

    const entries: CatalogEntry[] = [];
    for (const m of models) {
      const id = m.id;
      // Skip non-chat models (audio/whisper/tts/guard/moderation models)
      if (/whisper|tts|guard|moderation|prompt-guard/i.test(id)) continue;

      const lower = id.toLowerCase();
      let tier: CatalogEntry["tier"] = "balanced";
      if (/coder|coding/.test(lower)) tier = "coder";
      else if (/70b|72b|405b|120b|480b|235b|maverick/.test(lower)) tier = "pro";
      else if (/8b|9b|instant|lite|1b|3b/.test(lower)) tier = "lite";

      entries.push({
        id: makeId("groq", id),
        name: "", // assigned after grouping, see assignNames
        description: "",
        provider: "groq",
        realModel: id,
        vision: /vision|scout|maverick/.test(lower),
        tier,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

async function fetchGeminiModels(): Promise<CatalogEntry[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const models: { name: string; supportedGenerationMethods?: string[] }[] = data.models ?? [];

    const entries: CatalogEntry[] = [];
    for (const m of models) {
      if (!m.supportedGenerationMethods?.includes("generateContent")) continue;
      const id = m.name.replace(/^models\//, "");
      const lower = id.toLowerCase();

      // Skip embedding/imagen/audio-only/legacy models — chat only here.
      if (/embedding|aqa|imagen|tts|gecko/.test(lower)) continue;
      // Pro models are paid-only as of April 2026 — skip so we never
      // offer a tier that will fail for a free-tier key.
      if (/pro/.test(lower) && !/flash/.test(lower)) continue;

      let tier: CatalogEntry["tier"] = "balanced";
      if (/lite/.test(lower)) tier = "lite";
      else if (/2\.5|3\.|thinking/.test(lower)) tier = "pro"; // best available free reasoning

      entries.push({
        id: makeId("gemini", id),
        name: "",
        description: "",
        provider: "gemini",
        realModel: id,
        vision: true, // all current Gemini generateContent models accept image input
        tier,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

function assignNames(entries: CatalogEntry[]): CatalogEntry[] {
  // Dedupe by realModel+provider, prefer the newest-looking id (longer/
  // higher version numbers tend to sort later lexicographically for
  // same-family names; good enough heuristic here).
  const seen = new Map<string, CatalogEntry>();
  for (const e of entries) seen.set(`${e.provider}:${e.realModel}`, e);
  const unique = [...seen.values()];

  const tierLabel: Record<CatalogEntry["tier"], string> = {
    lite: "Atheris Lite",
    balanced: "Atheris",
    pro: "Atheris Pro",
    vision: "Atheris Vision",
    coder: "Atheris Coder",
  };
  const tierDesc: Record<CatalogEntry["tier"], string> = {
    lite: "Fastest responses — great for quick questions and everyday chat.",
    balanced: "Solid all-rounder for most conversations and tasks.",
    pro: "Strongest reasoning — best for complex or multi-step problems.",
    vision: "Understands images alongside text.",
    coder: "Tuned for writing and reviewing code.",
  };

  // Group by tier so duplicates within a tier get numbered (Lite, Lite 2...)
  const byTier = new Map<string, CatalogEntry[]>();
  for (const e of unique) {
    const list = byTier.get(e.tier) ?? [];
    list.push(e);
    byTier.set(e.tier, list);
  }

  const named: CatalogEntry[] = [];
  for (const [tier, list] of byTier) {
    list.forEach((e, i) => {
      const base = tierLabel[e.tier as CatalogEntry["tier"]];
      e.name = list.length > 1 ? `${base} ${i + 1}` : base;
      e.description = tierDesc[e.tier as CatalogEntry["tier"]];
      named.push(e);
    });
  }

  // Sort for a sensible display order: lite, balanced, pro, coder, vision
  const order: CatalogEntry["tier"][] = ["lite", "balanced", "pro", "coder", "vision"];
  named.sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier));
  return named;
}

// Small built-in fallback in case both live fetches fail (e.g. keys not
// yet configured) — keeps the app usable rather than showing an empty
// model list. Uses widely-stable model ids as of this writing.
const FALLBACK: CatalogEntry[] = [
  { id: makeId("groq", "llama-3.1-8b-instant"), name: "Atheris Lite", description: "Fastest responses.", provider: "groq", realModel: "llama-3.1-8b-instant", vision: false, tier: "lite" },
  { id: makeId("groq", "llama-3.3-70b-versatile"), name: "Atheris Pro", description: "Strongest reasoning.", provider: "groq", realModel: "llama-3.3-70b-versatile", vision: false, tier: "pro" },
  { id: makeId("gemini", "gemini-2.0-flash"), name: "Atheris Vision", description: "Understands images.", provider: "gemini", realModel: "gemini-2.0-flash", vision: true, tier: "vision" },
];

export async function getModelCatalog(): Promise<CatalogEntry[]> {
  if (cachedCatalog && Date.now() - cachedCatalog.fetchedAt < CACHE_TTL_MS) {
    return cachedCatalog.entries;
  }

  const [groq, gemini] = await Promise.all([fetchGroqModels(), fetchGeminiModels()]);
  let entries = assignNames([...groq, ...gemini]);
  if (entries.length === 0) entries = FALLBACK;

  cachedCatalog = { entries, fetchedAt: Date.now() };
  return entries;
}

export async function resolveModel(
  publicId: string
): Promise<{ provider: "groq" | "gemini"; realModel: string; vision: boolean } | null> {
  const catalog = await getModelCatalog();
  const match = catalog.find((e) => e.id === publicId);
  if (!match) return null;
  return { provider: match.provider, realModel: match.realModel, vision: match.vision };
}

/** The default model to use when the client doesn't specify one. */
export async function getDefaultModelId(): Promise<string> {
  const catalog = await getModelCatalog();
  const balanced = catalog.find((e) => e.tier === "balanced") ?? catalog[0];
  return balanced.id;
}

/** Finds the best vision-capable model — used to auto-route image uploads. */
export async function getVisionModelId(): Promise<string> {
  const catalog = await getModelCatalog();
  const vision = catalog.find((e) => e.vision) ?? catalog[0];
  return vision.id;
}
