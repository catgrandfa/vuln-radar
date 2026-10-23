# vuln-radar — Language & Platform Vulnerability Digest

A vulnerability-intelligence repo covering **PHP / Java / Node.js / Python / Go** plus a platform layer (OS / containers / cloud). It produces a **daily automated digest** and human research notes for high-impact bugs.

中文文档：[README.md](README.md)

## What you get

- A curated [source list](SOURCES.md) of official advisories, vulnerability databases, and research blogs;
- A **daily digest** (`digests/daily/YYYY-MM-DD.md`): new NVD CVEs per language + the day's CISA KEV additions, published as a GitHub Release every day at **01:00 UTC**;
- Deep-dive notes for critical bugs under `languages/*/`.

## Subscribe

| Channel | How |
| --- | --- |
| GitHub notifications | **Watch → Custom → Releases** |
| RSS | `https://github.com/catgrandfa/vuln-radar/releases.atom` |
| Feishu (Lark) | add a group-bot webhook as repo secret `FEISHU_WEBHOOK_URL` |
| Telegram | secrets `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` |

## Use the CLI locally

Python 3 standard library only — clone and run:

```bash
# last 7 days, all languages, human-readable
python3 scripts/fetch_recent_vulns.py --days 7

# high-severity only, JSON for tooling
python3 scripts/fetch_recent_vulns.py --days 7 --min-score 7 --format json --output week.json

# custom keywords
python3 scripts/fetch_recent_vulns.py --days 3 --keyword tomcat
```

Optional: set `NVD_API_KEY` in the environment (or as a repo secret in CI) with a [free NVD key](https://nvd.nist.gov/developers/request-an-api-key) to lift anonymous rate limits.

## How the automation works

`.github/workflows/daily-digest.yml` runs daily: fetch NVD (per-language keywords) + CISA KEV → render `digests/daily/<date>.md` → commit → publish a GitHub Release → optionally push to Feishu/Telegram if secrets are configured. Zero servers; GitHub Actions is free for public repos.

## Roadmap

- [x] Content subscription (Releases + RSS)
- [x] Open tooling (CLI, JSON output, English docs)
- [x] Scheduled automation + IM push
- [ ] Multi-user self-service: pick your languages/frameworks/packages, manage your own channels, query on demand (serverless-first).

## License

[MIT](LICENSE). For security research and defense reference only.
