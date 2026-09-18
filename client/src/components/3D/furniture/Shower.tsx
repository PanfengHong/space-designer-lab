import type { Furniture } from '../../../types';
import { useStylePalette } from '../../../constants/styles';
import * as THREE from 'three';

interface Props {
  data: Furniture;
}

/**
 * 淋浴间 — 支持四分之一圆形 和 长方形两种形状
 *
 * shape='quarter' (默认): 四分之一圆形玻璃隔断
 *   size: [radius, height, unused]
 *   圆心在墙角, 圆弧朝室内
 *
 * shape='rect': 长方形淋浴间, 长边一面为玻璃
 *   size: [width(长边), height, depth(短边)]
 *   玻璃面板在 +Z 侧 (长边), 短边 +X 侧也有玻璃 (形成 L 型开口)
 *   默认贴北墙(-Z)和西墙(-X), 开口朝东南
 */
export function Shower({ data }: Props) {
  const p = useStylePalette();
  const height = data.size[1];
  const glassColor = p.glass;
  const frameColor = p.metal;
  const edgeColor = p.accent;
  const shape = data.shape ?? 'quarter';

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {shape === 'quarter' ? (
        <QuarterShower radius={data.size[0]} height={height} glassColor={glassColor} frameColor={frameColor} edgeColor={edgeColor} />
      ) : (
        <RectShower width={data.size[0]} height={height} depth={data.size[2]} glassColor={glassColor} frameColor={frameColor} edgeColor={edgeColor} />
      )}
    </group>
  );
}

/** 四分之一圆形淋浴间 */
function QuarterShower({ radius, height, glassColor, frameColor, edgeColor }: {
  radius: number; height: number; glassColor: string; frameColor: string; edgeColor: string;
}) {
  const p = useStylePalette();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.absarc(0, 0, radius, 0, Math.PI / 2, false);
  shape.lineTo(0, 0);

  // 负深度: 沿 -Z 挤出, 经 [PI/2,0,0] 旋转后映射为 +Y (向上), 玻璃从地面向上延伸
  const extrudeSettings = { depth: -height, bevelEnabled: false, steps: 1 };

  return (
    <>
      {/* 玻璃隔断 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial color={glassColor} transparent opacity={0.35} roughness={0.1} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      {/* 圆弧边框 */}
      <lineSegments rotation={[Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.ExtrudeGeometry(shape, extrudeSettings)]} />
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>
      {/* 顶部金属导轨 */}
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.03, radius, 24, 1, 0, Math.PI / 2]} />
        <meshStandardMaterial color={frameColor} metalness={0.8} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* 地漏 — 沿对角线向内偏移, 避免卡在墙角被墙体遮挡 */}
      <mesh position={[radius * 0.4, 0.01, radius * 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color={p.metalDark} roughness={0.6} />
      </mesh>
    </>
  );
}

/** 长方形淋浴间 — 长边(+Z)为玻璃, 短边(+X)也有玻璃, 贴北墙(-Z)和西墙(-X) */
function RectShower({ width, height, depth, glassColor, frameColor, edgeColor }: {
  width: number; height: number; depth: number; glassColor: string; frameColor: string; edgeColor: string;
}) {
  const p = useStylePalette();
  const glassThick = 0.03;
  const frameThick = 0.04;

  return (
    <>
      {/* 长边玻璃面板 (沿 X 方向, 位于 +Z 侧) */}
      <mesh position={[width / 2, height / 2, depth]} castShadow receiveShadow>
        <boxGeometry args={[width, height, glassThick]} />
        <meshStandardMaterial color={glassColor} transparent opacity={0.35} roughness={0.1} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      {/* 长边玻璃描边 */}
      <lineSegments position={[width / 2, height / 2, depth]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, glassThick)]} />
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>

      {/* 短边玻璃面板 (沿 Z 方向, 位于 +X 侧) */}
      <mesh position={[width, height / 2, depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[glassThick, height, depth]} />
        <meshStandardMaterial color={glassColor} transparent opacity={0.35} roughness={0.1} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      {/* 短边玻璃描边 */}
      <lineSegments position={[width, height / 2, depth / 2]}>
        <edgesGeometry args={[new THREE.BoxGeometry(glassThick, height, depth)]} />
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>

      {/* 顶部金属导轨 — 长边 */}
      <mesh position={[width / 2, height, depth]}>
        <boxGeometry args={[width + frameThick, frameThick, frameThick]} />
        <meshStandardMaterial color={frameColor} metalness={0.8} roughness={0.3} />
      </mesh>
      {/* 顶部金属导轨 — 短边 */}
      <mesh position={[width, height, depth / 2]}>
        <boxGeometry args={[frameThick, frameThick, depth + frameThick]} />
        <meshStandardMaterial color={frameColor} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 玻璃与墙连接处的竖向金属框 — 长边西端 */}
      <mesh position={[0, height / 2, depth]}>
        <boxGeometry args={[frameThick, height, frameThick]} />
        <meshStandardMaterial color={frameColor} metalness={0.8} roughness={0.3} />
      </mesh>
      {/* 玻璃与墙连接处的竖向金属框 — 短边北端 */}
      <mesh position={[width, height / 2, 0]}>
        <boxGeometry args={[frameThick, height, frameThick]} />
        <meshStandardMaterial color={frameColor} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 地漏 (靠近角落) */}
      <mesh position={[width * 0.3, 0.01, depth * 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color={p.metalDark} roughness={0.6} />
      </mesh>
    </>
  );
}
