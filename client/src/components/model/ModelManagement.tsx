import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, LogOut, Building2, Loader2, ChevronDown, User, Settings, ArrowLeft, LayoutGrid, Briefcase } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ModelCard } from './ModelCard';
import { ModelForm } from './ModelForm';
import { getModelList, createModel, updateModel, deleteModel } from '../../api/mockApi';
import type { ModelItem } from '../../types';

/** 模型大类切换项 */
const CATEGORY_TABS = [
  { key: 'apartment' as const, label: '户型', en: 'Apartment', icon: LayoutGrid },
  { key: 'office' as const, label: '办公空间', en: 'Office', icon: Briefcase },
];

export function ModelManagement() {
  const { currentUser, logout, setActiveModelId } = useAppStore();
  const navigate = useNavigate();

  const [items, setItems] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<'apartment' | 'office'>('apartment');
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ModelItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ModelItem | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  const loadList = useCallback(async () => {
    setLoading(true);
    const list = await getModelList(category);
    setItems(list);
    setLoading(false);
  }, [category]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const filtered = items.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: ModelItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDelete = (item: ModelItem) => {
    setDeleteConfirm(item);
  };

  const handleEnter = (item: ModelItem) => {
    setActiveModelId(item.id);
    window.open(`/designer/${item.id}`, '_blank');
  };

  const handleFormSave = async (data: Partial<ModelItem>) => {
    if (editingItem) {
      await updateModel(editingItem.id, data);
    } else {
      await createModel({
        name: data.name!,
        category,
        type: data.type,
        size: data.size,
        color: data.color,
        tags: data.tags ?? [],
      });
    }
    setFormOpen(false);
    setEditingItem(null);
    loadList();
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm) {
      await deleteModel(deleteConfirm.id);
      setDeleteConfirm(null);
      loadList();
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* 顶部导航 — 含搜索与新增按钮 */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm tracking-wide">BASE</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-900 text-sm font-medium">
                {category === 'office' ? '办公空间' : '户型管理'}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 tracking-widest uppercase">
              {category === 'office' ? 'Office Library' : 'Apartment Library'}
            </div>
          </div>          
        </div>

        {/* 右侧: 用户信息 + 下拉菜单 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/home')}
            title="返回工作台"
            className="ml-3 flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ArrowLeft size={13} />
            返回工作台
          </button>
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-medium">
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-xs text-gray-600">{currentUser?.username || '用户'}</span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="text-xs font-medium text-gray-900">{currentUser?.username || '用户'}</div>
                  <div className="text-[10px] text-gray-400">已登录</div>
                </div>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                  <User size={13} />
                  个人中心
                </button>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                  <Settings size={13} />
                  设置
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={13} />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 模型库内容 — 居中布局 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* 标题区 (居中) */}
          <div className="text-center">
            <div className="text-[10px] tracking-[0.32em] text-gray-400 uppercase">Space Library</div>
            <h1 className="text-2xl font-semibold text-gray-900 mt-2 tracking-tight">
              {category === 'office' ? '办公空间库' : '户型库'}
            </h1>
            <p className="text-xs text-gray-500 mt-2">
              {category === 'office'
                ? '写字楼、开放办公、会议室与独立办公的室内设计模型'
                : '住宅户型模型，支持墙体、门窗、飘窗与家具布置'}
            </p>
          </div>

          {/* 大号分类切换 (居中) */}
          <div className="mt-7 flex justify-center">
            <div className="inline-flex items-center gap-1.5 p-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
              {CATEGORY_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = category === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setCategory(tab.key); setSearchQuery(''); }}
                    className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full text-sm transition-all ${
                      active
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="font-medium">{tab.label}</span>
                    <span className={`text-[10px] tracking-wider uppercase ${active ? 'text-white/50' : 'text-gray-300'}`}>
                      {tab.en}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 搜索 + 新增 (居中) */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索名称或标签..."
                className="w-64 h-11 pl-10 pr-4 text-sm border border-gray-200 rounded-full bg-white focus:outline-none focus:border-gray-400"
              />
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 h-11 px-6 text-sm font-medium bg-gray-900 text-white rounded-full shadow-lg shadow-gray-900/10 hover:bg-gray-800 active:scale-[0.98] transition-all"
            >
              <Plus size={16} />
              {category === 'office' ? '新增办公空间' : '新增户型'}
            </button>
          </div>

          {/* 模型网格 */}
          <div className="mt-9">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-gray-400">
                <Loader2 size={20} className="animate-spin mr-2" />
                加载中...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Building2 size={36} className="mb-3 opacity-30" />
                <span className="text-xs">
                  暂无{category === 'office' ? '办公空间' : '户型'}，点击「
                  {category === 'office' ? '新增办公空间' : '新增户型'}」创建
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 px-0.5">
                  <span className="text-[11px] text-gray-400">
                    {category === 'office' ? '办公空间' : '户型'} · 共 {filtered.length} 个
                  </span>
                  {searchQuery.trim() && (
                    <span className="text-[11px] text-gray-400">搜索「{searchQuery.trim()}」</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map((item) => (
                    <ModelCard
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onEnter={handleEnter}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      {formOpen && (
        <ModelForm
          item={editingItem}
          category={category}
          onSave={handleFormSave}
          onClose={() => { setFormOpen(false); setEditingItem(null); }}
        />
      )}

      {/* 删除确认 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl w-[360px] p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-xs text-gray-500 mb-5">
              确定要删除「{deleteConfirm.name}」吗？此操作不可撤销。
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 text-xs bg-red-500 text-white hover:bg-red-600 rounded-md transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
