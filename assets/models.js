/**
 * 模型清单（事实源：work/export_meta.js 从 .3dm 实测导出）
 * 尺寸单位 mm（Rhino 模型单位），三角面数按 index/3 统计。
 * MODEL_BASE 为 .3dm 文件相对本文件的路径前缀。
 */
export const MODEL_BASE = './';

/**
 * 回退源：GitHub raw（带 Access-Control-Allow-Origin: *）。
 * 当查看器被嵌入 GitHub README 的沙箱 iframe（不透明源）时，
 * 同源相对路径会被 CORS 拦掉，此时改从 raw 取。
 */
export const FALLBACK_BASE =
  'https://raw.githubusercontent.com/SheldonChan13/Laboratory-material-from-different-subjects/main/';

export const MODELS = [
  {
    file: '架空地板.3dm',
    title: '架空地板',
    titleEn: 'Raised Access Floor',
    bytes: 2234455,
    objects: 1,
    vertices: 64218,
    triangles: 118856,
    bbox: { min: [-300, 0, -300], max: [300, 35, 300], size: [600, 35, 600] },
    units: 'mm',
  },
  {
    file: '气体探测器.3dm',
    title: '气体探测器',
    titleEn: 'Gas Detector',
    bytes: 2978003,
    objects: 3,
    vertices: 79893,
    triangles: 103520,
    bbox: { min: [-82, -172, -99], max: [82, 53, 0], size: [164, 225, 99] },
    units: 'mm',
  },
];

export const LIB = {
  three: '0.187.0',
  rhino3dm: '8.35.0',
};

export function formatBytes(n) {
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function formatNumber(n) {
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

export function dimsText(size) {
  return size.map((v) => (Number.isInteger(v) ? v : v.toFixed(1))).join(' × ');
}
