import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import { cpanelDevApiPlugin } from './src/server/cpanelDevMiddleware';

/**
 * افزونه پیش‌بیلد Vite جهت شناسایی و پاکسازی ایمن پوشه‌های dist و کش‌های مرتبط با بیلدهای قدیمی قبل از هر بار اجرا
 */
function cleanOldBuildsAndCachePlugin(): Plugin {
  return {
    name: 'clean-old-builds-and-cache',
    configResolved(config) {
      try {
        const rootDir = config.root || process.cwd();
        const distPath = path.resolve(rootDir, config.build?.outDir || 'dist');
        const viteCachePath = path.resolve(rootDir, 'node_modules/.vite');
        const rootViteCachePath = path.resolve(rootDir, '.vite');

        console.log('🧹 [Vite Pre-Build Engine] پاکسازی پیش‌بیلد پوشه dist و کش‌های قدیمی شروع شد...');

        // ۱. پاکسازی ایمن پوشه dist
        if (fs.existsSync(distPath)) {
          fs.rmSync(distPath, { recursive: true, force: true });
          console.log(`  🗑️ پوشه dist قدیمی پاکسازی شد: ${path.relative(rootDir, distPath)}`);
        }

        // ۲. پاکسازی کش‌های Vite
        if (fs.existsSync(viteCachePath)) {
          fs.rmSync(viteCachePath, { recursive: true, force: true });
          console.log(`  🗑️ کش pre-bundle ماژول‌های Vite پاک شد: ${path.relative(rootDir, viteCachePath)}`);
        }
        if (fs.existsSync(rootViteCachePath)) {
          fs.rmSync(rootViteCachePath, { recursive: true, force: true });
          console.log(`  🗑️ کش ریشه .vite پاک شد: ${path.relative(rootDir, rootViteCachePath)}`);
        }

        // ۳. پاکسازی فایل‌های آرشیو نسخه قدیمی در ریشه و public/downloads
        const pkgPath = path.join(rootDir, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const currentVer = pkg.version || '5.8.19';

          const targetDirs = [
            rootDir,
            path.join(rootDir, 'public'),
            path.join(rootDir, 'public', 'downloads'),
          ];

          targetDirs.forEach((dir) => {
            if (fs.existsSync(dir)) {
              fs.readdirSync(dir).forEach((file) => {
                if (file === '.gitkeep' || file === '.htaccess' || file === 'index.html' || file === 'package.json') return;
                const fullPath = path.join(dir, file);
                try {
                  const stat = fs.statSync(fullPath);
                  if (!stat.isFile()) return;

                  const isZip = file.endsWith('.zip') || file.endsWith('.apk');
                  if (isZip && !file.includes(`v${currentVer}`) && !file.includes('latest')) {
                    fs.unlinkSync(fullPath);
                    console.log(`  🗑️ آرشیو بیلد نسخه قدیمی حذف گردید: ${file}`);
                  }
                } catch (e) {}
              });
            }
          });
        }
        console.log('✨ [Vite Pre-Build Engine] پاکسازی پیش‌بیلد با موفقیت انجام شد و فضای اجرای تمیز آماده است.');
      } catch (err: any) {
        console.warn(`⚠️ [Vite Pre-Build Engine] هشدار غیربحرانی در پاکسازی: ${err.message}`);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [cleanOldBuildsAndCachePlugin(), react(), tailwindcss(), cpanelDevApiPlugin()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'recharts',
        'lucide-react',
        'motion',
        'jszip'
      ],
    },
    build: {
      chunkSizeWarningLimit: 2000,
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      cors: true,
      // HMR is disabled in AI Studio preview environment
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      cors: true,
    },
  };
});
