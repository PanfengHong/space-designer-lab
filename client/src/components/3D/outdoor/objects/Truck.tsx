import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { OutdoorObject } from '../../../../types';
import type { OutdoorPalette } from '../../../../constants/outdoorStyles';

extend({ RoundedBoxGeometry });

/**
 * 卡车 — 白色车头 + 彩色货柜 (默认蓝) + 8 轮 (4 轴)
 * 车头朝向 +X; 轴布局: 车头前轴 1 + 货柜前轴 1 + 货柜后双轴 2 (紧靠)
 */
export function Truck({ data, palette }: { data: OutdoorObject; palette: OutdoorPalette }) {
  const [L, H, W] = data.size;
  const cargoColor = palette.monochrome ? '#f2f2f2' : data.color;
  const wheelR = H * 0.17;

  // 几何布局 — 车头缩短并紧贴货柜右侧
  const cabL = L * 0.18;
  const cabH = H * 0.66;
  const cargoL = L - cabL - L * 0.02;
  const cargoH = H * 0.82;
  const cargoX = -L / 2 + cargoL / 2;
  const cabX = cargoX + cargoL / 2 + cabL / 2;

  // 弧形车顶 — 半径取车顶宽度一半, 直径覆盖车头宽度; 用顶部弧段控制低矮隆起
  const roofR = W * 0.48;
  const roofThetaLen = Math.PI * 0.55;
  const roofThetaStart = Math.PI / 2 - roofThetaLen / 2;

  // 4 轴布局: 车头前轴 + 货柜前轴 + 货柜后双轴 (两个紧靠)
  const axles = [
    cabX,                          // 车头转向轴
    cargoX + cargoL * 0.4,         // 货柜前部单轴
    cargoX - cargoL * 0.25,        // 货柜后部双轴 1
    cargoX - cargoL * 0.35,        // 货柜后部双轴 2 (紧靠前一个)
  ];

  return (
    <group>
      {/* 底盘 */}
      <mesh position={[0, wheelR + 0.08, 0]} castShadow>
        <boxGeometry args={[L * 0.96, 0.1, W * 0.82]} />
        <meshStandardMaterial color={palette.metal} roughness={0.7} />
      </mesh>

      {/* 货柜 */}
      <mesh position={[cargoX, wheelR * 2 + cargoH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[cargoL, cargoH, W * 0.94]} />
        <meshStandardMaterial color={cargoColor} roughness={0.55} metalness={0.08} />
      </mesh>
      {/* 货柜描边 */}
      <lineSegments position={[cargoX, wheelR * 2 + cargoH / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(cargoL * 1.003, cargoH * 1.003, W * 0.94 * 1.003)]} />
        <lineBasicMaterial color={palette.edge} />
      </lineSegments>

      {/* 车头 */}
      <mesh position={[cabX, wheelR * 2 + cabH / 2 - 0.04, 0]} castShadow>
        <roundedBoxGeometry args={[cabL, cabH, W * 0.96, 3, 0.07]} />
        <meshStandardMaterial color={palette.monochrome ? '#ffffff' : '#f7fafc'} roughness={0.4} metalness={0.12} />
      </mesh>

      {/* 弧形车顶导流罩 — 水平覆盖车顶平面 (直径=车头宽度), 低弧隆起朝上 */}
      <mesh
        position={[cabX - 0.2, wheelR * 2 + cabH - 0.1, 0]}
        rotation={[-Math.PI / 2, -Math.PI / 4, 0]}
        castShadow
      >
        <cylinderGeometry args={[roofR, roofR, cabL * 1.02, 24, 1, false, roofThetaStart, roofThetaLen]} />
        <meshStandardMaterial
          color={palette.monochrome ? '#ffffff' : '#f7fafc'}
          roughness={0.4}
          metalness={0.12}
        />
      </mesh>

      {/* 前挡风玻璃 — 位于车头最前端, 倾斜 20° (顶部向后倾), 模拟驾驶室大玻璃 */}
      <mesh
        position={[cabX + cabL / 2, wheelR * 2 + cabH * 0.6, 0]}
        rotation={[0, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.04, cabH * 0.5, W * 0.82]} />
        <meshStandardMaterial
          color={palette.glassDark}
          transparent
          opacity={palette.monochrome ? 0.55 : 0.8}
          metalness={0.3}
          roughness={0.1}
        />
      </mesh>
      {/* 侧窗 */}
      {[-1, 1].map((sz) => (
        <mesh key={`side-${sz}`} position={[cabX + cabL * 0.1, wheelR * 2 + cabH * 0.72, sz * (W / 2 - 0.02)]}>
          <boxGeometry args={[cabL * 0.5, cabH * 0.3, 0.04]} />
          <meshStandardMaterial color={palette.glassDark} transparent opacity={0.75} metalness={0.3} roughness={0.1} />
        </mesh>
      ))}

      {/* 车轮 (4 轴: 车头前轴 + 货柜前轴 + 货柜后双轴) */}
      {axles.map((x, i) =>
        [-1, 1].map((sz) => (
          <group key={`wheel-${i}-${sz}`}>
            <mesh
              position={[x, wheelR, sz * (W / 2 - 0.06)]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[wheelR, wheelR, 0.12, 18]} />
              <meshStandardMaterial color={palette.tire} roughness={0.9} />
            </mesh>
            <mesh
              position={[x, wheelR, sz * (W / 2 - 0.06)]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[wheelR * 0.52, wheelR * 0.52, 0.13, 12]} />
              <meshStandardMaterial color={palette.metal} roughness={0.4} metalness={0.5} />
            </mesh>
          </group>
        ))
      )}

      {/* 前大灯 — 紧贴车头前端 */}
      {[-1, 1].map((sz) => (
        <mesh key={`head-${sz}`} position={[cabX + cabL / 2, wheelR * 1.6, sz * W * 0.3]}>
          <boxGeometry args={[0.03, 0.09, W * 0.14]} />
          <meshStandardMaterial color="#fff7d6" emissive="#fff2c0" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}
