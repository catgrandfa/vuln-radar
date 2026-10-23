# Python

## 追踪要点

- CPython 本体：官方安全分支补丁
- PyPI 供应链：恶意版本投毒、维护者账号接管、CI/CD 管线
- AI / LLM 生态包（mcp、litellm 等）2026 年已是重灾区，依赖树往往很深

## 订阅源

- ★ python.org 安全页：https://www.python.org/dev/security/
- ★ PyPA 漏洞库（pip-audit 数据源）：https://github.com/pypa/advisory-database
- CPython 安全公告：https://github.com/python/cpython/security/advisories
- PyPI 公告与状态：https://blog.pypi.org/ · https://status.pypi.org/
- 工具：`pip-audit`（CI 固定版本运行）/ `safety`

## 近期大事

- CVE-2026-59950（mcp SDK，1.28.1 修复）+ LiteLLM 供应链投毒 → [2026-supply-chain-and-mcp.md](2026-supply-chain-and-mcp.md)
