import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { FloorMaterialId, FloorOpening, WallSegment } from '../../../../types';
import { useAppStore } from '../../../../store/useAppStore';
import { FLOOR_MATERIALS } from '../../../../data/floorMaterials';
import { getFloorTexture } from '../../../../utils/floorTextures';
import { roomOutline } from '../../../../utils/roomOutline';
import { CLAY_COLOR, CLAY_ROUGHNESS } from '../../../../constants/renderMode';

interface FloorProps {
  segments: WallSegment[];
  roomId: string;
  thickness?: number;
  color?: string;
  /** 地面材质 (每间房可不同)。不传就退回色板纯色 */
  material?: FloorMaterialId;
  /**
   * 抬升值 (米)。房间包围盒互相重叠时, 两块板的顶面会严格共面 → 逐像素抢深度 → 地板闪。
   * 由 floorElevations() 按"谁盖住谁"算出, 见 utils/floorStack.ts。默认 0 = 不抬。
   */
  elevation?: number;
  show?: boolean;
  /**
   * 楼板洞口 (楼梯井等, 世界坐标矩形)。传入后地坪从整块 box 换成带孔的挤出体,
   * 下行楼梯 (StairFlight.startHeight < 0) 从洞口穿过楼板向下。
   * 洞口会钳制在房间范围内; 比楼梯构件各大 3cm 左右, 避免与踏面/立柱严格共面。
   */
  openings?: FloorOpening[];
}

export function Floor({
  segments,
  roomId,
  thickness = 0.15,
  color = '#c8c8c8',
  material,
  elevation = 0,
  show = true,
  openings,
}: FloorProps) {
  const selectStructure = useAppStore((s) => s.selectStructure);
  const selectedId = useAppStore((s) => s.selectedStructureId);
  const layers = useAppStore((s) => s.layers);
  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;
  /**
   * 白模 (arctic) 下地面**不体现材质** —— 整个模型统一成素模灰, 只留形体。
   * 地面自己订阅 renderMode 换外观 (网格带 userData.keepMaterial, BaseScene 的整体
   * 材质替换会跳过它), 免得"共享粘土 / 自己的贴图材质"两套逻辑来回抢同一个 mesh。
   */
  const arctic = useAppStore((s) => s.renderMode === 'arctic');

  const sid = `floor:${roomId}`;
  const isSelected = selectedId === sid;

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (buildingLocked) return;
    selectStructure(sid);
  };
  const handlePointerOver = (e: any) => {
    if (buildingLocked) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  /**
   * 地坪范围取房间的**闭合墙环**, 不是全部墙端点的包围盒:
   * 房间墙列表里常带借来的长墙 (三居室客厅东墙从 z=2.2 一路拉到 6.5),
   * 取 min/max 会让客厅地板压进厨房。见 utils/roomOutline.ts。
   */
  const bounds = useMemo(() => roomOutline(segments), [segments]);
  const { width, depth, cx: centerX, cz: centerZ } = bounds;

  /**
   * 贴图重复次数按真实尺寸算: 一张贴图 = 材质定义的 tile 边长。
   * 模板纹理按材质缓存共用, 这里只 clone 一份改 repeat, 不动共用底图。
   */
  const def = material ? FLOOR_MATERIALS[material] : null;
  /**
   * 带洞口的楼板几何: 房间轮廓矩形挖掉若干矩形洞 (楼梯井)。
   * Shape 平面用 (x, z), 挤出 depth 沿 shape +Z → rotateX(90°) 后变成世界 -Y,
   * 顶面正好落在 y=0 (与 box 路径的板顶一致), 由外层 group 抬到 elevation。
   * 挤出体 UV 是**世界米** (WorldUVGenerator 直接取顶点坐标), 与 box 的 0~1
   * 不同 —— 贴图 repeat 要按 1/tile 设, 否则花纹会被拉扯。
   */
  const carvedGeometry = useMemo(() => {
    if (!openings || openings.length === 0) return null;
    if (width <= 0 || depth <= 0) return null;
    const shape = new THREE.Shape();
    shape.moveTo(bounds.minX, bounds.minZ);
    shape.lineTo(bounds.maxX, bounds.minZ);
    shape.lineTo(bounds.maxX, bounds.maxZ);
    shape.lineTo(bounds.minX, bounds.maxZ);
    shape.closePath();
    for (const o of openings) {
      const x1 = Math.max(bounds.minX, o.x);
      const z1 = Math.max(bounds.minZ, o.z);
      const x2 = Math.min(bounds.maxX, o.x + o.w);
      const z2 = Math.min(bounds.maxZ, o.z + o.d);
      if (x2 - x1 < 0.01 || z2 - z1 < 0.01) continue;
      const hole = new THREE.Path();
      hole.moveTo(x1, z1);
      hole.lineTo(x2, z1);
      hole.lineTo(x2, z2);
      hole.lineTo(x1, z2);
      hole.closePath();
      shape.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openings, bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ, thickness]);

  useEffect(() => () => carvedGeometry?.dispose(), [carvedGeometry]);

  const map = useMemo(() => {
    if (!def || width <= 0 || depth <= 0) return null;
    const t = getFloorTexture(def.id).clone();
    t.needsUpdate = true;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    if (carvedGeometry) {
      // 挤出体 UV = 世界米 → 1 米重复 1/tile 次
      t.repeat.set(1 / def.tile, 1 / def.tile);
    } else {
      t.repeat.set(width / def.tile, depth / def.tile);
    }
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def?.id, width, depth, carvedGeometry]);

  useEffect(() => () => map?.dispose(), [map]);

  if (!show || segments.length < 3) return null;

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <mesh
        receiveShadow
        position={carvedGeometry ? [0, elevation, 0] : [centerX, elevation - thickness / 2, centerZ]}
        geometry={carvedGeometry ?? undefined}
        userData={{ keepMaterial: true }}
      >
        {!carvedGeometry && (
          <boxGeometry args={[width, thickness, depth]} />
        )}
        {/* 两种外观各用**独立 key** 的材质元素: three 里"加/去贴图"要重编译着色器,
            而 R3F 对同位置的同类元素会复用同一个 material 实例 (只改 prop),
            不加 key 的话白模切回着色时地面会一直是纯白 —— 贴图进了 shader 但不生效。
            换 key → 旧材质卸载, 新材质按当前 props 从头编译, 一定正确。 */}
        {arctic ? (
          <meshStandardMaterial
            key="clay"
            color={CLAY_COLOR}
            roughness={CLAY_ROUGHNESS}
            metalness={0}
            envMapIntensity={1}
          />
        ) : (
          <meshStandardMaterial
            key="floor"
            map={map ?? undefined}
            color={map ? '#ffffff' : color}
            roughness={def?.roughness ?? 0.55}
            metalness={def?.metalness ?? 0}
            envMapIntensity={0.45}
          />
        )}
      </mesh>
      {/* 选中高亮 */}
      {isSelected && (
        <>
          <mesh position={[centerX, elevation + 0.001, centerZ]}>
            <boxGeometry args={[width, 0.01, depth]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <lineSegments position={[centerX, elevation + 0.001, centerZ]}>
            <edgesGeometry args={[new THREE.BoxGeometry(width * 1.01, 0.01, depth * 1.01)]} />
            <lineBasicMaterial color="#16a34a" />
          </lineSegments>
        </>
      )}
    </group>
  );
}
