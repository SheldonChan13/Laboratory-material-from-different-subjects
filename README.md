# Laboratory Material from Different Subjects

**不同学科实验室材料 / 构件的三维模型仓库（Rhino `.3dm`）**

本仓库收录不同学科实验室使用的材料与构件三维模型，统一以 Rhino `.3dm` 格式保存，
并在仓库内提供**浏览器端 3D 查看器**：无需安装 Rhino、无需插件、无需格式转换，
点击文件名即可在网页中直接打开模型，并可自由旋转、缩放、平移、切换标准视角。

> Online interactive 3D preview for laboratory materials stored as Rhino `.3dm` files.
> The files are parsed **in the browser** (rhino3dm WASM + three.js) — no plugin, no conversion.

[![rhino3dm](https://img.shields.io/badge/rhino3dm-8.35-8CB6F3?style=flat-square&logo=rhino&logoColor=white)](https://www.npmjs.com/package/rhino3dm)
[![three.js](https://img.shields.io/badge/three.js-0.187-black?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org/)
[![format](https://img.shields.io/badge/format-Rhino%20.3dm-74b9ff?style=flat-square)](https://www.rhino3d.com/)

---

## 在线浏览

**[▶ 打开 3D 模型浏览器](https://5qlip7r2fmuvu.space.mcode.cn/)** ·
[打开单个模型（气体探测器）](https://5qlip7r2fmuvu.space.mcode.cn/viewer.html?model=%E6%B0%94%E4%BD%93%E6%8E%A2%E6%B5%8B%E5%99%A8.3dm)

---

## 模型索引

| 模型文件 | 说明 | 几何对象 | 顶点 | 三角面 | 包围盒 (mm) | 大小 | 操作 |
|---|---|---|---|---|---|---|---|
| [架空地板.3dm](./架空地板.3dm) | Raised Access Floor | 1 | 64,218 | 118,856 | 600 × 35 × 600 | 2.13 MB | [▶ 在线查看](https://5qlip7r2fmuvu.space.mcode.cn/viewer.html?model=%E6%9E%B6%E7%A9%BA%E5%9C%B0%E6%9D%BF.3dm) · [⬇ 下载](./架空地板.3dm) |
| [气体探测器.3dm](./气体探测器.3dm) | Gas Detector | 3 | 79,893 | 103,520 | 164 × 225 × 99 | 2.84 MB | [▶ 在线查看](https://5qlip7r2fmuvu.space.mcode.cn/viewer.html?model=%E6%B0%94%E4%BD%93%E6%8E%A2%E6%B5%8B%E5%99%A8.3dm) · [⬇ 下载](./气体探测器.3dm) |

> 「▶ 在线查看」打开该模型的交互式 3D 页面；「⬇ 下载」获取仓库中的 `.3dm` 原文件。
> 顶部的 **在线浏览** 入口提供独立的全屏查看器（带模型切换、标准视角、截图等工具）。

---

## 模型预览

下面是模型自动旋转的预览动画。**点击图片**进入交互式 3D 页面，
在页面里按住鼠标左键拖动即可自由旋转、滚轮缩放、右键平移，并可切换前 / 后 / 左 / 右 / 顶 / 底等标准视角。

### 架空地板 · Raised Access Floor

[![架空地板 · Raised Access Floor（点击进入交互式 3D）](https://5qlip7r2fmuvu.space.mcode.cn/previews/raised-floor.gif)](https://5qlip7r2fmuvu.space.mcode.cn/viewer.html?model=%E6%9E%B6%E7%A9%BA%E5%9C%B0%E6%9D%BF.3dm)

### 气体探测器 · Gas Detector

[![气体探测器 · Gas Detector（点击进入交互式 3D）](https://5qlip7r2fmuvu.space.mcode.cn/previews/gas-detector.gif)](https://5qlip7r2fmuvu.space.mcode.cn/viewer.html?model=%E6%B0%94%E4%BD%93%E6%8E%A2%E6%B5%8B%E5%99%A8.3dm)

---

## 查看器操作

| 操作 | 效果 |
|---|---|
| 左键拖动 | 旋转模型 |
| 滚轮 | 缩放（靠近 / 远离） |
| 右键拖动 | 平移视图 |
| 双击 | 复位视角 |
| 顶栏「前 / 后 / 左 / 右 / 顶 / 底」 | 切换到标准正交视角 |
| 顶栏「等轴测 / 复位」 | 等轴测视角 / 回到初始状态 |
| 顶栏「线框 / 边线 / 网格 / 坐标轴」 | 叠加显示网格对象、模型边线、地面网格、坐标轴 |
| 顶栏「截图」 | 将当前视角导出为 PNG |
| 顶栏「全屏」 | 全屏显示 |
| 顶栏下拉框 | 在同一查看器内切换不同模型 |

查看器地址参数：

| 参数 | 说明 | 示例 |
|---|---|---|
| `model` | 仓库内模型文件名（URL 编码） | `?model=%E6%B0%94%E4%BD%93%E6%8E%A2%E6%B5%8B%E5%99%A8.3dm` |
| `src` | 任意外部 `.3dm` 文件地址 | `?src=https://example.com/model.3dm` |

---

## 新增模型

1. 把新的 `.3dm` 文件放到**仓库根目录**；
2. 在 `assets/models.js` 的 `MODELS` 数组中登记一条记录：

   ```js
   {
     file: '新模型.3dm',
     title: '新模型',
     titleEn: 'New Model',
     bytes: 1234567,
     objects: 2,
     vertices: 80000,
     triangles: 150000,
     bbox: { min: [0, 0, 0], max: [100, 200, 300], size: [100, 200, 300] },
     units: 'mm',
   }
   ```

3. 提交后，模型即出现在索引页与查看器下拉框中。

---

## 技术实现

| 环节 | 方案 |
|---|---|
| 文件解析 | [rhino3dm](https://www.npmjs.com/package/rhino3dm) 8.35（WASM），浏览器端直接读取 `.3dm` |
| 几何转换 | `Mesh.toThreejsBuffers()` → `THREE.BufferGeometry`（Brep / Extrusion 走面级细分回退） |
| 渲染 | [three.js](https://threejs.org/) 0.187（WebGL2、ACES 色调映射、软阴影） |
| 交互 | `OrbitControls`（阻尼旋转 / 缩放 / 平移）+ 自定义标准视角 |
| 坐标约定 | Rhino 为 Z 轴向上，显示时统一转换为 three.js 的 Y 轴向上；尺寸单位为毫米 |
| 依赖加载 | three.js 与 rhino3dm 由 jsDelivr 按版本锁定加载，仓库内不含第三方二进制 |

查看器为纯静态页面（`index.html` + `viewer.html` + `assets/`），可直接部署到任意静态托管服务。

---

## 部署说明

查看器是纯静态站点，站点文件（`index.html`、`viewer.html`、`assets/`）已经放在本仓库根目录，
模型 `.3dm` 也在根目录，因此**开启 GitHub Pages 即可由本仓库自托管**，不需要再上传任何文件。

**方式一 · 从分支部署（最简，推荐）**

仓库 **Settings → Pages → Build and deployment → Source** 选择 **Deploy from a branch**，
Branch 选 `main`、Folder 选 `/ (root)`，保存即可。站点地址：

```
https://sheldonchan13.github.io/Laboratory-material-from-different-subjects/
```

**方式二 · GitHub Actions 部署**

先在网页端新增 `.github/workflows/pages.yml`（GitHub App / 令牌无法直接写入工作流文件）：

```yaml
name: Deploy GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - id: deployment
        uses: actions/deploy-pages@v4
```

然后把 Pages 的 Source 改为 **GitHub Actions**。

**当前地址**

本文中的预览地址指向已发布的静态托管 `https://5qlip7r2fmuvu.space.mcode.cn/`；
一旦 Pages 开启，把本文所有 `https://5qlip7r2fmuvu.space.mcode.cn/`
替换为 `https://sheldonchan13.github.io/Laboratory-material-from-different-subjects/`
即可完全由仓库自托管。

---

## 说明

- 模型文件由 Rhino 导出（属性中记录为 `STL Exported by Open CASCADE Technology`），单位为毫米。
- 本仓库内容的授权方式：**待补充**（请在此处填写 CC BY 4.0 / MIT 等具体许可）。
