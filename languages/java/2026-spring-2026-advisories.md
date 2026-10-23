# Spring 2026 公告潮与近期 CVE

## 2026-08-20：单日 91 个公告

- Spring 项目单日发布 91 个安全公告，覆盖多个框架版本线；企业应用逐条消化成本高。
- 建议按「在用组件 + 版本范围」过滤后再评估，优先处理 RCE / 提权类。
- 分析：https://www.herodevs.com （"91 Spring CVEs in a Single Day"）

## 近期值得关注

- CVE-2026-47836（HIGH）/ CVE-2026-47834（MEDIUM）：见 https://spring.io/security/advisories
- CVE-2026-40976：Spring Boot 4.0.0 – 4.0.5，严重级，需立即升级（4 月公告）
- CVE-2026-22737：Spring Framework 信息泄露（使用脚本引擎模板视图的应用，3 月公告）
- CVE-2026-41003：Spring Security —— 能影响 `RelyingPartyRegistration` 取值的攻击者，可在其生成的 HTML 表单上下文中执行任意代码（7 月公告）

## 生态动态

- Atlassian 2026-10-20 安全公告：含 162 个 high + 14 个 critical 第三方组件漏洞（重度使用 Atlassian 栈的团队相关）：https://confluence.atlassian.com
