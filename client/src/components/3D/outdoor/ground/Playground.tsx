import * as THREE from 'three';
import { ContentProps } from '../GroundItems';

/**
 * 操场 — 红色椭圆塑胶跑道 + 中间绿色足球场 + 两端半圆弯道
 *
 * 布局 (俯视, X 为长轴, Z 为短轴):
 *   - 中间矩形足球场 (绿色, 两端带足球门)
 *   - 矩形两侧直跑道 (红色)
 *   - 两端半圆弯道 (整个半圆区域与直道同色, 含分道线)
 *
 * size=[总长, 厚度, 总宽]; 跑道宽度由 widthRatio 控制
 */
export function Playground({ data, palette }: ContentProps) {
  const [L, h, W] = data.size;
  const trackColor = palette.monochrome ? palette.grass : data.color || '#d93636'; // 红色跑道
  const fieldColor = palette.monochrome ? palette.wall : '#5fb85f'; // 绿色球场
  const lineColor = '#ffffff';

  // 跑道宽度 = 总宽 * 0.18
  const trackW = W * 0.18;
  // 球场区域
  const fieldL = L - trackW * 2;
  const fieldW = W - trackW * 2;
  // 半圆弯道半径 = 球场宽度的一半
  const arcR = fieldW / 2;

  // 足球门尺寸 (随球场宽度缩放)
  const goalW = fieldW * 0.3;
  const goalH = fieldW * 0.12;
  const goalD = Math.max(0.3, fieldW * 0.05);
  const postT = Math.max(0.04, fieldW * 0.008);

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
      <mesh position={[0, h + 0.035, 0]}>
        <boxGeometry args={[0.06, 0.01, fieldW]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      <mesh position={[0, h + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[arcR * 0.25, arcR * 0.28, 32]} />
        <meshBasicMaterial color={lineColor} side={THREE.DoubleSide} />
      </mesh>

      {/* ===== 足球球门 (草坪两端, 开口朝向中场) ===== */}
      {[-1, 1].map((side) => (
        <group key={`goal-${side}`} position={[side * (fieldL / 2 - 0.3), h + 0.03, 0]}>
          {/* 门柱 (沿 Z 轴分布) */}
          <mesh position={[0, goalH / 2, goalW / 2]}>
            <boxGeometry args={[postT, goalH, postT]} />
            <meshStandardMaterial color={lineColor} roughness={0.5} />
          </mesh>
          <mesh position={[0, goalH / 2, -goalW / 2]}>
            <boxGeometry args={[postT, goalH, postT]} />
            <meshStandardMaterial color={lineColor} roughness={0.5} />
          </mesh>
          {/* 横梁 */}
          <mesh position={[0, goalH, 0]}>
            <boxGeometry args={[postT, postT, goalW + postT]} />
            <meshStandardMaterial color={lineColor} roughness={0.5} />
          </mesh>
          {/* 球网: 背网 + 顶网 (在球门背后, 背离中场) */}
          <mesh position={[side * goalD, goalH / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[goalW, goalH]} />
            <meshBasicMaterial color={lineColor} transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh position={[side * goalD / 2, goalH, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[goalD, goalW]} />
            <meshBasicMaterial color={lineColor} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* ===== 直跑道 (矩形两侧, 红色) ===== */}
      <mesh receiveShadow position={[0, h + 0.01, W / 2 - trackW / 2]}>
        <boxGeometry args={[fieldL, 0.05, trackW]} />
        <meshStandardMaterial color={trackColor} roughness={0.8} />
      </mesh>
      <mesh receiveShadow position={[0, h + 0.01, -(W / 2 - trackW / 2)]}>
        <boxGeometry args={[fieldL, 0.05, trackW]} />
        <meshStandardMaterial color={trackColor} roughness={0.8} />
      </mesh>

      {/* ===== 两端半圆弯道 (整个半圆区域与直道同色) ===== */}
      {/* 东端弯道 (+X), 半圆开口朝 -X (朝向球场) */}
      <mesh
        receiveShadow
        position={[fieldL / 2, h + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[arcR + trackW, 64, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={trackColor} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* 西端弯道 (-X), 半圆开口朝 +X */}
      <mesh
        receiveShadow
        position={[-fieldL / 2, h + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[arcR + trackW, 64, Math.PI / 2, Math.PI]} />
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
            <meshBasicMaterial color={lineColor} transparent opacity={0.85} />
          </mesh>
        ))
      )}

      {/* ===== 跑道分道线 (白色, 弯道部分, 与直道分道位置连续对应) ===== */}
      {[-1, 1].map((side) =>
        [1, 2, 3].map((lane) => {
          // 与直道分道线相同的位置: 距内缘 trackW*(3.5-lane)/4
          const r = arcR + trackW * (3.5 - lane) / 4;
          return (
            <mesh
              key={`arc-lane-${side}-${lane}`}
              position={[side * fieldL / 2, h + 0.02, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[r - 0.02, r + 0.02, 64, 1, side === 1 ? -Math.PI / 2 : Math.PI / 2, Math.PI]} />
              <meshBasicMaterial color={lineColor} transparent opacity={0.85} side={THREE.DoubleSide} />
            </mesh>
          );
        })
      )}

      {/* 外轮廓描边 */}
      <lineSegments position={[0, h / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry((L + 0.4) * 1.002, h * 1.002, (W + 0.4) * 1.002)]} />
        <lineBasicMaterial color={palette.edge} />
      </lineSegments>
    </group>
  );
}
