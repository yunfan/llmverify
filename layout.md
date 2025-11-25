# RelayProbe 界面布局文档 (Layout Specification)

本文档描述了 RelayProbe Web 应用程序的整体布局结构。该应用采用 **主从式 (Master-Detail)** 设计模式，旨在高效管理多个测试目标并展示详细的验证报告。

## 1. 整体架构 (Global Structure)
应用采用全屏 Flexbox 布局 (`min-h-screen flex`)，并在视觉上分为两个主要区域：
1. **左侧侧边栏 (Sidebar Navigation)**：用于管理测试目标列表（Test Targets）。
2. **右侧主工作区 (Main Workspace)**：用于配置当前选中的目标或查看测试报告。

---

## 2. 左侧侧边栏 (Sidebar)
*   **宽度**: 固定宽度 (`w-80`, 320px)。
*   **层级**: `z-20`，位于主内容左侧。
*   **组成部分**:
    *   **头部 (Header)**:
        *   包含应用图标（渐变背景容器）、应用名称 ("RelayProbe") 和版本号标签。
        *   视觉上通过底部边框 (`border-b`) 与列表区隔开。
    *   **列表区 (Target List)**:
        *   可滚动的区域 (`flex-1 overflow-y-auto`)。
        *   显示所有已创建的 "测试目标 (Test Target)" 卡片。
        *   **卡片状态**:
            *   **默认态**: 透明背景。
            *   **悬停态**: 深色背景 (`hover:bg-slate-800`)。
            *   **选中态**: 带有 Indigo 色调的背景和边框 (`bg-indigo-600/10`)，文字高亮。
        *   **卡片内容**: 测试名称、协议类型标签 (GEMINI/OPENAI)、模型名称、以及简略的测试结果统计（如 "5 OK"）。
    *   **底部操作区 (Footer Action)**:
        *   固定在底部。
        *   包含 "Add New Target" 按钮，采用虚线边框设计，点击后新增测试会话。

---

## 3. 右侧主工作区 (Main Workspace)
*   **布局**: 占据剩余空间 (`flex-1`)，纵向排列。
*   **组成部分**:

### 3.1 顶部导航栏 (Workspace Header)
*   **高度**: 固定 (`h-16`, 64px)。
*   **功能**:
    *   **目标重命名**: 左侧提供可编辑的输入框，用于修改当前测试任务的名称。
    *   **视图切换 (Tabs)**: 位于中间，提供两个选项卡切换视图：
        *   **Configuration (配置)**: 设置 API 和参数。
        *   **Report (报告)**: 查看测试结果和统计。若有结果，徽章 (Badge) 会显示条目数量。
    *   **全局操作 (Global Actions)**: 右侧包含进度指示器（加载动画 + 百分比）和 "Run Test"（运行测试）主按钮。

### 3.2 内容区域 (Content Area)
*   **布局**: 可滚动区域 (`overflow-y-auto`)，内边距 (`p-6`)。
*   **根据 Tab 状态显示不同内容**:

#### A. 配置视图 (Configuration View)
*   **容器**: 居中的卡片式布局 (`max-w-3xl`)。
*   **表单组件**:
    *   **协议选择 (Protocol)**: 两个并排的大按钮 (Google GenAI / OpenAI Relay)，选中时高亮对应主题色。
    *   **基础 URL (Base URL)**: 带有图标前缀的输入框，支持自定义 API 端点。
    *   **模型选择 (Model Selection)**: 混合输入控件 (Hybrid Input)。左侧为文本输入框（支持手动输入），右侧为下拉选择框（提供主流模型预设）。
    *   **API Key 输入**: 大文本区域 (`textarea`)，支持多行输入，右下角悬浮 "清空" 按钮。

#### B. 报告视图 (Report View)
*   **空状态 (Empty State)**: 当无数据时，显示引导文案和跳转按钮。
*   **仪表盘 (Dashboard)**:
    *   **统计卡片 (Stats Cards)**: 顶部横排 4 个卡片，分别展示 Total (总数), Valid (有效), Invalid (无效), Avg Latency (平均延迟)。
    *   **延迟图表 (Latency Chart)**: 柱状图展示响应时间的分布情况 (Recharts)。
*   **结果表格 (Results Table)**:
    *   **表头**: 固定吸顶 (`sticky top-0`)，包含 "Export CSV" 导出按钮。
    *   **数据列**: Key Mask (脱敏密钥), Status (状态徽章), Latency (延迟数值), Details (错误信息或模型名)。
    *   **行样式**: 状态列使用颜色编码的胶囊样式 (Pill/Badge)。