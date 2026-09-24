import { useMemo } from 'react';
import * as THREE from 'three';
import type { OutdoorObject } from '../../../../types';
import type { OutdoorPalette } from '../../../../constants/outdoorStyles';

/**
 * 玻璃幕墙大厦 — 白色基座 + 蓝色玻璃塔楼 + 白色格栅幕墙 + 顶部顶板
 * 参考数字化园区中的高层办公楼
 */
export function GlassBuilding({ data, palette }: { data: OutdoorObject; palette: OutdoorPalette }) {
  const [w, h, d] = data.size;

  const podiumH = Math.min(0.9, Math.max(0.6, h * 0.07));
  const insetX = Math.min(0.4, w * 0.06);
  const insetZ = Math.min(0.4, d * 0.06);
  const towerW = w - insetX * 2;
  const towerD = d - insetZ * 2;
  const roofH = 0.22;
  const towerH = h - podiumH - roofH;
  const towerY = podiumH + towerH / 2;

  // 玻璃色: 彩色风格使用模型自身颜色, 白模风格使用灰
  const glassColor = palette.monochrome ? palette.glass : data.color;

  // 楼层横线
  const floorGap = 1.2;
  const floors = useMemo(() => {
    const n = Math.max(2, Math.floor(towerH / floorGap));
    return Array.from({ length: n - 1 }, (_, i) => podiumH + (towerH / n) * (i + 1));
  }, [towerH, podiumH]);

  // 每面竖向幕墙分格 (2 等分 → 3 格)
  const vStrips: { pos: [number, number, number]; size: [number, number, number]; key: string }[] = [];
  const strip = 0.09;
  // 正面/背面 (沿 X)
  [-1, 1].forEach((side) => {
    [-towerW / 3, 0, towerW / 3].forEach((x, i) => {
      vStrips.push({
        key: `fb-${side}-${i}`,
        pos: [x, podiumH + towerH / 2, side * (towerD / 2 + 0.01)],
        size: [strip, towerH, strip],
      });
    });
  });
  // 侧面 (沿 Z)
  [-1, 1].forEach((side) => {
    [-towerD / 3, 0, towerD / 3].forEach((z, i) => {
      vStrips.push({
        key: `lr-${side}-${i}`,
        pos: [side * (towerW / 2 + 0.01), podiumH + towerH / 2, z],
        size: [strip, towerH, strip],
      });
    });
  });

  return (
    <group>
      {/* 白色基座 */}
      <mesh position={[0, podiumH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, podiumH, d]} />
        <meshStandardMaterial color={palette.wall} roughness={0.7} />
      </mesh>

      {/* 入口台阶 (朝向 +Z) */}
      {[0, 1, 2].map((i) => (
        <mesh key={`step-${i}`} position={[0, 0.05 + i * 0.04, d / 2 + 0.18 + i * 0.22]} castShadow receiveShadow>
          <boxGeometry args={[w * 0.26, 0.1, 0.24]} />
          <meshStandardMaterial color={palette.concrete} roughness={0.85} />
        </mesh>
      ))}

      {/* 玻璃塔楼 */}
      <mesh position={[0, towerY, 0]} castShadow receiveShadow>
        <boxGeometry args={[towerW, towerH, towerD]} />
        <meshStandardMaterial
          color={glassColor}
          transparent
          opacity={palette.monochrome ? 0.5 : 0.58}
          metalness={0.3}
          roughness={0.12}
          emissive={glassColor}
          emissiveIntensity={palette.monochrome ? 0 : 0.08}
        />
      </mesh>

      {/* 四角白色立柱 */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`corner-${sx}-${sz}`} position={[sx * towerW / 2, podiumH + towerH / 2, sz * towerD / 2]} castShadow>
            <boxGeometry args={[0.14, towerH + 0.02, 0.14]} />
            <meshStandardMaterial color={palette.wall} roughness={0.6} />
          </mesh>
        ))
      )}

      {/* 竖向幕墙分格 */}
      {vStrips.map((s) => (
        <mesh key={s.key} position={s.pos}>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color={palette.wall} roughness={0.6} />
        </mesh>
      ))}

      {/* 横向楼层线 */}
      {floors.map((y, i) => (
        <group key={`floor-${i}`}>
          <mesh position={[0, y, towerD / 2 + 0.012]}>
            <boxGeometry args={[towerW, 0.07, 0.07]} />
            <meshStandardMaterial color={palette.wall} roughness={0.6} />
          </mesh>
          <mesh position={[0, y, -towerD / 2 - 0.012]}>
            <boxGeometry args={[towerW, 0.07, 0.07]} />
            <meshStandardMaterial color={palette.wall} roughness={0.6} />
          </mesh>
          <mesh position={[towerW / 2 + 0.012, y, 0]}>
            <boxGeometry args={[0.07, 0.07, towerD]} />
            <meshStandardMaterial color={palette.wall} roughness={0.6} />
          </mesh>
          <mesh position={[-towerW / 2 - 0.012, y, 0]}>
            <boxGeometry args={[0.07, 0.07, towerD]} />
            <meshStandardMaterial color={palette.wall} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* 顶部顶板 (出檐) */}
      <mesh position={[0, h - roofH / 2, 0]} castShadow>
        <boxGeometry args={[w - 0.2, roofH, d - 0.2]} />
        <meshStandardMaterial color={palette.wall} roughness={0.65} />
      </mesh>

      {/* 屋顶设备间 */}
      <mesh position={[w * 0.15, h + 0.22, -d * 0.12]} castShadow>
        <boxGeometry args={[w * 0.22, 0.44, d * 0.2]} />
        <meshStandardMaterial color={palette.concrete} roughness={0.8} />
      </mesh>

      {/* 基座浅描边 */}
      <lineSegments position={[0, podiumH / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(w * 1.002, podiumH * 1.002, d * 1.002)]} />
        <lineBasicMaterial color={palette.edge} />
      </lineSegments>
    </group>
  );
}
