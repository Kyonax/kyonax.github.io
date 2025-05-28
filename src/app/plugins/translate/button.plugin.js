/**
 * @file button.plugin.js - button to select language
 *
 * selects the language for the landing page
 *
 * node.js-v20.18.1
 *
 * @author cristian moreno (kyonax)
 * @contact iamkyo@kyo.wtf
 * @date 2025-05-27
 *
 * code guidelines :: @ccsv0.1
 * more details: https://code-guidelines.cybercodesyndicate.org
 * - tabs only—no spaces.
 * - naming:
 *   - snake_case for variables/methods.
 *   - _private_method() for private methods (underscore prefix).
 *   - upper_snake_case for constants (in constant files).
 *   - kebab-case for file names (e.g., file-example.js).
 * - meaningful names—fetch_user_data() over dothing().
 *
 * repository-url
 * https://github.com/kyonax/kyo-web-online
 *
 * @dependencies
 * - cv_button from "@constants/data"
 */

const init = () => {
  document.addEventListener('DOMContentLoaded', () => {
    const toggle_button = document.getElementById('language-toggle');
    const language_list = document.getElementById('language-list');

    if (!toggle_button || !language_list) return;

    _handle_language_toggle(toggle_button, language_list);
    _handle_language_selection(language_list);
    _handle_click_outside(language_list);
  });
};

/**
 * Toggles the visibility of the language list dropdown.
 * @param {HTMLElement} toggle_button
 * @param {HTMLElement} language_list
 */
const _handle_language_toggle = (toggle_button, language_list) => {
  toggle_button.addEventListener('click', () => {
    language_list.classList.toggle('hidden');
  });
};

/**
 * Updates the current URL with the selected language from the dropdown.
 * @param {HTMLElement} language_list
 */
const _handle_language_selection = (language_list) => {
  language_list.addEventListener('click', (event) => {
    const target_item = event.target;

    if (target_item && target_item.matches('li[data-lang]')) {
      const selected_lang = target_item.getAttribute('data-lang');
      const current_url = new URL(window.location.href);

      current_url.searchParams.set('language', selected_lang);
      window.location.href = current_url.toString();
    }
  });
};

/**
 * Hides the language list if a click happens outside of the language selector.
 * @param {HTMLElement} language_list
 */
const _handle_click_outside = (language_list) => {
  document.addEventListener('click', (event) => {
    const selector_container = document.querySelector('.translate-button');

    if (!selector_container.contains(event.target)) {
      language_list.classList.add('hidden');
    }
  });
};

export default { init };
