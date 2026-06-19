# Rule Horror Game — PRD Phase 3-5

> 当前状态：Phase 1-2 完成，统一树形视图，Playwright 10 tests
> **Date:** 2026-06-19

---

## 总览

| Phase | 目标 | 预估 | 优先级 |
|-------|------|------|--------|
| Phase 3 | 分支快照 + 存档系统 | ~2天 | P0 |
| Phase 4 | 关卡编辑器 | ~4天 | P2 |
| Phase 5 | 部署 + 移动端 + PWA | ~1天 | P1 |
| Phase 3.5 | 背景图生成 (Minimax) | ~1h | P1 |
| Phase 3.6 | 更多关卡内容 | ~1天 | P2 |

---

## Phase 3: 分支快照系统 — 核心差异化功能

### 3.1 自动存档 (Auto-Snapshot)
- **触发时机**：每次进入有 ≥2 个可见子节点的节点时自动存档
- **存储**：localStorage (`rule_horror_saves`)
- **存档内容**：完整 GameState 序列化
- **UI**：左下角 toast "💾 已存档"

### 3.2 存档管理
- **存档列表**：☰ 菜单 → "存档管理" → 列表（时间戳 + 节点名 + 标签）
- **快速读档**：点击存档 → 确认 → restore
- **手动存档**：☰ → "💾 手动存档"
- **删除存档**：长按 / 右键删除
- **最多 20 个**：超出自动删最旧

### 3.3 死亡/结局后处理
- 到达 ending 类型节点 → 显示结局面板（名称 + 文本 + 重试按钮）
- "回到上个分支点" → restore 最近存档
- "重新开始" → resetGame + initGame

### 3.4 分支地图 (BranchMap)
- **位置**：右上角小地图按钮 → 展开 minimap
- **内容**：已访问节点 + 当前节点 + 未探索分支（虚线）
- **交互**：点击已访问节点 → 跳转（确认后）
- **实现**：缩微版 dagre 布局 + SVG

### 3.5 结局画廊
- ☰ → "结局收藏" → 网格展示所有结局
- 已解锁：显示名称 + 文字 + 类型图标
- 未解锁：??? 占位符
- 进度条：X/4 已解锁

### 任务拆分

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| T1 | 序列化/反序列化完善 | `store/gameStore.ts` | - |
| T2 | localStorage 持久化层 | `data/persistence.ts` (新) | - |
| T3 | 自动存档触发 + toast | `store/gameStore.ts`, `ui/Toast.tsx` (新) | T1, T2 |
| T4 | 存档管理 UI | `ui/SaveManager.tsx` (新) | T3 |
| T5 | 结局面板 | `ui/EndingPanel.tsx` (新) | - |
| T6 | 死亡/结局后处理 | `store/gameStore.ts`, `GameShell.tsx` | T5 |
| T7 | BranchMap minimap | `ui/BranchMap.tsx` (新) | - |
| T8 | 结局画廊 | `ui/EndingGallery.tsx` (新) | T5 |
| T9 | 集成 + Playwright 测试 | `GameShell.tsx`, `e2e/` | T1-T8 |

---

## Phase 3.5: 背景图生成

### 任务
| # | 任务 | 依赖 |
|---|------|------|
| T10 | 用 Minimax `text_to_image` 生成 7 张暗调氛围图 | - |
| T11 | 保存到 `src/data/backgrounds/apartment_night/` | T10 |
| T12 | 填入 `bgImages` 映射 | T11 |
| T13 | 验证背景切换效果 | T12 |

---

## Phase 5: 部署 + 移动端 + PWA

### 5.1 部署 (Cloudflare Pages)
- `npx wrangler pages deploy dist`
- 自定义域名 (可选)

### 5.2 移动端适配
- viewport: `maximum-scale=1, user-scalable=no`
- NodeCard touch target ≥ 44px
- 画布手势：单指点击/双指缩放平移
- Inventory 横向滚动
- Notebook 全屏面板（移动端）

### 5.3 PWA
- `manifest.json`：图标、名称、全屏
- Service Worker：缓存静态资源 + 关卡 JSON
- 离线可玩

### 任务
| # | 任务 | 依赖 |
|---|------|------|
| T14 | Cloudflare Pages 部署 | - |
| T15 | 移动端响应式 CSS | - |
| T16 | 触摸手势（pinch zoom + pan） | T15 |
| T17 | PWA manifest + SW | - |

---

## Phase 4: 关卡编辑器 (P2 — 延后)

> 非当前优先，此处仅列概要，详细 PRD 另起。

- 可视化节点编辑（拖拽、连线）
- 规则编辑表单
- 内置 playtest
- JSON 导出/导入

---

## 执行顺序

```
Phase 3 (T1→T9): 分支快照系统
    ↓
Phase 3.5 (T10→T13): 背景图生成
    ↓
Phase 5 (T14→T17): 部署 + 移动端 + PWA
    ↓
Phase 4: 关卡编辑器 (延后)
```

---

## 验证标准

| Phase | 验收条件 |
|-------|---------|
| 3 | Playwright: 存档→读档→状态一致；死亡→回分支点；结局画廊显示 |
| 3.5 | 7 张背景图渲染、切换平滑、不影响文字可读性 |
| 5 | iOS Safari + Android Chrome 可玩；Lighthouse PWA ≥ 90；离线加载 |
