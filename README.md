# Cyclone：用 vgpu 复刻 369 字符的旋风

这是对 **Xor（@XorDev）** 的 [Cyclone [369]](https://www.shadertoy.com/view/N3dGRM) 的 WebGPU 移植，使用 [Vercel 的 vgpu](https://github.com/vercel-labs/vgpu)。原算法和视觉设计归原作者所有，本项目负责 WGSL 移植、交互控制与运行性能处理。

- **在线预览**：https://cyclone-flame.vercel.app
- **代码仓库**：https://github.com/Hassabis/cyclone
- [原作来源与授权说明](THIRD_PARTY.md)
- [公式对应关系与移植笔记](docs/port-notes.md)
- [画面对照与性能测量记录](docs/validation.md)
- [技术文章的内容与配图计划](docs/article-plan.md)

页面只展示旋风和底部的小控制条，可暂停、重播、拖动时间、调节速度、切换画质、进入全屏或隐藏控制。画面上不放标题、署名面板和技术说明；原作者信息保留在源码、仓库文档和配套文章中。

## 在本地运行

建议使用 Node.js 24；也支持 Node.js 22.12 及以上版本。

```sh
npm ci
npm run dev
```

打开终端显示的网址。追加 `?t=12` 可停在第 12 秒；追加 `?t=12&clean=1` 可隐藏控制条，右下角的小按钮可以恢复控制。

快捷键：空格暂停或播放，`R` 重播，`F` 全屏，`H` 隐藏或显示控制。

## 画质与性能

三个画质选项都保留原始的 **90 次射线步进和 7 层正弦扰动**，区别在于实际计算多少个像素。

| 模式 | 作用 |
| --- | --- |
| 自动 | 默认选项。初始像素总量不超过 960×540，并根据运行帧率适当降低分辨率。 |
| 原生 | 按设备物理像素渲染，适合仔细观察细节，但高分辨率下开销较大。 |
| 省电 | 像素总量不超过 640×360，降低计算负担。 |

自动和省电模式会把较低分辨率的结果放大到窗口大小。它们保留算法，不等于与原生分辨率逐像素一致。

在测试用的 Apple M2 上，2560×1440 的一次渲染约需 121.4 毫秒，960×540 约需 15.9 毫秒；最终页面在自动模式下观测到约 56 帧/秒。这是特定设备上的测量结果，其他设备、浏览器和画面时刻会有所不同。

## 检查与构建

```sh
npm run check
npm run build
npm run preview
```

开发服务器中的 `/verify.html` 提供两项工具：

- 用 WebGL2 执行原始 GLSL，与实际 WebGPU 移植在相同时间、相同分辨率下进行像素对照。
- 测量不同分辨率的提交到 GPU 完成所需时间。

验证页面不进入线上构建。七组画面对照在测试设备上全部通过，最大的 RGB 通道差异为 1/255；这不代表所有 GPU 都会产生完全相同的字节结果。

运行需要支持 WebGPU 且开启硬件加速的浏览器，页面应通过 HTTPS 或 localhost 访问。WebGL2 只用于本地对照，不会在正式页面中悄悄替代 vgpu。

## 项目结构

```text
src/main.ts                       页面交互、尺寸管理与渲染调度
src/shaders/cyclone.original.glsl  保留的原始 GLSL
src/shaders/cyclone.wgsl           正式使用的 WGSL 移植
src/verify.ts                     本地画面对照与性能测量
src/style.css                     简单控制条样式
docs/                            技术说明与测量记录
```

## 部署

Vercel 项目 `cyclone` 已连接本仓库，`main` 是生产分支。推送后自动构建并部署，Vite 的静态产物位于 `dist`。

项目不需要后端服务、外部纹理或应用密钥。本地 `.vercel` 与 `.env*` 文件不会提交到 Git。

## 署名与授权

原始作品为 **Xor（@XorDev）的 Cyclone [369]**。原作及本项目的 WGSL 改编遵循 **CC BY-NC-SA 3.0（署名—非商业性使用—相同方式共享）**，具体依据见[来源与授权说明](THIRD_PARTY.md)。vgpu 依赖保留其 MIT 许可证。
