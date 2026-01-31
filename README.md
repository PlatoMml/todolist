# 📝 Modern React Todo & Calendar (极简待办与日历)

一个基于 **React 19**、**TypeScript** 和 **Tailwind CSS** 构建的现代化待办事项应用。它不仅是一个任务列表，更深度集成了日历视图和强大的重复任务管理系统，坚持“本地优先（Local-First）”的数据策略，界面极简且美观。

---

## ✨ 核心特性 (Key Features)

### 1. 📅 深度集成的日历视图 (Integrated Calendar)
*   **可视化概览**：在日历上通过直观的圆点指示每日的任务状态（待办/已完成）。
*   **未来投射**：支持查看未来的任务安排，包括循环任务的虚拟预览。
*   **流畅交互**：支持年月切换，点击日期即可快速筛选当日任务。

### 2. 🔁 智能的重复任务系统 (Smart Recurring Tasks)
*   **虚拟投影机制**：重复任务不会一次性生成所有数据污染数据库，而是根据时间动态生成“虚拟任务”进行预览。
*   **灵活的重复规则**：支持“每天/每N天”以及“每月特定日期”的循环模式。
*   **独立的修改逻辑**：
    *   支持仅修改/完成/删除“当前这一次”任务。
    *   支持修改/删除“当前及未来所有”任务序列。
    *   当编辑虚拟任务时，系统会自动将其“实体化”为真实数据。

### 3. 🗂 无限级嵌套分类 (Nested Categories)
*   **树形结构**：支持无限层级的子分类创建。
*   **拖拽排序**：支持通过拖拽的方式重新排列分类顺序，或将分类移动到其他父分类下。
*   **层级管理**：清晰的展开/折叠交互，方便管理复杂的项目结构。

### 4. 📱 优秀的移动端适配 (Mobile First Design)
*   **响应式布局**：桌面端采用三栏式布局（侧边栏-日历-列表），移动端自动切换为抽屉式侧边栏。
*   **触控优化**：
    *   支持 **长按 (Long Press)** 唤起操作菜单（Action Sheet）。
    *   移动端专属的数字步进器（Stepper）输入体验。
    *   针对触摸屏优化的拖拽交互。

### 5. 🔍 强大的组织与检索 (Organization & Search)
*   **多维度筛选**：支持按标题、描述、标签进行组合搜索。
*   **灵活排序**：支持按日期、标题、创建时间、修改时间进行升序/降序排列。
*   **标签系统**：支持自定义颜色标签，快速过滤任务。
*   **多视图切换**：支持“全部”、“今天”、“未来 N 天”、“回收站”等多种视图模式。

### 6. 🛡 数据安全与持久化 (Data & Security)
*   **本地优先**：利用 `Zustand` + `Persist` 中间件，数据实时保存在浏览器 LocalStorage 中，刷新不丢失。
*   **回收站机制**：删除的任务和分类会进入回收站，支持一键还原或永久删除，防止误操作。
*   **导入导出**：支持将所有数据（任务、分类、标签）导出为 JSON 文件进行备份，并支持从文件恢复。

---

## 📸 截图 (Screenshots)

<div align="center">
  <h3>桌面端概览</h3>
  <!-- 请在根目录创建 screenshots 文件夹，并上传名为 desktop-preview.png 的截图 -->
  <img src="./screenshots/desktop-preview.png" alt="Desktop View" width="800" style="border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" />
  
  <br/><br/>

  <h3>移动端体验</h3>
  <div style="display: flex; justify-content: center; gap: 20px;">
    <!-- 请上传 mobile-list.png -->
    <img src="./screenshots/mobile-list.png" alt="Mobile List" width="300" style="border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" />
    <!-- 请上传 mobile-calendar.png -->
    <img src="./screenshots/mobile-calendar.png" alt="Mobile Calendar" width="300" style="border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" />
  </div>
</div>

> **如何让图片显示？**
> 1. 在项目根目录新建文件夹 `screenshots`。
> 2. 将截图重命名为 `desktop-preview.png`, `mobile-list.png`, `mobile-calendar.png`。
> 3. 上传到文件夹中，GitHub 会自动显示。

---

## 🛠 技术栈 (Tech Stack)

*   **Core**: React 19, TypeScript
*   **State Management**: Zustand (with Persist middleware)
*   **Styling**: Tailwind CSS (via CDN/Script)
*   **Icons**: Lucide React
*   **Date Handling**: Date-fns
*   **Utils**: UUID
*   **Module System**: ES Modules (via `importmap` & `esm.sh`)

---

## 🚀 亮点代码逻辑 (Implementation Highlights)

*   **Virtual Todo Projection**: 复杂的日期计算逻辑，用于在日历中渲染尚未生成的重复任务，并处理与真实任务的冲突（Collision Detection）。
*   **Optimistic UI**: 状态更新即时反馈，提供丝滑的用户体验。
*   **Custom Hooks**: 封装了 `useLongPress` 等钩子处理复杂的交互事件。
*   **No-Build Setup**: 本项目利用现代浏览器的 ES Module 特性和 `importmap`，无需复杂的构建步骤即可直接运行（依赖于 CDN）。

---

## 📦 如何运行 (How to run)

本项目采用了 **ES Modules** 和 **Import Maps** 架构，可以直接在现代浏览器中运行，无需传统的 Node.js 构建步骤（如 Webpack 或 Vite 打包）。

### 方法 A: 使用本地静态服务器 (推荐)

1.  克隆仓库
    ```bash
    git clone [your-repo-url]
    cd [your-repo-name]
    ```

2.  启动一个静态服务器。例如使用 Python 自带的 http.server，或者 VS Code 的 "Live Server" 插件。
    ```bash
    # 如果你安装了 Python
    python3 -m http.server 8000
    ```

3.  在浏览器中打开 `http://localhost:8000` 即可使用。

### 方法 B: 开发环境 (Development)

如果你想进行二次开发，建议配合 IDE (如 VS Code) 和 TypeScript 插件以获得最佳的代码提示体验。

---

**License**
MIT
