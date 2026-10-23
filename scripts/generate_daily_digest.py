#!/usr/bin/env python3
"""生成每日漏洞日报（Markdown），供 GitHub Actions 定时提交并发布 Release。

数据源:
    - NVD 2.0 API（按语言关键词，见 fetch_recent_vulns.LANG_KEYWORDS）
    - CISA KEV 目录（当日新增的在野利用漏洞，优先级最高）

用法:
    python3 scripts/generate_daily_digest.py                       # 生成 digests/daily/<今日>.md
    python3 scripts/generate_daily_digest.py --lang php go         # 只看部分语言
    python3 scripts/generate_daily_digest.py --summary-out /tmp/s.txt --out /tmp/d.md

stdout 最后一行输出 `COUNT: <n>`（NVD + KEV 合计条数），CI 据此决定是否发 Release。
仅标准库；collect() 保持无副作用、可导入，后续第四层多用户服务直接复用。
"""
import argparse
import json
import os
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_recent_vulns import LANG_KEYWORDS, fetch_keyword, summarize

KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def collect(langs, days, api_key, sleep, min_score):
    """拉取 NVD 关键词命中 + KEV 窗口内新增，返回 (nvd_rows, kev_rows)。"""
    keywords = []
    for lang in langs or sorted(LANG_KEYWORDS):
        keywords.extend(LANG_KEYWORDS[lang])

    seen, nvd_rows = set(), []
    for kw in keywords:
        try:
            items = [summarize(c) for c in fetch_keyword(kw, days, api_key)]
        except Exception as exc:
            print(f"  NVD 请求失败（{kw}）: {exc}", file=sys.stderr)
            time.sleep(sleep)
            continue
        for r in sorted(items, key=lambda x: (x["score"] is None, -(x["score"] or 0))):
            if r["id"] not in seen:
                seen.add(r["id"])
                r["keyword"] = kw
                nvd_rows.append(r)
        if kw != keywords[-1]:
            time.sleep(sleep)
    nvd_rows = [r for r in nvd_rows if (r["score"] or 0) >= min_score]

    kev_rows = []
    try:
        req = urllib.request.Request(KEV_URL, headers={"User-Agent": "vuln-radar/0.1"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            kev_all = json.load(resp).get("vulnerabilities", [])
        since = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
        kev_rows = [v for v in kev_all if (v.get("dateAdded") or "") >= since]
    except Exception as exc:
        print(f"  KEV 请求失败: {exc}", file=sys.stderr)
    return nvd_rows, kev_rows


def cell(text, limit=90):
    text = (text or "").replace("|", "\\|").replace("\n", " ").strip()
    return text[: limit - 1] + "…" if len(text) > limit else text


def render(date_str, nvd_rows, kev_rows):
    """渲染日报 Markdown。"""
    high = [r for r in nvd_rows if (r["severity"] or "").upper() in ("HIGH", "CRITICAL")]
    lines = [
        f"# 漏洞日报 · {date_str}",
        "",
        f"> 自动生成 by GitHub Actions · 数据源：NVD 2.0 API + CISA KEV · 共 {len(nvd_rows)} 条（其中 HIGH/CRITICAL {len(high)} 条），KEV 新增 {len(kev_rows)} 条",
        "",
    ]
    if kev_rows:
        lines.append(f"## 🚨 CISA KEV 新增（在野利用，{len(kev_rows)} 条）")
        lines.append("")
        for v in kev_rows:
            rw = " · 🦠勒索软件在用" if str(v.get("knownRansomwareCampaignUse")).lower() == "true" else ""
            lines.append(
                f"- [{v['cveID']}](https://nvd.nist.gov/vuln/detail/{v['cveID']}) — "
                f"{cell(v.get('vulnerabilityName'), 70)}（{cell(v.get('vendorProject', '') + ' ' + v.get('product', ''))}，"
                f"added {v.get('dateAdded')}{rw}）"
            )
        lines.append("")
    lines.append(f"## 重点关注（HIGH / CRITICAL，{len(high)} 条）")
    lines.append("")
    if high:
        lines.append("| 评分 | CVE | 语言/关键词 | 简介 |")
        lines.append("| ---: | --- | --- | --- |")
        for r in high:
            lines.append(
                f"| {r['score']:.1f} | [{r['id']}](https://nvd.nist.gov/vuln/detail/{r['id']}) "
                f"| {r['keyword']} | {cell(r['desc'])} |"
            )
    else:
        lines.append("（今日无 HIGH/CRITICAL）")
    lines.append("")
    lines.append(f"## 全部新增（{len(nvd_rows)} 条）")
    lines.append("")
    if nvd_rows:
        lines.append("| 评分 | CVE | 语言/关键词 | 简介 |")
        lines.append("| ---: | --- | --- | --- |")
        for r in nvd_rows:
            score = f"{r['score']:.1f}" if r["score"] is not None else "-"
            lines.append(
                f"| {score} | [{r['id']}](https://nvd.nist.gov/vuln/detail/{r['id']}) "
                f"| {r['keyword']} | {cell(r['desc'])} |"
            )
    else:
        lines.append("（今日无新增）")
    lines.append("")
    return "\n".join(lines)


def render_summary(date_str, nvd_rows, kev_rows, top=5):
    """渲染 IM 推送用的纯文本摘要（workflow 会追加 Release 链接）。"""
    high = [r for r in nvd_rows if (r["severity"] or "").upper() in ("HIGH", "CRITICAL")]
    parts = [f"【漏洞日报 {date_str}】新增 {len(nvd_rows)} 条（高危 {len(high)}）· KEV 在野利用新增 {len(kev_rows)} 条"]
    for v in kev_rows[:3]:
        parts.append(f"🚨KEV {v['cveID']} {v.get('vulnerabilityName', '')[:60]}")
    for r in [x for x in nvd_rows if x in high][:top] or nvd_rows[:top]:
        score = f"{r['score']:.1f}" if r["score"] is not None else "-"
        parts.append(f"[{score}] {r['id']} {r['desc'][:60]}")
    return "\n".join(parts)


def main():
    ap = argparse.ArgumentParser(description="生成每日漏洞日报 Markdown")
    ap.add_argument("--days", type=int, default=1, help="回看窗口天数（默认 1，即最近 24h）")
    ap.add_argument("--lang", nargs="*", choices=sorted(LANG_KEYWORDS), help="只查这些语言（默认全部）")
    ap.add_argument("--sleep", type=float, default=7.0, help="NVD 请求间隔秒数（匿名限速建议 >= 6.5）")
    ap.add_argument("--min-score", type=float, default=0.0, help="NVD 条目 CVSS 下限（默认 0）")
    ap.add_argument("--out", help="日报输出路径（默认 digests/daily/<UTC今日>.md，相对仓库根）")
    ap.add_argument("--summary-out", help="推送摘要输出路径（可选）")
    ap.add_argument("--json-out", help="结构化数据输出路径（可选）：{date, nvd, kev}，供订阅服务 ingest")
    args = ap.parse_args()

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    nvd_rows, kev_rows = collect(args.lang, args.days, os.environ.get("NVD_API_KEY"), args.sleep, args.min_score)

    out_path = args.out or os.path.join(REPO_ROOT, "digests", "daily", f"{date_str}.md")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(render(date_str, nvd_rows, kev_rows))
    if args.summary_out:
        with open(args.summary_out, "w", encoding="utf-8") as f:
            f.write(render_summary(date_str, nvd_rows, kev_rows))
    if args.json_out:
        kev_slim = [
            {k: v.get(k) for k in ("cveID", "vendorProject", "product", "vulnerabilityName", "dateAdded", "knownRansomwareCampaignUse")}
            for v in kev_rows
        ]
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump({"date": date_str, "nvd": nvd_rows, "kev": kev_slim}, f, ensure_ascii=False)

    print(f"日报已写入 {out_path}")
    print(f"DATE: {date_str}")
    print(f"COUNT: {len(nvd_rows) + len(kev_rows)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
