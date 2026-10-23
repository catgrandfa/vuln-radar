# vuln-radar —— 语言/平台安全漏洞订阅与调研

一个用于**订阅 + 调研**主流语言与平台安全漏洞的情报仓库。起步覆盖 PHP / Java / Node.js / Python / Go 五种语言，另设平台层（操作系统 / 容器 / 云）目录。

## 它解决什么问题

- 把散落各处的漏洞情报源收敛成一份 [SOURCES.md](SOURCES.md) 清单；
- 每周把值得关注的漏洞整理成摘要（`digests/`），开头附「本周行动项」；
- 对重大漏洞（高危 / 在野利用 / 影响面大）单独沉淀深度调研笔记（`languages/*/`）。

## 目录结构

```
digests/          周报：按 ISO 周命名，如 2026-W43.md
languages/        每种语言一个目录
  php/              README.md = 订阅源与追踪要点；其余为单漏洞调研笔记
  java/
  nodejs/
  python/
  go/
platforms/        平台层漏洞（Linux 发行版、容器/K8s、Windows、云服务等）
templates/        漏洞调研笔记模板
scripts/          fetch_recent_vulns.py —— 从 NVD 拉取最近发布的漏洞（仅标准库，无需 pip 安装）
SOURCES.md        订阅源总清单：官方公告 / 漏洞数据库 / 研究博客 / 审计工具
```

## 每周工作流

1. 运行 `python3 scripts/fetch_recent_vulns.py --days 7`，得到 NVD 近 7 天各语言相关漏洞清单，作为线索；
2. 对照 [SOURCES.md](SOURCES.md) 里的官方公告页核对，把值得关注的高危项写入 `digests/YYYY-Www.md`（文件名用 ISO 周），开头给出「行动项」；
3. 需要深入调研的漏洞，复制 `templates/vuln-note.md` 到对应语言目录，命名 `YYYY-MM-短名.md`，逐项填写。

## 自动化（可选）

可以让 ZCode 每周定时执行上述流程并生成 digest（对 ZCode 说「每周一上午自动调研本周安全漏洞并更新 digest」即可）。

## 说明

- 所有条目均附来源链接，结论以官方公告与 NVD 最新状态为准；
- CVSS 评分 / 影响范围可能随时间更新，引用时注意核对日期。
