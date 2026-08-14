# 项目上下文

最后更新：2026-08-14

## 一句话说明

“HD2 战术配装终端”是一款面向中文《HELLDIVERS 2》玩家的非官方 Windows 桌面配装工具。核心价值是离线完成单人配装选择、场景化规则评分、缺口解释和替换建议；AI 报告是可选解释层，不参与评分。

## 仓库与技术栈

- GitHub：`https://github.com/I-am-blue/hd2-loadout-terminal`
- 应用版本：`0.1.0`
- 前端：React 19、TypeScript、Vite 6
- 桌面壳：Tauri 2、Rust
- 测试：Vitest
- 包管理器：pnpm
- 许可证：源代码 MIT；标准化数据、评分标签和第三方素材不包含在 MIT 授权内，详见 `DATA_RIGHTS.md`
- 目标平台：Windows 10/11 x64

## 关键目录

| 路径 | 职责 |
| --- | --- |
| `src/App.tsx` | 主导航、初始配装、目录加载、全局页面状态 |
| `src/views/BuilderView.tsx` | 配装选择、评分、替换建议、收藏、分享码和 AI 报告 |
| `src/views/InventoryView.tsx` | 六类装备库、解锁状态、战备分组和武器详情入口 |
| `src/views/SettingsView.tsx` | AI 设置、更新、日志、五档字体大小和 About |
| `src/components/ItemPicker.tsx` | 双语/别名搜索、定位筛选、已解锁筛选和战备分组 |
| `src/components/WeaponDetailDrawer.tsx` | 武器详情侧栏、数据来源和解锁操作 |
| `src/data/catalog.ts` | 内置装备、阵营、难度、任务和评分规则目录 |
| `src/data/weaponDetails.ts` | 人工核验后的武器事实参数与来源 |
| `src/lib/scoring.ts` | 八维评分、递减贡献、协同/冲突、封顶和替换建议 |
| `src/lib/shareCode.ts` | `HD2T1` 分享码编码、校验和安全解码 |
| `src/lib/storage.ts` | 版本化本地状态持久化 |
| `src/lib/ai.ts` | AI 缓存键、端点校验和报告结构校验 |
| `src-tauri/src/lib.rs` | Windows 凭据、AI 请求、签名数据更新和日志导出 |
| `tools/build-wiki-image-index.mjs` | 生成本地 Wiki 图片参考索引；输出不进入公开仓库 |

## 核心数据模型

- `CatalogBundle`：目录模式版本、数据版本、装备、阵营、任务、难度、规则和来源。
- `LoadoutSelection`：护甲、主武器、副武器、手雷、4 个战备和被动的稳定 ID。
- `Loadout`：选择、场景、标题、时间戳和数据版本。
- `EvaluationResult`：八维结果、权重、原始/最终分、封顶、命中规则、警告和替换候选。
- `AiReport`：摘要、优势、风险和对既有替换候选的说明；没有分数字段。
- `AppState`：收藏、解锁装备、装备库开关、AI 设置/缓存、字体大小和上次目录检查时间。

## 运行逻辑

1. 启动时先使用内置 `catalog`，再尝试加载经过校验的本地更新目录。
2. 玩家选择阵营、难度、任务及九个装备位置（其中战备占四格）。
3. 配装不完整时只显示能力覆盖和缺口；完整后计算八维及场景总分。
4. 同维度贡献按递减权重合并，随后应用上下文修正、协同/冲突边界和关键缺口封顶。
5. 本地规则搜索两条单槽替换路线。
6. 收藏、解锁状态、字体大小和 AI 缓存保存在本机；API Key 不进入该状态文件。
7. 用户主动请求 AI 报告时，前端/桌面端发送确定性评分结果，返回值经过结构校验并按配装、场景、数据版本和模型缓存。

## 安全与权利边界

- 分享码不包含 API Key 或个人信息，解码结果限制为 16KB。
- 桌面版 API Key 存入 Windows Credential Manager；浏览器预览仅用于开发，不视为生产凭据方案。
- AI、自定义数据更新和应用更新是可选网络功能；其余核心功能离线可用。
- 无遥测；诊断日志只由用户主动导出，并应脱敏。
- Wiki 和社区 API 仅作为维护参考。运行时不得依赖这些服务。
- 当前公开版本使用通用占位图形。许可不明的游戏图片只能保存在 `.gitignore` 排除的本地参考目录中。

## 本地开发

Windows 端需要 Node.js 22+、pnpm 10+、Rust stable、WebView2 和 Visual Studio C++ Build Tools。

```powershell
pnpm install
pnpm test
pnpm build
pnpm tauri dev
```

只有用户明确要求发布或生成安装包时才运行：

```powershell
pnpm tauri build
```

## 在另一台电脑继续

```powershell
git clone https://github.com/I-am-blue/hd2-loadout-terminal.git
cd hd2-loadout-terminal
pnpm install
pnpm test
```

在 Codex 中打开仓库根目录。Codex 会读取根目录 `AGENTS.md`；开始工作时仍应核对本文件、产品需求和开发状态。

