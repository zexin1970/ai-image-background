interface Env {
  DB: D1Database;
}

interface DownloadRequest {
  user_id: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 各套餐月度下载上限
const PLAN_LIMITS: Record<string, number> = {
  free: 20,
  pro: 100,
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    const { user_id } = (await request.json()) as DownloadRequest;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // '2026-03'

    // 查订阅套餐
    const sub = await env.DB.prepare(
      `SELECT plan, credits, expires_at FROM subscriptions WHERE user_id = ?`
    )
      .bind(user_id)
      .first<{ plan: string; credits: number; expires_at: string | null }>();

    const plan = sub?.plan ?? 'free';
    const credits = sub?.credits ?? 0;

    // Pro 套餐检查是否在有效期内
    const isProActive =
      plan === 'pro' &&
      sub?.expires_at != null &&
      new Date(sub.expires_at) > new Date();

    // Credits 套餐：直接扣减
    if (plan === 'credits' || credits > 0) {
      if (credits <= 0) {
        return new Response(
          JSON.stringify({
            error: 'quota_exceeded',
            message: 'No credits remaining',
            plan: 'credits',
          }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      await env.DB.prepare(
        `UPDATE subscriptions SET credits = credits - 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
      )
        .bind(user_id)
        .run();

      await incrementDownloadStat(env, user_id, currentMonth);

      return new Response(
        JSON.stringify({ success: true, plan: 'credits', credits_remaining: credits - 1 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pro / Free 套餐：检查月度次数
    const effectivePlan = isProActive ? 'pro' : 'free';
    const limit = PLAN_LIMITS[effectivePlan];

    const stat = await env.DB.prepare(
      `SELECT count FROM download_stats WHERE user_id = ? AND month = ?`
    )
      .bind(user_id, currentMonth)
      .first<{ count: number }>();

    const usedCount = stat?.count ?? 0;

    if (usedCount >= limit) {
      return new Response(
        JSON.stringify({
          error: 'quota_exceeded',
          message: `Monthly limit reached (${usedCount}/${limit})`,
          plan: effectivePlan,
          used: usedCount,
          limit,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await incrementDownloadStat(env, user_id, currentMonth);

    return new Response(
      JSON.stringify({
        success: true,
        plan: effectivePlan,
        used: usedCount + 1,
        limit,
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

async function incrementDownloadStat(env: Env, user_id: string, month: string) {
  await env.DB.prepare(
    `INSERT INTO download_stats (user_id, month, count)
     VALUES (?, ?, 1)
     ON CONFLICT(user_id, month) DO UPDATE SET count = count + 1`
  )
    .bind(user_id, month)
    .run();
}
