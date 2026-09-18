import type { ModelItem } from '../types';

const STORAGE_KEY = 'base_model_library';

// 延迟模拟网络请求
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

// 从 mockScene 生成种子数据
function seedData(): ModelItem[] {
  const furniture: Omit<ModelItem, 'createdAt' | 'updatedAt'>[] = [
    { id: 'm-sofa-3', name: '三人沙发', category: 'furniture', type: 'sofa', size: [2.8, 0.9, 0.9], color: '#d4c5b0', tags: ['客厅', '布艺'] },
    { id: 'm-sofa-1', name: '单人沙发', category: 'furniture', type: 'sofa', size: [0.9, 0.85, 0.8], color: '#c8b8a0', tags: ['客厅', '布艺'] },
    { id: 'm-bed-double', name: '双人床', category: 'furniture', type: 'bed', size: [1.8, 0.45, 2.0], color: '#e8e0d4', tags: ['卧室'] },
    { id: 'm-cabinet-ward', name: '衣柜', category: 'furniture', type: 'cabinet', size: [2.0, 2.45, 0.5], color: '#d4c5b0', tags: ['卧室', '储物'] },
    { id: 'm-cabinet-tv', name: '电视柜', category: 'furniture', type: 'cabinet', size: [2.2, 0.4, 0.45], color: '#3d3d3d', tags: ['客厅'] },
    { id: 'm-table-dine', name: '餐桌', category: 'furniture', type: 'table', size: [1.8, 0.75, 0.95], color: '#5c4033', tags: ['餐厅'] },
    { id: 'm-table-tea', name: '茶几', category: 'furniture', type: 'table', size: [1.3, 0.45, 0.75], color: '#5c4033', tags: ['客厅'] },
    { id: 'm-chair', name: '餐椅', category: 'furniture', type: 'chair', size: [0.5, 0.9, 0.5], color: '#8b7355', tags: ['餐厅'] },
    { id: 'm-fridge', name: '冰箱', category: 'furniture', type: 'fridge', size: [0.75, 1.85, 0.65], color: '#e0e0e0', tags: ['厨房', '家电'] },
    { id: 'm-washer', name: '洗衣机', category: 'furniture', type: 'washer', size: [0.6, 0.85, 0.6], color: '#f0f0f0', tags: ['阳台', '家电'] },
    { id: 'm-toilet', name: '马桶', category: 'furniture', type: 'toilet', size: [0.4, 0.8, 0.65], color: '#fafafa', tags: ['卫生间'] },
    { id: 'm-sink', name: '洗手台', category: 'furniture', type: 'sink', size: [0.7, 0.85, 0.5], color: '#ffffff', tags: ['卫生间'] },
    { id: 'm-shower-q', name: '四分之一圆淋浴', category: 'furniture', type: 'shower', size: [1.2, 2.0, 0], color: '#a8d0e6', tags: ['卫生间'] },
    { id: 'm-shower-r', name: '长方形淋浴', category: 'furniture', type: 'shower', size: [2.5, 1.8, 1.0], color: '#a8d0e6', tags: ['卫生间'] },
    { id: 'm-lamp', name: '落地灯', category: 'furniture', type: 'decor', size: [0.4, 1.6, 0.4], color: '#e8e0d4', tags: ['客厅', '装饰'] },
  ];

  const apartments: Omit<ModelItem, 'createdAt' | 'updatedAt'>[] = [
    { id: 'm-apt-1bed', name: '单身公寓', category: 'apartment', type: 'one-bed', tags: ['一居', '开放式'] },
    { id: 'm-apt-2bed', name: '两室一厅', category: 'apartment', type: 'two-bed', tags: ['两居', '紧凑'] },
    { id: 'm-apt-3bed', name: '三室两厅', category: 'apartment', type: 'three-bed', tags: ['三居', '南向客厅', '双卫'] },
    { id: 'm-apt-modern', name: '现代三居', category: 'apartment', type: 'modern', tags: ['三居', '衣帽间', '开放客餐厅'] },
  ];

  const ts = now();
  return [...furniture, ...apartments].map((m) => ({
    ...m,
    createdAt: ts,
    updatedAt: ts,
  })) as ModelItem[];
}

function loadFromStorage(): ModelItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = seedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const stored: ModelItem[] = JSON.parse(raw);
    // 自动补全种子户型 (确保新增的户型卡片对老用户可见)
    const seedApartments = seedData().filter((m) => m.category === 'apartment');
    const storedIds = new Set(stored.map((m) => m.id));
    const missing = seedApartments.filter((m) => !storedIds.has(m.id));
    if (missing.length > 0) {
      stored.push(...missing);
      saveToStorage(stored);
    }
    return stored;
  } catch {
    return seedData();
  }
}

function saveToStorage(items: ModelItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function getModelList(category?: string): Promise<ModelItem[]> {
  await delay(200);
  const all = loadFromStorage();
  if (category) return all.filter((m) => m.category === category);
  return all;
}

export async function getModelById(id: string): Promise<ModelItem | null> {
  await delay(150);
  const all = loadFromStorage();
  return all.find((m) => m.id === id) ?? null;
}

export async function createModel(data: Omit<ModelItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelItem> {
  await delay(200);
  const all = loadFromStorage();
  const newModel: ModelItem = {
    ...data,
    id: generateId(),
    createdAt: now(),
    updatedAt: now(),
  };
  all.push(newModel);
  saveToStorage(all);
  return newModel;
}

export async function updateModel(id: string, data: Partial<Omit<ModelItem, 'id' | 'createdAt'>>): Promise<ModelItem | null> {
  await delay(200);
  const all = loadFromStorage();
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: now() };
  saveToStorage(all);
  return all[idx];
}

export async function deleteModel(id: string): Promise<boolean> {
  await delay(200);
  const all = loadFromStorage();
  const filtered = all.filter((m) => m.id !== id);
  if (filtered.length === all.length) return false;
  saveToStorage(filtered);
  return true;
}
