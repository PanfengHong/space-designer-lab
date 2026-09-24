import type { Furniture } from '../../../../types';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { extend } from '@react-three/fiber';
import { useStylePalette } from '../../../../constants/styles';

extend({ RoundedBoxGeometry });

interface Props {
  data: Furniture;
}

/**
 * 马桶 — 底座 + 马桶盆 + 座圈 + 水箱 + 水箱盖
 * size: [width, height, depth]
 * 默认正面朝 +Z, 水箱在 -Z 侧
 */
export function Toilet({ data }: Props) {
  const p = useStylePalette();
  const [w, h, d] = data.size;
  const white = p.sanitary;
  const whiteDark = p.sanitaryDark;
  const metal = p.metal;

  // 水箱尺寸
  const tankW = w * 0.85;
  const tankD = d * 0.28;
  const tankH = h * 0.5;
  const tankZ = -d / 2 + tankD / 2; // 水箱靠后端

  // 马桶盆尺寸
  const bowlW = w * 0.7;
  const bowlD = d * 0.55;
  const bowlH = h * 0.35;
  const bowlZ = d * 0.1; // 盆体偏前

  // 底座 (梯形, 下宽上窄)
  const baseW = w * 0.9;
  const baseD = d * 0.65;

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {/* ===== 底座 (圆角梯形: 底部宽, 顶部窄) ===== */}
      <mesh position={[0, bowlH * 0.5, bowlZ]} castShadow receiveShadow>
        <roundedBoxGeometry args={[baseW, bowlH, baseD, 4, 0.05]} />
        <meshStandardMaterial color={white} roughness={0.4} />
      </mesh>

      {/* ===== 马桶盆 (椭圆球体) ===== */}
      <mesh
        position={[0, bowlH + bowlH * 0.4, bowlZ]}
        scale={[bowlW / 2, bowlH * 0.5, bowlD / 2]}
        castShadow
      >
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color={white} roughness={0.35} />
      </mesh>
      {/* 盆体内凹 (深色开口) */}
      <mesh
        position={[0, bowlH + bowlH * 0.45, bowlZ]}
        scale={[bowlW / 2 * 0.85, bowlH * 0.35, bowlD / 2 * 0.85]}
      >
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color={p.metal} roughness={0.2} side={THREE.BackSide} />
      </mesh>

      {/* ===== 座圈 (扁平椭圆环) ===== */}
      <mesh position={[0, bowlH + bowlH * 0.75, bowlZ]} scale={[bowlW / 2, 0.015, bowlD / 2]} castShadow>
        <torusGeometry args={[1, 0.12, 12, 48]} />
        <meshStandardMaterial color={whiteDark} roughness={0.4} />
      </mesh>

      {/* ===== 马桶盖 (扁平椭圆形, 盖在座圈上, 略大于盆口) ===== */}
      <mesh
        position={[0, bowlH + bowlH * 0.95, bowlZ]}
        scale={[bowlW / 2 + 0.06, 0.07, bowlD / 2 + 0.06]}
        castShadow
      >
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial color={whiteDark} roughness={0.35} />
      </mesh>

      {/* ===== 水箱 ===== */}
      <mesh position={[0, tankH / 2, tankZ]} castShadow receiveShadow>
        <boxGeometry args={[tankW, tankH, tankD]} />
        <meshStandardMaterial color={white} roughness={0.4} />
      </mesh>
      {/* 水箱盖 */}
      <mesh position={[0, tankH + 0.01, tankZ]} castShadow>
        <boxGeometry args={[tankW + 0.02, 0.03, tankD + 0.02]} />
        <meshStandardMaterial color={whiteDark} roughness={0.4} />
      </mesh>
      {/* 水箱描边 */}
      <lineSegments position={[0, tankH / 2, tankZ]}>
        <edgesGeometry args={[new THREE.BoxGeometry(tankW, tankH, tankD)]} />
        <lineBasicMaterial color={p.metal} />
      </lineSegments>

      {/* ===== 冲水按钮 (水箱顶部) ===== */}
      <mesh position={[tankW * 0.2, tankH + 0.04, tankZ]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.02, 16]} />
        <meshStandardMaterial color={metal} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}
