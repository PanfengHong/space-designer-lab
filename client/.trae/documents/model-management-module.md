# 模型管理模块实现计划

## Context
用户需要一个独立的模型管理页面，登录后默认进入。管理两类模型：**家具模型**和**户型模板**。每个模型卡片含 3D 预览图、基本信息和操作按钮。从卡片可"进入设计器"。数据使用 Mock API 模拟后端，为未来接真实后端做准备。

## 页面流程
```
登录页 → 模型管理页（默认） → 点击卡片"进入设计器" → 设计器页面
（设计器页面不再有返回模型管理的入口，单向跳转）
```

## 实现步骤

### 1. 类型定义扩展（`types/index.ts`）

```typescript
// 模型分类
type ModelCategory = 'furniture' | 'apartment';

// 模型卡片数据
interface ModelItem {
  id: string;
  name: string;
  category: ModelCategory;
  type?: string;        // 家具类型 (sofa/bed/table...) 或户型类型 (one-bed/two-bed...)
  size?: [number, number, number];  // 家具尺寸
  color?: string;       // 家具颜色
  tags: string[];
  thumbnail?: string;   // 预览图 (家具用 type 渲染 3D, 户型用截图)
  createdAt: string;
  updatedAt: string;
}
```

### 2. Mock API（`src/api/mockApi.ts`）
- `getModelList(category?)` → 返回模型列表，模拟 200ms 延迟
- `createModel(data)` → 新增，返回带 id 的新模型
- `updateModel(id, data)` → 更新
- `deleteModel(id)` → 删除
- `getModelById(id)` → 查询单个
- 内部用 `localStorage` 持久化，首次加载从 `mockScene.ts` 数据生成种子列表

### 3. Store 扩展（`useAppStore.ts`）
新增：
```typescript
// 当前页面: 'management' | 'designer'
currentPage: 'management' | 'designer';
setCurrentPage: (page) => void;
// 当前选中进入设计器的模型
activeModelId: string | null;
setActiveModelId: (id) => void;
```

### 4. 模型管理页面（`src/components/model/ModelManagement.tsx`）
布局结构：
```
┌─ TopBar (精简版: Logo + 用户信息 + "返回设计器")
├─ Tab 切换: [家具模型] [户型模板]
├─ 工具栏: [搜索框] [类型筛选] [新增模型]
├─ 卡片网格 (grid-cols-3, gap-6)
│   ┌─────────────────┐
│   │  3D 预览区 (120px高) │  ← Canvas mini 渲染
│   │  家具名 / 类型标签    │
│   │  尺寸 W×D×H          │
│   │  [编辑] [删除] [进入] │
│   └─────────────────┘
└─ 分页
```

### 5. 3D 缩略图预览（`src/components/model/ModelThumbnail.tsx`）
- 小型 Canvas（200×140），独立场景
- 家具模型：根据 `type` 渲染对应家具组件，自动相机适配
- 户型模板：渲染简化建筑体块
- 使用 `OrbitControls` autoRotate，但可暂停
- 灯光使用简化版环境光

### 6. 新增/编辑弹窗（`src/components/model/ModelForm.tsx`）
- Modal 形式，居中弹出
- 家具：名称、类型(下拉)、尺寸(W/D/H)、颜色(色板)、标签
- 户型：名称、类型、标签
- 保存调用 Mock API

### 7. App.tsx 路由切换
```typescript
if (!isLoggedIn) return <Login />;
if (currentPage === 'management') return <ModelManagement />;
return <DesignerLayout />;  // 现有的 TopBar+LeftPanel+Viewport
```

### 8. App.tsx 路由切换
```typescript
if (!isLoggedIn) return <Login />;
if (currentPage === 'management') return <ModelManagement />;
return <DesignerLayout />;  // 现有的 TopBar+LeftPanel+Viewport
```
（设计器页面无模型管理入口，从管理页单向进入）

## 关键文件清单

| 文件 | 操作 |
|------|------|
| `src/types/index.ts` | 新增 `ModelItem`、`ModelCategory` 类型 |
| `src/api/mockApi.ts` | 新建，Mock API + localStorage |
| `src/store/useAppStore.ts` | 新增 `currentPage`、`activeModelId` |
| `src/components/model/ModelManagement.tsx` | 新建，主页面 |
| `src/components/model/ModelThumbnail.tsx` | 新建，3D 缩略图 |
| `src/components/model/ModelCard.tsx` | 新建，卡片组件 |
| `src/components/model/ModelForm.tsx` | 新建，新增/编辑弹窗 |
| `src/App.tsx` | 修改，加页面切换逻辑 |

## 验证方式
1. 登录后应自动进入模型管理页
2. Tab 切换家具/户型，卡片列表正确渲染
3. 新增模型 → 弹窗填写 → 保存后列表更新
4. 编辑模型 → 信息回填 → 保存后更新
5. 删除模型 → 确认 → 列表移除
6. 搜索/筛选正常工作
7. 点击卡片"进入设计器" → 跳转到设计器页面
8. 刷新后数据不丢失（localStorage）
