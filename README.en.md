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

## Multi-user subscription service (Level 4)

`worker/` is a **Cloudflare Worker + D1** self-service — zero npm deps, runs inside the free tier:

- Open the site, pick languages / custom keywords / CVSS threshold / KEV toggle, and create a **subscription bundle** — no account needed; the management link is the credential;
- Each bundle gets a personal RSS feed (`/feed/<token>.xml`, filtered to your subscription) plus optional Feishu / Telegram push;
- Every day, GitHub Actions POSTs the fresh digest data to `/api/ingest`; the worker filters per bundle and fans out pushes, with delivery history on the manage page;
- On-demand search at `/api/query?q=&days=&min_score=`.

Deploy (one-time, ~5 min):

```bash
cd worker
npx wrangler login
npx wrangler d1 create vuln-radar              # put the database_id into wrangler.toml
npx wrangler d1 execute vuln-radar --remote --file=schema.sql
npx wrangler secret put INGEST_TOKEN           # e.g. output of: openssl rand -hex 24
npx wrangler deploy
```

Then add repo secrets `WORKER_URL` (the deployed URL) and `INGEST_TOKEN` (same key), and the next daily run feeds all bundles automatically.

## Roadmap

- [x] Content subscription (Releases + RSS)
- [x] Open tooling (CLI, JSON output, English docs)
- [x] Scheduled automation + IM push
- [x] Multi-user self-service (account-less bundle model on Cloudflare Workers + D1)
- [ ] Next: real accounts, package-level subscriptions (npm/PyPI names), email channel, more ecosystems (Rust / .NET)

## License

[MIT](LICENSE). For security research and defense reference only.
