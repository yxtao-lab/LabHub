# LabHub · 多仓库项目中枢

LabHub 是**独立主体工程**：统管本机多个 Git 项目（含 FreeLLMAPI 与其它仓库）。  
FreeLLMAPI 只是被管理的项目之一，不是中枢本身。

## 能做什么

1. **提供 GitHub / Gitee 地址** → 浅克隆到 `projects/<id>/` 并登记  
2. **改代码、提交** → 在对应项目目录里正常 `git commit` / `git push origin`，推回**该项目源仓库**  
3. **管理控制台** → 多端启动模式分启停、运行状态、PID、日志监控；可配置研发分期（P0/P1…）  
4. **项目分析总结** → 读取各仓 `docs/项目分析总结.md` 并在控制台「分析总结」页展示  

## 目录结构

```text
labhub/                 ← 主体（本仓库）
  server/               ← 管理 API :8790
  client/               ← 控制台 UI :5177
  projects/             ← 托管克隆（gitignore，各自独立 .git）
  data/projects.json    ← 登记清单
```

## 快速开始

```bash
cd E:\Desktop\TYX\AI\labhub
npm install
npm run seed:demo    # 克隆/登记 freellmapi 与 edgetunnel 到 projects/
npm run dev          # 仅启动 LabHub API + 控制台；不会自动启动托管项目
```

打开 http://127.0.0.1:5177  

托管项目需在控制台按需点「启动」；LabHub 重启后也不会自动拉起它们。

### 添加任意仓库

控制台点「添加仓库」，或：

```bash
curl -X POST http://127.0.0.1:8790/api/projects \
  -H "Content-Type: application/json" \
  -d "{\"repoUrl\":\"https://github.com/你的账号/某项目.git\",\"startCommand\":\"npm run dev\"}"
```

### 提交回源仓库

```bash
cd projects/某项目          # 如 projects/freellmapi
git add .
git commit -m "feat: ..."
git push origin HEAD        # 推到添加时填写的 repoUrl
```

## 与旧方案的区别

此前误把 Hub 做进 FreeLLMAPI 仓库内部——已纠正。  
正确模型：**LabHub 管一切；FreeLLMAPI / EdgeTunnel / 其它仓都是子项目。**
