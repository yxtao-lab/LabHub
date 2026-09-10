# LabHub · 多仓库项目中枢

LabHub 是**独立主体工程**：统管本机多个 Git 项目（含 FreeLLMAPI 与其它仓库）。  
FreeLLMAPI 只是被管理的项目之一，不是中枢本身。

## 能做什么

1. **提供 GitHub / Gitee 地址** → 浅克隆到 `projects/<id>/` 并登记  
2. **改代码、提交** → 在对应项目目录里正常 `git commit` / `git push origin`，推回**该项目源仓库**  
3. **管理控制台** → 多端启动模式分启停、运行状态、PID、日志监控；可配置研发分期（P0/P1…）  
4. **Cloud 账号** → 手机号注册（短信验证 + 密码）；登录可用密码或验证码；默认每用户管理 3 个项目；注册填邀请码则双方额度各 +1  
5. **项目分析总结** → 已登录用户首次托管时经 Cloud（DeepSeek）生成分析；按账号月配额限流；Key 只在 Cloud 服务器  

## 目录结构

```text
labhub/
  server/                 ← 本机管理 API :8790
  client/                 ← 控制台 UI :5177
  services/cloud/         ← LabHub Cloud（维护者部署：账号/清单/AI）
  config/public.json      ← 可公开的 cloudUrl（非密钥）
  projects/               ← 托管克隆（gitignore）
  data/                   ← 本机清单与登录态（gitignore）
```

## 快速开始（普通用户）

```bash
cd E:\Desktop\TYX\AI\labhub
npm install
npm run dev
```

打开 http://127.0.0.1:5177 → **注册/登录**后使用管理功能。

- 注册：手机号 + 密码 + 短信验证码（邀请码可选）
- 登录：手机号 + 密码，或手机号 + 验证码
- 默认可管理 **3** 个项目；使用他人邀请码注册时，你与邀请人各 **+1**

无需配置 DeepSeek Token。

### 维护者：部署 LabHub Cloud

```bash
cd services/cloud
cp .env.example .env
# 必填：JWT_SECRET、DATABASE_URL
# 本地库：docker compose up -d（默认 5433 端口，启动时自动建表）
# 开发：SMS_PROVIDER=dev、SMS_DEV_CODE=123456（验证码打日志）
# 生产：DEEPSEEK_API_KEY + SMS_PROVIDER=aliyun 及短信密钥
npm install
npm run dev   # 默认 :8780
```

把 Cloud 公网地址写入仓库根 [`config/public.json`](config/public.json)：

```json
{
  "cloudUrl": "https://你的-cloud-域名"
}
```

本地联调默认已是 `http://127.0.0.1:8780`。套餐在控制台「套餐」内系统支付开通（免费 / 基础 ¥9.9 / 专业 ¥29；Cloud `PAYMENT_MODE=mock` 为模拟支付）。详见 [`services/cloud/README.md`](services/cloud/README.md)。

| 角色 | Token / 密钥 |
|------|----------------|
| 普通用户 | 无 DeepSeek Token；须手机号登录；邀请码可选 |
| Cloud 服务器 | `DATABASE_URL`、`DEEPSEEK_API_KEY`、短信 AccessKey、`JWT_SECRET` |

- AI 触发：仅「第一次被 LabHub 管理」且已登录且有配额  
- 启动补缺 / 控制台「本地重生成」：不调 AI  
- 云端只存清单元数据，**不上传源码**

### 添加任意仓库

控制台点「添加仓库」，或：

```bash
curl -X POST http://127.0.0.1:8790/api/projects \
  -H "Content-Type: application/json" \
  -d "{\"repoUrl\":\"https://github.com/你的账号/某项目.git\",\"startCommand\":\"npm run dev\"}"
```

### 提交回源仓库

```bash
cd projects/某项目
git add .
git commit -m "feat: ..."
git push origin HEAD
```

## 与旧方案的区别

此前误把 Hub 做进 FreeLLMAPI 仓库内部——已纠正。  
正确模型：**LabHub 管一切；业务仓都是子项目。** Cloud 只同步「管了哪些仓」，不替代各仓自己的 git 远程。
