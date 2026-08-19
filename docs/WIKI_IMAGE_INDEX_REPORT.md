# Wiki 图片—名称对照表报告

核验日期：2026-08-19
来源站点：[Helldivers Wiki](https://helldivers.wiki.gg/)

## 覆盖结果

| 类别 | 已匹配 | 目录总数 |
| --- | ---: | ---: |
| 主武器 | 48 | 48 |
| 副武器 | 21 | 21 |
| 手雷 | 18 | 19 |
| 战备 | 88 | 88 |
| 被动 | 18 | 18 |

本机共保存 193 张原图，约 83 MB。唯一没有可用原图的是 **G-48 巨型手雷**：Wiki 页面引用的原图文件已失效。抓取过程产生的 58 个错误或未引用缓存已清理，可通过 `tools/build-wiki-image-index.mjs` 重新生成本地资料。

## 许可核验与公开范围

项目通过 Wiki 的 MediaWiki API 读取每个文件页使用的 `License/*` 模板。193 张本地原图的核验结果为：

- 74 张：`CC-BY-NC-SA`，可在满足署名、非商业和相同方式共享条件时再分发。
- 112 张：`Arrowhead`，文件页声明由 Arrowhead Game Studios 及其许可方版权所有，并受游戏 EULA 约束。
- 7 张：`UNMARKED`，文件页没有许可模板。

完整公开索引共有 194 条记录；没有下载成功的 G-48 巨型手雷同样记为 `UNMARKED` 元数据项。公开仓库只收录上述 74 张明确采用 CC BY-NC-SA 4.0 的图片，并在 `reference/wiki-publishable-image-index/THIRD_PARTY_ASSETS.md` 中逐项记录来源与署名。其余 119 张本机原图不上传，公开对照表仅发布名称、来源链接和许可状态。

这些第三方图片不属于项目 MIT 许可证范围，也不进入应用或安装包。

## 分类来源

- [主武器](https://helldivers.wiki.gg/wiki/Category%3APrimary_Weapons)
- [手雷](https://helldivers.wiki.gg/wiki/Category%3AThrowables)
- [战备](https://helldivers.wiki.gg/wiki/Category%3AStratagems)
- [被动](https://helldivers.wiki.gg/wiki/Category%3ABoosters)

## 文件位置

- 本地完整可视化表：`reference/wiki-image-index/index.html`（Git 忽略）
- 公开许可核验表：`reference/wiki-publishable-image-index/index.html`
- CSV 名称表：`reference/wiki-publishable-image-index/image-name-index.csv`
- 完整来源与许可清单：`reference/wiki-publishable-image-index/manifest.json`
- 可公开图片署名表：`reference/wiki-publishable-image-index/THIRD_PARTY_ASSETS.md`
- 本地完整抓取脚本：`tools/build-wiki-image-index.mjs`
- 公开子集生成脚本：`tools/build-publishable-wiki-index.mjs`
