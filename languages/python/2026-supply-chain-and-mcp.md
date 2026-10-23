# MCP SDK 漏洞与 PyPI 供应链投毒（2026）

## CVE-2026-59950 · mcp（Model Context Protocol Python SDK）

- 修复版本：1.28.1
- NVD：https://nvd.nist.gov/vuln/detail/CVE-2026-59950
- 处置：升级 ≥ 1.28.1；大量 AI 应用把它带进了依赖树，建议 `pip-audit` 全量扫一遍

## LiteLLM 供应链投毒（2026-03-24）

- 恶意版本 **1.82.7 / 1.82.8** 发布到 PyPI；与 TeamPCP 活动相关，同期 Telnyx 包亦被投毒
- 手法值得记录：攻击者先污染了一个安全扫描器，让后门通过扫描 —— **安全工具本身成为攻击面**
- 处置：版本锁定（lockfile + hash 校验）；如曾引入 1.82.7/1.82.8，按入侵事件处理（密钥轮换、排查外联）
- 来源：Datadog Security Labs / Snyk / Bitsight

## 2026 供应链背景

- Rapid Fort 总结：Trivy、LiteLLM、Telnyx、Axios 均在 2026 年遭遇供应链攻击 —— 扫描器、构建管线、发包流程都成了目标
