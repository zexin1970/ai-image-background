// POST /api/paypal/webhook
// 接收 PayPal Webhook 事件（订阅激活、续费、取消）

interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_SECRET: string;
  PAYPAL_WEBHOOK_ID: string;
  SENDGRID_API_KEY: string;
  DB: D1Database;
}

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

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
    const body = await request.text();
    const event = JSON.parse(body) as {
      event_type: string;
      resource: {
        id: string;
        custom_id?: string;
        status?: string;
        billing_info?: { next_billing_time?: string };
      };
    };

    const eventType = event.event_type;
    const resource = event.resource;
    const userId = resource.custom_id;

    if (!userId) {
      return new Response("OK", { status: 200 });
    }

    // 查用户信息
    const user = await env.DB.prepare(
      `SELECT email, name FROM users WHERE id = ?`
    ).bind(userId).first<{ email: string; name: string }>();

    if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
      // 订阅激活 → 写入 pro 套餐，设置到期时间（1个月后）
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await env.DB.prepare(`
        INSERT INTO subscriptions (user_id, plan, credits, expires_at, updated_at)
        VALUES (?, 'pro', 0, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          plan = 'pro',
          expires_at = ?,
          updated_at = CURRENT_TIMESTAMP
      `).bind(userId, expiresAt.toISOString(), expiresAt.toISOString()).run();

      // 发订阅成功邮件
      if (user?.email && env.SENDGRID_API_KEY) {
        await sendEmail(
          env.SENDGRID_API_KEY,
          user.email,
          "🎉 Pro Subscription Activated",
          `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#7c3aed">Pro Subscription Active 🚀</h2>
            <p>Hi ${user.name || "there"},</p>
            <p>Your <strong>Pro plan</strong> is now active!</p>
            <ul>
              <li>100 HD downloads per month</li>
              <li>No watermark</li>
              <li>Renews automatically each month</li>
            </ul>
            <a href="https://image-bg.shop" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none">
              Start Downloading →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">AI Background Remover · image-bg.shop</p>
          </div>
          `
        );
      }
    } else if (eventType === "BILLING.SUBSCRIPTION.RENEWED") {
      // 续费 → 更新到期时间
      const nextBilling = resource.billing_info?.next_billing_time;
      const expiresAt = nextBilling ? new Date(nextBilling) : (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d;
      })();

      await env.DB.prepare(`
        UPDATE subscriptions SET expires_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(expiresAt.toISOString(), userId).run();

    } else if (
      eventType === "BILLING.SUBSCRIPTION.CANCELLED" ||
      eventType === "BILLING.SUBSCRIPTION.EXPIRED"
    ) {
      // 取消/到期 → 降为 free
      await env.DB.prepare(`
        UPDATE subscriptions SET plan = 'free', expires_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(userId).run();

      if (user?.email && env.SENDGRID_API_KEY) {
        await sendEmail(
          env.SENDGRID_API_KEY,
          user.email,
          "Your Pro subscription has ended",
          `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#374151">Subscription Ended</h2>
            <p>Hi ${user.name || "there"},</p>
            <p>Your Pro subscription has been cancelled. You've been switched back to the Free plan.</p>
            <p>Your data is safe. You can resubscribe anytime.</p>
            <a href="https://image-bg.shop/pricing" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1d4ed8;color:white;border-radius:8px;text-decoration:none">
              View Plans →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">AI Background Remover · image-bg.shop</p>
          </div>
          `
        );
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}
