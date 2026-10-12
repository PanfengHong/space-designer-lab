import { useEffect } from 'react';
import type { BayWindow, Door, FrenchWindow, WallSegment, Window as WallWindow } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { requestThumbnail, useThumbnailUrl } from '../../utils/thumbnailCapture';
import { STRUCTURE_CATALOG, type StructureTemplate } from '../../utils/structurePlacement';
import { Walls } from '../3D/indoor/building/Walls';
import { Doors } from '../3D/indoor/building/Doors';
import { Windows } from '../3D/indoor/building/Windows';
import { BayWindows } from '../3D/indoor/building/BayWindow';
import { FrenchWindows } from '../3D/indoor/building/FrenchWindow';

/**
 * 建筑结构素材库 — 墙体 / 门 / 窗 / 飘窗 / 落地窗
 * 室内设计模式下挂在左面板「建筑结构层」下, 拖拽到设计区域即可放置。
 *
 * 落位规则 (见 utils/structurePlacement.ts):
 * - 墙体: 默认沿 X 轴以落点为中心, 自动夹到房间范围内, 高度取层高
 * - 门 / 窗 / 飘窗 / 落地窗: 自动吸附到最近的墙面, 沿墙居中夹紧, 朝向自动对齐
 *
 * 缩略图: 复用全局隐藏 Canvas 离线捕获 (与家具素材库同一套机制),
 * 直接渲染真实的建筑组件, 因此素材长相与实际放置结果完全一致。
 */

/** 缩略图里使用的墙厚 (仅影响视觉, 与场景墙厚无关) */
const THUMB_WALL_T = 0.2;

/** 用素材参数造一份只用于缩略图渲染的假数据 */
function thumbScene(tpl: StructureTemplate) {
  const id = `__catalog-${tpl.id}`;
  const [a, b, c] = tpl.size;
  switch (tpl.type) {
    case 'wall': {
      const seg: WallSegment = {
        id,
        start: [-a / 2, 0],
        end: [a / 2, 0],
        height: b,
      };
      return (
        <Walls
          segments={[seg]}
          roomId={id}
          height={b}
          thickness={c}
          showCeiling={false}
        />
      );
    }
    case 'door': {
      const door: Door = {
        id,
        position: [0, 0, 0],
        width: a,
        height: b,
        rotation: 0,
        hingeSide: 'left',
        style: tpl.style === 'glass' ? 'glass' : 'default',
      };
      return <Doors doors={[door]} roomId={id} wallThickness={THUMB_WALL_T} />;
    }
    case 'window': {
      const win: WallWindow = {
        id,
        position: [0, 0, 0],
        width: a,
        height: b,
        sill: tpl.sill ?? 0.9,
        rotation: 0,
        style: tpl.style === 'sliding' ? 'sliding' : 'default',
      };
      return <Windows windows={[win]} roomId={id} wallThickness={THUMB_WALL_T} />;
    }
    case 'bayWindow': {
      const bay: BayWindow = {
        id,
        position: [0, tpl.sill ?? 0.9, 0],
        width: a,
        height: b,
        depth: c,
        rotation: 0,
      };
      return <BayWindows bayWindows={[bay]} roomId={id} wallThickness={THUMB_WALL_T} />;
    }
    case 'frenchWindow': {
      const fw: FrenchWindow = { id, position: [0, 0, 0], width: a, height: b, rotation: 0 };
      return <FrenchWindows frenchWindows={[fw]} roomId={id} wallThickness={THUMB_WALL_T} />;
    }
  }
}

function CatalogThumbnail({ tpl }: { tpl: StructureTemplate }) {
  const key = `structure-${tpl.id}`;
  const url = useThumbnailUrl(key);

  useEffect(() => {
    const [w, h, d] = tpl.size;
    const maxDim = Math.max(w, h, d, 1);
    const camDist = maxDim * 1.7 + 1.1;
    // 窗 / 飘窗的原点带窗台高度, 需要把整体下移让它落在画面中心
    const lift = tpl.type === 'window' || tpl.type === 'bayWindow' ? (tpl.sill ?? 0.9) + h / 2 : h / 2;

    requestThumbnail({
      key,
      camera: { fov: 35, position: [camDist * 0.62, camDist * 0.42, camDist * 0.78] },
      content: (
        <>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 3]} intensity={0.55} />
          <directionalLight position={[-3, 3, -3]} intensity={0.22} color="#c8daf0" />
          <hemisphereLight args={['#dceaf6', '#e4eadf', 0.4]} />
          <group position={[0, -lift, 0]}>{thumbScene(tpl)}</group>
        </>
      ),
    });
  }, [tpl, key]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {url ? (
        <img
          src={url}
          alt={tpl.name}
          draggable={false}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" />
      )}
    </div>
  );
}

/** 从卡片 DOM 中取缩略图 <img> 作为自定义拖拽影像 (与家具素材库一致) */
function setCustomDragImage(e: React.DragEvent) {
  const img = (e.currentTarget as HTMLElement).querySelector('img');
  if (img && img.complete && img.naturalWidth > 0) {
    try {
      e.dataTransfer.setDragImage(img, Math.round(img.clientWidth / 2), Math.round(img.clientHeight / 2));
    } catch {
      // setDragImage 失败时回退浏览器默认快照
    }
  }
}

export function StructureCatalog() {
  const setDraggingStructure = useAppStore((s) => s.setDraggingStructure);
  const setDraggingFurniture = useAppStore((s) => s.setDraggingFurniture);

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
        <span className="text-gray-300">门窗会自动吸附到墙面上</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {STRUCTURE_CATALOG.map((tpl) => (
          <div
            key={tpl.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tpl)}
            onDragEnd={() => setDraggingStructure(null)}
            className="flex flex-col bg-gray-50 hover:bg-gray-100 rounded-md cursor-grab active:cursor-grabbing transition-colors select-none overflow-hidden"
            title={`${tpl.name} ${tpl.size[0]}×${tpl.size[1]}m`}
          >
            <div className="h-16 bg-gradient-to-br from-gray-50 to-gray-100">
              <CatalogThumbnail tpl={tpl} />
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
