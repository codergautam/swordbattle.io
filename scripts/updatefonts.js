const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const fontsDir = path.join(__dirname, '..', 'client', 'public', 'assets', 'fonts');
const manifestPath = path.join(__dirname, '..', 'client', 'src', 'game', 'fonts.json');

const formats = {
  '.woff2': 'woff2',
  '.woff': 'woff',
  '.ttf': 'truetype',
  '.otf': 'opentype',
};

function familyName(file) {
  return path
    .basename(file, path.extname(file))
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+[1-9]00$/, '')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function buildManifest() {
  const existing = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : { fonts: [] };
  const knownFamilies = new Map((existing.fonts || []).map((f) => [f.file, f.family]));

  const files = fs
    .readdirSync(fontsDir)
    .filter((f) => formats[path.extname(f).toLowerCase()])
    .sort((a, b) => a.localeCompare(b));

  const fonts = files.map((file) => ({
    file,
    family: knownFamilies.get(file) || familyName(file),
    format: formats[path.extname(file).toLowerCase()],
    hash: crypto
      .createHash('sha1')
      .update(fs.readFileSync(path.join(fontsDir, file)))
      .digest('hex')
      .slice(0, 10),
  }));

  return JSON.stringify({ fonts }, null, 2) + '\n';
}

function writeManifest() {
  if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir, { recursive: true });
  const next = buildManifest();
  const current = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
  if (next === current) return { changed: false, count: JSON.parse(next).fonts.length };
  fs.writeFileSync(manifestPath, next);
  return { changed: true, count: JSON.parse(next).fonts.length };
}

function webpackPlugin() {
  return {
    apply(compiler) {
      compiler.hooks.beforeCompile.tap('UpdateFontManifest', () => {
        try {
          writeManifest();
        } catch (e) {
          console.log(`[fonts] manifest update failed: ${e.message}`);
        }
      });
      compiler.hooks.afterCompile.tap('UpdateFontManifest', (compilation) => {
        compilation.contextDependencies.add(fontsDir);
      });
    },
  };
}

module.exports = { fontsDir, manifestPath, writeManifest, webpackPlugin };

if (require.main === module) {
  const { count } = writeManifest();
  console.log(`Wrote ${count} fonts to ${path.relative(path.join(__dirname, '..'), manifestPath)}`);
}
