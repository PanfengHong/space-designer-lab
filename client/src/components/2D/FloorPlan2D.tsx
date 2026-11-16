import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { Room, Furniture } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { inferDevice } from '../../utils/device';
import { buildIndoorColliders, checkIndoorPlacement } from '../../utils/collision';
import { findRoomAt } from '../../utils/r3fBridge';
import { roomOutline } from '../../utils/roomOutline';
import { footprintOf } from '../../data/furnitureMeta';
import { FLOOR_MATERIALS, FLOOR_MATERIAL_ORDER, floorMaterialDef } from '../../data/floorMaterials';
import { normalizeDeg } from '../../utils/sceneQuery';
import { C } from './planColors';
import { FurnitureSymbol2D, furnitureHitTest } from './furnitureSymbol2D';
import { WallLine, Door2D, Window2D, BayWindow2D, FrenchWindow2D } from './structureSymbol2D';

/* ============================================================
 * 极简灰阶平面图 (参考建筑户型图风格)
 *  - 深色粗墙体, 圆角端点
 *  - 浅灰简化家具, 无文字标注
 *  - 灰阶门窗, 无彩色
 *  - 房间标签居中, 深灰文字
 *
 * 同时是**编辑器**: 支持从素材栏拖入、拖动已有家具、旋转 90°。
 * 放置链路与 3D 完全共用 (findRoomAt / buildIndoorColliders / checkIndoorPlacement),
 * 不写第二套判定; 拖动期间只更新局部 state, 松手才提交一次 → 一次拖动 = 一条撤销记录。
 * ============================================================ */

/** 靠墙吸附距离 (米): 家具边缘离墙面小于这个值就贴上去 */
const SNAP_WALL = 0.12;
/** 网格吸附步长 (米) */
const SNAP_GRID = 0.05;
/** 与其它家具对齐吸附距离 (米) */
const SNAP_ALIGN = 0.06;

/** 房间内墙面 (墙中心线包围盒向内收半墙厚) */
interface RoomInner {
  l: number;
  r: number;
  t: number;
  b: number;
}

/**
 * 吸附辅助线 —— 拖动时"为什么停在这里"的可视化。
 *   kind='wall'  贴墙 (绿)   kind='align'  与其它家具边/中线对齐 (琥珀)
 */
interface SnapGuide {
  axis: 'x' | 'z';
  /** 辅助线所在的世界坐标 (x 时为 X, z 时为 Z) */
  at: number;
  from: number;
  to: number;
  kind: 'wall' | 'align';
}

/** 拖拽 HUD 需要的数据: 吸附后的中心 + 旋转后 AABB 半宽/半深 + 辅助线 + 房间内墙面 */
interface DragHint {
  hx: number;
  hz: number;
  cx: number;
  cz: number;
  guides: SnapGuide[];
  inner: RoomInner | null;
}

interface PlacementResult {
  x: number;
  z: number;
  ok: boolean;
  reason?: string;
  hint: DragHint;
}

/**
 * 旋转后家具在世界 AABB 里的半宽/半深。
 * 家具绕 Y 轴任意角度旋转后, 其外接 AABB 的半长 = |hx·cosθ| + |hz·sinθ|。
 */
function aabbHalf(w: number, h: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return { hx: (w / 2) * c + (h / 2) * s, hz: (w / 2) * s + (h / 2) * c };
}

export function FloorPlan2D() {
  const showSpaceName = useAppStore((s) => s.viewSettings.showSpaceName);
  const showDimensions = useAppStore((s) => s.viewSettings.showDimensions);
  const sceneData = useAppStore((s) => s.sceneData);
  const setPixelsPerMeter = useAppStore((s) => s.setPixelsPerMeter);
  const rooms = sceneData.rooms;
  const wallT = sceneData.wallThickness;

  // 求某一点所在墙的单墙厚度 (墙段可自带 thickness, 如内隔墙 0.12), 找不到回落全局 wallT
  const wallTAt = (room: typeof rooms[number], x: number, z: number): number => {
    for (const seg of room.walls) {
      if (seg.opening) continue;
      const [x1, z1] = seg.start;
      const [x2, z2] = seg.end;
      const len = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
      if (len === 0) continue;
      const perp = Math.abs(x2 - x1) > Math.abs(z2 - z1) ? Math.abs(z - z1) : Math.abs(x - x1);
      if (perp > 0.15) continue;
      const t = ((x2 - x1) * (x - x1) + (z2 - z1) * (z - z1)) / len;
      if (t >= -0.05 && t <= len + 0.05) return seg.thickness ?? wallT;
    }
    return wallT;
  };

  // 缩放和平移状态
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  /**
   * 拖动中家具的实时位置 (局部 state)。
   * 硬约定: 拖动期间绝不写 store —— 每帧写会让整棵树重渲染导致卡顿,
   * 而且会灌进几十条撤销记录。松手时才 updateFurniture 一次。
   */
  const [moveGhost, setMoveGhost] = useState<{
    id: string;
    x: number;
    z: number;
    ok: boolean;
    hint: DragHint;
  } | null>(null);
  const moveRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origZ: number;
    grabbed: boolean;
    /** 最近一次解析出的落点 — pointerup 从这里提交, 避免读到过期 state */
    last: { x: number; z: number; ok: boolean; hint: DragHint } | null;
  } | null>(null);

  /** 从素材栏拖入时的落点预览 */
  const [dropPreview, setDropPreview] = useState<{
    furniture: Furniture;
    ok: boolean;
    reason?: string;
    hint: DragHint;
  } | null>(null);

  const draggingFurniture = useAppStore((s) => s.draggingFurniture);
  const setDraggingFurniture = useAppStore((s) => s.setDraggingFurniture);
  const addFurniture = useAppStore((s) => s.addFurniture);
  const updateFurniture = useAppStore((s) => s.updateFurniture);

  /** 占位盒 (墙 + 家具 + 房间范围) — 放置校验用, 与 3D 拖拽共用同一份计算 */
  const colliders = useMemo(() => buildIndoorColliders(sceneData), [sceneData]);

  /** 屏幕坐标 → 世界坐标 (经 SVG CTM 求逆, 自然包含 pan/zoom 变换) */
  const clientToWorld = useCallback((clientX: number, clientY: number): [number, number] | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return [p.x, p.y];
  }, []);

  /**
   * 落点吸附 + 校验。
   * 吸附链: 贴墙 → 与其它家具对齐 → 5cm 网格 (每轴独立, 先到先得);
   * 候选一律用真实占位盒校验, 不过就如实返回 ok=false (预览画红框),
   * 不再退而求其次 —— 否则会出现"看着是绿的, 放手却嵌进墙里"。
   *
   * 同时返回 hint (吸附辅助线 + 房间内墙面), 供拖拽 HUD 画贴墙高亮和四向净距。
   */
  const resolvePlacement = useCallback(
    (rawX: number, rawZ: number, f: Furniture, roomId: string | null): PlacementResult => {
      const { w, h } = footprintOf(f);
      const { hx, hz } = aabbHalf(w, h, f.rotation);
      const room = roomId ? sceneData.rooms.find((r) => r.id === roomId) ?? null : null;
      const ht = (room?.walls[0]?.thickness ?? wallT) / 2;

      const guides: SnapGuide[] = [];
      let inner: RoomInner | null = null;
      if (room) {
        // 内墙面 = 真实房间轮廓收半墙厚 (与地面填充同一口径, 净距读数才对得上)
        const b = roomOutline(room.walls);
        inner = { l: b.minX + ht, r: b.maxX - ht, t: b.minZ + ht, b: b.maxZ - ht };
      }

      let x = rawX;
      let z = rawZ;
      let snapX: 'wall' | 'align' | null = null;
      let snapZ: 'wall' | 'align' | null = null;
      let faceX: 'l' | 'r' | null = null;
      let faceZ: 't' | 'b' | null = null;

      // 1) 贴墙吸附: 家具 AABB 边缘离内墙面小于 SNAP_WALL 就贴齐 (含半墙厚补偿)
      if (inner) {
        if (Math.abs(x - hx - inner.l) < SNAP_WALL) { x = inner.l + hx; snapX = 'wall'; faceX = 'l'; }
        else if (Math.abs(x + hx - inner.r) < SNAP_WALL) { x = inner.r - hx; snapX = 'wall'; faceX = 'r'; }
        if (Math.abs(z - hz - inner.t) < SNAP_WALL) { z = inner.t + hz; snapZ = 'wall'; faceZ = 't'; }
        else if (Math.abs(z + hz - inner.b) < SNAP_WALL) { z = inner.b - hz; snapZ = 'wall'; faceZ = 'b'; }
      }

      // 2) 与同房间其它家具对齐: 我方左/中/右 对齐 对方左/中/右, 取最近的一条
      if (room && (!snapX || !snapZ)) {
        const others = room.furniture.filter((o) => o.id !== f.id && !o.embedded);
        if (!snapX) {
          let best = SNAP_ALIGN, bestDx = 0, bestAt = 0, gFrom = 0, gTo = 0;
          for (const o of others) {
            const of = footprintOf(o);
            const oa = aabbHalf(of.w, of.h, o.rotation);
            const ox = o.position[0], oz = o.position[2];
            for (const c of [ox - oa.hx, ox, ox + oa.hx]) {
              for (const m of [x - hx, x, x + hx]) {
                const d = c - m;
                if (Math.abs(d) < best) {
                  best = Math.abs(d); bestDx = d; bestAt = c;
                  gFrom = oz - oa.hz; gTo = oz + oa.hz;
                }
              }
            }
          }
          if (best < SNAP_ALIGN) {
            x += bestDx;
            snapX = 'align';
            guides.push({
              axis: 'x', at: bestAt,
              from: Math.min(gFrom, z - hz) - 0.18,
              to: Math.max(gTo, z + hz) + 0.18,
              kind: 'align',
            });
          }
        }
        if (!snapZ) {
          let best = SNAP_ALIGN, bestDz = 0, bestAt = 0, gFrom = 0, gTo = 0;
          for (const o of others) {
            const of = footprintOf(o);
            const oa = aabbHalf(of.w, of.h, o.rotation);
            const ox = o.position[0], oz = o.position[2];
            for (const c of [oz - oa.hz, oz, oz + oa.hz]) {
              for (const m of [z - hz, z, z + hz]) {
                const d = c - m;
                if (Math.abs(d) < best) {
                  best = Math.abs(d); bestDz = d; bestAt = c;
                  gFrom = ox - oa.hx; gTo = ox + oa.hx;
                }
              }
            }
          }
          if (best < SNAP_ALIGN) {
            z += bestDz;
            snapZ = 'align';
            guides.push({
              axis: 'z', at: bestAt,
              from: Math.min(gFrom, x - hx) - 0.18,
              to: Math.max(gTo, x + hx) + 0.18,
              kind: 'align',
            });
          }
        }
      }

      // 3) 网格吸附 (5cm), 只作用在**没吃到**前两级吸附的轴上 ——
      //    否则贴墙算出的坐标会被网格又拉走一两厘米, 贴墙永远贴不实。
      if (!snapX) x = Math.round(x / SNAP_GRID) * SNAP_GRID;
      if (!snapZ) z = Math.round(z / SNAP_GRID) * SNAP_GRID;

      // 4) 贴墙高亮线 (按最终位置画, 覆盖家具所占的那一段墙)
      if (inner && faceX) {
        guides.push({
          axis: 'x', at: faceX === 'l' ? inner.l : inner.r,
          from: z - hz - 0.22, to: z + hz + 0.22, kind: 'wall',
        });
      }
      if (inner && faceZ) {
        guides.push({
          axis: 'z', at: faceZ === 't' ? inner.t : inner.b,
          from: x - hx - 0.22, to: x + hx + 0.22, kind: 'wall',
        });
      }

      const hint: DragHint = { hx, hz, cx: x, cz: z, guides, inner };
      if (!roomId) return { x, z, ok: false, reason: '放置区域不在任何一个空间内', hint };
      const check = checkIndoorPlacement(colliders, f, x, z, f.id.startsWith('__') ? undefined : f.id);
      return { x, z, ok: check.ok, reason: check.ok ? undefined : check.reason, hint };
    },
    [sceneData, colliders, wallT],
  );

  // 计算所有墙的边界
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  rooms.forEach((room) => {
    room.walls.forEach((w) => {
      minX = Math.min(minX, w.start[0], w.end[0]);
      maxX = Math.max(maxX, w.start[0], w.end[0]);
      minZ = Math.min(minZ, w.start[1], w.end[1]);
      maxZ = Math.max(maxZ, w.start[1], w.end[1]);
    });
    room.bayWindows?.forEach((bw) => {
      const protrude = bw.depth;
      const dir = bw.rotation ?? 0;
      let bx = bw.position[0], bz = bw.position[2];
      if (dir === 0) bz += protrude;
      else if (dir === 180) bz -= protrude;
      else if (dir === 90) bx += protrude;
      else if (dir === 270) bx -= protrude;
      minX = Math.min(minX, bx - bw.width / 2);
      maxX = Math.max(maxX, bx + bw.width / 2);
      minZ = Math.min(minZ, bz - bw.width / 2);
      maxZ = Math.max(maxZ, bz + bw.width / 2);
    });
  });

  const pad = showDimensions ? 2.6 : 1.5;
  const vbX = minX - pad;
  const vbY = minZ - pad;
  const vbW = (maxX - minX) + pad * 2;
  const vbH = (maxZ - minZ) + pad * 2;

  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom((z) => Math.max(0.3, Math.min(8, z * delta)));
  }, []);

  /**
   * 屏幕坐标 → 世界坐标 → 命中的家具 (自上而下)。
   * 遍历顺序 = 绘制顺序的倒序: 内嵌件 (后画, 在最上层) 优先, 其次普通件;
   * 第一件命中的即选中目标, 保证"点哪选哪"。
   * 挂墙高位内嵌件 (如电视 y=1.1) 在俯视图里不占可操作平面, 不参与命中,
   * 点击穿透到下方的电视柜等家具 (仍可通过空间目录选中)。
   */
  const pickFurnitureAt = useCallback((clientX: number, clientY: number): Furniture | null => {
    const p = clientToWorld(clientX, clientY);
    if (!p) return null;
    const [px, pz] = p;
    const all = useAppStore.getState().sceneData.rooms.flatMap((r) => r.furniture);
    // 低位内嵌件 (灶台/水槽, 占台面) 优先命中; 挂墙高位内嵌件 (电视 y≥1) 不参与命中
    const embedded = all.filter((f) => f.embedded && f.position[1] < 1);
    const normal = all.filter((f) => !f.embedded);
    for (const f of embedded) if (furnitureHitTest(f, px, pz)) return f;
    for (let i = normal.length - 1; i >= 0; i--) {
      if (furnitureHitTest(normal[i], px, pz)) return normal[i];
    }
    return null;
  }, [clientToWorld]);

  /** 室内设计层锁定 = 家具不可选中/拖动, 一律当作空白处理 */
  const interiorLocked = () =>
    useAppStore.getState().layers.find((l) => l.id === 'interior')?.locked ?? false;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const hit = interiorLocked() ? null : pickFurnitureAt(e.clientX, e.clientY);
    if (hit) {
      useAppStore.getState().selectFurniture(hit.id);
      // 内嵌件 (灶台/水槽嵌在台面里) 不参与移动: 占地本就落在母体柜内, 一动必判重叠
      if (!hit.embedded) {
        moveRef.current = {
          id: hit.id,
          startClientX: e.clientX,
          startClientY: e.clientY,
          origX: hit.position[0],
          origZ: hit.position[2],
          grabbed: false,
          last: null,
        };
        // 合成事件 (自动化测试) 里 pointerId 可能不是活动指针, 捕获会抛错, 忽略即可
        try { (e.target as Element).setPointerCapture(e.pointerId); } catch {}
      }
      return; // 命中家具: 选中/拖动, 不进入画布平移
    }
    // 点在空白处 → 清除选中, 与 3D 视口行为一致
    useAppStore.getState().selectFurniture(null);
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch {}
  }, [pan.x, pan.y, pickFurnitureAt]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // ---- 拖动已有家具: 只更新局部 ghost, 不写 store ----
    const mv = moveRef.current;
    if (mv) {
      const dxs = e.clientX - mv.startClientX;
      const dys = e.clientY - mv.startClientY;
      if (!mv.grabbed && Math.hypot(dxs, dys) < 4) return; // 抖动阈值: 小于 4px 仍算点击
      mv.grabbed = true;
      const p = clientToWorld(e.clientX, e.clientY);
      if (!p) return;
      const roomsNow = useAppStore.getState().sceneData.rooms;
      const f = roomsNow.flatMap((r) => r.furniture).find((x) => x.id === mv.id);
      if (!f) return;
      const roomId = findRoomAt(p[0], p[1], roomsNow);
      const res = resolvePlacement(p[0], p[1], f, roomId);
      mv.last = { x: res.x, z: res.z, ok: res.ok, hint: res.hint };
      setMoveGhost({ id: mv.id, x: res.x, z: res.z, ok: res.ok, hint: res.hint });
      return;
    }
    // ---- 平移画布 ----
    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
      return;
    }
    // 悬停光标: 家具上 move, 其余 grab
    const over = !interiorLocked() && pickFurnitureAt(e.clientX, e.clientY);
    const cursor = over ? 'move' : 'grab';
    if (containerRef.current && containerRef.current.style.cursor !== cursor) {
      containerRef.current.style.cursor = cursor;
    }
  }, [clientToWorld, pickFurnitureAt, resolvePlacement]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const mv = moveRef.current;
    if (mv) {
      moveRef.current = null;
      // 松手才提交: 一次拖动 = 一条撤销记录
      if (mv.grabbed && mv.last) {
        const moving = useAppStore.getState().sceneData.rooms
          .flatMap((r) => r.furniture)
          .find((x) => x.id === mv.id);
        // 非法落点 (压墙/压别的家具/出房间) 直接放弃, 家具留在原位 —— 预览已经红框提示过
        if (mv.last.ok && moving) {
          updateFurniture(mv.id, {
            position: [mv.last.x, moving.position[1], mv.last.z],
          });
        }
      }
      setMoveGhost(null);
    }
    isPanning.current = false;
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  }, [updateFurniture]);

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  /* ==================== 从素材栏拖入 ==================== */

  /** 按素材模板造一件"待放"家具 (preview id 不参与自我排除, 见 resolvePlacement) */
  const makePreview = useCallback(
    (x: number, z: number): Furniture | null => {
      const dw = useAppStore.getState().draggingFurniture;
      if (!dw) return null;
      return {
        id: '__preview__',
        name: dw.name,
        position: [x, 0, z],
        rotation: 0,
        size: dw.size,
        type: dw.type,
        color: dw.color,
      };
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    // 只有拖的是家具才接管; 拖结构元素时不响应 (2D 结构放置尚未开放)
    if (!useAppStore.getState().draggingFurniture || interiorLocked()) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const p = clientToWorld(e.clientX, e.clientY);
    if (!p) return;
    const roomsNow = useAppStore.getState().sceneData.rooms;
    const f = makePreview(p[0], p[1]);
    if (!f) return;
    const roomId = findRoomAt(p[0], p[1], roomsNow);
    const res = resolvePlacement(p[0], p[1], f, roomId);
    setDropPreview({
      furniture: { ...f, position: [res.x, 0, res.z] },
      ok: res.ok,
      reason: res.reason,
      hint: res.hint,
    });
  }, [clientToWorld, makePreview, resolvePlacement]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropPreview(null);
    const dw = useAppStore.getState().draggingFurniture;
    if (!dw || interiorLocked()) return;
    const p = clientToWorld(e.clientX, e.clientY);
    if (!p) return;
    const roomsNow = useAppStore.getState().sceneData.rooms;
    const f = makePreview(p[0], p[1]);
    if (!f) return;
    const roomId = findRoomAt(p[0], p[1], roomsNow);
    const res = resolvePlacement(p[0], p[1], f, roomId);
    if (!res.ok || !roomId) return;
    addFurniture(roomId, {
      ...f,
      id: `f-drag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      position: [res.x, 0, res.z],
      // 拖入即带设备身份 (空调/窗帘/冰箱/电视), 之后点击就能调出控制面板
      device: inferDevice(dw.type, dw.size),
    });
    setDraggingFurniture(null);
  }, [clientToWorld, makePreview, resolvePlacement, addFurniture, setDraggingFurniture]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // 指针移到子元素上也会触发 dragleave, 只有真正越出容器才清预览
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const inside =
      e.clientX >= r.left && e.clientX <= r.right &&
      e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) setDropPreview(null);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updatePpm = () => {
      const containerW = el.clientWidth;
      const ppm = (containerW * zoom) / vbW;
      setPixelsPerMeter(Math.max(1, ppm));
    };
    updatePpm();
    const ro = new ResizeObserver(updatePpm);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom, vbW, setPixelsPerMeter]);

  // 拖拽在素材栏那边结束时 (dragend) 也要收掉落点预览, 否则会残留一个幽灵框
  useEffect(() => {
    if (!draggingFurniture) setDropPreview(null);
  }, [draggingFurniture]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden relative"
      style={{ backgroundColor: C.bg, cursor: isPanning.current ? 'grabbing' : 'grab' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      {/* 缩放控制按钮 */}
      <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1 select-none">
        <button
          onClick={() => setZoom((z) => Math.min(8, z * 1.25))}
          className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-md shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-colors text-sm font-medium"
          title="放大"
        >+</button>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z / 1.25))}
          className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-md shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-colors text-sm font-medium"
          title="缩小"
        >−</button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-md shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-colors text-[10px]"
          title="重置"
        >1:1</button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        style={{
          width: '100%',
          height: '100%',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center',
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <FloorPatterns />

        {/* 房间地面填充 */}
        {rooms.map((room) => (
          <RoomFloor key={`floor-${room.id}`} room={room} />
        ))}
        {/* 飘窗凸出结构 */}
        {rooms.map((room) =>
          room.bayWindows?.map((bw) => (
            <BayWindow2D key={bw.id} bayWindow={bw} wallThickness={wallTAt(room, bw.position[0], bw.position[2])} />
          ))
        )}

        {/* 墙体 (窗户位置断开) */}
        {rooms.map((room) =>
          room.walls.map((wall) =>
            wall.opening ? null : (
              <WallLine key={wall.id} wall={wall} thickness={wall.thickness ?? wallT} windows={room.windows ?? []} />
            )
          )
        )}

        {/* 落地窗 */}
        {rooms.map((room) =>
          room.frenchWindows?.map((fw) => (
            <FrenchWindow2D key={fw.id} frenchWindow={fw} wallThickness={wallTAt(room, fw.position[0], fw.position[2])} />
          ))
        )}

        {/* 普通窗户 */}
        {rooms.map((room) =>
          room.windows.map((win) => (
            <Window2D key={win.id} window={win} wallThickness={wallTAt(room, win.position[0], win.position[2])} />
          ))
        )}

        {/* 门 */}
        {rooms.map((room) =>
          room.doors.map((door) => (
            <Door2D key={door.id} door={door} wallThickness={wallTAt(room, door.position[0], door.position[2])} />
          ))
        )}

        {/* 家具
            分两遍渲染: 普通家具 → 内嵌件 (灶台/水槽等嵌在橱柜里的) 后画。
            内嵌件占地被橱柜完全覆盖, 同层渲染时后出现的橱柜命中区 (西橱柜等)
            会把它压住 (SVG 后者在上), 导致点灶台选中橱柜。
            内嵌件放到最上层后, 小面积的灶台/水槽优先吃到点击。 */}
        {rooms.map((room) =>
          room.furniture.filter((f) => !f.embedded).map((f) => (
            <Furniture2DInteractive key={f.id} furniture={f} dragging={moveGhost?.id === f.id} />
          ))
        )}
        {rooms.map((room) =>
          room.furniture.filter((f) => f.embedded).map((f) => (
            <Furniture2DInteractive key={f.id} furniture={f} dragging={false} />
          ))
        )}

        {/* 拖动中的实时预览: 只画局部 state, 不碰 store */}
        {moveGhost && (() => {
          const moving = rooms.flatMap((r) => r.furniture).find((f) => f.id === moveGhost.id);
          if (!moving) return null;
          return (
            <PlacementGhost
              furniture={{ ...moving, position: [moveGhost.x, moving.position[1], moveGhost.z] }}
              ok={moveGhost.ok}
            />
          );
        })()}

        {/* 从素材栏拖入时的落点预览 */}
        {dropPreview && <PlacementGhost furniture={dropPreview.furniture} ok={dropPreview.ok} />}

        {/* 拖拽辅助: 吸附辅助线 (贴墙/对齐) + 四向净距 + 落点十字 */}
        {moveGhost && <DragHUD hint={moveGhost.hint} />}
        {dropPreview && <DragHUD hint={dropPreview.hint} />}

        {/* 尺寸标注: 周长链式标注 (总尺寸 + 逐段净空) */}
        {showDimensions && (
          <g style={{ pointerEvents: 'none' }}>
            <PerimeterDims rooms={rooms} wallT={wallT} minX={minX} maxX={maxX} minZ={minZ} maxZ={maxZ} />
            {/* 单位说明 */}
            <text
              x={vbX + 0.2} y={vbY + 0.42}
              textAnchor="start" dominantBaseline="middle"
              fontSize={0.3} fill={C.textDim}
              style={{ userSelect: 'none' }}
            >
              单位: mm
            </text>
          </g>
        )}

        {/* 房间名称 */}
        {showSpaceName && rooms.map((room) => {
          const xs = room.walls.flatMap((w) => [w.start[0], w.end[0]]);
          const zs = room.walls.flatMap((w) => [w.start[1], w.end[1]]);
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
          const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
          return (
            <text
              key={`label-${room.id}`}
              x={cx}
              y={cz}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={C.text}
              fontSize={0.5}
              fontWeight={500}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {room.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/** ===== 尺寸标注 (参考建筑户型图: 每侧 "总尺寸线 + 逐段链式尺寸线") ===== */
const DIM = {
  chainOffset: 0.5,  // 链式尺寸线距户型外缘
  totalOffset: 1.6,  // 总尺寸线距户型外缘
  font: 0.26,        // 链式标注字号
  totalFont: 0.34,   // 总尺寸字号
  tick: 0.07,        // 45° 起止符号半径
  narrow: 0.7,       // 段长 < 此值 → 文字转竖排并外移一层
  minLabel: 0.09,    // 段长 < 此值 → 不标数字 (仅符号)
};

/** 45° 起止符号 (建筑制图风格) */
function DimTick({ x, y }: { x: number; y: number }) {
  return (
    <line
      x1={x - DIM.tick} y1={y + DIM.tick} x2={x + DIM.tick} y2={y - DIM.tick}
      stroke={C.textDim} strokeWidth={0.025}
    />
  );
}

/** 标注文字 — 白色描边保证压在家具/地面上仍可读 */
function DimText({
  x, y, text, rotate = 0, fontSize = DIM.font,
}: { x: number; y: number; text: string; rotate?: number; fontSize?: number }) {
  return (
    <text
      x={x} y={y}
      {...(rotate ? { transform: `rotate(${rotate} ${x} ${y})` } : {})}
      textAnchor="middle" dominantBaseline="middle"
      fontSize={fontSize} fontWeight={500} fill={C.text}
      stroke={C.bg} strokeWidth={0.1}
      style={{ paintOrder: 'stroke', userSelect: 'none' }}
    >
      {text}
    </text>
  );
}

/**
 * 从房间几何推导某轴上的分段断点 (不取墙体面, 故不会出现墙厚读数):
 *  - 内部断点: 各房间包围盒的轴线 (相邻房间共享墙只产生一个断点)
 *  - 端部断点: 取墙体外侧 (户型外缘), 并把外墙轴线点并入端部
 *    → 房间起止按"墙外侧"计量, 且端部不再残留半墙厚的碎片段
 */
function buildChainCoords(
  rooms: Room[], axis: 'x' | 'z', outerMin: number, outerMax: number, wallT: number,
): number[] {
  const raw: number[] = [outerMin, outerMax];
  for (const room of rooms) {
    const xs = room.walls.flatMap((w) => [w.start[0], w.end[0]]);
    const zs = room.walls.flatMap((w) => [w.start[1], w.end[1]]);
    raw.push(axis === 'x' ? Math.min(...xs) : Math.min(...zs));
    raw.push(axis === 'x' ? Math.max(...xs) : Math.max(...zs));
  }
  const snapped = raw
    .map((v) => Math.round(v * 200) / 200) // 5mm 粒度
    .filter((v) => v >= outerMin - 1e-6 && v <= outerMax + 1e-6)
    .sort((a, b) => a - b);

  const end = wallT / 2 + 0.02; // 外墙轴线离外缘正好半墙厚 → 并入端部
  const out: number[] = [];
  for (const v of snapped) {
    if (!out.length || v - out[out.length - 1] > 0.03) out.push(v);
  }
  const inner = out.filter((v) => v - outerMin > end && outerMax - v > end);
  const coords = [outerMin, ...inner, outerMax];
  return coords.length >= 2 ? coords : [outerMin, outerMax];
}

/** 墙厚段 (不标注, 只保留起止符号) */
function isWallThickness(len: number, wallT: number) {
  return Math.abs(len - wallT) <= 0.03;
}

/** 水平链式尺寸线 (dir: -1 在户型上方 / +1 在下方) */
function HDimChain({
  coords, y, edge, dir, wallT,
}: { coords: number[]; y: number; edge: number; dir: -1 | 1; wallT: number }) {
  const extStart = edge + dir * 0.06;
  const extEnd = y + dir * 0.1;
  return (
    <g>
      <line x1={coords[0]} y1={y} x2={coords[coords.length - 1]} y2={y} stroke={C.textDim} strokeWidth={0.022} />
      {coords.map((c, i) => (
        <g key={`t${i}`}>
          <DimTick x={c} y={y} />
          <line x1={c} y1={extStart} x2={c} y2={extEnd} stroke={C.textDim} strokeWidth={0.013} />
        </g>
      ))}
      {coords.slice(0, -1).map((a, i) => {
        const b = coords[i + 1];
        const len = b - a;
        if (len < DIM.minLabel || isWallThickness(len, wallT)) return null;
        const mid = (a + b) / 2;
        const rot = len < DIM.narrow;
        return (
          <DimText
            key={`d${i}`} x={mid}
            y={y + dir * (rot ? 0.62 : 0.26)}
            text={`${Math.round(len * 1000)}`}
            rotate={rot ? -90 : 0}
          />
        );
      })}
    </g>
  );
}

/** 垂直链式尺寸线 (dir: -1 在户型左侧 / +1 在右侧) */
function VDimChain({
  coords, x, edge, dir, wallT,
}: { coords: number[]; x: number; edge: number; dir: -1 | 1; wallT: number }) {
  const extStart = edge + dir * 0.06;
  const extEnd = x + dir * 0.1;
  return (
    <g>
      <line x1={x} y1={coords[0]} x2={x} y2={coords[coords.length - 1]} stroke={C.textDim} strokeWidth={0.022} />
      {coords.map((c, i) => (
        <g key={`t${i}`}>
          <DimTick x={x} y={c} />
          <line x1={extStart} y1={c} x2={extEnd} y2={c} stroke={C.textDim} strokeWidth={0.013} />
        </g>
      ))}
      {coords.slice(0, -1).map((a, i) => {
        const b = coords[i + 1];
        const len = b - a;
        if (len < DIM.minLabel || isWallThickness(len, wallT)) return null;
        const mid = (a + b) / 2;
        const rot = len < DIM.narrow;
        return (
          <DimText
            key={`d${i}`}
            x={x + dir * (rot ? 0.62 : 0.26)}
            y={mid}
            text={`${Math.round(len * 1000)}`}
            rotate={rot ? 0 : -90}
          />
        );
      })}
    </g>
  );
}

/**
 * 户型周长尺寸标注 — 四侧各一组:
 *   内侧: 逐段链式尺寸线 (墙厚 / 净空交替)
 *   外侧: 总尺寸线
 */
function PerimeterDims({
  rooms, wallT, minX, maxX, minZ, maxZ,
}: { rooms: Room[]; wallT: number; minX: number; maxX: number; minZ: number; maxZ: number }) {
  // 外缘 = 墙中心线包围盒 ± 半墙厚 (墙体按中心线绘制)
  const oMinX = minX - wallT / 2, oMaxX = maxX + wallT / 2;
  const oMinZ = minZ - wallT / 2, oMaxZ = maxZ + wallT / 2;

  const xCoords = buildChainCoords(rooms, 'x', oMinX, oMaxX, wallT);
  const zCoords = buildChainCoords(rooms, 'z', oMinZ, oMaxZ, wallT);
  const totalW = `${Math.round((oMaxX - oMinX) * 1000)}`;
  const totalH = `${Math.round((oMaxZ - oMinZ) * 1000)}`;

  const yTopChain = oMinZ - DIM.chainOffset;
  const yTopTotal = oMinZ - DIM.totalOffset;
  const yBotChain = oMaxZ + DIM.chainOffset;
  const yBotTotal = oMaxZ + DIM.totalOffset;
  const xLeftChain = oMinX - DIM.chainOffset;
  const xLeftTotal = oMinX - DIM.totalOffset;
  const xRightChain = oMaxX + DIM.chainOffset;
  const xRightTotal = oMaxX + DIM.totalOffset;

  return (
    <g>
      {/* 上: 总宽 + 链式 */}
      <HDimChain coords={xCoords} y={yTopChain} edge={oMinZ} dir={-1} wallT={wallT} />
      <line x1={oMinX} y1={yTopTotal} x2={oMaxX} y2={yTopTotal} stroke={C.textDim} strokeWidth={0.022} />
      <DimTick x={oMinX} y={yTopTotal} />
      <DimTick x={oMaxX} y={yTopTotal} />
      <DimText x={(oMinX + oMaxX) / 2} y={yTopTotal - 0.32} text={totalW} fontSize={DIM.totalFont} />
      <line x1={oMinX} y1={oMinZ - 0.06} x2={oMinX} y2={yTopTotal - 0.1} stroke={C.textDim} strokeWidth={0.013} />
      <line x1={oMaxX} y1={oMinZ - 0.06} x2={oMaxX} y2={yTopTotal - 0.1} stroke={C.textDim} strokeWidth={0.013} />

      {/* 下: 总宽 + 链式 */}
      <HDimChain coords={xCoords} y={yBotChain} edge={oMaxZ} dir={1} wallT={wallT} />
      <line x1={oMinX} y1={yBotTotal} x2={oMaxX} y2={yBotTotal} stroke={C.textDim} strokeWidth={0.022} />
      <DimTick x={oMinX} y={yBotTotal} />
      <DimTick x={oMaxX} y={yBotTotal} />
      <DimText x={(oMinX + oMaxX) / 2} y={yBotTotal + 0.32} text={totalW} fontSize={DIM.totalFont} />
      <line x1={oMinX} y1={oMaxZ + 0.06} x2={oMinX} y2={yBotTotal + 0.1} stroke={C.textDim} strokeWidth={0.013} />
      <line x1={oMaxX} y1={oMaxZ + 0.06} x2={oMaxX} y2={yBotTotal + 0.1} stroke={C.textDim} strokeWidth={0.013} />

      {/* 左: 总深 + 链式 */}
      <VDimChain coords={zCoords} x={xLeftChain} edge={oMinX} dir={-1} wallT={wallT} />
      <line x1={xLeftTotal} y1={oMinZ} x2={xLeftTotal} y2={oMaxZ} stroke={C.textDim} strokeWidth={0.022} />
      <DimTick x={xLeftTotal} y={oMinZ} />
      <DimTick x={xLeftTotal} y={oMaxZ} />
      <DimText x={xLeftTotal - 0.32} y={(oMinZ + oMaxZ) / 2} text={totalH} rotate={-90} fontSize={DIM.totalFont} />
      <line x1={oMinX - 0.06} y1={oMinZ} x2={xLeftTotal - 0.1} y2={oMinZ} stroke={C.textDim} strokeWidth={0.013} />
      <line x1={oMinX - 0.06} y1={oMaxZ} x2={xLeftTotal - 0.1} y2={oMaxZ} stroke={C.textDim} strokeWidth={0.013} />

      {/* 右: 总深 + 链式 */}
      <VDimChain coords={zCoords} x={xRightChain} edge={oMaxX} dir={1} wallT={wallT} />
      <line x1={xRightTotal} y1={oMinZ} x2={xRightTotal} y2={oMaxZ} stroke={C.textDim} strokeWidth={0.022} />
      <DimTick x={xRightTotal} y={oMinZ} />
      <DimTick x={xRightTotal} y={oMaxZ} />
      <DimText x={xRightTotal + 0.32} y={(oMinZ + oMaxZ) / 2} text={totalH} rotate={-90} fontSize={DIM.totalFont} />
      <line x1={oMaxX + 0.06} y1={oMinZ} x2={xRightTotal + 0.1} y2={oMinZ} stroke={C.textDim} strokeWidth={0.013} />
      <line x1={oMaxX + 0.06} y1={oMaxZ} x2={xRightTotal + 0.1} y2={oMaxZ} stroke={C.textDim} strokeWidth={0.013} />
    </g>
  );
}

/** 房间地面填充 — 白底 + 材质色淡染 + 材质线稿 (木板缝 / 砖缝 / 地毯点) */
function RoomFloor({ room }: { room: Room }) {
  // 与 3D 地坪同口径: 用闭合墙环而不是墙体端点包围盒 (借来的长墙会把地面拉出房间)
  const b = roomOutline(room.walls);
  const x = b.minX;
  const z = b.minZ;
  const w = b.width;
  const h = b.depth;
  const m = floorMaterialDef(room);
  return (
    <g>
      <rect x={x} y={z} width={w} height={h} fill={C.floor} stroke="none" />
      <rect x={x} y={z} width={w} height={h} fill={m.swatch} fillOpacity={0.09} stroke="none" />
      {m.pattern !== 'solid' && (
        <rect x={x} y={z} width={w} height={h} fill={`url(#floor-pat-${m.id})`} stroke="none" />
      )}
    </g>
  );
}

/**
 * 地面材质填充图案 —— 与 3D 用同一份材质注册表 (data/floorMaterials.ts)。
 * 尺寸单位就是 viewBox 的米, 所以木板缝 0.15m、地砖 0.6/0.3m 都是真实比例。
 */
function FloorPatterns() {
  return (
    <defs>
      {FLOOR_MATERIAL_ORDER.map((id) => {
        const m = FLOOR_MATERIALS[id];
        if (m.pattern === 'solid') return null;
        if (m.pattern === 'plank') {
          return (
            <pattern key={id} id={`floor-pat-${id}`} patternUnits="userSpaceOnUse" width={1.2} height={0.15}>
              <line x1={0} y1={0.002} x2={1.2} y2={0.002} stroke={m.grain} strokeWidth={0.012} opacity={0.55} />
              <line x1={0.62} y1={0.002} x2={0.62} y2={0.15} stroke={m.grain} strokeWidth={0.01} opacity={0.35} />
            </pattern>
          );
        }
        if (m.pattern === 'dot') {
          return (
            <pattern key={id} id={`floor-pat-${id}`} patternUnits="userSpaceOnUse" width={0.12} height={0.12}>
              <circle cx={0.06} cy={0.06} r={0.011} fill={m.grain} opacity={0.45} />
            </pattern>
          );
        }
        const cell = m.pattern === 'grid-coarse' ? 0.6 : 0.3;
        return (
          <pattern key={id} id={`floor-pat-${id}`} patternUnits="userSpaceOnUse" width={cell} height={cell}>
            <path
              d={`M ${cell} 0 H 0 V ${cell}`}
              fill="none"
              stroke={m.grain}
              strokeWidth={0.012}
              opacity={0.45}
            />
          </pattern>
        );
      })}
    </defs>
  );
}


/**
 * 平面图家具的交互包装 — 符号 + 选中描边 + 旋转手柄。
 *
 * 命中判定由 FloorPlan2D 根节点的 pointerDown 统一做 (furnitureHitTest),
 * 本组件只负责画:
 *   - 家具符号本身 (FurnitureSymbol2D, 与 3D 同源的类型分派)
 *   - 选中态绿色描边 (尺寸走 footprintOf, 与命中测试同口径)
 *   - 右上角旋转手柄 (点一下顺时针 90°, 与键盘 R 同效)
 * 拖动中的家具压暗, 实时预览交给 PlacementGhost。
 */
function Furniture2DInteractive({ furniture, dragging }: { furniture: Furniture; dragging: boolean }) {
  const selected = useAppStore((s) => s.selectedFurnitureId === furniture.id);
  const updateFurniture = useAppStore((s) => s.updateFurniture);

  const [x, , z] = furniture.position;
  const isShower = furniture.type === 'shower';
  const { w, h } = footprintOf(furniture);
  // 淋浴间是从锚点 (x,z) 向 +X/+Z 展开的图形, 描边按边长 size[0] 画
  const hitW = isShower ? furniture.size[0] : w;
  const hitH = isShower ? furniture.size[0] : h;
  const hitX = isShower ? x : x - hitW / 2;
  const hitY = isShower ? z : z - hitH / 2;
  const handleR = 0.13;

  return (
    <g data-fid={furniture.id} data-ftype={furniture.type} opacity={dragging ? 0.2 : 1}>
      <FurnitureSymbol2D furniture={furniture} />
      {selected && !dragging && (
        <g transform={`rotate(${-furniture.rotation}, ${x}, ${z})`}>
          <rect
            x={hitX - 0.05} y={hitY - 0.05}
            width={hitW + 0.1} height={hitH + 0.1}
            fill="none" stroke="#22c55e" strokeWidth={0.045} rx={0.05}
            pointerEvents="none"
          />
          {!furniture.embedded && (
            <g
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                updateFurniture(furniture.id, {
                  rotation: normalizeDeg(furniture.rotation + 90),
                });
              }}
            >
              <circle
                cx={hitX + hitW + handleR * 0.9} cy={hitY - handleR * 0.9} r={handleR}
                fill="#ffffff" stroke="#22c55e" strokeWidth={0.04}
              />
              <text
                x={hitX + hitW + handleR * 0.9} y={hitY - handleR * 0.9}
                textAnchor="middle" dominantBaseline="central"
                fontSize={0.15} fontWeight={600} fill="#16a34a"
                style={{ userSelect: 'none' }}
              >
                R
              </text>
            </g>
          )}
        </g>
      )}
    </g>
  );
}

/**
 * 放置预览 — 半透明符号 + 绿/红虚线框。
 * 绿 = 校验通过 (松手落位); 红 = 压墙 / 压家具 / 出房间 (松手不落)。
 */
function PlacementGhost({ furniture, ok }: { furniture: Furniture; ok: boolean }) {
  const [x, , z] = furniture.position;
  const isShower = furniture.type === 'shower';
  const { w, h } = footprintOf(furniture);
  const gw = isShower ? furniture.size[0] : w;
  const gh = isShower ? furniture.size[0] : h;
  const gx = isShower ? x : x - gw / 2;
  const gy = isShower ? z : z - gh / 2;
  const color = ok ? '#22c55e' : '#ef4444';

  return (
    <g pointerEvents="none">
      <g opacity={0.55}>
        <FurnitureSymbol2D furniture={furniture} />
      </g>
      <rect
        x={gx - 0.04} y={gy - 0.04}
        width={gw + 0.08} height={gh + 0.08}
        transform={`rotate(${-furniture.rotation}, ${x}, ${z})`}
        fill={color} fillOpacity={0.08}
        stroke={color} strokeWidth={0.04} strokeDasharray="0.12 0.06"
      />
    </g>
  );
}

/* ==================== 拖拽辅助层 ==================== */

const HUD = {
  wall: '#22c55e',   // 贴墙吸附
  align: '#f59e0b',  // 与其它家具对齐
  dim: '#0ea5e9',    // 净距标注
  font: 0.24,
  tick: 0.075,
};

const mm = (m: number) => `${Math.round(m * 1000)}`;

interface GapLine {
  x1: number; y1: number; x2: number; y2: number;
  lx: number; ly: number;
  text: string;
}

/**
 * 拖拽辅助层 —— 拖动/拖入过程中叠加在平面图上的量测信息。
 *
 *  1. 吸附辅助线: 贴墙=绿色实线(沿线覆盖家具所占墙段), 对齐=琥珀虚线(跨过两件家具)
 *  2. 四向净距: 家具 AABB 四边到房间内墙面的距离, 带端线的标注线段 + 毫米读数
 *     (与户型尺寸标注同口径, 都是 mm)
 *  3. 落点十字: 标出吸附后的精确中心
 *
 * 全部 pointerEvents:none, 不抢 pointer 事件, 也不写 store —— 纯派生视图。
 */
function DragHUD({ hint }: { hint: DragHint }) {
  const { hx, hz, cx, cz, guides, inner } = hint;
  const l = cx - hx, r = cx + hx, t = cz - hz, b = cz + hz;

  const gaps: GapLine[] = [];
  if (inner) {
    // 左右: 水平标注线, 数字压在线上方
    if (l - inner.l > 0.005) {
      gaps.push({ x1: inner.l, y1: cz, x2: l, y2: cz, lx: (inner.l + l) / 2, ly: cz - 0.17, text: mm(l - inner.l) });
    }
    if (inner.r - r > 0.005) {
      gaps.push({ x1: r, y1: cz, x2: inner.r, y2: cz, lx: (r + inner.r) / 2, ly: cz - 0.17, text: mm(inner.r - r) });
    }
    // 上下: 垂直标注线, 数字放在线右侧
    if (t - inner.t > 0.005) {
      gaps.push({ x1: cx, y1: inner.t, x2: cx, y2: t, lx: cx + 0.22, ly: (inner.t + t) / 2, text: mm(t - inner.t) });
    }
    if (inner.b - b > 0.005) {
      gaps.push({ x1: cx, y1: b, x2: cx, y2: inner.b, lx: cx + 0.22, ly: (b + inner.b) / 2, text: mm(inner.b - b) });
    }
  }

  return (
    <g pointerEvents="none">
      {/* 吸附辅助线 */}
      {guides.map((g, i) => {
        const color = g.kind === 'wall' ? HUD.wall : HUD.align;
        return g.axis === 'x' ? (
          <line
            key={`g${i}`}
            x1={g.at} y1={g.from} x2={g.at} y2={g.to}
            stroke={color}
            strokeWidth={g.kind === 'wall' ? 0.055 : 0.03}
            strokeDasharray={g.kind === 'align' ? '0.14 0.08' : undefined}
            opacity={0.95}
          />
        ) : (
          <line
            key={`g${i}`}
            x1={g.from} y1={g.at} x2={g.to} y2={g.at}
            stroke={color}
            strokeWidth={g.kind === 'wall' ? 0.055 : 0.03}
            strokeDasharray={g.kind === 'align' ? '0.14 0.08' : undefined}
            opacity={0.95}
          />
        );
      })}

      {/* 四向净距 */}
      {gaps.map((g, i) => {
        const horizontal = Math.abs(g.y1 - g.y2) < 1e-6;
        return (
          <g key={`gap${i}`}>
            <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke={HUD.dim} strokeWidth={0.022} />
            {horizontal ? (
              <>
                <line x1={g.x1} y1={g.y1 - HUD.tick} x2={g.x1} y2={g.y1 + HUD.tick} stroke={HUD.dim} strokeWidth={0.022} />
                <line x1={g.x2} y1={g.y2 - HUD.tick} x2={g.x2} y2={g.y2 + HUD.tick} stroke={HUD.dim} strokeWidth={0.022} />
              </>
            ) : (
              <>
                <line x1={g.x1 - HUD.tick} y1={g.y1} x2={g.x1 + HUD.tick} y2={g.y1} stroke={HUD.dim} strokeWidth={0.022} />
                <line x1={g.x2 - HUD.tick} y1={g.y2} x2={g.x2 + HUD.tick} y2={g.y2} stroke={HUD.dim} strokeWidth={0.022} />
              </>
            )}
            <text
              x={g.lx} y={g.ly}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={HUD.font} fontWeight={600} fill={HUD.dim}
              stroke="#ffffff" strokeWidth={0.09}
              style={{ paintOrder: 'stroke', userSelect: 'none' }}
            >
              {g.text}
            </text>
          </g>
        );
      })}

      {/* 落点十字 */}
      <g stroke={HUD.dim} strokeWidth={0.02} opacity={0.75}>
        <line x1={cx - 0.12} y1={cz} x2={cx + 0.12} y2={cz} />
        <line x1={cx} y1={cz - 0.12} x2={cx} y2={cz + 0.12} />
      </g>
    </g>
  );
}
