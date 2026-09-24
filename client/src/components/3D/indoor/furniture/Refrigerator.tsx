import type { Furniture } from '../../../../types';
import * as THREE from 'three';
import { useStylePalette } from '../../../../constants/styles';

interface Props {
  data: Furniture;
}

/**
 * 冰箱 — 主体 + 上下双门 + 把手 + 散热栅格
 * size: [width(z), height(y), depth(x)]
 * rotation=0 时正面朝 +X
 */
export function Refrigerator({ data }: Props) {
  const p = useStylePalette();
  const [w, h, d] = data.size;
  const bodyColor = p.appliance;
  const doorColor = p.appliance;
  const handleColor = p.metalDark;
  const gapColor = p.accent;
  const ventColor = p.metalDark;

  // 上门(冷冻室) 占总高 35%, 下门(冷藏室) 占 60%, 顶部留 5%
  const topGap = h * 0.05;
  const freezerH = h * 0.32;
  const fridgeH = h * 0.58;
  const doorGap = h * 0.01; // 门缝
  const doorThick = 0.02;

  // 门在主体正前方 (+X 面), 略微凸出
  const doorFrontX = d / 2 + doorThick / 2;
  // 门略窄于主体两侧
  const doorW = w - 0.02;

  // 把手参数
  const handleW = 0.025;
  const handleH = h * 0.15;
  const handleD = 0.04;

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {/* 主体 */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[d, h, w]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.35}
          metalness={0.55}
        />
      </mesh>
      {/* 主体边缘描边 */}
      <lineSegments position={[0, h / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(d, h, w)]} />
        <lineBasicMaterial color={p.metal} />
      </lineSegments>

      {/* 顶面装饰条 (品牌标识区) */}
      <mesh position={[0, h - topGap / 2, 0]}>
        <boxGeometry args={[d * 0.95, topGap * 0.6, w * 0.95]} />
        <meshStandardMaterial color={gapColor} roughness={0.3} metalness={0.3} />
      </mesh>

      {/* 上门 — 冷冻室 */}
      <mesh position={[doorFrontX, topGap + freezerH / 2, 0]} castShadow>
        <boxGeometry args={[doorThick, freezerH - doorGap, doorW]} />
        <meshStandardMaterial
          color={doorColor}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      {/* 上门边缘 */}
      <lineSegments position={[doorFrontX, topGap + freezerH / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(doorThick, freezerH - doorGap, doorW)]} />
        <lineBasicMaterial color={p.metal} />
      </lineSegments>

      {/* 下门 — 冷藏室 */}
      <mesh position={[doorFrontX, topGap + freezerH + doorGap + fridgeH / 2, 0]} castShadow>
        <boxGeometry args={[doorThick, fridgeH - doorGap, doorW]} />
        <meshStandardMaterial
          color={doorColor}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      {/* 下门边缘 */}
      <lineSegments position={[doorFrontX, topGap + freezerH + doorGap + fridgeH / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(doorThick, fridgeH - doorGap, doorW)]} />
        <lineBasicMaterial color={p.metal} />
      </lineSegments>

      {/* 门缝分隔线 */}
      <mesh position={[doorFrontX, topGap + freezerH + doorGap / 2, 0]}>
        <boxGeometry args={[doorThick + 0.002, doorGap, doorW + 0.01]} />
        <meshStandardMaterial color={gapColor} roughness={0.5} />
      </mesh>

      {/* 上门把手 — 竖条 */}
      <mesh position={[doorFrontX + doorThick / 2 + handleD / 2, topGap + freezerH * 0.5, doorW * 0.35]} castShadow>
        <boxGeometry args={[handleD, handleH * 0.6, handleW]} />
        <meshStandardMaterial color={handleColor} metalness={0.8} roughness={0.25} />
      </mesh>

      {/* 下门把手 — 竖条 (更长) */}
      <mesh position={[doorFrontX + doorThick / 2 + handleD / 2, topGap + freezerH + doorGap + fridgeH * 0.5, doorW * 0.35]} castShadow>
        <boxGeometry args={[handleD, handleH * 1.2, handleW]} />
        <meshStandardMaterial color={handleColor} metalness={0.8} roughness={0.25} />
      </mesh>

      {/* 侧面散热栅格 (背面底部) */}
      <mesh position={[-d / 2 - 0.001, h * 0.15, 0]}>
        <boxGeometry args={[0.003, h * 0.25, w * 0.7]} />
        <meshStandardMaterial color={ventColor} roughness={0.7} metalness={0.3} />
      </mesh>

      {/* 底部支脚 — 左前 */}
      <mesh position={[d * 0.3, 0.02, w * 0.3]}>
        <cylinderGeometry args={[0.02, 0.025, 0.04, 8]} />
        <meshStandardMaterial color={handleColor} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* 底部支脚 — 右前 */}
      <mesh position={[d * 0.3, 0.02, -w * 0.3]}>
        <cylinderGeometry args={[0.02, 0.025, 0.04, 8]} />
        <meshStandardMaterial color={handleColor} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* 底部支脚 — 左后 */}
      <mesh position={[-d * 0.3, 0.02, w * 0.3]}>
        <cylinderGeometry args={[0.02, 0.025, 0.04, 8]} />
        <meshStandardMaterial color={handleColor} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* 底部支脚 — 右后 */}
      <mesh position={[-d * 0.3, 0.02, -w * 0.3]}>
        <cylinderGeometry args={[0.02, 0.025, 0.04, 8]} />
        <meshStandardMaterial color={handleColor} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}
