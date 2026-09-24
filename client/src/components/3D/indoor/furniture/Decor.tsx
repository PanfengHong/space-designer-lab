import type { Furniture } from '../../../../types';
import { useStylePalette } from '../../../../constants/styles';

interface Props {
  data: Furniture;
}

/**
 * 装饰类 — 通用 box 占位 (落地灯/休闲椅/淋浴区等)
 */
export function Decor({ data }: Props) {
  const p = useStylePalette();
  const [w, h, d] = data.size;
  const color = p.wood;

  // 矮凳 (换鞋凳/休闲椅): 高度 < 0.5
  if (h < 0.5) {
    return (
      <group
        position={[data.position[0], data.position[1], data.position[2]]}
        rotation={[0, (data.rotation * Math.PI) / 180, 0]}
      >
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[d, h, w]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
    );
  }

  // 落地灯: 高度 > 1.4 且 width < 0.5
  if (h > 1.4 && w < 0.5 && d < 0.5) {
    return (
      <group
        position={[data.position[0], data.position[1], data.position[2]]}
        rotation={[0, (data.rotation * Math.PI) / 180, 0]}
      >
        {/* 底座 */}
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.18, 0.06, 24]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
        </mesh>
        {/* 灯杆 — 底部紧贴底座顶面 (y=0.06), 顶部连接灯罩 */}
        <mesh position={[0, 0.06 + (h - 0.06) / 2, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, h - 0.06, 16]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} />
        </mesh>
        {/* 灯罩 */}
        <mesh position={[0, h - 0.06 + h * 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.12, h * 0.2, 24]} />
          <meshStandardMaterial color={p.fabricLight} roughness={0.9} />
        </mesh>
      </group>
    );
  }

  // 默认: 通用 box
  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[d, h, w]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}
