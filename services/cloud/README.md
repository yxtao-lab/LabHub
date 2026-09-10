# LabHub Cloud

统一云服务：手机号短信登录、托管清单元数据同步、AI 月配额、DeepSeek 分析中继。  
`DEEPSEEK_API_KEY` 与短信密钥只放在本服务 `.env`，不进入 LabHub 开源仓或用户本机。

## 启动

```bash
cd services/cloud
cp .env.example .env
# 必填 JWT_SECRET、INVITE_CODE；开发可用 SMS_PROVIDER=dev + SMS_DEV_CODE
# 生产填 DEEPSEEK_API_KEY 与阿里云短信
npm install
npm run dev
```

默认 http://127.0.0.1:8780

将公网根地址写入 LabHub 仓库 `config/public.json` 的 `cloudUrl`（可公开）。

## 主要接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/auth/sms/send` | `{ phone }` 发验证码 |
| POST | `/v1/auth/sms/verify` | `{ phone, code, inviteCode? }` 登录/注册（邀请码可选） |
| GET | `/v1/auth/me` | Bearer JWT |
| GET/PUT | `/v1/catalog` | 用户项目元数据清单 |
| POST | `/v1/analyze` | 需 JWT；扣配额后返回 markdown |

数据文件默认：`services/cloud/data/cloud.sqlite`（勿提交）。
