import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import type { ModelItem, Furniture, SceneData } from '../../types';
import { Bed } from '../3D/indoor/furniture/Bed';
import { Sofa } from '../3D/indoor/furniture/Sofa';
import { Table } from '../3D/indoor/furniture/Table';
import { Cabinet } from '../3D/indoor/furniture/Cabinet';
import { Chair } from '../3D/indoor/furniture/Chair';
import { Refrigerator } from '../3D/indoor/furniture/Refrigerator';
import { WashingMachine } from '../3D/indoor/furniture/WashingMachine';
import { Toilet } from '../3D/indoor/furniture/Toilet';
import { Sink } from '../3D/indoor/furniture/Sink';
import { Shower } from '../3D/indoor/furniture/Shower';
import { Stove } from '../3D/indoor/furniture/Stove';
import { Appliance } from '../3D/indoor/furniture/Appliance';
import { Decor } from '../3D/indoor/furniture/Decor';
import { mockSceneData, oneBedroomScene, twoBedroomScene, modernApartmentScene } from '../../data/mockScene';
import { getOutdoorSceneForModel } from '../../data/outdoorScene';
import type { GroundItem, OutdoorObject, OutdoorSceneData } from '../../types';

function renderFurniture(data: Furniture) {
  switch (data.type) {
    case 'bed': return <Bed data={data} />;
    case 'sofa': return <Sofa data={data} />;
    case 'table': return <Table data={data} />;
    case 'cabinet': return <Cabinet data={data} />;
    case 'chair': return <Chair data={data} />;
    case 'fridge': return <Refrigerator data={data} />;
    case 'washer': return <WashingMachine data={data} />;
    case 'toilet': return <Toilet data={data} />;
    case 'sink': return <Sink data={data} />;
    case 'shower': return <Shower data={data} />;
    case 'stove': return <Stove data={data} />;
    case 'appliance': return <Appliance data={data} />;
    case 'decor': return <Decor data={data} />;
    default: return <Decor data={data} />;
  }
}

/** 家具预览 */
function FurniturePreview({ item }: { item: ModelItem }) {
  const furnitureData: Furniture = useMemo(() => ({
    id: item.id,
    name: item.name,
    position: [0, 0, 0],
    rotation: 0,
    size: item.size ?? [1, 1, 1],
    type: item.type as Furniture['type'],
    color: item.color ?? '#cccccc',
  }), [item]);

  const [w, h, d] = furnitureData.size;

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2.5, 4, 2]} intensity={0.7} castShadow />
      <directionalLight position={[-2, 2.5, -1.5]} intensity={0.25} color="#c8d4e8" />
      <hemisphereLight args={['#e8eef5', '#d4c8b8', 0.35]} />

      {/* 地面阴影板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={0.12} />
      </mesh>

      <group position={[0, -h / 2, 0]}>
        {renderFurniture(furnitureData)}
      </group>
    </>
  );
}

/** 户型预览 — 从真实场景数据提取房间轮廓 */
function ApartmentPreview({ item }: { item: ModelItem }) {
  const scene: SceneData = useMemo(() => {
    switch (item.type) {
      case 'one-bed': return oneBedroomScene;
      case 'two-bed': return twoBedroomScene;
      case 'modern': return modernApartmentScene;
      default: return mockSceneData;
    }
  }, [item.type]);

  // 构建房间体块: 每个房间用扁平 box (地板) + 矮墙轮廓
  const blocks = useMemo(() => {
    const result: { color: string; pos: [number, number, number]; size: [number, number, number]; isWall: boolean }[] = [];
    // 房间色调 (按顺序循环)
    const roomColors = ['#e8e0d4', '#d4e0e8', '#e0d4c8', '#d4e8e0', '#e8d4e0', '#d0d8e8'];

    scene.rooms.forEach((room, idx) => {
      // 计算房间 AABB
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const w of room.walls) {
        minX = Math.min(minX, w.start[0], w.end[0]);
        maxX = Math.max(maxX, w.start[0], w.end[0]);
        minZ = Math.min(minZ, w.start[1], w.end[1]);
        maxZ = Math.max(maxZ, w.start[1], w.end[1]);
      }
      if (minX === Infinity) return;
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      const dx = maxX - minX;
      const dz = maxZ - minZ;
      const color = roomColors[idx % roomColors.length];

      // 地板
      result.push({ color, pos: [cx, 0, cz], size: [dx, 0.06, dz], isWall: false });

      // 墙体: 从 walls 数据生成
      room.walls.forEach((wall) => {
        const [sx, sz] = wall.start;
        const [ex, ez] = wall.end;
        const wlen = Math.sqrt((ex - sx) ** 2 + (ez - sz) ** 2);
        if (wlen < 0.01) return;
        // 墙的方向角度
        const angle = Math.atan2(ez - sz, ex - sx);
        const wcx = (sx + ex) / 2;
        const wcz = (sz + ez) / 2;
        // 矮墙高度 (缩略图用半高, 不遮挡内部)
        const wallH = 0.5;
        // 墙体位置 (group 旋转)
        result.push({
          color: '#b0a898',
          pos: [wcx, wallH / 2, wcz],
          size: [wlen, wallH, 0.08],
          isWall: true,
        });
        // 记录墙角度, 用 userData 模拟 (这里简化: 不旋转, 用近似)
      });
    });
    return result;
  }, [scene]);

  // 计算场景中心, 用于相机 target
  const center = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    scene.rooms.forEach((r) => {
      r.walls.forEach((w) => {
        minX = Math.min(minX, w.start[0], w.end[0]);
        maxX = Math.max(maxX, w.start[0], w.end[0]);
        minZ = Math.min(minZ, w.start[1], w.end[1]);
        maxZ = Math.max(maxZ, w.start[1], w.end[1]);
      });
    });
    return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, span: Math.max(maxX - minX, maxZ - minZ) };
  }, [scene]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[center.x + 5, 8, center.z + 5]} intensity={0.6} />
      <directionalLight position={[center.x - 3, 4, center.z - 3]} intensity={0.2} color="#c8d4e8" />
      <hemisphereLight args={['#e8eef5', '#d4c8b8', 0.4]} />

      {/* 地面阴影板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center.x, 0, center.z]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial opacity={0.08} />
      </mesh>

      {/* 房间体块 */}
      {blocks.filter((b) => !b.isWall).map((b, i) => (
        <mesh key={`floor-${i}`} position={b.pos} receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} roughness={0.9} />
        </mesh>
      ))}
      {/* 墙体 (半透明, 不遮挡) */}
      {blocks.filter((b) => b.isWall).map((b, i) => (
        <mesh key={`wall-${i}`} position={b.pos}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} roughness={0.85} transparent opacity={0.75} />
        </mesh>
      ))}
    </>
  );
}

/** 园区预览 — 用轻量体块表现地面层与空间层 (蓝白数字园区风) */
function CampusPreview({ item }: { item: ModelItem }) {
  const scene: OutdoorSceneData = useMemo(() => getOutdoorSceneForModel(item), [item]);

  const groundColor = (g: GroundItem) => {
    switch (g.type) {
      case 'river': return '#9ccdee';
      case 'grass': return '#cfe9cd';
      case 'road': return g.position[1] > 0.5 ? '#b8c2cd' : '#c2cad4';
      case 'intersection': return '#c2cad4';
      case 'ramp': return '#b8c2cd';
      default: return g.color || '#f2f5f9';
    }
  };

  const objectColor = (o: OutdoorObject) => {
    switch (o.type) {
      case 'building': return '#8fc4ee';
      case 'warehouse': return '#eef2f7';
      case 'truck': return '#7fb0e2';
      case 'car': return '#ffffff';
      default: return o.color;
    }
  };

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[40, 60, 30]} intensity={0.7} />
      <directionalLight position={[-30, 30, -20]} intensity={0.25} color="#c8daf0" />
      <hemisphereLight args={['#dceaf6', '#e4eadf', 0.45]} />

      {/* 地面结构层: 地面 → 河流 → 草地 → 道路 → 路口 → 匝道 */}
      {(['ground', 'river', 'grass', 'road', 'intersection', 'ramp'] as GroundItem['type'][]).flatMap((type) =>
        scene.ground.filter((g) => g.type === type).map((g) => (
          <group
            key={g.id}
            position={g.position}
            rotation={[0, (g.rotation * Math.PI) / 180, 0]}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={g.size} />
              <meshStandardMaterial color={groundColor(g)} roughness={0.85} />
            </mesh>
            {g.type === 'road' && (
              <mesh position={[0, g.size[1] / 2 + 0.006, 0]}>
                <boxGeometry args={[g.size[0] * 0.96, 0.012, 0.05]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            )}
          </group>
        ))
      )}

      {/* 空间设计层: 建筑/车辆体块 */}
      {scene.objects.map((o) => (
        <group
          key={o.id}
          position={o.position}
          rotation={[0, (o.rotation * Math.PI) / 180, 0]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={o.size} />
            <meshStandardMaterial
              color={objectColor(o)}
              roughness={o.type === 'building' ? 0.25 : 0.7}
              metalness={o.type === 'building' ? 0.2 : 0}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function ModelThumbnail({ item }: { item: ModelItem }) {
  // 根据家具尺寸计算相机距离 (留出余量, 确保完整显示)
  const camDist =
    item.category === 'furniture'
      ? Math.max(...(item.size ?? [1, 1, 1]), 1) * 1.8 + 1.2
      : item.category === 'campus'
        ? 120
        : 7;

  // 户型相机 target
  const target = useMemo(() => {
    if (item.category === 'furniture') return [0, 0, 0] as [number, number, number];
    if (item.category === 'campus') return [0, 2, 0] as [number, number, number];
    // 户型: 从 mockScene 提取中心
    let scene: SceneData;
    switch (item.type) {
      case 'one-bed': scene = oneBedroomScene; break;
      case 'two-bed': scene = twoBedroomScene; break;
      case 'modern': scene = modernApartmentScene; break;
      default: scene = mockSceneData;
    }
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    scene.rooms.forEach((r) => {
      r.walls.forEach((w) => {
        minX = Math.min(minX, w.start[0], w.end[0]);
        maxX = Math.max(maxX, w.start[0], w.end[0]);
        minZ = Math.min(minZ, w.start[1], w.end[1]);
        maxZ = Math.max(maxZ, w.start[1], w.end[1]);
      });
    });
    return [(minX + maxX) / 2, 0, (minZ + maxZ) / 2] as [number, number, number];
  }, [item]);

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{ fov: 35, position: [target[0] + camDist * 0.7, camDist * 0.6, target[2] + camDist * 0.7] }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Suspense fallback={null}>
        {item.category === 'furniture'
          ? <FurniturePreview item={item} />
          : item.category === 'campus'
            ? <CampusPreview item={item} />
            : <ApartmentPreview item={item} />}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={1.2}
          minPolarAngle={Math.PI / 3.5}
          maxPolarAngle={Math.PI / 2.1}
          target={target}
          enabled={false}
        />
      </Suspense>
    </Canvas>
  );
}
