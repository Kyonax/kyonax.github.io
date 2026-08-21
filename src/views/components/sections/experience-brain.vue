<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * ExperienceBrain — the EXPERIENCE section's WebGL2 neural brain: a
 * silhouette-lathed dot cortex with a plexus node graph, rendered on
 * the GPU with additive blending. Point-sprite clouds in the site's
 * hairline grey; gold synaptic pulses random-walk the graph heating
 * crossed edges; cortical regions light up and fade; long-range data
 * arcs carry packet pulses along the cortex; each trait pin gets a
 * square detection target (outer frame + fused corner handle, plus a
 * node frame around a random inner node holding the core dot) tied by
 * a connector to its caption chip. Substrate falls off with scene fog;
 * far hemisphere is culled. Drag to rotate (surface follows the
 * cursor), idle drift, depth-ranked caption with hysteresis.
 * NOTE: WebGL NDC y points UP — every vertex shader flips ndc.y so the
 * scene matches the y-down CPU/DOM coordinates (upside-down otherwise).
 * Software-GL renderers are detected and get a reduced tier (dpr 1).
 */

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  live: { type: Boolean, default: true },
});

const { t } = useI18n();

/* One attribute per region; ids key into landing.experience.brain.* */
const PIN_IDS = ['systemization', 'plasticity', 'celerity', 'ingenuity'];

/* Pin directions pre-lathe, upper-biased, hemispheres alternating so the
   cards spread around the whole brain — identical to the 2D brain. */
const PIN_DIRS = [
  [0.85, 0.45, 0.28],
  [0.35, 0.10, 0.90],
  [-0.58, -0.30, -0.45],
  [-0.90, 0.25, -0.30],
];

const host_ref = ref(null);
const canvas_ref = ref(null);
const cap_ref = ref(null);
const link_ref = ref(null);
const active_pin = ref(-1);
const active_id = computed(() => PIN_IDS[active_pin.value] ?? null);

let _raf = null;
let _cleanup = [];

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = canvas_ref.value;
  const cap = cap_ref.value;
  const link = link_ref.value;
  const gl = cv.getContext('webgl2', { alpha: true, antialias: false });
  if (!gl) {
    cv.style.display = 'none';
    return;
  }
  /* Fill-rate is the budget: overdraw scales with dpr² — cap it, and cap
     harder when the browser is software-rendering GL (common on Linux). */
  const dbg_ext = gl.getExtension('WEBGL_debug_renderer_info');
  const gl_renderer = dbg_ext
    ? String(gl.getParameter(dbg_ext.UNMASKED_RENDERER_WEBGL)) : '';
  const SOFT_GL = /swiftshader|llvmpipe|softpipe|software/i.test(gl_renderer);
  const dpr = Math.min(SOFT_GL ? 1 : 1.5, window.devicePixelRatio || 1);

  const css = getComputedStyle(document.documentElement);
  const tok = (n, fb) => css.getPropertyValue(n).trim() || fb;
  /* Resolve oklch tokens to 0-1 rgb via a 1x1 scratch canvas. */
  const scratch = document.createElement('canvas');
  scratch.width = 1;
  scratch.height = 1;
  const sx2 = scratch.getContext('2d');
  const _rgb = (color) => {
    sx2.fillStyle = color;
    sx2.fillRect(0, 0, 1, 1);
    const d = sx2.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  };
  const GOLD3 = _rgb(tok('--clr-primary-100', '#f9cd26'));
  /* Substrate matches the site's hairlines: border-100 composited (twice,
     for legibility) over the page background — border grey, not white. */
  sx2.fillStyle = tok('--clr-neutral-500', '#0c0c0c');
  sx2.fillRect(0, 0, 1, 1);
  sx2.fillStyle = tok('--clr-border-100', 'rgba(255,255,255,0.2)');
  sx2.fillRect(0, 0, 1, 1);
  const FG3 = _rgb(tok('--clr-border-100', 'rgba(255,255,255,0.2)'));

  /* ── Geometry — identical lathe to experience-brain.vue. ── */
  const PROFILE = [
    [0.98, 0.02, 0.52], [0.94, 0.30, 0.55], [0.80, 0.52, 0.60],
    [0.58, 0.66, 0.64], [0.30, 0.74, 0.66], [0.00, 0.76, 0.68],
    [-0.30, 0.70, 0.66], [-0.58, 0.58, 0.62], [-0.80, 0.38, 0.56],
    [-0.94, 0.16, 0.48], [-0.98, -0.04, 0.42], [-0.90, -0.20, 0.38],
    [-0.80, -0.36, 0.40], [-0.66, -0.50, 0.38], [-0.45, -0.56, 0.34],
    [-0.28, -0.52, 0.26], [-0.18, -0.62, 0.13], [-0.12, -0.85, 0.10],
    [-0.02, -0.80, 0.10], [0.02, -0.50, 0.30], [0.25, -0.46, 0.42],
    [0.55, -0.44, 0.46], [0.78, -0.32, 0.48], [0.92, -0.16, 0.50],
  ];
  const CX = 0.02;
  const CY = 0.04;
  const AN = 256;
  const RT = new Float32Array(AN);
  const WT = new Float32Array(AN);
  for (let a = 0; a < AN; a++) {
    const th = (a / AN) * Math.PI * 2 - Math.PI;
    const dx = Math.cos(th);
    const dy = Math.sin(th);
    let best = 0.4;
    let bw = 0.4;
    for (let s = 0; s < PROFILE.length; s++) {
      const p1 = PROFILE[s];
      const p2 = PROFILE[(s + 1) % PROFILE.length];
      const ex = p2[0] - p1[0];
      const ey = p2[1] - p1[1];
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) {
        continue;
      }
      const qx = p1[0] - CX;
      const qy = p1[1] - CY;
      const u = (qx * ey - qy * ex) / den;
      const v = (qx * dy - qy * dx) / den;
      if (u > 0 && v >= 0 && v <= 1 && u > best) {
        best = u;
        bw = p1[2] + (p2[2] - p1[2]) * v;
      }
    }
    RT[a] = best;
    WT[a] = bw;
  }
  const _rho = (d) => {
    const m = Math.hypot(d[0], d[1]);
    const a = ((Math.atan2(d[1], d[0]) + Math.PI) / (Math.PI * 2) * AN) | 0;
    const i = Math.min(AN - 1, a);
    const rm = m / RT[i];
    const rz = d[2] / WT[i];
    return 1 / Math.sqrt(rm * rm + rz * rz);
  };
  const GA1 = [-0.88, -0.10];
  const GA2 = [-0.20, -0.50];
  const _groove = (x, y) => {
    const ex = GA2[0] - GA1[0];
    const ey = GA2[1] - GA1[1];
    const tt = Math.max(0, Math.min(1,
      ((x - GA1[0]) * ex + (y - GA1[1]) * ey) / (ex * ex + ey * ey)));
    return Math.hypot(x - (GA1[0] + ex * tt), y - (GA1[1] + ey * tt));
  };
  const _in_cbl = (x, y) => x < -0.18 && y < -0.14 && _groove(x, y) > 0.02
    && (y - GA1[1]) * (GA2[0] - GA1[0]) - (x - GA1[0]) * (GA2[1] - GA1[1]) < 0;
  const _shade = (x, y, z) => {
    if (_in_cbl(x, y)) {
      return 0.45 + 0.55 * Math.abs(Math.sin(30 * y + 4 * x));
    }
    const th = Math.atan2(y - 0.15, x);
    return 0.55 + 0.45 * Math.sin(9 * th + 2.2 * Math.sin(3.1 * th + 2 * z));
  };

  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const SURF = [];
  const N = 6500;
  for (let i = 0; i < N; i++) {
    const u = 1 - (i / (N - 1)) * 2;
    const rr = Math.sqrt(Math.max(0, 1 - u * u));
    const d = [Math.cos(GOLDEN * i) * rr, u, Math.sin(GOLDEN * i) * rr];
    const rho = _rho(d) * (0.985 + 0.03 * Math.sin(i * 1.7));
    const x = d[0] * rho;
    const y = d[1] * rho;
    const z = d[2] * rho;
    if (Math.abs(z) < 0.035 && y > 0.30) {
      continue;
    }
    let g = _shade(x, y, z);
    if (_groove(x, y) < 0.035 && x < -0.1 && y < 0) {
      g *= 0.2;
    }
    SURF.push([x, y, z, g]);
  }
  const DUST = [];
  for (let i = 0; i < 700; i++) {
    const u = 1 - (i / 699) * 2;
    const rr = Math.sqrt(Math.max(0, 1 - u * u));
    const d = [Math.cos(GOLDEN * i * 7) * rr, u, Math.sin(GOLDEN * i * 7) * rr * 0.45];
    const rho = _rho(d) * (0.25 + 0.65 * ((i * 0.6180339887) % 1));
    const p = [d[0] * rho, d[1] * rho, d[2] * rho];
    p.push(0.08 + 0.24 * Math.max(0, 1 - Math.abs(p[2]) * 3));
    DUST.push(p);
  }
  const NODES = [];
  for (let i = 0; i < SURF.length; i += 7) {
    NODES.push(SURF[i]);
  }
  const NN = NODES.length;
  const EDGES = [];
  const ADJ = Array.from({ length: NN }, () => []);
  const _ekey = new Map();
  for (let i = 0; i < NN; i++) {
    const near = [];
    for (let j = 0; j < NN; j++) {
      if (j === i) {
        continue;
      }
      const dx = NODES[i][0] - NODES[j][0];
      const dy = NODES[i][1] - NODES[j][1];
      const dz = NODES[i][2] - NODES[j][2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < 0.055) {
        near.push([d2, j]);
      }
    }
    near.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < Math.min(3, near.length); k++) {
      const j = near[k][1];
      const mx = (NODES[i][0] + NODES[j][0]) / 2;
      const my = (NODES[i][1] + NODES[j][1]) / 2;
      if (_groove(mx, my) < 0.03 && mx < -0.1 && my < 0) {
        continue;
      }
      /* Fissure applies to edges too — medial crown edges read as a fin. */
      if (Math.abs((NODES[i][2] + NODES[j][2]) / 2) < 0.10 && my > 0.30) {
        continue;
      }
      const key = i < j ? i * NN + j : j * NN + i;
      if (!_ekey.has(key)) {
        _ekey.set(key, EDGES.length);
        EDGES.push([i, j]);
        ADJ[i].push(j);
        ADJ[j].push(i);
      }
    }
  }
  const HEAT = new Float32Array(EDGES.length);
  const _nearest_node = (p) => {
    let bi = 0;
    let bd = Infinity;
    for (let i = 0; i < NN; i++) {
      const dx = NODES[i][0] - p[0];
      const dy = NODES[i][1] - p[1];
      const dz = NODES[i][2] - p[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bd) {
        bd = d2;
        bi = i;
      }
    }
    return bi;
  };
  const _norm = (d) => {
    const L = Math.hypot(d[0], d[1], d[2]) || 1;
    return [d[0] / L, d[1] / L, d[2] / L];
  };
  const POI = PIN_DIRS.map((d) => {
    const nd = _norm(d);
    const rho = _rho(nd);
    return { p: [nd[0] * rho, nd[1] * rho, nd[2] * rho], pop: 0 };
  });
  const _rand_node = () => (Math.random() * NN) | 0;
  const PULSES = [];
  for (let i = 0; i < 6; i++) {
    PULSES.push({
      at: _rand_node(),
      to: -1,
      prev: -1,
      t: -(i * 0.35),
      speed: 2.6 + (i % 3) * 0.5,
      wp: null,
    });
  }
  const REGIONS = [];
  const MEDIAL = NODES[_nearest_node([0.1, 0.55, 0])];
  let next_region = 1.15;
  const _d2 = (p, c) => {
    const dx = p[0] - c[0];
    const dy = p[1] - c[1];
    const dz = p[2] - c[2];
    return dx * dx + dy * dy + dz * dz;
  };
  const _spawn_region = (center, t0) => {
    const c = center || NODES[_rand_node()];
    REGIONS.push({ c, t0, life: 1.5 + Math.random() * 0.9, env: 0 });
  };
  /* The node frame targets a random plexus node INSIDE the outer frame;
     its centre dot is that node, not the pin. */
  for (const poi of POI) {
    const near2 = [];
    for (let n = 0; n < NN; n++) {
      if (_d2(NODES[n], poi.p) < 0.0064) {
        near2.push(n);
      }
    }
    poi.sub = near2.length
      ? NODES[near2[(Math.random() * near2.length) | 0]]
      : poi.p;
  }

  /* ── mat3 helper (column-major, matching the CPU rot()). ── */
  const _mul3 = (A, B) => {
    const P = new Float32Array(9);
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) {
        P[c * 3 + r] = A[r] * B[c * 3] + A[3 + r] * B[c * 3 + 1] + A[6 + r] * B[c * 3 + 2];
      }
    }
    return P;
  };

  const G = { ready: false };

  /* ── Static point clouds packed as pos3 + dat4(size, weight, glow, stagger). ── */
  const _pack_pts = (list, size, wf, glow, sf) => {
    const arr = new Float32Array(list.length * 7);
    for (let i = 0; i < list.length; i++) {
      const o = i * 7;
      arr[o] = list[i][0];
      arr[o + 1] = list[i][1];
      arr[o + 2] = list[i][2];
      arr[o + 3] = size;
      arr[o + 4] = wf(list[i], i);
      arr[o + 5] = glow;
      arr[o + 6] = sf(i);
    }
    return arr;
  };
  const surf_data = _pack_pts(SURF, 1.7, (p) => 1.0 * p[3], 0, (i) => i / SURF.length);
  const dust_data = _pack_pts(DUST, 1.3, (p) => 2.2 * p[3], 0.5, () => 0);
  const node_data = _pack_pts(NODES, 2.6, (p) => 0.55 * (0.4 + 0.6 * p[3]), 0.35,
    (i) => 0.3 * (i / NN));

  /* ── Line batch: plexus edges + long-range data arcs, one buffer. ── */
  const E = EDGES.length;
  const ARC_N = 5;
  const ARC_SEGS = 14;
  const TOTAL_LV = E * 2 + ARC_N * ARC_SEGS * 2;
  const edge_pos = new Float32Array(TOTAL_LV * 4);
  const heat_buf = new Float32Array(TOTAL_LV);
  for (let e = 0; e < E; e++) {
    for (let k = 0; k < 2; k++) {
      const nd = NODES[EDGES[e][k]];
      const o = (e * 2 + k) * 4;
      edge_pos[o] = nd[0];
      edge_pos[o + 1] = nd[1];
      edge_pos[o + 2] = nd[2];
      edge_pos[o + 3] = 0.18;
    }
  }
  const ARCS = [];
  const _bake_arc = (ai, t0) => {
    const a = NODES[_rand_node()];
    let b = NODES[_rand_node()];
    /* Not too close, not near-antipodal, and no chord point near the
       origin — there the direction normalization explodes into fins. */
    const _chord_ok = (p, q2) => {
      const dd = _d2(p, q2);
      if (dd < 0.5 || dd > 1.6) {
        return false;
      }
      for (let s = 1; s < 4; s++) {
        const u = s / 4;
        const mx = p[0] + (q2[0] - p[0]) * u;
        const my = p[1] + (q2[1] - p[1]) * u;
        const mz = p[2] + (q2[2] - p[2]) * u;
        if (mx * mx + my * my + mz * mz < 0.16) {
          return false;
        }
      }
      return true;
    };
    let guard = 0;
    while (!_chord_ok(a, b) && guard < 24) {
      b = NODES[_rand_node()];
      guard++;
    }
    const vbase = E * 2 + ai * ARC_SEGS * 2;
    for (let s = 0; s < ARC_SEGS; s++) {
      for (let k = 0; k < 2; k++) {
        const u = (s + k) / ARC_SEGS;
        const m = [
          a[0] + (b[0] - a[0]) * u,
          a[1] + (b[1] - a[1]) * u,
          a[2] + (b[2] - a[2]) * u,
        ];
        const L = Math.hypot(m[0], m[1], m[2]) || 1;
        const dir = [m[0] / L, m[1] / L, m[2] / L];
        /* Ride ON the cortex: any real lift pokes past the silhouette
           when a chord crosses the medial plane. */
        const lift = _rho(dir) * (0.995 + 0.03 * Math.sin(Math.PI * u));
        const o = (vbase + s * 2 + k) * 4;
        edge_pos[o] = dir[0] * lift;
        edge_pos[o + 1] = dir[1] * lift;
        edge_pos[o + 2] = dir[2] * lift;
        edge_pos[o + 3] = 0.10;
      }
    }
    ARCS[ai] = { t0, dur: 1.6 + Math.random() * 0.8 };
    if (G.ready) {
      gl.bindBuffer(gl.ARRAY_BUFFER, G.buf_edge_pos);
      gl.bufferSubData(gl.ARRAY_BUFFER, vbase * 16, edge_pos, vbase * 4, ARC_SEGS * 2 * 4);
    }
  };
  for (let ai = 0; ai < ARC_N; ai++) {
    _bake_arc(ai, 1.6 + ai * 0.5);
  }

  /* ── Dynamic actors (satellites, pulse heads, pin cores) + glow quads. ── */
  const MAXA = 24;
  const abuf = new Float32Array(MAXA * 7);
  const _actor = (i, p, size, alpha, glow) => {
    const o = i * 7;
    abuf[o] = p[0];
    abuf[o + 1] = p[1];
    abuf[o + 2] = p[2];
    abuf[o + 3] = size;
    abuf[o + 4] = alpha;
    abuf[o + 5] = glow;
    abuf[o + 6] = 0;
  };
  const MAXQ = 32;
  const qbuf = new Float32Array(MAXQ * 72);
  const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
  let qn = 0;
  /* tex: 0 = glow disc, 1 = outer frame + handle, 2 = plain node frame. */
  const _quad = (p, size, col, alpha, rot2, tex) => {
    if (qn >= MAXQ) {
      return;
    }
    const ub = tex / 3;
    for (let k = 0; k < 6; k++) {
      const o = qn * 72 + k * 12;
      qbuf[o] = p[0];
      qbuf[o + 1] = p[1];
      qbuf[o + 2] = p[2];
      qbuf[o + 3] = ub + ((CORNERS[k][0] + 1) / 2) / 3;
      /* Plain V: with the NDC y-flip this keeps the handle top-left. */
      qbuf[o + 4] = (CORNERS[k][1] + 1) / 2;
      qbuf[o + 5] = size;
      qbuf[o + 6] = alpha;
      qbuf[o + 7] = rot2;
      qbuf[o + 8] = 0;
      qbuf[o + 9] = col[0];
      qbuf[o + 10] = col[1];
      qbuf[o + 11] = col[2];
    }
    qn++;
  };

  /* ── GLSL — recovered verbatim from the foreign agent's transcript. ── */
  const PTS_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 a_pos;
layout(location = 1) in vec4 a_dat;
uniform mat3 u_rot;
uniform vec2 u_res;
uniform float u_rf;
uniform float u_camd;
uniform float u_dpr;
uniform float u_reveal;
uniform float u_sweep;
uniform vec3 u_base;
uniform vec3 u_gold;
uniform vec4 u_regions[4];
out vec3 v_col;
out float v_alpha;
out float v_glow;
void main() {
  float su = clamp((u_sweep - a_dat.w) / 0.45, 0.0, 1.0);
  float grow = 0.4 + 0.6 * (1.0 - pow(1.0 - su, 3.0));
  vec3 q = u_rot * (a_pos * grow);
  float fog = clamp((q.z + 0.30) / 0.80, 0.0, 1.0);
  float cull = smoothstep(-0.45, -0.10, q.z);
  float hot = 0.0;
  for (int i = 0; i < 4; i++) {
    vec3 d = a_pos - u_regions[i].xyz;
    hot += u_regions[i].w * exp(-dot(d, d) * 26.0);
  }
  hot = clamp(hot, 0.0, 1.0);
  v_col = mix(u_base, u_gold, hot);
  v_glow = a_dat.z + hot * 0.9;
  v_alpha = u_reveal * su * cull * (a_dat.y * (0.06 + 0.94 * pow(fog, 1.5)) + hot * 0.45 * fog);
  float k = u_rf / (u_camd - q.z);
  vec2 px = vec2(u_res.x * 0.5 + q.x * k, u_res.y * 0.5 - q.y * k);
  vec2 ndc = px / u_res * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  gl_PointSize = max(1.0, a_dat.x * u_dpr * (k * u_camd / u_rf));
}`;
  const PTS_FS = `#version 300 es
precision highp float;
in vec3 v_col;
in float v_alpha;
in float v_glow;
out vec4 out_col;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) {
    discard;
  }
  float body = 1.0 - smoothstep(0.12, 0.5, d);
  float core = (1.0 - smoothstep(0.0, 0.22, d)) * v_glow;
  out_col = vec4(v_col * (1.0 + core * 0.9), v_alpha * (body + core));
}`;
  const LNS_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 a_pos;
layout(location = 1) in float a_heat;
layout(location = 2) in float a_alpha;
uniform mat3 u_rot;
uniform vec2 u_res;
uniform float u_rf;
uniform float u_camd;
uniform float u_reveal;
uniform vec3 u_fg;
uniform vec3 u_gold;
uniform vec4 u_regions[4];
out vec3 v_col;
out float v_alpha;
void main() {
  vec3 p = a_pos;
  vec3 q = u_rot * p;
  float fog = clamp((q.z + 0.30) / 0.80, 0.0, 1.0);
  float cull = smoothstep(-0.75, -0.25, q.z);
  float hot = a_heat;
  for (int i = 0; i < 4; i++) {
    vec3 d = p - u_regions[i].xyz;
    hot += u_regions[i].w * exp(-dot(d, d) * 26.0);
  }
  hot = clamp(hot, 0.0, 1.0);
  v_col = mix(u_fg, u_gold, hot);
  v_alpha = u_reveal * cull * (a_alpha * (0.05 + 0.95 * fog) + hot * 0.60);
  float k = u_rf / (u_camd - q.z);
  vec2 px = vec2(u_res.x * 0.5 + q.x * k, u_res.y * 0.5 - q.y * k);
  vec2 ndc = px / u_res * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}`;
  const LNS_FS = `#version 300 es
precision highp float;
in vec3 v_col;
in float v_alpha;
out vec4 out_col;
void main() {
  out_col = vec4(v_col, v_alpha);
}`;
  const QUAD_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 a_pos;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in vec4 a_dat;
layout(location = 3) in vec3 a_col;
uniform mat3 u_rot;
uniform vec2 u_res;
uniform float u_rf;
uniform float u_camd;
out vec2 v_uv;
out vec3 v_col;
out float v_alpha;
const vec2 C[6] = vec2[6](
  vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
  vec2(-1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0));
void main() {
  vec3 q = u_rot * a_pos;
  float k = u_rf / (u_camd - q.z);
  vec2 px = vec2(u_res.x * 0.5 + q.x * k, u_res.y * 0.5 - q.y * k);
  vec2 c = C[gl_VertexID % 6];
  float cs = cos(a_dat.z);
  float sn = sin(a_dat.z);
  px += vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs) * a_dat.x * k;
  v_uv = a_uv;
  v_col = a_col;
  v_alpha = a_dat.y * smoothstep(-0.40, -0.10, q.z);
  vec2 ndc = px / u_res * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}`;
  const QUAD_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
in vec3 v_col;
in float v_alpha;
uniform sampler2D u_tex;
out vec4 out_col;
void main() {
  out_col = vec4(v_col, v_alpha * texture(u_tex, v_uv).a);
}`;

  /* ── Runtime sprite atlas: glow disc left, HUD reticle right. ── */
  /* Three tiles: glow disc · outer frame + flush handle · plain node frame. */
  const _make_atlas = () => {
    const c = document.createElement('canvas');
    c.width = 384;
    c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    /* Tile 1: outer detection frame; the handle sits INSIDE it, top-left flush with the stroke's outer edge. */
    x.save();
    x.translate(192, 64);
    x.strokeStyle = 'rgba(255,255,255,0.95)';
    x.lineWidth = 1.5;
    x.strokeRect(-46, -46, 92, 92);
    x.fillStyle = 'rgba(255,255,255,0.95)';
    x.fillRect(-46.75, -46.75, 9, 9);
    x.restore();
    /* Tile 2: the plain node frame — its dot is the node actor itself. */
    x.save();
    x.translate(320, 64);
    x.strokeStyle = 'rgba(255,255,255,0.95)';
    x.lineWidth = 4;
    x.strokeRect(-40, -40, 80, 80);
    x.restore();
    return c;
  };

  const _shader = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      return null;
    }
    return sh;
  };
  const _program = (vs_src, fs_src) => {
    const vs = _shader(gl.VERTEX_SHADER, vs_src);
    const fs = _shader(gl.FRAGMENT_SHADER, fs_src);
    if (!vs || !fs) {
      return null;
    }
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      return null;
    }
    return p;
  };
  const _ulocs = (prog, names) => {
    const o = {};
    for (const n of names) {
      o[n] = gl.getUniformLocation(prog, n === 'u_regions' ? 'u_regions[0]' : n);
    }
    return o;
  };

  const boot = () => {
    const pts_prog = _program(PTS_VS, PTS_FS);
    const lns_prog = _program(LNS_VS, LNS_FS);
    const quad_prog = _program(QUAD_VS, QUAD_FS);
    if (!pts_prog || !lns_prog || !quad_prog) {
      return false;
    }
    G.pts_prog = pts_prog;
    G.lns_prog = lns_prog;
    G.quad_prog = quad_prog;
    G.u = {
      pts: _ulocs(pts_prog, ['u_rot', 'u_res', 'u_rf', 'u_camd', 'u_dpr', 'u_reveal',
        'u_sweep', 'u_base', 'u_gold', 'u_regions']),
      lns: _ulocs(lns_prog, ['u_rot', 'u_res', 'u_rf', 'u_camd', 'u_reveal',
        'u_fg', 'u_gold', 'u_regions']),
      quad: _ulocs(quad_prog, ['u_rot', 'u_res', 'u_rf', 'u_camd', 'u_tex']),
    };
    const _pts_vao = (data, usage) => {
      const vao = gl.createVertexArray();
      const buf = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
      gl.bindVertexArray(null);
      return { vao, buf };
    };
    G.vao_surf = _pts_vao(surf_data, gl.STATIC_DRAW).vao;
    G.vao_dust = _pts_vao(dust_data, gl.STATIC_DRAW).vao;
    G.vao_nodes = _pts_vao(node_data, gl.STATIC_DRAW).vao;
    const ac = _pts_vao(abuf, gl.DYNAMIC_DRAW);
    G.vao_actors = ac.vao;
    G.buf_actors = ac.buf;

    G.buf_edge_pos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, G.buf_edge_pos);
    gl.bufferData(gl.ARRAY_BUFFER, edge_pos, gl.DYNAMIC_DRAW);
    G.buf_heat = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, G.buf_heat);
    gl.bufferData(gl.ARRAY_BUFFER, heat_buf, gl.DYNAMIC_DRAW);
    const evao = gl.createVertexArray();
    gl.bindVertexArray(evao);
    gl.bindBuffer(gl.ARRAY_BUFFER, G.buf_edge_pos);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 16, 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, G.buf_heat);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 4, 0);
    gl.bindVertexArray(null);
    G.vao_edges = evao;

    G.buf_quad = gl.createBuffer();
    const qvao = gl.createVertexArray();
    gl.bindVertexArray(qvao);
    gl.bindBuffer(gl.ARRAY_BUFFER, G.buf_quad);
    gl.bufferData(gl.ARRAY_BUFFER, qbuf, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 48, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 48, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 48, 20);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 48, 36);
    gl.bindVertexArray(null);
    G.vao_quad = qvao;

    G.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, G.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _make_atlas());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
    G.ready = true;
    return true;
  };

  /* ── State + camera — identical feel to the Canvas 2D brain. ── */
  let yaw = -0.05;
  const pitch = 0.14;
  let vel = 0;
  let drag = null;
  let front_lock = -1;
  let born = 0;
  let last = 0;
  let W = 0;
  let H = 0;
  let R = 0;
  const reg_u = new Float32Array(16);
  const CAMD = 2.9;
  const F = 1.55;
  const BLEED = 40;

  const size = () => {
    const r = cv.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    cv.width = W;
    cv.height = H;
    const host = host_ref.value;
    R = Math.min(host.clientWidth, host.clientHeight) * dpr * 0.86;
    if (reduced && born) {
      requestAnimationFrame((n) => draw(n, 0));
    }
  };

  const rot_cpu = (p) => {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const x = p[0] * cy - p[2] * sy;
    const z = p[0] * sy + p[2] * cy;
    return [x, p[1] * cp - z * sp, p[1] * sp + z * cp];
  };
  const proj_cpu = (q) => {
    const k = (R * F) / (CAMD - q[2]);
    return [W / 2 + q[0] * k, H / 2 - q[1] * k, q[2], k];
  };
  const _place_cap = (sx, sy, bob, pop, ssx, ssy) => {
    cap.style.transform = `scaleX(${pop.toFixed(3)})`;
    const op = Math.max(0, (pop - 0.35) / 0.65).toFixed(3);
    cap.style.opacity = op;
    const hw = host_ref.value.clientWidth;
    const cw = cap.offsetWidth;
    const px = sx / dpr - BLEED;
    const py = sy / dpr - BLEED;
    /* When the host outsizes the viewport (small phones), clamp captions
       to the VISIBLE slice of the host, not the host itself. */
    const hr = host_ref.value.getBoundingClientRect();
    const lo = Math.max(0, -hr.left + 4);
    const hi = Math.min(hw, window.innerWidth - hr.left - 4);
    const flipped = px + 14 + cw > hi && px - 14 - cw >= lo;
    const left = Math.max(lo, Math.min(flipped ? px - 14 - cw : px + 14, hi - cw));
    const top = py - 16 + bob;
    cap.style.left = `${left}px`;
    cap.style.top = `${top}px`;
    cap.style.transformOrigin = flipped ? 'right center' : 'left center';
    /* Connector: the node frame to the caption's nearest corner. */
    const lx = ssx / dpr - BLEED;
    const ly = ssy / dpr - BLEED;
    const ch = cap.offsetHeight;
    const bx = Math.abs(left + cw - lx) < Math.abs(left - lx) ? left + cw : left;
    const by = Math.abs(top + ch - ly) < Math.abs(top - ly) ? top + ch : top;
    const dx = bx - lx;
    const dy = by - ly;
    link.style.left = `${lx}px`;
    link.style.top = `${ly}px`;
    link.style.width = `${Math.hypot(dx, dy).toFixed(1)}px`;
    link.style.transform = `rotate(${Math.atan2(dy, dx).toFixed(4)}rad)`;
    link.style.opacity = op;
  };

  const draw = (now, dt) => {
    const age = (now - born) / 1000;
    const reveal = reduced ? 1 : Math.min(1, age / 0.9);
    const ez = 1 - Math.pow(1 - reveal, 3);
    const edge_in = reduced ? 1 : Math.min(1, Math.max(0, (age - 0.6) / 0.8));
    const actor_in = reduced ? 1 : Math.min(1, Math.max(0, (age - 1.15) / 0.6));
    const sweep = reduced ? 3 : age * 1.25;

    /* Synaptic pulses random-walk the plexus, heating crossed edges. */
    if (!reduced) {
      for (const pulse of PULSES) {
        pulse.t += dt * pulse.speed;
        while (pulse.t >= 1) {
          pulse.t -= 1;
          if (pulse.to >= 0) {
            const key = pulse.at < pulse.to
              ? pulse.at * NN + pulse.to
              : pulse.to * NN + pulse.at;
            const e = _ekey.get(key);
            if (e !== undefined) {
              HEAT[e] = 1;
            }
            pulse.prev = pulse.at;
            pulse.at = pulse.to;
          }
          const nbrs = ADJ[pulse.at];
          if (!nbrs.length) {
            pulse.at = _rand_node();
            pulse.to = -1;
            continue;
          }
          let nx = nbrs[(Math.random() * nbrs.length) | 0];
          if (nx === pulse.prev && nbrs.length > 1) {
            nx = nbrs[(Math.random() * nbrs.length) | 0];
          }
          pulse.to = nx;
        }
        if (pulse.to >= 0 && pulse.t >= 0) {
          const n0 = NODES[pulse.at];
          const n1 = NODES[pulse.to];
          const u = pulse.t;
          pulse.wp = [
            n0[0] + (n1[0] - n0[0]) * u,
            n0[1] + (n1[1] - n0[1]) * u,
            n0[2] + (n1[2] - n0[2]) * u,
          ];
        } else {
          pulse.wp = null;
        }
      }
    }

    /* Cortical region activations feed a shader uniform. */
    if (!reduced && age > next_region && REGIONS.length < 3) {
      _spawn_region(REGIONS.length === 0 && age < 3 ? MEDIAL : null, age);
      next_region = age + 0.8 + Math.random() * 1.0;
    }
    for (let ri = REGIONS.length - 1; ri >= 0; ri--) {
      if ((age - REGIONS[ri].t0) / REGIONS[ri].life >= 1) {
        REGIONS.splice(ri, 1);
      }
    }
    reg_u.fill(0);
    for (let i = 0; i < REGIONS.length && i < 4; i++) {
      const reg = REGIONS[i];
      const ru = Math.min(1, Math.max(0, (age - reg.t0) / reg.life));
      reg.env = Math.sin(Math.PI * ru) ** 2;
      reg_u[i * 4] = reg.c[0];
      reg_u[i * 4 + 1] = reg.c[1];
      reg_u[i * 4 + 2] = reg.c[2];
      reg_u[i * 4 + 3] = reg.env;
    }

    /* Heat decay + travelling arc packets → per-vertex heat buffer. */
    const decay = reduced ? 1 : Math.pow(0.35, dt);
    for (let e = 0; e < E; e++) {
      HEAT[e] *= decay;
      heat_buf[e * 2] = HEAT[e];
      heat_buf[e * 2 + 1] = HEAT[e];
    }
    for (let ai = 0; ai < ARC_N; ai++) {
      const arc = ARCS[ai];
      const u = reduced ? 0.35 + ai * 0.16 : (age - arc.t0) / arc.dur;
      if (!reduced && u > 1.3) {
        _bake_arc(ai, age + 0.6 + Math.random() * 1.6);
      }
      const base = E * 2 + ai * ARC_SEGS * 2;
      for (let s = 0; s < ARC_SEGS; s++) {
        const ts = (s + 0.5) / ARC_SEGS;
        const hd = (ts - u) * 7;
        const h = Math.exp(-hd * hd) * 0.95;
        heat_buf[base + s * 2] = h;
        heat_buf[base + s * 2 + 1] = h;
      }
    }

    /* Pins pop as their region faces the camera; the caption keeps its
       pin until a rival clearly wins — identical to the 2D brain. */
    let front = null;
    let locked = null;
    for (let i = 0; i < POI.length; i++) {
      const poi = POI[i];
      const q = rot_cpu(poi.p);
      const facing = q[2] > 0.22;
      poi.pop += ((facing ? 1 : 0) - poi.pop) * (reduced ? 1 : 0.09);
      if (poi.pop < 0.02) {
        continue;
      }
      const s = proj_cpu(q);
      const ss = proj_cpu(rot_cpu(poi.sub));
      if (facing && (!front || q[2] > front.z)) {
        front = { i, s, ss, z: q[2], pop: poi.pop };
      }
      if (facing && i === front_lock) {
        locked = { i, s, ss, z: q[2], pop: poi.pop };
      }
    }
    if (locked && front && front.i !== front_lock && front.z - locked.z < 0.10) {
      front = locked;
    }
    front_lock = front ? front.i : -1;

    /* Dynamic point actors: pulse heads and pin cores. */
    let an = 0;
    if (!reduced) {
      for (const pulse of PULSES) {
        if (!pulse.wp) {
          continue;
        }
        _actor(an, pulse.wp, 4.0, 0.95, 1.0);
        an++;
      }
    }
    for (const poi of POI) {
      if (poi.pop < 0.02) {
        continue;
      }
      /* The dot belongs to the node frame — it sits at the sub node. */
      _actor(an, poi.sub, 3.0 * poi.pop, 0.95 * poi.pop, 0.9);
      an++;
    }

    /* Glow quads: core halo, region blooms, pulse halos, pin reticles. */
    qn = 0;
    for (let i = 0; i < REGIONS.length && i < 4; i++) {
      const reg = REGIONS[i];
      if (reg.env < 0.01) {
        continue;
      }
      _quad(reg.c, 0.30 * (0.7 + 0.3 * reg.env), GOLD3, 0.12 * reg.env * ez, 0, 0);
    }
    if (!reduced) {
      for (const pulse of PULSES) {
        if (!pulse.wp) {
          continue;
        }
        _quad(pulse.wp, 0.085, GOLD3, 0.26 * ez, 0, 0);
      }
    }
    for (let i = 0; i < POI.length; i++) {
      const poi = POI[i];
      if (poi.pop < 0.02) {
        continue;
      }
      /* Outer frame on the pin; node frame + dot glow at its sub node. */
      _quad(poi.p, 0.175, GOLD3, 0.75 * poi.pop * ez, 0, 1);
      _quad(poi.sub, 0.05, GOLD3, 0.9 * poi.pop * ez, 0, 2);
      _quad(poi.sub, 0.07, GOLD3, 0.30 * poi.pop * ez, 0, 0);
    }

    if (!G.ready) {
      return;
    }
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const rot_m = _mul3([1, 0, 0, 0, cp, sp, 0, -sp, cp], [cy, 0, sy, 0, 1, 0, -sy, 0, cy]);
    const rf = R * F;

    gl.viewport(0, 0, W, H);
    gl.clear(gl.COLOR_BUFFER_BIT);

    /* Fake-bloom glow quads first (additive, order-insensitive). */
    gl.useProgram(G.quad_prog);
    gl.uniformMatrix3fv(G.u.quad.u_rot, false, rot_m);
    gl.uniform2f(G.u.quad.u_res, W, H);
    gl.uniform1f(G.u.quad.u_rf, rf);
    gl.uniform1f(G.u.quad.u_camd, CAMD);
    gl.uniform1i(G.u.quad.u_tex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, G.tex);
    gl.bindBuffer(gl.ARRAY_BUFFER, G.buf_quad);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, qbuf, 0, qn * 72);
    gl.bindVertexArray(G.vao_quad);
    gl.drawArrays(gl.TRIANGLES, 0, qn * 6);

    /* Plexus + data arcs. */
    gl.useProgram(G.lns_prog);
    gl.uniformMatrix3fv(G.u.lns.u_rot, false, rot_m);
    gl.uniform2f(G.u.lns.u_res, W, H);
    gl.uniform1f(G.u.lns.u_rf, rf);
    gl.uniform1f(G.u.lns.u_camd, CAMD);
    gl.uniform3f(G.u.lns.u_fg, FG3[0], FG3[1], FG3[2]);
    gl.uniform3f(G.u.lns.u_gold, GOLD3[0], GOLD3[1], GOLD3[2]);
    gl.uniform4fv(G.u.lns.u_regions, reg_u);
    gl.uniform1f(G.u.lns.u_reveal, ez * edge_in);
    gl.bindBuffer(gl.ARRAY_BUFFER, G.buf_heat);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, heat_buf);
    gl.bindVertexArray(G.vao_edges);
    gl.drawArrays(gl.LINES, 0, TOTAL_LV);

    /* Point clouds: interior dust, surface, synapse nodes, actors. */
    gl.useProgram(G.pts_prog);
    gl.uniformMatrix3fv(G.u.pts.u_rot, false, rot_m);
    gl.uniform2f(G.u.pts.u_res, W, H);
    gl.uniform1f(G.u.pts.u_rf, rf);
    gl.uniform1f(G.u.pts.u_camd, CAMD);
    gl.uniform1f(G.u.pts.u_dpr, dpr);
    gl.uniform1f(G.u.pts.u_sweep, sweep);
    gl.uniform3f(G.u.pts.u_gold, GOLD3[0], GOLD3[1], GOLD3[2]);
    gl.uniform4fv(G.u.pts.u_regions, reg_u);
    gl.uniform1f(G.u.pts.u_reveal, ez);
    gl.uniform3f(G.u.pts.u_base, GOLD3[0], GOLD3[1], GOLD3[2]);
    gl.bindVertexArray(G.vao_dust);
    gl.drawArrays(gl.POINTS, 0, DUST.length);
    gl.uniform3f(G.u.pts.u_base, FG3[0], FG3[1], FG3[2]);
    gl.bindVertexArray(G.vao_surf);
    gl.drawArrays(gl.POINTS, 0, SURF.length);
    gl.uniform1f(G.u.pts.u_reveal, ez * edge_in);
    gl.bindVertexArray(G.vao_nodes);
    gl.drawArrays(gl.POINTS, 0, NN);
    gl.uniform1f(G.u.pts.u_reveal, ez * actor_in);
    gl.uniform3f(G.u.pts.u_base, GOLD3[0], GOLD3[1], GOLD3[2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, G.buf_actors);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, abuf, 0, an * 7);
    gl.bindVertexArray(G.vao_actors);
    gl.drawArrays(gl.POINTS, 0, an);
    gl.bindVertexArray(null);

    if (front) {
      active_pin.value = front.i;
      const bob = reduced ? 0 : Math.sin(age / 10.5 * 6.283) * 6;
      if (cap) {
        _place_cap(front.s[0], front.s[1], bob, front.pop, front.ss[0], front.ss[1]);
      }
    } else {
      active_pin.value = -1;
    }
  };

  const frame = (now) => {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!drag) {
      yaw += 0.0314 / 60;
      yaw += vel;
      vel *= 0.90;
    }
    draw(now, dt);
    _raf = requestAnimationFrame(frame);
  };
  const pump = () => {
    if (_raf === null && props.live && !document.hidden && !reduced) {
      born = born || performance.now();
      last = 0;
      _raf = requestAnimationFrame(frame);
    }
  };
  const halt = () => {
    if (_raf !== null) {
      cancelAnimationFrame(_raf);
      _raf = null;
    }
  };
  const listen = (target, ev, fn, opts) => {
    target.addEventListener(ev, fn, opts);
    _cleanup.push(() => target.removeEventListener(ev, fn, opts));
  };

  if (!boot()) {
    cv.style.display = 'none';
    return;
  }
  size();
  listen(window, 'resize', size);
  listen(cv, 'webglcontextlost', (e) => {
    e.preventDefault();
    halt();
  });
  listen(cv, 'webglcontextrestored', () => {
    if (boot()) {
      size();
      if (reduced) {
        requestAnimationFrame((n) => draw(n, 0));
      } else {
        pump();
      }
    }
  });

  if (reduced) {
    /* Reduced motion still owes the layout a settled static frame. */
    born = performance.now() - 10000;
    _spawn_region(MEDIAL, 9.25);
    requestAnimationFrame((n) => draw(n, 0));
    return;
  }

  /* Drag follows the finger: surface moves with the cursor, then coasts. */
  listen(cv, 'pointerdown', (e) => {
    drag = { x: e.clientX };
    try {
      cv.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture is best-effort */
    }
  });
  listen(cv, 'pointermove', (e) => {
    if (!drag) {
      return;
    }
    const dx = e.clientX - drag.x;
    drag.x = e.clientX;
    yaw -= dx * 0.006;
    vel = -dx * 0.006;
  });
  const end_drag = () => {
    drag = null;
  };
  listen(cv, 'pointerup', end_drag);
  listen(cv, 'pointercancel', end_drag);
  listen(document, 'visibilitychange', () => {
    if (document.hidden) {
      halt();
    } else {
      pump();
    }
  });

  watch(() => props.live, (v) => {
    if (v) {
      pump();
    } else {
      halt();
    }
  });
  _cleanup.push(halt);
  pump();
});

onBeforeUnmount(() => {
  for (const fn of _cleanup) {
    fn();
  }
  _cleanup = [];
});
</script>

<template>
  <div
    ref="host_ref"
    class="experience-brain"
    aria-hidden="true"
    data-nosnippet
  >
    <canvas ref="canvas_ref" class="experience-brain__canvas" />
    <span v-show="active_id" ref="link_ref" class="experience-brain__link" />
    <div v-show="active_id" ref="cap_ref" class="experience-brain__cap">
      <span v-if="active_id" class="experience-brain__cap-text">
        {{ t(`kyo-web.landing.experience.brain.${active_id}`) }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.experience-brain {
  position: relative;
  width: 100%;
  aspect-ratio: 1;

  /* Bleeds 40px past the host; keep in lockstep with the JS BLEED. */
  &__canvas {
    display: block;
    position: absolute;
    inset: -40px;
    width: calc(100% + 80px);
    height: calc(100% + 80px);
    touch-action: pan-y;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  /* Connector between the target square and its caption. */
  &__link {
    position: absolute;
    top: 0;
    left: 0;
    height: 1px;
    background: color-mix(in srgb, var(--clr-primary-100) 70%, transparent);
    transform-origin: 0 0;
    pointer-events: none;
  }

  &__cap {
    position: absolute;
    top: 0;
    left: 0;
    width: max-content;
    /* Cloudflare-style dashed hairline, no corner marks; page-bg surface. */
    border: 1px dashed color-mix(in srgb, var(--clr-primary-100) 45%, transparent);
    background: var(--clr-neutral-500);
    padding: 0.75rem 1rem;
    pointer-events: none;
    transform-origin: left center;
    font-family: "SpaceMono", monospace;
  }

  &__cap-text {
    display: block;
    color: var(--clr-primary-100);
    font-size: var(--fs-200);
    line-height: 1.5;
    letter-spacing: 0.02em;
    max-width: 24ch;
  }
}
</style>
