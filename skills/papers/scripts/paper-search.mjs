#!/usr/bin/env node
// 聚合检索开放学术接口。用法：
//   node paper-search.mjs "关键词" [--limit 5] [--json] [--sources crossref,arxiv,pubmed,doaj,osf,s2,openalex]
// 每个来源独立失败，失败不阻塞其他来源。

const args = process.argv.slice(2);
const query = args.find((a) => !a.startsWith('--'));
let limit = 5;
let json = false;
let sources = ['crossref', 'arxiv', 'pubmed', 'doaj', 'osf', 's2', 'openalex'];
const sourcesArg = args.find((a) => a.startsWith('--sources='));
const limitArg = args.find((a) => a.startsWith('--limit='));
if (sourcesArg) sources = sourcesArg.slice('--sources='.length).split(',').map((s) => s.trim()).filter(Boolean);
if (limitArg) limit = Math.max(1, Math.min(20, Number(limitArg.slice('--limit='.length)) || 5));
if (args.includes('--json')) json = true;

if (!query) {
  console.error('用法: node paper-search.mjs "关键词" [--limit 5] [--json] [--sources crossref,arxiv,pubmed,doaj,osf,s2,openalex]');
  process.exit(2);
}

const TIMEOUT = 15000;
const getJSON = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { 'user-agent': 'dsh-paper-search/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
const getText = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { 'user-agent': 'dsh-paper-search/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
};
const firstAuthors = (list, n = 3) => (list || []).slice(0, n).join('; ') + ((list || []).length > n ? ' 等' : '');
const clean = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const handlers = {
  async crossref() {
    const d = await getJSON(`https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}&select=title,author,issued,DOI,URL,is-referenced-by-count,container-title`);
    return (d.message?.items || []).map((it) => ({
      source: 'Crossref',
      year: it.issued?.['date-parts']?.[0]?.[0] || '',
      title: clean(it.title?.[0]),
      authors: firstAuthors((it.author || []).map((a) => [a.family, a.given].filter(Boolean).join(' '))),
      venue: clean(it['container-title']?.[0]),
      doi: it.DOI || '',
      cites: it['is-referenced-by-count'] ?? '',
      url: it.URL || (it.DOI ? `https://doi.org/${it.DOI}` : ''),
    }));
  },

  async arxiv() {
    const xml = await getText(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}`);
    const entries = xml.split('<entry>').slice(1);
    return entries.map((e) => {
      const title = clean(e.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
      const published = e.match(/<published>(\d{4})/)?.[1] || '';
      const id = e.match(/<id>([^<]+)<\/id>/)?.[1] || '';
      const authors = [...e.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1]);
      return { source: 'arXiv', year: published, title, authors: firstAuthors(authors), venue: 'arXiv', doi: '', cites: '', url: id };
    }).filter((r) => r.title);
  },

  async pubmed() {
    const es = await getJSON(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${limit}&retmode=json&sort=relevance`);
    const ids = es.esearchresult?.idlist || [];
    if (!ids.length) return [];
    const sum = await getJSON(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`);
    return ids.map((id) => {
      const it = sum.result?.[id] || {};
      const doi = (it.articleids || []).find((a) => a.idtype === 'doi')?.value || '';
      return {
        source: 'PubMed',
        year: it.pubdate?.match(/\d{4}/)?.[0] || '',
        title: clean(it.title),
        authors: firstAuthors((it.authors || []).map((a) => a.name)),
        venue: clean(it.fulljournalname || it.source),
        doi,
        cites: '',
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      };
    }).filter((r) => r.title);
  },

  async doaj() {
    const d = await getJSON(`https://doaj.org/api/search/articles/${encodeURIComponent(query)}?pageSize=${limit}`);
    return (d.results || []).map((r) => {
      const b = r.bibjson || {};
      const doi = (b.identifier || []).find((i) => i.type === 'doi')?.id || '';
      return {
        source: 'DOAJ',
        year: b.year || '',
        title: clean(b.title),
        authors: firstAuthors((b.author || []).map((a) => a.name)),
        venue: clean(b.journal?.title),
        doi,
        cites: '',
        url: doi ? `https://doi.org/${doi}` : (b.link?.[0]?.url || ''),
      };
    }).filter((r) => r.title);
  },

  async osf() {
    const d = await getJSON(`https://api.osf.io/v2/preprints/?filter%5Btitle%5D=${encodeURIComponent(query)}&page%5Bsize%5D=${limit}`);
    return (d.data || []).map((r) => ({
      source: 'OSF',
      year: (r.attributes?.date_published || '').slice(0, 4),
      title: clean(r.attributes?.title),
      authors: '',
      venue: 'OSF Preprints',
      doi: r.attributes?.doi || '',
      cites: '',
      url: `https://osf.io/preprints/${r.id}`,
    })).filter((r) => r.title);
  },

  async s2() {
    const d = await getJSON(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,year,authors,citationCount,externalIds,url,venue`);
    return (d.data || []).map((p) => ({
      source: 'Semantic Scholar',
      year: p.year || '',
      title: clean(p.title),
      authors: firstAuthors((p.authors || []).map((a) => a.name)),
      venue: clean(p.venue),
      doi: p.externalIds?.DOI || '',
      cites: p.citationCount ?? '',
      url: p.url || (p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : ''),
    })).filter((r) => r.title);
  },

  async openalex() {
    const d = await getJSON(`https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}`);
    return (d.results || []).map((w) => ({
      source: 'OpenAlex',
      year: w.publication_year || '',
      title: clean(w.title),
      authors: firstAuthors((w.authorships || []).map((a) => a.author?.display_name).filter(Boolean)),
      venue: clean(w.primary_location?.source?.display_name),
      doi: (w.doi || '').replace('https://doi.org/', ''),
      cites: w.cited_by_count ?? '',
      url: w.doi || w.id,
    })).filter((r) => r.title);
  },
};

const run = async () => {
  const wanted = sources.filter((s) => handlers[s]);
  const results = await Promise.allSettled(wanted.map((s) => handlers[s]()));
  const rows = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') rows.push(...r.value);
    else errors.push(`${wanted[i]}: ${r.reason?.message || r.reason}`);
  });

  // 按标题去重，保留信息更全的一条
  const seen = new Map();
  for (const r of rows) {
    const key = r.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
    if (!key) continue;
    const old = seen.get(key);
    if (!old || (!old.doi && r.doi)) seen.set(key, r);
  }
  const out = [...seen.values()].sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0)).slice(0, limit * 3);

  if (json) {
    console.log(JSON.stringify({ query, count: out.length, results: out, errors }, null, 2));
    return;
  }
  console.log(`# 检索：${query}`);
  if (errors.length) console.log(`（部分来源失败：${errors.join(' | ')}）`);
  console.log('');
  console.log('| 来源 | 年份 | 标题 | 作者 | DOI | 链接 |');
  console.log('|---|---|---|---|---|---|');
  for (const r of out) {
    const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');
    console.log(`| ${esc(r.source)} | ${esc(r.year)} | ${esc(r.title)} | ${esc(r.authors)} | ${esc(r.doi)} | ${esc(r.url)} |`);
  }
  console.log('');
  console.log(`共 ${out.length} 条（已按标题去重）`);
};

run().catch((e) => { console.error(e); process.exit(1); });
