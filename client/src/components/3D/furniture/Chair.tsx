import type { Furniture } from '../../../types';
import { useStylePalette } from '../../../constants/styles';

interface Props {
  data: Furniture;
}

/**
 * 椅子 — 座板 + 4 条腿 + 靠背
 * 局部坐标系: x=左右, y=向上, z=前后 (靠背在 -z 端, 面朝 +z)
 */
export function Chair({ data }: Props) {
  const p = useStylePalette();
  const [w, h, d] = data.size;
  const color = p.fabric;
  const legColor = p.woodDark;

  const seatH = h * 0.45;      // 座板高度 (从地面到座板顶)
  const backH = h - seatH;     // 靠背高度
  const seatT = 0.05;          // 座板厚度
  const backT = 0.05;          // 靠背厚度
  const legW = 0.05;           // 腿粗
  const halfW = w / 2;
  const halfD = d / 2;

  // 四条腿位置 (在座板四角)
  const legPositions: [number, number, number][] = [
    [-halfW + legW / 2, seatH / 2, -halfD + legW / 2],   // 左前
    [halfW - legW / 2, seatH / 2, -halfD + legW / 2],    // 右前
    [-halfW + legW / 2, seatH / 2, halfD - legW / 2],    // 左后
    [halfW - legW / 2, seatH / 2, halfD - legW / 2],     // 右后
  ];

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {/* 座板 */}
      <mesh position={[0, seatH, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, seatT, d]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>

      {/* 靠背 (在 -z 端) */}
      <mesh
        position={[0, seatH + seatT / 2 + backH / 2, -halfD + backT / 2]}
        castShadow
      >
        <boxGeometry args={[w, backH, backT]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>

      {/* 四条腿 */}
      {legPositions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[legW, seatH, legW]} />
          <meshStandardMaterial color={legColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
