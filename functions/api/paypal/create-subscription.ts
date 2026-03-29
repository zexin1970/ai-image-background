// POST /api/paypal/create-subscription
// 创建 Pro 月度订阅
// body: { user_id: string }

interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_SECRET: string;
  PAYPAL_PRO_PLAN_ID: string;
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

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    const { user_id } = await request.json() as { user_id: string };

    const token = await getPayPalToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_SECRET);

    const subscription = await fetch(`${SANDBOX_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: env.PAYPAL_PRO_PLAN_ID,
        custom_id: user_id,
        application_context: {
          brand_name: "AI Background Remover",
          user_action: "SUBSCRIBE_NOW",
          return_url: "https://image-bg.shop/pricing?sub=success",
          cancel_url: "https://image-bg.shop/pricing?sub=cancel",
        },
      }),
    });

    const subData = await subscription.json() as {
      id: string;
      status: string;
      links: Array<{ rel: string; href: string }>;
    };

    // 找到 PayPal 审批页面链接
    const approveLink = subData.links?.find((l) => l.rel === "approve")?.href;

    return new Response(JSON.stringify({ subscription_id: subData.id, approve_url: approveLink }), {
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
