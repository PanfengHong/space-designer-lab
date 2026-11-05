import type { Furniture } from '../../../../types';
import { useStylePalette } from '../../../../constants/styles';
import { useDeviceState } from '../../../../hooks/useDeviceState';

interface Props {
  data: Furniture;
}

/**
 * 家电类 — 主体 box + 可选深色面板 (模拟电视屏幕等)
 * 带 device 声明时: 电视开机 → 屏幕点亮并泛冷蓝光
 */
export function Appliance({ data }: Props) {
  const p = useStylePalette();
  const state = useDeviceState(data.id, data.device);
  const screenOn = !!state?.on;
  const [w, h, d] = data.size;
  const color = p.appliance;
  const screenColor = p.appliancePanel;

  // 电视/显示器识别: depth < 0.15 且 size 比例横向
  const isFlat = d < 0.15;

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {/* 主体 */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[d, h, w]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>
      {/* 平面显示设备: 屏幕 */}
      {isFlat && (
        <mesh position={[d / 2 + 0.001, h / 2, 0]}>
          <boxGeometry args={[0.005, h * 0.8, w * 0.9]} />
          <meshStandardMaterial
            color={screenOn ? '#0f172a' : screenColor}
            roughness={0.1}
            metalness={0.0}
            emissive={screenOn ? '#4f7ec4' : screenColor}
            emissiveIntensity={screenOn ? 0.85 : 0.12}
          />
        </mesh>
      )}
      {/* 开机时屏幕前的微光 */}
      {isFlat && screenOn && (
        <mesh position={[d / 2 + 0.06, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[w * 1.1, h * 1.1]} />
          <meshBasicMaterial color="#7fb6ff" transparent opacity={0.08} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
