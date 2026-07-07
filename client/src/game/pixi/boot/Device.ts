export class Device {
  os = { android: false, iOS: false, desktop: false, windows: false, macOS: false, linux: false };

  constructor() {
    const nav = typeof navigator !== 'undefined' ? navigator : ({ userAgent: '', platform: '', maxTouchPoints: 0 } as any);
    const ua = nav.userAgent || '';
    this.os.android = /Android/i.test(ua);
    this.os.iOS = /iPad|iPhone|iPod/i.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1);
    this.os.windows = /Windows/i.test(ua);
    this.os.macOS = /Mac OS/i.test(ua) && !this.os.iOS;
    this.os.linux = /Linux/i.test(ua) && !this.os.android;
    this.os.desktop = !this.os.android && !this.os.iOS;
  }
}
