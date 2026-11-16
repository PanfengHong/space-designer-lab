import type { Furniture } from '../../types';
import { getFurnitureElement } from '../../elements/indoor/furniture';
import { footprintOf } from '../../elements/indoor/furniture/metas';

/**
 * 平面图家具符号出口 —— 与 3D 素材一一对应的 2D 表达。
 *
 * 约定:
 *   - 每个符号只画"未旋转"的图形, 绕 (x, z) 的旋转由本出口统一施加
 *     (`rotate(-rotation)` —— three 绕 Y 轴旋转俯视是逆时针, SVG rotate 是顺时针, 两者反向)
 *   - 占地宽高一律走 footprintOf(), 不自己推导 size 轴向 (马桶/椅子的 X 是 size[0])
 *   - 颜色只用 planColors 的灰阶, 不引入彩色
 *
 * 符号本体在 elements/indoor/furniture/<type>/Symbol2D.tsx;
 * 新增家具类型时漏写符号会落到 Generic2D 的空白圆角矩形 (视觉上立刻能发现)。
 */
export function FurnitureSymbol2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  return (
    <g transform={`rotate(${-furniture.rotation}, ${x}, ${z})`}>
      <FurnitureSymbolInner furniture={furniture} />
    </g>
  );
}

function FurnitureSymbolInner({ furniture }: { furniture: Furniture }) {
  const el = getFurnitureElement(furniture.type);
  if (!el) return <Generic2D furniture={furniture} />;
  const Symbol2D = el.Symbol2D;
  return <Symbol2D furniture={furniture} />;
}

/**
 * 几何命中测试: 世界坐标点是否落在家具占地内 (考虑旋转)。
 *
 * 与符号共用 footprintOf, 保证"画出来的"和"点得到的"永远一致。
 * 锚点展开图形 (淋浴间) 与床头板外扩 (床) 由元素自己的 hitTest/hitPadNegX 声明。
 */
export function furnitureHitTest(f: Furniture, px: number, pz: number, pad = 0.03): boolean {
  const el = getFurnitureElement(f.type);
  if (el?.hitTest) return el.hitTest(f, px, pz, pad);

  const [x, , z] = f.position;
  const { w, h } = footprintOf(f);
  const rot = ((f.rotation % 360) + 360) % 360;
  const rad = (rot * Math.PI) / 180;
  const dx = px - x;
  const dz = pz - z;
  // 图形以 rotate(-rot) 绘制, 命中需按同一变换的逆矩阵回到局部坐标
  const lx = dx * Math.cos(rad) - dz * Math.sin(rad);
  const lz = dx * Math.sin(rad) + dz * Math.cos(rad);
  const padNegX = el?.hitPadNegX ? pad + el.hitPadNegX : pad;
  return lx <= w / 2 + pad && lx >= -w / 2 - padNegX && Math.abs(lz) <= h / 2 + pad;
}

/** 兜底: 通用圆角矩形 (新类型忘了写符号时会落到这里, 视觉上立刻能发现) */
function Generic2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <rect
      x={x - w / 2} y={z - h / 2} width={w} height={h}
      fill="#d9d9d9" stroke="#9e9e9e" strokeWidth={0.02} rx={0.05}
    />
  );
}
