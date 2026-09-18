import type { Furniture } from '../../../types';
import { useStylePalette } from '../../../constants/styles';

interface Props {
  data: Furniture;
}

/**
 * 桌类 — 桌面 + 4 条腿
 */
export function Table({ data }: Props) {
  const p = useStylePalette();
  const [w, h, d] = data.size;
  const color = p.wood;
  const legH = h - 0.08;
  const legSize = 0.05;

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {/* 桌面 */}
      <mesh position={[0, h - 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[d, 0.08, w]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* 四条腿 */}
      {[
        [-d / 2 + legSize, legH / 2, -w / 2 + legSize],
        [d / 2 - legSize, legH / 2, -w / 2 + legSize],
        [-d / 2 + legSize, legH / 2, w / 2 - legSize],
        [d / 2 - legSize, legH / 2, w / 2 - legSize],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[legSize, legH, legSize]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
