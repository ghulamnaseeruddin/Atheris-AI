import { NextRequest } from "next/server";
import { routeChat, ChatMessage } from "@/lib/ai-router";
import { getDefaultModelId, getVisionModelId } from "@/lib/model-catalog";
import { normalizeStream } from "@/lib/stream-normalizer";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkAndDeductCredit } from "@/lib/credits";
import { appendMessage, renameConversation, deriveTitle } from "@/lib/conversations";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Please sign in to chat with Atheris." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const messages: ChatMessage[] = body.messages ?? [];
    const conversationId: string | undefined = body.conversationId;
    const isFirstMessage: boolean = body.isFirstMessage ?? false;
    // Optional section-specific system prompt (Coding / Daily Life / Business).
    const systemPrompt: string | undefined = body.systemPrompt;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No message provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const hasImages = messages.some((m) => m.images && m.images.length > 0);
    // If any message carries an image, route through a vision-capable
    // model regardless of what was selected, so uploads never silently
    // fail against a model that can't read them.
    const modelId: string = hasImages
      ? await getVisionModelId()
      : body.model || (await getDefaultModelId());

    // Enforce credit/rate limits before calling any upstream provider.
    const creditCheck = await checkAndDeductCredit(supabase, user.id, modelId);
    if (!creditCheck.allowed) {
      return new Response(
        JSON.stringify({ error: creditCheck.reason ?? "You're out of credits for this period." }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    const lastUserMessage = messages[messages.length - 1];

    // Persist the user's message (and auto-title the conversation on turn 1).
    if (conversationId && lastUserMessage?.role === "user") {
      await appendMessage(
        supabase,
        conversationId,
        "user",
        lastUserMessage.content,
        undefined,
        lastUserMessage.images
      );
      if (isFirstMessage) {
        await renameConversation(supabase, conversationId, deriveTitle(lastUserMessage.content));
      }
    }

    const messagesWithSystem: ChatMessage[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const { response, provider } = await routeChat(modelId, messagesWithSystem);

    if (!response.body) {
      throw new Error("Empty response from upstream provider.");
    }

    const normalized = normalizeStream(response.body, provider);

    // Tap the stream: forward chunks to the client while accumulating the
    // full assistant reply to save once streaming finishes.
    let fullReply = "";
    const decoder = new TextDecoder();
    const tap = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        fullReply += decoder.decode(chunk, { stream: true });
        controller.enqueue(chunk);
      },
      async flush() {
        if (conversationId && fullReply.trim()) {
          try {
            await appendMessage(supabase, conversationId, "assistant", fullReply, modelId);
          } catch (err) {
            console.error("[/api/chat] failed to persist assistant reply:", err);
          }
        }
      },
    });

    const stream = normalized.pipeThrough(tap);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Atheris-Model": modelId, // opaque id only — never the real provider
      },
    });
  } catch (err) {
    console.error("[/api/chat] error:", err);
    return new Response(
      JSON.stringify({
        error: "Atheris couldn't complete that request. Please try again in a moment.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
