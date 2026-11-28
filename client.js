window.__ModuleLoader__.load({
  id: '@local/dsh-zua-xiaobai-preset',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const TYPE_ID = '@local/zua-panel';
    const KIND = 'zua-panel';
    const STORE_KEY = 'zua-panel.timetable.v2';
    const WEEK_KEY = 'zua-panel.week.v1';

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

    const SEM1_START = new Date(2026, 8, 7);
    const SEM1_EXAM = new Date(2027, 0, 11);
    const SEM1_END = new Date(2027, 0, 18);
    const SEM2_START = new Date(2027, 1, 22);
    const SEM2_EXAM = new Date(2027, 5, 28);
    const SEM2_END = new Date(2027, 6, 5);

    const DAY_NAMES = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const SLOT_TIMES = [
      { label: '1-2', start: '08:00', end: '09:40' },
      { label: '3-4', start: '10:00', end: '11:40' },
      { label: '5-6', start: '14:30', end: '16:10' },
      { label: '7-8', start: '16:30', end: '18:10' },
      { label: '9-10', start: '19:30', end: '21:10' },
    ];
    const DAY_CHARS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };

    const dayDiff = (a, b) => Math.round((a - b) / 86400000);
    const fmt = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;

    function weekInfo(now) {
      if (now < SEM2_START) {
        const week = Math.floor(dayDiff(now, SEM1_START) / 7) + 1;
        return {
          semester: '第一学期',
          week,
          examIn: dayDiff(SEM1_EXAM, now),
          endIn: dayDiff(SEM1_END, now),
          examLabel: '考试周',
          endLabel: '寒假',
        };
      }
      const week = Math.floor(dayDiff(now, SEM2_START) / 7) + 1;
      return {
        semester: '第二学期',
        week,
        examIn: dayDiff(SEM2_EXAM, now),
        endIn: dayDiff(SEM2_END, now),
        examLabel: '考试周',
        endLabel: '暑假',
      };
    }

    function loadTimetable() {
      try {
        const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem('zua-panel.timetable.v1');
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    }

    function saveTimetable(list) {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(list));
      } catch {}
    }

    function loadWeek() {
      try {
        const value = Number(localStorage.getItem(WEEK_KEY));
        return Number.isFinite(value) && value > 0 ? value : 0;
      } catch {
        return 0;
      }
    }

    function saveWeek(week) {
      try {
        if (week) localStorage.setItem(WEEK_KEY, String(week));
        else localStorage.removeItem(WEEK_KEY);
      } catch {}
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

    function normalizeRows(rows) {
      return (Array.isArray(rows) ? rows : [])
        .map((r) => ({
          day: Number(r.day) || DAY_CHARS[r.day] || 0,
          periods: String(r.periods || r.time || '').trim(),
          name: String(r.name || r.course || '').trim(),
          place: String(r.place || r.location || '').trim(),
          weeks: String(r.weeks || r.week || '').trim(),
        }))
        .filter((r) => r.day >= 1 && r.day <= 7 && r.periods);
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
        const place = parts.join(' ');
        out.push({
          day: DAY_CHARS[m[1]],
          periods: m[2].replace(/\s+/g, '').replace(/[~～至]/g, '-'),
          name,
          place,
          weeks,
        });
      }
      return out;
    }

    function copyText(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text);
          return true;
        }
      } catch {}
      return false;
    }

    const card = {
      background: 'var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.06))',
      border: '.5px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.22))',
      borderRadius: '12px',
      padding: '12px 14px',
    };
    const sectionTitle = {
      fontSize: '12px',
      fontWeight: 600,
      opacity: 0.7,
      letterSpacing: '0.02em',
      margin: '0 0 8px',
    };
    const chipStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '999px',
      border: '.5px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.25))',
      color: 'var(--dsw-alias-label-primary, inherit)',
      fontSize: '12px',
      lineHeight: 1.4,
      background: 'transparent',
      cursor: 'pointer',
    };
    const btnStyle = {
      padding: '4px 10px',
      borderRadius: '8px',
      border: '.5px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.3))',
      background: 'transparent',
      color: 'var(--dsw-alias-label-primary, inherit)',
      fontSize: '12px',
      cursor: 'pointer',
    };

    function slotOf(periods) {
      const first = parseInt(String(periods || '').split(/[-~～]/)[0], 10);
      if (!Number.isFinite(first)) return 0;
      return Math.max(1, Math.min(5, Math.ceil(first / 2)));
    }

    function slotTime(periods) {
      const index = slotOf(periods);
      return index ? SLOT_TIMES[index - 1] : undefined;
    }

    function timeToMinutes(value) {
      const [hour, minute] = String(value || '').split(':').map((part) => parseInt(part, 10));
      return (hour || 0) * 60 + (minute || 0);
    }

    function UpcomingBar({ rows, week, today, now }) {
      const list = rows
        .filter((c) => c.day === today && weekIncluded(c.weeks, week))
        .map((c) => ({ course: c, info: slotTime(c.periods) }))
        .filter((item) => item.info)
        .sort((a, b) => timeToMinutes(a.info.start) - timeToMinutes(b.info.start));
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const ongoing = list.find(
        (item) => timeToMinutes(item.info.start) <= nowMinutes && nowMinutes <= timeToMinutes(item.info.end),
      );
      const next = list.find((item) => timeToMinutes(item.info.start) > nowMinutes);
      const target = ongoing || next;
      let text;
      if (target) {
        const state = ongoing ? '正在上课' : '即将开始';
        text = `${state} · 第 ${target.info.label} 节 ${target.info.start}-${target.info.end} · ${target.course.name}${
          target.course.place ? ' · ' + target.course.place : ''
        }`;
      } else {
        text = list.length ? '今天的课已经结束' : '今天没课';
      }
      const accent = ongoing ? '#1a9e6b' : 'var(--dsw-alias-brand-primary, #2f6fed)';
      return h(
        'div',
        {
          style: {
            marginTop: '8px',
            padding: '8px 10px',
            borderRadius: '8px',
            borderLeft: `3px solid ${accent}`,
            background: ongoing ? 'rgba(26,158,107,0.14)' : 'rgba(47,111,237,0.13)',
            color: 'var(--dsw-alias-label-primary, inherit)',
            fontSize: '12px',
            fontWeight: 600,
            lineHeight: 1.45,
          },
        },
        text,
      );
    }

    function CourseGrid({ rows, week, today }) {
      const cells = {};
      for (const c of rows) {
        if (!weekIncluded(c.weeks, week)) continue;
        const slot = slotOf(c.periods);
        if (!slot || !c.day) continue;
        const key = slot + '-' + c.day;
        (cells[key] = cells[key] || []).push(c);
      }
      const days = ['一', '二', '三', '四', '五', '六', '日'];
      const slotLabels = ['1-2', '3-4', '5-6', '7-8', '9-10'];
      const th = { padding: '4px 2px', fontSize: '10px', fontWeight: 600, opacity: 0.65, textAlign: 'center' };
      const td = {
        border: '.5px solid rgba(127,127,127,0.18)',
        padding: '2px',
        verticalAlign: 'top',
        minWidth: '40px',
        height: '46px',
      };
      return h(
        'div',
        { style: { overflowX: 'auto', marginTop: '6px' } },
        h(
          'table',
          { style: { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' } },
          h(
            'thead',
            null,
            h(
              'tr',
              null,
              h('th', { style: th }, ''),
              days.map((d, i) =>
                h(
                  'th',
                  {
                    key: d,
                    style: {
                      ...th,
                      color: i + 1 === today ? 'var(--dsw-alias-brand-primary, #2f6fed)' : 'inherit',
                    },
                  },
                  d,
                ),
              ),
            ),
          ),
          h(
            'tbody',
            null,
            slotLabels.map((label, si) =>
              h(
                'tr',
                { key: label },
                h(
                  'td',
                  { style: { ...td, textAlign: 'center', whiteSpace: 'nowrap' } },
                  h('div', { style: { fontSize: '10px', fontWeight: 600 } }, label),
                  h(
                    'div',
                    { style: { fontSize: '9px', opacity: 0.55, marginTop: '1px' } },
                    `${SLOT_TIMES[si].start}-${SLOT_TIMES[si].end}`,
                  ),
                ),
                days.map((d, di) => {
                  const list = cells[si + 1 + '-' + (di + 1)] || [];
                  const isToday = di + 1 === today;
                  return h(
                    'td',
                    {
                      key: d + si,
                      style: { ...td, background: isToday ? 'rgba(47,111,237,0.06)' : 'transparent' },
                    },
                    list.map((c, i) =>
                      h(
                        'div',
                        {
                          key: i,
                          title: `${c.name}${c.place ? ' · ' + c.place : ''}${c.weeks ? '（' + c.weeks + '周）' : ''}`,
                          style: {
                            margin: '1px 0',
                            padding: '3px 4px',
                            borderRadius: '5px',
                            background: 'rgba(47,111,237,0.14)',
                            fontSize: '10px',
                            lineHeight: 1.25,
                            overflow: 'hidden',
                          },
                        },
                        h(
                          'div',
                          { style: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                          c.name || '课程',
                        ),
                        c.place
                          ? h(
                              'div',
                              { style: { opacity: 0.65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                              c.place,
                            )
                          : null,
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
      );
    }

    function OpenButton({ sessionId, useSessions }) {
      const preset = useSessions
        ? useSessions((state) => state.byId[sessionId]?.projectionValues?.agentPreset)
        : undefined;
      if (preset !== 'zua-xiaobai') return null;
      return h(
        'button',
        {
          type: 'button',
          title: '打开郑航面板',
          style: { ...btnStyle, padding: '4px 8px', marginLeft: '2px' },
          onClick: () => {
            try {
              window.__zuaPanelOpen && window.__zuaPanelOpen();
            } catch {}
          },
        },
        '郑航',
      );
    }

    const BILL_KEY = 'zua-bills-v1';
    const BILL_CATEGORIES = ['餐饮', '交通', '购物', '学习', '娱乐', '医疗', '住宿', '通讯', '其他'];
    const CATEGORY_RULES = [
      ['餐饮', /饭|餐|食堂|外卖|美团|饿了么|奶茶|咖啡|肯德基|麦当劳|瑞幸|蜜雪|烧烤|火锅|面|粉|小吃/],
      ['交通', /地铁|公交|打车|滴滴|出租|火车|高铁|机票|加油|停车|车费|共享单车/],
      ['购物', /淘宝|京东|拼多多|超市|丹尼斯|商场|天猫|唯品会|便利店|衣服|鞋|日用品/],
      ['学习', /书|打印|文具|课程|考试|学费|教材|知网|论文|培训/],
      ['娱乐', /电影|游戏|健身|KTV|演出|会员|视频|腾讯|爱奇艺|B站|网易云/],
      ['医疗', /医院|药|诊所|挂号|体检|牙科/],
      ['住宿', /房租|宿舍|水电|物业|宾馆|酒店/],
      ['通讯', /话费|流量|宽带|手机费/],
    ];

    function guessCategory(desc) {
      const text = String(desc || '');
      for (const [category, pattern] of CATEGORY_RULES) if (pattern.test(text)) return category;
      return '其他';
    }

    function loadBills() {
      try {
        const raw = localStorage.getItem(BILL_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    }

    function saveBills(list) {
      try {
        localStorage.setItem(BILL_KEY, JSON.stringify(list));
      } catch {}
    }

    function todayISO() {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function normalizeDate(value) {
      const text = String(value || '').trim().replace(/[/.年]/g, '-').replace(/月/g, '-').replace(/日/g, '');
      const match = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      const short = text.match(/^(\d{1,2})-(\d{1,2})$/);
      if (short) return `${new Date().getFullYear()}-${short[1].padStart(2, '0')}-${short[2].padStart(2, '0')}`;
      return '';
    }

    function parseAmount(value) {
      const num = parseFloat(String(value || '').replace(/[^\d.-]/g, ''));
      return Number.isFinite(num) ? Math.abs(num) : NaN;
    }

    function monthOf(date) {
      return String(date || '').slice(0, 7);
    }

    function currentMonth() {
      return todayISO().slice(0, 7);
    }

    function BillsPanel() {
      const [bills, setBills] = React.useState(loadBills);
      const [month, setMonth] = React.useState(currentMonth);
      const [date, setDate] = React.useState(todayISO);
      const [amount, setAmount] = React.useState('');
      const [desc, setDesc] = React.useState('');
      const [category, setCategory] = React.useState('auto');
      const [msg, setMsg] = React.useState('');

      const update = (list) => {
        setBills(list);
        saveBills(list);
        window.dispatchEvent(new Event('zua-wallet-sync'));
      };

      React.useEffect(() => {
        const sync = () => setBills(loadBills());
        window.addEventListener('zua-wallet-sync', sync);
        return () => window.removeEventListener('zua-wallet-sync', sync);
      }, []);
      const add = () => {
        const value = parseAmount(amount);
        const day = normalizeDate(date);
        if (!value || !day) {
          setMsg('填写日期和金额');
          return;
        }
        const row = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: day,
          amount: Math.round(value * 100) / 100,
          desc: desc.trim() || '未备注',
          category: category === 'auto' ? guessCategory(desc) : category,
        };
        update([row, ...bills]);
        setAmount('');
        setDesc('');
        setMsg('已记录');
      };

      const remove = (id) => {
        update(bills.filter((b) => b.id !== id));
      };

      const exportCsv = () => {
        const rows = [['日期', '金额', '说明', '分类']];
        for (const b of bills) rows.push([b.date, b.amount.toFixed(2), b.desc, b.category]);
        const text = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        try {
          const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = 'zua-bills.csv';
          a.click();
          URL.revokeObjectURL(url);
        } catch {}
      };

      const monthBills = bills.filter((b) => monthOf(b.date) === month);
      const total = monthBills.reduce((sum, b) => sum + b.amount, 0);
      const byCategory = {};
      for (const b of monthBills) byCategory[b.category] = (byCategory[b.category] || 0) + b.amount;
      const ranked = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

      return h(
        'div',
        { style: { height: '100%', overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', color: 'var(--dsw-alias-label-primary, inherit)' } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700 } },
          h(WalletMascot, { size: 28 }),
          '郑航账单',
        ),
        h(
          'div',
          { style: { ...card, display: 'flex', flexDirection: 'column', gap: '8px' } },
          h('div', { style: sectionTitle }, '本月统计'),
          h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
            h('input', { type: 'month', value: month, onChange: (e) => setMonth(e.target.value), style: inputStyle }),
            h('span', { style: { fontSize: '20px', fontWeight: 800 } }, `¥${total.toFixed(2)}`),
            h('span', { style: { fontSize: '11px', opacity: 0.6 } }, `${monthBills.length} 笔`),
          ),
          ranked.length
            ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' } },
                ranked.map(([name, value]) =>
                  h('div', { key: name, style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                    h('span', { style: { width: '38px', fontSize: '11px' } }, name),
                    h('div', { style: { flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(127,127,127,0.15)', overflow: 'hidden' } },
                      h('div', { style: { width: `${total ? (value / total) * 100 : 0}%`, height: '100%', background: 'var(--dsw-alias-brand-primary, #2f6fed)' } }),
                    ),
                    h('span', { style: { width: '60px', textAlign: 'right', fontSize: '11px', opacity: 0.8 } }, `¥${value.toFixed(2)}`),
                  ),
                ),
              )
            : h('div', { style: { fontSize: '11px', opacity: 0.6 } }, '本月还没有记录'),
        ),
        h(
          'div',
          { style: { ...card, display: 'flex', flexDirection: 'column', gap: '8px' } },
          h('div', { style: sectionTitle }, '记一笔'),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            h('input', { type: 'date', value: date, onChange: (e) => setDate(e.target.value), style: { ...inputStyle, flex: '1 1 110px' } }),
            h('input', { inputMode: 'decimal', value: amount, onChange: (e) => setAmount(e.target.value), placeholder: '金额', style: { ...inputStyle, flex: '1 1 80px' } }),
            h('select', { value: category, onChange: (e) => setCategory(e.target.value), style: inputStyle },
              h('option', { value: 'auto' }, '自动分类'),
              BILL_CATEGORIES.map((c) => h('option', { key: c, value: c }, c)),
            ),
          ),
          h('input', { value: desc, onChange: (e) => setDesc(e.target.value), placeholder: '说明，如「食堂午饭」', style: inputStyle }),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            h('button', { type: 'button', style: btnStyle, onClick: add }, '添加'),
            h('button', { type: 'button', style: btnStyle, onClick: exportCsv }, '导出 CSV'),
            h(
              'button',
              {
                type: 'button',
                style: btnStyle,
                onClick: () => {
                  localStorage.removeItem(WALLET_HIDDEN);
                  window.dispatchEvent(new Event('zua-wallet-sync'));
                  setMsg('已显示钱包挂件');
                },
              },
              '显示钱包挂件',
            ),
            h('button', { type: 'button', style: btnStyle, onClick: () => { update([]); setMsg('已清空'); } }, '清空全部'),
          ),
          msg ? h('div', { style: { fontSize: '11px', opacity: 0.7 } }, msg) : null,
        ),
        h(
          'div',
          { style: { ...card, display: 'flex', flexDirection: 'column', gap: '6px' } },
          h('div', { style: sectionTitle }, `记录（${monthBills.length} 笔）`),
          monthBills.length
            ? monthBills.slice(0, 80).map((b) =>
                h('div', { key: b.id, style: { display: 'flex', alignItems: 'center', gap: '8px', borderTop: '.5px solid rgba(127,127,127,0.15)', paddingTop: '5px' } },
                  h('span', { style: { fontSize: '11px', opacity: 0.6, width: '56px' } }, b.date.slice(5)),
                  h('span', { style: { fontSize: '11px', width: '44px' } }, b.category),
                  h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, b.desc),
                  h('span', { style: { fontSize: '12px', fontWeight: 600 } }, `¥${b.amount.toFixed(2)}`),
                  h('button', { type: 'button', style: { ...btnStyle, padding: '2px 6px', fontSize: '10px' }, onClick: () => remove(b.id) }, '删'),
                ),
              )
            : h('div', { style: { fontSize: '11px', opacity: 0.6 } }, '还没有记录'),
        ),
      );
    }

    const WALLET_HIDDEN = 'zua-wallet-hidden';
    const WALLET_POS = 'zua-wallet-pos';

    function loadWalletPos() {
      try {
        const value = JSON.parse(localStorage.getItem(WALLET_POS) || 'null');
        if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) return value;
      } catch {}
      return null;
    }

    function saveWalletPos(pos) {
      try {
        localStorage.setItem(WALLET_POS, JSON.stringify(pos));
      } catch {}
    }

    function WalletMascot({ size = 32 }) {
      return h(
        'svg',
        {
          viewBox: '0 0 64 64',
          width: size,
          height: size,
          'aria-hidden': true,
          style: { display: 'block', flex: '0 0 auto' },
        },
        h('ellipse', { cx: 32, cy: 57, rx: 20, ry: 3.2, fill: 'rgba(0,0,0,0.10)' }),
        h('circle', { cx: 47, cy: 15, r: 9, fill: '#FFD34D', stroke: '#E0A22F', strokeWidth: 1.2 }),
        h(
          'text',
          {
            x: 47,
            y: 19,
            textAnchor: 'middle',
            fontSize: '9',
            fontWeight: 700,
            fill: '#8A5A00',
            fontFamily: 'inherit',
          },
          '¥',
        ),
        h('rect', { x: 6, y: 20, width: 52, height: 33, rx: 12, fill: '#FFB27C' }),
        h('rect', { x: 6, y: 20, width: 52, height: 12, rx: 8, fill: '#FF9A62' }),
        h('rect', { x: 6, y: 26, width: 52, height: 6, fill: '#FF9A62' }),
        h('rect', { x: 41, y: 33, width: 17, height: 15, rx: 7, fill: '#FFD0A6' }),
        h('circle', { cx: 49.5, cy: 40.5, r: 4.6, fill: '#FFF6E9' }),
        h(
          'text',
          {
            x: 49.5,
            y: 43.4,
            textAnchor: 'middle',
            fontSize: '6.2',
            fontWeight: 700,
            fill: '#C96B2E',
            fontFamily: 'inherit',
          },
          '¥',
        ),
        h('circle', { cx: 21, cy: 39, r: 2.7, fill: '#3B2A22' }),
        h('circle', { cx: 20.2, cy: 38.1, r: 0.9, fill: '#FFFFFF' }),
        h('circle', { cx: 31, cy: 39, r: 2.7, fill: '#3B2A22' }),
        h('circle', { cx: 30.2, cy: 38.1, r: 0.9, fill: '#FFFFFF' }),
        h('circle', { cx: 15.5, cy: 43.5, r: 3, fill: '#FF8F8F', opacity: 0.55 }),
        h('circle', { cx: 36.5, cy: 43.5, r: 3, fill: '#FF8F8F', opacity: 0.55 }),
        h('path', {
          d: 'M22.5 44.5 Q26 48 29.5 44.5',
          fill: 'none',
          stroke: '#3B2A22',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M9 34 Q11 37 9 39',
          fill: 'none',
          stroke: '#F08C55',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          opacity: 0.8,
        }),
        h('path', { d: 'M53.5 12.5 l1.2 -2.4 l1.2 2.4 l2.4 1.2 l-2.4 1.2 l-1.2 2.4 l-1.2 -2.4 l-2.4 -1.2 z', fill: '#FFE08A' }),
      );
    }

    function WalletWidget() {
      const [hidden, setHidden] = React.useState(() => localStorage.getItem(WALLET_HIDDEN) === '1');
      const [expanded, setExpanded] = React.useState(false);
      const [bills, setBills] = React.useState(loadBills);
      const [amount, setAmount] = React.useState('');
      const [desc, setDesc] = React.useState('');
      const [month, setMonth] = React.useState(currentMonth);
      const [msg, setMsg] = React.useState('');
      const [pos, setPos] = React.useState(
        () => loadWalletPos() || { x: Math.max(8, window.innerWidth - 280), y: Math.max(8, window.innerHeight - 320) },
      );
      const boxRef = React.useRef(null);
      const posRef = React.useRef(pos);
      posRef.current = pos;
      const dragRef = React.useRef(null);
      const movedRef = React.useRef(false);

      const clampPos = (x, y) => {
        const box = boxRef.current;
        const width = box ? box.offsetWidth : 180;
        const height = box ? box.offsetHeight : 48;
        return {
          x: Math.min(Math.max(6, x), Math.max(6, window.innerWidth - width - 6)),
          y: Math.min(Math.max(6, y), Math.max(6, window.innerHeight - height - 6)),
        };
      };

      React.useEffect(() => {
        const onResize = () => setPos((current) => clampPos(current.x, current.y));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      const onPointerMove = (event) => {
        if (!dragRef.current) return;
        const box = boxRef.current;
        if (!box) return;
        const x = event.clientX - dragRef.current.dx;
        const y = event.clientY - dragRef.current.dy;
        if (Math.abs(x - posRef.current.x) > 2 || Math.abs(y - posRef.current.y) > 2) movedRef.current = true;
        setPos(clampPos(x, y));
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        dragRef.current = null;
        saveWalletPos(posRef.current);
      };

      const startDrag = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        const box = boxRef.current;
        if (!box) return;
        const rect = box.getBoundingClientRect();
        dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
        movedRef.current = false;
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp, { once: true });
      };

      React.useEffect(() => {
        const sync = () => {
          setBills(loadBills());
          setHidden(localStorage.getItem(WALLET_HIDDEN) === '1');
        };
        window.addEventListener('zua-wallet-sync', sync);
        return () => window.removeEventListener('zua-wallet-sync', sync);
      }, []);

      if (hidden) return null;

      const monthBills = bills.filter((b) => monthOf(b.date) === month);
      const total = monthBills.reduce((sum, b) => sum + b.amount, 0);
      const byCategory = {};
      for (const b of monthBills) byCategory[b.category] = (byCategory[b.category] || 0) + b.amount;
      const ranked = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3);

      const add = () => {
        const value = parseAmount(amount);
        if (!value) {
          setMsg('填金额');
          return;
        }
        const row = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: todayISO(),
          amount: Math.round(value * 100) / 100,
          desc: desc.trim() || '未备注',
          category: guessCategory(desc),
        };
        const next = [row, ...loadBills()];
        saveBills(next);
        setBills(next);
        setAmount('');
        setDesc('');
        setMsg('已记');
        window.dispatchEvent(new Event('zua-wallet-sync'));
      };

      const hide = () => {
        localStorage.setItem(WALLET_HIDDEN, '1');
        setHidden(true);
        window.dispatchEvent(new Event('zua-wallet-sync'));
      };

      const shellStyle = {
        background: 'var(--dsw-alias-bg-layer-1, #ffffff)',
        border: '.5px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.25))',
        borderRadius: '14px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(10px)',
        color: 'var(--dsw-alias-label-primary, #1c2333)',
      };

      if (!expanded) {
        return h(
          'div',
          { ref: boxRef, style: { position: 'fixed', left: pos.x, top: pos.y, zIndex: 60, touchAction: 'none' } },
          h(
            'div',
            {
              role: 'button',
              tabIndex: 0,
              onPointerDown: startDrag,
              onClick: () => {
                if (!movedRef.current) setExpanded(true);
              },
              style: {
                ...shellStyle,
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'grab',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              },
            },
            h(WalletMascot, { size: 24 }),
            h('span', { style: { fontSize: '12px' } }, '钱包'),
            h('span', { style: { color: 'var(--dsw-alias-brand-primary, #2f6fed)' } }, `本月 ¥${total.toFixed(2)}`),
            h('span', { style: { fontSize: '10px', opacity: 0.5 } }, '▸'),
          ),
        );
      }

      return h(
        'div',
        {
          ref: boxRef,
          style: { position: 'fixed', left: pos.x, top: pos.y, zIndex: 60, width: '248px', touchAction: 'none' },
        },
        h(
          'div',
          { style: { ...shellStyle, padding: '12px', display: 'flex', flexDirection: 'column', gap: '9px' } },
          h(
            'div',
            {
              onPointerDown: startDrag,
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'move',
                userSelect: 'none',
              },
            },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
              h(WalletMascot, { size: 30 }),
              h('div', { style: { fontSize: '13px', fontWeight: 700 } }, '钱包'),
              h('span', { style: { fontSize: '10px', opacity: 0.4 } }, '⠿'),
            ),
            h(
              'div',
              { style: { display: 'flex', gap: '6px' } },
              h('button', { type: 'button', onClick: () => setExpanded(false), style: { ...btnStyle, padding: '2px 7px', fontSize: '11px' } }, '收起'),
              h('button', { type: 'button', onClick: hide, style: { ...btnStyle, padding: '2px 7px', fontSize: '11px' } }, '隐藏'),
            ),
          ),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'baseline', gap: '6px' } },
            h('div', { style: { fontSize: '22px', fontWeight: 800 } }, `¥${total.toFixed(2)}`),
            h('div', { style: { fontSize: '11px', opacity: 0.6 } }, `${monthBills.length} 笔 · ${month}`),
          ),
          ranked.length
            ? h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '5px' } },
                ranked.map(([name, value]) =>
                  h(
                    'div',
                    { key: name, style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                    h('span', { style: { width: '34px', fontSize: '10px' } }, name),
                    h(
                      'div',
                      { style: { flex: 1, height: '5px', borderRadius: '3px', background: 'rgba(127,127,127,0.16)', overflow: 'hidden' } },
                      h('div', {
                        style: {
                          width: `${total ? (value / total) * 100 : 0}%`,
                          height: '100%',
                          background: 'var(--dsw-alias-brand-primary, #2f6fed)',
                        },
                      }),
                    ),
                    h('span', { style: { width: '52px', textAlign: 'right', fontSize: '10px', opacity: 0.75 } }, `¥${value.toFixed(1)}`),
                  ),
                ),
              )
            : h('div', { style: { fontSize: '10px', opacity: 0.55 } }, '本月还没记账'),
          h(
            'div',
            { style: { display: 'flex', gap: '6px' } },
            h('input', {
              value: amount,
              inputMode: 'decimal',
              onChange: (e) => setAmount(e.target.value),
              placeholder: '金额',
              style: { ...inputStyle, width: '62px', flex: '0 0 62px' },
            }),
            h('input', {
              value: desc,
              onChange: (e) => setDesc(e.target.value),
              placeholder: '午饭、地铁…',
              style: { ...inputStyle, flex: 1, minWidth: 0 },
            }),
            h('button', { type: 'button', onClick: add, style: { ...btnStyle, padding: '4px 9px', fontSize: '11px' } }, '记'),
          ),
          msg ? h('div', { style: { fontSize: '10px', opacity: 0.6 } }, msg) : null,
          h(
            'button',
            {
              type: 'button',
              onClick: () => {
                try {
                  window.__zuaOpenBills && window.__zuaOpenBills();
                } catch {}
              },
              style: { ...btnStyle, fontSize: '11px' },
            },
            '打开完整账单',
          ),
        ),
      );
    }

    const inputStyle = {
      padding: '6px 8px',
      fontSize: '12px',
      fontFamily: 'inherit',
      color: 'inherit',
      background: 'transparent',
      border: '.5px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.3))',
      borderRadius: '8px',
      boxSizing: 'border-box',
    };

    function Panel() {
      const now = new Date();
      const info = weekInfo(now);
      const currentWeek = Math.max(1, Math.min(info.week, 19));
      const [timetable, setTimetable] = React.useState(loadTimetable);
      const [sheetWeek, setSheetWeek] = React.useState(loadWeek);
      const [draft, setDraft] = React.useState('');
      const [msg, setMsg] = React.useState('');
      const [username, setUsername] = React.useState('');
      const [password, setPassword] = React.useState('');
      const [loginBusy, setLoginBusy] = React.useState(false);
      const [loginMsg, setLoginMsg] = React.useState('');
      const [links, setLinks] = React.useState([]);

      const commit = (rows, note) => {
        if (!rows.length) {
          setMsg(note || '没解析出课程，检查课表文本格式');
          return;
        }
        setTimetable(rows);
        saveTimetable(rows);
        setMsg(`已导入 ${rows.length} 条课程`);
      };

      const save = () => {
        const parsed = parseTimetable(draft);
        commit(parsed, '没解析出条目，格式示例：周一 1-2 高等数学 3号教学楼101（1-16周）');
      };

      const clear = () => {
        setTimetable([]);
        saveTimetable([]);
        setSheetWeek(0);
        saveWeek(0);
        setDraft('');
        setMsg('已清空');
      };

      const login = async () => {
        if (!username || !password) {
          setLoginMsg('请填写学号和密码');
          return;
        }
        setLoginBusy(true);
        setLoginMsg('正在登录教务系统…');
        try {
          const res = await fetch('http://127.0.0.1:27127/zua-panel/jw/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username, password, week: currentWeek }),
            signal: AbortSignal.timeout(60000),
          });
          const raw = await res.text();
          let payload = {};
          try {
            payload = JSON.parse(raw);
          } catch {}
          if (!res.ok) throw new Error(payload.error || raw.slice(0, 120) || `HTTP ${res.status}`);
          setLinks(Array.isArray(payload.links) ? payload.links : []);
          const rows = normalizeRows(payload.courses);
          if (payload.week) {
            setSheetWeek(Number(payload.week));
            saveWeek(Number(payload.week));
          }
          if (rows.length) {
            setTimetable(rows);
            saveTimetable(rows);
            setLoginMsg(
              `已登录 ${payload.username || username}，导入 ${rows.length} 条课程${payload.week ? `（第 ${payload.week} 周）` : ''}`,
            );
          } else {
            setLoginMsg(
              `已登录 ${payload.username || username}，但没解析出课程${payload.error ? `：${payload.error}` : ''}`,
            );
          }
          setPassword('');
        } catch (error) {
          setLoginMsg(`登录失败：${error && error.message ? error.message : error}`);
        } finally {
          setLoginBusy(false);
        }
      };

      const today = now.getDay() === 0 ? 7 : now.getDay();
      const filterWeek = currentWeek;
      const todays = timetable
        .filter((c) => c.day === today && weekIncluded(c.weeks, filterWeek))
        .sort((a, b) => (parseInt(a.periods, 10) || 0) - (parseInt(b.periods, 10) || 0));

      const linkRow = h(
        'div',
        { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
        LINKS.map(([name, url]) =>
          h(
            'button',
            {
              key: url,
              type: 'button',
              style: chipStyle,
              title: '在右侧内置浏览器打开：' + url,
              onClick: () => {
                let ok = false;
                try {
                  ok = window.__zuaOpenInBrowser && window.__zuaOpenInBrowser(url);
                } catch {}
                if (!ok) {
                  const copied = copyText(url);
                  setMsg(copied ? `内置浏览器打不开「${name}」，链接已复制` : `请手动打开：${url}`);
                }
              },
            },
            name,
          ),
        ),
      );

      return h(
        'div',
        {
          style: {
            height: '100%',
            overflow: 'auto',
            padding: '16px 16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            color: 'var(--dsw-alias-label-primary, inherit)',
            fontSize: '13px',
            lineHeight: 1.55,
          },
        },
        h(
          'div',
          null,
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
            h('div', { style: { fontSize: '15px', fontWeight: 700 } }, '郑航面板'),
            h(
              'button',
              {
                type: 'button',
                style: { ...btnStyle, padding: '2px 8px', fontSize: '11px' },
                onClick: () => {
                  try {
                    window.__zuaOpenBills && window.__zuaOpenBills();
                  } catch {}
                },
              },
              '账单',
            ),
          ),
          h(
            'div',
            { style: card },
            h('div', { style: sectionTitle }, '2026-2027 校历'),
            h(
              'div',
              null,
              `校历第 ${currentWeek} 周${sheetWeek && sheetWeek !== currentWeek ? ` · 课表为第 ${sheetWeek} 周` : ''}`,
            ),
            h(
              'div',
              { style: { marginTop: '4px', opacity: 0.85 } },
              info.examIn > 0
                ? `距${info.examLabel}还有 ${info.examIn} 天（${fmt(new Date(now.getTime() + info.examIn * 86400000))}）`
                : `${info.examLabel}进行中或已结束`,
            ),
            h(
              'div',
              { style: { opacity: 0.85 } },
              info.endIn > 0
                ? `距放${info.endLabel}还有 ${info.endIn} 天`
                : `已放${info.endLabel}，祝假期愉快`,
            ),
            msg
              ? h(
                  'div',
                  {
                    style: {
                      fontSize: '11px',
                      marginTop: '8px',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      background: 'rgba(210,120,90,0.12)',
                      color: 'var(--dsw-alias-label-primary, inherit)',
                    },
                  },
                  msg,
                )
              : null,
          ),
        ),
        h(
          'div',
          null,
          h('div', { style: sectionTitle }, '常用入口'),
          h(
            'div',
            { style: { fontSize: '11px', opacity: 0.55, marginBottom: '6px' } },
            '点击在右侧内置浏览器打开新标签，不调用系统默认程序',
          ),
          linkRow,
        ),
        h(
          'div',
          null,
          h('div', { style: sectionTitle }, '课表'),
          h(
            'div',
            { style: { ...card, display: 'flex', flexDirection: 'column', gap: '8px' } },
            h('div', null, `今天（${DAY_NAMES[today]}）· 第 ${filterWeek} 周：${todays.length ? '' : '没课'}`),
            sheetWeek
              ? h('div', { style: { fontSize: '11px', opacity: 0.6 } }, `课表按第 ${sheetWeek} 周`)
              : null,
            h(UpcomingBar, { rows: timetable, week: filterWeek, today, now }),
            h(CourseGrid, { rows: timetable, week: filterWeek, today }),
            todays.length
              ? h(
                  'ul',
                  { style: { margin: 0, paddingLeft: '18px' } },
                  todays.map((c, i) =>
                    h(
                      'li',
                      { key: i },
                      `${c.periods} 节 · ${c.name || '课程'}${c.place ? ' · ' + c.place : ''}${
                        c.weeks ? `（${c.weeks} 周）` : ''
                      }`,
                    ),
                  ),
                )
              : null,
            h(
              'div',
              { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
              h('input', {
                value: username,
                onChange: (e) => setUsername(e.target.value),
                placeholder: '学号/工号',
                autoComplete: 'username',
                style: {
                  flex: '1 1 120px',
                  minWidth: '110px',
                  padding: '5px 8px',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  color: 'inherit',
                  background: 'transparent',
                  border: '.5px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.3))',
                  borderRadius: '8px',
                },
              }),
              h('input', {
                value: password,
                onChange: (e) => setPassword(e.target.value),
                type: 'password',
                placeholder: '密码',
                autoComplete: 'current-password',
                style: {
                  flex: '1 1 110px',
                  minWidth: '100px',
                  padding: '5px 8px',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  color: 'inherit',
                  background: 'transparent',
                  border: '.5px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.3))',
                  borderRadius: '8px',
                },
              }),
              h(
                'button',
                { type: 'button', style: btnStyle, disabled: loginBusy, onClick: login },
                loginBusy ? '登录中…' : '登录并导入课表',
              ),
            ),
            loginMsg
              ? h('div', { style: { fontSize: '11px', opacity: 0.7 } }, loginMsg)
              : h(
                  'div',
                  { style: { fontSize: '11px', opacity: 0.6 } },
                  '账号只发给本机 127.0.0.1 的本地服务，再直接登录教务系统；不写入浏览器存储。',
                ),
            links.length
              ? h(
                  'div',
                  { style: { fontSize: '11px', opacity: 0.7, wordBreak: 'break-all' } },
                  `候选课表链接：${links.slice(0, 6).join('  ')}`,
                )
              : null,
            h('textarea', {
              value: draft,
              onChange: (e) => setDraft(e.target.value),
              placeholder: '也可以手动粘贴：\n周一 1-2 高等数学 3号教学楼101 1-16周\n周二 3-4 大学英语 5号教学楼203 1-8周',
              style: {
                width: '100%',
                minHeight: '72px',
                resize: 'vertical',
                fontSize: '12px',
                fontFamily: 'inherit',
                color: 'inherit',
                background: 'transparent',
                border: '.5px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.3))',
                borderRadius: '8px',
                padding: '8px',
                boxSizing: 'border-box',
              },
            }),
            h(
              'div',
              { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
              h('button', { type: 'button', style: btnStyle, onClick: save }, '保存文本课表'),
              h(
                'button',
                {
                  type: 'button',
                  style: btnStyle,
                  onClick: async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setDraft((prev) => (prev ? prev + '\n' + text : text));
                    } catch {
                      setMsg('读不到剪贴板，请手动粘贴');
                    }
                  },
                },
                '从剪贴板粘贴',
              ),
              h(
                'button',
                {
                  type: 'button',
                  style: btnStyle,
                  onClick: () => {
                    const ok = copyText(JSON.stringify(timetable));
                    setMsg(ok ? `已复制 ${timetable.length} 条课表 JSON，可粘贴到手机版` : '复制失败');
                  },
                },
                '复制课表 JSON',
              ),
              h('button', { type: 'button', style: btnStyle, onClick: clear }, '清空'),
            ),
            h('div', { style: { fontSize: '11px', opacity: 0.55 } }, '课表只存在本机浏览器。'),
          ),
        ),
      );
    }

    return {
      inject: ['slots', 'sidebarRight', 'sidebarRightTabs'],
      apply(ctx) {
        ctx.effect(
          () =>
            ctx.sidebarRightTabs.register({
              id: TYPE_ID,
              kind: KIND,
              priority: 'extension',
              title: () => '郑航面板',
              keepMounted: true,
            }),
          'zua-panel: tab type',
        );

        ctx.effect(
          () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: TYPE_ID }, Panel),
          'zua-panel: tab body',
        );

        ctx.effect(
          () =>
            ctx.sidebarRightTabs.register({
              id: '@local/zua-panel-bills',
              kind: 'zua-bills',
              priority: 'extension',
              title: () => '郑航账单',
              keepMounted: true,
            }),
          'zua-panel: bills tab type',
        );

        ctx.effect(
          () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: '@local/zua-panel-bills' }, BillsPanel),
          'zua-panel: bills tab body',
        );

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register({ name: 'shell.overlay', id: 'zua-wallet', order: 50 }, WalletWidget),
        );

        ctx.effect(() => {
          window.__zuaPanelOpen = () => {
            try {
              ctx.sidebarRight.openTab(KIND);
            } catch {}
          };
          window.__zuaOpenBills = () => {
            try {
              ctx.sidebarRight.openTab('zua-bills');
            } catch {}
          };
          window.__zuaOpenInBrowser = (url) => {
            try {
              ctx.sidebarRight.openTab('browser', { params: { url } });
              return true;
            } catch {
              return false;
            }
          };
          return () => {
            delete window.__zuaPanelOpen;
            delete window.__zuaOpenBills;
            delete window.__zuaOpenInBrowser;
          };
        }, 'zua-panel: open hooks');

        ctx.slots.inject('conversation.input.right', () =>
          ctx.slots.register(
            { name: 'conversation.input.right', id: 'zua-panel-open', order: 30 },
            OpenButton,
          ),
        );
      },
    };
  },
});
