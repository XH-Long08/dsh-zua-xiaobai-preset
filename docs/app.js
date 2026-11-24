const SLOTS = [
  { label: '1-2', start: '08:00', end: '09:40' },
  { label: '3-4', start: '10:00', end: '11:40' },
  { label: '5-6', start: '14:30', end: '16:10' },
  { label: '7-8', start: '16:30', end: '18:10' },
  { label: '9-10', start: '19:30', end: '21:10' },
];

const SEM1_START = new Date(2026, 8, 7);
const SEM2_START = new Date(2027, 1, 22);
const KEY_DATES = {
  sem1Exam: new Date(2027, 0, 11),
  sem1End: new Date(2027, 0, 18),
  sem2Exam: new Date(2027, 5, 28),
  sem2End: new Date(2027, 6, 5),
};

const DAY_NAMES = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const DAY_CHARS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };

const LINKS = [
  ['教务系统', 'http://jwglxt.zua.edu.cn/eams/loginExt.action'],
  ['智慧门户', 'https://sfrz.zua.edu.cn/'],
  ['教务处', 'https://jwc.zua.edu.cn/'],
  ['选课指南', 'https://jwc.zua.edu.cn/jwgl/xsxkzn.htm'],
  ['图书馆', 'https://lib.zua.edu.cn/'],
  ['校医院', 'https://xyy.zua.edu.cn/'],
  ['招生办', 'http://zsxxw.zua.edu.cn/'],
  ['学校官网', 'https://www.zua.edu.cn/'],
];

const CAMPUS = [
  {
    title: '校门',
    items: [
      ['西门', '文苑西路，学校正门；公交「郑航龙子湖校区西门站」'],
      ['北门', '平安大道，近 8 号实验楼、专家公寓'],
      ['东门', '龙子湖西路，近专家公寓、东操场'],
      ['南门', '相济路，近行政楼、近邻宝'],
    ],
  },
  {
    title: '学习与生活',
    items: [
      ['图书馆', '校园中心，东侧邻沁湖'],
      ['综合楼 / 航空文化馆', '图书馆西北、北侧'],
      ['西苑餐厅', '1-2-3 号楼再往西，近 20-25 号楼'],
      ['东苑餐厅', '东南，近 12-13 号楼'],
      ['民族餐厅', '东苑餐厅西南角'],
      ['近邻宝', '24-25 号楼南、西篮球场北；京东在内、顺丰再往里'],
      ['丹尼斯超市', '东南，近 12-13 号楼和相济路'],
    ],
  },
  {
    title: '运动与医疗',
    items: [
      ['东操场 / 体育馆 / 羽毛球馆', '校园东侧'],
      ['西操场 / 网球场 / 训练馆 / 排球场', '校园西南角'],
      ['校医院（郑航医院）', '行政办公楼 A 楼，南门里侧；急诊 24 小时'],
      ['心理发展指导中心', '图书馆/学生中心一带，具体以官网为准'],
    ],
  },
  {
    title: '校外到校',
    items: [
      ['地铁', '12 号线「龙子湖西站」，周末有学校 ⇄ 地铁站接驳专线'],
      ['公交', '115 路等「郑航龙子湖校区西门站」'],
      ['导航', '地图 App 搜「郑州航空工业管理学院(龙子湖校区)」'],
      ['地址', '郑州市郑东新区文苑西路 15 号（450046）'],
    ],
  },
];

const STORE_KEY = 'zua-mobile-timetable-v1';
const $ = (sel) => document.querySelector(sel);

function pad(n) {
  return String(n).padStart(2, '0');
}
function dayDiff(a, b) {
  return Math.round((a - b) / 86400000);
}
function fmtDate(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
function timeToMinutes(value) {
  const [h, m] = String(value || '').split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}
function slotOf(periods) {
  const first = parseInt(String(periods || '').split(/[-~～]/)[0], 10);
  if (!Number.isFinite(first)) return 0;
  return Math.max(1, Math.min(5, Math.ceil(first / 2)));
}
function slotTime(periods) {
  const index = slotOf(periods);
  return index ? SLOTS[index - 1] : undefined;
}
function weekIncluded(weeks, week) {
  if (!weeks) return true;
  const text = String(weeks).replace(/[第周\s]/g, '');
  for (const part of text.split(',')) {
    if (!part) continue;
    const [a, b] = part.split('-').map((v) => parseInt(v, 10));
    if (!Number.isFinite(a)) continue;
    if (!Number.isFinite(b) ? week === a : week >= a && week <= b) return true;
  }
  return false;
}

function weekInfo(now) {
  if (now < SEM2_START) {
    const week = Math.floor(dayDiff(now, SEM1_START) / 7) + 1;
    return {
      semester: '第一学期',
      week: Math.max(1, Math.min(week, 19)),
      examIn: dayDiff(KEY_DATES.sem1Exam, now),
      endIn: dayDiff(KEY_DATES.sem1End, now),
      examLabel: '考试周',
      endLabel: '寒假',
    };
  }
  const week = Math.floor(dayDiff(now, SEM2_START) / 7) + 1;
  return {
    semester: '第二学期',
    week: Math.max(1, Math.min(week, 19)),
    examIn: dayDiff(KEY_DATES.sem2Exam, now),
    endIn: dayDiff(KEY_DATES.sem2End, now),
    examLabel: '考试周',
    endLabel: '暑假',
  };
}

function loadTimetable() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function saveTimetable(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}
function parseTimetable(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    const m = s.match(/^周([一二三四五六日天])\s*([0-9]+(?:\s*[-~～至]\s*[0-9]+)?)\s*节?\s*(.*)$/);
    if (!m) continue;
    let rest = m[3] || '';
    let weeks = '';
    const wm = rest.match(/(?:第)?\s*([0-9]+(?:\s*[-,，]\s*[0-9]+)*)\s*周\s*$/);
    if (wm) {
      weeks = wm[1].replace(/\s+/g, '');
      rest = rest.slice(0, wm.index).trim();
    }
    const parts = rest.split(/\s+/);
    const name = parts.shift() || '';
    out.push({
      day: DAY_CHARS[m[1]],
      periods: m[2].replace(/\s+/g, '').replace(/[~～至]/g, '-'),
      name,
      place: parts.join(' '),
      weeks,
    });
  }
  return out;
}

function todayCourses(timetable, week) {
  const now = new Date();
  const today = now.getDay() === 0 ? 7 : now.getDay();
  return timetable
    .filter((c) => c.day === today && weekIncluded(c.weeks, week))
    .sort((a, b) => (parseInt(a.periods, 10) || 0) - (parseInt(b.periods, 10) || 0));
}

function nextCourse(timetable, week) {
  const now = new Date();
  const today = now.getDay() === 0 ? 7 : now.getDay();
  const list = timetable
    .filter((c) => c.day === today && weekIncluded(c.weeks, week))
    .map((c) => ({ course: c, info: slotTime(c.periods) }))
    .filter((x) => x.info)
    .sort((a, b) => timeToMinutes(a.info.start) - timeToMinutes(b.info.start));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const ongoing = list.find(
    (x) => timeToMinutes(x.info.start) <= nowMin && nowMin <= timeToMinutes(x.info.end),
  );
  const next = list.find((x) => timeToMinutes(x.info.start) > nowMin);
  return { ongoing, next, list };
}

function renderHome() {
  const now = new Date();
  const info = weekInfo(now);
  const timetable = loadTimetable();
  const courses = todayCourses(timetable, info.week);
  const { ongoing, next } = nextCourse(timetable, info.week);
  const today = now.getDay() === 0 ? 7 : now.getDay();

  const upcoming = ongoing
    ? `正在上课 · 第 ${ongoing.info.label} 节 ${ongoing.info.start}-${ongoing.info.end} · ${ongoing.course.name}${ongoing.course.place ? ' · ' + ongoing.course.place : ''}`
    : next
      ? `即将开始 · 第 ${next.info.label} 节 ${next.info.start}-${next.info.end} · ${next.course.name}${next.course.place ? ' · ' + next.course.place : ''}`
      : courses.length
        ? '今天的课已经结束'
        : timetable.length
          ? '今天没课'
          : '还没有导入课表';

  $('#home-week').textContent = `第 ${info.week} 周`;
  $('#home-semester').textContent = info.semester;
  $('#home-countdown').textContent =
    info.examIn > 0
      ? `距${info.examLabel} ${info.examIn} 天（${fmtDate(new Date(now.getTime() + info.examIn * 86400000))}）`
      : `${info.examLabel}进行中或已结束`;

  const bar = $('#home-upcoming');
  bar.textContent = upcoming;
  bar.className = 'upcoming ' + (ongoing ? 'ongoing' : next ? 'next' : 'idle');

  const list = $('#home-courses');
  list.innerHTML = '';
  if (!courses.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = timetable.length ? `今天（${DAY_NAMES[today]}）没课` : '去「课表」导入你的课表';
    list.appendChild(li);
  } else {
    for (const c of courses) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="chip">${c.periods}</span><strong>${c.name}</strong><span class="muted">${c.place || ''}</span>`;
      list.appendChild(li);
    }
  }
}

function renderWeek() {
  const now = new Date();
  const info = weekInfo(now);
  $('#week-title').textContent = `${info.semester} · 第 ${info.week} 周`;
  $('#week-s1').textContent =
    info.examIn > 0
      ? `距考试周 ${info.examIn} 天 · 距${info.endLabel} ${info.endIn} 天`
      : `已进入${info.examLabel}或假期`;
  const weeks = $('#week-list');
  weeks.innerHTML = '';
  for (let i = 1; i <= 19; i++) {
    const start = new Date(SEM1_START.getTime() + (i - 1) * 7 * 86400000);
    const span = document.createElement('div');
    span.className = 'week-cell' + (i === info.week ? ' active' : '');
    span.innerHTML = `<span>第 ${i} 周</span><small>${start.getMonth() + 1}/${start.getDate()} 起</small>`;
    weeks.appendChild(span);
  }
}

function normalizeRows(list) {
  return (Array.isArray(list) ? list : [])
    .map((row) => ({
      day: Number(row.day) || 0,
      periods: String(row.periods || '').trim(),
      name: String(row.name || '').trim(),
      place: String(row.place || '').trim(),
      weeks: String(row.weeks || '').trim(),
    }))
    .filter((row) => row.day >= 1 && row.day <= 7 && row.periods);
}

function parseImportText(text) {
  const raw = String(text || '').trim();
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      const data = JSON.parse(raw);
      const rows = normalizeRows(Array.isArray(data) ? data : data.courses);
      if (rows.length) return rows;
    } catch {}
  }
  return parseTimetable(raw);
}

function renderTimetable() {
  const now = new Date();
  const info = weekInfo(now);
  const timetable = loadTimetable();
  const today = now.getDay() === 0 ? 7 : now.getDay();
  const grid = $('#grid');
  grid.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'grid-row grid-head';
  head.appendChild(Object.assign(document.createElement('div'), { className: 'grid-cell', textContent: '' }));
  for (let d = 1; d <= 7; d++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell' + (d === today ? ' today-col' : '');
    cell.textContent = '一二三四五六日'[d - 1];
    head.appendChild(cell);
  }
  grid.appendChild(head);

  const cells = {};
  for (const c of timetable) {
    if (!weekIncluded(c.weeks, info.week)) continue;
    const slot = slotOf(c.periods);
    if (!slot || !c.day) continue;
    const key = slot + '-' + c.day;
    (cells[key] = cells[key] || []).push(c);
  }

  for (let s = 1; s <= 5; s++) {
    const row = document.createElement('div');
    row.className = 'grid-row';
    const timeCell = document.createElement('div');
    timeCell.className = 'grid-cell time-cell';
    timeCell.innerHTML = `<b>${SLOTS[s - 1].label}</b><small>${SLOTS[s - 1].start}-${SLOTS[s - 1].end}</small>`;
    row.appendChild(timeCell);
    for (let d = 1; d <= 7; d++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell' + (d === today ? ' today-col' : '');
      for (const c of cells[s + '-' + d] || []) {
        const block = document.createElement('div');
        block.className = 'course-block';
        block.title = `${c.name}${c.place ? ' · ' + c.place : ''}${c.weeks ? '（' + c.weeks + ' 周）' : ''}`;
        block.innerHTML = `<b>${c.name}</b>${c.place ? `<small>${c.place}</small>` : ''}`;
        cell.appendChild(block);
      }
      row.appendChild(cell);
    }
    grid.appendChild(row);
  }
}

function renderCampus() {
  const root = $('#campus');
  root.innerHTML = '';
  for (const section of CAMPUS) {
    const card = document.createElement('section');
    card.className = 'card';
    card.innerHTML = `<h2>${section.title}</h2>`;
    for (const [name, desc] of section.items) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<strong>${name}</strong><span class="muted">${desc}</span>`;
      card.appendChild(row);
    }
    root.appendChild(card);
  }
}

function renderLinks() {
  const targets = ['#links', '#home-links'].map((sel) => $(sel)).filter(Boolean);
  for (const root of targets) {
    root.innerHTML = '';
    for (const [name, url] of LINKS) {
      const a = document.createElement('a');
      a.className = 'link-chip';
      a.href = url;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = name;
      root.appendChild(a);
    }
  }
}

function switchTab(name) {
  document.querySelectorAll('.page').forEach((el) => {
    el.classList.toggle('active', el.id === 'page-' + name);
  });
  document.querySelectorAll('.nav-btn').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === name);
  });
  if (name === 'home') {
    renderHome();
    renderLinks();
  }
  if (name === 'week') renderWeek();
  if (name === 'timetable') renderTimetable();
  if (name === 'chat') renderChat();
  if (name === 'campus') renderCampus();
  if (name === 'me') {
    renderLinks();
    renderAISettings();
  }
}

const AI_KEY = 'zua-ai-key';
const AI_BASE = 'zua-ai-base';
const AI_MODEL = 'zua-ai-model';

const SYSTEM_PROMPT = `你是「郑航小白」，郑州航空工业管理学院（郑航/ZUA）的校园助手。用简体中文、简洁亲切地回答，像耐心的学长学姐。

规则：
1. 校历以 2026 年 9 月 7 日为第 1 周、每周一进入新一周；当前信息会在每次提问时提供。
2. 校园事实：龙子湖校区（主校区，郑东新区文苑西路 15 号）；西门在文苑西路、北门在平安大道、东门在龙子湖西路、南门在相济路。图书馆在校园中心，东侧邻沁湖；西苑餐厅在西侧、东苑餐厅在东南、民族餐厅在东苑餐厅西南角；近邻宝在 24-25 号楼南、西篮球场北（京东在内、顺丰再往里）；校医院在行政办公楼 A 楼（南门里侧，急诊 24 小时）。
3. 不编造：校区、楼名、电话、截止日期、收费金额没有依据就说「这个我不确定，建议查官网/问辅导员」。
4. 实时信息（通知、校历变动、活动、开放时间）建议查学校官网 zua.edu.cn、教务处 jwc.zua.edu.cn、校医院 xyy.zua.edu.cn。
5. 回答简短，适合手机阅读；路线给方位+地标，不说步行几分钟。`;

let chatHistory = [];

function loadAI() {
  return {
    base: localStorage.getItem(AI_BASE) || '',
    key: localStorage.getItem(AI_KEY) || '',
    model: localStorage.getItem(AI_MODEL) || 'deepseek-chat',
  };
}

function chatEndpoint(base) {
  let value = String(base || '').trim().replace(/\/+$/, '');
  if (!value) return '';
  if (/\/chat\/completions$/.test(value)) return value;
  if (/\/v1$/.test(value)) return value + '/chat/completions';
  return value + '/v1/chat/completions';
}

function currentContext() {
  const info = weekInfo(new Date());
  const now = new Date();
  const today = now.getDay() === 0 ? 7 : now.getDay();
  return `当前时间：${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${DAY_NAMES[today]}，校历第 ${info.week} 周（${info.semester}）。`;
}

function appendChat(role, text) {
  const log = $('#chat-log');
  const bubble = document.createElement('div');
  bubble.className = 'chat-msg ' + role;
  bubble.textContent = text;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
  return bubble;
}

async function sendChat() {
  const input = $('#chat-text');
  const text = input.value.trim();
  if (!text) return;
  const ai = loadAI();
  if (!ai.base || !ai.key) {
    $('#chat-hint').textContent = '先在「我的」里配置代理地址和 Key';
    return;
  }
  input.value = '';
  appendChat('user', text);
  chatHistory.push({ role: 'user', content: text });
  if (chatHistory.length > 16) chatHistory = chatHistory.slice(-16);

  const bubble = appendChat('assistant', '…');
  let answer = '';
  try {
    const response = await fetch(chatEndpoint(ai.base), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ai.key}`,
      },
      body: JSON.stringify({
        model: ai.model,
        stream: true,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + '\n' + currentContext() },
          ...chatHistory,
        ],
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${(await response.text()).slice(0, 120)}`);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream') && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              answer += delta;
              bubble.textContent = answer;
              $('#chat-log').scrollTop = $('#chat-log').scrollHeight;
            }
          } catch {}
        }
      }
    } else {
      const json = await response.json();
      answer = json.choices?.[0]?.message?.content || '';
      bubble.textContent = answer || '（空回复）';
    }
    if (!answer) bubble.textContent = '（空回复）';
    chatHistory.push({ role: 'assistant', content: answer || '' });
  } catch (error) {
    bubble.textContent = `请求失败：${error.message || error}`;
    bubble.classList.add('error');
  }
}

function renderAISettings() {
  const ai = loadAI();
  $('#ai-base').value = ai.base;
  $('#ai-key').value = ai.key;
  $('#ai-model').value = ai.model;
  $('#ai-status').textContent = ai.base && ai.key ? `已配置：${chatEndpoint(ai.base)}` : '未配置 AI，问答不可用';
  $('#chat-hint').textContent =
    ai.base && ai.key ? '已连接 AI，直接提问即可' : '先在「我的」里配置 AI 代理地址和 Key';
}

function renderChat() {
  const log = $('#chat-log');
  if (log.childElementCount === 0) {
    appendChat('assistant', '你好，我是郑航小白。可以问我校历第几周、教务系统、校医院、校园路线，或者让我帮你拆学习计划。');
  }
}

function initEvents() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  $('#chat-send').addEventListener('click', sendChat);
  $('#chat-text').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendChat();
    }
  });
  document.querySelectorAll('[data-q]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $('#chat-text').value = btn.dataset.q;
      sendChat();
    });
  });
  $('#btn-save-ai').addEventListener('click', () => {
    localStorage.setItem(AI_BASE, $('#ai-base').value.trim());
    localStorage.setItem(AI_KEY, $('#ai-key').value.trim());
    localStorage.setItem(AI_MODEL, $('#ai-model').value.trim() || 'deepseek-chat');
    renderAISettings();
  });
  $('#btn-test-ai').addEventListener('click', async () => {
    const ai = loadAI();
    const status = $('#ai-status');
    if (!ai.base || !ai.key) {
      status.textContent = '先填写代理地址和 Key';
      return;
    }
    status.textContent = '测试中…';
    try {
      const response = await fetch(chatEndpoint(ai.base), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${ai.key}` },
        body: JSON.stringify({
          model: ai.model,
          stream: false,
          max_tokens: 8,
          messages: [{ role: 'user', content: '回复 OK' }],
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${(await response.text()).slice(0, 100)}`);
      const json = await response.json();
      status.textContent = `连接成功：${json.choices?.[0]?.message?.content?.slice(0, 20) || 'OK'}`;
    } catch (error) {
      status.textContent = `连接失败：${error.message || error}`;
    }
  });
  $('#btn-clear-ai').addEventListener('click', () => {
    localStorage.removeItem(AI_KEY);
    localStorage.removeItem(AI_BASE);
    renderAISettings();
  });

  $('#btn-import').addEventListener('click', () => {
    $('#import-panel').classList.toggle('hidden');
  });
  $('#btn-save-import').addEventListener('click', () => {
    const rows = parseImportText($('#import-text').value);
    if (!rows.length) {
      alert('没解析出条目。可以粘贴行文本（周一 1-2 高数 3号教学楼101 1-16周），或从电脑面板复制的 JSON。');
      return;
    }
    saveTimetable(rows);
    $('#import-panel').classList.add('hidden');
    renderTimetable();
    renderHome();
    alert(`已导入 ${rows.length} 条课程`);
  });
  $('#btn-clear').addEventListener('click', () => {
    if (!confirm('清空本机课表？')) return;
    localStorage.removeItem(STORE_KEY);
    renderHome();
    renderTimetable();
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

initEvents();
switchTab('home');
