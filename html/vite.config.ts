import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function genHeader(size: number, buf: Buffer, len: number): string {
  let idx = 0;
  let data = 'unsigned char index_html[] = {\n  ';

  for (const value of buf) {
    idx++;

    const current = value < 0 ? value + 256 : value;

    data += '0x';
    data += (current >>> 4).toString(16);
    data += (current & 0xf).toString(16);

    if (idx === len) {
      data += '\n';
    } else {
      data += idx % 12 === 0 ? ',\n  ' : ', ';
    }
  }

  data += '};\n';
  data += `unsigned int index_html_len = ${len};\n`;
  data += `unsigned int index_html_size = ${size};\n`;
  return data;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function singleHtmlPlugin(): Plugin {
  return {
    name: 'single-html-and-header',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html;

      let inlined = html;

      // Inline favicon
      const faviconPath = path.resolve(import.meta.dirname, 'src/favicon.png');
      if (fs.existsSync(faviconPath)) {
        const faviconBase64 = fs.readFileSync(faviconPath).toString('base64');
        const faviconDataUri = `data:image/png;base64,${faviconBase64}`;
        inlined = inlined.replace(/<link[^>]*rel=["']icon["'][^>]*>/i, `<link rel="icon" type="image/png" href="${faviconDataUri}">`);
      }

      // Inline CSS
      for (const [fileName, chunk] of Object.entries(ctx.bundle)) {
        if (fileName.endsWith('.css') && 'source' in chunk) {
          const cssContent = chunk.source.toString();
          const linkRegex = new RegExp(`<link[^>]*href=["'][^"']*${escapeRegExp(fileName)}["'][^>]*>`, 'gi');
          if (linkRegex.test(inlined)) {
            inlined = inlined.replace(linkRegex, `<style>${cssContent}</style>`);
          } else {
            inlined = inlined.replace('</head>', `<style>${cssContent}</style></head>`);
          }
          delete ctx.bundle[fileName];
        }
      }

      // Inline JS
      for (const [fileName, chunk] of Object.entries(ctx.bundle)) {
        if (fileName.endsWith('.js') && 'code' in chunk) {
          const jsContent = chunk.code;
          const scriptRegex = new RegExp(`<script[^>]*src=["'][^"']*${escapeRegExp(fileName)}["'][^>]*>\\s*</script>`, 'gi');
          if (scriptRegex.test(inlined)) {
            inlined = inlined.replace(scriptRegex, `<script type="module">${jsContent}</script>`);
          } else {
            inlined = inlined.replace('</body>', `<script type="module">${jsContent}</script></body>`);
          }
          delete ctx.bundle[fileName];
        }
      }

      return inlined;
    },
    closeBundle() {
      const distDir = path.resolve(import.meta.dirname, 'dist');
      const indexPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;

      const htmlContent = fs.readFileSync(indexPath, 'utf-8');

      // Also write dist/inline.html
      fs.writeFileSync(path.join(distDir, 'inline.html'), htmlContent);

      // Clean up dist/assets if left over
      const assetsDir = path.join(distDir, 'assets');
      if (fs.existsSync(assetsDir)) {
        fs.rmSync(assetsDir, { recursive: true, force: true });
      }

      // Gzip and write ../src/html.h
      const gzipped = zlib.gzipSync(Buffer.from(htmlContent, 'utf-8'), { level: 9 });
      const headerContent = genHeader(Buffer.byteLength(htmlContent, 'utf-8'), gzipped, gzipped.length);
      fs.writeFileSync(path.resolve(import.meta.dirname, '../src/html.h'), headerContent);
    },
  };
}

export default defineConfig(({ mode }) => ({
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  server: {
    port: 9000,
    proxy: {
      '/token': 'http://localhost:7681',
      '/ws': {
        target: 'http://localhost:7681',
        ws: true,
      },
    },
  },
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
  plugins: [singleHtmlPlugin()],
}));
