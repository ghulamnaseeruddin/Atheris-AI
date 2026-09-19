import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkAndDeductImageCredit } from "@/lib/credits";
import { generateImage, isPromptBlocked } from "@/lib/image-router";

export const runtime = "edge";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("generated_images")
    .select("id, prompt, image_data, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ error: "Couldn't load image history." }, { status: 500 });
  }

  return Response.json({ images: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Please sign in to generate images." }, { status: 401 });
    }

    const { prompt } = await req.json();
    if (typeof prompt !== "string" || !prompt.trim()) {
      return Response.json({ error: "Please enter a prompt." }, { status: 400 });
    }

    if (isPromptBlocked(prompt)) {
      return Response.json(
        { error: "That prompt isn't allowed. Please try something else." },
        { status: 400 }
      );
    }

    const creditCheck = await checkAndDeductImageCredit(supabase, user.id);
    if (!creditCheck.allowed) {
      return Response.json(
        { error: creditCheck.reason ?? "You're out of credits for this period." },
        { status: 402 }
      );
    }

    const result = await generateImage(prompt);

    if (result.blockedByProvider) {
      return Response.json(
        { error: "That image couldn't be generated — try a different prompt." },
        { status: 400 }
      );
    }

    // Save to the user's image history (non-blocking on failure).
    await supabase.from("generated_images").insert({
      user_id: user.id,
      prompt,
      image_data: result.imageDataUri,
    });

    return Response.json({ image: result.imageDataUri });
  } catch (err) {
    console.error("[/api/generate-image] error:", err);
    return Response.json(
      { error: "Atheris Image couldn't complete that request. Please try again." },
      { status: 500 }
    );
  }
}
