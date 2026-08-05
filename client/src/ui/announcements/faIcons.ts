import { useEffect, useState } from 'react';
import { faBook, IconDefinition } from '@fortawesome/free-solid-svg-icons';

let byName: Record<string, IconDefinition> | null = null;
let sortedNames: string[] = [];
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function loadFaIcons(): Promise<void> {
  if (!pending) {
    pending = import('fa-solid-icons-dir/index.js')
      .then((ns: any) => {
        const mod = ns && ns.fas ? ns : ns && ns.default && ns.default.fas ? ns.default : ns || {};
        const map: Record<string, IconDefinition> = {};
        for (const key of Object.keys(mod)) {
          if (key.indexOf('fa') !== 0) continue;
          const def = mod[key] as IconDefinition;
          if (def && def.iconName && !map[def.iconName]) map[def.iconName] = def;
        }
        byName = map;
        sortedNames = Object.keys(map).sort();
        listeners.forEach((l) => l());
      })
      .catch(() => { pending = null; });
  }
  return pending;
}

export function useFaIcons(): boolean {
  const [ready, setReady] = useState(!!byName);
  useEffect(() => {
    if (byName) { setReady(true); return; }
    const onLoad = () => setReady(true);
    listeners.add(onLoad);
    loadFaIcons();
    return () => { listeners.delete(onLoad); };
  }, []);
  return ready;
}

export function faIconNames(): string[] {
  return sortedNames;
}

export function resolveFaIcon(name: string): IconDefinition {
  return (byName && byName[name]) || faBook;
}
