# PayPal 沙箱测试账号说明

## 问题：卖家账号无法支付

如果登录 PayPal 沙箱后提示"这是卖家账号，不能支付"，需要使用买家测试账号。

## 获取买家测试账号

1. 访问 https://developer.paypal.com/
2. 登录后进入 Dashboard
3. 点击左侧菜单 **Sandbox** > **Accounts**
4. 查看账号列表，找到 **Type = PERSONAL** 的账号（买家账号）
5. 点击账号右侧的 **...** > **View/Edit Account**
6. 查看账号信息：
   - Email
   - Password（点击 Show 查看）

## 测试支付流程

1. 在支付页面点击 PayPal 按钮
2. 使用买家测试账号登录
3. 完成支付

## 注意事项

- **BUSINESS** 类型 = 卖家账号（收款用）
- **PERSONAL** 类型 = 买家账号（付款用）
- 测试账号的余额是虚拟的，不会产生真实扣款
