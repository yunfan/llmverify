# RelayProbe 配色方案文档 (Color Palette Specification)

本文档描述了 RelayProbe 应用程序使用的颜色系统。设计风格为 **深色模式 (Dark Mode)**，基于 Tailwind CSS 的 `Slate` 色系构建基础界面，并使用语义化颜色传达状态。

## 1. 基础色系 (Base Theme)
界面背景和结构主要由冷灰/蓝灰色调 (`Slate`) 构成，营造专业、现代且护眼的开发者工具氛围。

| 语义角色 (Role) | Tailwind 类名 | Hex (参考值) | 描述 (Description) |
| :--- | :--- | :--- | :--- |
| **应用背景** | `bg-slate-950` | `#020617` | 最深层背景，用于 `body` 和主工作区背景。 |
| **侧栏/卡片背景** | `bg-slate-900` | `#0f172a` | 侧边栏、统计卡片、表格容器的背景色。 |
| **输入框/悬停** | `bg-slate-800` | `#1e293b` | 输入框背景、列表项悬停态、次级分割线。 |
| **边框颜色** | `border-slate-800` | `#1e293b` | 主要容器、分割线的边框颜色。 |
| **次级边框** | `border-slate-700` | `#334155` | 输入框边框、卡片高亮边框。 |

## 2. 文本排版颜色 (Typography)
文本颜色通过透明度区分层级，确保信息的可读性和层次感。

| 语义角色 (Role) | Tailwind 类名 | 描述 (Description) |
| :--- | :--- | :--- |
| **主要文本** | `text-slate-200` | 标题、输入框文字、表格主要数据。 |
| **次要文本** | `text-slate-400` | 标签 (Labels)、次级说明、未选中状态图标。 |
| **辅助文本** | `text-slate-500` | 占位符 (Placeholder)、元数据、空状态说明。 |

## 3. 品牌与交互色 (Brand & Interaction)
使用 **靛蓝色 (Indigo)** 作为主品牌色，用于引导用户操作和强调选中状态。

| 语义角色 (Role) | Tailwind 类名 | Hex (参考值) | 描述 (Description) |
| :--- | :--- | :--- | :--- |
| **主色 (Primary)** | `indigo-500` / `600` | `#6366f1` | 主按钮背景、Logo 渐变、选中项高亮边框、Loading 动画。 |
| **主色文本** | `text-indigo-400` | `#818cf8` | 链接文字、强调数据、图标高亮。 |
| **主色背景(淡)** | `bg-indigo-600/10` | N/A | 侧边栏选中项背景、聚焦光环 (Ring)。 |

## 4. 语义化状态色 (Semantic Status Colors)
用于在测试报告中清晰指示 API 密钥的验证结果。

### 4.1 成功/有效 (Success/Valid)
*   **色系**: **Emerald (祖母绿)**
*   **应用**:
    *   文字: `text-emerald-400`
    *   背景: `bg-emerald-500/10`
    *   图表: `< 500ms` 的低延迟柱状条。
    *   **含义**: API Key 有效，服务正常。

### 4.2 失败/无效 (Error/Invalid)
*   **色系**: **Rose (玫瑰红)**
*   **应用**:
    *   文字: `text-rose-400`
    *   背景: `bg-rose-500/10`
    *   图标: 删除按钮 hover 态 (`hover:bg-rose-500/20`)。
    *   图表: `> 2000ms` 或错误的柱状条。
    *   **含义**: API Key 无效、网络错误或请求被拒绝。

### 4.3 警告/高延迟 (Warning/High Latency)
*   **色系**: **Amber/Orange (琥珀色/橙色)**
*   **应用**:
    *   文字: `text-orange-400`
    *   图表: `500ms - 1500ms` 的中等延迟柱状条。
    *   **含义**: API 可用但响应较慢。

### 4.4 协议标识 (Protocol Identity)
*   **Google GenAI**: 使用 **Blue (蓝色)** (`text-blue-400`, `bg-blue-500/10`)。
*   **OpenAI/Relay**: 使用 **Emerald (绿色)** (与 OpenAI 品牌色相近，复用 Emerald 色系)。

---

## 5. 特效 (Effects)
*   **玻璃拟态 (Backdrop Blur)**: `backdrop-blur-md` 用于置顶表头和部分浮层，增加现代感。
*   **阴影 (Shadows)**: 使用带颜色的阴影 (`shadow-indigo-500/20`) 增加按钮和图标的立体感和发光感。
*   **过渡 (Transitions)**: 所有交互元素均配置 `transition-all duration-200`，保证平滑的色彩和状态切换。