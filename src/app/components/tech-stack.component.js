/**
 * tech-stack.component.js
 * - Renders icon card + name underneath (name outside the card)
 * - Hover uses primary hover color; cursor: help
 * - Accessible: keyboard focus mirrors hover
 */

(function () {
  let DATA = {};
  try {
    DATA = require("@constants/Data");
  } catch (err) {
    console.error("tech-stack: could not load @constants/Data", err);
    DATA = {};
  }

  const TECHS = (DATA && DATA.TECHNOLOGIES) || [];
  const DEFAULT_LANG = (DATA && DATA.DEFAULT_LANGUAGE) || "en";

  class TechStack extends HTMLElement {
    constructor() {
      super();
      this._lang = DEFAULT_LANG;
      this._mounted = false;
      this._on_lang_event = this._on_lang_event.bind(this);
      this._on_popstate = this._on_popstate.bind(this);
    }

    connectedCallback() {
      if (!this.classList.contains("tech-stack"))
        this.classList.add("tech-stack");

      if (!this._mounted) {
        this.innerHTML = `<div class="tech-stack__inner"><div class="tech-grid" role="list"></div></div>`;
        this._mounted = true;
      }

      this._grid = this.querySelector(".tech-grid");
      this._set_lang_from_query_or_nav();
      this._render();

      window.addEventListener("popstate", this._on_popstate);
      window.addEventListener("kyo:language-changed", this._on_lang_event);
    }

    disconnectedCallback() {
      window.removeEventListener("popstate", this._on_popstate);
      window.removeEventListener("kyo:language-changed", this._on_lang_event);
    }

    _on_popstate() {
      this._set_lang_from_query_or_nav();
      this._render();
    }

    _on_lang_event(ev) {
      if (ev && ev.detail && ev.detail.language) {
        this._lang = ev.detail.language.slice(0, 2).toLowerCase();
      } else {
        this._set_lang_from_query_or_nav();
      }
      this._render();
    }

    _set_lang_from_query_or_nav() {
      try {
        const params = new URLSearchParams(window.location.search);
        const q = params.get("language") || params.get("lang");
        if (q) {
          this._lang = q.slice(0, 2).toLowerCase();
          return;
        }
      } catch (e) {}
      const nav = (navigator && navigator.language) || DEFAULT_LANG;
      this._lang = nav.split("-")[0].toLowerCase() || DEFAULT_LANG;
    }

    _render() {
      if (!this._grid) return;
      this._grid.innerHTML = "";

      if (!Array.isArray(TECHS) || TECHS.length === 0) {
        const empty = document.createElement("div");
        empty.className = "tech-empty";
        empty.textContent =
          this._lang === "es"
            ? "Sin tecnologías definidas."
            : "No technologies defined.";
        this._grid.appendChild(empty);
        return;
      }

      TECHS.forEach((t) => {
        const nameText = (t.name && (t.name[this._lang] || t.name.en)) || t.id;

        // item wrapper: contains card + label (label lives outside card)
        const item = document.createElement("div");
        item.className = "tech-item";
        item.setAttribute("role", "listitem");
        item.setAttribute("aria-label", nameText);

        // card (icon only)
        const card = document.createElement("div");
        card.className = "tech-card";
        // keep card focusable so keyboard users can see hover/focus styles
        card.tabIndex = 0;
        card.setAttribute("role", "img");
        card.setAttribute("aria-label", nameText + " icon");

        const iconWrap = document.createElement("div");
        iconWrap.className = "tech-card__icon";

        if (t.iconClass) {
          const i = document.createElement("i");
          i.className = `tech-icon ${t.iconClass}`;
          i.setAttribute("aria-hidden", "true");
          iconWrap.appendChild(i);
        } else if (t.iconGlyph) {
          const g = document.createElement("span");
          g.className = "tech-icon-glyph";
          g.textContent = t.iconGlyph;
          g.setAttribute("aria-hidden", "true");
          iconWrap.appendChild(g);
        } else {
          const fb = document.createElement("span");
          fb.className = "tech-icon-fallback";
          fb.textContent =
            t.name && t.name.en ? t.name.en.slice(0, 2).toUpperCase() : "—";
          fb.setAttribute("aria-hidden", "true");
          iconWrap.appendChild(fb);
        }

        card.appendChild(iconWrap);

        // label (outside the card)
        const label = document.createElement("div");
        label.className = "tech-label";
        label.textContent = nameText;
        label.setAttribute("aria-hidden", "true"); // semantic already provided by item aria-label

        // append: item -> card + label
        item.appendChild(card);
        item.appendChild(label);

        // keyboard: when card receives focus, add focus class to item so label can react
        card.addEventListener("focus", () => item.classList.add("focused"));
        card.addEventListener("blur", () => item.classList.remove("focused"));

        // hover cursor: help (informational)
        item.addEventListener("mouseenter", () =>
          item.classList.add("hovered"),
        );
        item.addEventListener("mouseleave", () =>
          item.classList.remove("hovered"),
        );

        this._grid.appendChild(item);
      });
    }
  }

  if (!customElements.get("tech-stack")) {
    customElements.define("tech-stack", TechStack);
  }
})();
