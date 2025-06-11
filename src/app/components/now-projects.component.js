/**
 * @file now-projects.component.js - NowProjectsComponent
 *
 * Show the Current Projects going on, with countdowns for each deadline.
 * Uses a Web Worker to compute countdowns off the main thread for improved performance.
 *
 * node.js-v20.18.1
 *
 * @author Cristian Moreno (Kyonax)
 * @contact iamkyo@kyo.wtf
 * @date 2025-05-29
 *
 * Code Guidelines :: @CCSv0.1
 * More details: https://code-guidelines.cybercodesyndicate.org
 * - Tabs only—no spaces.
 * - Naming:
 *   - snake_case for variables/methods.
 *   - _private_method() for private methods (underscore prefix).
 *   - UPPER_SNAKE_CASE for constants (in constant files).
 *   - kebab-case for file names (e.g., file-example.js).
 * - Meaningful names—fetch_user_data() over doThing().
 *
 * Repository-URL
 * https://github.com/Kyonax/kyo-web-online
 *
 * @dependencies
 * - PROJECTS from "@constants/Projects"
 *
 * @usage
 * <now-projects quantity="amount of projects to show"></now-projects>
 */
import { PROJECTS } from "@constants/Projects";

class NowProjectsComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.worker = new Worker(
      new URL("../workers/now-project.worker.js", import.meta.url),
    );
    this.worker.onmessage = this._handle_worker_message.bind(this);
    this._elements = {};
    this._initialized = false; // Prevent double initialization
  }

  connectedCallback() {
    if (this._initialized) return;
    this._initialized = true;
    this._setup();
  }

  _setup() {
    const style = document.createElement("style");
    style.textContent = `
    a {
      text-decoration: none;
      color: var(--clr-neutral-200);
      display: grid;
      grid-template-columns: max-content max-content max-content;
      gap: 1rem;
      padding: 0.5rem;
      width: 100%;
      background-color: var(--clr-neutral-500);
      border: 1px solid var(--clr-border-100);
      margin-bottom: 0.5rem;
      position: relative;
      font-family: Geomanist;
      font-size: 2rem;
    }

    span {
      font-size: 1rem;
      color: var(--clr-neutral-300);
    }

    a:hover {
      color: var(--clr-neutral-100);
      background-image: linear-gradient(
          to right,
          var(--clr-border-500),
          var(--clr-neutral-500)
      );

      span {
       color: var(--clr-neutral-300);
      }
    }

    .deadline-label {
      font-weight: 700;
      font-family: PPmodwest;
      color: var(--clr-warning-100);
    }

    @media (max-width: 482px) {
      a {
         font-size: 1.5rem;
         gap: 0rem
      }

      span {
         font-size: 0.9rem;
      }
    }

    @media (max-width: 670px) {
      a {
         grid-template-columns: auto;
         gap: 0.2rem;
      }
    }
  `;
    const qty = parseInt(
      this.getAttribute("quantity") || Object.keys(PROJECTS).length,
      10,
    );
    const keys = Object.keys(PROJECTS).slice(0, qty);

    // Create single container
    const container = document.createElement("div");

    keys.forEach((key) => {
      const project = PROJECTS[key];

      // Create single anchor per project
      const anchor = document.createElement("a");
      anchor.href = project.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.dataset.projectKey = key;

      // Add project name directly to anchor
      anchor.appendChild(document.createTextNode(project.name));

      // Create span for deadline countdown
      const deadlineSpan = document.createElement("span");
      anchor.appendChild(deadlineSpan);

      container.appendChild(anchor);
      this._elements[key] = deadlineSpan;
    });

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(container);
    this.worker.postMessage({ projects: PROJECTS, keys });
  }

  _handle_worker_message(event) {
    const updates = event.data;
    const lang =
      new URLSearchParams(window.location.search).get("language") || "en";

    const labelMap = {
      en: "ENDS IN",
      es: "TERMINA EN",
    };

    Object.entries(updates).forEach(([key, data]) => {
      const span = this._elements[key];
      if (span && data.deadline) {
        const label = labelMap[lang] || labelMap.en;
        span.textContent = `( ${data.deadline.label} ${label} ${data.deadline.countdown}_UTC-5 )`;
      }
    });
  }
}

// Remove manual initialization - browser handles this automatically
customElements.define("now-projects", NowProjectsComponent);
