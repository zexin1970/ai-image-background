export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/remove-bg' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('image');
        
        if (!file) {
          return new Response(JSON.stringify({ error: 'No image provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const removeBgFormData = new FormData();
        removeBgFormData.append('image_file', file);
        removeBgFormData.append('size', 'auto');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: {
            'X-Api-Key': env.REMOVEBG_API_KEY,
          },
          body: removeBgFormData,
        });

        if (!response.ok) {
          return new Response(JSON.stringify({ error: 'Failed to process image' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(response.body, {
          headers: {
            'Content-Type': 'image/png',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
