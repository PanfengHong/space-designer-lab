import type { Furniture } from '../../../types';
import * as THREE from 'three';
import { useStylePalette } from '../../../constants/styles';

interface Props {
  data: Furniture;
}

/**
 * 洗衣机 — 滚筒式: 主体 + 圆形玻璃门 + 控制面板 + 旋钮 + 底脚
 * size: [width(z), height(y), depth(x)]
 * rotation=0 时正面朝 +X
 */
export function WashingMachine({ data }: Props) {
  const p = useStylePalette();
  const [w, h, d] = data.size;
  const bodyColor = p.appliance;
  const panelColor = p.appliancePanel;
  const doorRingColor = p.metal;
  const doorGlassColor = p.glass;
  const knobColor = p.metalDark;
  const footColor = p.metalDark;

  // 控制面板高度 (顶部 25%)
  const panelH = h * 0.25;
  // 门区高度 (底部 70%)
  const doorAreaH = h * 0.65;
  // 底部间隙
  const bottomGap = h * 0.05;

  // 圆形门参数
  const doorRadius = Math.min(w, doorAreaH) * 0.38;
  const doorThick = 0.03;
  // 门中心位置 (在正面, 中下部)
  const doorCenterY = bottomGap + doorAreaH * 0.5;
  const doorX = d / 2 + doorThick / 2;

  // 控制面板上的旋钮
  const knobRadius = 0.035;

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
          metalness={0.5}
        />
      </mesh>
      {/* 主体边缘描边 */}
      <lineSegments position={[0, h / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(d, h, w)]} />
        <lineBasicMaterial color={p.metal} />
      </lineSegments>

      {/* 控制面板 (正面顶部凹陷区域) */}
      <mesh position={[d / 2 + 0.002, h - panelH / 2, 0]}>
        <boxGeometry args={[0.005, panelH * 0.85, w * 0.9]} />
        <meshStandardMaterial color={panelColor} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* 旋钮 (左) */}
      <mesh position={[d / 2 + 0.02, h - panelH * 0.4, -w * 0.25]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[knobRadius, knobRadius, 0.03, 16]} />
        <meshStandardMaterial color={knobColor} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* 旋钮 (右) */}
      <mesh position={[d / 2 + 0.02, h - panelH * 0.4, w * 0.25]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[knobRadius, knobRadius, 0.03, 16]} />
        <meshStandardMaterial color={knobColor} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* 显示屏 (小矩形) */}
      <mesh position={[d / 2 + 0.015, h - panelH * 0.65, 0]}>
        <boxGeometry args={[0.004, 0.04, w * 0.3]} />
        <meshStandardMaterial
          color={p.accent}
          roughness={0.1}
          emissive={p.accent}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* 门区凹陷面板 */}
      <mesh position={[d / 2 + 0.002, doorCenterY, 0]}>
        <boxGeometry args={[0.004, doorAreaH * 0.9, w * 0.9]} />
        <meshStandardMaterial color={panelColor} roughness={0.5} metalness={0.2} />
      </mesh>

      {/* 圆形门外框 */}
      <mesh position={[doorX, doorCenterY, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[doorRadius + 0.015, doorRadius + 0.015, doorThick, 32]} />
        <meshStandardMaterial color={doorRingColor} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* 圆形玻璃门 */}
      <mesh position={[doorX - 0.005, doorCenterY, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[doorRadius, doorRadius, doorThick * 0.6, 32]} />
        <meshStandardMaterial
          color={doorGlassColor}
          metalness={0.4}
          roughness={0.05}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* 门内滚筒 (深色凹陷) */}
      <mesh position={[doorX - 0.02, doorCenterY, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[doorRadius * 0.85, doorRadius * 0.85, 0.04, 32]} />
        <meshStandardMaterial color={p.metalDark} metalness={0.3} roughness={0.8} />
      </mesh>

      {/* 门把手 (右侧小凸起) */}
      <mesh position={[doorX, doorCenterY, doorRadius + 0.03]} castShadow>
        <boxGeometry args={[0.04, 0.06, 0.04]} />
        <meshStandardMaterial color={doorRingColor} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 底部支脚 — 四角 */}
      <mesh position={[d * 0.3, bottomGap / 2, w * 0.3]}>
        <cylinderGeometry args={[0.015, 0.02, bottomGap, 8]} />
        <meshStandardMaterial color={footColor} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[d * 0.3, bottomGap / 2, -w * 0.3]}>
        <cylinderGeometry args={[0.015, 0.02, bottomGap, 8]} />
        <meshStandardMaterial color={footColor} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[-d * 0.3, bottomGap / 2, w * 0.3]}>
        <cylinderGeometry args={[0.015, 0.02, bottomGap, 8]} />
        <meshStandardMaterial color={footColor} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[-d * 0.3, bottomGap / 2, -w * 0.3]}>
        <cylinderGeometry args={[0.015, 0.02, bottomGap, 8]} />
        <meshStandardMaterial color={footColor} metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}
