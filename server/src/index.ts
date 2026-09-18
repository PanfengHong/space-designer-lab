import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 项目存储目录
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 模拟场景数据
const mockSceneData = {
  wallThickness: 0.2,
  ceilingHeight: 2.8,
  floorThickness: 0.15,
  rooms: [
    {
      id: 'hallway',
      name: '玄关',
      floorHeight: 0,
      walls: [
        { id: 'w-h1', start: [0, 0], end: [3, 0], height: 2.8 },
        { id: 'w-h2', start: [3, 0], end: [3, 1.5], height: 2.8 },
        { id: 'w-h3', start: [3, 1.5], end: [0, 1.5], height: 2.8 },
        { id: 'w-h4', start: [0, 1.5], end: [0, 0], height: 2.8 },
      ],
      doors: [{ id: 'd-h1', position: [1.5, 0, 0], width: 1.0, height: 2.1 }],
      windows: [],
      furniture: [
        { id: 'f-h1', name: '鞋柜', position: [0.4, 0, 0.7], rotation: 0, size: [0.9, 0.35, 1.0], type: 'cabinet', color: '#8b7355' },
      ],
    },
    {
      id: 'living',
      name: '客厅',
      floorHeight: 0,
      walls: [
        { id: 'w-l1', start: [3, 1.5], end: [9, 1.5], height: 2.8 },
        { id: 'w-l2', start: [9, 1.5], end: [9, 5.5], height: 2.8 },
        { id: 'w-l3', start: [9, 5.5], end: [3, 5.5], height: 2.8 },
        { id: 'w-l4', start: [3, 5.5], end: [3, 1.5], height: 2.8 },
      ],
      doors: [{ id: 'd-l1', position: [3.7, 0, 1.5], width: 0.9, height: 2.1 }],
      windows: [{ id: 'win-l1', position: [5.5, 0, 5.5], width: 2.5, height: 1.5 }],
      furniture: [
        { id: 'f-l1', name: '沙发', position: [6.0, 0, 4.5], rotation: 0, size: [2.4, 0.9, 0.85], type: 'sofa', color: '#d4c5b0' },
        { id: 'f-l2', name: '茶几', position: [6.0, 0, 3.2], rotation: 0, size: [1.3, 0.45, 0.7], type: 'table', color: '#5c4033' },
        { id: 'f-l3', name: '电视柜', position: [6.0, 0, 1.6], rotation: 0, size: [2.0, 0.4, 0.45], type: 'cabinet', color: '#3d3d3d' },
        { id: 'f-l4', name: '电视', position: [6.0, 1.1, 1.55], rotation: 0, size: [1.4, 0.85, 0.05], type: 'appliance', color: '#1a1a1a' },
      ],
    },
    {
      id: 'kitchen',
      name: '厨房',
      floorHeight: 0,
      walls: [
        { id: 'w-k1', start: [3, 5.5], end: [6, 5.5], height: 2.8 },
        { id: 'w-k2', start: [6, 5.5], end: [6, 8], height: 2.8 },
        { id: 'w-k3', start: [6, 8], end: [3, 8], height: 2.8 },
        { id: 'w-k4', start: [3, 8], end: [3, 5.5], height: 2.8 },
      ],
      doors: [{ id: 'd-k1', position: [3.8, 0, 5.5], width: 0.9, height: 2.1 }],
      windows: [{ id: 'win-k1', position: [4.5, 0, 8], width: 1.8, height: 1.2 }],
      furniture: [
        { id: 'f-k1', name: '橱柜L型', position: [4.5, 0, 7.5], rotation: 0, size: [2.5, 0.9, 0.6], type: 'cabinet', color: '#f5f5f5' },
        { id: 'f-k2', name: '橱柜延伸', position: [5.7, 0, 6.5], rotation: 90, size: [1.5, 0.9, 0.6], type: 'cabinet', color: '#f5f5f5' },
        { id: 'f-k3', name: '冰箱', position: [3.4, 0, 7.0], rotation: 0, size: [0.85, 1.85, 0.7], type: 'appliance', color: '#e0e0e0' },
      ],
    },
    {
      id: 'dining',
      name: '餐厅',
      floorHeight: 0,
      walls: [
        { id: 'w-d1', start: [9, 5.5], end: [12, 5.5], height: 2.8 },
        { id: 'w-d2', start: [12, 5.5], end: [12, 8], height: 2.8 },
        { id: 'w-d3', start: [12, 8], end: [9, 8], height: 2.8 },
        { id: 'w-d4', start: [9, 8], end: [9, 5.5], height: 2.8 },
      ],
      doors: [{ id: 'd-d1', position: [9.7, 0, 5.5], width: 0.9, height: 2.1 }],
      windows: [],
      furniture: [
        { id: 'f-d1', name: '餐桌', position: [10.5, 0, 6.7], rotation: 0, size: [1.6, 0.75, 0.9], type: 'table', color: '#5c4033' },
        { id: 'f-d2', name: '餐椅1', position: [9.8, 0, 6.2], rotation: 45, size: [0.5, 0.9, 0.5], type: 'decor', color: '#8b7355' },
        { id: 'f-d3', name: '餐椅2', position: [11.2, 0, 6.2], rotation: -45, size: [0.5, 0.9, 0.5], type: 'decor', color: '#8b7355' },
      ],
    },
    {
      id: 'bedroom',
      name: '次卧（一）',
      floorHeight: 0,
      walls: [
        { id: 'w-b1', start: [0, 1.5], end: [3, 1.5], height: 2.8 },
        { id: 'w-b2', start: [0, 1.5], end: [0, 5.5], height: 2.8 },
        { id: 'w-b3', start: [0, 5.5], end: [3, 5.5], height: 2.8 },
        { id: 'w-b4', start: [3, 5.5], end: [3, 1.5], height: 2.8 },
      ],
      doors: [{ id: 'd-b1', position: [2.5, 0, 3.5], width: 0.9, height: 2.1 }],
      windows: [{ id: 'win-b1', position: [0, 0, 3.5], width: 1.8, height: 1.2 }],
      furniture: [
        { id: 'f-b1', name: '床', position: [1.5, 0, 2.8], rotation: 0, size: [1.8, 0.45, 2.0], type: 'bed', color: '#e8e0d4' },
        { id: 'f-b2', name: '衣柜', position: [1.5, 0, 5.0], rotation: 0, size: [2.0, 0.55, 0.6], type: 'cabinet', color: '#d4c5b0' },
        { id: 'f-b3', name: '书桌', position: [0.5, 0, 1.8], rotation: 0, size: [1.2, 0.75, 0.6], type: 'table', color: '#a0826d' },
      ],
    },
    {
      id: 'bathroom',
      name: '公卫',
      floorHeight: 0,
      walls: [
        { id: 'w-ba1', start: [0, 5.5], end: [3, 5.5], height: 2.8 },
        { id: 'w-ba2', start: [0, 5.5], end: [0, 8], height: 2.8 },
        { id: 'w-ba3', start: [0, 8], end: [3, 8], height: 2.8 },
        { id: 'w-ba4', start: [3, 8], end: [3, 5.5], height: 2.8 },
      ],
      doors: [{ id: 'd-ba1', position: [2.5, 0, 6.8], width: 0.8, height: 2.1 }],
      windows: [{ id: 'win-ba1', position: [0, 0, 8], width: 1.2, height: 1.0 }],
      furniture: [
        { id: 'f-ba1', name: '马桶', position: [1.5, 0, 7.3], rotation: 0, size: [0.45, 0.8, 0.7], type: 'appliance', color: '#f0f0f0' },
        { id: 'f-ba2', name: '洗手台', position: [1.0, 0, 5.7], rotation: 0, size: [0.8, 0.85, 0.5], type: 'cabinet', color: '#ffffff' },
        { id: 'f-ba3', name: '淋浴区', position: [1.5, 0, 6.5], rotation: 0, size: [0.9, 1.8, 1.0], type: 'decor', color: '#e0e0e0' },
      ],
    },
  ],
};

// 内存存储（模拟数据库）
const projects: Record<string, any> = {
  'default-project': {
    id: 'default-project',
    name: '空间设计实验室 - 示例项目',
    sceneData: mockSceneData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

// 健康检查
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 获取场景数据
app.get('/api/scene', (_req: Request, res: Response) => {
  res.json({ success: true, data: mockSceneData });
});

// 获取项目列表
app.get('/api/projects', (_req: Request, res: Response) => {
  const projectList = Object.values(projects).map((p: any) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
  res.json({ success: true, data: projectList });
});

// 获取单个项目
app.get('/api/projects/:id', (req: Request, res: Response) => {
  const project = projects[req.params.id];
  if (!project) {
    return res.status(404).json({ success: false, message: '项目不存在' });
  }
  res.json({ success: true, data: project });
});

// 保存/更新项目
app.put('/api/projects/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, sceneData } = req.body;

  projects[id] = {
    id,
    name: name || projects[id]?.name || '未命名项目',
    sceneData: sceneData || projects[id]?.sceneData || mockSceneData,
    createdAt: projects[id]?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  res.json({ success: true, data: projects[id] });
});

// 创建新项目
app.post('/api/projects', (req: Request, res: Response) => {
  const { name, sceneData } = req.body;
  const id = `project-${Date.now()}`;

  projects[id] = {
    id,
    name: name || '未命名项目',
    sceneData: sceneData || mockSceneData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  res.json({ success: true, data: projects[id] });
});

// 删除项目
app.delete('/api/projects/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!projects[id]) {
    return res.status(404).json({ success: false, message: '项目不存在' });
  }
  delete projects[id];
  res.json({ success: true, message: '项目已删除' });
});

// 导出模型（OBJ格式导出数据）
app.post('/api/export', (req: Request, res: Response) => {
  const { sceneData, format = 'json' } = req.body;

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="scene-export.json"');
    res.json({ exportedAt: new Date().toISOString(), sceneData });
  } else {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="scene-export.obj"');
    // 简单的OBJ格式导出占位
    res.send('# OBJ Export from 空间设计实验室\n# Placeholder OBJ data');
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 空间设计实验室后端服务启动成功!`);
  console.log(`📍 API 地址: http://localhost:${PORT}`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/api/health`);
});
