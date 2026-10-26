/**
 * 左侧栏通用骨架
 *
 * 原先 LeftPanel / OutdoorLeftPanel 各自手写了一遍「可折叠分组 + 层锁定 + 子项列表」,
 * 结构逐行相同, 只是数据源和标签不同。这里把骨架抽出来, 两个模式只负责喂数据。
 */
import { ChevronDown, ChevronRight, Lock, LockOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

/* ==================== 外壳 ==================== */

/** 左侧栏外壳: 收起时的悬浮展开按钮 + 固定宽度主体 */
export function PanelShell({ children }: { children: React.ReactNode }) {
  const leftPanelOpen = useAppStore((s) => s.leftPanelOpen);
  const toggleLeftPanel = useAppStore((s) => s.toggleLeftPanel);

  return (
    <>
      {!leftPanelOpen && (
        <button
          onClick={toggleLeftPanel}
          className="absolute top-14 left-2 z-30 w-8 h-8 bg-white/90 backdrop-blur-md rounded-lg border border-gray-200 shadow-md flex items-center justify-center hover:bg-white transition-all hover:shadow-lg"
          title="展开左侧栏"
        >
          <PanelLeftOpen size={16} className="text-gray-600" />
        </button>
      )}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full select-none shrink-0 overflow-y-auto">
        {children}
      </div>
    </>
  );
}

/**
 * 可折叠分组标题
 *
 * showCollapse: 是否在标题右侧带「收起左侧栏」按钮。
 * 每个面板只在第一个分组上开一次 (原来两个文件都放在各自的首个分组)。
 */
export function Section({
  title,
  hint,
  expanded,
  onToggle,
  showCollapse,
  children,
}: {
  title: string;
  hint?: string;
  expanded: boolean;
  onToggle: () => void;
  showCollapse?: boolean;
  children?: React.ReactNode;
}) {
  const toggleLeftPanel = useAppStore((s) => s.toggleLeftPanel);

  return (
    <div className="panel-section">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={14} className="text-gray-500" />
          ) : (
            <ChevronRight size={14} className="text-gray-500" />
          )}
          <span className="text-xs font-semibold text-gray-800 tracking-wide">{title}</span>
          {hint !== undefined && <span className="text-[10px] text-gray-400">{hint}</span>}
        </div>
        {showCollapse && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLeftPanel();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="收起左侧栏"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>
      {expanded && <div className="pb-2">{children}</div>}
    </div>
  );
}

/** 分组内的二级折叠行 (无边框, 缩进放在 LayerGroup 里) */
export function SubSection({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div
        className="px-2 py-1.5 cursor-pointer flex items-center gap-1 hover:bg-gray-50"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown size={11} className="text-gray-400" />
        ) : (
          <ChevronRight size={11} className="text-gray-400" />
        )}
        <span className="text-[10px] text-gray-500">{label}</span>
      </div>
      {expanded && children}
    </>
  );
}

/* ==================== 层 ==================== */

/** 一个「层」: 标题 + 副标题 + 锁按钮, 解锁后显示缩进子区 */
export function LayerGroup({
  id,
  name,
  desc,
  locked,
  children,
}: {
  id: string;
  name: string;
  desc: string;
  locked: boolean;
  children?: React.ReactNode;
}) {
  const toggleLayer = useAppStore((s) => s.toggleLayer);

  return (
    <>
      <div className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
        <div>
          <div className="text-xs text-gray-800">{name}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{desc}</div>
        </div>
        <button
          onClick={() => toggleLayer(id)}
          className={`transition-colors ${locked ? 'text-red-500' : 'text-green-600'}`}
          title={locked ? '已锁定 (不可选中)' : '已解锁 (可选中)'}
        >
          {locked ? <Lock size={15} /> : <LockOpen size={15} />}
        </button>
      </div>
      {!locked && <div className="ml-4 border-l border-gray-100">{children}</div>}
    </>
  );
}

/* ==================== 子项列表 ==================== */

export interface PanelItem {
  id: string;
  /** 主文本 (名称) */
  label: string;
  /** 前置类型标签, 如 [墙面] / [草地] */
  tag?: string;
  /** hover 提示 */
  title?: string;
}

/**
 * 场景对象列表 (可点击选中, 选中态高亮)
 * 室内传墙体/门窗/家具, 户外传地面元素/空间对象, 行为一致。
 */
export function ItemList({
  items,
  selectedId,
  onSelect,
  emptyText,
  maxHeight = 'max-h-32',
}: {
  items: PanelItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyText?: string;
  maxHeight?: string;
}) {
  return (
    <div className={`${maxHeight} overflow-y-auto`}>
      {items.length === 0
        ? emptyText && <div className="px-3 py-1 text-[10px] text-gray-400">{emptyText}</div>
        : items.map((it) => (
            <div
              key={it.id}
              className={`px-3 py-1 cursor-pointer text-[10px] truncate flex items-center gap-1.5 ${
                selectedId === it.id
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              onClick={() => onSelect(it.id)}
              title={it.title ?? it.label}
            >
              {it.tag && (
                <span className="text-gray-400 shrink-0">{it.tag}</span>
              )}
              <span className="truncate">{it.label}</span>
            </div>
          ))}
    </div>
  );
}

/* ==================== 风格 ==================== */

export interface PanelStyle {
  id: string;
  code: string;
  label: string;
  /** 缩略色块: 支持纯色或 CSS 渐变 */
  swatch: string;
}

/** 风格选择列表 */
export function StylePicker({ styles, footer }: { styles: PanelStyle[]; footer: string }) {
  const designStyleId = useAppStore((s) => s.designStyleId);
  const selectStyle = useAppStore((s) => s.selectStyle);

  return (
    <div className="p-2">
      {styles.map((style) => (
        <button
          key={style.id}
          onClick={() => selectStyle(style.id)}
          className={`w-full flex items-center gap-3 p-2 rounded-md mb-1.5 transition-all ${
            style.id === designStyleId ? 'bg-gray-100 ring-1 ring-gray-400' : 'hover:bg-gray-50'
          }`}
        >
          <div
            className="w-10 h-10 rounded-md ring-1 ring-gray-200 flex-shrink-0"
            style={{ background: style.swatch }}
          />
          <div className="text-left">
            <div className="text-xs font-medium text-gray-800">{style.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5 tracking-wide">{style.code}</div>
          </div>
        </button>
      ))}
      <div className="text-[10px] text-gray-400 text-center mt-3 px-2">{footer}</div>
    </div>
  );
}
