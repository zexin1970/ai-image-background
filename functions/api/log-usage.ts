interface Env {
  DB: D1Database;
}

interface LogUsageRequest {
  user_id: string;
  action: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  
  try {
    const { user_id, action } = await request.json() as LogUsageRequest;
    
    await env.DB.prepare(
      `INSERT INTO usage_logs (user_id, action) VALUES (?, ?)`
    ).bind(user_id, action).run();
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
