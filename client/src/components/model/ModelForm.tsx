import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { ModelItem, ModelCategory } from '../../types';

interface ModelFormProps {
  item: ModelItem | null;        // null = 新增, 非 null = 编辑
  category: ModelCategory;       // 当前 tab
  onSave: (data: Partial<ModelItem>) => void;
  onClose: () => void;
}

const FURNITURE_TYPES = [
  { value: 'sofa', label: '沙发' },
  { value: 'bed', label: '床' },
  { value: 'table', label: '桌' },
  { value: 'cabinet', label: '柜' },
  { value: 'chair', label: '椅' },
  { value: 'fridge', label: '冰箱' },
  { value: 'washer', label: '洗衣机' },
  { value: 'toilet', label: '马桶' },
  { value: 'sink', label: '洗手台' },
  { value: 'shower', label: '淋浴' },
  { value: 'stove', label: '灶台' },
  { value: 'appliance', label: '家电' },
  { value: 'decor', label: '装饰' },
];

const APARTMENT_TYPES = [
  { value: 'one-bed', label: '一居室' },
  { value: 'two-bed', label: '两居室' },
  { value: 'three-bed', label: '三居室' },
  { value: 'modern', label: '现代三居' },
];

const COLOR_PRESETS = [
  '#e8e0d4', '#d4c5b0', '#c8b8a0', '#a08060',
  '#8b7355', '#5c4033', '#3d3d3d', '#1a1a1a',
  '#f5f5f5', '#e0e0e0', '#fafafa', '#a8d0e6',
];

export function ModelForm({ item, category, onSave, onClose }: ModelFormProps) {
  const isEdit = !!item;
  const types = category === 'furniture' ? FURNITURE_TYPES : APARTMENT_TYPES;

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [sizeW, setSizeW] = useState(1);
  const [sizeH, setSizeH] = useState(1);
  const [sizeD, setSizeD] = useState(1);
  const [color, setColor] = useState('#e8e0d4');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setType(item.type ?? '');
      if (item.size) {
        setSizeW(item.size[0]);
        setSizeH(item.size[1]);
        setSizeD(item.size[2]);
      }
      setColor(item.color ?? '#e8e0d4');
      setTags(item.tags.join(', '));
    } else {
      setName('');
      setType(types[0]?.value ?? '');
      setSizeW(1); setSizeH(1); setSizeD(1);
      setColor('#e8e0d4');
      setTags('');
    }
  }, [item]);

  const handleSave = () => {
    if (!name.trim()) return;
    const data: Partial<ModelItem> = {
      name: name.trim(),
      category,
      type,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    if (category === 'furniture') {
      data.size = [sizeW, sizeH, sizeD];
      data.color = color;
    }
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-[480px] max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            {isEdit ? '编辑模型' : '新增模型'}
            <span className="ml-2 text-xs text-gray-400 font-normal">
              {category === 'furniture' ? '家具模型' : '户型模板'}
            </span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* 表单 */}
        <div className="p-5 space-y-4">
          {/* 名称 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入模型名称"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-400"
            />
          </div>

          {/* 类型 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-400 bg-white"
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* 家具尺寸 + 颜色 */}
          {category === 'furniture' && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">尺寸 (米)</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="number" step="0.1" min="0.1"
                      value={sizeW}
                      onChange={(e) => setSizeW(parseFloat(e.target.value) || 0.1)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-400"
                    />
                    <span className="text-[10px] text-gray-400">宽</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number" step="0.1" min="0.1"
                      value={sizeH}
                      onChange={(e) => setSizeH(parseFloat(e.target.value) || 0.1)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-400"
                    />
                    <span className="text-[10px] text-gray-400">高</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number" step="0.1" min="0.1"
                      value={sizeD}
                      onChange={(e) => setSizeD(parseFloat(e.target.value) || 0.1)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-400"
                    />
                    <span className="text-[10px] text-gray-400">深</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">颜色</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-md border-2 transition-all ${
                        color === c ? 'border-gray-900 scale-110' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 标签 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">标签 (逗号分隔)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="如: 客厅, 布艺, 储物"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-gray-400"
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs bg-gray-900 text-white hover:bg-gray-800 rounded-md transition-colors"
          >
            {isEdit ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
