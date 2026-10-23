// vuln-radar 第四层：多用户自助订阅服务（Cloudflare Worker + D1，零 npm 依赖）
//
// 路由：
//   GET  /                落地页：创建订阅包 + 按需查询
//   POST /api/bundles     创建订阅包 → {token, manageUrl, feedUrl}
//   GET  /b/:token        管理页（改配置 / 删除 / 投递历史），链接即凭证
//   GET  /api/bundles/:t  配置 + 最近投递记录（JSON）
//   PUT  /api/bundles/:t  更新配置
//   DELETE /api/bundles/:t 删除
//   GET  /feed/:token.xml 个人 RSS（按订阅包过滤）
//   POST /api/ingest      日报数据入库并按订阅包扇出推送（请求头 X-Ingest-Token）
//   GET  /api/query       按需查询已入库数据（?q=&days=&min_score=）
//
// 数据由 GitHub Actions 每天采集后 POST 到 /api/ingest；Worker 不直接访问 NVD，
// 规避 Workers 免费档 CPU 限制与 NVD 匿名限速。

const LANG_KEYWORDS = {
  php: ["php"],
  java: ["spring", "openjdk"],
  nodejs: ["node.js"],
  python: ["cpython", "pypi"],
  go: ["golang"],
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

// ---------- 工具 ----------

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function page(html) {
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
      "referrer-policy": "no-referrer",
    },
  });
}

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function cleanConfig(raw) {
  const cfg = raw && typeof raw === "object" ? raw : {};
  const name = String(cfg.name ?? "").trim().slice(0, 60) || "我的订阅";
  const langs = [...new Set(Array.isArray(cfg.langs) ? cfg.langs : [])].filter((l) => l in LANG_KEYWORDS);
  const keywords = [...new Set((Array.isArray(cfg.keywords) ? cfg.keywords : [])
    .map((k) => String(k).trim().toLowerCase().slice(0, 40))
    .filter((k) => k && /^[a-z0-9. _-]+$/.test(k)))].slice(0, 20);
  const minScore = Math.min(10, Math.max(0, Number(cfg.minScore) || 0));
  const ch = cfg.channels && typeof cfg.channels === "object" ? cfg.channels : {};
  const url = (v) => (/^https:\/\/\S{10,400}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");
  return {
    name,
    langs,
    keywords,
    minScore,
    includeKEV: cfg.includeKEV !== false,
    channels: {
      feishuWebhook: url(ch.feishuWebhook),
      tgToken: String(ch.tgToken ?? "").trim().slice(0, 200).replace(/[^A-Za-z0-9:_-]/g, ""),
      tgChatId: String(ch.tgChatId ?? "").trim().slice(0, 64),
    },
  };
}

function filterFor(cfg, nvd, kev) {
  const kw = new Set(cfg.langs.flatMap((l) => LANG_KEYWORDS[l]));
  cfg.keywords.forEach((k) => kw.add(k));
  const nvdHit = nvd.filter((r) => kw.has(r.keyword) && (r.score ?? 0) >= cfg.minScore);
  return { nvdHit, kevHit: cfg.includeKEV ? kev : [] };
}

// ---------- 推送 ----------

function pushText(name, date, nvdHit, kevHit, manageUrl) {
  const high = nvdHit.filter((r) => ["HIGH", "CRITICAL"].includes(String(r.severity || "").toUpperCase()));
  const lines = [
    `【vuln-radar · ${name}】${date}`,
    `命中 ${nvdHit.length} 条（高危 ${high.length}）· KEV 在野利用新增 ${kevHit.length} 条`,
  ];
  for (const v of kevHit.slice(0, 3)) lines.push(`🚨KEV ${v.cveID} ${String(v.vulnerabilityName || "").slice(0, 60)}`);
  for (const r of (high.length ? high : nvdHit).slice(0, 8)) {
    lines.push(`[${r.score ?? "-"}] ${r.id} ${String(r.desc || "").slice(0, 60)}`);
  }
  lines.push(`详情与退订: ${manageUrl}`);
  return lines.join("\n");
}

async function pushFeishu(webhook, text) {
  const resp = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ msg_type: "text", content: { text } }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}

async function pushTelegram(token, chatId, text) {
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ chat_id: chatId, text }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}

// ---------- API ----------

async function createBundle(request, env, url) {
  const cfg = cleanConfig(await request.json().catch(() => ({})));
  const token = newToken();
  await env.DB.prepare("INSERT INTO bundles (token, config) VALUES (?, ?)").bind(token, JSON.stringify(cfg)).run();
  return json({ token, manageUrl: `${url.origin}/b/${token}`, feedUrl: `${url.origin}/feed/${token}.xml` }, 201);
}

async function loadBundle(env, token) {
  const row = await env.DB.prepare("SELECT id, config FROM bundles WHERE token = ?").bind(token).first();
  if (!row) return null;
  return { id: row.id, token, config: JSON.parse(row.config) };
}

async function getBundle(env, url, token) {
  const b = await loadBundle(env, token);
  if (!b) return json({ error: "not found" }, 404);
  const { results } = await env.DB.prepare(
    "SELECT date, status, detail FROM deliveries WHERE bundle_id = ? ORDER BY date DESC LIMIT 14"
  ).bind(b.id).all();
  return json({ token, config: b.config, feedUrl: `${url.origin}/feed/${token}.xml`, deliveries: results });
}

async function updateBundle(request, env, token) {
  const b = await loadBundle(env, token);
  if (!b) return json({ error: "not found" }, 404);
  const cfg = cleanConfig(await request.json().catch(() => ({})));
  await env.DB.prepare("UPDATE bundles SET config = ? WHERE id = ?").bind(JSON.stringify(cfg), b.id).run();
  return json({ ok: true, config: cfg });
}

async function deleteBundle(env, token) {
  const b = await loadBundle(env, token);
  if (!b) return json({ error: "not found" }, 404);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM deliveries WHERE bundle_id = ?").bind(b.id),
    env.DB.prepare("DELETE FROM bundles WHERE id = ?").bind(b.id),
  ]);
  return json({ ok: true });
}

async function ingest(request, env, url) {
  const token = request.headers.get("x-ingest-token") || "";
  if (!env.INGEST_TOKEN || token !== env.INGEST_TOKEN) return json({ error: "unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || "")) ? body.date : null;
  if (!date) return json({ error: "date must be YYYY-MM-DD" }, 400);
  const nvd = (Array.isArray(body.nvd) ? body.nvd : []).slice(0, 3000);
  const kev = (Array.isArray(body.kev) ? body.kev : []).slice(0, 500);

  await env.DB.prepare("INSERT OR REPLACE INTO daily_vulns (date, nvd, kev) VALUES (?, ?, ?)")
    .bind(date, JSON.stringify(nvd), JSON.stringify(kev)).run();

  const { results } = await env.DB.prepare("SELECT id, token, config FROM bundles WHERE active = 1").all();
  const report = [];
  for (const b of results) {
    const cfg = JSON.parse(b.config);
    const { nvdHit, kevHit } = filterFor(cfg, nvd, kev);
    let status = "skipped_empty";
    let detail = `nvd=${nvdHit.length} kev=${kevHit.length}`;
    if (nvdHit.length + kevHit.length > 0) {
      const manageUrl = `${url.origin}/b/${b.token}`;
      const text = pushText(cfg.name, date, nvdHit, kevHit, manageUrl);
      const errs = [];
      const jobs = [];
      if (cfg.channels.feishuWebhook) {
        jobs.push(pushFeishu(cfg.channels.feishuWebhook, text).catch((e) => errs.push("feishu:" + e.message)));
      }
      if (cfg.channels.tgToken && cfg.channels.tgChatId) {
        jobs.push(pushTelegram(cfg.channels.tgToken, cfg.channels.tgChatId, text).catch((e) => errs.push("tg:" + e.message)));
      }
      await Promise.all(jobs);
      if (jobs.length === 0) status = "skipped_no_channel";
      else status = errs.length ? "error" : "pushed";
      detail = `${detail} sent=${jobs.length - errs.length}/${jobs.length}${errs.length ? " err=" + errs.join(";").slice(0, 200) : ""}`;
    }
    await env.DB.prepare("INSERT OR REPLACE INTO deliveries (bundle_id, date, status, detail) VALUES (?, ?, ?, ?)")
      .bind(b.id, date, status, detail.slice(0, 500)).run();
    report.push({ bundle: b.token.slice(0, 6) + "…", status, detail });
  }
  return json({ ok: true, date, nvd: nvd.length, kev: kev.length, bundles: report });
}

async function queryApi(env, url) {
  const q = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 40);
  const minScore = Math.min(10, Math.max(0, Number(url.searchParams.get("min_score")) || 0));
  const days = Math.min(30, Math.max(1, Number(url.searchParams.get("days")) || 7));
  const { results } = await env.DB.prepare("SELECT date, nvd FROM daily_vulns ORDER BY date DESC LIMIT ?").bind(days).all();
  const out = [];
  for (const row of results) {
    for (const r of JSON.parse(row.nvd)) {
      if ((!q || `${r.id} ${r.keyword} ${r.desc}`.toLowerCase().includes(q)) && (r.score ?? 0) >= minScore) {
        out.push({ date: row.date, ...r });
      }
    }
  }
  out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.id < b.id ? -1 : 1));
  return json({ days, q, min_score: minScore, count: out.length, results: out.slice(0, 200) });
}

// ---------- RSS ----------

async function rssFeed(env, url, token) {
  const b = await loadBundle(env, token);
  if (!b) return new Response("not found", { status: 404 });
  const { results } = await env.DB.prepare(
    "SELECT date, nvd, kev FROM daily_vulns ORDER BY date DESC LIMIT 14"
  ).all();
  const items = [];
  for (const row of results) {
    const { nvdHit, kevHit } = filterFor(b.config, JSON.parse(row.nvd), JSON.parse(row.kev));
    for (const v of kevHit) {
      items.push({
        title: `🚨KEV ${v.cveID} ${v.vulnerabilityName || ""}`.slice(0, 140),
        link: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
        desc: `${v.vulnerabilityName || ""}（${v.product || ""}，CISA KEV added ${v.dateAdded}）`,
        date: row.date,
      });
    }
    for (const r of nvdHit) {
      items.push({
        title: `[${r.score ?? "-"} ${r.severity || "-"}] ${r.id} (${r.keyword})`,
        link: `https://nvd.nist.gov/vuln/detail/${r.id}`,
        desc: r.desc || "",
        date: row.date,
      });
    }
    if (items.length > 150) break;
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>vuln-radar · ${esc(b.config.name)}</title>
<link>${esc(url.origin)}/b/${token}</link>
<description>按订阅过滤的每日漏洞情报（数据源 NVD + CISA KEV）</description>
${items.slice(0, 100).map((it) => `<item>
<title>${esc(it.title)}</title>
<link>${esc(it.link)}</link>
<description>${esc(it.desc)}</description>
<pubDate>${new Date(it.date + "T01:00:00Z").toUTCString()}</pubDate>
<guid isPermaLink="false">${esc(it.date + "-" + it.link.split("/").pop())}</guid>
</item>`).join("\n")}
</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}

// ---------- 页面 ----------

const CSS = `body{font-family:system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;max-width:720px;margin:40px auto;padding:0 16px;color:#1a1a2e;background:#fafafa}
h1{font-size:1.4em}h2{font-size:1.1em;margin-top:28px}code{background:#eee;padding:2px 6px;border-radius:4px;font-size:.9em;word-break:break-all}
.card{background:#fff;border:1px solid #e2e2e2;border-radius:8px;padding:20px;margin:16px 0}
label{display:block;margin:10px 0 4px;font-size:14px;color:#444}
input[type=text],input[type=url],input[type=number]{width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.chip{border:1px solid #ccc;border-radius:14px;padding:4px 12px;cursor:pointer;font-size:14px;user-select:none}
.chip.on{background:#2563eb;border-color:#2563eb;color:#fff}
button{background:#2563eb;color:#fff;border:none;border-radius:6px;padding:10px 18px;margin-top:14px;cursor:pointer;font-size:15px}
button.danger{background:#dc2626}
.hint{font-size:12px;color:#888;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-bottom:1px solid #eee;padding:6px 4px;text-align:left}
.ok{color:#16a34a}.err{color:#dc2626}
a{color:#2563eb}`;

function formHtml(cfg, submitLabel) {
  const chips = Object.keys(LANG_KEYWORDS)
    .map((l) => `<span class="chip${cfg.langs.includes(l) ? " on" : ""}" data-lang="${l}">${l}</span>`)
    .join("");
  return `
<div class="card">
  <label>订阅包名称</label>
  <input type="text" id="f-name" maxlength="60" value="${esc(cfg.name)}">
  <label>关注语言（对应 NVD 关键词：${esc(Object.entries(LANG_KEYWORDS).map(([l, ks]) => l + "=" + ks.join("/")).join("， "))}）</label>
  <div class="chips" id="f-langs">${chips}</div>
  <label>自定义关键词（逗号分隔，可空）</label>
  <input type="text" id="f-keywords" placeholder="tomcat, struts, laravel" value="${esc(cfg.keywords.join(", "))}">
  <label>CVSS 下限（0-10，默认 0 全保留）</label>
  <input type="number" id="f-minscore" min="0" max="10" step="0.5" value="${cfg.minScore}">
  <label><input type="checkbox" id="f-kev"${cfg.includeKEV ? " checked" : ""}> 包含 CISA KEV 当日新增（在野利用，建议开启）</label>
  <h2>推送渠道（可空；留空则只用 RSS）</h2>
  <label>飞书群机器人 Webhook</label>
  <input type="url" id="f-feishu" placeholder="https://open.feishu.cn/open-apis/bot/v2/..." value="${esc(cfg.channels.feishuWebhook)}">
  <label>Telegram Bot Token</label>
  <input type="text" id="f-tgtoken" placeholder="123456:ABC-DEF..." value="${esc(cfg.channels.tgToken)}">
  <label>Telegram Chat ID</label>
  <input type="text" id="f-tgchat" placeholder="-1001234567890" value="${esc(cfg.channels.tgChatId)}">
  <p class="hint">无账号体系：管理链接即凭证，请勿外传。渠道密钥仅存于你部署的 D1，仅用于向你推送。</p>
  <button id="f-submit">${submitLabel}</button>
  <span id="f-msg"></span>
</div>`;
}

const COLLECT_JS = `
function collect(){
  const langs=[...document.querySelectorAll('#f-langs .chip.on')].map(c=>c.dataset.lang);
  return {
    name: document.getElementById('f-name').value,
    langs,
    keywords: document.getElementById('f-keywords').value.split(',').map(s=>s.trim()).filter(Boolean),
    minScore: Number(document.getElementById('f-minscore').value)||0,
    includeKEV: document.getElementById('f-kev').checked,
    channels: {
      feishuWebhook: document.getElementById('f-feishu').value,
      tgToken: document.getElementById('f-tgtoken').value,
      tgChatId: document.getElementById('f-tgchat').value,
    },
  };
}`;

function homePage() {
  return page(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>vuln-radar · 漏洞订阅</title><style>${CSS}</style></head><body>
<h1>vuln-radar 个人漏洞订阅</h1>
<p>自选语言 / 关键词 / 评分阈值，每天自动过滤 NVD + CISA KEV 情报：推送到飞书 / Telegram，或用专属 RSS 订阅。无需注册账号。<a href="https://github.com/catgrandfa/vuln-radar">GitHub</a></p>
<form id="create">${formHtml({ name: "我的订阅", langs: Object.keys(LANG_KEYWORDS), keywords: [], minScore: 0, includeKEV: true, channels: { feishuWebhook: "", tgToken: "", tgChatId: "" } }, "创建订阅包")}</form>
<h2>按需查询（已入库数据）</h2>
<div class="card">
  <label>关键词（可空 = 全部；命中 CVE 编号 / 语言关键词 / 简介）</label>
  <input type="text" id="q-q" placeholder="spring">
  <label>回看天数（1-30）与 CVSS 下限</label>
  <input type="number" id="q-days" min="1" max="30" value="7">
  <input type="number" id="q-min" min="0" max="10" value="0">
  <button id="q-btn">查询</button>
  <div id="q-out"></div>
</div>
<script>
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>c.classList.toggle('on'));
${COLLECT_JS}
document.getElementById('f-submit').onclick=async(e)=>{
  e.preventDefault();
  const msg=document.getElementById('f-msg');
  const r=await fetch('/api/bundles',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(collect())});
  if(r.ok){const d=await r.json();location='/b/'+d.token;}
  else{msg.textContent=' 创建失败：'+(await r.text());msg.className='err';}
};
document.getElementById('q-btn').onclick=async()=>{
  const p=new URLSearchParams({q:document.getElementById('q-q').value,days:document.getElementById('q-days').value,min_score:document.getElementById('q-min').value});
  const d=await(await fetch('/api/query?'+p)).json();
  document.getElementById('q-out').innerHTML='<p>共 '+d.count+' 条（展示前 50）</p><table><tr><th>评分</th><th>CVE</th><th>关键词</th><th>日期</th><th>简介</th></tr>'+
    d.results.slice(0,50).map(r=>'<tr><td>'+r.score+'</td><td><a href="https://nvd.nist.gov/vuln/detail/'+r.id+'">'+r.id+'</a></td><td>'+r.keyword+'</td><td>'+r.date+'</td><td>'+String(r.desc||'').slice(0,80)+'</td></tr>').join('')+'</table>';
};
</script></body></html>`);
}

async function managePage(env, url, token) {
  const b = await loadBundle(env, token);
  if (!b) return new Response("订阅包不存在（可能已删除）。回到首页重新创建。", { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  return page(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>vuln-radar · ${esc(b.config.name)}</title><style>${CSS}</style></head><body>
<h1>管理订阅包「${esc(b.config.name)}」</h1>
<p>个人 RSS：<a href="/feed/${token}.xml"><code>/feed/${token.slice(0, 8)}….xml</code></a>（完整地址即下方链接，请保存）<br>
管理链接即凭证，泄露 = 他人可改/删你的订阅。</p>
<form id="update">${formHtml(b.config, "保存修改")}</form>
<button class="danger" id="del">删除此订阅包</button>
<h2>最近投递</h2>
<div class="card"><table id="d-table"><tr><th>日期</th><th>状态</th><th>详情</th></tr></table></div>
<script>
const TOKEN=${JSON.stringify(token)};
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>c.classList.toggle('on'));
${COLLECT_JS}
document.getElementById('f-submit').onclick=async(e)=>{
  e.preventDefault();
  const r=await fetch('/api/bundles/'+TOKEN,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(collect())});
  const m=document.getElementById('f-msg');m.textContent=r.ok?' 已保存':' 保存失败';m.className=r.ok?'ok':'err';
};
document.getElementById('del').onclick=async()=>{
  if(!confirm('确认删除该订阅包？不可恢复。'))return;
  await fetch('/api/bundles/'+TOKEN,{method:'DELETE'});location='/';
};
(async()=>{
  const d=await(await fetch('/api/bundles/'+TOKEN)).json();
  const rows=(d.deliveries||[]).map(x=>'<tr><td>'+x.date+'</td><td class="'+(x.status==='pushed'?'ok':(x.status==='error'?'err':''))+'">'+x.status+'</td><td>'+x.detail+'</td></tr>').join('');
  document.getElementById('d-table').innerHTML='<tr><th>日期</th><th>状态</th><th>详情</th></tr>'+(rows||'<tr><td colspan=3>暂无（每天 ingest 后更新）</td></tr>');
})();
</script></body></html>`);
}

// ---------- 路由 ----------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (request.method === "GET" && (path === "/" || path === "/index.html")) return homePage();
      if (request.method === "POST" && path === "/api/bundles") return createBundle(request, env, url);
      if (request.method === "POST" && path === "/api/ingest") return ingest(request, env, url);
      if (request.method === "GET" && path === "/api/query") return queryApi(env, url);
      let m;
      if ((m = path.match(/^\/api\/bundles\/([A-Za-z0-9_-]+)$/))) {
        if (request.method === "GET") return getBundle(env, url, m[1]);
        if (request.method === "PUT") return updateBundle(request, env, m[1]);
        if (request.method === "DELETE") return deleteBundle(env, m[1]);
      }
      if ((m = path.match(/^\/b\/([A-Za-z0-9_-]+)$/)) && request.method === "GET") return managePage(env, url, m[1]);
      if ((m = path.match(/^\/feed\/([A-Za-z0-9_-]+?)(?:\.xml)?$/)) && request.method === "GET") return rssFeed(env, url, m[1]);
      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 500);
    }
  },
};
