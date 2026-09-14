# LabHub 分析中继

独立小服务：在**你自己的服务器**上保存 `DEEPSEEK_API_KEY`，向各 LabHub 实例提供 `POST /v1/analyze`。  
终端用户克隆 LabHub **无需**配置任何 API Token；Key 不会出现在 LabHub 仓库或用户本机。

## 部署（维护者）

```bash
cd services/analysis-relay
cp .env.example .env
# 编辑 .env，填写 DEEPSEEK_API_KEY
npm install
npm run dev          # 开发 :8780
# 或
npm run build && npm start
```

公网部署后，把可访问的根地址写入 LabHub 仓库的 `config/public.json`：

```json
{
  "analysisRelayUrl": "https://你的域名"
}
```

> 说明：当前推荐使用 **LabHub Cloud**（`services/cloud`，根目录 `npm run / pnpm run dev` 已一体启动）的 `/v1/analyze`。本 analysis-relay 为遗留可选服务，**不会**随根目录 `dev` 启动，且默认端口与 Cloud 冲突（同为 `:8780`）。

该 URL **不是密钥**，可随仓库分发。真正的 `DEEPSEEK_API_KEY` 只留在中继服务器 `.env`。

## 接口

- `GET /health`
- `POST /v1/analyze`  
  Body：`{ "project": { id, name, path, ... }, "context": "仓库证据文本" }`  
  返回：`{ "markdown": "...", "source": "deepseek" }`

## 安全注意

- Key 绝不下发、不写进 LabHub 开源仓
- 默认按 IP 限流，防止刷爆额度；生产建议再加网关 / WAF / 鉴权
- 请求体会带上用户托管项目的部分源码摘要，请在隐私政策中说明
