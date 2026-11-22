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

    async function downscale(dataUrl, maxWidth) {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('图片解码失败'));
        image.src = dataUrl;
      });
      if (img.width <= maxWidth) return dataUrl;
      const scale = maxWidth / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = Math.round(img.height * scale);
      const context = canvas.getContext('2d');
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.85);
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
                  { style: { ...td, textAlign: 'center', fontSize: '10px', opacity: 0.6, whiteSpace: 'nowrap' } },
                  label,
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
          setMsg(note || '没解析出课程，换一张更清晰的截图试试');
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
          h('div', { style: { fontSize: '15px', fontWeight: 700, marginBottom: '6px' } }, '郑航面板'),
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

        ctx.effect(() => {
          window.__zuaPanelOpen = () => {
            try {
              ctx.sidebarRight.openTab(KIND);
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
