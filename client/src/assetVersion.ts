const assetVer: string = (process.env.REACT_APP_ASSET_VER as string) || '';

export function withAssetVersion(url: string): string {
  if (!assetVer || typeof url !== 'string' || !url.includes('assets/') || /[?&]v=/.test(url)) return url;
  return url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + assetVer;
}

const supportsWebp = (() => {
  try {
    return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
  } catch (e) {
    return false;
  }
})();

export function toWebp(url: string): string {
  if (!supportsWebp) return url;
  return url.replace(/\.png(?=$|[?#])/i, '.webp');
}
