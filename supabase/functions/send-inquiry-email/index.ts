import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const row = body.record ?? body.new ?? body;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const toEmail = Deno.env.get("INQUIRY_TO_EMAIL");
    const fromEmail = Deno.env.get("INQUIRY_FROM_EMAIL");

    if (!resendApiKey || !toEmail || !fromEmail) {
      return new Response("Missing required environment variables", { status: 500 });
    }

    const payload = {
      from: fromEmail,
      to: [toEmail],
      subject: "New Contact Inquiry",
      text: [
        `Name: ${row.name ?? ""}`,
        `Email: ${row.email ?? ""}`,
        `Phone: ${row.phone ?? ""}`,
        "",
        "Message:",
        row.message ?? "",
        "",
        `Created at: ${row.created_at ?? ""}`
      ].join("\n")
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!resendResponse.ok) {
      const detail = await resendResponse.text();
      return new Response(`Resend error: ${detail}`, { status: 502 });
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Unhandled error: ${message}`, { status: 500 });
  }
});
