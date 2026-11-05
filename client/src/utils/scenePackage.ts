import type {
  RenderMode,
  SceneData,
  ScenePackage,
  ScenePackageDevice,
  ScenePackageView,
  ViewMode,
} from '../types';
import { roomBounds } from './roomBounds';
import { layoutCeilingLamps } from './ceilingLamps';

/** 场景包标识: 运行器靠它判断"这是不是一个能独立运行的模型" */
export const SCENE_PACKAGE_FORMAT = 'space-designer/scene';
export const SCENE_PACKAGE_VERSION = 1;

/**
 * 设备清单 — 从场景数据里抽取, 不额外维护一份。
 *
 * 吸顶灯的 id 必须与 `RoomCeilingLights` 渲染时用的一致 (`lamp:<roomId>:<i>`),
 * 剖切高度 < 2m 时那组灯根本不渲染, 这里也要同步跳过, 否则包里会多出点不到的设备。
 */
export function collectSceneDevices(scene: SceneData, cutHeight: number): ScenePackageDevice[] {
  const out: ScenePackageDevice[] = [];

  for (const room of scene.rooms) {
    for (const f of room.furniture) {
      if (!f.device) continue;
      out.push({
        id: f.id,
        kind: f.device.kind,
        name: f.name,
        roomId: room.id,
        roomName: room.name,
        entityId: f.device.entityId,
      });
    }

    // 与 RoomCeilingLights 同一口径: 顶部构件被剖掉时不出灯
    if (cutHeight < 2.0) continue;
    const bounds = roomBounds(room.walls);
    if (!bounds) continue;
    const lamps = layoutCeilingLamps(bounds);
    lamps.forEach((_, i) => {
      out.push({
        id: `lamp:${room.id}:${i}`,
        kind: 'light',
        name: lamps.length > 1 ? `${room.name}吸顶灯 ${i + 1}` : `${room.name}吸顶灯`,
        roomId: room.id,
        roomName: room.name,
      });
    });
  }

  return out;
}

/**
 * 运行器打开场景时的默认视图。
 *
 * 渲染模式默认 `shaded` 而不是设计器的 `arctic`: 运行器是给人看的成品,
 * arctic + base 风格会把墙体和家具都压成一片白, 展示场景里几乎看不出体积。
 * `lighting` 用 `自然光照`, 与设计器的 LIGHTING_OPTIONS 取值保持一致。
 */
export function createDefaultView(overrides: Partial<ScenePackageView> = {}): ScenePackageView {
  return {
    mode: 'perspective',
    renderMode: 'shaded',
    styleId: 'base',
    cutHeight: 2.5,
    showCeiling: false,
    showSpaceName: false,
    showDoorsOpen: false,
    lighting: '自然光照',
    ...overrides,
  };
}

export function buildScenePackage(input: {
  scene: SceneData;
  view: ScenePackageView;
  name: string;
  id?: string;
  createdAt?: string;
}): ScenePackage {
  const { scene, view } = input;
  return {
    format: SCENE_PACKAGE_FORMAT,
    version: SCENE_PACKAGE_VERSION,
    meta: {
      id: input.id ?? `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: input.name.trim() || '未命名场景',
      createdAt: input.createdAt ?? new Date().toISOString(),
    },
    scene,
    devices: collectSceneDevices(scene, view.cutHeight),
    view,
  };
}

const VIEW_MODES: ViewMode[] = ['perspective', 'axonometric', 'top', 'plan', 'walkthrough'];
const RENDER_MODES: RenderMode[] = ['arctic', 'shaded', 'material'];

/**
 * 校验并规整外部传入的场景包。
 *
 * 失败一律抛出可直接展示给用户的中文错误 —— 运行器是给别人用的,
 * 报「Unexpected token < in JSON」没有任何意义。
 */
export function parseScenePackage(input: unknown): ScenePackage {
  let raw: any = input;

  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input);
    } catch {
      throw new Error('这不是一个合法的 JSON 文件');
    }
  }
  if (!raw || typeof raw !== 'object') {
    throw new Error('场景包内容为空');
  }
  if (raw.format !== SCENE_PACKAGE_FORMAT) {
    throw new Error('这不是 Space Designer 场景包（缺少 format 标识）');
  }
  if (raw.scene == null || !Array.isArray(raw.scene.rooms)) {
    throw new Error('场景包缺少 scene.rooms，无法渲染');
  }

  const view = createDefaultView(raw.view ?? {});
  if (!VIEW_MODES.includes(view.mode)) view.mode = 'perspective';
  if (!RENDER_MODES.includes(view.renderMode)) view.renderMode = 'shaded';
  if (!Number.isFinite(view.cutHeight)) view.cutHeight = 2.5;

  // 设备清单允许缺失 (老包/手工编辑过), 缺了就从场景现算
  const devices: ScenePackageDevice[] = Array.isArray(raw.devices)
    ? raw.devices
        .filter((d: any) => d && typeof d.id === 'string' && typeof d.kind === 'string')
        .map((d: any) => ({
          id: d.id,
          kind: d.kind,
          name: typeof d.name === 'string' ? d.name : d.id,
          roomId: typeof d.roomId === 'string' ? d.roomId : '',
          roomName: typeof d.roomName === 'string' ? d.roomName : '',
          entityId: typeof d.entityId === 'string' && d.entityId ? d.entityId : undefined,
        }))
    : collectSceneDevices(raw.scene, view.cutHeight);

  return {
    format: SCENE_PACKAGE_FORMAT,
    version: SCENE_PACKAGE_VERSION,
    meta: {
      id: typeof raw.meta?.id === 'string' ? raw.meta.id : `pkg-${Date.now()}`,
      name: typeof raw.meta?.name === 'string' ? raw.meta.name : '未命名场景',
      createdAt: typeof raw.meta?.createdAt === 'string' ? raw.meta.createdAt : new Date().toISOString(),
    },
    scene: raw.scene,
    devices,
    view,
  };
}

/** 本地"发布"槽位: 设计器点发布后写这里, 运行器 `/view` 直接读取, 免去每次传文件 */
export const PUBLISHED_PACKAGE_KEY = 'sd_published_package';

export function savePublishedPackage(pkg: ScenePackage): boolean {
  try {
    localStorage.setItem(PUBLISHED_PACKAGE_KEY, JSON.stringify(pkg));
    return true;
  } catch {
    return false;
  }
}

export function loadPublishedPackage(): ScenePackage | null {
  try {
    const raw = localStorage.getItem(PUBLISHED_PACKAGE_KEY);
    return raw ? parseScenePackage(raw) : null;
  } catch {
    return null;
  }
}

/** 下载为 .sdscene.json (可直接交付给运行器) */
export function downloadScenePackage(pkg: ScenePackage) {
  const text = JSON.stringify(pkg, null, 2);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pkg.meta.name.replace(/[/\\:*?"<>|]/g, '_')}.sdscene.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
