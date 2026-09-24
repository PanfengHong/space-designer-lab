import { ContentProps } from '../GroundItems';

/** 河流 — 蓝色水面 (不透明, 避免半透明叠加 z-fighting 闪烁) */
export function River({ data, palette }: ContentProps) {
  const [w, h, d] = data.size;
  const color = palette.monochrome ? '#eef1f4' : palette.river;
  return (
    <group>
      <mesh receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.15}
          emissive={palette.monochrome ? '#000000' : '#1b4f73'}
          emissiveIntensity={0.12}
        />
      </mesh>
    </group>
  );
}