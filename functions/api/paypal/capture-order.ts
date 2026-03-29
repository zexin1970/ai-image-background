// POST /api/paypal/capture-order
// 捕获支付、发放积分、发邮件通知
// body: { order_id: string, user_id: string, pack: "20" | "50" }

interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_SECRET: string;
  SENDGRID_API_KEY: string;
  DB: D1Database;
}

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

const PACKS: Record<string, { credits: number; label: string; amount: string }> = {
  "20": { credits: 20, label: "20 Downloads Pack", amount: "$2.90" },
  "50": { credits: 50, label: "50 Downloads Pack", amount: "$5.90" },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function getPayPalToken(clientId: string, secret: string): Promise<string> {
  const res = await fetch(`${SANDBOX_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "noreply@image-bg.shop", name: "AI Background Remover" },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    const { order_id, user_id, pack } = await request.json() as {
      order_id: string;
      user_id: string;
      pack: string;
    };

    const packInfo = PACKS[pack];
    if (!packInfo) {
      return new Response(JSON.stringify({ error: "Invalid pack" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 捕获 PayPal 订单
    const token = await getPayPalToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_SECRET);
    const capture = await fetch(`${SANDBOX_BASE}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await capture.json() as { status: string };
    if (captureData.status !== "COMPLETED") {
      return new Response(JSON.stringify({ error: "Payment not completed", status: captureData.status }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 充值积分（credits 字段累加）
    await env.DB.prepare(`
      INSERT INTO subscriptions (user_id, plan, credits, updated_at)
      VALUES (?, 'credits', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        credits = COALESCE(credits, 0) + ?,
        updated_at = CURRENT_TIMESTAMP
    `).bind(user_id, packInfo.credits, packInfo.credits).run();

    // 查用户邮箱
    const user = await env.DB.prepare(
      `SELECT email, name FROM users WHERE id = ?`
    ).bind(user_id).first<{ email: string; name: string }>();

    // 发邮件通知
    if (user?.email && env.SENDGRID_API_KEY) {
      await sendEmail(
        env.SENDGRID_API_KEY,
        user.email,
        "✅ Payment Successful – Credits Added",
        `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1d4ed8">Payment Successful 🎉</h2>
          <p>Hi ${user.name || "there"},</p>
          <p>Your purchase of <strong>${packInfo.label}</strong> (${packInfo.amount}) has been confirmed.</p>
          <p><strong>${packInfo.credits} download credits</strong> have been added to your account — they never expire.</p>
          <a href="https://image-bg.shop" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1d4ed8;color:white;border-radius:8px;text-decoration:none">
            Start Downloading →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">AI Background Remover · image-bg.shop</p>
        </div>
        `
      );
    }

    return new Response(JSON.stringify({ success: true, credits_added: packInfo.credits }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
