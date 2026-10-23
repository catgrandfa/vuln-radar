# Node.js

## 追踪要点

- 运行时本体：V8 / Brotli / OpenSSL 等内嵌依赖随 Node 版本走，升 Node ≠ 升 npm 包
- npm 供应链：发包管线、维护者账号接管、install 脚本（preinstall/postinstall）
- 仅 Current 与 LTS 分支收安全补丁，奇数年非 LTS 分支生命周期短

## 订阅源

- ★ 官方安全发布：https://nodejs.org/en/blog/vulnerability
- ★ npm/GHSA 公告：https://github.com/advisories?query=ecosystem%3Anpm
- 发布计划：https://github.com/nodejs/release#release-schedule
- 供应链情报：Socket（https://socket.dev/blog）· StepSecurity · Unit 42
- 工具：`npm audit` / `pnpm audit`，CI 建议 `--audit-level=high`

## 近期大事

- 2026-10-21 官方安全发布（26.x / 24.x / 22.x，含 Brotli RCE）→ [2026-10-security-releases.md](2026-10-security-releases.md)
- 2026 年供应链事件频发：Axios（3 月）、依赖混淆 33 包（5 月）、AsyncAPI（7 月）
