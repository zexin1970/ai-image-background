interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const PLAN_LIMITS: Record<string, number> = {
  free: 20,
  pro: 100,
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;

  const url = new URL(request.url);
  const user_id = url.searchParams.get('user_id');

  if (!user_id) {
    return new Response(JSON.stringify({ error: 'user_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const sub = await env.DB.prepare(
      `SELECT plan, credits, expires_at FROM subscriptions WHERE user_id = ?`
    )
      .bind(user_id)
      .first<{ plan: string; credits: number; expires_at: string | null }>();

    const plan = sub?.plan ?? 'free';
    const credits = sub?.credits ?? 0;

    const isProActive =
      plan === 'pro' &&
      sub?.expires_at != null &&
      new Date(sub.expires_at) > new Date();

    const effectivePlan = isProActive ? 'pro' : plan === 'credits' ? 'credits' : 'free';

    const stat = await env.DB.prepare(
      `SELECT count FROM download_stats WHERE user_id = ? AND month = ?`
    )
      .bind(user_id, currentMonth)
      .first<{ count: number }>();

    const used = stat?.count ?? 0;
    const limit = effectivePlan === 'credits' ? null : (PLAN_LIMITS[effectivePlan] ?? 20);

    return new Response(
      JSON.stringify({
        plan: effectivePlan,
        used,
        limit,
        credits: effectivePlan === 'credits' ? credits : null,
        expires_at: isProActive ? sub?.expires_at : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
