# vuln-radar —— 语言/平台安全漏洞订阅与调研

一个用于**订阅 + 调研**主流语言与平台安全漏洞的情报仓库。起步覆盖 PHP / Java / Node.js / Python / Go 五种语言，另设平台层（操作系统 / 容器 / 云）目录。

English docs: [README.en.md](README.en.md)

## 它解决什么问题

- 把散落各处的漏洞情报源收敛成一份 [SOURCES.md](SOURCES.md) 清单；
- **每天自动生成漏洞日报**（`digests/daily/`）并发布为 GitHub Release，可被 Watch / RSS / IM 推送订阅；
- 对重大漏洞（高危 / 在野利用 / 影响面大）单独沉淀深度调研笔记（`languages/*/`）；`digests/YYYY-Www.md` 为可选的人工精选周报。

## 目录结构

```
digests/
  daily/           自动日报：每日一份，如 2026-10-24.md
  2026-W43.md      人工精选周报（可选）
languages/         每种语言一个目录
  php/             README.md = 订阅源与追踪要点；其余为单漏洞调研笔记
  java/  nodejs/  python/  go/
platforms/         平台层漏洞（Linux 发行版、容器/K8s、Windows、云服务等）
templates/         漏洞调研笔记模板
scripts/
  fetch_recent_vulns.py     CLI：从 NVD 拉取近期漏洞（仅标准库）
  generate_daily_digest.py  日报生成器：NVD + CISA KEV → Markdown
.github/workflows/ 定时任务（daily-digest）
SOURCES.md         订阅源总清单：官方公告 / 漏洞数据库 / 研究博客 / 审计工具
```

## 自动日报（已内置，无需服务器）

GitHub Actions 每天**北京时间 09:00（UTC 01:00）**自动执行：

1. 从 NVD 拉取最近 24 小时各语言相关漏洞，并比对 CISA KEV 当日新增（在野利用优先级最高）；
2. 生成 `digests/daily/YYYY-MM-DD.md`（KEV / 重点关注 / 全部新增三段式）并提交回仓库；
3. 发布为 GitHub Release；
4. 若配置了推送 secret，同时推送到飞书群 / Telegram。

手动触发：`gh workflow run daily-digest.yml`，或在仓库 Actions 页面点 Run workflow。

### 如何订阅

| 方式 | 操作 |
| --- | --- |
| GitHub 通知 | 仓库右上角 **Watch → Custom → Releases** |
| RSS 阅读器 | 订阅 `https://github.com/catgrandfa/vuln-radar/releases.atom` |
| 飞书群推送 | 群添加自定义机器人，webhook 地址存为仓库 secret `FEISHU_WEBHOOK_URL`（Settings → Secrets and variables → Actions） |
| Telegram 推送 | secrets：`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` |
| 提速（可选） | 免费申请 [NVD API key](https://nvd.nist.gov/developers/request-an-api-key) 存为 secret `NVD_API_KEY`，摆脱匿名限速 |

## 本地把工具当 CLI 用

```bash
# 近 7 天全部语言，人读格式
python3 scripts/fetch_recent_vulns.py --days 7

# 只要高危，输出 JSON 给别的程序消费
python3 scripts/fetch_recent_vulns.py --days 7 --min-score 7 --format json --output week.json

# 自定义关键词
python3 scripts/fetch_recent_vulns.py --days 3 --keyword tomcat --keyword struts
```

仅依赖 Python 3 标准库，clone 即用。

## 人工调研流程

1. 以当日 / 近几日日报为线索，对照 [SOURCES.md](SOURCES.md) 官方公告页核对；
2. 值得深入调研的漏洞，复制 `templates/vuln-note.md` 到对应语言目录，命名 `YYYY-MM-短名.md`，逐项填写；
3. 需要沉淀阶段总结时，整理人工周报 `digests/YYYY-Www.md`（文件名用 ISO 周）。

## 路线图

- [x] 第一层：内容订阅——日报 Release + RSS feed
- [x] 第二层：工具开放——CLI 参数化 + JSON 输出 + 英文文档
- [x] 第三层：主动推送——定时自动化 + 飞书 / Telegram webhook（全部免费、零服务器）
- [ ] 第四层：多用户自助服务——网页上自选语言 / 框架 / 依赖包，管理个人订阅渠道，按需查询。届时演进为常驻服务（优先考虑无服务器形态，如 Cloudflare Workers / Vercel + 托管数据库）。

## 说明

- 所有条目均附来源链接，结论以官方公告与 NVD 最新状态为准；
- CVSS 评分 / 影响范围可能随时间更新，引用时注意核对日期；
- 本仓库内容仅供安全研究与防御参考。
