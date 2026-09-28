import { useMemo } from 'react';
import * as THREE from 'three';
import { ContentProps } from '../GroundItems';

/**
 * 园区围墙 — 白色混凝土立柱 + 栅栏杆 + 底部勒脚
 * 参考封闭园区的实体围墙效果: 等距立柱, 栏板上沿有压顶, 底部有基座
 * size=[长度, 高度, 厚度]; 沿 X 方向延伸
 */
export function Fence({ data, palette }: ContentProps) {
  const [L, H, T] = data.size;
  const pillarSize = 0.28;
  const spacing = 2.0; // 立柱间距

  const pillars = useMemo(() => {
    const arr: number[] = [];
    for (let x = -L / 2 + pillarSize / 2; x <= L / 2 - pillarSize / 2 + 0.001; x += spacing) {
      arr.push(Math.min(x, L / 2 - pillarSize / 2));
    }
    // 确保末端有立柱
    if (arr[arr.length - 1] < L / 2 - pillarSize / 2 - 0.01) {
      arr.push(L / 2 - pillarSize / 2);
    }
    return arr;
  }, [L]);

  const railColor = palette.monochrome ? palette.concrete : '#e8edf2';
  const pillarColor = palette.monochrome ? palette.wall : '#f0f4f8';

  return (
    <group>
      {/* 底部勒脚 (基座) */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[L, 0.24, T + 0.12]} />
        <meshStandardMaterial color={palette.concrete} roughness={0.85} />
      </mesh>

      {/* 栏板 (连续实体墙, 略低于立柱) */}
      <mesh position={[0, 0.24 + (H - 0.24) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[L, H - 0.24, T * 0.5]} />
        <meshStandardMaterial color={railColor} roughness={0.8} />
      </mesh>

      {/* 顶部压顶 */}
      <mesh position={[0, H, 0]} castShadow>
        <boxGeometry args={[L + 0.04, 0.1, T + 0.06]} />
        <meshStandardMaterial color={palette.concrete} roughness={0.8} />
      </mesh>

      {/* 立柱 */}
      {pillars.map((x, i) => (
        <group key={`pillar-${i}`}>
          <mesh position={[x, H / 2 + 0.05, 0]} castShadow>
            <boxGeometry args={[pillarSize, H + 0.1, pillarSize]} />
            <meshStandardMaterial color={pillarColor} roughness={0.75} />
          </mesh>
          {/* 立柱柱头 */}
          <mesh position={[x, H + 0.12, 0]} castShadow>
            <boxGeometry args={[pillarSize + 0.06, 0.08, pillarSize + 0.06]} />
            <meshStandardMaterial color={palette.concrete} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* 栏板横向装饰线 (两条) */}
      {[0.45, 0.7].map((ratio, i) => (
        <mesh key={`hline-${i}`} position={[0, 0.24 + (H - 0.24) * ratio, T * 0.26 + 0.01]}>
          <boxGeometry args={[L, 0.04, 0.03]} />
          <meshStandardMaterial color={palette.concrete} roughness={0.8} />
        </mesh>
      ))}

      {/* 外轮廓描边 */}
      <lineSegments position={[0, H / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(L * 1.002, H * 1.002, (T + 0.12) * 1.002)]} />
        <lineBasicMaterial color={palette.edge} />
      </lineSegments>
    </group>
  );
}
