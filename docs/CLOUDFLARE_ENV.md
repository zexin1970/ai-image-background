# Cloudflare Pages 环境变量配置

## 必需的环境变量

在 Cloudflare Pages 项目设置中添加以下环境变量：

### PayPal 配置
```
PAYPAL_CLIENT_ID=你的PayPal客户端ID
PAYPAL_SECRET=你的PayPal密钥
```

### 数据库绑定
D1 数据库已在 wrangler.toml 中配置，确保数据库 ID 正确。

## 配置步骤

1. 登录 Cloudflare Dashboard
2. 进入 Pages 项目 > Settings > Environment variables
3. 添加上述环境变量（Production 和 Preview 都要配置）
4. 重新部署项目

## 获取 PayPal 凭证

1. 访问 https://developer.paypal.com/
2. 登录后进入 Dashboard > Apps & Credentials
3. 在 Sandbox 标签下创建应用
4. 复制 Client ID 和 Secret

## 验证部署

部署完成后访问：
- https://你的域名/api/paypal/create-order （应返回 405 Method Not Allowed，说明路由存在）
