# Cyclone：用 vgpu 复刻 369 字符的旋风

基于 **Xor（@XorDev）** 的 [Cyclone [369]](https://www.shadertoy.com/view/N3dGRM)，使用 [Vercel 的 vgpu](https://github.com/vercel-labs/vgpu) 和 WebGPU 绘制流动的紫色旋风。

- [在线预览](https://cyclone-flame.vercel.app)
- [代码仓库](https://github.com/Hassabis/cyclone)
- [原作来源与授权](THIRD_PARTY.md)

## 操作

底部控制条支持暂停、重播、拖动时间、调节速度、切换画质和全屏。

| 快捷键 | 操作 |
| --- | --- |
| 空格 | 暂停或播放 |
| R | 重播 |
| F | 全屏 |
| H | 隐藏或显示控制条 |

在地址后追加 `?t=12` 可停在第 12 秒；追加 `?t=12&clean=1` 可隐藏控制条，右下角的小按钮可以恢复控制。

## 画质

| 模式 | 效果 |
| --- | --- |
| 自动 | 根据运行帧率调整分辨率 |
| 原生 | 按设备物理像素呈现细节 |
| 省电 | 降低分辨率，减少渲染开销 |

## 本地运行

使用 Node.js 22.12 及以上版本。

```sh
npm ci
npm run dev
```

构建并预览：

```sh
npm run build
npm run preview
```
