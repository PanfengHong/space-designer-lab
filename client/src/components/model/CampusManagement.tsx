import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, LogOut, Trees, Loader2, ChevronDown, User, Settings, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ModelCard } from './ModelCard';
import { ModelForm } from './ModelForm';
import { getModelList, createModel, updateModel, deleteModel } from '../../api/mockApi';
import type { ModelItem } from '../../types';

/** 户外空间模型库 — 园区/场地管理 */
export function CampusManagement() {
  const { currentUser, logout, setActiveModelId } = useAppStore();
  const navigate = useNavigate();

  const [items, setItems] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ModelItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ModelItem | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    const list = await getModelList('campus');
    setItems(list);
    setLoading(false);
  }, []);

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
    window.open(`/outdoor-designer/${item.id}`, '_blank');
  };

  const handleFormSave = async (data: Partial<ModelItem>) => {
    if (editingItem) {
      await updateModel(editingItem.id, data);
    } else {
      await createModel({
        name: data.name!,
        category: 'campus',
        type: data.type,
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
      {/* 顶部导航 */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 select-none shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/home')}
            className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-700 transition-colors"
            title="返回工作台"
          >
            <Trees size={17} className="text-white" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm tracking-wide">BASE</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-900 text-sm font-medium">园区管理</span>
            </div>
            <div className="text-[10px] text-gray-400 tracking-widest uppercase">Outdoor Space Library</div>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="ml-2 flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={12} />
            工作台
          </button>
        </div>

        <div className="flex items-center gap-3">
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

      {/* 卡片网格 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex items-center justify-end gap-3 mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索园区名称或标签..."
              className="w-56 pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-gray-400 bg-white"
            />
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-900 text-white hover:bg-gray-800 rounded-md transition-colors"
          >
            <Plus size={14} />
            新增园区
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Trees size={32} className="mb-2 opacity-40" />
            <span className="text-xs">暂无园区，点击"新增园区"创建</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
        )}
      </div>

      {formOpen && (
        <ModelForm
          item={editingItem}
          category="campus"
          onSave={handleFormSave}
          onClose={() => { setFormOpen(false); setEditingItem(null); }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl w-[360px] p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-xs text-gray-500 mb-5">
              确定要删除园区「{deleteConfirm.name}」吗？此操作不可撤销。
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
