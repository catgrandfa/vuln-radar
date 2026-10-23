# Go

## 追踪要点

- stdlib：crypto/*、net/http 是重灾区（x509、tls、http/2）
- 官方漏洞数据库 + `govulncheck`：只报实际调用到的包路径，噪音低
- 静态编译：stdlib 修复只能靠升级 Go 版本后**重新编译发布**，Docker 镜像同理，升级和发布必须跟上

## 订阅源

- ★ 官方漏洞数据库：https://vuln.go.dev/ · https://pkg.go.dev/vuln/list
- ★ golang-announce 邮件列表：https://groups.google.com/g/golang-announce
- 发布说明：https://go.dev/doc/devel/release
- 工具：`govulncheck ./...`

## 近期大事

- 2026-10-21 CVE-2026-111943（crypto/x509）+ 1.26.0 stdlib 批量漏洞回顾 → [2026-10-stdlib.md](2026-10-stdlib.md)
