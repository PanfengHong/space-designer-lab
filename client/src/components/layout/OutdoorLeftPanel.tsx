import { ChevronDown, ChevronRight, Lock, LockOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { OutdoorCatalog } from '../panel/OutdoorCatalog';
import { OUTDOOR_STYLE_OPTIONS } from '../../constants/outdoorStyles';

const GROUND_TYPE_LABEL: Record<string, string> = {
  ground: '地面', grass: '草地', river: '河流', road: '道路',
};
const OBJECT_TYPE_LABEL: Record<string, string> = {
  building: '玻璃建筑', warehouse: '厂房仓库', car: '轿车', truck: '卡车',
};

export function OutdoorLeftPanel() {
  const {
    layers,
    toggleLayer,
    designStyleId,
    selectStyle,
    leftPanelOpen,
    toggleLeftPanel,
    outdoorSceneData,
    selectedGroundId,
    selectGround,
    selectedOutdoorObjectId,
    selectOutdoorObject,
  } = useAppStore();

  const [expandedSections, setExpandedSections] = useState({ layers: true, styles: true });
  const [groundSub, setGroundSub] = useState({ items: true, catalog: true });
  const [objectSub, setObjectSub] = useState({ items: true, catalog: true });

  const toggleSection = (s: keyof typeof expandedSections) =>
    setExpandedSections((prev) => ({ ...prev, [s]: !prev[s] }));

  const groundLocked = layers.find((l) => l.id === 'ground')?.locked ?? true;
  const spaceLocked = layers.find((l) => l.id === 'space')?.locked ?? true;

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
        {/* 模型分层 */}
        <div className="panel-section">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('layers')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.layers ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
              <span className="text-xs font-semibold text-gray-800 tracking-wide">MODEL LAYERS</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">模型分层</span>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLeftPanel(); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="收起左侧栏"
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
          </div>

          {expandedSections.layers && (
            <div className="pb-2">
              {/* 地面结构层 */}
              <div className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="text-xs text-gray-800">地面结构层</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">地面 草地 河流 道路</div>
                </div>
                <button
                  onClick={() => toggleLayer('ground')}
                  className={`transition-colors ${groundLocked ? 'text-red-500' : 'text-green-600'}`}
                  title={groundLocked ? '已锁定 (不可选中)' : '已解锁 (可选中)'}
                >
                  {groundLocked ? <Lock size={15} /> : <LockOpen size={15} />}
                </button>
              </div>

              {!groundLocked && (
                <div className="ml-4 border-l border-gray-100">
                  <div
                    className="px-2 py-1.5 cursor-pointer flex items-center gap-1 hover:bg-gray-50"
                    onClick={() => setGroundSub((s) => ({ ...s, items: !s.items }))}
                  >
                    {groundSub.items ? <ChevronDown size={11} className="text-gray-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                    <span className="text-[10px] text-gray-500">现有元素 ({outdoorSceneData.ground.length})</span>
                  </div>
                  {groundSub.items && (
                    <div className="max-h-44 overflow-y-auto">
                      {outdoorSceneData.ground.length === 0 ? (
                        <div className="px-3 py-1 text-[10px] text-gray-400">暂无地面元素</div>
                      ) : (
                        outdoorSceneData.ground.map((g) => (
                          <div
                            key={g.id}
                            className={`px-3 py-1 cursor-pointer text-[10px] truncate flex items-center gap-1.5 ${
                              selectedGroundId === g.id ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                            onClick={() => selectGround(g.id)}
                            title={g.name}
                          >
                            <span className="text-gray-400 w-7 shrink-0">[{GROUND_TYPE_LABEL[g.type] ?? g.type}]</span>
                            <span className="truncate">{g.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div
                    className="px-2 py-1.5 cursor-pointer flex items-center gap-1 hover:bg-gray-50"
                    onClick={() => setGroundSub((s) => ({ ...s, catalog: !s.catalog }))}
                  >
                    {groundSub.catalog ? <ChevronDown size={11} className="text-gray-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                    <span className="text-[10px] text-gray-500">素材库</span>
                  </div>
                  {groundSub.catalog && <OutdoorCatalog kind="ground" />}
                </div>
              )}

              {/* 空间设计层 */}
              <div className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="text-xs text-gray-800">空间设计层</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">车辆 建筑</div>
                </div>
                <button
                  onClick={() => toggleLayer('space')}
                  className={`transition-colors ${spaceLocked ? 'text-red-500' : 'text-green-600'}`}
                  title={spaceLocked ? '已锁定 (不可选中)' : '已解锁 (可选中)'}
                >
                  {spaceLocked ? <Lock size={15} /> : <LockOpen size={15} />}
                </button>
              </div>

              {!spaceLocked && (
                <div className="ml-4 border-l border-gray-100">
                  <div
                    className="px-2 py-1.5 cursor-pointer flex items-center gap-1 hover:bg-gray-50"
                    onClick={() => setObjectSub((s) => ({ ...s, items: !s.items }))}
                  >
                    {objectSub.items ? <ChevronDown size={11} className="text-gray-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                    <span className="text-[10px] text-gray-500">现有对象 ({outdoorSceneData.objects.length})</span>
                  </div>
                  {objectSub.items && (
                    <div className="max-h-44 overflow-y-auto">
                      {outdoorSceneData.objects.length === 0 ? (
                        <div className="px-3 py-1 text-[10px] text-gray-400">暂无空间对象</div>
                      ) : (
                        outdoorSceneData.objects.map((o) => (
                          <div
                            key={o.id}
                            className={`px-3 py-1 cursor-pointer text-[10px] truncate flex items-center gap-1.5 ${
                              selectedOutdoorObjectId === o.id ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                            onClick={() => selectOutdoorObject(o.id)}
                            title={o.name}
                          >
                            <span className="text-gray-400 w-7 shrink-0">[{OBJECT_TYPE_LABEL[o.type] ?? o.type}]</span>
                            <span className="truncate">{o.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div
                    className="px-2 py-1.5 cursor-pointer flex items-center gap-1 hover:bg-gray-50"
                    onClick={() => setObjectSub((s) => ({ ...s, catalog: !s.catalog }))}
                  >
                    {objectSub.catalog ? <ChevronDown size={11} className="text-gray-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                    <span className="text-[10px] text-gray-500">素材库</span>
                  </div>
                  {objectSub.catalog && <OutdoorCatalog kind="object" />}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 设计风格 */}
        <div className="panel-section">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('styles')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.styles ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
              <span className="text-xs font-semibold text-gray-800 tracking-wide">DESIGN STYLE</span>
            </div>
            <span className="text-[10px] text-gray-400">参考与设计</span>
          </div>
          {expandedSections.styles && (
            <div className="p-2">
              {OUTDOOR_STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => selectStyle(style.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-md mb-1.5 transition-all ${
                    style.id === designStyleId ? 'bg-gray-100 ring-1 ring-gray-400' : 'hover:bg-gray-50'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-md ring-1 ring-gray-200 flex-shrink-0"
                    style={{
                      background:
                        style.id === 'park1'
                          ? 'linear-gradient(135deg, #4a90d9 0%, #dceaf6 100%)'
                          : 'linear-gradient(135deg, #ffffff 0%, #d8d8d8 100%)',
                    }}
                  />
                  <div className="text-left">
                    <div className="text-xs font-medium text-gray-800">{style.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 tracking-wide">{style.code}</div>
                  </div>
                </button>
              ))}
              <div className="text-[10px] text-gray-400 text-center mt-3 px-2">
                数字园区蓝白风格, 参考数字化大屏视觉。
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
