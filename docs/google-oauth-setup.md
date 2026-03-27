# Google OAuth 配置指南（简化版）

## 1. 创建 Google OAuth 凭据

### 访问 Google Cloud Console
1. 打开 https://console.cloud.google.com/
2. 创建新项目或选择现有项目

### 创建 OAuth 客户端 ID
1. 导航到 "APIs & Services" > "Credentials"
2. 点击 "Create Credentials" > "OAuth client ID"
3. 选择 "Web application"
4. 配置：
   - **Name**: AI Background Remover
   - **Authorized JavaScript origins**:
     - http://localhost:3000
     - https://ai-image-background.pages.dev
     - https://image-bg.shop
   - **Authorized redirect URIs**: 留空（使用客户端流程）

5. 点击 "Create"
6. 复制 **Client ID**（不需要 Client Secret）

## 2. 配置环境变量

### 本地开发
更新 `.env` 文件：
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=你的Client ID
```

### 生产环境（Cloudflare Pages）
```bash
wrangler pages secret put NEXT_PUBLIC_GOOGLE_CLIENT_ID --project-name=ai-image-background
# 输入: 你的Client ID
```

## 3. 构建和部署

```bash
npm run build
wrangler pages deploy out --project-name=ai-image-background
```

## 4. 功能说明

- 未登录：显示 Google 登录按钮
- 已登录：显示用户名和 Sign Out 按钮
- 登录后可使用背景移除功能

---

**最后更新**: 2026-03-27
