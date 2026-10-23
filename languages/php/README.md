# PHP

## 追踪要点

- 内核（php-src）与各 SAPI（FPM / cli / mod_php）
- 官方支持分支：仅活跃 8.x 分支收安全补丁，以支持页为准：https://www.php.net/supported-versions.php
- 生态：Composer / Packagist（`composer audit` 基于 Packagist 安全告警数据库）

## 订阅源

- ★ 官方发布与变更日志：https://www.php.net/releases/ · https://www.php.net/ChangeLog-8.php
- ★ 受支持版本：https://www.php.net/supported-versions.php
- php-src 安全公告：https://github.com/php/php-src/security/advisories
- Packagist 安全告警 API：https://packagist.org/apidoc
- 研究博客：WatchTowr / Wiz / Unit 42 / Tenable

## 近期大事

- 2026-10 PHP2Shell（CVE-2026-109618 / CVE-2026-109619，未认证 RCE，披露前已有在野利用）→ [2026-10-php2shell.md](2026-10-php2shell.md)
