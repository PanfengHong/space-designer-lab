import type { Window } from '../../../../types';
import { ToggleRow } from '../../../../components/ui/PropertyControls';

/** 窗自定义配置 —— 窗样式 (默认 / 推拉) */
export function WindowConfig({
  item,
  update,
}: {
  item: Window;
  update: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="pt-1.5 border-t border-gray-100">
      <ToggleRow
        label="窗样式"
        options={[
          { label: '默认', value: 'default' },
          { label: '推拉', value: 'sliding' },
        ]}
        value={item.style ?? 'default'}
        onChange={(v) => update({ style: v as 'default' | 'sliding' })}
      />
    </div>
  );
}
