import { useAppStore } from '../../store/useAppStore';
import type { CatalogPreset, FurnitureElement } from '../../elements/types';
import { FURNITURE_ELEMENTS, furniturePresetsOf } from '../../elements/indoor/furniture';
import { FurnitureIcon2D, FurnitureIcon3D } from '../../elements/common/ElementIcon';
import { setCustomDragImage } from './dragImage';

/**
 * 家具素材库 — 2 列网格 + 图标
 * 室内设计层解锁时显示在 LeftPanel 底部
 *
 * 拖拽机制: HTML5 drag-and-drop
 * - onDragStart: 设置 store.draggingFurniture (模板数据) + 自定义透明拖拽影像
 * - Canvas 层 onDragOver/onDrop: raycast 计算地板位置并放置
 * - 平面图模式下同样走这一套, 落点由 FloorPlan2D 的 dragOver/drop 接管
 *
 * 图标 (视图①): 由 elements/common/ElementIcon 统一渲染 ——
 *   平面图模式画元素的 2D 符号, 其余模式走全局隐藏 Canvas 离屏捕获 3D 缩略图。
 * 素材清单 = 各元素目录声明的 presets / officePresets, 不再在这里重复维护尺寸与颜色。
 */

interface CatalogItem {
  el: FurnitureElement;
  preset: CatalogPreset;
}

/** 住宅素材库: 按元素声明顺序展开预设 */
const RESIDENTIAL: CatalogItem[] = FURNITURE_ELEMENTS.flatMap((el) =>
  furniturePresetsOf(el, false).map((preset) => ({ el, preset })),
);

/** 办公素材库: 只包含声明了 officePresets 的元素 */
const OFFICE: CatalogItem[] = FURNITURE_ELEMENTS.flatMap((el) =>
  el.officePresets ? el.officePresets.map((preset) => ({ el, preset })) : [],
);

export function FurnitureCatalog() {
  const setDraggingFurniture = useAppStore((s) => s.setDraggingFurniture);
  const setDraggingStructure = useAppStore((s) => s.setDraggingStructure);
  const activeModelItem = useAppStore((s) => s.activeModelItem);
  const isPlan = useAppStore((s) => s.viewMode === 'plan');

  const isOffice = activeModelItem?.category === 'office';
  const catalog = isOffice ? OFFICE : RESIDENTIAL;

  const handleDragStart = (e: React.DragEvent, item: CatalogItem) => {
    // 与建筑结构素材库互斥, 避免落下时被判成两种元素
    setDraggingStructure(null);
    setDraggingFurniture({
      type: item.el.type,
      name: item.preset.name,
      size: item.preset.size,
      color: item.preset.color,
    });
    e.dataTransfer.setData('text/plain', item.el.type);
    e.dataTransfer.effectAllowed = 'copy';
    setCustomDragImage(e);
  };

  return (
    <div className="p-2">
      <div className="text-[10px] text-gray-400 mb-2 px-1">
        {isPlan
          ? '拖拽家具到平面图上放置 · 自动贴墙对齐'
          : isOffice
            ? '拖拽办公家具到设计区域放置'
            : '拖拽家具到设计区域放置'}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {catalog.map((item) => (
          <div
            key={`${item.el.type}-${item.preset.name}`}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragEnd={() => setDraggingFurniture(null)}
            className="flex flex-col bg-gray-50 rounded-md cursor-grab active:cursor-grabbing transition-all select-none overflow-hidden ring-1 ring-transparent hover:ring-sky-400 hover:shadow-sm"
            title={`${item.preset.name} ${item.preset.size[0]}×${item.preset.size[2]}m`}
          >
            {/* 图标区: 平面图模式画 2D 符号, 其余模式画 3D 捕获图 */}
            <div className={`h-16 ${isPlan ? 'bg-white' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
              {isPlan ? (
                <FurnitureIcon2D el={item.el} preset={item.preset} />
              ) : (
                <FurnitureIcon3D el={item.el} preset={item.preset} />
              )}
            </div>
            {/* 名称 */}
            <div className="px-1 py-1 text-center">
              <span className="text-[9px] text-gray-600">{item.preset.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
