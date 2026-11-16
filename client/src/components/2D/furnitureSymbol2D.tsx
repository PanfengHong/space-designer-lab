import type { Furniture } from '../../types';
import { footprintOf } from '../../data/furnitureMeta';
import { C } from './planColors';

/**
 * 平面图家具符号 —— 与 3D 素材一一对应的 2D 表达。
 *
 * 约定:
 *   - 每个符号只画"未旋转"的图形, 绕 (x, z) 的旋转由 FurnitureSymbol2D 统一施加
 *     (`rotate(-rotation)` —— three 绕 Y 轴旋转俯视是逆时针, SVG rotate 是顺时针, 两者反向)
 *   - 占地宽高一律走 footprintOf(), 不自己推导 size 轴向 (马桶/椅子的 X 是 size[0])
 *   - 颜色只用 planColors 的灰阶, 不引入彩色
 *
 * 新增家具类型时**必须**在这里补一个符号, 否则会落到 Generic2D 的空白圆角矩形。
 */
export function FurnitureSymbol2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  return (
    <g transform={`rotate(${-furniture.rotation}, ${x}, ${z})`}>
      {renderSymbol(furniture)}
    </g>
  );
}

function renderSymbol(f: Furniture) {
  switch (f.type) {
    case 'shower':
      return <Shower2D furniture={f} />;
    case 'stove':
      return <Stove2D furniture={f} />;
    case 'bed':
      return <Bed2D furniture={f} />;
    case 'sofa':
      return <Sofa2D furniture={f} />;
    case 'table':
      return <Table2D furniture={f} />;
    case 'chair':
      return <Chair2D furniture={f} />;
    case 'cabinet':
      return <Cabinet2D furniture={f} />;
    case 'toilet':
      return <Toilet2D furniture={f} />;
    case 'sink':
      return <Sink2D furniture={f} />;
    case 'fridge':
      return <Fridge2D furniture={f} />;
    case 'washer':
      return <Washer2D furniture={f} />;
    case 'ac':
      return <Ac2D furniture={f} />;
    case 'curtain':
      return <Curtain2D furniture={f} />;
    case 'decor':
      return <Decor2D furniture={f} />;
    case 'appliance':
      return <Appliance2D furniture={f} />;
    default:
      return <Generic2D furniture={f} />;
  }
}

/**
 * 几何命中测试: 世界坐标点是否落在家具占地内 (考虑旋转)。
 *
 * 与符号同文件、共用 footprintOf, 保证"画出来的"和"点得到的"永远一致。
 * 淋浴间是锚点展开图形 (从 (x,z) 向 +X/+Z 长), 保持旧行为: 以 (x,z) 为左上角、边长 size[0]。
 */
export function furnitureHitTest(f: Furniture, px: number, pz: number, pad = 0.03): boolean {
  const [x, , z] = f.position;

  if (f.type === 'shower') {
    const r = f.size[0];
    return px >= x - pad && px <= x + r + pad && pz >= z - pad && pz <= z + r + pad;
  }

  const { w, h } = footprintOf(f);
  const rot = ((f.rotation % 360) + 360) % 360;
  const rad = (rot * Math.PI) / 180;
  const dx = px - x;
  const dz = pz - z;
  // 图形以 rotate(-rot) 绘制, 命中需按同一变换的逆矩阵回到局部坐标
  const lx = dx * Math.cos(rad) - dz * Math.sin(rad);
  const lz = dx * Math.sin(rad) + dz * Math.cos(rad);
  // 床的床头板立在床架 -X 端外侧 0.08m, 命中盒同步向 -X 外扩, 否则点床头板选不中床
  const padNegX = f.type === 'bed' ? pad + 0.08 : pad;
  return lx <= w / 2 + pad && lx >= -w / 2 - padNegX && Math.abs(lz) <= h / 2 + pad;
}

/* ==================== 各类型符号 ==================== */

/** 灶台: 深色台面 + 2 个炉头 + 2 个前端旋钮 */
function Stove2D({ furniture }: { furniture: Furniture }) {
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

/** 床: 床架 + 被褥 + 双枕 + 床头板 (床头板在 -X 外侧, 与 3D 同构) */
function Bed2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  const headT = 0.08;
  const pillowW = 0.4;
  const pillowH = 0.6;
  const pillowX = x - w / 2 + 0.35;
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.05}
      />
      <rect
        x={x + 0.1 - (w - 0.05) / 2} y={z - (h - 0.15) / 2}
        width={w - 0.05} height={h - 0.15}
        fill={C.furniture} stroke="none" rx={0.04}
      />
      {[-h / 4, h / 4].map((oz, i) => (
        <rect
          key={`pillow-${i}`}
          x={pillowX - pillowW / 2} y={z + oz - pillowH / 2}
          width={pillowW} height={pillowH}
          fill={C.floor} stroke={C.furnitureStroke} strokeWidth={0.015} rx={0.06}
        />
      ))}
      <rect
        data-part="headboard"
        x={x - w / 2 - headT} y={z - h / 2} width={headT} height={h}
        fill="#c2c2c2" stroke="#9e9e9e" strokeWidth={0.015} rx={0.02}
      />
    </g>
  );
}

/** 沙发: 圆角矩形 + 坐垫分隔 */
function Sofa2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furniture} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.08}
      />
      <line
        x1={x - w / 2 + w * 0.15} y1={z}
        x2={x + w / 2 - w * 0.15} y2={z}
        stroke={C.furnitureStroke} strokeWidth={0.02} opacity={0.5}
      />
    </g>
  );
}

function Table2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <rect
      x={x - w / 2} y={z - h / 2} width={w} height={h}
      fill={C.furniture} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.06}
    />
  );
}

function Chair2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <rect
      x={x - w / 2} y={z - h / 2} width={w} height={h}
      fill={C.furniture} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.08}
    />
  );
}

/** 柜子: 高柜 (h>1.5) 画挂衣杆 + 衣架斜线, 其余画门板分隔线 */
function Cabinet2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  const isWardrobe = furniture.size[1] > 1.5;

  if (!isWardrobe) {
    return (
      <g>
        <rect
          x={x - w / 2} y={z - h / 2} width={w} height={h}
          fill={C.furniture} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.03}
        />
        <line
          x1={x} y1={z - h / 2 + 0.05} x2={x} y2={z + h / 2 - 0.05}
          stroke={C.furnitureStroke} strokeWidth={0.02} opacity={0.4}
        />
      </g>
    );
  }

  const backX = -w / 2 + 0.04;
  const frontX = w / 2 - 0.04;
  const railHalf = h / 2 - 0.08;
  const n = Math.max(3, Math.round(h / 0.25));
  const tilt = (frontX - backX) * 0.35 * 0.5;
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furniture} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.03}
      />
      {Array.from({ length: n + 1 }).map((_, i) => {
        const zi = Math.max(
          -railHalf + tilt,
          Math.min(railHalf - tilt, -railHalf + 0.07 + (i * (2 * railHalf - 0.14)) / n),
        );
        return (
          <line
            key={i}
            x1={x + backX} y1={z + zi + tilt}
            x2={x + frontX} y2={z + zi - tilt}
            stroke={C.textDim} strokeWidth={0.025} opacity={0.8}
          />
        );
      })}
      <line x1={x} y1={z - railHalf} x2={x} y2={z + railHalf} stroke={C.textDim} strokeWidth={0.035} />
    </g>
  );
}

/** 马桶: 水箱 + 椭圆座 */
function Toilet2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h * 0.35}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.03}
      />
      <ellipse
        cx={x} cy={z + h * 0.15} rx={w * 0.4} ry={h * 0.3}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02}
      />
    </g>
  );
}

/** 洗手台: 台面 + 盆 */
function Sink2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.04}
      />
      <ellipse
        cx={x} cy={z} rx={w * 0.3} ry={h * 0.3}
        fill={C.furniture} stroke={C.furnitureStroke} strokeWidth={0.02}
      />
    </g>
  );
}

/** 冰箱: 矩形 + 上下门分隔 */
function Fridge2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.04}
      />
      <line
        x1={x - w / 2 + 0.03} y1={z} x2={x + w / 2 - 0.03} y2={z}
        stroke={C.furnitureStroke} strokeWidth={0.02} opacity={0.5}
      />
    </g>
  );
}

/** 洗衣机: 矩形 + 圆形门 */
function Washer2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.04}
      />
      <circle
        cx={x} cy={z} r={Math.min(w, h) * 0.3}
        fill="none" stroke={C.furnitureStroke} strokeWidth={0.02}
      />
    </g>
  );
}

/**
 * 空调 (壁挂): 平面图上是贴墙的细长条 —— 进深薄、沿墙长。
 * 局部 +X 是出风面 (与 3D 的前脸同侧), 用一条虚线示意送风方向。
 */
function Ac2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02}
        rx={Math.min(w, h) * 0.25}
      />
      {[-0.3, 0, 0.3].map((o, i) => (
        <line
          key={`vent-${i}`}
          x1={x + w * 0.08} y1={z + h * o}
          x2={x + w / 2 - 0.01} y2={z + h * o}
          stroke={C.furnitureStroke} strokeWidth={0.018}
        />
      ))}
      <line
        x1={x + w / 2 + 0.04} y1={z - h * 0.4}
        x2={x + w / 2 + 0.04} y2={z + h * 0.4}
        stroke={C.furnitureStroke} strokeWidth={0.02} strokeDasharray="0.05 0.05" opacity={0.7}
      />
    </g>
  );
}

/**
 * 窗帘: 贴墙的细长条 + 竖向褶皱。
 * 沿墙方向是局部 Z (长), 进深是局部 X (薄)。
 */
function Curtain2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  const n = Math.max(4, Math.round(h / 0.18));
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.015}
      />
      {Array.from({ length: n }).map((_, i) => {
        const zz = z - h / 2 + ((i + 0.5) * h) / n;
        return (
          <line
            key={`fold-${i}`}
            x1={x - w / 2} y1={zz} x2={x + w / 2} y2={zz}
            stroke={C.furnitureStroke} strokeWidth={0.012} opacity={0.8}
          />
        );
      })}
    </g>
  );
}

/** 落地灯 / 绿植: 圆 + 内圆 (俯视轮廓) */
function Decor2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  const r = Math.min(w, h) / 2;
  return (
    <g>
      <circle cx={x} cy={z} r={r} fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} />
      <circle cx={x} cy={z} r={r * 0.45} fill="none" stroke={C.furnitureStroke} strokeWidth={0.02} />
    </g>
  );
}

/** 家电 (饮水机 / 打印机 / 电视): 矩形 + 内缩面板 */
function Appliance2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  const inset = Math.min(w, h) * 0.16;
  return (
    <g>
      <rect
        x={x - w / 2} y={z - h / 2} width={w} height={h}
        fill={C.furnitureLight} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.03}
      />
      <rect
        x={x - w / 2 + inset} y={z - h / 2 + inset}
        width={Math.max(0.02, w - inset * 2)} height={Math.max(0.02, h - inset * 2)}
        fill="none" stroke={C.furnitureStroke} strokeWidth={0.018} rx={0.02}
      />
    </g>
  );
}

/** 兜底: 通用圆角矩形 (新类型忘了写符号时会落到这里, 视觉上立刻能发现) */
function Generic2D({ furniture }: { furniture: Furniture }) {
  const [x, , z] = furniture.position;
  const { w, h } = footprintOf(furniture);
  return (
    <rect
      x={x - w / 2} y={z - h / 2} width={w} height={h}
      fill={C.furniture} stroke={C.furnitureStroke} strokeWidth={0.02} rx={0.05}
    />
  );
}

/** 淋浴间: 四分之一圆 / 矩形, 玻璃边用虚线 */
function Shower2D({ furniture }: { furniture: Furniture }) {
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
