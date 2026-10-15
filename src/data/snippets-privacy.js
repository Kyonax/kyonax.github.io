/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * snippets-privacy.js — the privacy page's body copy, merged by
 * views/privacy.vue and read by it and by components/analytics-opt-out.vue
 * (`privacy.opt-out`). `privacy.meta`, `.title` and `.breadcrumb` stay in
 * the core: the JSON-LD builders read them off the static import, not vue-i18n.
 *
 * THE LAST SECTION CARRIES THE REVISION DATE. The "Last updated" line closes
 * the Contact body, and seo/json-ld/privacy-page.js mirrors it as
 * `dateModified`. Change the copy and its date here first, then the graph —
 * never the graph alone.
 *
 * THE THIRD SECTION HOSTS THE OPT-OUT. privacy.vue mounts the toggle under
 * "Storage in your browser", whose copy points at it ("the toggle below").
 */
export const TRANSLATIONS_PRIVACY = {
  'en': {
    'kyo-web': {
      'privacy': {
        'lead': 'This page describes how <strong>kyonax.com</strong> handles visitor data. The site is operated by <strong>Cristian D. Moreno (Kyonax)</strong>. It collects the minimum data needed to understand traffic patterns. No advertising, no profiling, no third-party data brokers.',
        'signoff': 'Cristian D. Moreno - Privacy Policy',
        'sections': [
          {
            'title': 'What we collect',
            'body': '<p>Visits are counted with Umami Cloud, a cookieless analytics service. Each page view records the page address (without its query string), the referring site, your browser, operating system, device type, screen size and language, a few named clicks such as downloading the CV, and an approximate location (country, region, city) looked up from your IP address. The IP address is never stored.</p><p>No cookies, no cross-site tracking, no personal data. The data is hosted by Umami Software, Inc. in the United States under its <a href=\'https://umami.is/dpa\'>data processing agreement</a>. If your browser sends Do Not Track, nothing is recorded.</p>',
          },
          {
            'title': 'What we don\'t collect',
            'body': '<ul><li>No advertising cookies.</li><li>No fingerprinting.</li><li>No other third-party trackers.</li><li>No form data: the contact form only opens your email app.</li></ul>',
          },
          {
            'title': 'Storage in your browser',
            'body': '<p>The only entries this site keeps in your browser\'s local storage:</p><ul><li><code>kyo:lang</code>, your language.</li><li><code>kyo:yt-consent</code>, once you agree to load a YouTube video.</li><li><code>umami.disabled</code>, only if you opt out of analytics.</li></ul><p>Analytics stores nothing. To opt out, use the toggle below, or set <code>umami.disabled</code> to <code>1</code> in local storage.</p>',
          },
          {
            'title': 'Embedded videos',
            'body': '<p>Some project entries include short demo videos hosted on YouTube. Thumbnails load from <code>i.ytimg.com</code> without setting cookies. When you confirm playback, the player loads from <code>youtube-nocookie.com</code>, which can store data on your device under <a href=\'https://policies.google.com/privacy\'>Google\'s privacy policy</a>. A confirmation prompt appears the first time you press play, and once you confirm, this browser remembers it.</p>',
          },
          {
            'title': 'Your rights',
            'body': '<p>Clearing this site\'s data in your browser removes every entry above, the opt-out included. For anything else about your data, write to the address below.</p>',
          },
          {
            'title': 'Contact',
            'body': '<p>For privacy questions: <a href=\'mailto:support&#64;kyonax.com\'>support&#64;kyonax.com</a>.</p><p>Last updated: <time datetime=\'2026-09-11\'>September 11, 2026</time></p>',
          },
        ],
        'opt-out': 'Exclude my visits from analytics',
      },
    },
  },
  'es': {
    'kyo-web': {
      'privacy': {
        'lead': 'Esta página describe cómo <strong>kyonax.com</strong> maneja los datos de los visitantes. El sitio es operado por <strong>Cristian D. Moreno (Kyonax)</strong>. Recolecta el mínimo de datos necesarios para entender los patrones de tráfico. Sin publicidad, sin perfilado, sin intermediarios de datos.',
        'signoff': 'Cristian D. Moreno - Política de Privacidad',
        'sections': [
          {
            'title': 'Qué recolectamos',
            'body': '<p>Las visitas se cuentan con Umami Cloud, un servicio de analítica sin cookies. Cada página vista registra la dirección de la página (sin sus parámetros de consulta), el sitio de procedencia, tu navegador, sistema operativo, tipo de dispositivo, tamaño de pantalla e idioma, algunos clics con nombre como la descarga de la hoja de vida, y una ubicación aproximada (país, región, ciudad) obtenida de tu dirección IP. La dirección IP nunca se almacena.</p><p>Sin cookies, sin rastreo entre sitios, sin datos personales. Los datos los aloja Umami Software, Inc. en Estados Unidos bajo su <a href=\'https://umami.is/dpa\'>acuerdo de procesamiento de datos</a>. Si tu navegador envía la señal Do Not Track, no se registra nada.</p>',
          },
          {
            'title': 'Qué no recolectamos',
            'body': '<ul><li>Sin cookies publicitarias.</li><li>Sin huella digital del navegador.</li><li>Sin otros rastreadores de terceros.</li><li>Sin datos de formularios: el formulario de contacto solo abre tu app de correo.</li></ul>',
          },
          {
            'title': 'Almacenamiento en tu navegador',
            'body': '<p>Las únicas entradas que este sitio guarda en el almacenamiento local de tu navegador:</p><ul><li><code>kyo:lang</code>, tu idioma.</li><li><code>kyo:yt-consent</code>, cuando aceptas cargar un video de YouTube.</li><li><code>umami.disabled</code>, solo si excluyes tus visitas de la analítica.</li></ul><p>La analítica no guarda nada. Para excluirte, usa el botón de abajo, o asigna <code>1</code> a <code>umami.disabled</code> en el almacenamiento local.</p>',
          },
          {
            'title': 'Videos embebidos',
            'body': '<p>Algunos proyectos incluyen videos de demostración alojados en YouTube. Las miniaturas cargan desde <code>i.ytimg.com</code> sin establecer cookies. Cuando confirmas la reproducción, el reproductor carga desde <code>youtube-nocookie.com</code>, lo cual puede guardar datos en tu dispositivo bajo la <a href=\'https://policies.google.com/privacy\'>política de privacidad de Google</a>. La primera vez que pulsas reproducir aparece un mensaje de confirmación, y una vez que confirmas, este navegador lo recuerda.</p>',
          },
          {
            'title': 'Tus derechos',
            'body': '<p>Borrar los datos de este sitio en tu navegador elimina todas las entradas de arriba, incluida la exclusión de la analítica. Para cualquier otra consulta sobre tus datos, escribe a la dirección de abajo.</p>',
          },
          {
            'title': 'Contacto',
            'body': '<p>Para preguntas de privacidad: <a href=\'mailto:support&#64;kyonax.com\'>support&#64;kyonax.com</a>.</p><p>Última actualización: <time datetime=\'2026-09-11\'>11 de septiembre de 2026</time></p>',
          },
        ],
        'opt-out': 'Excluir mis visitas de la analítica',
      },
    },
  },
};

export default TRANSLATIONS_PRIVACY;
