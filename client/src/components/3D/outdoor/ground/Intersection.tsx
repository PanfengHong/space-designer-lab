import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ContentProps } from '../GroundItems';

extend({ RoundedBoxGeometry });

/**
 * 路口 — 中央方块 + 4 端面延伸条 + 内角扇形圆弧, 平滑衔接垂直道路
 * size=[w, h, d]: w=X 向宽度, d=Z 向宽度 (一般 w=d 呈方形)
 * branches: 4=十字 (4 个内角扇形), 3=T 字 (2 个扇形 + 1 盲端), 2=L 弯 (1 个扇形)
 * arcRadius: 转向圆弧半径 (默认 1.5)
 */
export function Intersection({ data, palette }: ContentProps) {
  const [w, h, d] = data.size;
  const half = Math.min(w, d) / 2;
  const branches = data.branches ?? 4;
  const arcR = data.arcRadius ?? 1.5;

  // 十字标线长度
  const lineLen = Math.min(w, d) * 0.7;

  // 4 个内角配置: 每个角带 thetaStart (扇形起始角) 和 minBranches (该角需要至少多少分支才画圆弧)
  // 经 rotation=[-π/2,0,0] 后 ringGeometry 局部 +X→世界+X, +Y→世界+Z
  // 每个扇形从角点朝路口中心方向延伸:
  //   右上(+half,+half) → 朝 -X 和 -Z → thetaStart=π
  //   左上(-half,+half) → 朝 +X 和 -Z → thetaStart=3π/2
  //   左下(-half,-half) → 朝 +X 和 +Z → thetaStart=0
  //   右下(+half,-half) → 朝 -X 和 +Z → thetaStart=π/2
  // 每个角相邻两个分支都存在才画圆弧: 右上邻+X/+Z(≥2), 左上邻-X/+Z(≥3), 左下邻-X/-Z(≥4), 右下邻+X/-Z(≥4)
  const corners = [
    { cx: half, cz: half,    thetaStart: Math.PI,         minBranches: 2 }, // 右上角
    { cx: -half, cz: half,   thetaStart: Math.PI * 1.5,   minBranches: 3 }, // 左上角
    { cx: -half, cz: -half,  thetaStart: 0,              minBranches: 4 }, // 左下角
    { cx: half, cz: -half,   thetaStart: Math.PI / 2,    minBranches: 4 }, // 右下角
  ];
  const activeCorners = corners.filter((c) => branches >= c.minBranches);

  // 4 个端面延伸条 (让路口与外部道路重叠一段避免间隙)
  const stub = Math.max(w, d) * 0.5; // 延伸长度
  const stubs = [
    { dir: 'x+' as const, len: stub, axis: 'x' as const },
    { dir: 'x-' as const, len: stub, axis: 'x' as const },
    ...(branches >= 3 ? [{ dir: 'z+' as const, len: stub, axis: 'z' as const }] : []),
    ...(branches >= 4 ? [{ dir: 'z-' as const, len: stub, axis: 'z' as const }] : []),
  ];

  return (
    <group>
      {/* 中央路口方块 */}
      <mesh receiveShadow castShadow position={[0, 0, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={palette.road} roughness={0.75} />
      </mesh>

      {/* 端面延伸条 (无缝衔接外部道路) */}
      {stubs.map((s, i) => {
        const pos: [number, number, number] =
          s.dir === 'x+' ? [w / 2 + s.len / 2, 0, 0] :
          s.dir === 'x-' ? [-w / 2 - s.len / 2, 0, 0] :
          s.dir === 'z+' ? [0, 0, d / 2 + s.len / 2] :
          [0, 0, -d / 2 - s.len / 2];
        return (
          <mesh key={`stub-${i}`} position={pos} receiveShadow castShadow>
            <boxGeometry args={s.axis === 'x' ? [s.len, h, d] : [w, h, s.len]} />
            <meshStandardMaterial color={palette.road} roughness={0.75} />
          </mesh>
        );
      })}

      {/* 内角扇形圆弧路面 — 转向曲线, 每个扇形从角点朝路口中心方向延伸 */}
      {activeCorners.map((c, i) => (
        <mesh
          key={`arc-${i}`}
          position={[c.cx, h / 2 + 0.002, c.cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <ringGeometry args={[0.001, arcR, 24, 1, c.thetaStart, Math.PI / 2]} />
          <meshStandardMaterial color={palette.road} roughness={0.75} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* 中央十字标线 — 沿 X 方向 */}
      <mesh position={[0, h / 2 + 0.009, 0]}>
        <boxGeometry args={[lineLen, 0.014, 0.08]} />
        <meshStandardMaterial color={palette.roadLine} roughness={0.6} />
      </mesh>
      {/* 沿 Z 方向 (仅 branches=4 才有 Z 向道路) */}
      {branches === 4 && (
        <mesh position={[0, h / 2 + 0.009, 0]}>
          <boxGeometry args={[0.08, 0.014, lineLen]} />
          <meshStandardMaterial color={palette.roadLine} roughness={0.6} />
        </mesh>
      )}

      {/* 端面让车虚线 (右行规则, 主路在中线右侧) */}
      {[
        { x: half + stub - 0.6, z: 0, len: 0.5, axis: 'z' as const },
        { x: -half - stub + 0.6, z: 0, len: 0.5, axis: 'z' as const },
        ...(branches >= 3 ? [{ x: 0, z: half + stub - 0.6, len: 0.5, axis: 'x' as const }] : []),
        ...(branches >= 4 ? [{ x: 0, z: -half - stub + 0.6, len: 0.5, axis: 'x' as const }] : []),
      ].map((stop, i) => (
        <mesh key={`stop-${i}`} position={[stop.x, h / 2 + 0.009, stop.z]}>
          {stop.axis === 'z'
            ? <boxGeometry args={[0.06, 0.014, stop.len]} />
            : <boxGeometry args={[stop.len, 0.014, 0.06]} />}
          <meshStandardMaterial color={palette.roadLine} roughness={0.6} />
        </mesh>
      ))}

      {/* 中央指示圆点 */}
      <mesh position={[0, h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.22, 24]} />
        <meshBasicMaterial color={palette.roadLine} side={THREE.DoubleSide} />
      </mesh>

      {/* 外轮廓描边 (中央方块) */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w * 1.002, h * 1.002, d * 1.002)]} />
        <lineBasicMaterial color={palette.edge} />
      </lineSegments>
    </group>
  );
}