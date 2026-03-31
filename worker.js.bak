export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 处理 CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
        },
      });
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

        // 游客返回低清预览图，登录用户返回高清
        const userId = request.headers.get('X-User-Id');
        const size = userId ? 'auto' : 'preview';

        const removeBgFormData = new FormData();
        removeBgFormData.append('image_file', file);
        removeBgFormData.append('size', size);

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: {
            'X-Api-Key': env.REMOVEBG_API_KEY,
          },
          body: removeBgFormData,
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error('remove.bg error:', response.status, errText);
          return new Response(JSON.stringify({ error: 'Failed to process image' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(response.body, {
          headers: {
            'Content-Type': 'image/png',
            'Access-Control-Allow-Origin': '*',
            // 告知前端当前返回的质量类型
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
