import type { Furniture } from '../../../../types';
import * as THREE from 'three';
import { useStylePalette } from '../../../../constants/styles';

interface Props {
  data: Furniture;
}

/**
 * 灶台 (嵌入式燃气灶/电磁炉)
 * 内嵌在厨房橱柜台面中, 灶台玻璃面略微凸出橱柜台面 (避免 z-fighting)
 *
 * 约定:
 *   size = [width, height, depth]  (width 沿 z, depth 沿 x, 与橱柜一致)
 *   position[1] = 橱柜台面高度 - height  (灶台顶面 y=position[1]+height 与台面齐平,
 *                                          玻璃唇边再凸出 GLASS_LIP)
 *   rotation = 橱柜朝向
 *
 * 内部布局 (相对 group 原点, 原点在灶台底部中心):
 *   - 灶台主体 (嵌入台面下): 0 ~ height*0.7
 *   - 玻璃灶面 (顶部, 凸出台面 GLASS_LIP): height*0.7 ~ height + GLASS_LIP
 *   - 炉头 (略高于灶面):       height + GLASS_LIP ~ ...
 *   - 控制旋钮 (前端边缘)
 */
export function Stove({ data }: Props) {
  const p = useStylePalette();
  const [w, h, d] = data.size;

  const bodyTopY = h * 0.7;       // 灶面玻璃底部
  const GLASS_LIP = 0.004;        // 玻璃唇边凸出橱柜台面的高度 (避免共面 z-fighting)
  const glassTopY = h + GLASS_LIP;
  const glassT = glassTopY - bodyTopY;
  const bodyColor = p.metalDark;
  const glassColor = '#1a1a1a';
  const burnerColor = p.metalDark;
  const knobColor = p.metal;
  const accentColor = p.accent;

  // 2 个炉头位置 (沿宽度方向排列)
  const burnerR = Math.min(w, d) * 0.2;
  const burnerOffsets: [number, number][] = [
    [-w * 0.28, 0],
    [w * 0.28, 0],
  ];

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {/* 灶台主体 (嵌入台面下的金属盒, 位于橱柜台面以下, 不会与台面共面) */}
      <mesh position={[0, bodyTopY / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[d, bodyTopY, w]} />
        <meshStandardMaterial color={bodyColor} roughness={0.6} metalness={0.7} />
      </mesh>

      {/* 玻璃灶面 (顶部, 凸出橱柜台面 GLASS_LIP, 避免 z-fighting) */}
      <mesh position={[0, bodyTopY + glassT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[d + 0.01, glassT, w + 0.01]} />
        <meshStandardMaterial
          color={glassColor}
          roughness={0.15}
          metalness={0.3}
          transparent
          opacity={0.92}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* 灶面外轮廓描边 */}
      <lineSegments position={[0, bodyTopY + glassT / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(d + 0.01, glassT, w + 0.01)]} />
        <lineBasicMaterial color={accentColor} />
      </lineSegments>

      {/* 2 个炉头 */}
      {burnerOffsets.map(([bz, bx], i) => (
        <group key={i} position={[bx, glassTopY, bz]}>
          {/* 炉头外圈 (金属支架, 圆环平铺在灶面上) */}
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[burnerR, burnerR * 0.18, 8, 24]} />
            <meshStandardMaterial color={burnerColor} metalness={0.85} roughness={0.35} />
          </mesh>
          {/* 炉头中心 (火盖, 圆柱体沿 Y 轴, 无需旋转) */}
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[burnerR * 0.45, burnerR * 0.5, 0.015, 16]} />
            <meshStandardMaterial color={burnerColor} metalness={0.8} roughness={0.4} />
          </mesh>
          {/* 炉头内圈 (圆环平铺) */}
          <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[burnerR * 0.3, burnerR * 0.06, 6, 20]} />
            <meshStandardMaterial color={p.metalDark} metalness={0.7} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* 控制旋钮 (沿前端边缘, 2 个) */}
      {[-w * 0.2, w * 0.2].map((bz, i) => (
        <mesh key={i} position={[d / 2 - 0.04, glassTopY + 0.01, bz]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.02, 0.025, 16]} />
          <meshStandardMaterial color={knobColor} metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}
