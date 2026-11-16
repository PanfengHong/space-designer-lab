import { ToggleRow } from '../../../../components/ui/PropertyControls';
import type { FurnitureConfigProps } from '../../../types';

/** 淋浴间形状: 四分之一圆 / 长方形 */
export function ShowerConfig({ data, update }: FurnitureConfigProps) {
  if (!data.shape) return null;
  return (
    <div className="pt-1.5 border-t border-gray-100">
      <ToggleRow
        label="形状"
        options={[
          { label: '长方形', value: 'rect' },
          { label: '四分之一圆', value: 'quarter' },
        ]}
        value={data.shape}
        onChange={(v) => update({ shape: v as 'rect' | 'quarter' })}
      />
    </div>
  );
}
