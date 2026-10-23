# 订阅源清单

按优先级组织。标 ★ 的是每周 digest 必看项；每条情报建议附「官方链接 + 1~2 篇高质量分析」。

## 综合数据库（跨语言）

| 来源 | 说明 | 链接 |
| --- | --- | --- |
| ★ NVD | CVE 权威记录 + CVSS 评分，REST API 免费可用 | https://nvd.nist.gov/ · https://nvd.nist.gov/developers/vulnerabilities |
| ★ OSV.dev | Google 开源漏洞库，按包名/生态查询，API 简单 | https://osv.dev/ · https://api.osv.dev/docs |
| ★ GitHub Advisory Database | GHSA，对 npm/PyPI/Composer/Maven/Go 生态覆盖好 | https://github.com/advisories |
| ★ CISA KEV | 已知在野利用目录，出现在这里 = 优先级拉满 | https://www.cisa.gov/known-exploited-vulnerabilities-catalog |
| CERT-EU | 欧盟 CERT 公告，常给聚合处置建议 | https://cert.europa.eu/publications/security-advisories |
| CNVD / CNNVD | 国内漏洞库 | https://www.cnvd.org.cn/ · https://www.cnnvd.org.cn/ |

## PHP

- ★ 官方发布与变更日志：https://www.php.net/releases/ · https://www.php.net/ChangeLog-8.php
- ★ 受支持版本（判断哪些分支还会收补丁）：https://www.php.net/supported-versions.php
- php-src 安全公告：https://github.com/php/php-src/security/advisories
- Packagist 安全告警 API（`composer audit` 的数据源）：https://packagist.org/apidoc
- 研究博客：WatchTowr / Wiz / Unit 42 / Tenable

## Java

- ★ Spring 官方安全公告：https://spring.io/security/advisories
- ★ OpenJDK 漏洞公告：https://openjdk.org/groups/vulnerability/advisories
- Oracle 关键补丁更新 CPU（每年 1/4/7/10 月）：https://www.oracle.com/security-alerts/
- Apache 基金会公告（Tomcat/Struts 等）：https://apache.org/security/
- 工具：OWASP Dependency-Check / Snyk / Sonatype OSS Index

## Node.js

- ★ 官方安全发布博客：https://nodejs.org/en/blog/vulnerability
- ★ npm 生态公告（GHSA）：https://github.com/advisories?query=ecosystem%3Anpm
- 发布计划：https://github.com/nodejs/release#release-schedule
- 供应链情报：Socket（https://socket.dev/blog）· StepSecurity · Unit 42
- 工具：`npm audit` / `pnpm audit`（CI 建议加 `--audit-level=high`）

## Python

- ★ python.org 安全页：https://www.python.org/dev/security/
- ★ PyPA 漏洞库（pip-audit 数据源）：https://github.com/pypa/advisory-database
- CPython 安全公告：https://github.com/python/cpython/security/advisories
- PyPI 公告与状态：https://blog.pypi.org/ · https://status.pypi.org/
- 工具：`pip-audit` / `safety`

## Go

- ★ 官方漏洞数据库：https://vuln.go.dev/ · https://pkg.go.dev/vuln/list
- ★ golang-announce 邮件列表：https://groups.google.com/g/golang-announce
- 发布说明：https://go.dev/doc/devel/release
- 工具：`govulncheck ./...`（只报实际调用到的包路径，噪音低）

## 平台层

- Linux 发行版：Debian DSA（https://www.debian.org/security/）· Ubuntu USN（https://ubuntu.com/security/notices）· RHEL errata
- 容器/K8s：trivy / grype 镜像扫描；K8s 官方公告 https://kubernetes.io/docs/reference/issues-security/official-cvss-scope/
- Windows：微软月度补丁日（每月第二个周二）https://msrc.microsoft.com/update-guide/
- 云厂商：AWS / Azure / GCP 安全公告页

## 研究博客 / 情报（精选）

Google Cloud Security · Wiz · Palo Alto Unit 42 · Tenable · Snyk · Datadog Security Labs · StepSecurity · WatchTowr

## 审计速查

| 语言 | 命令 |
| --- | --- |
| PHP | `composer audit` |
| Java | OWASP Dependency-Check / Snyk |
| Node.js | `npm audit` / `pnpm audit` |
| Python | `pip-audit` |
| Go | `govulncheck ./...` |
| 容器/镜像 | `trivy image` / `grype` |
