# AI Image Background 项目 - PayPal 支付集成复盘

**日期：** 2026-03-30  
**项目：** AI Image Background Remover  
**任务：** 集成 PayPal 支付功能

---

## 一、已完成的任务

### 1. 数据库设计
- ✅ 新增 `orders` 表用于记录支付订单
- ✅ 更新 `subscriptions` 表支持 credits 和 pro 套餐

### 2. 后端 API 开发
- ✅ `/api/paypal/create-order` - 创建 PayPal 订单
- ✅ `/api/paypal/capture-order` - 捕获支付并更新用户额度
- ✅ 集成到 `worker.js` 统一处理 API 请求

### 3. 前端集成
- ✅ Pricing 页面集成 PayPal SDK
- ✅ 支持 Credits 一次性购买（$2.9/20次，$5.9/50次）
- ✅ 支持 Pro 月订阅（$9.9/月，100次）
- ✅ 支付成功后自动跳转首页
- ✅ 首页显示剩余 credits

### 4. 部署配置
- ✅ 配置 Cloudflare Pages Advanced mode
- ✅ 添加 `_worker.js` 路由处理
- ✅ 添加 `_routes.json` 明确 API 路由规则
- ✅ 配置环境变量（PAYPAL_CLIENT_ID, PAYPAL_SECRET）

### 5. 文档编写
- ✅ `docs/PAYPAL_SETUP.md` - PayPal 配置指南
- ✅ `docs/CLOUDFLARE_ENV.md` - Cloudflare 环境变量配置
- ✅ `docs/PAYPAL_SANDBOX_ACCOUNTS.md` - 沙箱测试账号说明
- ✅ `docs/DEPLOYMENT.md` - 部署清单

---

## 二、遇到的问题与解决方案

### 问题 1：点击支付按钮无响应
**现象：** 用户点击"支付"按钮后没有任何反应

**原因：** 
- PayPal SDK 加载失败
- 前端代码缺少错误处理

**解决方案：**
- 添加 SDK 加载成功/失败的日志
- 添加按钮渲染的 try-catch 错误捕获
- 添加详细的控制台日志便于调试

**相关提交：** `fix: add error handling and debug logs for PayPal buttons`

---

### 问题 2：PayPal SDK 报错 "No such property: subscription"
**现象：** 控制台报错 `Failed to render Credits button: Error: No such property: subscription`

**原因：** 
- PayPal SDK 加载时使用了 `intent=subscription` 参数
- Credits 按钮使用的是一次性支付（createOrder），不支持 subscription

**解决方案：**
- 移除 SDK URL 中的 `intent` 参数
- 使用默认模式同时支持一次性支付和订阅

**相关提交：** `fix: remove vault and intent params from PayPal SDK`

---

### 问题 3：订阅按钮报错 "Must pass vault=true"
**现象：** Pro 订阅按钮报错 `Must pass vault=true to sdk to use createSubscription`

**原因：** 
- 订阅功能需要 `vault=true` 参数

**解决方案：**
- 恢复 `vault=true` 参数
- 保持默认 intent 以同时支持两种支付方式

**相关提交：** `fix: add vault=true for subscription support`

---

### 问题 4：沙箱账号无法支付
**现象：** 登录 PayPal 后提示"这是卖家账号，不能支付"

**原因：** 
- 使用了 BUSINESS 类型的卖家测试账号

**解决方案：**
- 创建文档说明如何获取 PERSONAL 类型的买家测试账号
- 在 PayPal Developer Dashboard > Sandbox > Accounts 中查看

**相关文档：** `docs/PAYPAL_SANDBOX_ACCOUNTS.md`

---

### 问题 5：API 返回 HTML 而不是 JSON
**现象：** 
- 控制台报错 `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
- API 状态码 200 但返回的是 HTML 页面

**原因：** 
- Cloudflare Pages 静态部署模式下，`/api/*` 路由被当作静态文件处理
- `_worker.js` 没有被正确识别

**解决方案：**
1. 创建 `_worker.js` 启用 Pages Advanced mode
2. 添加 `_routes.json` 明确指定 `/api/*` 走 Worker 处理
3. 在构建脚本中自动生成 `_routes.json`

**相关提交：** 
- `feat: add Pages Advanced mode worker`
- `fix: add postbuild script to generate _routes.json`

---

### 问题 6：支付成功后首页不显示剩余次数
**现象：** 
- 支付成功但首页没有显示 credits
- 用户需要手动刷新才能看到

**原因：** 
1. 支付成功后没有跳转回首页
2. UsageBar 组件的显示条件 `usage.limit !== null` 排除了 credits 套餐

**解决方案：**
1. 支付成功后 2 秒自动跳转到首页
2. 修改显示条件为 `usage.limit !== null || usage.credits !== null`

**相关提交：** 
- `feat: redirect to home page after successful payment`
- `fix: show credits in UsageBar for credits plan`

---

## 三、技术要点总结

### 1. Cloudflare Pages 部署架构
- **静态站点：** Next.js export 模式生成静态文件到 `out` 目录
- **Worker API：** 使用 `_worker.js` 处理动态 API 请求
- **路由配置：** `_routes.json` 指定哪些路径走 Worker

### 2. PayPal SDK 集成要点
- **vault=true：** 订阅功能必需
- **intent 参数：** 不指定则同时支持 capture 和 subscription
- **按钮类型：** createOrder（一次性）vs createSubscription（订阅）

### 3. 数据库设计
```sql
-- 订单表
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_type TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  paypal_order_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 订阅表
CREATE TABLE subscriptions (
  user_id TEXT PRIMARY KEY,
  plan TEXT DEFAULT 'free',
  credits INTEGER DEFAULT 0,
  expires_at DATETIME
);
```

---

## 四、测试验证

### 测试环境
- **PayPal 模式：** Sandbox
- **测试账号：** PERSONAL 类型买家账号
- **测试金额：** $2.9（20 credits）

### 测试结果
✅ Credits 购买流程完整  
✅ 支付成功后正确增加 credits  
✅ 首页正确显示剩余次数  
✅ API 路由正常工作  
✅ 错误处理完善

---

## 五、后续优化建议

1. **生产环境配置**
   - 切换到 PayPal Live 模式
   - 配置真实的 Client ID 和 Secret

2. **用户体验优化**
   - 添加支付历史记录页面
   - 支持退款功能
   - 邮件通知支付成功

3. **安全加固**
   - 添加 Webhook 验证签名
   - 实现订单幂等性检查
   - 添加支付金额校验

4. **监控告警**
   - 集成支付失败监控
   - 添加异常订单告警
   - 统计支付转化率

---

## 六、相关文件清单

### 核心代码
- `worker.js` - API 路由处理
- `_worker.js` - Pages Worker 入口
- `app/pricing/page.tsx` - 支付页面
- `app/page.tsx` - 首页（显示 credits）
- `components/UsageBar.tsx` - 用量显示组件

### 配置文件
- `wrangler.toml` - Cloudflare 配置
- `package.json` - 构建脚本
- `postbuild.sh` - 生成 _routes.json
- `schema.sql` - 数据库结构

### 文档
- `docs/PAYPAL_SETUP.md`
- `docs/CLOUDFLARE_ENV.md`
- `docs/PAYPAL_SANDBOX_ACCOUNTS.md`
- `docs/DEPLOYMENT.md`
- `docs/PROJECT_REVIEW_2026-03-30.md`（本文档）

---

**项目状态：** ✅ PayPal 支付功能已完成并测试通过  
**下一步：** 切换到生产环境并上线
