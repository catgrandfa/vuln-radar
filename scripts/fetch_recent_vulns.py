#!/usr/bin/env python3
"""从 NVD 2.0 API 拉取最近发布的漏洞，作为每周调研的线索来源。

匿名访问限速约 5 次 / 30 秒，脚本默认在关键词之间等待；如需提高频率，
在环境变量 NVD_API_KEY 中提供 API key（免费申请:
https://nvd.nist.gov/developers/request-an-api-key）。

用法:
    python3 fetch_recent_vulns.py --days 7                 # 默认查全部语言关键词
    python3 fetch_recent_vulns.py --days 7 --lang go php   # 只查指定语言
    python3 fetch_recent_vulns.py --days 7 --keyword spring --keyword tomcat
    python3 fetch_recent_vulns.py --days 1 --min-score 7 --format json --output out.json

输出按 CVSS 评分降序，跨关键词去重。
"""
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

API = "https://services.nvd.nist.gov/rest/json/cves/2.0"

LANG_KEYWORDS = {
    "php": ["php"],
    "java": ["spring", "openjdk"],
    "nodejs": ["node.js"],
    "python": ["cpython", "pypi"],
    "go": ["golang"],
}


def nvd_get(params, api_key):
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "vuln-radar/0.1"})
    if api_key:
        req.add_header("apiKey", api_key)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def fetch_keyword(keyword, days, api_key, page_size=50):
    """按发布日期窗口分页拉取，yield cve dict。"""
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S.000")
    end = now.strftime("%Y-%m-%dT%H:%M:%S.999")
    start_index = 0
    while True:
        data = nvd_get(
            {
                "keywordSearch": keyword,
                "pubStartDate": start,
                "pubEndDate": end,
                "resultsPerPage": page_size,
                "startIndex": start_index,
            },
            api_key,
        )
        for item in data.get("vulnerabilities", []):
            yield item.get("cve", {})
        start_index += page_size
        if start_index >= data.get("totalResults", 0):
            return


def summarize(cve):
    descs = [d["value"] for d in cve.get("descriptions", []) if d.get("lang") == "en"]
    desc = (descs[0] if descs else "").split(". ")[0][:150]
    score = severity = None
    metrics = cve.get("metrics", {})
    for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        if key in metrics and metrics[key]:
            data = metrics[key][0]["cvssData"]
            score, severity = data.get("baseScore"), data.get("baseSeverity")
            break
    return {
        "id": cve.get("id", "?"),
        "published": (cve.get("published") or "?")[:10],
        "score": score,
        "severity": severity,
        "desc": desc.replace("\n", " "),
    }


def main():
    ap = argparse.ArgumentParser(description="拉取 NVD 最近发布的漏洞摘要")
    ap.add_argument("--days", type=int, default=7, help="回看最近 N 天（默认 7，最大 120）")
    ap.add_argument("--lang", nargs="*", choices=sorted(LANG_KEYWORDS), help="只查这些语言（默认全部）")
    ap.add_argument("--keyword", action="append", default=[], help="追加自定义关键词，可多次")
    ap.add_argument("--sleep", type=float, default=7.0, help="请求间隔秒数（匿名限速建议 >= 6.5）")
    ap.add_argument("--min-score", type=float, default=0.0, help="只保留 CVSS >= 该分数的条目（默认 0 全保留）")
    ap.add_argument("--format", choices=("text", "json"), default="text", help="输出格式：text 人读 / json 机器读")
    ap.add_argument("--output", help="写入文件而不是 stdout")
    args = ap.parse_args()

    keywords = []
    for lang in args.lang or sorted(LANG_KEYWORDS):
        keywords.extend(LANG_KEYWORDS[lang])
    keywords.extend(args.keyword)
    if not keywords:
        ap.error("没有可用的关键词")

    api_key = os.environ.get("NVD_API_KEY")
    seen = set()
    rows = []
    for kw in keywords:
        if args.format == "text":
            print(f"\n== NVD 最近 {args.days} 天 · 关键词: {kw} ==")
        try:
            items = [summarize(c) for c in fetch_keyword(kw, args.days, api_key)]
        except Exception as exc:
            print(f"  请求失败: {exc}", file=sys.stderr)
            time.sleep(args.sleep)
            continue
        for r in sorted(items, key=lambda x: (x["score"] is None, -(x["score"] or 0))):
            if r["id"] in seen:
                continue
            seen.add(r["id"])
            r["keyword"] = kw
            rows.append(r)
        if kw != keywords[-1]:
            time.sleep(args.sleep)

    rows = [r for r in rows if (r["score"] or 0) >= args.min_score]

    out = sys.stdout
    if args.output:
        out = open(args.output, "w", encoding="utf-8")
    try:
        if args.format == "json":
            json.dump(rows, out, ensure_ascii=False, indent=2)
            out.write("\n")
        else:
            for r in rows:
                score = f"{r['score']:.1f}" if r["score"] is not None else " - "
                print(f"[{score:>4} {r['severity'] or '-':<8}] {r['id']} ({r['published']}) [{r['keyword']}]", file=out)
                print(f"    {r['desc']}", file=out)
                print(f"    https://nvd.nist.gov/vuln/detail/{r['id']}", file=out)
    finally:
        if args.output:
            out.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
