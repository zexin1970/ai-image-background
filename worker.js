const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

const PACKS = {
  "20": { amount: "2.90", credits: 20, label: "20 Downloads Pack" },
  "50": { amount: "5.90", credits: 50, label: "50 Downloads Pack" },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
};

async function getPayPalToken(clientId, secret) {
  const res = await fetch(`${SANDBOX_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

async function handleCreateOrder(request, env) {
  try {
    const { pack, user_id } = await request.json();
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
        purchase_units: [{
          amount: {
            currency_code: "USD",
            value: packInfo.amount,
          },
          description: packInfo.label,
          custom_id: JSON.stringify({ user_id, pack }),
        }],
      }),
    });

    const orderData = await order.json();
    return new Response(JSON.stringify({ order_id: orderData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function handleCaptureOrder(request, env) {
  try {
    const { order_id, user_id, pack } = await request.json();
    const token = await getPayPalToken(env.PAYPAL_CLIENT_ID, env.PAYPAL_SECRET);

    const capture = await fetch(`${SANDBOX_BASE}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await capture.json();
    
    if (captureData.status === 'COMPLETED') {
      const packInfo = PACKS[pack];
      await env.DB.prepare(
        `INSERT INTO subscriptions (user_id, plan, credits) VALUES (?, 'credits', ?)
         ON CONFLICT(user_id) DO UPDATE SET credits = credits + ?, updated_at = CURRENT_TIMESTAMP`
      ).bind(user_id, packInfo.credits, packInfo.credits).run();

      return new Response(JSON.stringify({ success: true, credits_added: packInfo.credits }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Payment not completed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/api/paypal/create-order' && request.method === 'POST') {
      return handleCreateOrder(request, env);
    }

    if (url.pathname === '/api/paypal/capture-order' && request.method === 'POST') {
      return handleCaptureOrder(request, env);
    }

    if (url.pathname === '/api/remove-bg' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('image');

        if (!file) {
          return new Response(JSON.stringify({ error: 'No image provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const userId = request.headers.get('X-User-Id');
        const size = userId ? 'auto' : 'preview';

        const removeBgFormData = new FormData();
        removeBgFormData.append('image_file', file);
        removeBgFormData.append('size', size);

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': env.REMOVEBG_API_KEY },
          body: removeBgFormData,
        });

        if (!response.ok) {
          return new Response(JSON.stringify({ error: 'Failed to process image' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(response.body, {
          headers: {
            'Content-Type': 'image/png',
            'Access-Control-Allow-Origin': '*',
            'X-Image-Quality': size === 'auto' ? 'hd' : 'preview',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
