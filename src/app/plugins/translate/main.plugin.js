/**
 * @file main.plugin.js - Web Translation
 *
 * Translate all the Texts on the Website, based
 * on the User needs.
 *
 * node.js-v20.18.1
 *
 * @author Cristian Moreno (Kyonax)
 * @contact iamkyo@kyo.wtf
 * @date 2025-05-27
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
 * - CV_BUTTON from "@constants/Data"
 */
import { TRANSLATIONS } from '@constants/Snippets';

const init = () => {
    const language = _get_language();
    console.log(`ƛ :: TRANSLATION STARTED - LANGUAGE SET TO [${language.toUpperCase()}]`);

    const translatable_elements = _get_translatable_elements();

    for (const { key, element } of translatable_elements) {
        const translated_html = _get_translation_by_key(language, key);
        if (translated_html) {
            element.innerHTML = translated_html;
        } else {
            console.warn(`ƛ :: MISSING TRANSLATION - ${key.toUpperCase()} [${language.toUpperCase()}]`);
        }
    }
};

/**
 * Gets the language from cookie or URL (?language=xx)
 * Fallbacks to 'en'
 * @returns {string}
 */
const _get_language = () => {
    const url_params = new URLSearchParams(window.location.search);
    const lang_from_url = url_params.get('language');

    if (lang_from_url) return lang_from_url;

    const cookie_match = document.cookie.match(/(?:^|;\s*)language=([^;]+)/);
    return cookie_match ? cookie_match[1] : 'en';
};

/**
 * Given a dot.notation string key, retrieves the translation HTML
 * from TRANSLATIONS
 * @param {string} lang
 * @param {string} key
 * @returns {string|null}
 */
const _get_translation_by_key = (lang, key) => {
    const parts = key.split('.');
    let result = TRANSLATIONS[lang];

    for (const part of parts) {
        if (result && typeof result === 'object' && part in result) {
            result = result[part];
        } else {
            return null;
        }
    }

    return typeof result === 'string' ? result : null;
};

/**
 * Gets all elements with a "trans" attribute and their DOM node.
 * @returns {Object[]} An array of objects with the key and element reference
 */
const _get_translatable_elements = () => {
    const elements = document.querySelectorAll('[trans]');
    const result = [];

    for (const element of elements) {
        if (_is_element_visible(element)) {
            const translation_key = element.getAttribute('trans');
            result.push({
                key: translation_key,
                element: element
            });
        }
    }

    return result;
};

const _is_element_visible = (element) => {
    const computed_style = window.getComputedStyle(element);
    return (
        computed_style &&
        computed_style.display !== 'none' &&
        computed_style.visibility !== 'hidden' &&
        computed_style.opacity !== '0' &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0
    );
};

export default { init };
