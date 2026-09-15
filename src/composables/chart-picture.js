/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * chart-picture.js — turn an engine bar chart into an image the viewer can zoom.
 *
 * ITS OWN CHUNK, ON PURPOSE. Only a reader who taps a chart ever runs this, and
 * only two articles have one, so it is imported dynamically by
 * use-blog-lightbox.js rather than riding in the article chunk every reader
 * downloads. Measured in that chunk it was ~0.7 KB gzipped — a sixth of the
 * article's whole budget, for a button most readers never press. It is named
 * `chart-picture`, not `blog-…`, so the archive's `blog-*` size glob cannot
 * sweep it into a total no visitor downloads.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/* An SVG loaded as an image is its own document: the page's stylesheets do not
   reach it, so every visual property the book sets through CSS is copied onto
   the element that uses it. The faces cannot follow (an image never sees the
   page's web fonts) and fall back to the generic family, which is the one
   honest loss. */
const INLINED = [
  'fill', 'stroke', 'stroke-width',
  'font-family', 'font-size', 'font-weight', 'letter-spacing',
];

/* A MARGIN OF GROUND around the plot, deeper at the foot. The viewer paints its
   `// IMG :: …` label over the bottom-right corner of whatever it shows — empty
   sky on a photograph, but on a chart that is exactly where the last category
   label sits, and the first screenshot had it covering two of three. The extra
   ground gives the label somewhere empty to land. */
const PAD = 24;
const FOOT = 56;

/*
 * TWICE THE BOX, SO THE CHART OPENS LARGE — and that is all this number does.
 * It is the picture's natural size, which the viewer caps at the screen: at 1×
 * a 720-unit chart would open 768px wide on a desktop, at 2× it fills the
 * frame.
 *
 * IT IS NOT WHAT KEEPS A ZOOM SHARP. The picture stays an SVG, and both
 * engines re-rasterise an SVG image at its TRANSFORMED size, so the viewer's
 * CSS scale never stretches a bitmap. Measured at 800% (1280px, and a 390px
 * phone at DPR 3; Chromium and Firefox; wheel and the animated "+"), the
 * viewer matched the same drawing laid out at 8× — under one grey level of
 * 255 apart on average, the same edge sharpness — while a 2× PNG of it under
 * the same transform came out about six times softer. Raising this changes
 * nothing once the viewer's cap is reached; flattening the chart to a PNG or
 * a canvas "for speed" would cost exactly that sharpness.
 */
const RASTER = 2;

const styleOf = (node) => {
  const cs = getComputedStyle(node);
  return INLINED.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
};

export const chartPictureFrom = (figure) => {
  const svg = figure.querySelector('svg');
  const copy = svg.cloneNode(true);
  const originals = [svg, ...svg.querySelectorAll('*')];
  const copies = [copy, ...copy.querySelectorAll('*')];
  for (const [i, node] of originals.entries()) {
    copies.at(i).setAttribute('style', styleOf(node));
  }

  /* The engine always writes a viewBox; the drawing's own bounds stand in if a
     future chart ever does not, rather than a NaN box. */
  const vb = svg.viewBox && svg.viewBox.baseVal;
  const { x: vx, y: vy, width: vw, height: vh } = vb && vb.width ? vb : svg.getBBox();
  const x = vx - PAD;
  const y = vy - PAD;
  const width = vw + PAD + PAD;
  const height = vh + PAD + FOOT;
  copy.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  copy.setAttribute('xmlns', SVG_NS);
  copy.setAttribute('width', String(width * RASTER));
  copy.setAttribute('height', String(height * RASTER));
  copy.removeAttribute('aria-hidden');

  /* The chart is drawn for this page's ground; give the image the same one so
     its muted labels keep their contrast whatever the viewer puts behind it. */
  const ground = document.createElementNS(SVG_NS, 'rect');
  ground.setAttribute('x', String(x));
  ground.setAttribute('y', String(y));
  ground.setAttribute('width', String(width));
  ground.setAttribute('height', String(height));
  ground.setAttribute('fill', getComputedStyle(document.body).backgroundColor);
  copy.insertBefore(ground, copy.firstChild);

  const xml = new XMLSerializer().serializeToString(copy);
  return {
    name: 'chart',
    ext: 'svg',
    fallback: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`,
    avif: null,
    webp: null,
  };
};

export default chartPictureFrom;
