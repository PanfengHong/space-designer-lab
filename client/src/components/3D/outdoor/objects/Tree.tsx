import type { OutdoorObject } from '../../../../types';
import type { OutdoorPalette } from '../../../../constants/outdoorStyles';

/**
 * 树木 — 树干 + 多层圆锥树冠
 * 数字园区风格: 树冠使用素材色 (data.color), 树干棕色
 * 纯净白模/暗色风格: 使用调色板中的低明度色
 */
export function Tree({ data, palette }: { data: OutdoorObject; palette: OutdoorPalette }) {
  const canopyColor = palette.monochrome
    ? '#ffffff'
    : palette.useModelColor
      ? data.color || '#5a8a4a'
      : palette.grass;
  const trunkColor = palette.monochrome
    ? '#f0f0f0'
    : palette.useModelColor
      ? '#8b6f52'
      : palette.concrete;

  // 按 size 高度缩放 (数据高度为 5~6m, 基准模型总高 6.5m)
  const scale = (data.size[1] || 6) / 6;

  return (
    <group scale={scale}>
      {/* 树干 圆柱 */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.3, 2.4, 8]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>

      {/* 多层树冠圆锥，堆叠 */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <coneGeometry args={[1.6, 2.2, 8]} />
        <meshStandardMaterial color={canopyColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, 4.4, 0]} castShadow>
        <coneGeometry args={[1.2, 1.8, 8]} />
        <meshStandardMaterial color={canopyColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, 5.3, 0]} castShadow>
        <coneGeometry args={[0.7, 1.4, 8]} />
        <meshStandardMaterial color={canopyColor} roughness={0.85} />
      </mesh>
    </group>
  );
}
