import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

const legacyEnvironmentKeys = [
  'REACT_APP_ASSET_VER',
  'REACT_APP_VERSION',
  'REACT_APP_BASENAME',
  'REACT_APP_ENDPOINT_DEV',
  'REACT_APP_ENDPOINT_EU',
  'REACT_APP_ENDPOINT_US',
  'REACT_APP_ENDPOINT_US_BACKUP',
  'REACT_APP_API',
  'REACT_APP_API_BACKUP',
];

function gitRevision() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const production = mode === 'production';
  const legacyEnvironment: Record<string, string> = {
    'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
    'process.env.PUBLIC_URL': JSON.stringify(''),
  };

  for (const key of legacyEnvironmentKeys) {
    const fallback = key === 'REACT_APP_ASSET_VER' ? gitRevision() : '';
    legacyEnvironment[`process.env.${key}`] = JSON.stringify(env[key] || fallback);
  }

  return {
    plugins: [
      react(),
      svgr(),
      {
        name: 'swordbattle-html-environment',
        transformIndexHtml(html) {
          return html.replace('__AD_PROVIDER__', env.AD_PROVIDER || 'adsense');
        },
      },
    ],
    define: legacyEnvironment,
    resolve: {
      alias: {
        'fa-solid-icons-dir': path.resolve(
          process.cwd(),
          'node_modules/@fortawesome/free-solid-svg-icons',
        ),
      },
    },
    publicDir: 'public',
    build: {
      outDir: 'build',
      assetsDir: 'static',
      sourcemap: true,
      emptyOutDir: true,
      commonjsOptions: {
        include: [/node_modules/, /packages\/shared/],
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.PORT || 3000),
      strictPort: true,
    },
    preview: {
      host: '0.0.0.0',
      port: Number(env.PORT || 3000),
    },
  };
});
