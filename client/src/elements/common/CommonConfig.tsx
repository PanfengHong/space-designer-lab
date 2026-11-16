import type { Furniture, GroundItem, OutdoorObject } from '../../types';
import {
  ColorRow,
  PositionRows,
  PropRow,
  RotationControl,
  SizeRows,
  StepperRow,
  ToggleRow,
} from '../../components/ui/PropertyControls';

/**
 * 通用配置 —— 元素类型无关的字段 (名称/位置/旋转/尺寸/颜色/墙体几何)。
 *
 * 单独维护的原因: 这些行对同族所有元素完全一致 (家具 15 种、户外 18 种都一样),
 * 各元素的「自定义配置」(Config.tsx) 只写自己特有的字段, 面板里按
 * `通用配置 + 元素自定义配置 + 操作行` 三段拼装, 不重复也不遗漏。
 */

/* ==================== 家具 ==================== */

export function CommonFurnitureRows({
  item,
  update,
}: {
  item: Furniture;
  update: (patch: Partial<Furniture>) => void;
}) {
  return (
    <>
      <PropRow label="名称" value={item.name} />
      <PropRow label="类型" value={item.type} />

      {/* 位置 X/Z */}
      <div className="space-y-1.5 pt-1 border-t border-gray-100">
        <div className="text-[10px] text-gray-400 font-medium pt-1">位置</div>
        <StepperRow
          label="X"
          value={item.position[0]}
          step={0.1}
          min={-15}
          max={15}
          onChange={(v) => update({ position: [v, item.position[1], item.position[2]] })}
        />
        <StepperRow
          label="Z"
          value={item.position[2]}
          step={0.1}
          min={-15}
          max={15}
          onChange={(v) => update({ position: [item.position[0], item.position[1], v] })}
        />
      </div>

      {/* 旋转 */}
      <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
        <RotationControl
          value={item.rotation}
          onChange={(v) => update({ rotation: Math.round(v) })}
        />
      </div>

      {/* 尺寸 (长×高×宽) */}
      <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
        <div className="text-[10px] text-gray-400 font-medium pt-1">尺寸 (长×高×宽)</div>
        <StepperRow
          label="长 (D)"
          value={item.size[0]}
          step={0.05}
          min={0.1}
          max={10}
          onChange={(v) => update({ size: [v, item.size[1], item.size[2]] })}
        />
        <StepperRow
          label="高 (H)"
          value={item.size[1]}
          step={0.05}
          min={0.1}
          max={5}
          onChange={(v) => update({ size: [item.size[0], v, item.size[2]] })}
        />
        <StepperRow
          label="宽 (W)"
          value={item.size[2]}
          step={0.05}
          min={0.1}
          max={10}
          onChange={(v) => update({ size: [item.size[0], item.size[1], v] })}
        />
      </div>

      {/* 颜色 */}
      <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
        <ColorRow
          label="颜色"
          value={item.color}
          onChange={(v) => update({ color: v })}
        />
      </div>
    </>
  );
}

/* ==================== 建筑结构 ==================== */

/** 属性面板用的结构解析结果 (由结构 selector 解析而来) */
export interface ResolvedStructure {
  /** 中文类型名 (墙体/门/窗/…) */
  type: string;
  name: string;
  id: string;
  position: [number, number, number] | null;
  size: number[] | null;
  extra: Record<string, unknown>;
}

export function CommonStructureRows({
  st,
  update,
}: {
  st: ResolvedStructure;
  update: (patch: Record<string, unknown>) => void;
}) {
  const extra = st.extra;

  return (
    <>
      {/* 位置 (门窗类) */}
      {st.position && (
        <div className="space-y-1.5 pt-1 border-t border-gray-100">
          <div className="text-[10px] text-gray-400 font-medium pt-1">位置</div>
          <StepperRow
            label="X"
            value={st.position[0]}
            step={0.1}
            min={-15}
            max={15}
            onChange={(v) => update({ position: [v, st.position![1], st.position![2]] })}
          />
          <StepperRow
            label="Z"
            value={st.position[2]}
            step={0.1}
            min={-15}
            max={15}
            onChange={(v) => update({ position: [st.position![0], st.position![1], v] })}
          />
        </div>
      )}

      {/* 尺寸 */}
      {st.size && (
        <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
          <div className="text-[10px] text-gray-400 font-medium pt-1">
            尺寸 {st.size.length === 3 ? '(宽×高×深)' : '(宽×高)'}
          </div>
          <StepperRow
            label="宽 (W)"
            value={st.size[0]}
            step={0.05}
            min={0.3}
            max={6}
            onChange={(v) =>
              update(
                st.size!.length === 3
                  ? { width: v, size: [v, st.size![1], st.size![2]] }
                  : { width: v, size: [v, st.size![1]] },
              )
            }
          />
          <StepperRow
            label="高 (H)"
            value={st.size[1]}
            step={0.05}
            min={0.3}
            max={4}
            onChange={(v) =>
              update(
                st.size!.length === 3
                  ? { height: v, size: [st.size![0], v, st.size![2]] }
                  : { height: v, size: [st.size![0], v] },
              )
            }
          />
          {st.size.length === 3 && (
            <StepperRow
              label="深 (D)"
              value={st.size[2]}
              step={0.05}
              min={0.1}
              max={2}
              onChange={(v) => update({ depth: v, size: [st.size![0], st.size![1], v] })}
            />
          )}
        </div>
      )}

      {/* 墙体位置与尺寸 */}
      {extra.length !== undefined && extra.start && extra.end && (
        <WallGeometryRows
          start={extra.start as [number, number]}
          end={extra.end as [number, number]}
          length={extra.length as number}
          height={extra.height as number | undefined}
          update={update}
        />
      )}

      {/* 旋转 */}
      {extra.rotation !== undefined && (
        <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
          <RotationControl
            value={extra.rotation as number}
            onChange={(v) => update({ rotation: Math.round(v) })}
          />
        </div>
      )}
    </>
  );
}

function WallGeometryRows({
  start,
  end,
  length,
  height,
  update,
}: {
  start: [number, number];
  end: [number, number];
  length: number;
  height?: number;
  update: (patch: Record<string, unknown>) => void;
}) {
  const [sx, sz] = start;
  const [ex, ez] = end;
  const cx = (sx + ex) / 2;
  const cz = (sz + ez) / 2;
  const isHorizontal = Math.abs(ez - sz) < 0.01;
  const isVertical = Math.abs(ex - sx) < 0.01;

  return (
    <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
      <div className="text-[10px] text-gray-400 font-medium pt-1">墙体位置 (整体平移)</div>
      <StepperRow
        label="中心 X"
        value={cx}
        step={0.1}
        min={-15}
        max={15}
        onChange={(v) => {
          const dx = v - cx;
          update({ start: [sx + dx, sz], end: [ex + dx, ez] });
        }}
      />
      <StepperRow
        label="中心 Z"
        value={cz}
        step={0.1}
        min={-15}
        max={15}
        onChange={(v) => {
          const dz = v - cz;
          update({ start: [sx, sz + dz], end: [ex, ez + dz] });
        }}
      />
      {(isHorizontal || isVertical) && (
        <div className="pt-1.5 border-t border-gray-100">
          <ToggleRow
            label="朝向"
            options={[
              { label: '水平', value: 'horizontal' },
              { label: '垂直', value: 'vertical' },
            ]}
            value={isVertical ? 'vertical' : 'horizontal'}
            onChange={(v) => {
              // 绕中心 90° 旋转: 水平↔垂直
              const targetIsVertical = v === 'vertical';
              if (targetIsVertical && isHorizontal) {
                update({ start: [cx, cz - length / 2], end: [cx, cz + length / 2] });
              } else if (!targetIsVertical && isVertical) {
                update({ start: [cx - length / 2, cz], end: [cx + length / 2, cz] });
              }
            }}
          />
        </div>
      )}
      <div className="text-[10px] text-gray-400 font-medium pt-1">墙体尺寸</div>
      <StepperRow
        label="长度"
        value={length}
        step={0.1}
        min={0.3}
        max={20}
        onChange={(v) => {
          // 沿 start→end 方向缩放 end 点, 保持墙体方向不变
          const dx = ex - sx;
          const dz = ez - sz;
          const curLen = Math.sqrt(dx * dx + dz * dz);
          if (curLen < 0.001) return; // 防止零向量
          const scale = v / curLen;
          update({ end: [sx + dx * scale, sz + dz * scale] });
        }}
      />
      {height !== undefined && (
        <StepperRow
          label="高度"
          value={height}
          step={0.1}
          min={1.5}
          max={4}
          onChange={(v) => update({ height: v })}
        />
      )}
    </div>
  );
}

/* ==================== 户外 ==================== */

export function CommonOutdoorRows<T extends GroundItem | OutdoorObject>({
  item,
  update,
  sizeMax = 100,
}: {
  item: T;
  update: (patch: Partial<T>) => void;
  sizeMax?: number;
}) {
  return (
    <>
      <PositionRows
        position={item.position}
        onChange={(p) => update({ position: p } as Partial<T>)}
        withY
      />
      <RotationControl
        value={item.rotation}
        onChange={(v) => update({ rotation: Math.round(v) } as Partial<T>)}
      />
      <SizeRows
        size={item.size}
        onChange={(s) => update({ size: s } as Partial<T>)}
        max={sizeMax}
      />
      <ColorRow
        label="颜色"
        value={item.color}
        onChange={(v) => update({ color: v } as Partial<T>)}
      />
    </>
  );
}
