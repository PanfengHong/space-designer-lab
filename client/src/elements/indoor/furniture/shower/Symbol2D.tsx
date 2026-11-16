import type { Furniture } from '../../../../types';
import { C } from '../../../common/planColors';

/** 淋浴间: 四分之一圆 / 矩形, 玻璃边用虚线。锚点展开图形: 从 (x,z) 向 +X/+Z 生长。 */
export function Shower2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const shape = furniture.shape ?? 'quarter';
  const r = furniture.size[0];
  const glassStroke = C.window;
  const fill = C.furnitureLight;

  if (shape === 'quarter') {
    return (
      <g>
        <path
          d={`M ${x} ${z} L ${x + r} ${z} A ${r} ${r} 0 0 1 ${x} ${z + r} Z`}
          fill={fill} stroke={glassStroke} strokeWidth={0.04}
        />
        <path
          d={`M ${x + r} ${z} A ${r} ${r} 0 0 1 ${x} ${z + r}`}
          fill="none" stroke={glassStroke} strokeWidth={0.06} strokeDasharray="0.08 0.06"
        />
        <circle cx={x + r * 0.4} cy={z + r * 0.4} r={0.06} fill={C.furnitureStroke} />
      </g>
    );
  }

  const rw = furniture.size[0];
  const rh = furniture.size[2];
  return (
    <g>
      <rect x={x} y={z} width={rw} height={rh} fill={fill} stroke={glassStroke} strokeWidth={0.04} />
      <line x1={x} y1={z + rh} x2={x + rw} y2={z + rh} stroke={glassStroke} strokeWidth={0.06} strokeDasharray="0.08 0.06" />
      <line x1={x + rw} y1={z} x2={x + rw} y2={z + rh} stroke={glassStroke} strokeWidth={0.06} strokeDasharray="0.08 0.06" />
      <circle cx={x + rw * 0.3} cy={z + rh * 0.3} r={0.06} fill={C.furnitureStroke} />
    </g>
  );
}
