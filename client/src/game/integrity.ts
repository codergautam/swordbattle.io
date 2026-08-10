type IntegrityTarget = {
  object: any;
  key: string;
  value: any;
};

const production = process.env.NODE_ENV === 'production';
const targets: IntegrityTarget[] = [];
const shutdownCallbacks = new Set<() => void>();
let terminated = false;

export function reportIntegrityViolation() {
  if (!production || terminated) return;
  terminated = true;

  for (const callback of shutdownCallbacks) {
    try { callback(); } catch (error) {}
  }

  try { window.stop(); } catch (error) {}
  try { document.documentElement.replaceChildren(); } catch (error) {}
  try { window.location.replace('about:blank'); } catch (error) {}
}

export function registerIntegrityShutdown(callback: () => void) {
  if (!production) return;
  shutdownCallbacks.add(callback);
}

export function registerIntegrityTarget(object: any, keys: string[]) {
  if (!production || !object) return;
  for (const key of keys) {
    targets.push({ object, key, value: object[key] });
  }
}

export function installIntegrityGlobal(key: string, value: any) {
  if (!production) {
    (window as any)[key] = value;
    return;
  }
  try {
    Object.defineProperty(window, key, {
      configurable: false,
      enumerable: false,
      writable: false,
      value,
    });
  } catch (error) {
    reportIntegrityViolation();
  }
}

function reserveGlobal(key: string) {
  if (!production) return;
  const descriptor = Object.getOwnPropertyDescriptor(window, key);
  if (descriptor && !descriptor.configurable) return;
  try {
    Object.defineProperty(window, key, {
      configurable: false,
      enumerable: false,
      get: () => undefined,
      set: () => reportIntegrityViolation(),
    });
  } catch (error) {}
}

reserveGlobal('phaser_game');

if (production) {
  window.setInterval(() => {
    if (terminated) return;
    for (const target of targets) {
      if (target.object[target.key] !== target.value) {
        reportIntegrityViolation();
        return;
      }
    }
  }, 1000);
}
