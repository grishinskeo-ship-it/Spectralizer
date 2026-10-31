import { existsSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const SITE = 'https://grishinskeo-ship-it.github.io'
const APP_URL = `${SITE}/app/`

const METRIKA = `
    <!-- Yandex.Metrika counter -->
    <script type="text/javascript">
        (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
        })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=113942554', 'ym');

        ym(113942554, 'init', {ssr:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
    </script>
    <noscript><div><img src="https://mc.yandex.ru/watch/113942554" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
    <!-- /Yandex.Metrika counter -->`

function pagesHtml(): Plugin {
  return {
    name: 'pages-html',
    transformIndexHtml(html) {
      const head = `
    <meta name="yandex-verification" content="a4fe7b2f168d7403" />
    <meta name="google-site-verification" content="DTZqxKLN3vRc_hC3fdIy7nVg0veWLYbKqV0LoDSAM-g" />
    <meta name="description" content="Spectralizer в браузере: FFT-анализатор спектра. Откройте MP3, WAV, FLAC или OGG — гармоники, фаза, resynth, модель VCO. Без установки." />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
    <link rel="canonical" href="${APP_URL}" />
    <link rel="alternate" type="text/markdown" href="${SITE}/web.md" />
    <link rel="describedby" href="${SITE}/llms.txt" />
    <meta property="og:title" content="Spectralizer — анализ спектра в браузере" />
    <meta property="og:description" content="Откройте аудиофайл и посмотрите FFT, гармоники, фазу и resynth. Тот же анализатор, что в Desktop, без установки." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${APP_URL}" />
    <meta property="og:image" content="${SITE}/screenshots/desktop-analysis.png" />
    <meta property="og:locale" content="ru_RU" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"WebApplication","name":"Spectralizer","url":"${APP_URL}","applicationCategory":"MultimediaApplication","operatingSystem":"Web","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"softwareVersion":"1.0.0","license":"https://www.gnu.org/licenses/gpl-3.0.html","description":"Веб-анализатор частотного спектра: FFT, гармоники, фаза, overlap-add resynth, модель VCO.","isAccessibleForFree":true}
    </script>`

      const noscript = `
    <noscript>
      <main style="max-width:40rem;margin:2rem auto;padding:0 1rem;font-family:Segoe UI,sans-serif;color:#e6edf3;background:#0d1117">
        <h1>Spectralizer</h1>
        <p>Веб-анализатор частотного спектра. Для работы нужен JavaScript.</p>
        <p><a href="../" style="color:#58a6ff">Документация</a> · <a href="https://github.com/grishinskeo-ship-it/Spectralizer/releases/tag/v1.0.0" style="color:#58a6ff">Скачать Desktop / VST</a></p>
      </main>
    </noscript>`

      return html
        .replace(/<meta name="description"[^>]*>\s*/i, '')
        .replace('<title>Spectralizer — анализатор спектра</title>', '<title>Spectralizer — анализ спектра в браузере</title>')
        .replace('</head>', `${head}\n  </head>`)
        .replace('<div id="root"></div>', `<div id="root"></div>${noscript}`)
        .replace('</body>', `${METRIKA}\n  </body>`)
    },
  }
}

function dropDemoWav(outDir: string): Plugin {
  return {
    name: 'drop-demo-wav',
    closeBundle() {
      const demo = path.resolve(outDir, 'demo.wav')
      if (existsSync(demo)) {
        unlinkSync(demo)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const isWeb = mode === 'web'
  const outDir = isWeb ? 'docs/app' : 'dist'

  return {
    base: './',
    plugins: [
      react(),
      ...(isWeb ? [pagesHtml(), dropDemoWav(outDir)] : []),
    ],
    build: {
      outDir,
      emptyOutDir: true,
    },
  }
})
