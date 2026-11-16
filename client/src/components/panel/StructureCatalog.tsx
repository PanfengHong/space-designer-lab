import { useAppStore } from '../../store/useAppStore';
import { STRUCTURE_ELEMENTS } from '../../elements/indoor/structure';
import type { StructureElement, StructureTemplate } from '../../elements/types';
import { StructureIcon2D, StructureIcon3D } from '../../elements/common/ElementIcon';
import { setCustomDragImage } from './dragImage';

/**
 * 建筑结构素材库 — 墙体 / 门 / 窗 / 飘窗 / 落地窗
 * 室内设计模式下挂在左面板「建筑结构层」下, 拖拽到设计区域即可放置。
 *
 * 落位规则 (见 utils/structurePlacement.ts):
 * - 墙体: 默认沿 X 轴以落点为中心, 自动夹到房间范围内, 高度取层高
 * - 门 / 窗 / 飘窗 / 落地窗: 自动吸附到最近的墙面, 沿墙居中夹紧, 朝向自动对齐
 *
 * 素材清单 = 各结构元素目录的 templates.ts (纯数据, 拖拽直接携带模板);
 * 图标 (视图①) 由 elements/common/ElementIcon 统一渲染, 单实例预览数据由元素 icon.tsx 组装。
 */

interface CatalogEntry {
  el: StructureElement;
  tpl: StructureTemplate;
}

const ENTRIES: CatalogEntry[] = STRUCTURE_ELEMENTS.flatMap((el) =>
  el.templates.map((tpl) => ({ el, tpl })),
);

export function StructureCatalog() {
  const setDraggingStructure = useAppStore((s) => s.setDraggingStructure);
  const setDraggingFurniture = useAppStore((s) => s.setDraggingFurniture);
  const isPlan = useAppStore((s) => s.viewMode === 'plan');

  const handleDragStart = (e: React.DragEvent, tpl: StructureTemplate) => {
    // 与家具素材库互斥, 避免落下时被判成两种元素
    setDraggingFurniture(null);
    setDraggingStructure(tpl);
    e.dataTransfer.setData('text/plain', tpl.type);
    e.dataTransfer.effectAllowed = 'copy';
    setCustomDragImage(e);
  };

  return (
    <div className="p-2">
      <div className="text-[10px] text-gray-400 mb-2 px-1 leading-relaxed">
        拖拽到设计区域放置
        <br />
        <span className="text-gray-300">
          {isPlan ? '墙体门窗请切到 3D 视图拖入' : '门窗会自动吸附到墙面上'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {ENTRIES.map(({ el, tpl }) => (
          <div
            key={tpl.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tpl)}
            onDragEnd={() => setDraggingStructure(null)}
            className="flex flex-col bg-gray-50 rounded-md cursor-grab active:cursor-grabbing transition-all select-none overflow-hidden ring-1 ring-transparent hover:ring-sky-400 hover:shadow-sm"
            title={`${tpl.name} ${tpl.size[0]}×${tpl.size[1]}m`}
          >
            <div className={`h-16 ${isPlan ? 'bg-white' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
              {isPlan ? <StructureIcon2D el={el} tpl={tpl} /> : <StructureIcon3D el={el} tpl={tpl} />}
            </div>
            <div className="px-1 py-1 text-center">
              <span className="text-[9px] text-gray-600">{tpl.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
