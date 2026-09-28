import * as THREE from 'three';
import type { OutdoorObject } from '../../../../types';
import type { OutdoorPalette } from '../../../../constants/outdoorStyles';

/**
 * 门卫室 — 独立小型值守岗亭
 *
 * size=[宽, 高, 深]
 */
export function GuardBooth({ data, palette }: { data: OutdoorObject; palette: OutdoorPalette }) {
  const [w, h, d] = data.size;
  const wallColor = palette.monochrome ? palette.wall : data.color;
  const roofColor = palette.monochrome ? palette.concrete : '#2b6cb0';
  const winColor = palette.monochrome ? palette.glass : '#6fa8dc';

  return (
    <group>
      {/* 主体 */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.75} />
      </mesh>

      {/* 屋顶 (略宽) */}
      <mesh position={[0, h + 0.06, 0]} castShadow>
        <boxGeometry args={[w + 0.2, 0.12, d + 0.2]} />
        <meshStandardMaterial color={roofColor} roughness={0.6} />
      </mesh>

      {/* 正面大窗 (面朝 +Z) */}
      <mesh position={[0, h * 0.55, d / 2 + 0.02]}>
        <boxGeometry args={[w * 0.65, h * 0.35, 0.04]} />
        <meshStandardMaterial color={winColor} transparent opacity={0.7} roughness={0.15} metalness={0.2} />
      </mesh>

      {/* 门 (正面偏右) */}
      <mesh position={[w * 0.28, h * 0.25, d / 2 + 0.02]}>
        <boxGeometry args={[w * 0.22, h * 0.5, 0.04]} />
        <meshStandardMaterial color={palette.monochrome ? '#ccc' : '#4a5568'} roughness={0.6} />
      </mesh>

      {/* 侧面窗 */}
      <mesh position={[w / 2 + 0.02, h * 0.55, 0]}>
        <boxGeometry args={[0.04, h * 0.3, d * 0.5]} />
        <meshStandardMaterial color={winColor} transparent opacity={0.7} roughness={0.15} />
      </mesh>

      {/* 外轮廓描边 */}
      <lineSegments position={[0, h / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(w * 1.002, h * 1.002, d * 1.002)]} />
        <lineBasicMaterial color={palette.edge} />
      </lineSegments>
    </group>
  );
}
