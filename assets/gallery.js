import { MODELS, MODEL_BASE, LIB, formatBytes, formatNumber, dimsText } from './models.js';

const grid = document.getElementById('grid');

grid.innerHTML = MODELS.map((m) => {
  const href = `./viewer.html?model=${encodeURIComponent(m.file)}`;
  const raw = `${MODEL_BASE}${encodeURIComponent(m.file)}`;
  return `
    <article class="card">
      <div>
        <h3>${m.title}</h3>
        <div class="en">${m.titleEn}</div>
      </div>
      <span class="file">${m.file}</span>
      <div class="stats">
        <div>几何对象<b>${formatNumber(m.objects)}</b></div>
        <div>三角面数<b>${formatNumber(m.triangles)}</b></div>
        <div>包围盒 (mm)<b>${dimsText(m.bbox.size)}</b></div>
        <div>文件大小<b>${formatBytes(m.bytes)}</b></div>
      </div>
      <div class="actions">
        <a class="btn primary" href="${href}">▶ 打开 3D 查看器</a>
        <a class="btn" href="${raw}" download>↓ 下载 .3dm</a>
      </div>
    </article>`;
}).join('');

document.getElementById('lib-versions').textContent =
  `viewer: rhino3dm ${LIB.rhino3dm} · three.js ${LIB.three}`;
