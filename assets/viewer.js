/**
 * 3D 查看器：直接读取 Rhino .3dm 文件并在浏览器中交互显示。
 * 解析链路：rhino3dm (WASM) -> three.js BufferGeometry
 * 坐标约定：Rhino 为 Z 轴向上，转换时按 rhino3dm 的 rotateToYUp 映射为 three.js 的 Y 轴向上。
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODELS, MODEL_BASE, FALLBACK_BASE, LIB, formatBytes, formatNumber, dimsText } from './models.js';

const $ = (sel) => document.querySelector(sel);
const RHINO_CDN = `https://cdn.jsdelivr.net/npm/rhino3dm@${LIB.rhino3dm}/`;

/* ------------------------------------------------------------------ state */

const params = new URLSearchParams(location.search);
const state = {
  modelFile: params.get('model') || (MODELS[0] && MODELS[0].file),
  srcUrl: params.get('src') || '',
  wireframe: false,
  showEdges: false,
  showGround: true,
  showAxes: true,
  meta: null,
  center: new THREE.Vector3(),
  radius: 1,
};

/* --------------------------------------------------------------- renderer */

const canvas = $('#view');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
// three r187 已移除 PCFSoftShadowMap
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;
controls.minDistance = 1;

const modelRoot = new THREE.Group();
scene.add(modelRoot);

const helpers = new THREE.Group();
scene.add(helpers);

let grid = null;
let ground = null;
let axes = null;

/* ----------------------------------------------------------------- light */

const hemi = new THREE.HemisphereLight(0xdfe9f5, 0x4a5666, 1.25);
scene.add(hemi);

// 底部补光：避免底视 / 仰视时模型背光面全黑
const under = new THREE.DirectionalLight(0xc9d6e4, 0.45);
under.position.set(0, -1, 0.4);
scene.add(under);

const key = new THREE.DirectionalLight(0xffffff, 1.5);
key.position.set(1, 2.2, 1.4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0006;
key.shadow.normalBias = 0.6;
scene.add(key);
scene.add(key.target);

const fill = new THREE.DirectionalLight(0x9fc4ff, 0.5);
fill.position.set(-1.6, 0.9, -1.2);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffd9a8, 0.35);
rim.position.set(-0.4, 1.2, 2.0);
scene.add(rim);

/* ----------------------------------------------------------- geometry io */

let rhinoPromise = null;
function getRhino() {
  if (!rhinoPromise) {
    rhinoPromise = window.rhino3dm({
      locateFile: (file) => `${RHINO_CDN}${file}`,
    }).catch((err) => {
      rhinoPromise = null;
      throw err;
    });
  }
  return rhinoPromise;
}

function buildGeometry(position, normal, index) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  if (normal && normal.length === position.length) {
    geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  }
  if (index && index.length) {
    // 注意：three r187 的 setAttribute() 已不再把 'index' 转交给 setIndex()，必须显式调用
    geo.setIndex(new THREE.BufferAttribute(index, 1));
  }
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

/** 合并多个 rhino3dm Mesh（用于 Brep 多面拼接）。 */
function mergeMeshBuffers(list) {
  const pos = [];
  const nor = [];
  const idx = [];
  let offset = 0;
  for (const b of list) {
    pos.push(b.position);
    if (b.normal && b.normal.length === b.position.length) nor.push(b.normal);
    for (let i = 0; i < b.index.length; i++) idx.push(b.index[i] + offset);
    offset += b.vertexCount;
  }
  const cat = (arrs, Ctor) => {
    if (!arrs.length) return null;
    const total = arrs.reduce((s, a) => s + a.length, 0);
    const out = new Ctor(total);
    let o = 0;
    for (const a of arrs) { out.set(a, o); o += a.length; }
    return out;
  };
  return {
    position: cat(pos, Float32Array),
    normal: cat(nor, Float32Array),
    index: cat([Uint32Array.from(idx)], Uint32Array),
  };
}

/** Rhino 几何 -> three.js 几何。返回 { type, geometry } 或 null（不支持的类型）。 */
function convertGeometry(rhino, geometry) {
  const kind = geometry.constructor.name;

  if (kind === 'Mesh') {
    const b = geometry.toThreejsBuffers(true);
    return { type: 'mesh', geometry: buildGeometry(b.position, b.normal, b.index) };
  }

  if (kind === 'Extrusion') {
    const mesh = geometry.getMesh(rhino.MeshType.Any);
    if (mesh && mesh.vertices().count > 0) {
      const b = mesh.toThreejsBuffers(true);
      return { type: 'mesh', geometry: buildGeometry(b.position, b.normal, b.index) };
    }
    return null;
  }

  if (kind === 'Brep') {
    const faces = geometry.faces();
    const parts = [];
    for (let i = 0; i < faces.count; i++) {
      const fm = faces.get(i).getMesh(rhino.MeshType.Any);
      if (fm && fm.vertices().count > 0) parts.push(fm.toThreejsBuffers(true));
    }
    if (!parts.length) return null;
    const merged = mergeMeshBuffers(parts);
    return { type: 'mesh', geometry: buildGeometry(merged.position, merged.normal, merged.index) };
  }

  if (kind === 'Surface') {
    const ns = geometry.toNurbsSurface();
    if (ns) return null; // 无内置细分器，跳过曲面
    return null;
  }

  // 曲线 -> 线段
  if (typeof geometry.toNurbsCurve === 'function') {
    try {
      const curve = geometry.toNurbsCurve();
      const polys = curve.toPolylines();
      const pts = [];
      for (const poly of polys) {
        const count = poly.count();
        for (let i = 0; i < count; i++) {
          const p = poly.get(i);
          pts.push(p.x, p.y, p.z);
        }
      }
      if (pts.length >= 6) {
        const arr = new Float32Array(pts);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
        return { type: 'line', geometry: g };
      }
    } catch (e) { /* 忽略不支持的曲线 */ }
  }

  return null;
}

/* ------------------------------------------------------------------ load */

/** 依次尝试候选地址（首选同源，其次 GitHub raw 回退）。 */
async function fetchModelBytes(url, file) {
  const candidates = [url];
  if (!state.srcUrl && file) {
    candidates.push(`${FALLBACK_BASE}${encodeURIComponent(file)}`);
  }
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.arrayBuffer();
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`无法读取文件 ${url}\n${lastError ? lastError.message : '未知错误'}`);
}

async function loadModel(url, label) {
  showOverlay('progress', `正在读取 ${label}`);
  setProgress(0.05);

  let buffer;
  try {
    buffer = await fetchModelBytes(url, label);
  } catch (err) {
    throw new Error(String(err.message || err));
  }
  setProgress(0.35);

  let file3dm;
  try {
    const rhino = await getRhino();
    setProgress(0.55);
    file3dm = rhino.File3dm.fromByteArray(new Uint8Array(buffer));
  } catch (err) {
    throw new Error(`Rhino 解析器初始化失败：${err.message}`);
  }
  if (!file3dm) throw new Error('Rhino 无法解析该 .3dm 文件（文件可能损坏或不是 3dm 格式）');
  setProgress(0.75);

  const rhino = await getRhino();
  modelRoot.clear();
  const objectTable = file3dm.objects();

  let meshCount = 0;
  let lineCount = 0;
  let triangles = 0;
  let skipped = 0;

  for (let i = 0; i < objectTable.count; i++) {
    const obj = objectTable.get(i);
    const geometry = obj.geometry();
    if (!geometry) { skipped++; continue; }
    const converted = convertGeometry(rhino, geometry);
    if (!converted) { skipped++; continue; }

    const material = new THREE.MeshStandardMaterial({
      color: 0xc6d2e0,
      roughness: 0.52,
      metalness: 0.12,
      side: THREE.DoubleSide,
      flatShading: false,
      wireframe: state.wireframe,
    });

    if (converted.type === 'mesh') {
      const mesh = new THREE.Mesh(converted.geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      modelRoot.add(mesh);
      meshCount++;
      triangles += converted.geometry.index
        ? converted.geometry.index.count / 3
        : converted.geometry.attributes.position.count / 3;

      if (state.showEdges) addEdges(mesh);
    } else {
      const line = new THREE.LineSegments(
        converted.geometry,
        new THREE.LineBasicMaterial({ color: 0x7fb2ff })
      );
      modelRoot.add(line);
      lineCount++;
    }
  }

  if (!modelRoot.children.length) {
    throw new Error('文件已解析，但其中没有可渲染的几何体');
  }
  setProgress(1);

  const box = new THREE.Box3();
  modelRoot.updateMatrixWorld(true);
  box.setFromObject(modelRoot);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  state.center = center;
  state.radius = Math.max(size.length() / 2, 1);

  buildHelpers(box, size);

  camera.near = Math.max(state.radius / 1000, 0.01);
  camera.far = state.radius * 200;
  camera.updateProjectionMatrix();

  fitView();
  updateInfo({
    file: label,
    bytes: buffer.byteLength,
    objects: meshCount + lineCount,
    triangles: Math.round(triangles),
    size: [size.x, size.y, size.z],
    skipped,
  });

  hideOverlay();
}

function addEdges(mesh) {
  const edges = new THREE.EdgesGeometry(mesh.geometry, 25);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x22303f, transparent: true, opacity: 0.85 })
  );
  line.name = '__edges__';
  mesh.add(line);
}

/* --------------------------------------------------------------- helpers */

function niceStep(raw) {
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const n = raw / base;
  const mult = n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10;
  return mult * base;
}

function buildHelpers(box, size) {
  helpers.clear();

  const span = Math.max(size.x, size.z, 1);
  const step = niceStep(span / 10);
  const gridSize = Math.ceil(span / step) * step;

  grid = new THREE.GridHelper(gridSize, Math.round(gridSize / step), 0x3c4b5e, 0x1e2732);
  grid.material.transparent = true;
  grid.material.opacity = 0.85;
  grid.position.set(box.min.x + size.x / 2, box.min.y, box.min.z + size.z / 2);
  helpers.add(grid);

  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(gridSize * 4, gridSize * 4),
    new THREE.MeshStandardMaterial({ color: 0x121924, roughness: 0.98, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(box.min.x + size.x / 2, box.min.y - 0.01, box.min.z + size.z / 2);
  ground.receiveShadow = true;
  helpers.add(ground);

  axes = new THREE.AxesHelper(Math.max(state.radius * 0.35, 1));
  axes.position.set(box.min.x, box.min.y, box.min.z);
  helpers.add(axes);

  key.target.position.copy(state.center);
  key.position.set(
    state.center.x + state.radius * 1.4,
    state.center.y + state.radius * 2.2,
    state.center.z + state.radius * 1.6
  );
  key.shadow.camera.left = -state.radius * 1.6;
  key.shadow.camera.right = state.radius * 1.6;
  key.shadow.camera.top = state.radius * 1.6;
  key.shadow.camera.bottom = -state.radius * 1.6;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = state.radius * 10;
  key.shadow.camera.updateProjectionMatrix();

  helpers.visible = true;
  grid.visible = true;
  ground.visible = state.showGround;
  axes.visible = state.showAxes;
}

const VIEW_DIRS = {
  iso:   { dir: [1, 0.85, 1],    label: '等轴测' },
  front: { dir: [0, 0, 1],      label: '前视' },
  back:  { dir: [0, 0, -1],     label: '后视' },
  left:  { dir: [-1, 0, 0],     label: '左视' },
  right: { dir: [1, 0, 0],      label: '右视' },
  top:   { dir: [0, 1, 0.001],  label: '顶视' },
  bottom:{ dir: [0, -1, 0.001], label: '底视' },
};

function setView(name) {
  const v = VIEW_DIRS[name] || VIEW_DIRS.iso;
  const dir = new THREE.Vector3(...v.dir).normalize();
  const dist = state.radius * 2.6;
  camera.position.copy(state.center).addScaledVector(dir, dist);
  camera.up.set(0, 1, 0);
  if (name === 'top' || name === 'bottom') {
    camera.up.set(0, 0, name === 'top' ? -1 : 1);
  }
  controls.target.copy(state.center);
  camera.lookAt(state.center);
  controls.update();
}

function fitView() {
  const dir = new THREE.Vector3(1, 0.8, 1).normalize();
  camera.position.copy(state.center).addScaledVector(dir, state.radius * 2.4);
  camera.up.set(0, 1, 0);
  controls.target.copy(state.center);
  camera.lookAt(state.center);
  controls.update();
}

/* ------------------------------------------------------------------- ui */

function showOverlay(mode, message, detail) {
  const ov = $('#overlay');
  ov.classList.remove('hidden');
  ov.classList.toggle('error', mode === 'error');
  $('#spinner').style.display = mode === 'error' ? 'none' : '';
  $('#progress').style.display = mode === 'progress' ? '' : 'none';
  $('#overlay-msg').innerHTML = `${message}${detail ? `<small>${detail}</small>` : ''}`;
  $('#retry').style.display = mode === 'error' ? '' : 'none';
}

function hideOverlay() {
  $('#overlay').classList.add('hidden');
}

function setProgress(p) {
  const bar = $('#progress');
  if (bar) bar.value = Math.max(0, Math.min(1, p));
}

function updateInfo(m) {
  state.meta = m;
  $('#info-name').textContent = m.file;
  $('#info-size').textContent = formatBytes(m.bytes);
  $('#info-objects').textContent = formatNumber(m.objects);
  $('#info-tris').textContent = formatNumber(m.triangles);
  $('#info-dims').textContent = `${dimsText(m.size)} mm`;
  const dl = $('#info-download');
  dl.href = m.downloadUrl || '#';
  dl.textContent = '下载 .3dm 原文件';
  dl.style.display = m.downloadUrl ? '' : 'none';
}

function buildModelSelect() {
  const sel = $('#model-select');
  const known = MODELS.map((m) => m.file);
  const list = known.slice();
  if (state.modelFile && !list.includes(state.modelFile)) list.push(state.modelFile);
  sel.innerHTML = list
    .map((f) => {
      const meta = MODELS.find((m) => m.file === f);
      return `<option value="${f}">${meta ? meta.title : f} · ${f}</option>`;
    })
    .join('');
  sel.value = state.modelFile || (MODELS[0] && MODELS[0].file);
  sel.addEventListener('change', () => {
    location.search = `?model=${encodeURIComponent(sel.value)}`;
  });
}

/* -------------------------------------------------------------- controls */

function bindToolbar() {
  $('#btn-reset').addEventListener('click', fitView);
  $('#btn-wire').addEventListener('click', (e) => {
    state.wireframe = !state.wireframe;
    e.currentTarget.setAttribute('aria-pressed', String(state.wireframe));
    modelRoot.traverse((o) => {
      if (o.isMesh && o.material) o.material.wireframe = state.wireframe;
    });
  });
  $('#btn-edges').addEventListener('click', (e) => {
    state.showEdges = !state.showEdges;
    e.currentTarget.setAttribute('aria-pressed', String(state.showEdges));
    modelRoot.traverse((o) => {
      if (o.isMesh) {
        const ex = o.getObjectByName('__edges__');
        if (state.showEdges && !ex) addEdges(o);
        if (!state.showEdges && ex) o.remove(ex);
      }
    });
  });
  $('#btn-ground').addEventListener('click', (e) => {
    state.showGround = !state.showGround;
    e.currentTarget.setAttribute('aria-pressed', String(state.showGround));
    if (ground) ground.visible = state.showGround;
    if (grid) grid.visible = state.showGround;
  });
  $('#btn-axes').addEventListener('click', (e) => {
    state.showAxes = !state.showAxes;
    e.currentTarget.setAttribute('aria-pressed', String(state.showAxes));
    if (axes) axes.visible = state.showAxes;
  });
  $('#btn-shot').addEventListener('click', () => {
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(state.modelFile || 'model').replace(/\.3dm$/i, '')}-view.png`;
    a.click();
  });
  $('#btn-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });
  $('#retry').addEventListener('click', () => start());
}

/* ---------------------------------------------------------------- resize */

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
if (window.ResizeObserver) {
  new ResizeObserver(resize).observe(document.body);
}

/* ------------------------------------------------------------- scale bar */

function updateScaleBar() {
  const el = $('#scalebar');
  if (!el || !state.meta) { if (el) el.style.display = 'none'; return; }
  const span = Math.max(state.meta.size[0], state.meta.size[2], 1);
  let step = niceStep(span / 6);
  const a = state.center.clone();
  const b = state.center.clone().add(new THREE.Vector3(step, 0, 0));
  const pa = a.clone().project(camera);
  const pb = b.clone().project(camera);
  const px = Math.abs(pb.x - pa.x) * window.innerWidth * 0.5;
  if (!Number.isFinite(px) || px < 8 || px > window.innerWidth * 0.6) {
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  $('#scalebar-bar').style.width = `${px.toFixed(0)}px`;
  $('#scalebar-text').textContent = step >= 1 ? `${step} mm` : `${step * 1000} µm`;
}

/* ------------------------------------------------------------------ loop */

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  updateScaleBar();
}

/* ------------------------------------------------------------------ main */

async function start() {
  buildModelSelect();
  const file = state.modelFile;
  const url = state.srcUrl || `${MODEL_BASE}${file}`;
  try {
    await loadModel(url, file);
    const dl = $('#info-download');
    if (dl && !state.srcUrl) {
      dl.href = url;
      dl.style.display = '';
    }
  } catch (err) {
    showOverlay('error', '加载失败', String(err.message || err).replace(/\n/g, '<br>'));
  }
}

bindToolbar();
resize();
animate();
start();

// 调试钩子：便于在控制台查看相机/控制器状态
window.__viewer = { camera, controls, renderer, scene, state, setView, fitView };
