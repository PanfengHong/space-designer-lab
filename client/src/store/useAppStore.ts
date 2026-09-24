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

interface AppState {
  // 空间列表 (从当前 sceneData.rooms 动态拼装)
  spaces: Space[];
  selectSpace: (id: string) => void;
  activeSpaceId: string | null;

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

  // 拖拽预览位置 (地板世界坐标 x, z)
  dragGhostPos: [number, number] | null;
  setDragGhostPos: (pos: [number, number] | null) => void;

  // 向场景中添加家具 (放到指定房间)
  addFurniture: (roomId: string, furniture: Furniture) => void;
  // 从场景中删除家具
  removeFurniture: (furnitureId: string) => void;
  // 更新家具位置/旋转/尺寸等
  updateFurniture: (furnitureId: string, patch: Partial<Furniture>) => void;

  // 更新建筑结构 (门/窗/飘窗/落地窗/墙)
  // selector 格式: "wall:<roomId>:<id>" / "door:<roomId>:<id>" / "window:<roomId>:<id>" / "bay:<roomId>:<id>" / "french:<roomId>:<id>"
  updateStructure: (selector: string, patch: Record<string, unknown>) => void;

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
}

export const useAppStore = create<AppState>((set) => ({
  // 从 mockSceneData.rooms 动态拼装, 保持原有数组顺序作为 order
  spaces: mockSceneData.rooms.map((r, i) => ({ id: r.id, name: r.name, order: i + 1 })),
  activeSpaceId: null,
  selectSpace: (id) => set({ activeSpaceId: id }),

  // 设置场景数据, 同时刷新 spaces 列表和清除选中状态
  setSceneData: (scene) =>
    set({
      sceneData: scene,
      spaces: scene.rooms.map((r, i) => ({ id: r.id, name: r.name, order: i + 1 })),
      activeSpaceId: null,
      selectedFurnitureId: null,
      selectedStructureId: null,
    }),

  designerMode: 'interior',
  // 切换设计器模式: 替换模型分层、重置风格、清空选中
  setDesignerMode: (mode) =>
    set(() => {
      if (mode === 'outdoor') {
        return {
          designerMode: 'outdoor',
          layers: [
            { id: 'ground', name: '地面结构层', locked: true },
            { id: 'space', name: '空间设计层', locked: true },
          ],
          designStyleId: 'park1',
          selectedGroundId: null,
          selectedOutdoorObjectId: null,
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
  setActiveModel: (model) => {
    if (!model) {
      set({
        activeModelId: null,
        activeModelItem: null,
        sceneData: mockSceneData,
        spaces: mockSceneData.rooms.map((r, i) => ({ id: r.id, name: r.name, order: i + 1 })),
        activeSpaceId: null,
        selectedFurnitureId: null,
        selectedStructureId: null,
      });
      return;
    }
    const scene = getSceneForModel(model);
    set({
      activeModelId: model.id,
      activeModelItem: model,
      sceneData: scene,
      spaces: scene.rooms.map((r, i) => ({ id: r.id, name: r.name, order: i + 1 })),
      activeSpaceId: null,
      selectedFurnitureId: null,
      selectedStructureId: null,
    });
  },

  // 拖拽中的家具模板
  draggingFurniture: null,
  setDraggingFurniture: (f) => set({ draggingFurniture: f }),
  // 拖拽预览位置 (地板世界坐标 x, z)
  dragGhostPos: null,
  setDragGhostPos: (pos) => set({ dragGhostPos: pos }),

  // 向场景中添加家具 (放到指定房间)
  addFurniture: (roomId, furniture) =>
    set((state) => ({
      sceneData: {
        ...state.sceneData,
        rooms: state.sceneData.rooms.map((r) =>
          r.id === roomId ? { ...r, furniture: [...r.furniture, furniture] } : r
        ),
      },
      selectedFurnitureId: furniture.id,
      selectedStructureId: null,
    })),

  // 从场景中删除家具
  removeFurniture: (furnitureId) =>
    set((state) => ({
      sceneData: {
        ...state.sceneData,
        rooms: state.sceneData.rooms.map((r) => ({
          ...r,
          furniture: r.furniture.filter((f) => f.id !== furnitureId),
        })),
      },
      selectedFurnitureId: state.selectedFurnitureId === furnitureId ? null : state.selectedFurnitureId,
    })),

  // 更新家具位置/旋转/尺寸等
  updateFurniture: (furnitureId, patch) =>
    set((state) => ({
      sceneData: {
        ...state.sceneData,
        rooms: state.sceneData.rooms.map((r) => ({
          ...r,
          furniture: r.furniture.map((f) =>
            f.id === furnitureId ? { ...f, ...patch } : f
          ),
        })),
      },
    })),

  // 更新建筑结构 (门/窗/飘窗/落地窗/墙)
  // selector 格式: "wall:<roomId>:<id>" / "door:<roomId>:<id>" / "window:<roomId>:<id>" / "bay:<roomId>:<id>" / "french:<roomId>:<id>"
  updateStructure: (selector, patch) =>
    set((state) => {
      const [type, roomId, id] = selector.split(':');
      // 地板: selector = `floor:${roomId}`, patch 可含 floorThickness/floorHeight/ceilingHeight
      if (type === 'floor') {
        const nextRooms = state.sceneData.rooms.map((r) =>
          r.id !== roomId ? r : { ...r, floorHeight: (patch.floorHeight as number) ?? r.floorHeight }
        );
        const floorThickness = (patch.floorThickness as number) ?? state.sceneData.floorThickness;
        const ceilingHeight = (patch.ceilingHeight as number) ?? state.sceneData.ceilingHeight;
        return {
          sceneData: {
            ...state.sceneData,
            rooms: nextRooms,
            floorThickness,
            ceilingHeight,
          },
        };
      }
      return {
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
      };
    }),

  // ===== 户外空间设计状态 =====
  outdoorSceneData: demoOutdoorScene,
  setOutdoorSceneData: (scene) =>
    set({
      outdoorSceneData: scene,
      selectedGroundId: null,
      selectedOutdoorObjectId: null,
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
      outdoorSceneData: {
        ...state.outdoorSceneData,
        ground: [...state.outdoorSceneData.ground, item],
      },
      selectedGroundId: item.id,
      selectedOutdoorObjectId: null,
    })),

  updateGroundItem: (id, patch) =>
    set((state) => ({
      outdoorSceneData: {
        ...state.outdoorSceneData,
        ground: state.outdoorSceneData.ground.map((g) =>
          g.id === id ? { ...g, ...patch } : g
        ),
      },
    })),

  removeGroundItem: (id) =>
    set((state) => ({
      outdoorSceneData: {
        ...state.outdoorSceneData,
        ground: state.outdoorSceneData.ground.filter((g) => g.id !== id),
      },
      selectedGroundId: state.selectedGroundId === id ? null : state.selectedGroundId,
    })),

  addOutdoorObject: (item) =>
    set((state) => ({
      outdoorSceneData: {
        ...state.outdoorSceneData,
        objects: [...state.outdoorSceneData.objects, item],
      },
      selectedOutdoorObjectId: item.id,
      selectedGroundId: null,
    })),

  updateOutdoorObject: (id, patch) =>
    set((state) => ({
      outdoorSceneData: {
        ...state.outdoorSceneData,
        objects: state.outdoorSceneData.objects.map((o) =>
          o.id === id ? { ...o, ...patch } : o
        ),
      },
    })),

  removeOutdoorObject: (id) =>
    set((state) => ({
      outdoorSceneData: {
        ...state.outdoorSceneData,
        objects: state.outdoorSceneData.objects.filter((o) => o.id !== id),
      },
      selectedOutdoorObjectId:
        state.selectedOutdoorObjectId === id ? null : state.selectedOutdoorObjectId,
    })),

  draggingOutdoor: null,
  setDraggingOutdoor: (f) => set({ draggingOutdoor: f }),

  outdoorDragGhostPos: null,
  setOutdoorDragGhostPos: (pos) => set({ outdoorDragGhostPos: pos }),

  activeCampusItem: null,
  setActiveCampus: (model) => {
    const scene = getOutdoorSceneForModel(model);
    set({
      activeCampusItem: model,
      outdoorSceneData: scene,
      selectedGroundId: null,
      selectedOutdoorObjectId: null,
    });
  },
}));

