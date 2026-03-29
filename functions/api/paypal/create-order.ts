// POST /api/paypal/create-order
// 创建一次性积分购买订单
// body: { pack: "20" | "50", user_id: string }

interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_SECRET: string;
  DB: D1Database;
}

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

const PACKS: Record<string, { amount: string; credits: number; label: string }> = {
  "20": { amount: "2.90", credits: 20, label: "20 Downloads Pack" },
  "50": { amount: "5.90", credits: 50, label: "50 Downloads Pack" },
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

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    const { pack, user_id } = await request.json() as { pack: string; user_id: string };

    const packInfo = PACKS[pack];
    if (!packInfo) {
      return new Response(JSON.stringify({ error: "Invalid pack" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getPayPalToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_SECRET);

    const order = await fetch(`${SANDBOX_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: packInfo.amount,
            },
            description: packInfo.label,
            custom_id: JSON.stringify({ user_id, pack }),
          },
        ],
        application_context: {
          brand_name: "AI Background Remover",
          user_action: "PAY_NOW",
        },
      }),
    });

    const orderData = await order.json() as { id: string; status: string };

    return new Response(JSON.stringify({ order_id: orderData.id }), {
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
