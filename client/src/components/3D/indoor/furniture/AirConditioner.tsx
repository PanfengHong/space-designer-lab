import type { Furniture } from '../../../../types';
import * as THREE from 'three';
import { useDeviceState } from '../../../../hooks/useDeviceState';
import { useStylePalette } from '../../../../constants/styles';

interface Props {
  data: Furniture;
}

/**
 * 壁挂空调 — 机身 + 导风板 + 运行指示灯
 * size: [width(z), height(y), depth(x)]，rotation=0 时正面朝 +X
 *
 * 设备状态:
 *   on       开机 → 导风板打开、指示灯亮、出风口有冷光
 *   acMode   cool/heat 决定出风口灯光颜色 (冷蓝 / 暖橙)
 */
export function AirConditioner({ data }: Props) {
  const p = useStylePalette();
  const state = useDeviceState(data.id, data.device);
  const on = !!state?.on;
  const mode = state?.acMode ?? 'cool';

  const [w, h, d] = data.size;
  const body = p.appliance;
  const front = p.appliancePanel;

  // 导风板: 关机贴合出风口, 开机向下翻 ~55°
  const flapAngle = on ? -0.95 : -0.06;
  const flapH = h * 0.22;

  const ventGlow = mode === 'heat' ? '#ff9d5c' : '#7fd4ff';

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {/* 机身 — 前脸略窄、下缘倒角 */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[d, h, w]} />
        <meshStandardMaterial color={body} roughness={0.42} metalness={0.18} />
      </mesh>

      {/* 机身描边 — 白机身挂在浅色墙上时, 靠这圈深色轮廓才看得出体积 */}
      <lineSegments position={[0, h / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(d, h, w)]} />
        <lineBasicMaterial color={p.metalDark} transparent opacity={0.55} />
      </lineSegments>

      {/* 前脸面板 (略薄, 形成一圈接缝) */}
      <mesh position={[d / 2 - 0.004, h / 2, 0]}>
        <boxGeometry args={[0.008, h * 0.82, w * 0.96]} />
        <meshStandardMaterial color={front} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* 出风口 (机身前下方凹槽) */}
      <mesh position={[d * 0.16, h * 0.12, 0]}>
        <boxGeometry args={[d * 0.62, h * 0.16, w * 0.9]} />
        <meshStandardMaterial
          color="#3a3f44"
          roughness={0.8}
          emissive={on ? ventGlow : '#000000'}
          emissiveIntensity={on ? 0.55 : 0}
        />
      </mesh>

      {/* 导风板 — 铰接在出风口前缘, 开机时向下张开 */}
      <group position={[d * 0.46, h * 0.2, 0]} rotation={[0, 0, flapAngle]}>
        <mesh position={[-0.11, -flapH / 2 + 0.006, 0]} castShadow>
          <boxGeometry args={[0.22, flapH, w * 0.88]} />
          <meshStandardMaterial color={body} roughness={0.5} metalness={0.2} />
        </mesh>
      </group>

      {/* 运行指示灯 */}
      <mesh position={[d / 2 + 0.002, h * 0.34, w * 0.36]}>
        <circleGeometry args={[Math.max(0.008, h * 0.035), 12]} />
        <meshBasicMaterial color={on ? (mode === 'heat' ? '#ff8a3d' : '#4ade80') : '#9ca3af'} />
      </mesh>

      {/* 出风口下方的冷/暖气流 (开机才出现, 极淡) */}
      {on && (
        <mesh position={[d * 0.55, -h * 0.28, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.36, h * 0.5, w * 0.8]} />
          <meshBasicMaterial color={ventGlow} transparent opacity={0.07} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
