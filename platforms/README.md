# 平台层漏洞

记录操作系统、容器、云平台层面的漏洞。与语言目录同样的工作流：大事单独建笔记，小事进当周 digest。

## 建议子目录（按需创建）

- `linux/` —— Debian DSA、Ubuntu USN、RHEL errata
- `containers/` —— 基础镜像漏洞（trivy/grype 扫描结果摘要）、K8s 公告
- `windows/` —— 微软月度补丁日摘要
- `cloud/` —— AWS / Azure / GCP 安全公告

## 每周必看

- CISA KEV（出现 = 优先级拉满）：https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- 微软补丁日（每月第二个周二）：https://msrc.microsoft.com/update-guide/
- K8s 官方 CVSS 公告：https://kubernetes.io/docs/reference/issues-security/official-cvss-scope/
