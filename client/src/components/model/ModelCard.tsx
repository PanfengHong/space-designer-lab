import { Pencil, Trash2, ArrowRight } from 'lucide-react';
import type { ModelItem } from '../../types';
import { ModelThumbnail } from './ModelThumbnail';

interface ModelCardProps {
  item: ModelItem;
  onEdit: (item: ModelItem) => void;
  onDelete: (item: ModelItem) => void;
  onEnter: (item: ModelItem) => void;
}

const TYPE_LABELS: Record<string, string> = {
  sofa: '沙发', bed: '床', table: '桌', cabinet: '柜', chair: '椅',
  fridge: '冰箱', washer: '洗衣机', toilet: '马桶', sink: '洗手台',
  shower: '淋浴', appliance: '家电', decor: '装饰',
  'one-bed': '一居', 'two-bed': '两居', 'three-bed': '三居', 'modern': '现代三居',
  'digital-park': '数字园区', 'industrial-park': '工业园区',
  logistics: '物流园区', 'office-park': '办公园区',
};

export function ModelCard({ item, onEdit, onDelete, onEnter }: ModelCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group">
      {/* 3D 预览区 */}
      <div className="h-24 bg-gradient-to-br from-gray-50 to-gray-100 relative">
        <ModelThumbnail item={item} />
        {/* 类型标签 */}
        <div className="absolute top-1.5 left-1.5">
          <span className="inline-block px-1.5 py-0.5 text-[9px] font-medium bg-white/80 backdrop-blur text-gray-600 rounded">
            {TYPE_LABELS[item.type ?? ''] ?? item.type ?? ''}
          </span>
        </div>
      </div>

      {/* 信息区 */}
      <div className="p-2 space-y-1.5">
        <h3 className="text-xs font-medium text-gray-900 truncate">{item.name}</h3>

        {/* 尺寸信息 */}
        {item.size && (
          <div className="text-[10px] text-gray-400">
            {item.size[0]} × {item.size[2]} × {item.size[1]} m
          </div>
        )}

        {/* 标签 */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-1 py-0.5 text-[9px] bg-gray-100 text-gray-500 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-0.5 pt-0.5">
          <button
            onClick={() => onEdit(item)}
            className="flex items-center gap-0.5 px-1.5 py-1 text-[10px] text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="编辑"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="flex items-center gap-0.5 px-1.5 py-1 text-[10px] text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="删除"
          >
            <Trash2 size={11} />
          </button>
          <button
            onClick={() => onEnter(item)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] ml-auto bg-gray-900 text-white hover:bg-gray-800 rounded transition-colors"
          >
            进入
            <ArrowRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
