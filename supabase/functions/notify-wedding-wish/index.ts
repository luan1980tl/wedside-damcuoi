const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WISH_WEBHOOK_SECRET = Deno.env.get("WISH_WEBHOOK_SECRET");

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!WISH_WEBHOOK_SECRET || request.headers.get("x-wish-webhook-secret") !== WISH_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return new Response("Email service is not configured", { status: 503 });
  }

  try {
    const payload = await request.json();
    const wish = payload?.record;
    if (
      payload?.type !== "INSERT" ||
      typeof wish?.name !== "string" ||
      typeof wish?.message !== "string"
    ) {
      return new Response("Invalid webhook payload", { status: 400 });
    }

    const safeName = wish.name.slice(0, 50);
    const safeMessage = wish.message.slice(0, 300);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Album cưới <onboarding@resend.dev>",
        to: ["luan1980tl@gmail.com"],
        subject: `Lời chúc mới từ ${safeName}`,
        text: `Anh vừa nhận được một lời chúc mới trên website đám cưới.\n\nNgười gửi: ${safeName}\n\nLời chúc:\n${safeMessage}`,
      }),
    });

    if (!response.ok) {
      console.error("Resend rejected notification", response.status, await response.text());
      return new Response("Email provider rejected the request", { status: 502 });
    }

    return new Response("Notification sent", { status: 200 });
  } catch (error) {
    console.error("Unable to process wish notification", error);
    return new Response("Invalid request", { status: 400 });
  }
});
