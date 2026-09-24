import { ContentProps } from '../GroundItems';

/** 草地 — 柔和绿色圆角地块 */
export function Grass({ data, palette }: ContentProps) {
  const [w, h, d] = data.size;
  const color = palette.monochrome ? palette.grass : data.color;
  return (
    <mesh receiveShadow castShadow>
      <roundedBoxGeometry args={[w, h, d, 3, 0.1]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}