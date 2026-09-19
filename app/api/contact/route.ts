import { NextRequest } from "next/server";

export const runtime = "nodejs";

// Where contact form submissions are sent. Change if you use a different inbox.
const CONTACT_RECIPIENT = "ghulamnaseeruddin555@gmail.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, phone, email, message } = await req.json();

    if (!firstName || !lastName || !email || !message) {
      return Response.json(
        { error: "First name, last name, email, and message are required." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("[/api/contact] RESEND_API_KEY not configured.");
      return Response.json(
        { error: "Contact form isn't configured yet. Please email directly instead." },
        { status: 501 }
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Atheris AI Contact Form <onboarding@resend.dev>",
        to: [CONTACT_RECIPIENT],
        reply_to: email,
        subject: `Atheris AI contact form — ${firstName} ${lastName}`,
        html: `
          <h2>New contact form submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
        `,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[/api/contact] Resend error:", res.status, errBody);
      return Response.json(
        { error: "Couldn't send your message right now. Please try again shortly." },
        { status: 502 }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[/api/contact] error:", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
