# 郑航小白 · DSH 智能体预设

郑州航空工业管理学院（郑航）的校园智能体，以 DeepSeek Harness（DSH）agent preset bundle 的形式提供。安装后，新建会话时可以在「智能体」里选择「郑航小白」。

## 能力

- 校园问答：校区、学院、教务系统、校历、办事流程、校医院、宿舍、餐厅、快递
- 校园地图导航：龙子湖校区四门、教学楼、图书馆、餐厅、宿舍群、运动场方位
- 任务规划、活动汇总、基础学术解题
- 论文检索：Crossref / arXiv / PubMed / DOAJ / OSF / Semantic Scholar / OpenAlex 开放接口
- GitHub 公开仓库查阅
- 全套工具：文件读写、命令执行、子智能体、计划模式、网页搜索

## 安装

### 方式一：从 GitHub 直接安装（推荐）

在 DSH 里打开一个具备 `plugin_manager` 工具的会话（Standard 或 Creator 模式），对它说：

> 安装 bundle：`github:<你的用户名>/dsh-zua-xiaobai-preset`

或者使用插件页「添加插件」输入同样的 git 地址。安装会请求 Full 权限确认。

### 方式二：克隆后本地安装

```sh
git clone https://github.com/<你的用户名>/dsh-zua-xiaobai-preset.git
```

然后在 DSH 里让 agent 用 `plugin_manager` 的 `install_bundle` 指向克隆目录，或在插件页选择本地目录。

### 安装后

1. 设置 → 智能体，应能看到「郑航小白」卡片（自定义分组）。
2. 新建会话，选择「郑航小白」即可使用。
3. 想默认使用，可在设置里把它设为默认。

## 仓库结构

| 路径 | 作用 |
|---|---|
| `package.json` | bundle 声明，`dsh.bundle.patch` 指向 cordis 补丁 |
| `cordis.patch.yml` | 预设声明：人设、工具组合、技能目录 |
| `skills/zua-campus/` | 郑航校园知识：学校概况、官网链接、校医院、手绘地图与方位表 |
| `skills/github/` | GitHub 公开仓库查阅规则 |
| `skills/papers/` | 论文检索规则与聚合脚本 |

## 自定义

- 改人设：编辑 `cordis.patch.yml` 中 `persona` 的 `prefix`。
- 改校园资料：编辑 `skills/zua-campus/SKILL.md` 与 `references/`，技能正文是每次加载时现读的。
- 改完提交后，其他人重新安装或更新即可。

## 说明

- 校园数据整理于 2026-11，来源为学校官网、教务处、校医院与百度地图 POI；实时信息仍会由智能体联网核对。
- 本包需要 DSH 0.2 及以上版本；安装会执行 npm 包安装与插件激活，需要 Full 权限或逐次批准。
- 与学校官方无关，仅供学习与校园信息查询使用。

## 许可

MIT
