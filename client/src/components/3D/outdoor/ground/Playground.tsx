import * as THREE from 'three';
import { ContentProps } from '../GroundItems';

/**
 * 操场 — 红色椭圆塑胶跑道 + 中间绿色足球场 + 两端半圆弯道
 *
 * 布局 (俯视, X 为长轴, Z 为短轴):
 *   - 中间矩形足球场 (绿色)
 *   - 矩形两侧直跑道 (红色)
 *   - 两端半圆弯道 (红色, 与跑道同材质, 用半圆环实现)
 *
 * size=[总长, 厚度, 总宽]; 跑道宽度由 widthRatio 控制
 */
export function Playground({ data, palette }: ContentProps) {
  const [L, h, W] = data.size;
  const trackColor = palette.monochrome ? palette.grass : data.color; // 红色跑道
  const fieldColor = palette.monochrome ? palette.wall : '#5fb85f'; // 绿色球场

  // 跑道宽度 = 总宽 * 0.18
  const trackW = W * 0.18;
  // 球场区域
  const fieldL = L - trackW * 2;
  const fieldW = W - trackW * 2;
  // 半圆弯道半径 = 球场宽度的一半
  const arcR = fieldW / 2;

  return (
    <group>
      {/* 整体基座 (略大, 作为边缘收边) */}
      <mesh receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[L + 0.4, h, W + 0.4]} />
        <meshStandardMaterial color={palette.concrete} roughness={0.9} />
      </mesh>

      {/* ===== 中间矩形足球场 (绿色) ===== */}
      <mesh receiveShadow position={[0, h + 0.01, 0]}>
        <boxGeometry args={[fieldL, 0.04, fieldW]} />
        <meshStandardMaterial color={fieldColor} roughness={0.85} />
      </mesh>

      {/* 足球场中线 + 中圈 */}
      <mesh position={[0, h + 0.025, 0]}>
        <boxGeometry args={[0.06, 0.02, fieldW]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, h + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[arcR * 0.25, arcR * 0.28, 32]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>

      {/* ===== 直跑道 (矩形两侧, 红色) ===== */}
      <mesh receiveShadow position={[0, h + 0.01, W / 2 - trackW / 2]}>
        <boxGeometry args={[fieldL, 0.05, trackW]} />
        <meshStandardMaterial color={trackColor} roughness={0.8} />
      </mesh>
      <mesh receiveShadow position={[0, h + 0.01, -(W / 2 - trackW / 2)]}>
        <boxGeometry args={[fieldL, 0.05, trackW]} />
        <meshStandardMaterial color={trackColor} roughness={0.8} />
      </mesh>

      {/* ===== 两端半圆弯道 (红色, 与跑道同材质, 半圆环) ===== */}
      {/* 东端弯道 (+X), 半圆环开口朝 -X (朝向球场) */}
      <mesh
        receiveShadow
        position={[fieldL / 2, h + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[arcR, arcR + trackW, 48, 1, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={trackColor} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* 西端弯道 (-X), 半圆环开口朝 +X */}
      <mesh
        receiveShadow
        position={[-fieldL / 2, h + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[arcR, arcR + trackW, 48, 1, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={trackColor} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* ===== 跑道分道线 (白色, 直道部分) ===== */}
      {[-1, 1].map((side) =>
        [1, 2, 3].map((lane) => (
          <mesh
            key={`lane-${side}-${lane}`}
            position={[0, h + 0.04, side * (W / 2 - trackW * (lane + 0.5) / 4)]}
          >
            <boxGeometry args={[fieldL, 0.01, 0.03]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
          </mesh>
        ))
      )}

      {/* 外轮廓描边 */}
      <lineSegments position={[0, h / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry((L + 0.4) * 1.002, h * 1.002, (W + 0.4) * 1.002)]} />
        <lineBasicMaterial color={palette.edge} />
      </lineSegments>
    </group>
  );
}
