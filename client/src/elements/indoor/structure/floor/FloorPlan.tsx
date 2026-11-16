import type { Room } from '../../../../types';
import { roomOutline } from '../../../../utils/roomOutline';
import { FLOOR_MATERIALS, FLOOR_MATERIAL_ORDER, floorMaterialDef } from '../../../../data/floorMaterials';
import { C } from '../../../common/planColors';

/**
 * 房间地面 (2D) —— 白底 + 材质色淡染 + 材质线稿 (木板缝 / 砖缝 / 地毯点)。
 * 与 3D 地坪 (Floor.tsx) 同口径: 用闭合墙环而不是墙体端点包围盒。
 *
 * `plain` = 只画房间白底, 不画材质色与花纹 —— 平面图里地面材质会把图面弄花,
 * 默认就按 plain 渲染; 材质只体现在 3D 与属性面板的材质选择上。
 */
export function RoomFloor({ room, plain = true }: { room: Room; plain?: boolean }) {
  const b = roomOutline(room.walls);
  const x = b.minX;
  const z = b.minZ;
  const w = b.width;
  const h = b.depth;
  const m = floorMaterialDef(room);
  if (plain) {
    return <rect x={x} y={z} width={w} height={h} fill={C.floor} stroke="none" />;
  }
  return (
    <g>
      <rect x={x} y={z} width={w} height={h} fill={C.floor} stroke="none" />
      <rect x={x} y={z} width={w} height={h} fill={m.swatch} fillOpacity={0.09} stroke="none" />
      {m.pattern !== 'solid' && (
        <rect x={x} y={z} width={w} height={h} fill={`url(#floor-pat-${m.id})`} stroke="none" />
      )}
    </g>
  );
}

/**
 * 地面材质填充图案 —— 与 3D 用同一份材质注册表 (data/floorMaterials.ts)。
 * 尺寸单位就是 viewBox 的米, 所以木板缝 0.15m、地砖 0.6/0.3m 都是真实比例。
 */
export function FloorPatterns() {
  return (
    <defs>
      {FLOOR_MATERIAL_ORDER.map((id) => {
        const m = FLOOR_MATERIALS[id];
        if (m.pattern === 'solid') return null;
        if (m.pattern === 'plank') {
          return (
            <pattern key={id} id={`floor-pat-${id}`} patternUnits="userSpaceOnUse" width={1.2} height={0.15}>
              <line x1={0} y1={0.002} x2={1.2} y2={0.002} stroke={m.grain} strokeWidth={0.012} opacity={0.55} />
              <line x1={0.62} y1={0.002} x2={0.62} y2={0.15} stroke={m.grain} strokeWidth={0.01} opacity={0.35} />
            </pattern>
          );
        }
        if (m.pattern === 'dot') {
          return (
            <pattern key={id} id={`floor-pat-${id}`} patternUnits="userSpaceOnUse" width={0.12} height={0.12}>
              <circle cx={0.06} cy={0.06} r={0.011} fill={m.grain} opacity={0.45} />
            </pattern>
          );
        }
        const cell = m.pattern === 'grid-coarse' ? 0.6 : 0.3;
        return (
          <pattern key={id} id={`floor-pat-${id}`} patternUnits="userSpaceOnUse" width={cell} height={cell}>
            <path
              d={`M ${cell} 0 H 0 V ${cell}`}
              fill="none"
              stroke={m.grain}
              strokeWidth={0.012}
              opacity={0.45}
            />
          </pattern>
        );
      })}
    </defs>
  );
}
