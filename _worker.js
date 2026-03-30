import worker from './worker.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // API 路由交给 worker 处理
    if (url.pathname.startsWith('/api/')) {
      return worker.fetch(request, env, ctx);
    }
    
    // 静态资源从 /out 目录提供
    return env.ASSETS.fetch(request);
  }
};
