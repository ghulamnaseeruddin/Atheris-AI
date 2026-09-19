import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkAndDeductDocumentCredit } from "@/lib/credits";
import { draftContent, buildDocument, DocType } from "@/lib/document-generator";

// NOT edge — docx/pptx/xlsx/pdf-lib need Node APIs (Buffer, etc.)
export const runtime = "nodejs";
// Vercel Hobby defaults to 10s; this route does an AI call + file render,
// which can run long. 60s is the max Hobby allows without upgrading to Pro.
export const maxDuration = 60;

const VALID_TYPES: DocType[] = ["docx", "pptx", "xlsx", "pdf"];

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Please sign in to generate documents." }, { status: 401 });
    }

    const { topic, docType } = await req.json();

    if (typeof topic !== "string" || !topic.trim()) {
      return Response.json({ error: "Please describe what the document should cover." }, { status: 400 });
    }
    if (!VALID_TYPES.includes(docType)) {
      return Response.json({ error: "Unsupported document type." }, { status: 400 });
    }

    const creditCheck = await checkAndDeductDocumentCredit(supabase, user.id);
    if (!creditCheck.allowed) {
      return Response.json(
        { error: creditCheck.reason ?? "You're out of credits for this period." },
        { status: 402 }
      );
    }

    const { title, sections } = await draftContent(topic.trim(), docType as DocType);
    const { buffer, mimeType, extension } = await buildDocument(docType as DocType, title, sections);

    const safeName = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60) || "atheris-document";

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${safeName}.${extension}"`,
      },
    });
  } catch (err) {
    console.error("[/api/generate-document] error:", err);
    return Response.json(
      { error: "Atheris couldn't generate that document. Please try again." },
      { status: 500 }
    );
  }
}
