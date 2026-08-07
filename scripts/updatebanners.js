const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const bannersDir = path.join(__dirname, '..', 'client', 'public', 'assets', 'game', 'banners');
const manifestPath = path.join(__dirname, '..', 'client', 'src', 'game', 'banners.json');

function titleCase(file) {
  return path
    .basename(file, path.extname(file))
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function buildManifest() {
  const existing = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : { banners: [] };
  const knownNames = new Map((existing.banners || []).map((b) => [b.file, b.displayName]));

  const files = fs
    .readdirSync(bannersDir)
    .filter((f) => /\.(png|jpe?g|webp|gif|avif)$/i.test(f))
    .sort((a, b) => a.localeCompare(b));

  const banners = files.map((file) => ({
    file,
    displayName: knownNames.get(file) || titleCase(file),
    hash: crypto
      .createHash('sha1')
      .update(fs.readFileSync(path.join(bannersDir, file)))
      .digest('hex')
      .slice(0, 10),
  }));

  return JSON.stringify({ banners }, null, 2) + '\n';
}

function writeManifest() {
  if (!fs.existsSync(bannersDir)) return { changed: false, count: 0 };
  const next = buildManifest();
  const current = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
  if (next === current) return { changed: false, count: JSON.parse(next).banners.length };
  fs.writeFileSync(manifestPath, next);
  return { changed: true, count: JSON.parse(next).banners.length };
}

function webpackPlugin() {
  return {
    apply(compiler) {
      compiler.hooks.beforeCompile.tap('UpdateBannerManifest', () => {
        try {
          writeManifest();
        } catch (e) {
          console.log(`[banners] manifest update failed: ${e.message}`);
        }
      });
      compiler.hooks.afterCompile.tap('UpdateBannerManifest', (compilation) => {
        compilation.contextDependencies.add(bannersDir);
      });
    },
  };
}

module.exports = { bannersDir, manifestPath, writeManifest, webpackPlugin };

if (require.main === module) {
  const { count } = writeManifest();
  console.log(`Wrote ${count} banners to ${path.relative(path.join(__dirname, '..'), manifestPath)}`);
}
