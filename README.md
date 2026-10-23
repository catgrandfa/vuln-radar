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
  generate_daily_digest.py  日报生成器：NVD + CISA KEV → Markdown / JSON
.github/workflows/ 定时任务（daily-digest）
worker/            第四层订阅服务：Cloudflare Worker + D1（零 npm 依赖）
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

## 多用户订阅服务（第四层）

`worker/` 是一个 **Cloudflare Worker + D1** 的自助订阅服务，零 npm 依赖，免费额度内可运行（10 万请求/天）：

- 打开服务首页，自选语言 / 自定义关键词 / CVSS 下限 / 是否含 KEV，创建「订阅包」——**无需注册账号，管理链接即凭证**；
- 每个订阅包获得：个人 RSS（`/feed/<token>.xml`，按订阅过滤）+ 可选的飞书 / Telegram 个人推送；
- GitHub Actions 每天生成日报后，把当天数据 POST 到 `/api/ingest`，服务按订阅包过滤并扇出推送，投递结果记录在管理页；
- 首页还提供按需查询（`/api/query?q=&days=&min_score=`，检索已入库数据）。

数据管道分工：Actions 负责采集（NVD 限速与 KEV 大文件的脏活），Worker 只做存储 / 过滤 / 推送，规避免费档 CPU 与子请求限制。

### 部署（一次性，约 5 分钟）

```bash
cd worker
npx wrangler login                                          # 浏览器授权你的 Cloudflare 账号
npx wrangler d1 create vuln-radar                           # 把输出中的 database_id 填进 wrangler.toml
npx wrangler d1 execute vuln-radar --remote --file=schema.sql
openssl rand -hex 24                                        # 生成一个 ingest 密钥
npx wrangler secret put INGEST_TOKEN                        # 粘贴上面的密钥
npx wrangler deploy                                         # 得到 https://vuln-radar.<你的子域>.workers.dev
```

然后在 **GitHub 仓库** Settings → Secrets → Actions 添加：`WORKER_URL`（Worker 完整地址）、`INGEST_TOKEN`（同一密钥）。下一次日报运行（北京 09:00）起，会自动把数据推给所有订阅包。

本地开发：`cd worker && npx wrangler d1 execute vuln-radar --local --file=schema.sql && npx wrangler dev`（`worker/.dev.vars` 提供本地 `INGEST_TOKEN`）。

## 路线图

- [x] 第一层：内容订阅——日报 Release + RSS feed
- [x] 第二层：工具开放——CLI 参数化 + JSON 输出 + 英文文档
- [x] 第三层：主动推送——定时自动化 + 飞书 / Telegram webhook（全部免费、零服务器）
- [x] 第四层：多用户自助服务——无账号「订阅包」模型（Cloudflare Worker + D1）
- [ ] 演进：正式账号体系、按依赖包（npm/PyPI 包名）精确订阅、邮件渠道、更多生态（Rust / .NET 等）

## 说明

- 所有条目均附来源链接，结论以官方公告与 NVD 最新状态为准；
- CVSS 评分 / 影响范围可能随时间更新，引用时注意核对日期；
- 本仓库内容仅供安全研究与防御参考。
