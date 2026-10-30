import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { FurnitureCatalog } from '../panel/FurnitureCatalog';
import { StructureCatalog } from '../panel/StructureCatalog';
import { OutdoorCatalog } from '../panel/OutdoorCatalog';
import { OUTDOOR_STYLE_OPTIONS } from '../../constants/outdoorStyles';
import type { Room, SceneData } from '../../types';
import {
  ItemList,
  LayerGroup,
  PanelShell,
  Section,
  StylePicker,
  SubSection,
  type PanelItem,
  type PanelStyle,
} from '../ui/PanelParts';

/** 室内风格色块: 部分风格用渐变更能体现质感 */
const INTERIOR_SWATCH: Record<string, string> = {
  style1: 'linear-gradient(135deg, #c8a882 0%, #8b6914 100%)',
  style2: 'linear-gradient(135deg, #d4c5b0 0%, #8b7355 100%)',
  style3: 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)',
};

/**
 * 左侧栏 (室内 / 户外统一入口)
 *
 * 两个模式的面板结构完全一致 —— 「[空间目录] → MODEL LAYERS(两层, 素材直接挂在层目录下) → DESIGN STYLE」,
 * 只是数据源与文案不同。原先 LeftPanel / OutdoorLeftPanel 各写一遍, 现在由 designerMode 决定喂什么数据,
 * 骨架统一走 components/ui/PanelParts。
 */
export function LeftPanel() {
  const designerMode = useAppStore((s) => s.designerMode);
  const [expanded, setExpanded] = useState({ spaces: true, layers: true, styles: true });
  const toggle = (k: keyof typeof expanded) =>
    setExpanded((prev) => ({ ...prev, [k]: !prev[k] }));

  return (
    <PanelShell>
      {designerMode === 'outdoor' ? (
        <OutdoorSections expanded={expanded} toggle={toggle} />
      ) : (
        <InteriorSections expanded={expanded} toggle={toggle} />
      )}
    </PanelShell>
  );
}

type SectionKey = 'spaces' | 'layers' | 'styles';
type ToggleFn = (k: SectionKey) => void;

/* ==================== 室内 ==================== */

/** 单个房间的元素按类型分组 (墙体 / 门 / 窗 / 家具) */
function roomGroups(room: Room) {
  return {
    walls: room.walls
      .filter((w) => !w.opening)
      .map<PanelItem>((w) => ({ id: `wall:${room.id}:${w.id}`, label: w.id, title: `${room.name} ${w.id}` })),
    doors: room.doors.map<PanelItem>((d) => ({
      id: `door:${room.id}:${d.id}`,
      label: d.id,
      title: `${room.name} ${d.id}`,
    })),
    windows: [
      ...(room.windows ?? []).map((w) => ({ kind: 'window', id: w.id })),
      ...(room.bayWindows ?? []).map((w) => ({ kind: 'bay', id: w.id })),
      ...(room.frenchWindows ?? []).map((w) => ({ kind: 'french', id: w.id })),
    ].map<PanelItem>((w) => ({
      id: `${w.kind}:${room.id}:${w.id}`,
      label: w.id,
      title: `${room.name} ${w.id}`,
    })),
    furniture: room.furniture.map<PanelItem>((f) => ({
      id: f.id,
      label: f.name,
      title: `${room.name} ${f.name}`,
    })),
  };
}

/** 房间面积 (㎡): 墙体端点包围盒估算, 与 structurePlacement / collision 的 roomBounds 同口径 */
function roomArea(room: Room): number {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const w of room.walls) {
    minX = Math.min(minX, w.start[0], w.end[0]);
    maxX = Math.max(maxX, w.start[0], w.end[0]);
    minZ = Math.min(minZ, w.start[1], w.end[1]);
    maxZ = Math.max(maxZ, w.start[1], w.end[1]);
  }
  if (!isFinite(minX)) return 0;
  return (maxX - minX) * (maxZ - minZ);
}

/**
 * 把空间目录里的条目 id 解析成地面聚焦点 (x, z) —— 点元素时相机要飞到它上方。
 * id 约定: 结构 = `kind:roomId:elementId` (wall/door/window/bay/french), 家具 = 家具 id 本身。
 */
function elementFocusPoint(scene: SceneData, itemId: string): [number, number] | null {
  if (!itemId.includes(':')) {
    for (const room of scene.rooms) {
      const f = room.furniture.find((it) => it.id === itemId);
      if (f) return [f.position[0], f.position[2]];
    }
    return null;
  }
  const [kind, roomId, elId] = itemId.split(':');
  const room = scene.rooms.find((r) => r.id === roomId);
  if (!room) return null;
  if (kind === 'wall') {
    const w = room.walls.find((it) => it.id === elId);
    return w ? [(w.start[0] + w.end[0]) / 2, (w.start[1] + w.end[1]) / 2] : null;
  }
  if (kind === 'door') {
    const d = room.doors.find((it) => it.id === elId);
    return d ? [d.position[0], d.position[2]] : null;
  }
  const list =
    kind === 'window'
      ? room.windows
      : kind === 'bay'
        ? room.bayWindows
        : kind === 'french'
          ? room.frenchWindows
          : null;
  const el = list?.find((it) => it.id === elId);
  return el ? [el.position[0], el.position[2]] : null;
}

/** 空间树下的一组元素 (墙体/门/窗/家具): 折叠行 + 可点击列表 */function GroupNode({
  label,
  items,
  selectedId,
  onSelect,
  open,
  onToggle,
  emptyText,
}: {
  label: string;
  items: PanelItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  open: boolean;
  onToggle: () => void;
  emptyText: string;
}) {
  return (
    <SubSection label={`${label} (${items.length})`} expanded={open} onToggle={onToggle}>
      <ItemList
        items={items}
        selectedId={selectedId}
        onSelect={onSelect}
        emptyText={emptyText}
        maxHeight="max-h-28"
      />
    </SubSection>
  );
}

function InteriorSections({ expanded, toggle }: { expanded: Record<SectionKey, boolean>; toggle: ToggleFn }) {
  const spaces = useAppStore((s) => s.spaces);
  const activeSpaceId = useAppStore((s) => s.activeSpaceId);
  const selectSpace = useAppStore((s) => s.selectSpace);
  const layers = useAppStore((s) => s.layers);
  const styles = useAppStore((s) => s.styles);
  const sceneData = useAppStore((s) => s.sceneData);
  const selectedFurnitureId = useAppStore((s) => s.selectedFurnitureId);
  const selectFurniture = useAppStore((s) => s.selectFurniture);
  const selectedStructureId = useAppStore((s) => s.selectedStructureId);
  const selectStructure = useAppStore((s) => s.selectStructure);

  // 空间节点展开态 (未显式点过时跟随当前选中空间)
  const [openSpaces, setOpenSpaces] = useState<Record<string, boolean>>({});
  // 空间下的元素分组展开态, key = `${spaceId}:${kind}`
  const [openSub, setOpenSub] = useState<Record<string, boolean>>({});
  const [buildingCatalogOpen, setBuildingCatalogOpen] = useState(true);
  const [interiorCatalogOpen, setInteriorCatalogOpen] = useState(true);

  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;
  const interiorLocked = layers.find((l) => l.id === 'interior')?.locked ?? true;

  // 锁定时素材列表自动收起 (箭头也随锁定隐藏): 下次解锁从收起状态开始, 由用户点箭头展开
  useEffect(() => {
    if (buildingLocked) setBuildingCatalogOpen(false);
    if (interiorLocked) setInteriorCatalogOpen(false);
  }, [buildingLocked, interiorLocked]);

  const toggleSub = (key: string) => setOpenSub((prev) => ({ ...prev, [key]: !prev[key] }));

  const focusCamera = useAppStore((s) => s.focusCamera);
  const viewMode = useAppStore((s) => s.viewMode);

  /**
   * 空间目录的点击语义 (不再受锁定影响 —— 锁只决定"能不能选中/编辑", 不该拦住"看一看"):
   *   1. 始终把相机飞到该元素上方 (定位);
   *   2. 所属层已解锁时才附带选中 (属性面板同步打开)。
   * plan 是独立 2D 视图, 3D 画布已卸载, 跳过相机聚焦只做选中。
   */
  const focusElement = (itemId: string) => {
    const pt = elementFocusPoint(sceneData, itemId);
    if (pt && viewMode !== 'plan') focusCamera(pt[0], pt[1]);
  };
  const pickStructure = (id: string) => {
    focusElement(id);
    if (!buildingLocked) selectStructure(id);
  };
  const pickFurniture = (id: string) => {
    focusElement(id);
    if (!interiorLocked) selectFurniture(id);
  };

  // 跨房间摊平 (「全部元素」用, 保留房间前缀便于区分)
  const allGroups = {
    walls: sceneData.rooms.flatMap((r) =>
      r.walls
        .filter((w) => !w.opening)
        .map<PanelItem>((w) => ({ id: `wall:${r.id}:${w.id}`, label: `${r.name} ${w.id}` }))
    ),
    doors: sceneData.rooms.flatMap((r) =>
      r.doors.map<PanelItem>((d) => ({ id: `door:${r.id}:${d.id}`, label: `${r.name} ${d.id}` }))
    ),
    windows: sceneData.rooms.flatMap((r) =>
      [
        ...(r.windows ?? []).map((w) => ({ kind: 'window', id: w.id })),
        ...(r.bayWindows ?? []).map((w) => ({ kind: 'bay', id: w.id })),
        ...(r.frenchWindows ?? []).map((w) => ({ kind: 'french', id: w.id })),
      ].map<PanelItem>((w) => ({ id: `${w.kind}:${r.id}:${w.id}`, label: `${r.name} ${w.id}` }))
    ),
    furniture: sceneData.rooms.flatMap((r) =>
      r.furniture.map<PanelItem>((f) => ({ id: f.id, label: f.name, title: `${r.name} ${f.name}` }))
    ),
  };

  const styleItems: PanelStyle[] = styles.map((s) => ({
    id: s.id,
    code: s.code,
    label: s.label,
    swatch: INTERIOR_SWATCH[s.id] ?? s.color,
  }));

  return (
    <>
      {/* 空间目录 — 主导航树: 空间下直接挂该空间的墙体/门窗/家具 */}
      <Section
        title="空间目录"
        hint={`${spaces.length}`}
        expanded={expanded.spaces}
        onToggle={() => toggle('spaces')}
        showCollapse
      >
        {spaces.map((space) => {
          const room = sceneData.rooms.find((r) => r.id === space.id);
          const g = room ? roomGroups(room) : { walls: [], doors: [], windows: [], furniture: [] };
          // 展开态完全由用户点箭头决定, 不跟随选中 (否则点名称飞相机会顺带展开)
          const isOpen = !!openSpaces[space.id];
          const isActive = activeSpaceId === space.id;

          return (
            <div key={space.id}>
              <div
                className={`flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 cursor-pointer transition-colors ${
                  isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
                onClick={() => selectSpace(space.id)}
              >
                <span className="text-[10px] text-gray-400 w-4 tabular-nums shrink-0">
                  {String(space.order).padStart(2, '0')}
                </span>
                <span className={`text-xs truncate ${isActive ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                  {space.name}
                </span>
                <span
                  className="ml-auto text-[9px] text-gray-400 tabular-nums shrink-0"
                  title="空间面积"
                >
                  {room ? `${roomArea(room).toFixed(1)} ㎡` : '--'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenSpaces((prev) => ({ ...prev, [space.id]: !isOpen }));
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-0.5"
                  title={isOpen ? '收起' : '展开该空间的元素'}
                >
                  {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                </button>
              </div>

              {isOpen && (
                <div className="ml-5 border-l border-gray-100 pb-0.5">
                  <GroupNode
                    label="墙体"
                    items={g.walls}
                    selectedId={selectedStructureId}
                    onSelect={pickStructure}
                    open={!!openSub[`${space.id}:walls`]}
                    onToggle={() => toggleSub(`${space.id}:walls`)}
                    emptyText="无墙体"
                  />
                  <GroupNode
                    label="门"
                    items={g.doors}
                    selectedId={selectedStructureId}
                    onSelect={pickStructure}
                    open={!!openSub[`${space.id}:doors`]}
                    onToggle={() => toggleSub(`${space.id}:doors`)}
                    emptyText="无门"
                  />
                  <GroupNode
                    label="窗"
                    items={g.windows}
                    selectedId={selectedStructureId}
                    onSelect={pickStructure}
                    open={!!openSub[`${space.id}:windows`]}
                    onToggle={() => toggleSub(`${space.id}:windows`)}
                    emptyText="无窗"
                  />
                  <GroupNode
                    label="家具"
                    items={g.furniture}
                    selectedId={selectedFurnitureId}
                    onSelect={pickFurniture}
                    open={!!openSub[`${space.id}:furniture`]}
                    onToggle={() => toggleSub(`${space.id}:furniture`)}
                    emptyText="暂无家具"
                  />
                </div>
              )}
            </div>
          );
        })}
      </Section>

      {/* 模型分层 — 只保留锁定控制 + 素材库 (元素列表已迁到空间目录) */}
      <Section
        title="MODEL LAYERS"
        hint="锁定 · 素材"
        expanded={expanded.layers}
        onToggle={() => toggle('layers')}
      >
        {/* 素材直接挂在层目录下: 解锁后由层行右侧的展开箭头控制显示, 中间不再套「素材库」层级 */}
        <LayerGroup
          id="building"
          name="建筑结构层"
          desc="墙体 楼板 门窗"
          locked={buildingLocked}
          expandable
          expanded={buildingCatalogOpen}
          onToggleExpand={() => setBuildingCatalogOpen((v) => !v)}
        >
          <StructureCatalog />
        </LayerGroup>

        <LayerGroup
          id="interior"
          name="室内设计层"
          desc="家具 家电 装饰"
          locked={interiorLocked}
          expandable
          expanded={interiorCatalogOpen}
          onToggleExpand={() => setInteriorCatalogOpen((v) => !v)}
        >
          <FurnitureCatalog />
        </LayerGroup>
      </Section>

      {/* 设计风格 */}
      <Section
        title="DESIGN STYLE"
        hint="参考与设计"
        expanded={expanded.styles}
        onToggle={() => toggle('styles')}
      >
        <StylePicker styles={styleItems} footer="切换整套家具与设计，保留当前镜头。" />
      </Section>
    </>
  );
}

/* ==================== 户外 ==================== */

const GROUND_TYPE_LABEL: Record<string, string> = {
  ground: '地面',
  grass: '草地',
  river: '河流',
  road: '道路',
  intersection: '路口',
  ramp: '匝道',
  fence: '围墙',
  playground: '操场',
};
const OBJECT_TYPE_LABEL: Record<string, string> = {
  building: '玻璃建筑',
  warehouse: '厂房仓库',
  'teaching-building': '教学楼',
  'lab-building': '实验楼',
  dormitory: '宿舍楼',
  gate: '园区大门',
  'guard-booth': '门卫室',
  car: '轿车',
  truck: '卡车',
  tree: '树木',
};

function OutdoorSections({ expanded, toggle }: { expanded: Record<SectionKey, boolean>; toggle: ToggleFn }) {
  const layers = useAppStore((s) => s.layers);
  const designStyleId = useAppStore((s) => s.designStyleId);
  const scene = useAppStore((s) => s.outdoorSceneData);
  const selectedGroundId = useAppStore((s) => s.selectedGroundId);
  const selectGround = useAppStore((s) => s.selectGround);
  const selectedObjectId = useAppStore((s) => s.selectedOutdoorObjectId);
  const selectObject = useAppStore((s) => s.selectOutdoorObject);

  const [groundSub, setGroundSub] = useState({ items: true, catalog: true });
  const [objectSub, setObjectSub] = useState({ items: true, catalog: true });

  const groundLocked = layers.find((l) => l.id === 'ground')?.locked ?? true;
  const spaceLocked = layers.find((l) => l.id === 'space')?.locked ?? true;

  const groundItems: PanelItem[] = scene.ground.map((g) => ({
    id: g.id,
    label: g.name,
    tag: `[${GROUND_TYPE_LABEL[g.type] ?? g.type}]`,
  }));
  const objectItems: PanelItem[] = scene.objects.map((o) => ({
    id: o.id,
    label: o.name,
    tag: `[${OBJECT_TYPE_LABEL[o.type] ?? o.type}]`,
  }));

  const styleItems: PanelStyle[] = OUTDOOR_STYLE_OPTIONS.map((s) => ({
    id: s.id,
    code: s.code,
    label: s.label,
    swatch: s.swatch,
  }));
  const styleFooter =
    OUTDOOR_STYLE_OPTIONS.find((s) => s.id === designStyleId)?.desc ??
    '数字园区蓝白风格, 参考数字化大屏视觉。';

  return (
    <>
      {/* 模型分层 (户外没有空间目录, 收起按钮挂在这里) */}
      <Section
        title="MODEL LAYERS"
        hint="模型分层"
        expanded={expanded.layers}
        onToggle={() => toggle('layers')}
        showCollapse
      >
        <LayerGroup id="ground" name="地面结构层" desc="地面 草地 河流 道路" locked={groundLocked}>
          <SubSection
            label={`现有元素 (${groundItems.length})`}
            expanded={groundSub.items}
            onToggle={() => setGroundSub((s) => ({ ...s, items: !s.items }))}
          >
            <ItemList
              items={groundItems}
              selectedId={selectedGroundId}
              onSelect={selectGround}
              emptyText="暂无地面元素"
              maxHeight="max-h-44"
            />
          </SubSection>
          <SubSection
            label="素材库"
            expanded={groundSub.catalog}
            onToggle={() => setGroundSub((s) => ({ ...s, catalog: !s.catalog }))}
          >
            <OutdoorCatalog kind="ground" />
          </SubSection>
        </LayerGroup>

        <LayerGroup id="space" name="空间设计层" desc="车辆 建筑" locked={spaceLocked}>
          <SubSection
            label={`现有对象 (${objectItems.length})`}
            expanded={objectSub.items}
            onToggle={() => setObjectSub((s) => ({ ...s, items: !s.items }))}
          >
            <ItemList
              items={objectItems}
              selectedId={selectedObjectId}
              onSelect={selectObject}
              emptyText="暂无空间对象"
              maxHeight="max-h-44"
            />
          </SubSection>
          <SubSection
            label="素材库"
            expanded={objectSub.catalog}
            onToggle={() => setObjectSub((s) => ({ ...s, catalog: !s.catalog }))}
          >
            <OutdoorCatalog kind="object" />
          </SubSection>
        </LayerGroup>
      </Section>

      {/* 设计风格 */}
      <Section
        title="DESIGN STYLE"
        hint="参考与设计"
        expanded={expanded.styles}
        onToggle={() => toggle('styles')}
      >
        <StylePicker styles={styleItems} footer={styleFooter} />
      </Section>
    </>
  );
}
