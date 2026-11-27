import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

export const name = 'zua-panel';

const PORT = 27127;
const JW_BASE = 'http://jwglxt.zua.edu.cn';
const DEBUG_HOME = 'C:/Users/13102/Desktop/白龍/dsh/.zua-panel-home.html';
const DEBUG_TIMETABLE = 'C:/Users/13102/Desktop/白龍/dsh/.zua-panel-timetable.html';

const jw = {
  cookies: new Map(),
  loggedIn: false,
  username: '',
  links: [],
};

function send(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-private-network': 'true',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function cookieHeader() {
  return [...jw.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
}

function saveCookies(res) {
  const list = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const line of list) {
    const pair = line.split(';')[0];
    const i = pair.indexOf('=');
    if (i > 0) jw.cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
}

async function jwFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : JW_BASE + path;
  const res = await fetch(url, {
    ...options,
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      'accept-language': 'zh-CN,zh;q=0.9',
      ...(options.headers || {}),
      cookie: cookieHeader(),
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });
  saveCookies(res);
  return res;
}

async function jwText(res) {
  const buffer = Buffer.from(await res.arrayBuffer());
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  const bad = (utf8.match(/\uFFFD/g) || []).length;
  if (bad === 0 || bad / Math.max(1, utf8.length) < 0.01) return utf8;
  try {
    return new TextDecoder('gbk').decode(buffer);
  } catch {
    return utf8;
  }
}

function selectedOption(html, id) {
  const block = (html.match(new RegExp('<select[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)</select>', 'i')) || [])[1] || '';
  const selected =
    (block.match(/<option[^>]*value="([^"]*)"[^>]*selected/i) || [])[1] ||
    (block.match(/<option[^>]*selected[^>]*value="([^"]*)"/i) || [])[1];
  if (selected !== undefined) return selected;
  return (block.match(/<option[^>]*value="([^"]*)"/i) || [])[1] || '';
}

async function fetchTimetablePage(requestedWeek = 0) {
  const actionRes = await jwFetch('/eams/courseTableForStd.action');
  let actionPage = await jwText(actionRes);
  if (actionRes.status !== 200) {
    const location = actionRes.headers.get('location');
    if (!location) return { html: '', week: 0 };
    const next = await jwFetch(location);
    actionPage = await jwText(next);
  }

  const semester = (actionPage.match(/name="semester\.id"[^>]*value="([^"]*)"/) || [])[1] || '';
  const project = (actionPage.match(/name="project\.id"[\s\S]{0,600}?<option[^>]*value="([^"]*)"/) || [])[1] || '';
  const kind = selectedOption(actionPage, 'courseTableType') || 'std';
  const pageWeek = parseInt(selectedOption(actionPage, 'startWeek'), 10) || 0;
  const startWeek = String(requestedWeek > 0 ? requestedWeek : Math.max(1, pageWeek));
  const ids = (actionPage.match(/addInput\(form,"ids","(\d+)"/) || [])[1] || '';

  const body = new URLSearchParams({
    ignoreHead: '1',
    'setting.kind': kind,
    startWeek,
    ...(project ? { 'project.id': project } : {}),
    ...(semester ? { 'semester.id': semester } : {}),
    ...(ids ? { ids } : {}),
  });

  const res = await jwFetch('/eams/courseTableForStd!courseTable.action', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      referer: JW_BASE + '/eams/courseTableForStd.action',
      origin: JW_BASE,
    },
    body,
  });
  if (res.status !== 200) return { html: '', week: Number(startWeek) || 0 };
  return { html: await jwText(res), week: Number(startWeek) || 0 };
}

function splitArgs(input) {
  const parts = [];
  let current = '';
  let quote = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === '\\') {
        current += ch + (input[++i] || '');
        continue;
      }
      if (ch === quote) quote = '';
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ',') {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current.trim());
  return parts;
}

function unquote(value) {
  return String(value == null ? '' : value).replace(/^["']|["']$/g, '').trim();
}

function cleanCourseName(raw) {
  let name = unquote(raw)
    .replace(/[（(]\s*\d+\.[A-Za-z0-9.]+\s*[）)]\s*$/, '')
    .replace(/\s*\d+\.[A-Za-z0-9.]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.endsWith(')')) {
    if (name.includes('（')) name = name.slice(0, -1) + '）';
    else if (!name.includes('(')) name = name.slice(0, -1).trim();
  } else if (name.endsWith('）')) {
    if (name.includes('(')) name = name.slice(0, -1) + ')';
    else if (!name.includes('（')) name = name.slice(0, -1).trim();
  }
  return name;
}

function weeksFromBits(bits) {
  const runs = [];
  let start = -1;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      if (start < 0) start = i;
    } else if (start >= 0) {
      runs.push([start, i - 1]);
      start = -1;
    }
  }
  if (start >= 0) runs.push([start, bits.length - 1]);
  return runs.map(([a, b]) => (a === b ? String(a) : `${a}-${b}`)).join(',');
}

function parseCourseTable(html) {
  const activities = [];
  let current = null;
  for (const line of html.split(/\r?\n/)) {
    const call = line.match(/new\s+TaskActivity\((.*)\);\s*$/);
    if (call) {
      const args = splitArgs(call[1]).map(unquote);
      current = {
        name: cleanCourseName(args[3] || args[2]),
        place: args[5].replace(/\s+/g, ' ').trim(),
        weeks: args[6].trim(),
        slots: new Map(),
      };
      activities.push(current);
      continue;
    }
    const index = line.match(/index\s*=\s*(\d+)\s*\*\s*unitCount\s*\+\s*(\d+)/);
    if (index && current) {
      const day = parseInt(index[1], 10);
      const period = parseInt(index[2], 10);
      if (!current.slots.has(day)) current.slots.set(day, new Set());
      current.slots.get(day).add(period);
    }
  }
  const rows = [];
  for (const act of activities) {
    if (!act.name) continue;
    for (const [day, set] of act.slots) {
      const periods = [...set].sort((a, b) => a - b);
      if (!periods.length) continue;
      const pushRun = (a, b) =>
        rows.push({
          day: day + 1,
          periods: a === b ? String(a + 1) : `${a + 1}-${b + 1}`,
          name: act.name,
          place: act.place,
          weeks: act.weeks ? weeksFromBits(act.weeks) : '',
        });
      let runStart = periods[0];
      let prev = periods[0];
      for (let i = 1; i < periods.length; i++) {
        if (periods[i] === prev + 1) {
          prev = periods[i];
          continue;
        }
        pushRun(runStart, prev);
        runStart = periods[i];
        prev = periods[i];
      }
      pushRun(runStart, prev);
    }
  }
  return rows;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(td|th|tr|div|p|li|h\d|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t\u3000]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

const PARSE_PROMPT = `下面是从教务系统课表页面提取的文本（可能有空白和对齐噪声）。请提取全部课程，只输出一个 JSON 对象：
{"week": 11, "courses": [{"day":1,"periods":"1-2","name":"高等数学I（一）","place":"11,01B304","weeks":"1-16"}]}
规则：
1. week 是页面顶部「第N周」或「选择教学周」里的 N；没有就 null。
2. day：1-7 表示周一到周日。
3. periods：该课程覆盖的节次，如 "1-2"、"3-4"、"5-6"。
4. name：只写课程名，不带教师、序号、教室。
5. place：教室，没有就空字符串。
6. weeks：课程里的「第n周-第m周」转成 "n-m"；没有就空字符串。
7. 同一门课多个时间段就拆多条；看不清的字段留空，不要编造。`;

async function llmParse(ctx, text) {
  const llm = ctx.get('llm');
  if (!llm) return { error: 'llm unavailable' };
  const selection = ctx.get('agentDefaultModel')?.currentSelection?.();
  const provider = selection?.provider;
  const model = selection?.model;
  if (!provider || !model) return { error: 'no model configured' };
  let output = '';
  try {
    for await (const chunk of llm.stream({
      provider,
      model,
      system: '你只输出 JSON 对象，不要输出分析过程。',
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: PARSE_PROMPT + '\n\n--- 课表文本开始 ---\n' + text.slice(0, 14000) }],
        },
      ],
      maxTokens: 6000,
      temperature: 0,
      signal: AbortSignal.timeout(120000),
    })) {
      if (chunk.type === 'text-delta') output += chunk.text;
      else if (chunk.type === 'finish' && chunk.reason?.kind === 'error') {
        throw new Error(chunk.reason.failure?.message || 'model error');
      }
    }
  } catch (error) {
    return { error: String(error?.message || error) };
  }
  let match = output.match(/\{[\s\S]*\}/);
  if (!match) {
    const cleaned = output.replace(/```(?:json)?/gi, '').trim();
    match = cleaned.match(/\{[\s\S]*\}/);
  }
  try {
    await writeFile('C:/Users/13102/Desktop/白龍/dsh/.zua-panel-llm.txt', output, 'utf8');
  } catch {}
  if (!match) return { error: 'model returned no JSON', text: output.slice(0, 800) };
  try {
    const data = JSON.parse(match[0]);
    return { week: Number(data.week) || 0, courses: Array.isArray(data.courses) ? data.courses : [] };
  } catch (error) {
    return { error: 'invalid model JSON', text: output.slice(0, 500) };
  }
}

const BILL_PROMPT = `你是账单识别助手。截图可能是支付宝、微信、银行或校园卡的支付记录列表。
请提取其中所有【支出】记录，只输出一个 JSON 数组，不要输出解释或 Markdown 代码块：
[{"date":"2026-11-27","amount":25.5,"desc":"食堂午饭","category":"餐饮"}]
规则：
1. 只保留支出，忽略收入、退款、转账到本人账户。
2. amount 用正数，不要带货币符号。
3. date 用 YYYY-MM-DD；截图只有月-日时补当前年份（2026）。
4. desc 是商户/商品/备注原文，尽量简短，不要猜。
5. category 只能取：餐饮、交通、购物、学习、娱乐、医疗、住宿、通讯、其他。
6. 看不清或不确定的记录直接跳过，不要编造。`;

async function pickVisionModel(ctx) {
  const llm = ctx.get('llm');
  if (!llm) return undefined;
  const selection = ctx.get('agentDefaultModel')?.currentSelection?.();
  const candidates = [];
  if (selection?.provider && selection?.model) candidates.push([selection.provider, selection.model]);
  for (const provider of llm.listProviders?.() || []) {
    let models = [];
    try {
      models = await llm.listModels(provider.id);
    } catch {
      continue;
    }
    for (const model of models) {
      if ((model.inputModalities || []).includes('image')) candidates.push([provider.id, model.id]);
    }
  }
  for (const [provider, model] of candidates) {
    try {
      const info = await llm.resolveModelInfo(provider, model);
      if ((info.inputModalities || []).includes('image')) return { provider, model };
    } catch {}
  }
  return undefined;
}

async function handleBillsParse(ctx, req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return send(res, 413, { error: String(error?.message || error) });
  }

  let parsed;
  try {
    parsed = JSON.parse(body.toString('utf8'));
  } catch {
    return send(res, 400, { error: 'invalid json' });
  }
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(String(parsed.dataUrl || ''));
  if (!match) return send(res, 400, { error: 'invalid image data' });
  const mediaType = match[1].toLowerCase();
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mediaType)) {
    return send(res, 400, { error: 'unsupported image type' });
  }

  const attachments = ctx.get('attachments');
  if (!attachments) return send(res, 503, { error: 'attachments unavailable' });
  let ref;
  try {
    ref = await attachments.saveImage({
      data: new Uint8Array(Buffer.from(match[2], 'base64')),
      mediaType,
      name: 'bill',
    });
  } catch (error) {
    return send(res, 400, { error: `image rejected: ${error?.message || error}` });
  }

  const picked = await pickVisionModel(ctx);
  if (!picked) return send(res, 400, { error: 'no vision model available' });

  const llm = ctx.get('llm');
  let output = '';
  try {
    for await (const chunk of llm.stream({
      provider: picked.provider,
      model: picked.model,
      system: '你只输出 JSON 数组，不要输出分析过程。',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: BILL_PROMPT },
            { type: 'image', attachment: ref },
          ],
        },
      ],
      maxTokens: 12000,
      temperature: 0,
      signal: AbortSignal.timeout(120000),
    })) {
      if (chunk.type === 'text-delta') output += chunk.text;
      else if (chunk.type === 'finish' && chunk.reason?.kind === 'error') {
        throw new Error(chunk.reason.failure?.message || 'model error');
      }
    }
  } catch (error) {
    return send(res, 502, { error: String(error?.message || error), model: picked });
  }

  let text = output.replace(/```(?:json)?/gi, '').trim();
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return send(res, 200, { ok: true, transactions: [], error: '模型没有返回 JSON 数组', raw: text.slice(0, 300) });
  let list;
  try {
    list = JSON.parse(arrayMatch[0]);
  } catch {
    return send(res, 200, { ok: true, transactions: [], error: 'JSON 解析失败', raw: text.slice(0, 300) });
  }
  const allowed = ['餐饮', '交通', '购物', '学习', '娱乐', '医疗', '住宿', '通讯', '其他'];
  const transactions = (Array.isArray(list) ? list : [])
    .map((item) => {
      const amount = Math.abs(Number(item.amount) || 0);
      const date = String(item.date || '').replace(/[/.]/g, '-');
      const category = allowed.includes(item.category) ? item.category : '其他';
      return {
        date,
        amount: Math.round(amount * 100) / 100,
        desc: String(item.desc || '').trim() || '未备注',
        category,
      };
    })
    .filter((item) => item.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(item.date));

  send(res, 200, { ok: true, transactions, model: picked });
}

async function loginJw(ctx, username, password, requestedWeek = 0) {
  jw.cookies.clear();
  jw.loggedIn = false;
  jw.links = [];

  let res = await jwFetch('/eams/loginExt.action', { headers: {} });
  const html = await jwText(res);
  const csrf = (html.match(/name="_csrf"[^>]*value="([^"]+)"/) || [])[1] || '';
  const salt = (html.match(/CryptoJS\.SHA1\('([^']+)'\s*\+\s*form\['password'\]\.value\)/) || [])[1] || '';
  if (!csrf) return { ok: false, error: '登录页解析失败（没有找到 _csrf）' };
  if (!salt) return { ok: false, error: '登录页解析失败（没有找到密码盐值）' };

  await new Promise((resolve) => setTimeout(resolve, 4000));
  const body = new URLSearchParams({
    needModify: '0',
    _csrf: csrf,
    username: String(username),
    password: createHash('sha1').update(salt + String(password)).digest('hex'),
    session_locale: 'zh_CN',
    login_from: 'login_from',
    submitBtn: '登录',
  });

  res = await jwFetch('/eams/loginExt.action', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      referer: JW_BASE + '/eams/loginExt.action',
      origin: JW_BASE,
    },
    body,
  });
  let page = await jwText(res);
  if (/id="loginForm"/.test(page)) {
    const error = page.match(/<div[^>]*ui-state-error[^>]*>([\s\S]{0,400})<\/div>/i);
    const message = error ? error[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '登录失败';
    return { ok: false, error: message };
  }

  const location = res.headers.get('location');
  if (location) {
    const next = await jwFetch(location);
    page = await jwText(next);
  } else {
    const home = await jwFetch('/eams/homeExt.action');
    page = await jwText(home);
  }

  jw.loggedIn = true;
  jw.username = String(username);
  jw.links = [...page.matchAll(/href="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((href) => /courseTable|table|kebiao|schedule|课表/i.test(href))
    .slice(0, 20);
  try {
    await writeFile(DEBUG_HOME, page, 'utf8');
  } catch {}

  let table = { html: '', week: requestedWeek || 0 };
  try {
    table = await fetchTimetablePage(requestedWeek);
  } catch {}

  if (!table.html) return { ok: true, username: jw.username, courses: [], week: table.week || 0, error: '登录成功但没抓到课表页' };

  try {
    await writeFile(DEBUG_TIMETABLE, table.html, 'utf8');
  } catch {}

  const courses = parseCourseTable(table.html);
  if (!courses.length) {
    return { ok: true, username: jw.username, courses: [], week: table.week || 0, error: '没解析出课程（页面里没有 TaskActivity 数据）' };
  }
  return { ok: true, username: jw.username, week: table.week || 0, courses };
}

async function handleJw(ctx, req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = req.url || '';
  if (url.startsWith('/zua-panel/jw/status')) {
    return send(res, 200, { loggedIn: jw.loggedIn, username: jw.username, links: jw.links });
  }
  if (url.startsWith('/zua-panel/jw/debug')) {
    const query = new URL('http://x' + url).searchParams;
    const path = query.get('path') || '';
    if (!path) return send(res, 400, { error: 'path required' });
    try {
      const r = await jwFetch(path);
      const text = await jwText(r);
      try {
        await writeFile('C:/Users/13102/Desktop/白龍/dsh/.zua-panel-debug.html', text, 'utf8');
      } catch {}
      return send(res, 200, {
        status: r.status,
        contentType: r.headers.get('content-type') || '',
        length: text.length,
        text: text.slice(0, 1500),
      });
    } catch (error) {
      return send(res, 502, { error: String(error?.message || error) });
    }
  }
  if (url.startsWith('/zua-panel/jw/login')) {
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
    let body;
    try {
      body = JSON.parse((await readBody(req)).toString('utf8'));
    } catch {
      return send(res, 400, { error: 'invalid json' });
    }
    if (!body.username || !body.password) return send(res, 400, { error: 'username and password required' });
    try {
      const result = await loginJw(ctx, body.username, body.password, Number(body.week) || 0);
      console.log('[zua-panel] login result:', JSON.stringify({ ok: result.ok, error: result.error, courses: (result.courses || []).length }).slice(0, 300));
      return send(res, result.ok ? 200 : 400, result);
    } catch (error) {
      return send(res, 502, { error: String(error?.message || error) });
    }
  }
  return send(res, 404, { error: 'not found' });
}

export { parseCourseTable };

export function apply(ctx) {
  try {
    const server = createServer((req, res) => {
      console.log('[zua-panel]', req.method, req.url);
      if (req.url && req.url.startsWith('/zua-panel/bills/parse')) {
        Promise.resolve(handleBillsParse(ctx, req, res)).catch((error) => {
          try {
            send(res, 500, { error: String(error?.message || error) });
          } catch {}
        });
        return;
      }
      if (req.url && req.url.startsWith('/zua-panel/jw/')) {
        Promise.resolve(handleJw(ctx, req, res)).catch((error) => {
          try {
            send(res, 500, { error: String(error?.message || error) });
          } catch {}
        });
        return;
      }
      send(res, 404, { error: 'not found' });
    });
    server.on('error', (error) => console.log('[zua-panel] server error:', error?.message || error));
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[zua-panel] listening on 127.0.0.1:${PORT}`);
    });
    ctx.effect(
      () => () => {
        try {
          server.close();
        } catch {}
      },
      'zua-panel: local server',
    );
  } catch (error) {
    console.log('[zua-panel] server setup failed:', error?.message || error);
  }
}
