import * as THREE from 'three';
import type { OutdoorObject } from '../../../../types';
import type { OutdoorPalette } from '../../../../constants/outdoorStyles';

/**
 * 园区大门 — 单立柱 + 抬杆道闸
 *
 * size=[总宽, 高度, 厚度]; 横杆长度 ≈ 总宽
 */
export function Gate({ data, palette }: { data: OutdoorObject; palette: OutdoorPalette }) {
  const [w, h] = data.size;
  const pillarColor = palette.monochrome ? palette.wall : '#e8eef4';
  const accentColor = palette.monochrome ? palette.concrete : '#2b6cb0';
  const pillarW = 0.5;

  return (
    <group>
      {/* 单根立柱 */}
      <mesh position={[-w / 2 + pillarW / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[pillarW, h, pillarW]} />
        <meshStandardMaterial color={pillarColor} roughness={0.7} />
      </mesh>
      {/* 柱顶 */}
      <mesh position={[-w / 2 + pillarW / 2, h + 0.08, 0]} castShadow>
        <boxGeometry args={[pillarW + 0.12, 0.16, pillarW + 0.12]} />
        <meshStandardMaterial color={accentColor} roughness={0.6} />
      </mesh>

      {/* 抬杆 (从立柱顶部伸出, 抬起约 27°) */}
      <mesh
        position={[
          -w / 2 + pillarW + (w - pillarW) * 0.5 * Math.cos(Math.PI * 0.15),
          h * 0.85 + (w - pillarW) * 0.5 * Math.sin(Math.PI * 0.15),
          0,
        ]}
        rotation={[0, 0, Math.PI * 0.15]}
        castShadow
      >
        <boxGeometry args={[w - pillarW, 0.05, 0.05]} />
        <meshStandardMaterial color={palette.monochrome ? '#ffd700' : '#f5a623'} roughness={0.5} />
      </mesh>

      {/* 红白条纹 */}
      {Array.from({ length: 8 }, (_, i) => {
        const segLen = (w - pillarW) / 8;
        const cx = -w / 2 + pillarW + segLen * (i + 0.5);
        return (
          <mesh
            key={`stripe-${i}`}
            position={[
              cx,
              h * 0.85 + (cx - (-w / 2 + pillarW)) * Math.sin(Math.PI * 0.15),
              0,
            ]}
            rotation={[0, 0, Math.PI * 0.15]}
          >
            <boxGeometry args={[segLen * 0.9, 0.06, 0.06]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#e53935' : '#ffffff'} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}
