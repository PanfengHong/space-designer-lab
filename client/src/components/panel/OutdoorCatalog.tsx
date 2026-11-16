import { useAppStore } from '../../store/useAppStore';
import type { CatalogPreset, OutdoorElement } from '../../elements/types';
import type { GroundItem, OutdoorObject } from '../../types';
import { GROUND_ELEMENTS } from '../../elements/outdoor/ground';
import { OBJECT_ELEMENTS } from '../../elements/outdoor/objects';
import { OutdoorIcon2D, OutdoorIcon3D } from '../../elements/common/ElementIcon';
import { setCustomDragImage } from './dragImage';

/**
 * 户外素材库 — 地面元素 (地面/草地/河流/道路/路口/匝道/围墙/操场)
 * + 空间对象 (建筑/车辆/树木)
 * 拖拽到设计区域放置, 复用室内素材库的 HTML5 拖拽机制
 *
 * 素材清单 = 各户外元素目录声明的 presets (路口类的十字/三岔就是同元素的两条预设,
 * branches 通过 preset.extra 随拖拽一起落到元素数据上)。
 * 图标 (视图①) 由 elements/common/ElementIcon 统一渲染, 平面图模式下改画 2D 符号。
 */

interface CatalogEntry<T extends GroundItem | OutdoorObject> {
  el: OutdoorElement<T>;
  preset: CatalogPreset;
}

type AnyEntry = CatalogEntry<GroundItem> | CatalogEntry<OutdoorObject>;

/** 由注册表展开预设 (旧的 GROUND_CATALOG / OBJECT_CATALOG 导出保留兼容) */
function entriesOf(elements: OutdoorElement<any>[]): AnyEntry[] {
  return elements.flatMap((el) =>
    el.presets.map((preset) => ({ el, preset }) as AnyEntry),
  );
}

export const GROUND_CATALOG = entriesOf(GROUND_ELEMENTS);
export const OBJECT_CATALOG = entriesOf(OBJECT_ELEMENTS);

export function OutdoorCatalog({ kind }: { kind: 'ground' | 'object' }) {
  const setDraggingOutdoor = useAppStore((s) => s.setDraggingOutdoor);
  const isPlan = useAppStore((s) => s.viewMode === 'plan');
  const entries = kind === 'ground' ? GROUND_CATALOG : OBJECT_CATALOG;

  const handleDragStart = (e: React.DragEvent, entry: AnyEntry) => {
    setDraggingOutdoor({
      kind: entry.el.kind,
      type: entry.el.type,
      name: entry.preset.name,
      size: entry.preset.size,
      color: entry.preset.color,
      extra: entry.preset.extra,
    });
    e.dataTransfer.setData('text/plain', entry.el.type);
    e.dataTransfer.effectAllowed = 'copy';
    setCustomDragImage(e);
  };

  return (
    <div className="p-2">
      <div className="text-[10px] text-gray-400 mb-2 px-1">
        拖拽{kind === 'ground' ? '地面元素' : '空间对象'}到设计区域放置
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {entries.map((entry) => (
          <div
            key={`${entry.el.kind}-${entry.el.type}-${entry.preset.name}`}
            draggable
            onDragStart={(e) => handleDragStart(e, entry)}
            onDragEnd={() => setDraggingOutdoor(null)}
            className="flex flex-col bg-gray-50 rounded-md cursor-grab active:cursor-grabbing transition-all select-none overflow-hidden ring-1 ring-transparent hover:ring-sky-400 hover:shadow-sm"
            title={`${entry.preset.name} ${entry.preset.size[0]}×${entry.preset.size[2]}m`}
          >
            <div className={`h-16 ${isPlan ? 'bg-white' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
              {isPlan ? (
                <OutdoorIcon2D el={entry.el} preset={entry.preset} />
              ) : (
                <OutdoorIcon3D el={entry.el} preset={entry.preset} />
              )}
            </div>
            <div className="px-1 py-1 text-center">
              <span className="text-[9px] text-gray-600">{entry.preset.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
