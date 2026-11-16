import type { Furniture } from '../../../../types';
import { footprintOf } from '../metas';

/** 灶台: 深色台面 + 2 个炉头 + 2 个前端旋钮 */
export function Stove2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  const burnerR = Math.min(w, h) * 0.2;
  const burnerStroke = '#5f5f5f';
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill="#b4b4b4" stroke="#8f8f8f" strokeWidth={0.025} rx={0.03}
      />
      {[-h * 0.28, h * 0.28].map((oz, i) => (
        <g key={i}>
          <circle cx={x} cy={z + oz} r={burnerR} fill="none" stroke={burnerStroke} strokeWidth={0.035} />
          <circle cx={x} cy={z + oz} r={burnerR * 0.45} fill="none" stroke={burnerStroke} strokeWidth={0.025} opacity={0.85} />
        </g>
      ))}
      {[-h * 0.2, h * 0.2].map((oz, i) => (
        <circle key={`knob-${i}`} cx={x + w / 2 - 0.04} cy={z + oz} r={0.02} fill={burnerStroke} />
      ))}
    </g>
  );
}
