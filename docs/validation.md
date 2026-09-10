# Validation — 2026-09-10

Environment: Apple M2, 8 GPU cores; macOS; Codex in-app Chromium 152. Device-pixel ratio 2. Actual WebGPU hardware rendering, not a mock adapter.

## Final shader vs original WebGL2 reference

| Dimensions | Time (s) | Mean absolute RGB error (byte units) | Max error | Pixels within 3 |
| --- | ---: | ---: | ---: | ---: |
| 320 × 180 | 0 | 0 | 0 | 100% |
| 320 × 180 | 1 | 0 | 0 | 100% |
| 320 × 180 | 6 | 0 | 0 | 100% |
| 320 × 180 | 12 | 0.000005787 | 1 | 100% |
| 320 × 180 | 30 | 0 | 0 | 100% |
| 180 × 320 | 12 | 0 | 0 | 100% |
| 512 × 342 | 9.5 | 0.000003807 | 1 | 100% |

All seven cases pass; p99 is 0 in every case; no GPU validation errors. RGB compared after origin normalization. This is same-device evidence; other GPU/compiler combinations can differ.

## Performance measurements

Each target warmed; median / p90 of 12 frames, t=9.5 + frame/60. Measurements include JS submission and GPU queue completion. Other test animation tabs were stopped/closed.

| Dimensions | Median (ms) | p90 (ms) | Reciprocal median (theoretical frame ceiling) |
| --- | ---: | ---: | ---: |
| 640 × 360 | 7.8 | 8.5 | 128.2 |
| 960 × 540 | 15.9 | 17.9 | 62.9 |
| 1280 × 720 | 28.0 | 30.2 | 35.7 |
| 2560 × 1440 | 121.4 | 124.1 | 8.2 |

The first version defaulted to 2560×1440 on a 1280×720 Retina viewport. The final default begins at 960×540 and adapts downward on slower devices. Same shader, approximately 7.6× lower median render cost at the new initial resolution. After queue throttling and the new policy, the live page measured **56.0 rendered FPS** at 960×540 in the 1280×720 viewport.

Auto-mode output is resampled; native mode is still available. No claim of native 1440p/4K 60 FPS.

## Application checks

- `npm run build`: TypeScript and Vite production build passed.
- `npx vgpu check src/shaders/cyclone.wgsl`: WGSL validation passed, no diagnostics.
- Browser: rendered animation inspected, no console errors; pause/play, restart, speed selector, quality selector and timeline verified.
- No title, attribution panel, explanatory text, FPS meter or source-code panel in the artwork UI.
- Original attribution, license, source correspondence and later-article requirements retained in the repository.

Full-size native image inspection was performed. Mobile-sized viewport checks and production readback are documented after deployment; responsive desktop emulation is not real mobile-device acceptance.
