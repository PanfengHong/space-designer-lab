import { useMemo } from 'react';
import * as THREE from 'three';
import type { OutdoorObject } from '../../../../types';
import type { OutdoorPalette } from '../../../../constants/outdoorStyles';

/**
 * 校园建筑 — 教学楼 / 实验楼 / 宿舍楼
 *
 * 统一特征: 多层矩形体块 + 规整窗格 + 主入口 + 勒脚
 * 类型差异:
 *   - teaching-building (教学楼): 窗格较大, 主入口有雨棚, 顶部可带钟楼
 *   - lab-building (实验楼): 窗格密集, 外墙面色偏冷
 *   - dormitory (宿舍楼): 小窗密集 (宿舍单元), 每层带阳台/栏杆
 */
export function SchoolBuilding({ data, palette }: { data: OutdoorObject; palette: OutdoorPalette }) {
  const [w, h, d] = data.size;
  const type = data.type;

  // 建筑配色
  const wallColor = palette.monochrome ? palette.wall : data.color;
  const windowColor = palette.monochrome ? palette.glass : '#6fa8dc';
  const baseColor = palette.concrete;

  // 层高
  const floorH = 3.2;
  const floors = Math.max(3, Math.round(h / floorH));
  const actualFloorH = h / floors;

  // 勒脚高度
  const plinthH = 0.5;

  // 窗户参数
  const isDorm = type === 'dormitory';
  const cols = isDorm ? Math.max(6, Math.round(w / 2.2)) : Math.max(4, Math.round(w / 3));
  const winW = (w - 0.6) / cols * 0.55;
  const winH = isDorm ? actualFloorH * 0.42 : actualFloorH * 0.55;
  const gapX = (w - 0.6) / cols;

  // 生成所有窗户位置 (x 字段在左右侧面复用为 z 坐标)
  const windows = useMemo(() => {
    const arr: { x: number; y: number; side: 'front' | 'back' | 'left' | 'right' }[] = [];
    for (let f = 0; f < floors; f++) {
      const y = plinthH + actualFloorH * (f + 0.5);
      // 正/背面窗户 (沿 X 方向)
      for (let c = 0; c < cols; c++) {
        const x = -w / 2 + 0.3 + gapX * (c + 0.5);
        arr.push({ x, y, side: 'front' });
        arr.push({ x, y, side: 'back' });
      }
      // 侧面窗户 (沿 Z 方向, x 字段复用为 z)
      const sideCols = Math.max(2, Math.round(d / 3));
      const gapZ = (d - 0.6) / sideCols;
      for (let c = 0; c < sideCols; c++) {
        const z = -d / 2 + 0.3 + gapZ * (c + 0.5);
        arr.push({ x: z, y, side: 'left' });
        arr.push({ x: z, y, side: 'right' });
      }
    }
    return arr;
  }, [floors, cols, gapX, w, d, plinthH, actualFloorH]);

  return (
    <group>
      {/* 主体墙体 */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.75} />
      </mesh>

      {/* 勒脚 (底座) */}
      <mesh position={[0, plinthH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.1, plinthH, d + 0.1]} />
        <meshStandardMaterial color={baseColor} roughness={0.85} />
      </mesh>

      {/* 顶部压顶/女儿墙 */}
      <mesh position={[0, h + 0.08, 0]} castShadow>
        <boxGeometry args={[w + 0.16, 0.18, d + 0.16]} />
        <meshStandardMaterial color={baseColor} roughness={0.85} />
      </mesh>

      {/* 楼层分隔线 */}
      {Array.from({ length: floors - 1 }, (_, i) => i + 1).map((i) => (
        <group key={`floor-line-${i}`}>
          <mesh position={[0, plinthH + actualFloorH * i, d / 2 + 0.012]}>
            <boxGeometry args={[w, 0.06, 0.06]} />
            <meshStandardMaterial color={baseColor} roughness={0.85} />
          </mesh>
          <mesh position={[0, plinthH + actualFloorH * i, -d / 2 - 0.012]}>
            <boxGeometry args={[w, 0.06, 0.06]} />
            <meshStandardMaterial color={baseColor} roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* 正/背面窗户 */}
      {windows
        .filter((win) => win.side === 'front' || win.side === 'back')
        .map((win, i) => (
          <mesh
            key={`win-fb-${i}`}
            position={[win.x, win.y, win.side === 'front' ? d / 2 + 0.02 : -d / 2 - 0.02]}
          >
            <boxGeometry args={[winW, winH, 0.04]} />
            <meshStandardMaterial
              color={windowColor}
              transparent
              opacity={palette.monochrome ? 0.6 : 0.75}
              roughness={0.15}
              metalness={0.2}
            />
          </mesh>
        ))}

      {/* 侧面窗户 */}
      {windows
        .filter((win) => win.side === 'left' || win.side === 'right')
        .map((win, i) => {
          const z = win.x; // 复用字段存 z
          const sign = win.side === 'left' ? -1 : 1;
          const sideWinW = (d - 0.6) / Math.max(2, Math.round(d / 3)) * 0.55;
          return (
            <mesh
              key={`win-lr-${i}`}
              position={[sign * (w / 2 + 0.02), win.y, z]}
            >
              <boxGeometry args={[0.04, winH, sideWinW]} />
              <meshStandardMaterial
                color={windowColor}
                transparent
                opacity={palette.monochrome ? 0.6 : 0.75}
                roughness={0.15}
                metalness={0.2}
              />
            </mesh>
          );
        })}

      {/* 宿舍楼阳台栏杆 (每层正面) */}
      {isDorm &&
        Array.from({ length: floors }, (_, f) => f).map((f) => (
          <mesh
            key={`balcony-${f}`}
            position={[0, plinthH + actualFloorH * (f + 0.15), d / 2 + 0.25]}
          >
            <boxGeometry args={[w - 0.4, 0.04, 0.06]} />
            <meshStandardMaterial color={baseColor} roughness={0.8} metalness={0.2} />
          </mesh>
        ))}

      {/* 主入口 (正面中央) */}
      {type === 'teaching-building' && (
        <>
          {/* 入口门洞 (深色) */}
          <mesh position={[0, actualFloorH * 0.45, d / 2 + 0.03]}>
            <boxGeometry args={[w * 0.18, actualFloorH * 0.9, 0.06]} />
            <meshStandardMaterial color={palette.monochrome ? '#d8dce0' : '#3a4a5a'} roughness={0.5} />
          </mesh>
          {/* 入口雨棚 */}
          <mesh position={[0, actualFloorH * 0.95, d / 2 + 0.5]} castShadow>
            <boxGeometry args={[w * 0.3, 0.08, 0.8]} />
            <meshStandardMaterial color={baseColor} roughness={0.8} />
          </mesh>
          {/* 雨棚支柱 */}
          {[-1, 1].map((s) => (
            <mesh key={`col-${s}`} position={[s * w * 0.13, actualFloorH * 0.5, d / 2 + 0.8]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, actualFloorH * 0.9, 8]} />
              <meshStandardMaterial color={baseColor} roughness={0.7} />
            </mesh>
          ))}
        </>
      )}

      {/* 教学楼顶部钟楼 (仅教学楼) */}
      {type === 'teaching-building' && (
        <group position={[0, h, 0]}>
          {/* 钟楼基座 */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[w * 0.15, 1.2, d * 0.15]} />
            <meshStandardMaterial color={wallColor} roughness={0.7} />
          </mesh>
          {/* 钟面 */}
          <mesh position={[0, 0.6, d * 0.15 / 2 + 0.01]}>
            <circleGeometry args={[0.25, 24]} />
            <meshStandardMaterial color={palette.monochrome ? '#ffffff' : '#f5f5f5'} />
          </mesh>
          {/* 尖顶 */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <coneGeometry args={[w * 0.1, 0.7, 4]} />
            <meshStandardMaterial color={baseColor} roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* 实验楼特征: 外墙通风百叶带 */}
      {type === 'lab-building' &&
        Array.from({ length: floors }, (_, f) => f).map((f) => (
          <mesh
            key={`louver-${f}`}
            position={[0, plinthH + actualFloorH * (f + 0.25), -d / 2 - 0.03]}
          >
            <boxGeometry args={[w * 0.8, 0.12, 0.05]} />
            <meshStandardMaterial color={baseColor} roughness={0.8} />
          </mesh>
        ))}

      {/* 外轮廓描边 */}
      <lineSegments position={[0, h / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(w * 1.002, h * 1.002, d * 1.002)]} />
        <lineBasicMaterial color={palette.edge} />
      </lineSegments>
    </group>
  );
}
