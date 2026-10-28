import { create } from 'zustand';
import type {
  Space,
  ModelLayer,
  DesignStyle,
  ViewMode,
  RenderMode,
  SceneData,
  ViewSettings,
  ModelItem,
  Furniture,
  DesignerMode,
  OutdoorSceneData,
  GroundItem,
  OutdoorObject,
} from '../types';
import { mockSceneData, getSceneForModel } from '../data/mockScene';
import { demoOutdoorScene, getOutdoorSceneForModel } from '../data/outdoorScene';
import { saveSceneForModel, loadSceneForModel } from '../api/mockApi';
import type { StructurePayload, StructureTemplate } from '../utils/structurePlacement';

interface AppState {
  // 空间列表 (从当前 sceneData.rooms 动态拼装)
  spaces: Space[];
  selectSpace: (id: string) => void;
  activeSpaceId: string | null;

  // 相机聚焦请求 (空间目录点元素 → 相机飞到该元素上方)
  // nonce 保证连续点同一元素也能重复触发; SpaceFocusController 消费后不清除 (留在原地无害)
  cameraFocus: { x: number; z: number; nonce: number } | null;
  focusCamera: (x: number, z: number) => void;

  // 删除确认框 (瞬态, 不进历史栈): 所有删除入口 (Delete 键 / 属性面板删除按钮)
  // 统一走 requestDeleteConfirm, 由 Viewport 渲染 ConfirmDialog
  deleteConfirm: { title: string; message: string; onConfirm: () => void } | null;
  requestDeleteConfirm: (title: string, message: string, onConfirm: () => void) => void;
  cancelDeleteConfirm: () => void;

  // 设计器模式 (室内 / 户外)
  designerMode: DesignerMode;
  setDesignerMode: (mode: DesignerMode) => void;

  // 模型层级 (室内: building/interior; 户外: ground/space)
  layers: ModelLayer[];
  toggleLayer: (id: string) => void;

  // 选中的家具
  selectedFurnitureId: string | null;
  selectFurniture: (id: string | null) => void;

  // 选中的建筑结构 (墙/门/窗/飘窗/落地窗/地板)
  // ID 格式: wall:<roomId>:<wallId> | door:<roomId>:<doorId> | window:<roomId>:<winId>
  //          bay:<roomId>:<bayId> | french:<roomId>:<fwId> | floor:room:<roomId>
  selectedStructureId: string | null;
  selectStructure: (id: string | null) => void;

  // 设计风格
  styles: DesignStyle[];
  designStyleId: string;
  selectStyle: (id: string) => void;

  // 视图模式
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // 渲染模式
  renderMode: RenderMode;
  setRenderMode: (mode: RenderMode) => void;

  // 视角预设
  cameraPreset: string;
  setCameraPreset: (preset: string) => void;

  // 场景数据 (根据 activeModel 动态切换)
  sceneData: SceneData;
  setSceneData: (scene: SceneData) => void;

  // 视图设置
  viewSettings: ViewSettings;
  updateViewSettings: (key: keyof ViewSettings, value: boolean | number | string) => void;

  // 右侧面板开关
  rightPanelOpen: boolean;
  toggleRightPanel: () => void;

  // 重置视角
  resetCamera: boolean;
  triggerResetCamera: () => void;

  // 漫游视角点索引
  walkthroughIndex: number;
  setWalkthroughIndex: (i: number) => void;

  // 全屏模式 (隐藏 TopBar + LeftPanel)
  isFullscreen: boolean;
  toggleFullscreen: () => void;

  // 左侧栏展开/收起
  leftPanelOpen: boolean;
  toggleLeftPanel: () => void;

  // 实时比例尺 (真实世界 1 米 = 多少屏幕像素)
  pixelsPerMeter: number;
  setPixelsPerMeter: (v: number) => void;

  // 登录状态
  isLoggedIn: boolean;
  currentUser: { username: string } | null;
  login: (username: string) => void;
  logout: () => void;

  // 当前选中进入设计器的模型
  activeModelId: string | null;
  activeModelItem: ModelItem | null;
  setActiveModelId: (id: string | null) => void;
  // 设置当前模型 (同时更新 sceneData 和 spaces)
  setActiveModel: (model: ModelItem | null) => void;

  // 拖拽中的家具模板 (从素材库拖出时设置)
  draggingFurniture: { type: Furniture['type']; name: string; size: [number, number, number]; color: string } | null;
  setDraggingFurniture: (f: { type: Furniture['type']; name: string; size: [number, number, number]; color: string } | null) => void;

  // 正在从素材库拖拽的建筑结构元素 (墙体/门/窗/飘窗/落地窗)
  draggingStructure: StructureTemplate | null;
  setDraggingStructure: (t: StructureTemplate | null) => void;

  // 拖拽预览位置 (地板世界坐标 x, z)
  dragGhostPos: [number, number] | null;
  setDragGhostPos: (pos: [number, number] | null) => void;

  // 向场景中添加家具 (放到指定房间)
  addFurniture: (roomId: string, furniture: Furniture) => void;
  // 从场景中删除家具
  removeFurniture: (furnitureId: string) => void;
  // 更新家具位置/旋转/尺寸等
  updateFurniture: (furnitureId: string, patch: Partial<Furniture>) => void;
  // 复制家具 (偏移 0.4m 生成副本并选中)
  duplicateFurniture: (furnitureId: string) => void;

  // ===== 变换会话 (拖拽移动 / 旋转手柄) =====
  // 会话期间原家具隐藏, 由 3D 层的 ghost 克隆体实时跟随指针, 松手才提交 (只产生一条历史)
  // startX/startY: 按下时的屏幕坐标, 供拖动阈值判断 (点选不应被当成拖动)
  transformSession: { id: string; mode: 'move' | 'rotate'; startX?: number; startY?: number } | null;
  beginTransform: (id: string, mode: 'move' | 'rotate', startX?: number, startY?: number) => void;
  endTransform: () => void;

  // ===== 撤销 / 重做 =====
  // 栈内容随 historyMode 变化 (室内 sceneData / 户外 outdoorSceneData 二选一),
  // 切换模式或切换模型时清空。读取 past.length 判断按钮可用性即可。
  past: HistoryEntry[];
  future: HistoryEntry[];
  undo: () => void;
  redo: () => void;

  // 更新建筑结构 (门/窗/飘窗/落地窗/墙)
  // selector 格式: "wall:<roomId>:<id>" / "door:<roomId>:<id>" / "window:<roomId>:<id>" / "bay:<roomId>:<id>" / "french:<roomId>:<id>"
  updateStructure: (selector: string, patch: Record<string, unknown>) => void;
  // 从素材库拖入的建筑结构元素: 落位后追加到对应房间并选中
  addStructure: (roomId: string, payload: StructurePayload) => void;
  // 删除建筑结构元素 (selector 与 updateStructure 同格式)
  removeStructure: (selector: string) => void;

  // ===== 户外空间设计 =====
  // 户外场景数据 (地面结构层 + 空间设计层)
  outdoorSceneData: OutdoorSceneData;
  setOutdoorSceneData: (scene: OutdoorSceneData) => void;

  // 选中的地面元素 / 空间对象
  selectedGroundId: string | null;
  selectGround: (id: string | null) => void;
  selectedOutdoorObjectId: string | null;
  selectOutdoorObject: (id: string | null) => void;

  // 地面元素 CRUD
  addGroundItem: (item: GroundItem) => void;
  updateGroundItem: (id: string, patch: Partial<GroundItem>) => void;
  removeGroundItem: (id: string) => void;

  // 空间对象 CRUD
  addOutdoorObject: (item: OutdoorObject) => void;
  updateOutdoorObject: (id: string, patch: Partial<OutdoorObject>) => void;
  removeOutdoorObject: (id: string) => void;

  // 拖拽中的户外素材模板
  draggingOutdoor: {
    kind: 'ground' | 'object';
    type: string;
    name: string;
    size: [number, number, number];
    color: string;
  } | null;
  setDraggingOutdoor: (f: {
    kind: 'ground' | 'object';
    type: string;
    name: string;
    size: [number, number, number];
    color: string;
  } | null) => void;
  // 拖拽预览位置
  outdoorDragGhostPos: [number, number] | null;
  setOutdoorDragGhostPos: (pos: [number, number] | null) => void;

  // 设置当前园区模型 (切换户外场景)
  activeCampusItem: ModelItem | null;
  setActiveCampus: (model: ModelItem | null) => void;

  // ===== 保存状态 =====
  // 是否有未保存的修改
  isDirty: boolean;
  // 标记脏状态 (场景数据被修改时调用)
  markDirty: () => void;
  // 保存当前场景 (室内 sceneData / 户外 outdoorSceneData) 到 localStorage
  saveCurrentScene: () => Promise<boolean>;
}

/* ==================== 撤销/重做 辅助 ==================== */
/** 历史栈上限 (超出丢弃最旧快照) */
const HISTORY_LIMIT = 80;

/**
 * 历史条目: 室内与户外共用同一对 past/future 栈, 由 historyMode 决定栈里装的是什么。
 * sceneData / outdoorSceneData 全程以不可变方式更新 (map/spread), 直接存引用即可安全回溯。
 */
type HistoryEntry = SceneData | OutdoorSceneData;

interface HistorySlice {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

/**
 * 取一份"修改前"的场景历史快照 (按当前设计器模式选择对应数据)。
 * 每次记录会清空重做栈 (新分支覆盖旧未来)。
 */
function snapshot(state: AppState): HistorySlice {
  const current: HistoryEntry =
    state.designerMode === 'outdoor' ? state.outdoorSceneData : state.sceneData;
  return {
    past: [...state.past, current].slice(-HISTORY_LIMIT),
    future: [],
  };
}

/** 结构元素 → 选中 selector (与 updateStructure / LeftPanel 的格式保持一致) */
function structureSelector(roomId: string, payload: StructurePayload): string {
  switch (payload.kind) {
    case 'wall':
      return `wall:${roomId}:${payload.wall.id}`;
    case 'door':
      return `door:${roomId}:${payload.door.id}`;
    case 'window':
      return `window:${roomId}:${payload.window.id}`;
    case 'bayWindow':
      return `bay:${roomId}:${payload.bayWindow.id}`;
    case 'frenchWindow':
      return `french:${roomId}:${payload.frenchWindow.id}`;
  }
}

/** 场景切换后重建空间列表 */
function spacesOf(scene: SceneData): Space[] {
  return scene.rooms.map((r, i) => ({ id: r.id, name: r.name, order: i + 1 }));
}

export const useAppStore = create<AppState>((set, get) => ({
  // 从 mockSceneData.rooms 动态拼装, 保持原有数组顺序作为 order
  spaces: mockSceneData.rooms.map((r, i) => ({ id: r.id, name: r.name, order: i + 1 })),
  activeSpaceId: null,
  selectSpace: (id) => set({ activeSpaceId: id }),

  cameraFocus: null,
  focusCamera: (x, z) =>
    set((s) => ({ cameraFocus: { x, z, nonce: (s.cameraFocus?.nonce ?? 0) + 1 } })),

  deleteConfirm: null,
  requestDeleteConfirm: (title, message, onConfirm) => set({ deleteConfirm: { title, message, onConfirm } }),
  cancelDeleteConfirm: () => set({ deleteConfirm: null }),

  // 设置场景数据, 同时刷新 spaces 列表和清除选中状态
  setSceneData: (scene) =>
    set({
      sceneData: scene,
      spaces: spacesOf(scene),
      activeSpaceId: null,
      selectedFurnitureId: null,
      selectedStructureId: null,
      // 换场景后历史无意义, 直接清空
      past: [],
      future: [],
    }),

  designerMode: 'interior',
  // 切换设计器模式: 替换模型分层、重置风格、清空选中与历史
  // 历史栈是两种模式共用的, 模式切换后旧的撤销记录已无意义, 必须清空
  setDesignerMode: (mode) =>
    set(() => {
      if (mode === 'outdoor') {
        return {
          designerMode: 'outdoor',
          layers: [
            { id: 'ground', name: '地面结构层', locked: true },
            { id: 'space', name: '空间设计层', locked: true },
          ],
          designStyleId: 'park2',
          selectedGroundId: null,
          selectedOutdoorObjectId: null,
          past: [],
          future: [],
        };
      }
      return {
        designerMode: 'interior',
        layers: [
          { id: 'building', name: '建筑结构层', locked: true },
          { id: 'interior', name: '室内设计层', locked: true },
        ],
        designStyleId: 'base',
        selectedStructureId: null,
        selectedFurnitureId: null,
        past: [],
        future: [],
      };
    }),

  layers: [
    { id: 'building', name: '建筑结构层', locked: true },
    { id: 'interior', name: '室内设计层', locked: true },
  ],
  toggleLayer: (id) =>
    set((state) => {
      const target = state.layers.find((l) => l.id === id);
      const willLock = target ? !target.locked : false;
      return {
        layers: state.layers.map((l) =>
          l.id === id ? { ...l, locked: !l.locked } : l
        ),
        // 锁定时清空对应层的选中
        ...(willLock && id === 'building' ? { selectedStructureId: null } : {}),
        ...(willLock && id === 'interior' ? { selectedFurnitureId: null } : {}),
        ...(willLock && id === 'ground' ? { selectedGroundId: null } : {}),
        ...(willLock && id === 'space' ? { selectedOutdoorObjectId: null } : {}),
      };
    }),

  selectedFurnitureId: null,
  selectFurniture: (id) =>
    set((state) => ({
      selectedFurnitureId: id,
      selectedStructureId: id ? null : state.selectedStructureId,
    })),

  selectedStructureId: null,
  selectStructure: (id) =>
    set((state) => ({
      selectedStructureId: id,
      selectedFurnitureId: id ? null : state.selectedFurnitureId,
    })),

  styles: [
    { id: 'base', code: 'BASE',      label: '基础空间',     color: '#f5f5f5' },
    { id: 'style1', code: 'STYLE 01', label: '中古现代',     color: '#c8a882' },
    { id: 'style2', code: 'STYLE 02', label: '低素感禅味',   color: '#d4c5b0' },
    { id: 'style3', code: 'STYLE 03', label: '现代简约',     color: '#2d3436' },
  ],
  designStyleId: 'base',
  selectStyle: (id) => set({ designStyleId: id }),

  viewMode: 'perspective',
  setViewMode: (mode) => set({ viewMode: mode }),

  renderMode: 'arctic',
  setRenderMode: (mode) => set({ renderMode: mode }),

  cameraPreset: '整体',
  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  sceneData: mockSceneData,

  viewSettings: {
    showSpaceName: false,
    showTrafficLines: false,
    showCeiling: false,
    showDoorsOpen: false,
    showDimensions: false,
    wallCutHeight: 2.5,
    lighting: '自然光照',
    showLabels: false,
  },
  updateViewSettings: (key, value) =>
    set((state) => ({
      viewSettings: { ...state.viewSettings, [key]: value },
    })),

  rightPanelOpen: true,
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  resetCamera: false,
  triggerResetCamera: () => set((s) => ({ resetCamera: !s.resetCamera })),

  walkthroughIndex: 0,
  setWalkthroughIndex: (i) => set({ walkthroughIndex: i }),

  isFullscreen: false,
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),

  leftPanelOpen: true,
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),

  pixelsPerMeter: 14,
  setPixelsPerMeter: (v) => set({ pixelsPerMeter: v }),

  // 登录状态 (持久化到 localStorage)
  isLoggedIn: (() => {
    try {
      return localStorage.getItem('sd_logged_in') === '1';
    } catch {
      return false;
    }
  })(),
  currentUser: (() => {
    try {
      const u = localStorage.getItem('sd_username');
      return u ? { username: u } : null;
    } catch {
      return null;
    }
  })(),
  login: (username) => {
    try {
      localStorage.setItem('sd_logged_in', '1');
      localStorage.setItem('sd_username', username);
    } catch {}
    set({ isLoggedIn: true, currentUser: { username } });
  },
  logout: () => {
    try {
      localStorage.removeItem('sd_logged_in');
      localStorage.removeItem('sd_username');
    } catch {}
    set({ isLoggedIn: false, currentUser: null });
  },

  activeModelId: null,
  activeModelItem: null,
  setActiveModelId: (id) => set({ activeModelId: id }),
  // 设置当前模型: 更新 modelId/item, 并根据模型类别切换 sceneData
  // 若该模型已有保存的场景数据, 优先加载保存数据
  setActiveModel: (model) => {
    if (!model) {
      set({
        activeModelId: null,
        activeModelItem: null,
        sceneData: mockSceneData,
        spaces: spacesOf(mockSceneData),
        activeSpaceId: null,
        selectedFurnitureId: null,
        selectedStructureId: null,
        isDirty: false,
        past: [],
        future: [],
      });
      return;
    }
    const saved = loadSceneForModel(model.id) as SceneData | null;
    const scene = saved ?? getSceneForModel(model);
    set({
      activeModelId: model.id,
      activeModelItem: model,
      sceneData: scene,
      spaces: spacesOf(scene),
      activeSpaceId: null,
      selectedFurnitureId: null,
      selectedStructureId: null,
      isDirty: false,
      past: [],
      future: [],
    });
  },

  // 拖拽中的家具模板
  draggingFurniture: null,
  setDraggingFurniture: (f) => set({ draggingFurniture: f }),

  draggingStructure: null,
  setDraggingStructure: (t) => set({ draggingStructure: t }),
  // 拖拽预览位置 (地板世界坐标 x, z)
  dragGhostPos: null,
  setDragGhostPos: (pos) => {
    const cur = get().dragGhostPos;
    if (cur && pos && cur[0] === pos[0] && cur[1] === pos[1]) return;
    set({ dragGhostPos: pos });
  },

  // 向场景中添加家具 (放到指定房间)
  addFurniture: (roomId, furniture) =>
    set((state) => ({
      ...snapshot(state),
      sceneData: {
        ...state.sceneData,
        rooms: state.sceneData.rooms.map((r) =>
          r.id === roomId ? { ...r, furniture: [...r.furniture, furniture] } : r
        ),
      },
      selectedFurnitureId: furniture.id,
      selectedStructureId: null,
      isDirty: true,
    })),

  // 从场景中删除家具
  removeFurniture: (furnitureId) =>
    set((state) => ({
      ...snapshot(state),
      sceneData: {
        ...state.sceneData,
        rooms: state.sceneData.rooms.map((r) => ({
          ...r,
          furniture: r.furniture.filter((f) => f.id !== furnitureId),
        })),
      },
      selectedFurnitureId: state.selectedFurnitureId === furnitureId ? null : state.selectedFurnitureId,
      isDirty: true,
    })),

  // 更新家具位置/旋转/尺寸等
  updateFurniture: (furnitureId, patch) =>
    set((state) => ({
      ...snapshot(state),
      sceneData: {
        ...state.sceneData,
        rooms: state.sceneData.rooms.map((r) => ({
          ...r,
          furniture: r.furniture.map((f) =>
            f.id === furnitureId ? { ...f, ...patch } : f
          ),
        })),
      },
      isDirty: true,
    })),

  // 复制家具: 沿 +X/+Z 偏移 0.4m 生成副本并选中
  duplicateFurniture: (furnitureId) =>
    set((state) => {
      const room = state.sceneData.rooms.find((r) => r.furniture.some((f) => f.id === furnitureId));
      const src = room?.furniture.find((f) => f.id === furnitureId);
      if (!room || !src) return {};
      const copy: Furniture = {
        ...src,
        id: `f-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        position: [src.position[0] + 0.4, src.position[1], src.position[2] + 0.4],
      };
      return {
        ...snapshot(state),
        sceneData: {
          ...state.sceneData,
          rooms: state.sceneData.rooms.map((r) =>
            r.id === room.id ? { ...r, furniture: [...r.furniture, copy] } : r
          ),
        },
        selectedFurnitureId: copy.id,
        selectedStructureId: null,
        isDirty: true,
      };
    }),

  // ===== 变换会话 =====
  transformSession: null,
  beginTransform: (id, mode, startX, startY) => set({ transformSession: { id, mode, startX, startY } }),
  endTransform: () => set({ transformSession: null }),

  // ===== 撤销 / 重做 =====
  past: [],
  future: [],
  undo: () =>
    set((state) => {
      if (state.past.length === 0) return {};
      const prev = state.past[state.past.length - 1];
      const common = {
        past: state.past.slice(0, -1),
        future: [
          ...state.future,
          (state.designerMode === 'outdoor' ? state.outdoorSceneData : state.sceneData) as HistoryEntry,
        ].slice(-HISTORY_LIMIT),
        isDirty: true,
      };
      // 户外: 只回放 outdoorSceneData, 选中可能已失效 → 清空
      if (state.designerMode === 'outdoor') {
        return {
          ...common,
          outdoorSceneData: prev as OutdoorSceneData,
          selectedGroundId: null,
          selectedOutdoorObjectId: null,
        };
      }
      // 室内: 回放 sceneData 并重建空间列表
      const next = prev as SceneData;
      return {
        ...common,
        sceneData: next,
        spaces: spacesOf(next),
        selectedFurnitureId: null,
        selectedStructureId: null,
      };
    }),
  redo: () =>
    set((state) => {
      if (state.future.length === 0) return {};
      const next = state.future[state.future.length - 1];
      const common = {
        future: state.future.slice(0, -1),
        past: [
          ...state.past,
          (state.designerMode === 'outdoor' ? state.outdoorSceneData : state.sceneData) as HistoryEntry,
        ].slice(-HISTORY_LIMIT),
        isDirty: true,
      };
      if (state.designerMode === 'outdoor') {
        return {
          ...common,
          outdoorSceneData: next as OutdoorSceneData,
          selectedGroundId: null,
          selectedOutdoorObjectId: null,
        };
      }
      const value = next as SceneData;
      return {
        ...common,
        sceneData: value,
        spaces: spacesOf(value),
        selectedFurnitureId: null,
        selectedStructureId: null,
      };
    }),

  // 更新建筑结构 (门/窗/飘窗/落地窗/墙)
  // selector 格式: "wall:<roomId>:<id>" / "door:<roomId>:<id>" / "window:<roomId>:<id>" / "bay:<roomId>:<id>" / "french:<roomId>:<id>"
  updateStructure: (selector, patch) =>
    set((state) => {
      const [type, roomId, id] = selector.split(':');
      const hist = snapshot(state);
      // 地板: selector = `floor:${roomId}`, patch 可含 floorThickness/floorHeight/ceilingHeight
      if (type === 'floor') {
        const nextRooms = state.sceneData.rooms.map((r) =>
          r.id !== roomId ? r : { ...r, floorHeight: (patch.floorHeight as number) ?? r.floorHeight }
        );
        const floorThickness = (patch.floorThickness as number) ?? state.sceneData.floorThickness;
        const ceilingHeight = (patch.ceilingHeight as number) ?? state.sceneData.ceilingHeight;
        return {
          ...hist,
          sceneData: {
            ...state.sceneData,
            rooms: nextRooms,
            floorThickness,
            ceilingHeight,
          },
          isDirty: true,
        };
      }
      return {
        ...hist,
        sceneData: {
          ...state.sceneData,
          rooms: state.sceneData.rooms.map((r) => {
            if (r.id !== roomId) return r;
            if (type === 'wall') {
              return {
                ...r,
                walls: r.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
              };
            }
            if (type === 'door') {
              return {
                ...r,
                doors: r.doors.map((d) => (d.id === id ? { ...d, ...patch } : d)),
              };
            }
            if (type === 'window') {
              return {
                ...r,
                windows: (r.windows ?? []).map((w) => (w.id === id ? { ...w, ...patch } : w)),
              };
            }
            if (type === 'bay') {
              return {
                ...r,
                bayWindows: (r.bayWindows ?? []).map((w) => (w.id === id ? { ...w, ...patch } : w)),
              };
            }
            if (type === 'french') {
              return {
                ...r,
                frenchWindows: (r.frenchWindows ?? []).map((w) => (w.id === id ? { ...w, ...patch } : w)),
              };
            }
            return r;
          }),
        },
        isDirty: true,
      };
    }),

  // 从素材库拖入的结构元素: 追加到落点所在房间, 并立即选中 (便于用属性面板继续微调)
  // 门窗还会顺带把目标墙段"拆"出洞口 (opening.segments), 因此墙上的门窗是真正通透的
  addStructure: (roomId, payload) =>
    set((state) => ({
      ...snapshot(state),
      sceneData: {
        ...state.sceneData,
        rooms: state.sceneData.rooms.map((r) => {
          if (r.id !== roomId) return r;
          switch (payload.kind) {
            case 'wall':
              return { ...r, walls: [...r.walls, payload.wall] };
            case 'door':
              return {
                ...r,
                walls: r.walls.flatMap((w) => (w.id === payload.opening.wallId ? payload.opening.segments : [w])),
                doors: [...r.doors, payload.door],
              };
            case 'window':
              return {
                ...r,
                walls: r.walls.flatMap((w) => (w.id === payload.opening.wallId ? payload.opening.segments : [w])),
                windows: [...(r.windows ?? []), payload.window],
              };
            case 'bayWindow':
              return {
                ...r,
                walls: r.walls.flatMap((w) => (w.id === payload.opening.wallId ? payload.opening.segments : [w])),
                bayWindows: [...(r.bayWindows ?? []), payload.bayWindow],
              };
            case 'frenchWindow':
              return {
                ...r,
                walls: r.walls.flatMap((w) => (w.id === payload.opening.wallId ? payload.opening.segments : [w])),
                frenchWindows: [...(r.frenchWindows ?? []), payload.frenchWindow],
              };
          }
        }),
      },
      selectedStructureId: structureSelector(roomId, payload),
      selectedFurnitureId: null,
      isDirty: true,
    })),

  // 删除建筑结构元素 (selectors 与 updateStructure 同格式: wall/door/window/bay/french)
  removeStructure: (selector) =>
    set((state) => {
      const [type, roomId, id] = selector.split(':');
      return {
        ...snapshot(state),
        sceneData: {
          ...state.sceneData,
          rooms: state.sceneData.rooms.map((r) => {
            if (r.id !== roomId) return r;
            if (type === 'wall') return { ...r, walls: r.walls.filter((w) => w.id !== id) };
            if (type === 'door') return { ...r, doors: r.doors.filter((d) => d.id !== id) };
            if (type === 'window') return { ...r, windows: (r.windows ?? []).filter((w) => w.id !== id) };
            if (type === 'bay') return { ...r, bayWindows: (r.bayWindows ?? []).filter((w) => w.id !== id) };
            if (type === 'french') return { ...r, frenchWindows: (r.frenchWindows ?? []).filter((w) => w.id !== id) };
            return r;
          }),
        },
        selectedStructureId: state.selectedStructureId === selector ? null : state.selectedStructureId,
        isDirty: true,
      };
    }),

  // ===== 户外空间设计状态 =====
  outdoorSceneData: demoOutdoorScene,
  setOutdoorSceneData: (scene) =>
    set({
      outdoorSceneData: scene,
      selectedGroundId: null,
      selectedOutdoorObjectId: null,
      past: [],
      future: [],
    }),

  selectedGroundId: null,
  selectGround: (id) =>
    set((state) => ({
      selectedGroundId: id,
      selectedOutdoorObjectId: id ? null : state.selectedOutdoorObjectId,
    })),

  selectedOutdoorObjectId: null,
  selectOutdoorObject: (id) =>
    set((state) => ({
      selectedOutdoorObjectId: id,
      selectedGroundId: id ? null : state.selectedGroundId,
    })),

  addGroundItem: (item) =>
    set((state) => ({
      ...snapshot(state),
      outdoorSceneData: {
        ...state.outdoorSceneData,
        ground: [...state.outdoorSceneData.ground, item],
      },
      selectedGroundId: item.id,
      selectedOutdoorObjectId: null,
      isDirty: true,
    })),

  updateGroundItem: (id, patch) =>
    set((state) => ({
      ...snapshot(state),
      outdoorSceneData: {
        ...state.outdoorSceneData,
        ground: state.outdoorSceneData.ground.map((g) =>
          g.id === id ? { ...g, ...patch } : g
        ),
      },
      isDirty: true,
    })),

  removeGroundItem: (id) =>
    set((state) => ({
      ...snapshot(state),
      outdoorSceneData: {
        ...state.outdoorSceneData,
        ground: state.outdoorSceneData.ground.filter((g) => g.id !== id),
      },
      selectedGroundId: state.selectedGroundId === id ? null : state.selectedGroundId,
      isDirty: true,
    })),

  addOutdoorObject: (item) =>
    set((state) => ({
      ...snapshot(state),
      outdoorSceneData: {
        ...state.outdoorSceneData,
        objects: [...state.outdoorSceneData.objects, item],
      },
      selectedOutdoorObjectId: item.id,
      selectedGroundId: null,
      isDirty: true,
    })),

  updateOutdoorObject: (id, patch) =>
    set((state) => ({
      ...snapshot(state),
      outdoorSceneData: {
        ...state.outdoorSceneData,
        objects: state.outdoorSceneData.objects.map((o) =>
          o.id === id ? { ...o, ...patch } : o
        ),
      },
      isDirty: true,
    })),

  removeOutdoorObject: (id) =>
    set((state) => ({
      ...snapshot(state),
      outdoorSceneData: {
        ...state.outdoorSceneData,
        objects: state.outdoorSceneData.objects.filter((o) => o.id !== id),
      },
      selectedOutdoorObjectId:
        state.selectedOutdoorObjectId === id ? null : state.selectedOutdoorObjectId,
      isDirty: true,
    })),

  draggingOutdoor: null,
  setDraggingOutdoor: (f) => set({ draggingOutdoor: f }),

  outdoorDragGhostPos: null,
  setOutdoorDragGhostPos: (pos) => {
    const cur = get().outdoorDragGhostPos;
    if (cur && pos && cur[0] === pos[0] && cur[1] === pos[1]) return;
    set({ outdoorDragGhostPos: pos });
  },

  activeCampusItem: null,
  setActiveCampus: (model) => {
    const saved = model ? (loadSceneForModel(model.id) as OutdoorSceneData | null) : null;
    const scene = saved ?? getOutdoorSceneForModel(model);
    set({
      activeCampusItem: model,
      outdoorSceneData: scene,
      selectedGroundId: null,
      selectedOutdoorObjectId: null,
      isDirty: false,
      // 换园区后历史无意义, 清空
      past: [],
      future: [],
    });
  },

  // ===== 保存状态 =====
  isDirty: false,
  markDirty: () => set({ isDirty: true }),
  saveCurrentScene: async () => {
    const state = get();
    // 根据当前设计器模式选择对应的模型 ID 与场景数据
    const modelId =
      state.designerMode === 'outdoor' ? state.activeCampusItem?.id : state.activeModelId;
    if (!modelId) return false;
    const sceneData =
      state.designerMode === 'outdoor' ? state.outdoorSceneData : state.sceneData;
    saveSceneForModel(modelId, sceneData);
    set({ isDirty: false });
    return true;
  },
}));
