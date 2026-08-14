# HD2 战术配装终端

面向中文玩家的非官方 Windows 10/11 x64 单人配装工具。应用离线完成装备选择、八维规则评分、关键缺口封顶、替换建议、收藏和分享码；AI 战术报告为可选 BYOK 功能，不参与改分。

> 本项目与 Sony Interactive Entertainment、Arrowhead Game Studios 无关联。HELLDIVERS 相关商标和游戏内容归其权利人所有。

## v0.1 功能

- 护甲配置、主副武器、投掷物、4 个战略配备和强化的引导式选择器
- 终结族、自动机、光能者 × 1–10 难度 × 任务类型的场景化评分
- 清杂、中甲、重甲、爆发、控场、生存机动、续航、任务支援八维分析
- 本地收藏、装备解锁过滤和带校验的 `HD2T1` 分享码
- OpenAI 兼容接口的一次性 AI 战术报告；Key 存入 Windows Credential Manager
- 签名数据更新通道、上一版本保留、手动脱敏日志导出和零遥测

## 开发

需要 Node.js 22+、pnpm 10+、Rust stable、WebView2 和 Visual Studio C++ Build Tools。

```powershell
pnpm install
pnpm test
pnpm build
pnpm tauri dev
pnpm tauri build
```

评分、数据结构和分享码测试位于 `src/**/*.test.ts`。应用的主要数据源在 `src/data/catalog.ts`；游戏事实仅在维护阶段人工交叉核对，运行时不会连接社区 API。

## 项目记忆与跨设备继续开发

- [Codex 项目指令](AGENTS.md)
- [项目上下文](docs/PROJECT_CONTEXT.md)
- [v0.1 产品需求基线](docs/PRODUCT_REQUIREMENTS.md)
- [开发状态与交接记录](docs/DEVELOPMENT_STATUS.md)

在另一台电脑克隆本仓库并从仓库根目录启动 Codex 后，`AGENTS.md` 会提供项目级长期约束。开始新任务前仍应先核对项目上下文、产品需求和开发状态；完成阶段性功能后同步更新开发状态。

## 更新签名

发行数据清单必须包含 `schemaVersion`、`dataVersion`、`minAppVersion`、`assetUrl`、`sha256` 和 `signature`。`signature` 是对数据包 SHA-256 摘要执行 Ed25519 签名后的 Base64 值。构建发行版时设置：

- `HD2_DATA_MANIFEST_URL`：HTTPS 清单地址
- `HD2_DATA_PUBLIC_KEY`：32 字节 Ed25519 公钥的 Base64 值

私钥不得提交到仓库，应存放在 GitHub Actions secret 或离线发布环境中。

## 许可与贡献

源代码使用 [MIT](LICENSE) 许可证。标准化数据、评分标签与第三方素材不在 MIT 授权范围内，详见 [DATA_RIGHTS.md](DATA_RIGHTS.md)。数据修订通过 Issue 提议，由维护者核验后录入；数据目录不直接接收外部 PR。
