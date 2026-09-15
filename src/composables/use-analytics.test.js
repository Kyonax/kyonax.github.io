/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * use-analytics.test.js — a prerendered page counts no visit until it is shown.
 *
 * WHAT IT PINS. use-analytics.js adds Umami's tag when App mounts, except while
 * the document is prerendering: then it waits for `prerenderingchange`. The
 * browser suite cannot show that, because DevTools cancels every prerender (a
 * Playwright page never has `document.prerendering` true), so it is pinned
 * here, where `document.prerendering` is a property the test owns. happy-dom
 * has none of its own, like every browser that never prerenders.
 *
 * NOTHING LOADS. happy-dom is told to fetch no script and to report each one
 * as loaded, so no run can reach Umami, and none prints a failed load.
 *
 * WRITTEN RED. Before the gate the tag went in at mount whatever the document
 * was doing, so the three cases that mount while prerendering fail on it; the
 * other three are the controls, green either way.
 *
 * CONTRACTS:
 *   1. Not prerendering: one tag at mount, with the site's id and DNT honoured.
 *   2. Prerendering: no tag until `prerenderingchange`, then exactly one.
 *   3. However often it is mounted or shown, one tag.
 *   4. The opt-out is read when the page is shown, not when it was prerendered.
 *   5. A browser with no `document.prerendering` gets the tag at mount.
 */

import useAnalytics from '@composables/use-analytics';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createApp, h } from 'vue';

const TRACKER = 'script[src="https://cloud.umami.is/script.js"]';
const WEBSITE_ID = '986ec25b-3715-4d9e-8e63-f168650bfac7';

let prerendering = false;
let apps = [];

/* A component that calls the composable from its setup, as App.vue does. */
const mountOne = () => {
  const el = document.createElement('div');
  document.body.append(el);
  const app = createApp({
    setup() {
      useAnalytics();
      return () => h('div');
    },
  });
  app.mount(el);
  apps.push(app);
};

const trackers = () => [...document.querySelectorAll(TRACKER)];

/*
 * NODE 25 SHIPS ITS OWN localStorage, AND IT SHADOWS happy-dom's. Without a
 * --localstorage-file it is an object whose methods do not work, so the
 * composable's read fails closed and every case would see a visitor who opted
 * out. Each case gets a plain in-memory Storage instead, on the global and on
 * window, the two names this file and the composable use.
 */
const memoryStorage = () => {
  const items = new Map();
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => {
      items.set(key, String(value));
    },
    removeItem: (key) => {
      items.delete(key);
    },
    clear: () => {
      items.clear();
    },
    key: (i) => Array.from(items.keys()).at(i) ?? null,
    get length() {
      return items.size;
    },
  };
};

/* The page is shown: the flag drops, then the event fires, in the order the
   HTML spec activates a prerendered document. */
const show = () => {
  prerendering = false;
  document.dispatchEvent(new Event('prerenderingchange'));
};

beforeEach(() => {
  const settings = globalThis.happyDOM?.settings;
  if (settings) {
    settings.disableJavaScriptFileLoading = true;
    settings.handleDisabledFileLoadingAsSuccess = true;
  }
  const storage = memoryStorage();
  vi.stubGlobal('localStorage', storage);
  if (window.localStorage !== storage) {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
  }
  prerendering = false;
  Object.defineProperty(document, 'prerendering', {
    configurable: true,
    get: () => prerendering,
  });
});

afterEach(() => {
  /* A case that left the gate waiting would hand its listener to the next
     one; shown now, it fires here, before everything is swept. */
  show();
  for (const app of apps) {
    app.unmount();
  }
  apps = [];
  for (const script of document.querySelectorAll('script')) {
    script.remove();
  }
  document.body.replaceChildren();
  delete window.__umami_loaded;
  localStorage.clear();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'prerendering');
});

test('adds the tracker at mount when the page is not prerendering', () => {
  mountOne();

  const found = trackers();
  expect(found.length, 'a page that is simply open got no tracker').toBe(1);
  expect(found[0].getAttribute('data-website-id'), 'the tracker carries the wrong website id').toBe(WEBSITE_ID);
  expect(found[0].getAttribute('data-do-not-track'), 'the tracker does not honour Do Not Track').toBe('true');
});

test('waits while the page is prerendering, and adds the tracker once it is shown', () => {
  prerendering = true;
  mountOne();
  expect(trackers().length, 'the tracker went in while the page was only prerendered').toBe(0);

  show();
  expect(trackers().length, 'the page was shown and still has no tracker').toBe(1);
});

test('adds one tracker however often it is mounted or shown', () => {
  prerendering = true;
  mountOne();
  mountOne();
  expect(trackers().length, 'mounting twice while prerendering added a tracker').toBe(0);

  show();
  show();
  mountOne();
  expect(trackers().length, 'the page carries more than one tracker').toBe(1);
});

test('reads the opt-out when the page is shown, not when it was prerendered', () => {
  prerendering = true;
  mountOne();
  localStorage.setItem('umami.disabled', '1');

  show();
  expect(trackers().length, 'a visitor who opted out before the page was shown got the tracker').toBe(0);
});

test('adds nothing for a visitor who opted out', () => {
  localStorage.setItem('umami.disabled', '1');
  mountOne();
  expect(trackers().length, 'the tracker went in with umami.disabled set').toBe(0);
});

test('adds the tracker at mount in a browser with no document.prerendering', () => {
  Reflect.deleteProperty(document, 'prerendering');
  expect('prerendering' in document, 'this document still has a prerendering property to lean on').toBe(false);

  mountOne();
  expect(trackers().length, 'a browser that never prerenders got no tracker').toBe(1);
});
