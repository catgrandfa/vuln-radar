# Node.js 2026-10-21 官方安全发布

- **发布**：2026-10-21，覆盖 Node.js 26.x / 24.x / 22.x
- **重点**：Brotli 解码器越界写（out-of-bounds write），可导致远程代码执行；另含多项中低危修复（完整清单见官方公告）
- **在野利用**：未见公开报道
- **处置**：升级到各分支 10-21 之后的最新补丁版本
- **备注**：HKCERT 10-22 转发公告，整体定级 Medium；但 Brotli RCE 属于「解码不可信输入即触发」，对服务端流量场景应按高危对待。另外内嵌依赖（Brotli/OpenSSL 等）的修复只能靠升 Node 版本，Docker 镜像需要重新构建发布。

## 参考

- 官方公告：https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
- HKCERT：https://www.hkcert.org/security-bulletin/node-js-multiple-vulnerabilities_20261022
