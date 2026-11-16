import type { Door } from '../../../../types';
import { ToggleRow } from '../../../../components/ui/PropertyControls';

/** 门自定义配置 —— 开门方向 + 铰链位置 (通用配置之外的字段) */
export function DoorConfig({
  item,
  update,
}: {
  item: Door;
  update: (patch: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div className="pt-1.5 border-t border-gray-100">
        <ToggleRow
          label="开门方向"
          options={[
            { label: '向室外', value: 'false' },
            { label: '向室内', value: 'true' },
          ]}
          value={String(item.openInward ?? false)}
          onChange={(v) => update({ openInward: v === 'true' })}
        />
      </div>
      <div className="pt-1.5 border-t border-gray-100">
        <ToggleRow
          label="铰链位置"
          options={[
            { label: '左', value: 'left' },
            { label: '右', value: 'right' },
          ]}
          value={item.hingeSide ?? 'left'}
          onChange={(v) => update({ hingeSide: v as 'left' | 'right' })}
        />
      </div>
    </>
  );
}
