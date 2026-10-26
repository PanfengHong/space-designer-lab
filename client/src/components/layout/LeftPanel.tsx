import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FurnitureCatalog } from '../panel/FurnitureCatalog';
import { StructureCatalog } from '../panel/StructureCatalog';
import { OutdoorCatalog } from '../panel/OutdoorCatalog';
import { OUTDOOR_STYLE_OPTIONS } from '../../constants/outdoorStyles';
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
 * 两个模式的面板结构完全一致 —— 「[空间目录] → MODEL LAYERS(两层, 每层含对象列表+素材库) → DESIGN STYLE」,
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

  const [buildingSub, setBuildingSub] = useState({ walls: false, doors: false, windows: false, catalog: false });
  const [interiorSub, setInteriorSub] = useState({ furniture: true, catalog: true });

  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;
  const interiorLocked = layers.find((l) => l.id === 'interior')?.locked ?? true;

  // 把房间信息摊平到每个元素上, 列表里显示「房间名 + 元素 id」
  const walls: PanelItem[] = sceneData.rooms.flatMap((r) =>
    r.walls.map((w) => ({
      id: `wall:${r.id}:${w.id}`,
      label: `${r.name} ${w.id}`,
      title: `${r.name} ${w.id}`,
    }))
  );
  const doors: PanelItem[] = sceneData.rooms.flatMap((r) =>
    r.doors.map((d) => ({ id: `door:${r.id}:${d.id}`, label: `${r.name} ${d.id}` }))
  );
  const windows: PanelItem[] = sceneData.rooms.flatMap((r) =>
    [
      ...(r.windows ?? []).map((w) => ({ kind: 'window', id: w.id, room: r })),
      ...(r.bayWindows ?? []).map((w) => ({ kind: 'bay', id: w.id, room: r })),
      ...(r.frenchWindows ?? []).map((w) => ({ kind: 'french', id: w.id, room: r })),
    ].map((w) => ({ id: `${w.kind}:${w.room.id}:${w.id}`, label: `${w.room.name} ${w.id}` }))
  );
  const furniture: PanelItem[] = sceneData.rooms.flatMap((r) =>
    r.furniture.map((f) => ({ id: f.id, label: f.name, title: `${r.name} ${f.name}` }))
  );

  const styleItems: PanelStyle[] = styles.map((s) => ({
    id: s.id,
    code: s.code,
    label: s.label,
    swatch: INTERIOR_SWATCH[s.id] ?? s.color,
  }));

  return (
    <>
      {/* 空间目录 */}
      <Section
        title="空间目录"
        hint={`${spaces.length}`}
        expanded={expanded.spaces}
        onToggle={() => toggle('spaces')}
        showCollapse
      >
        {spaces.map((space) => (
          <div
            key={space.id}
            className={`px-4 py-2 cursor-pointer transition-colors ${
              activeSpaceId === space.id ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
            onClick={() => selectSpace(space.id)}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-4">{String(space.order).padStart(2, '0')}</span>
              <span
                className={`text-xs ${
                  activeSpaceId === space.id ? 'text-gray-800 font-medium' : 'text-gray-600'
                }`}
              >
                {space.name}
              </span>
            </div>
          </div>
        ))}
      </Section>

      {/* 模型分层 */}
      <Section
        title="MODEL LAYERS"
        hint="模型分层"
        expanded={expanded.layers}
        onToggle={() => toggle('layers')}
      >
        <LayerGroup id="building" name="建筑结构层" desc="墙体 楼板 门窗" locked={buildingLocked}>
          <SubSection
            label={`墙体 (${walls.length})`}
            expanded={buildingSub.walls}
            onToggle={() => setBuildingSub((s) => ({ ...s, walls: !s.walls }))}
          >
            <ItemList
              items={walls}
              selectedId={selectedStructureId}
              onSelect={selectStructure}
            />
          </SubSection>
          <SubSection
            label={`门 (${doors.length})`}
            expanded={buildingSub.doors}
            onToggle={() => setBuildingSub((s) => ({ ...s, doors: !s.doors }))}
          >
            <ItemList items={doors} selectedId={selectedStructureId} onSelect={selectStructure} />
          </SubSection>
          <SubSection
            label={`窗 (${windows.length})`}
            expanded={buildingSub.windows}
            onToggle={() => setBuildingSub((s) => ({ ...s, windows: !s.windows }))}
          >
            <ItemList items={windows} selectedId={selectedStructureId} onSelect={selectStructure} />
          </SubSection>
          {/* 结构素材库 — 拖拽到设计区域放置 (门窗自动吸附墙面) */}
          <SubSection
            label="结构素材库"
            expanded={buildingSub.catalog}
            onToggle={() => setBuildingSub((s) => ({ ...s, catalog: !s.catalog }))}
          >
            <StructureCatalog />
          </SubSection>
        </LayerGroup>

        <LayerGroup id="interior" name="室内设计层" desc="家具 家电 装饰" locked={interiorLocked}>
          <SubSection
            label={`现有家具 (${furniture.length})`}
            expanded={interiorSub.furniture}
            onToggle={() => setInteriorSub((s) => ({ ...s, furniture: !s.furniture }))}
          >
            <ItemList
              items={furniture}
              selectedId={selectedFurnitureId}
              onSelect={selectFurniture}
              emptyText="暂无家具"
              maxHeight="max-h-40"
            />
          </SubSection>
          <SubSection
            label="素材库"
            expanded={interiorSub.catalog}
            onToggle={() => setInteriorSub((s) => ({ ...s, catalog: !s.catalog }))}
          >
            <FurnitureCatalog />
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
