/**
 * @file svg-icon.component.js
 *
 * Defines a simple <svg-icon> web component that,
 * given a `name` attribute, looks up the corresponding
 * .svg file under src/assets/app/svg/ and renders it as
 * a plain <img> tag.
 *
 * Usage in HTML:
 *   <svg-icon name="LOGO_KYONAX" class="my-class" alt="Site logo"></svg-icon>
 *
 * This assumes your SVG files are in:
 *   src/assets/app/svg/LOGO_KYONAX.svg
 *   src/assets/app/svg/another-icon.svg
 *   …etc…
 *
 * Webpack’s `type: "asset/resource"` rule for .svg will
 * make each import return a URL string (e.g. "/assets/svg/LOGO_KYONAX.svg").
 *
 * Author: Cristian Moreno (Kyonax)
 * Date: 2025-06-05
 */

// 1. Require all SVGs in src/assets/app/svg/ via Webpack’s require.context.
//    This will create an object mapping "LOGO_KYONAX" → "/assets/svg/LOGO_KYONAX.svg".
const svgContext = require.context(
  // path relative to THIS file:
  "../../assets/app",
  /* do not recurse into subfolders */ false,
  /* match only .svg files */ /\.svg$/,
);

const svgMap = svgContext.keys().reduce((map, filePath) => {
  // filePath is something like "./LOGO_KYONAX.svg"
  const key = filePath.replace(/^\.\//, "").replace(/\.svg$/, "");
  // e.g. key = "LOGO_KYONAX"
  map[key] = svgContext(filePath);
  return map;
}, {});

/**
 * <svg-icon name="FOO" ...>
 *
 * - `name`: the base filename (without .svg) under src/assets/app/svg/
 * - `alt` (optional): alt text for the <img> (defaults to the name if omitted)
 * - any other attributes (class, style, data-*, etc.) will be forwarded to the <img>.
 */
class SvgIcon extends HTMLElement {
  connectedCallback() {
    // 1) Read the “name” attribute
    const iconName = this.getAttribute("name");
    if (!iconName) {
      console.warn("<svg-icon> was used without a name attribute.");
      return;
    }

    // 2) Look up the imported URL in our map
    const svgUrl = svgMap[iconName];
    if (!svgUrl) {
      console.warn(
        `<svg-icon> could not find "${iconName}" in src/assets/app/svg/ (svgMap keys: ${Object.keys(
          svgMap,
        ).join(", ")})`,
      );
      return;
    }

    // 3) Create an <img> and set src=svgUrl
    const img = document.createElement("img");
    img.src = svgUrl;

    // 4) Alt text (if provided, use that; otherwise default to the name)
    const altText = this.getAttribute("alt") || iconName;
    img.alt = altText;

    // 5) Forward any other attributes (class, style, data-*, etc.) from <svg-icon> to <img>
    //    For simplicity, we’ll forward everything except "name".
    Array.from(this.attributes).forEach((attr) => {
      if (attr.name === "name" || attr.name === "alt") return;
      img.setAttribute(attr.name, attr.value);
    });

    // 6) Empty out any existing children, then append the <img>
    this.innerHTML = "";
    this.appendChild(img);
  }
}

customElements.define("svg-icon", SvgIcon);
