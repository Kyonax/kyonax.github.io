/**
 * @file vimeo-video.component.js - VimeoVideo
 *
 * Dynamic Vimeo embed component.
 * Shows a different Vimeo video depending on the `language` query param.
 *
 * Usage:
 *   <vimeo-video></vimeo-video>
 * or to override defaults:
 *   <vimeo-video video-en="1114902415" video-es="1114902626" autoplay muted loop></vimeo-video>
 *
 * The component listens to:
 *  - popstate (back/forward) to re-render when the query param changes
 *  - a custom event "kyo:language-changed" (detail: { language: 'es' }) to re-render immediately
 *
 * Place this file in @components (so your require.context in index.js loads it).
 */

(function () {
  // keep everything local to avoid globals
  const DEFAULT_VIDEOS = {
    en: "1114902415",
    es: "1114902626",
  };

  class VimeoVideo extends HTMLElement {
    constructor() {
      super();

      // instance state
      this._container = null;
      this._current_video_id = null;

      // bound handlers so we can add/remove listeners
      this._on_popstate = this._on_popstate.bind(this);
      this._on_custom_language_change =
        this._on_custom_language_change.bind(this);
    }

    connectedCallback() {
      // create a host wrapper if not present
      if (!this.classList.contains("vimeo-video")) {
        this.classList.add("vimeo-video");
      }

      // render initially
      this._render_for_current_language();

      // listen for url/popstate changes (back/forward)
      window.addEventListener("popstate", this._on_popstate);

      // listen for a custom event to change language from UI
      window.addEventListener(
        "kyo:language-changed",
        this._on_custom_language_change,
      );
    }

    disconnectedCallback() {
      window.removeEventListener("popstate", this._on_popstate);
      window.removeEventListener(
        "kyo:language-changed",
        this._on_custom_language_change,
      );
    }

    /**
     * Read video IDs:
     * - attributes override defaults: video-en, video-es
     */
    _get_videos_map() {
      const videos = Object.assign({}, DEFAULT_VIDEOS);

      const attr_en = this.getAttribute("video-en");
      const attr_es = this.getAttribute("video-es");
      if (attr_en) videos.en = attr_en;
      if (attr_es) videos.es = attr_es;

      return videos;
    }

    /**
     * Parse language from query param 'language'
     * If missing, fallback to navigator.language (e.g. "es-CO" -> "es"),
     * otherwise fallback to "en".
     */
    _get_language_from_query() {
      try {
        const params = new URLSearchParams(window.location.search);
        const q = params.get("language");
        if (q) {
          return q.toLowerCase();
        } else {
          return "en";
        }
      } catch (err) {
        // ignore
      }

      // fallback to browser language
      const nav = (navigator && navigator.language) || "";
      const base = nav.split("-")[0].toLowerCase();
      if (base === "es" || base === "en") return base;

      return "en";
    }

    /**
     * choose video id by language
     */
    _choose_video_id(lang) {
      const vids = this._get_videos_map();
      // normalize to short code
      const short = (lang || "").toLowerCase().slice(0, 2);
      return vids[short] || vids.en;
    }

    /**
     * assemble iframe src with optional params
     * The component supports boolean attributes: autoplay, muted, loop
     */
    _build_iframe_src(videoId) {
      const params = new URLSearchParams();
      // allow attribute-driven behaviors
      if (this.hasAttribute("autoplay")) params.set("autoplay", "1");
      if (this.hasAttribute("muted")) params.set("muted", "1");
      if (this.hasAttribute("loop")) params.set("loop", "1");
      // vimeo player options: portrait, title, byline can be disabled
      params.set("title", "0");
      params.set("byline", "0");
      params.set("portrait", "0");

      // final src
      const base = `https://player.vimeo.com/video/${videoId}`;
      const qs = params.toString();
      return qs ? `${base}?${qs}` : base;
    }

    /**
     * Render iframe (replaces existing one for updates)
     */
    _render(videoId) {
      this._current_video_id = videoId;

      // create container if missing
      if (!this._container) {
        const container = document.createElement("div");
        container.className = "vimeo-video__container";

        // inner wrapper keeps aspect ratio
        const aspect = document.createElement("div");
        aspect.className = "vimeo-video__aspect";

        container.appendChild(aspect);
        this.appendChild(container);

        this._container = container;
      }

      const aspect = this._container.querySelector(".vimeo-video__aspect");

      // clear aspect content
      aspect.innerHTML = "";

      // create iframe
      const iframe = document.createElement("iframe");
      iframe.className = "vimeo-video__iframe";
      iframe.src = this._build_iframe_src(videoId);
      iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("title", `Vimeo video ${videoId}`);
      iframe.setAttribute("loading", "lazy");

      aspect.appendChild(iframe);
    }

    /**
     * Render based on current URL query
     */
    _render_for_current_language() {
      const lang = this._get_language_from_query();
      const id = this._choose_video_id(lang);
      // only re-render if id changed (avoid reload)
      if (id !== this._current_video_id) {
        this._render(id);
      }
    }

    _on_popstate() {
      // triggered when user navigates history (back/forward)
      this._render_for_current_language();
    }

    _on_custom_language_change(ev) {
      // ev.detail = { language: 'es' } expected
      let lang = null;
      if (ev && ev.detail && ev.detail.language) lang = ev.detail.language;
      // If no detail provided, re-read URL
      if (!lang) {
        this._render_for_current_language();
        return;
      }
      const id = this._choose_video_id(lang);
      if (id !== this._current_video_id) this._render(id);
    }
  }

  // register component
  if (!customElements.get("vimeo-video")) {
    customElements.define("vimeo-video", VimeoVideo);
  }
})();
