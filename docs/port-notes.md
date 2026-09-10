# Cyclone: source-to-port correspondence

Original algorithm: Xor / @XorDev, [Cyclone [369]](https://www.shadertoy.com/view/N3dGRM). This document records the implementation decisions for a later illustrated article; it is not that article.

## Preserved algorithm

| Original GLSL | WGSL / implementation |
| --- | --- |
| `normalize(vec3(I+I,0)-iResolution.xyy)` | Same pixel-center ray; Y flipped once at the WebGPU boundary. Ray normalization hoisted outside the 90-step loop. |
| `p.z+=9.,t=p` | Same camera offset and pre-warp sample snapshot. |
| `a=(p.y-length(p.xz))/2.-T` | Same twist / temporal phase. |
| `p.xz *= mat2(cos(a+T+vec4(0,5,8,0)))` | Row vector times column-major `mat2x2f(c.xy,c.zw)`. Keep the approximate constants 5 and 8. Do not replace with an ideal orthonormal rotation. |
| `for(...;d<4.;p+=sin(...)/d)d/=.9` | Divide first, then warp. Exactly seven iterations starting at 2; WGSL explicitly reconstructs the `xz` swizzle. |
| 90 ray steps | Exactly 90, no early exit and no reduced iteration quality preset. |
| `z += d = min(...)/15./(2.+cos(a))` | Calculate step, advance z, then use updated z in the blue contribution. |
| `O += vec4(7,5,z,0)*d/length(...)` | Same unnormalized emissive accumulation. RGB preserved; output alpha explicitly opaque. |
| `tanh(O*O/1e3)` | Same mathematical mapping, bounded at input 20 to avoid backend overflow. No extra gamma, bloom, palette, or post-processing pass. |

## Defined behavior and numerical fix

The golfed shader leaves `z`, `i`, and `Z.yz` uninitialized and initially multiplies an output by `i`. The reference renderer explicitly initializes them to zero, which matches the observed ShaderToy image. Relying on uninitialized GLSL is not a portable programming contract. The original file is kept unmodified; zero initialization is applied only in the WebGL2 test wrapper.

The first literal WGSL port had isolated black pixels in intensely bright regions. On this Apple M2 / Chromium Metal backend, unbounded `tanh` produced RGB differences as large as 255 at a tiny number of pixels. Bounding its nonnegative input at 20 removed those outliers. `tanh(20)` already rounds to 1 in f32. Across the seven reference cases, the final largest byte difference is 1, and five cases are byte-identical. This does not guarantee bitwise equivalence on other GPUs.

The WebGPU target uses ordinary UNORM output, the canvas uses opaque alpha and the sRGB display color space. Using an `*-srgb` render attachment would add a transfer conversion that is absent from the original pipeline.

## Runtime performance

90 steps × 7 warps × 3 sine components is up to 1,890 scalar sine evaluations per pixel, plus cosines, lengths, divisions and normalization. This is primarily a fragment workload. A devicePixelRatio of 2 quadruples the pixel count.

- Auto (default): starts at at most 960 × 540 total pixels, at most 1 DPR, preserving aspect ratio. If observed throughput is below 48 FPS over a 1.5-second active window, reduces scale by 10%, down to half the initial linear scale. It never cuts ray steps or octaves.
- Native: physical device-pixel resolution, except the GPU texture dimension limit. Use this for unscaled image inspection, accepting the additional cost.
- Eco: at most 640 × 360 total pixels, at most 1 DPR.
- At most two submissions in flight. Completion is observed after vgpu submits, preventing long GPU queues and stale interaction responses.
- Pipeline/resources created once; pipeline warmed before playback. Uniform resolution updated on resize; time updated on rendered frames.
- Paused and hidden views skip effect draws. Text / slider readout updates are limited to 10 Hz. Simulation time follows wall time and speed, independently of skipped rendering frames.

Auto and Eco change the sampling density and resample to the display size. They retain the algorithm but are **not native-resolution pixel-identical**. The accuracy comparison always uses equal render dimensions.

## Local verification

Run `npm run dev`, open `/verify.html`, click **运行验证**. This page is excluded from the production build.

The reference uses WebGL2, highp GLSL, no MSAA, no dithering, and zero initialization. The port uses actual vgpu WebGPU target readback. Flip WebGL readback rows once; compare RGB bytes. Cases: 320×180 at 0/1/6/12/30s, 180×320 at 12s, 512×342 at 9.5s.

Pass thresholds: mean absolute channel error <1/255, 99th percentile error ≤8/255, >98% pixels within 3/255 on every RGB channel, nonblank reference, no WebGPU errors. The complete observed metrics are in `docs/validation.md`; thresholds are deliberately looser than this machine's actual result for driver variation.

The **测量性能** button compiles and warms each target, then measures 12 sequential render submissions, awaiting completion each time. It reports median/p90 of submit-to-completion wall time. This is not a pure timestamp-query GPU measurement, nor an on-screen FPS guarantee.
