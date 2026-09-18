import { ChevronDown, ChevronRight, Lock, LockOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FurnitureCatalog } from '../panel/FurnitureCatalog';

export function LeftPanel() {
  const {
    spaces,
    selectSpace,
    activeSpaceId,
    layers,
    toggleLayer,
    styles,
    designStyleId,
    selectStyle,
    leftPanelOpen,
    toggleLeftPanel,
    sceneData,
    selectedFurnitureId,
    selectFurniture,
    selectedStructureId,
    selectStructure,
  } = useAppStore();

  const [expandedSections, setExpandedSections] = useState({
    spaces: true,
    layers: true,
    styles: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // 子元素列表的展开状态 (建筑层子类)
  const [buildingSub, setBuildingSub] = useState({ walls: false, doors: false, windows: false });
  const [interiorSub, setInteriorSub] = useState({ furniture: true, catalog: true });

  // 收集建筑结构元素
  const allWalls = sceneData.rooms.flatMap((r) => r.walls.map((w) => ({ ...w, roomId: r.id, roomName: r.name })));
  const allDoors = sceneData.rooms.flatMap((r) => r.doors.map((d) => ({ ...d, roomId: r.id, roomName: r.name })));
  const allWindows = sceneData.rooms.flatMap((r) =>
    [
      ...(r.windows ?? []).map((w) => ({ ...w, kind: 'window' as const, roomId: r.id, roomName: r.name })),
      ...(r.bayWindows ?? []).map((w) => ({ ...w, kind: 'bay' as const, roomId: r.id, roomName: r.name })),
      ...(r.frenchWindows ?? []).map((w) => ({ ...w, kind: 'french' as const, roomId: r.id, roomName: r.name })),
    ]
  );
  const allFurniture = sceneData.rooms.flatMap((r) => r.furniture.map((f) => ({ ...f, roomId: r.id, roomName: r.name })));

  const buildingLocked = layers.find((l) => l.id === 'building')?.locked ?? true;
  const interiorLocked = layers.find((l) => l.id === 'interior')?.locked ?? true;

  return (
    <>
      {/* 收起状态: 悬浮展开按钮 */}
      {!leftPanelOpen && (
        <button
          onClick={toggleLeftPanel}
          className="absolute top-14 left-2 z-30 w-8 h-8 bg-white/90 backdrop-blur-md rounded-lg border border-gray-200 shadow-md flex items-center justify-center hover:bg-white transition-all hover:shadow-lg"
          title="展开左侧栏"
        >
          <PanelLeftOpen size={16} className="text-gray-600" />
        </button>
      )}

      {/* 左侧栏主体 — 固定宽度 256px, 由父容器控制宽度动画 */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full select-none shrink-0 overflow-y-auto">
        {/* 空间目录 */}
        <div className="panel-section">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('spaces')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.spaces ? (
                <ChevronDown size={14} className="text-gray-500" />
              ) : (
                <ChevronRight size={14} className="text-gray-500" />
              )}
              <span className="text-xs font-semibold text-gray-800 tracking-wide">空间目录</span>
              <span className="text-[10px] text-gray-400">{spaces.length}</span>
            </div>
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
          </div>
          {expandedSections.spaces && (
            <div className="pb-2">
              {spaces.map((space) => (
                <div
                  key={space.id}
                  className={`px-4 py-2 cursor-pointer transition-colors ${
                    activeSpaceId === space.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => selectSpace(space.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-4">{String(space.order).padStart(2, '0')}</span>
                    <span className={`text-xs ${activeSpaceId === space.id ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                      {space.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 模型分层 — 解锁后展示子元素 */}
        <div className="panel-section">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('layers')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.layers ? (
                <ChevronDown size={14} className="text-gray-500" />
              ) : (
                <ChevronRight size={14} className="text-gray-500" />
              )}
              <span className="text-xs font-semibold text-gray-800 tracking-wide">MODEL LAYERS</span>
            </div>
            <span className="text-[10px] text-gray-400">模型分层</span>
          </div>

          {expandedSections.layers && (
            <div className="pb-2">
              {/* 建筑结构层 */}
              <div className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="text-xs text-gray-800">建筑结构层</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">墙体 楼板 门窗</div>
                </div>
                <button
                  onClick={() => toggleLayer('building')}
                  className={`transition-colors ${buildingLocked ? 'text-red-500' : 'text-green-600'}`}
                  title={buildingLocked ? '已锁定 (不可选中)' : '已解锁 (可选中)'}
                >
                  {buildingLocked ? <Lock size={15} /> : <LockOpen size={15} />}
                </button>
              </div>

              {/* 建筑结构子元素 (解锁后显示) */}
              {!buildingLocked && (
                <div className="ml-4 border-l border-gray-100">
                  {/* 墙体列表 */}
                  <div
                    className="px-2 py-1.5 cursor-pointer flex items-center gap-1 hover:bg-gray-50"
                    onClick={() => setBuildingSub((s) => ({ ...s, walls: !s.walls }))}
                  >
                    {buildingSub.walls ? <ChevronDown size={11} className="text-gray-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                    <span className="text-[10px] text-gray-500">墙体 ({allWalls.length})</span>
                  </div>
                  {buildingSub.walls && (
                    <div className="max-h-32 overflow-y-auto">
                      {allWalls.map((w) => (
                        <div
                          key={`${w.roomId}:${w.id}`}
                          className={`px-3 py-1 cursor-pointer text-[10px] truncate ${
                            selectedStructureId === `wall:${w.roomId}:${w.id}` ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                          onClick={() => selectStructure(`wall:${w.roomId}:${w.id}`)}
                          title={`${w.roomName} ${w.id}`}
                        >
                          {w.roomName} {w.id}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 门列表 */}
                  <div
                    className="px-2 py-1.5 cursor-pointer flex items-center gap-1 hover:bg-gray-50"
                    onClick={() => setBuildingSub((s) => ({ ...s, doors: !s.doors }))}
                  >
                    {buildingSub.doors ? <ChevronDown size={11} className="text-gray-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                    <span className="text-[10px] text-gray-500">门 ({allDoors.length})</span>
                  </div>
                  {buildingSub.doors && (
                    <div className="max-h-32 overflow-y-auto">
                      {allDoors.map((d) => (
                        <div
                          key={`${d.roomId}:${d.id}`}
                          className={`px-3 py-1 cursor-pointer text-[10px] truncate ${
                            selectedStructureId === `door:${d.roomId}:${d.id}` ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                          onClick={() => selectStructure(`door:${d.roomId}:${d.id}`)}
                          title={`${d.roomName} ${d.id}`}
                        >
                          {d.roomName} {d.id}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 窗列表 */}
                  <div
                    className="px-2 py-1.5 cursor-pointer flex items-center gap-1 hover:bg-gray-50"
                    onClick={() => setBuildingSub((s) => ({ ...s, windows: !s.windows }))}
                  >
                    {buildingSub.windows ? <ChevronDown size={11} className="text-gray-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                    <span className="text-[10px] text-gray-500">窗 ({allWindows.length})</span>
                  </div>
                  {buildingSub.windows && (
                    <div className="max-h-32 overflow-y-auto">
                      {allWindows.map((w) => (
                        <div
                          key={`${w.roomId}:${w.id}`}
                          className={`px-3 py-1 cursor-pointer text-[10px] truncate ${
                            selectedStructureId === `${w.kind}:${w.roomId}:${w.id}` ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                          onClick={() => selectStructure(`${w.kind}:${w.roomId}:${w.id}`)}
                          title={`${w.roomName} ${w.id}`}
                        >
                          {w.roomName} {w.id}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 室内设计层 */}
              <div className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="text-xs text-gray-800">室内设计层</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">家具 家电 装饰</div>
                </div>
                <button
                  onClick={() => toggleLayer('interior')}
                  className={`transition-colors ${interiorLocked ? 'text-red-500' : 'text-green-600'}`}
                  title={interiorLocked ? '已锁定 (不可选中)' : '已解锁 (可选中)'}
                >
                  {interiorLocked ? <Lock size={15} /> : <LockOpen size={15} />}
                </button>
              </div>

              {/* 室内设计子元素 (解锁后显示) */}
              {!interiorLocked && (
                <div className="ml-4 border-l border-gray-100">
                  {/* 家具列表 */}
                  <div
                    className="px-2 py-1.5 cursor-pointer flex items-center gap-1 hover:bg-gray-50"
                    onClick={() => setInteriorSub((s) => ({ ...s, furniture: !s.furniture }))}
                  >
                    {interiorSub.furniture ? <ChevronDown size={11} className="text-gray-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                    <span className="text-[10px] text-gray-500">现有家具 ({allFurniture.length})</span>
                  </div>
                  {interiorSub.furniture && (
                    <div className="max-h-40 overflow-y-auto">
                      {allFurniture.length === 0 ? (
                        <div className="px-3 py-1 text-[10px] text-gray-400">暂无家具</div>
                      ) : (
                        allFurniture.map((f) => (
                          <div
                            key={f.id}
                            className={`px-3 py-1 cursor-pointer text-[10px] truncate ${
                              selectedFurnitureId === f.id ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                            onClick={() => selectFurniture(f.id)}
                            title={`${f.roomName} ${f.name}`}
                          >
                            {f.name}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* 素材库 */}
                  <div
                    className="px-2 py-1.5 cursor-pointer flex items-center gap-1 hover:bg-gray-50"
                    onClick={() => setInteriorSub((s) => ({ ...s, catalog: !s.catalog }))}
                  >
                    {interiorSub.catalog ? <ChevronDown size={11} className="text-gray-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                    <span className="text-[10px] text-gray-500">素材库</span>
                  </div>
                  {interiorSub.catalog && <FurnitureCatalog />}
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
              {expandedSections.styles ? (
                <ChevronDown size={14} className="text-gray-500" />
              ) : (
                <ChevronRight size={14} className="text-gray-500" />
              )}
              <span className="text-xs font-semibold text-gray-800 tracking-wide">DESIGN STYLE</span>
            </div>
            <span className="text-[10px] text-gray-400">参考与设计</span>
          </div>
          {expandedSections.styles && (
            <div className="p-2">
              {styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => selectStyle(style.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-md mb-1.5 transition-all ${
                    style.id === designStyleId
                      ? 'bg-gray-100 ring-1 ring-gray-400'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-md ring-1 ring-gray-200 flex-shrink-0"
                    style={{
                      background:
                        style.id === 'style2'
                          ? 'linear-gradient(135deg, #d4c5b0 0%, #8b7355 100%)'
                          : style.id === 'style3'
                          ? 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)'
                          : style.id === 'style1'
                          ? 'linear-gradient(135deg, #c8a882 0%, #8b6914 100%)'
                          : style.color,
                    }}
                  />
                  <div className="text-left">
                    <div className="text-xs font-medium text-gray-800">{style.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 tracking-wide">{style.code}</div>
                  </div>
                </button>
              ))}
              <div className="text-[10px] text-gray-400 text-center mt-3 px-2">
                切换整套家具与设计，保留当前镜头。
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
