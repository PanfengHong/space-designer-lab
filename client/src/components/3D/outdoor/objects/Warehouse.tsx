import * as THREE from 'three';
import type { OutdoorObject } from '../../../../types';
import type { OutdoorPalette } from '../../../../constants/outdoorStyles';

/**
 * 厂房/仓库 — 白色大跨度体块 + 蓝色卷帘门 + 高侧窗 + 顶部压顶
 */
export function Warehouse({ data, palette }: { data: OutdoorObject; palette: OutdoorPalette }) {
  const [w, h, d] = data.size;

  const doorW = w * 0.22;
  const doorH = h * 0.55;
  const doorXs = [-w * 0.18, w * 0.18];

  return (
    <group>
      {/* 主体 */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={palette.monochrome ? palette.wall : data.color} roughness={0.75} />
      </mesh>

      {/* 顶部压顶 */}
      <mesh position={[0, h + 0.08, 0]} castShadow>
        <boxGeometry args={[w + 0.18, 0.18, d + 0.18]} />
        <meshStandardMaterial color={palette.concrete} roughness={0.8} />
      </mesh>

      {/* 底部勒脚 */}
      <mesh position={[0, 0.12, d / 2 + 0.015]}>
        <boxGeometry args={[w, 0.24, 0.06]} />
        <meshStandardMaterial color={palette.metal} roughness={0.7} />
      </mesh>

      {/* 蓝色卷帘门 (正面 +Z) */}
      {doorXs.map((x, i) => (
        <group key={`door-${i}`}>
          <mesh position={[x, doorH / 2, d / 2 + 0.02]}>
            <boxGeometry args={[doorW, doorH, 0.06]} />
            <meshStandardMaterial color={palette.glassDark} roughness={0.5} metalness={0.15} />
          </mesh>
          {/* 卷帘门横向压线 */}
          {Array.from({ length: 5 }, (_, k) => (
            <mesh key={k} position={[x, doorH * (0.18 + k * 0.16), d / 2 + 0.055]}>
              <boxGeometry args={[doorW * 0.92, 0.025, 0.02]} />
              <meshBasicMaterial color={palette.monochrome ? '#c8ccd0' : '#3d7bb0'} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 高侧窗带 */}
      <mesh position={[0, h * 0.82, d / 2 + 0.02]}>
        <boxGeometry args={[w * 0.72, h * 0.1, 0.05]} />
        <meshStandardMaterial
          color={palette.glass}
          transparent
          opacity={palette.monochrome ? 0.6 : 0.7}
          metalness={0.2}
          roughness={0.2}
          emissive={palette.glass}
          emissiveIntensity={palette.monochrome ? 0 : 0.06}
        />
      </mesh>

      {/* 侧面高侧窗 */}
      <mesh position={[w / 2 + 0.02, h * 0.82, 0]}>
        <boxGeometry args={[0.05, h * 0.1, d * 0.6]} />
        <meshStandardMaterial color={palette.glass} transparent opacity={0.7} metalness={0.2} roughness={0.2} />
      </mesh>

      {/* 外轮廓描边 */}
      <lineSegments position={[0, h / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(w * 1.002, h * 1.002, d * 1.002)]} />
        <lineBasicMaterial color={palette.edge} />
      </lineSegments>
    </group>
  );
}
