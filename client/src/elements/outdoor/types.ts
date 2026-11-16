import type { GroundItem, OutdoorObject } from '../../types';
import type { OutdoorPalette } from '../../constants/outdoorStyles';

/** 户外元素 3D 视图组件的 props (各元素 View3D.tsx 共用) */
export interface ContentProps<TData extends GroundItem | OutdoorObject = GroundItem> {
  data: TData;
  palette: OutdoorPalette;
}
