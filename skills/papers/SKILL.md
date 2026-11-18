---
name: papers
description: 检索中英文论文与学术文献：中文用知网/万方/维普/百度学术/国家哲社/PubScholar/ChinaXiv，外文用 Crossref、arXiv、PubMed、DOAJ、OSF、Semantic Scholar、OpenAlex 等开放接口，并可通过 DOI 查找开放获取全文。Use when the user asks to find papers, literature, citations, or a paper's full text.
whenToUse: 同学或用户要查论文、找文献、做文献综述、查引用、找某篇论文的全文/DOI，或问某个研究方向有哪些论文时，先加载本技能。
---

# 论文检索（papers）

## 一、快速检索（免密钥，推荐先用）

聚合脚本在技能目录的 `scripts/paper-search.mjs`（Node 24 已装）：

```powershell
node "<技能目录>/scripts/paper-search.mjs" "关键词" --limit 5
node "<技能目录>/scripts/paper-search.mjs" "关键词" --sources=arxiv,pubmed --json
```

- 覆盖：Crossref、arXiv、PubMed、DOAJ、OSF、Semantic Scholar、OpenAlex。
- 每个来源独立失败，失败会写在结果顶部，不影响其他来源。
- **Semantic Scholar、OpenAlex 经常 429 限流**：失败就忽略，或稍等重试；Crossref/arXiv/PubMed/DOAJ/OSF 最稳。
- 输出已按标题去重、按年份排序；中文关键词也能检索（Crossref/DOAJ/Semantic Scholar 对中文支持一般，中文文献优先走下面第二节）。
- 可用 `--json` 拿结构化结果再自己整理。

## 二、中文文献

| 平台 | 地址 | 说明 |
|---|---|---|
| 中国知网 CNKI | https://kns.cnki.net/kns8s/defaultresult/index?kw={关键词} | 期刊/硕博/会议/报纸最全，**需机构订阅或校园网**；无开放 API |
| 万方数据 | https://s.wanfangdata.com.cn/paper?q={关键词} | 期刊、学位论文、会议、标准、专利；**需订阅** |
| 维普期刊 | https://qikan.cqvip.com/Qikan/Search/Index?key={关键词} | 中文期刊，科技类多；**需订阅** |
| 百度学术 | https://xueshu.baidu.com/s?wd={关键词} | 聚合搜索，找线索和引用关系；可免登录看摘要 |
| 国家哲学社会科学文献中心 | https://www.ncpssd.org/ | 社科类，**很多可免费下载**，需注册 |
| PubScholar 公益学术平台 | https://pubscholar.cn/ | 中科院建设，可检索并获取部分开放文献 |
| 中国科技论文在线 | https://www.paper.edu.cn/ | 预印本与科技论文 |

中文文献没有开放检索接口：**不要伪造 CNKI 结果**。做法是：
1. 用 `web_search` 搜 `site:cnki.net 关键词`、`site:wanfangdata.com.cn 关键词`、`site:xueshu.baidu.com 关键词` 找公开题录；
2. 把上表的检索链接给用户，说明需要校园网/订阅登录；
3. 国家哲社、PubScholar、中国科技论文在线可以先试 `web_fetch` 检索页。

## 三、外文综合检索

| 平台 | 地址 | 说明 |
|---|---|---|
| Google Scholar | https://scholar.google.com/scholar?q={关键词} | 覆盖最广；国内可能不稳定，用 `web_search` 兜底 |
| Web of Science | https://www.webofscience.com/ | SCI/SSCI 核心，**需订阅**，无开放 API |
| Scopus | https://www.scopus.com/ | Elsevier 引文库，**需订阅** |
| Semantic Scholar | https://api.semanticscholar.org/graph/v1/paper/search?query={关键词} | 免费 API，易 429；可查引用数 |
| OpenAlex | https://api.openalex.org/works?search={关键词} | 开放学术图谱，易 429 |
| PubMed | https://pubmed.ncbi.nlm.nih.gov/?term={关键词} | 生物医学；E-utilities 免密钥 |
| JSTOR | https://www.jstor.org/action/doBasicSearch?Query={关键词} | 人文社科过刊，**需订阅** |

## 四、全文出版商（多数需机构订阅）

ScienceDirect（Elsevier，理工医）https://www.sciencedirect.com/search?qs={关键词}
SpringerLink https://link.springer.com/search?query={关键词}
Wiley Online Library https://onlinelibrary.wiley.com/action/doSearch?AllField={关键词}
Taylor & Francis https://www.tandfonline.com/action/doSearch?AllField={关键词}
IEEE Xplore（电子/计算机/通信）https://ieeexplore.ieee.org/search/searchresult.jsp?queryText={关键词}
ACM DL（计算机）https://dl.acm.org/action/doSearch?AllField={关键词}
Oxford Academic https://academic.oup.com/search-results?q={关键词}
Cambridge Core https://www.cambridge.org/core/search?q={关键词}
SAGE Journals https://journals.sagepub.com/action/doSearch?AllField={关键词}

校园网、学校 VPN 或 CARSI 登录后可直接下载；不在校园网时只能看摘要，**不要尝试绕过付费墙**。

## 五、预印本与学位论文

| 平台 | 地址 |
|---|---|
| arXiv（物理/数学/CS/AI） | https://arxiv.org/list/{分类}/recent |
| bioRxiv | https://www.biorxiv.org/search/{关键词} |
| medRxiv | https://www.medrxiv.org/search/{关键词} |
| SSRN（社科/经济/法律/管理） | https://papers.ssrn.com/sol3/results.cfm?txtKey_Words={关键词} |
| Research Square | https://www.researchsquare.com/search?q={关键词} |
| ChinaXiv（中国预印本） | https://chinaxiv.org/ |
| OSF Preprints | https://osf.io/preprints/ |
| ProQuest 学位论文 | https://www.proquest.com/pqdtglobal （需订阅） |
| OATD（开放学位论文） | https://oatd.org/oatd/search?q={关键词} |
| EThOS（英国学位论文） | https://ethos.bl.uk/ （服务可能暂停，先确认） |

## 六、开放获取与全文获取

- **Unpaywall**：https://unpaywall.org/{DOI} ，查合法免费版本；API 需要真实邮箱，没有邮箱就用网页版。
- **DOAJ**：https://doaj.org/search ，开放获取期刊目录。
- **CORE**：https://core.ac.uk/search?q={关键词} （聚合开放全文，API 需注册）。
- **PubMed Central**：https://pmc.ncbi.nlm.nih.gov/?term={关键词} ，生物医学开放全文。
- 拿到 DOI 后按顺序试：Unpaywall → 出版商 OA → PMC/DOAJ/arXiv → 国家哲社/PubScholar。

## 七、引用格式

- **GB/T 7714**：作者. 题名[J]. 刊名, 年, 卷(期): 页码. DOI.
  - 学位论文：作者. 题名[D]. 学校, 年.
  - 会议：作者. 题名[C]//会议名. 出版地: 出版者, 年: 页码.
  - 电子资源：作者. 题名[EB/OL]. (发布日期)[引用日期]. URL.
- **APA 7**：Author, A. A., & Author, B. B. (Year). Title. *Journal*, volume(issue), pages. https://doi.org/xxx

## 八、检索工作流

1. 明确：主题、中英文关键词、学科、年份范围、是否需要全文。
2. 先跑 `paper-search.mjs` 拿外文题录；中文再按第二节查平台或 `web_search`。
3. 至少两个来源交叉，标题去重；只保留接口真实返回的题名、作者、年份、DOI。
4. 输出表格：题名 / 作者 / 年份 / 期刊或会议 / DOI / 链接；再挑 3–5 篇说明为什么相关。
5. 要全文时用 DOI 走第六节；找不到 OA 就如实说明需要校园网/订阅。

## 九、红线

- **不编造**论文、作者、DOI、影响因子、被引数；查不到就说查不到。
- 不帮用户下载或绕过付费墙（Sci-Hub 之类）；只给合法 OA 或机构访问途径。
- 中文平台结果要注明「来自 CNKI/万方/维普检索链接，需登录」，不要把平台页面当已核验题录。
