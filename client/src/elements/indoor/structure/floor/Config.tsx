import type { Room, SceneData } from '../../../../types';
import {
  FLOOR_MATERIALS,
  FLOOR_MATERIAL_ORDER,
  defaultFloorForRoom,
} from '../../../../data/floorMaterials';
import { StepperRow, PropRow } from '../../../../components/ui/PropertyControls';

/**
 * 地板自定义配置 —— 尺寸 (只读宽深) + 板厚/地板高度/层高 + 地面材质。
 * update 的 patch 直接走 store 的 updateStructure('floor:<roomId>', patch)。
 */
export function FloorConfig({
  room,
  sceneData,
  update,
}: {
  room: Room;
  sceneData: SceneData;
  update: (patch: Record<string, unknown>) => void;
}) {
  // 房间范围走闭合墙环 (与 3D 地坪/平面图同口径)
  const xs = room.walls.flatMap((w) => [w.start[0], w.end[0]]);
  const zs = room.walls.flatMap((w) => [w.start[1], w.end[1]]);
  const width = Math.max(...xs) - Math.min(...xs);
  const depth = Math.max(...zs) - Math.min(...zs);

  const floorMaterial = room.floorMaterial ?? defaultFloorForRoom(room);
  const floorMaterialAuto = room.floorMaterial == null;

  return (
    <>
      <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
        <div className="text-[10px] text-gray-400 font-medium pt-1">尺寸 (宽×深)</div>
        <PropRow label="宽" value={`${width.toFixed(2)} m`} />
        <PropRow label="深" value={`${depth.toFixed(2)} m`} />
      </div>
      <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
        <div className="text-[10px] text-gray-400 font-medium pt-1">地板参数</div>
        <StepperRow
          label="板厚"
          value={sceneData.floorThickness}
          step={0.05}
          min={0.05}
          max={0.5}
          onChange={(v) => update({ floorThickness: v })}
        />
        <StepperRow
          label="地板高度"
          value={room.floorHeight}
          step={0.05}
          min={0}
          max={2}
          onChange={(v) => update({ floorHeight: v })}
        />
        <StepperRow
          label="层高"
          value={sceneData.ceilingHeight}
          step={0.1}
          min={2}
          max={4}
          onChange={(v) => update({ ceilingHeight: v })}
        />
      </div>

      {/* 地面材质 — 每间房各自一份, 未指定时按空间类型派生 */}
      <div className="space-y-2 pt-1.5 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-gray-400 font-medium pt-1">地板材质</div>
          {floorMaterialAuto ? (
            <span className="ml-auto text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              按空间类型自动
            </span>
          ) : (
            <button
              onClick={() => update({ floorMaterial: undefined })}
              className="ml-auto text-[9px] text-gray-400 hover:text-gray-600 transition-colors"
              title="清除手动指定, 恢复按空间类型匹配"
            >
              恢复自动
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {FLOOR_MATERIAL_ORDER.map((mid) => {
            const m = FLOOR_MATERIALS[mid];
            const active = floorMaterial === mid;
            return (
              <button
                key={mid}
                onClick={() => update({ floorMaterial: mid })}
                title={`${m.label} · ${m.hint}`}
                className={`rounded-md border p-1 text-left transition-colors ${
                  active
                    ? 'border-emerald-400 bg-emerald-50/70'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span
                  className="block h-6 rounded-[3px] mb-1 border border-black/5"
                  style={{ backgroundColor: m.swatch }}
                />
                <span
                  className={`block text-[10px] leading-tight ${
                    active ? 'text-emerald-700 font-medium' : 'text-gray-500'
                  }`}
                >
                  {m.short}
                </span>
              </button>
            );
          })}
        </div>
        <div className="text-[9px] text-gray-400 leading-relaxed">
          {FLOOR_MATERIALS[floorMaterial as keyof typeof FLOOR_MATERIALS]?.hint ?? ''}
        </div>
      </div>
    </>
  );
}
