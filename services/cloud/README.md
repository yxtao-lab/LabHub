# LabHub Cloud

统一云服务：手机号短信登录、托管清单元数据同步、AI 月配额、DeepSeek 分析中继。  
`DEEPSEEK_API_KEY` 与短信密钥只放在本服务 `.env`，不进入 LabHub 开源仓或用户本机。

## 本地推荐（与控制台一体）

在**仓库根目录**执行即可（会自动补 `.env`、起 Postgres，并并发启动 server / client / cloud）：

```bash
cd ../..   # 若当前在 services/cloud
pnpm install
pnpm dev
```

Cloud 默认 http://127.0.0.1:8780；控制台 http://127.0.0.1:5177。

## 单独启动本服务

```bash
cd services/cloud
cp .env.example .env
# 必填 JWT_SECRET、DATABASE_URL
# 开发可用 SMS_PROVIDER=dev + SMS_DEV_CODE

# 本地 PostgreSQL（自动建库用户；应用启动时自动建表）
docker compose up -d

pnpm install
pnpm dev
```

默认 http://127.0.0.1:8780  
数据库默认：`postgresql://labhub:labhub@127.0.0.1:5433/labhub`

将公网根地址写入 LabHub 仓库 `config/public.json` 的 `cloudUrl`（可公开）。

## 服务器发布

在仓库根目录执行（需已安装 Docker 与 PM2）。会安装依赖、编译、拉起 Postgres，并重启 PM2 进程 `labhub-cloud`。改代码或改 `.env` 后再执行一次即可生效：

```bash
pnpm release
```

开机自启只需在服务器上做一次：`pm2 startup`，然后 `pm2 save`（`pnpm release` 已会执行 `pm2 save`）。

## 主要接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/auth/sms/send` | `{ phone }` 发验证码 |
| POST | `/v1/auth/register` | 手机号 + 密码 + 短信注册 |
| POST | `/v1/auth/login` | 手机号 + 密码登录 |
| POST | `/v1/auth/sms/verify` | 已注册用户验证码登录 |
| GET | `/v1/auth/me` | Bearer JWT |
| GET/PUT | `/v1/catalog` | 用户项目元数据清单 |
| POST | `/v1/analyze` | 需 JWT；扣配额后返回 markdown |

| GET | `/v1/billing/catalog` | 套餐与加油包目录 |
| POST | `/v1/billing/checkout` | 创建订单（需 JWT） |
| POST | `/v1/billing/orders/:id/pay` | 支付开通（mock 即时生效） |
| POST | `/v1/billing/switch-free` | 降级免费版 |

数据存 **PostgreSQL**（`DATABASE_URL`）。启动时自动建表。开发默认 `PAYMENT_MODE=mock` 系统内模拟支付。
