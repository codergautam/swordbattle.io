const assetVer: string = (process.env.REACT_APP_ASSET_VER as string) || '';

export function withAssetVersion(url: string): string {
  if (!assetVer || typeof url !== 'string' || !url.includes('assets/') || /[?&]v=/.test(url)) return url;
  return url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + assetVer;
}
