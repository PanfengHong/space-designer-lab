import type { Furniture } from '../../../types';
import * as THREE from 'three';
import { useStylePalette } from '../../../constants/styles';

interface Props {
  data: Furniture;
}

/**
 * 洗手池 — 柜体 + 台面 + 陶瓷盆 + 水龙头
 * size: [width, height, depth]
 * 默认正面朝 +X (rotation=0 时), 可通过 rotation 旋转贴墙
 *
 * embedded 模式 (厨房水槽):
 *   不渲染柜体和台面, 只渲染陶瓷盆 + 水龙头
 *   position[1] 应设为橱柜台面高度, 使盆沿与台面齐平
 */
export function Sink({ data }: Props) {
  const p = useStylePalette();
  const [w, h, d] = data.size;
  const embedded = data.embedded ?? false;
  const cabinetColor = p.wood;
  const counterColor = p.woodDark;
  const basinColor = p.sanitary;
  const faucetColor = p.metal;

  const cabinetH = h * 0.7;
  const counterT = 0.04;
  const basinW = w * 0.6;
  const basinD = d * 0.5;
  const basinH = 0.12;
  const RIM_LIP = 0.004; // 盆沿凸出橱柜台面的高度 (避免共面 z-fighting)

  // 内嵌模式: 盆沿凸出台面 RIM_LIP, 盆向下嵌入
  // 非内嵌: 台面在 cabinetH 处
  const basinY = embedded ? RIM_LIP - basinH / 2 + 0.005 : cabinetH - basinH / 2 + 0.02;
  const faucetBaseY = embedded ? RIM_LIP + 0.005 : cabinetH + counterT;

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {!embedded && (
        <>
          {/* 柜体 */}
          <mesh position={[0, cabinetH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[d, cabinetH, w]} />
            <meshStandardMaterial color={cabinetColor} roughness={0.7} />
          </mesh>
          {/* 柜体外轮廓描边 */}
          <lineSegments position={[0, cabinetH / 2, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(d, cabinetH, w)]} />
            <lineBasicMaterial color={p.woodDark} />
          </lineSegments>

          {/* 台面 (略宽于柜体) */}
          <mesh position={[0, cabinetH + counterT / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[d + 0.02, counterT, w + 0.02]} />
            <meshStandardMaterial color={counterColor} roughness={0.4} />
          </mesh>
        </>
      )}

      {/* 陶瓷盆 (凹槽, 嵌入台面)
          内嵌模式: 盆沿在 y=0 (与橱柜台面齐平), 盆体向下 */}
      <mesh position={[0, basinY, 0]}>
        <boxGeometry args={[basinD, basinH, basinW]} />
        <meshStandardMaterial color={basinColor} roughness={0.15} metalness={0.05} />
      </mesh>
      {/* 盆沿 (一圈凸起的陶瓷边) */}
      <mesh position={[0, basinY + basinH / 2 - 0.005, 0]}>
        <boxGeometry args={[basinD + 0.02, 0.012, basinW + 0.02]} />
        <meshStandardMaterial color={basinColor} roughness={0.15} metalness={0.05} />
      </mesh>

      {/* 水龙头底座 */}
      <mesh position={[d / 2 - 0.06, faucetBaseY, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 0.08, 12]} />
        <meshStandardMaterial color={faucetColor} metalness={0.85} roughness={0.2} />
      </mesh>
      {/* 水龙头主体 (L 形) */}
      <mesh position={[d / 2 - 0.06, faucetBaseY + 0.12, 0]}>
        <boxGeometry args={[0.03, 0.16, 0.03]} />
        <meshStandardMaterial color={faucetColor} metalness={0.85} roughness={0.2} />
      </mesh>
      {/* 水龙头出水口 */}
      <mesh position={[d / 2 - 0.12, faucetBaseY + 0.18, 0]}>
        <boxGeometry args={[0.12, 0.03, 0.03]} />
        <meshStandardMaterial color={faucetColor} metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}
