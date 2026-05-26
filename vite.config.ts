import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Gmail HTML Attachment Renderer',
        namespace: 'https://github.com/yuuchilyann',
        version: '0.0.1',
        description: '在 Gmail HTML 附件預覽中渲染內容(Shadow DOM + Trusted Types)',
        author: 'AYUCode',
        match: ['https://mail.google.com/*'],
        'run-at': 'document-end',
        grant: 'none',
        homepageURL: 'https://github.com/yuuchilyann/Gmail_HTML_Attachment_Renderer',
        supportURL: 'https://github.com/yuuchilyann/Gmail_HTML_Attachment_Renderer/issues',
        downloadURL:
          'https://raw.githubusercontent.com/yuuchilyann/Gmail_HTML_Attachment_Renderer/main/dist/gmail-html-attachment-renderer.user.js',
        updateURL:
          'https://raw.githubusercontent.com/yuuchilyann/Gmail_HTML_Attachment_Renderer/main/dist/gmail-html-attachment-renderer.user.js',
      },
      build: {
        fileName: 'gmail-html-attachment-renderer.user.js',
        externalGlobals: {
          dompurify: [
            'DOMPurify',
            'https://cdn.jsdelivr.net/npm/dompurify@3.4.5/dist/purify.min.js',
          ],
        },
      },
      server: {
        open: false,
      },
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    target: 'es2020',
  },
});
