# PHP2Shell（CVE-2026-109618 / CVE-2026-109619）

- **披露/修复**：2026-10-21，PHP 各受支持 8.x 分支同步发布补丁
- **类型**：PHP 核心未认证远程代码执行（RCE）× 2
  - CVE-2026-109618：内存耗尽（OOM）处理可把 PHP 打断在内部请求数据只初始化一半的状态
  - CVE-2026-109619：相关缺陷，可在该状态下劫持执行流，达成代码执行
- **严重程度**：多家评级 Critical（以 NVD 最新评分为准）
- **在野利用**：是 —— Amazon 威胁情报通过 MadPot 蜜罐观察到**公开披露前**的利用
- **影响**：所有受支持的 PHP 8.x 分支；Wiz 估算影响面约占互联网站点 70%；CERT-EU 发布 2026-018 公告，路透社报道部分政府网站在修补期间临时下线
- **处置**：
  1. 立即升级到各 8.x 分支 2026-10-21 之后的最新补丁版本；
  2. 短期无法升级的，参考各分析文章的缓解措施（WAF / 关闭非必要入口），并评估像 CERT-EU 建议的那样短暂下线抢修；
  3. 排查访问日志中是否有可疑请求（披露前利用意味着可能已被打了时间差）。
- **情报备注**：据报道该漏洞发现过程有 AI 辅助；GitHub 安全公告比计划发布时间早 26 分钟上线，社区出现短暂混乱 —— 官方公告窗口期本身也是需要盯的信息源。

## 参考

- WatchTowr FAQ：https://watchtowr.com/intelligence/php-cve-2026-109618-faq
- Google Cloud 响应博客：https://cloud.google.com/blog/products/identity-security/responding-to-core-php-vulnerabilities-cve-2026-109618-cve-2026-109619
- Wiz 分析：https://www.wiz.io/blog/php2shell-php-rce
- Unit 42：https://unit42.paloaltonetworks.com/cve-2026-109618-cve-2026-109619
- Tenable FAQ：https://www.tenable.com/blog/php2shell-cve-2026-109618-cve-2026-109619-frequently-asked-questions-about-critical-php-remote
- AWS 威胁情报：https://aws.amazon.com/blogs/security/amazon-threat-intelligence-identifies-php2shell-exploitation-prior-to-public-disclosure-in-madpot
- CERT-EU 2026-018：https://cert.europa.eu/publications/security-advisories/2026-018
- Reuters 报道：https://www.reuters.com/world/asia-pacific/eu-agency-warns-websites-may-need-be-taken-offline-php-prepares-patches-2026-10-21
