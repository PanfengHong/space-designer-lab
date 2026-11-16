import { useEffect } from 'react';
import type { Furniture, GroundItem, OutdoorObject } from '../../types';
import type { FurnitureElement, IconBox2D, OutdoorElement, StructureElement, StructureTemplate, CatalogPreset } from '../types';
import { footprintOf } from '../indoor/furniture/metas';
import { FurnitureSymbol2D } from '../../components/2D/furnitureSymbol2D';
import { requestThumbnail, useThumbnailUrl } from '../../utils/thumbnailCapture';
import { useOutdoorPalette } from '../../constants/outdoorStyles';
import { PLAN_LIGHT, PLAN_DARK } from '../outdoor/planPalette';

/**
 * 素材卡图标 —— 左侧列表的「元素图标」视图, 2D / 3D 两种形态。
 *
 * 这是三类视图中唯一由框架统一渲染的一类:
 *   - 3D 形态: 全局隐藏 Canvas 离屏捕获为透明 PNG (见 utils/thumbnailCapture),
 *     内容取自元素的设计区 3D 组件, 取景参数 (相机距离/竖直修正) 可由元素覆盖;
 *   - 2D 形态: 直接渲染元素的设计区 2D 符号 —— 卡上看到的就是落到画布里的样子;
 *   - 取景框 (viewBox) 由元素提供 iconBox2D, 缺省按占地外扩。
 *
 * 因此新增元素只需要写 View3D/Symbol2D, 图标自动就有, 不必再单独维护缩略图。
 */

/* ==================== 通用外壳 ==================== */

function IconShell({ url, name }: { url: string | null; name: string }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {url ? (
        <img
          src={url}
          alt={name}
          draggable={false}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" />
      )}
    </div>
  );
}

/** 把内容框换成带内边距的 viewBox */
function svgBox(box: IconBox2D, padFactor = 0.12, padMin = 0.03) {
  const w = box.x1 - box.x0;
  const h = box.y1 - box.y0;
  const pad = Math.max(w, h) * padFactor + padMin;
  return `${box.x0 - pad} ${box.y0 - pad} ${w + pad * 2} ${h + pad * 2}`;
}

/* ==================== 家具图标 ==================== */

function presetFurniture(el: FurnitureElement, preset: CatalogPreset): Furniture {
  return {
    id: `catalog-${el.type}`,
    name: preset.name,
    position: [0, 0, 0],
    rotation: 0,
    size: preset.size,
    type: el.type,
    color: preset.color,
  };
}

/** 家具 3D 图标 (离屏捕获为透明 PNG) */
export function FurnitureIcon3D({ el, preset }: { el: FurnitureElement; preset: CatalogPreset }) {
  const key = `furniture-${el.type}-${preset.name}`;
  const url = useThumbnailUrl(key);

  useEffect(() => {
    const data = presetFurniture(el, preset);
    const [, h] = preset.size;
    const maxDim = Math.max(...preset.size, 1);
    const camDist = maxDim * 2.2 + 1.2;
    const View3D = el.View3D;
    requestThumbnail({
      key,
      camera: { fov: 35, position: [camDist * 0.7, camDist * 0.5, camDist * 0.7] },
      content: (
        <>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 3]} intensity={0.5} />
          <directionalLight position={[-3, 3, -3]} intensity={0.2} />
          <hemisphereLight args={['#c4d4e8', '#d4c8b8', 0.3]} />
          <group position={[0, -h / 2, 0]}>
            <View3D data={data} />
          </group>
        </>
      ),
    });
  }, [el, preset, key]);

  return <IconShell url={url} name={preset.name} />;
}

/** 家具 2D 图标 (设计区符号同源) */
export function FurnitureIcon2D({ el, preset }: { el: FurnitureElement; preset: CatalogPreset }) {
  const data = presetFurniture(el, preset);
  const { w, h } = footprintOf(data);
  const box = el.iconBox2D
    ? el.iconBox2D(data)
    : { x0: -w / 2, y0: -h / 2, x1: w / 2, y1: h / 2 };

  return (
    <svg
      viewBox={svgBox(box)}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <FurnitureSymbol2D furniture={data} />
    </svg>
  );
}

/* ==================== 结构图标 ==================== */

/** 结构 3D 图标 (离屏捕获; 单实例假数据由元素 icon3D 组装) */
export function StructureIcon3D({ el, tpl }: { el: StructureElement; tpl: StructureTemplate }) {
  const key = `structure-${tpl.id}`;
  const url = useThumbnailUrl(key);

  useEffect(() => {
    if (!el.icon3D) return;
    const [w, h, d] = tpl.size;
    const maxDim = Math.max(w, h, d, 1);
    const camDist = maxDim * 1.7 + 1.1;
    const lift = el.thumbLiftY ? el.thumbLiftY(tpl) : h / 2;

    requestThumbnail({
      key,
      camera: { fov: 35, position: [camDist * 0.62, camDist * 0.42, camDist * 0.78] },
      content: (
        <>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 3]} intensity={0.55} />
          <directionalLight position={[-3, 3, -3]} intensity={0.22} color="#c8daf0" />
          <hemisphereLight args={['#dceaf6', '#e4eadf', 0.4]} />
          <group position={[0, -lift, 0]}>{el.icon3D!(tpl)}</group>
        </>
      ),
    });
  }, [el, tpl, key]);

  return <IconShell url={url} name={tpl.name} />;
}

/** 结构 2D 图标 (设计区符号同源) */
export function StructureIcon2D({ el, tpl }: { el: StructureElement; tpl: StructureTemplate }) {
  if (!el.icon2D || !el.iconBox2D) return null;
  return (
    <svg
      viewBox={svgBox(el.iconBox2D(tpl), 0.1, 0.03)}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {el.icon2D(tpl)}
    </svg>
  );
}

/* ==================== 户外图标 ==================== */

function presetOutdoorItem(
  el: OutdoorElement<any>,
  preset: CatalogPreset,
): GroundItem | OutdoorObject {
  return {
    id: `outdoor-catalog-${el.kind}-${preset.name}`,
    name: preset.name,
    position: [0, 0, 0],
    rotation: 0,
    size: preset.size,
    color: preset.color,
    type: el.type,
    ...(preset.extra ?? {}),
  } as GroundItem | OutdoorObject;
}

/** 户外 3D 图标 (离屏捕获) */
export function OutdoorIcon3D({
  el,
  preset,
}: {
  el: OutdoorElement<any>;
  preset: CatalogPreset;
}) {
  const key = `outdoor-${el.kind}-${preset.name}`;
  const url = useThumbnailUrl(key);
  const palette = useOutdoorPalette();

  useEffect(() => {
    const data = presetOutdoorItem(el, preset);
    const [, h] = preset.size;
    const maxDim = Math.max(...preset.size, 1);
    const camDist = maxDim * 1.5 + 1.4;
    const View3D = el.View3D;
    requestThumbnail({
      key,
      camera: { fov: 35, position: [camDist * 0.75, camDist * 0.55, camDist * 0.75] },
      content: (
        <>
          <ambientLight intensity={0.65} />
          <directionalLight position={[3, 5, 3]} intensity={0.55} />
          <directionalLight position={[-3, 3, -3]} intensity={0.25} color="#c8daf0" />
          <hemisphereLight args={['#dceaf6', '#e4eadf', 0.4]} />
          <group position={[0, -h / 2, 0]}>
            <View3D data={data} palette={palette} />
          </group>
        </>
      ),
    });
  }, [el, preset, key, palette]);

  return <IconShell url={url} name={preset.name} />;
}

/** 户外 2D 图标 (设计区符号同源) */
export function OutdoorIcon2D({
  el,
  preset,
}: {
  el: OutdoorElement<any>;
  preset: CatalogPreset;
}) {
  const outdoorPalette = useOutdoorPalette();
  const C = outdoorPalette.dark ? PLAN_DARK : PLAN_LIGHT;
  const item = presetOutdoorItem(el, preset);
  const [w, , d] = preset.size;
  const Symbol2D = el.Symbol2D;
  return (
    <svg
      viewBox={svgBox({ x0: -w / 2, y0: -d / 2, x1: w / 2, y1: d / 2 }, 0.1, 0.05)}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <Symbol2D item={item} C={C} />
    </svg>
  );
}
