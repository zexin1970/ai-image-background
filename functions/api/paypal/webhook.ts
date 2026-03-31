// POST /api/paypal/webhook
// 接收 PayPal Webhook 事件（仅用于一次性支付确认）

interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_SECRET: string;
  PAYPAL_WEBHOOK_ID: string;
}

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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
      };
    };

    console.log("PayPal webhook event:", event.event_type);

    // 目前只处理一次性支付，订阅相关事件已移除
    // 如需记录其他事件，可在此扩展

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}
