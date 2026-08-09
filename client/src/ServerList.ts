import { Settings } from './game/Settings';
import { config } from './config';
import { mark, span } from './bootTiming';
import { ldLog } from './loaderDebug';

interface Server {
  value: string;
  name: string;
  address: string;
  ping: number;
  offline?: boolean;
  playerCnt?: number;
  realPlayersCnt?: number;
}


const servers: Server[] = [
  { value: 'eu', name: 'Europe', address: config.serverEU, ping: 0 },
  { value: 'us', name: 'USA', address: config.serverUS, ping: 0 },
  { value: 'usbackup', name: 'USA Unblocked', address: config.serverUSBackup, ping: 0 },
];
if (config.isDev) {
  servers.unshift({ value: 'dev', name: 'Development', address: config.serverDev, ping: 0 });
}

let lastPingUpdate = 0;
let isUpdating = false;

const PING_TIMEOUT_MS = 2500;
const LAST_SERVER_KEY = 'swordbattle:lastServer';

/* Addresses whose socket never came up this session. A remembered or explicitly
   chosen region that is down must not be handed out again, or the client retries
   the same dead box forever with no way out but changing the setting by hand. */
const failedAddresses = new Set<string>();

/* The game runs inside a CrazyGames iframe, where partitioned storage can make
   localStorage throw outright. Server selection is on the critical path for the
   socket, so it must degrade to "no history" rather than take the boot down. */
function readLastServer(): string {
  try { return localStorage.getItem(LAST_SERVER_KEY) || ''; } catch (e) { return ''; }
}

function clearLastServer() {
  try { localStorage.removeItem(LAST_SERVER_KEY); } catch (e) {}
}

/* AbortSignal.timeout() is Chrome 103+ / Safari 16+ / Firefox 100+, but the
   production browserslist is far wider and Babel does not polyfill runtime APIs.
   Calling it directly threw on older browsers, and because the throw landed
   inside the per-server catch it marked EVERY region offline. */
function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'text/plain' },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

export async function updatePing() {
  // Wait if update is already in progress
  if (isUpdating) {
    const endWait = span('serverlist:waitForInFlightUpdate');
    while (isUpdating) {
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait for 10ms before checking again
    }
    endWait();
  }

  if (Date.now() - lastPingUpdate < 60000) {
    mark('serverlist:updatePing:cache-hit');
    return servers;
  }

  isUpdating = true; // Set flag to indicate update is in progress
  lastPingUpdate = Date.now();

  const endAll = span('serverlist:updatePing:ALL');
  try {
    // All servers at once. A dead region costs PING_TIMEOUT_MS, not a stalled boot.
    await Promise.all(servers.map(async (server) => {
      const start = Date.now();
      if (!server.address || (!config.isDev && server.address.includes('localhost'))) {
        server.offline = true;
        server.ping = Infinity;
        return;
      }
      try {
        const res = await fetchWithTimeout(
          `${window.location.protocol}//${server.address}/serverinfo?${Date.now()}`,
          PING_TIMEOUT_MS,
        );
        const json = await res.json();
        server.offline = false;
        server.ping = Date.now() - start;
        server.playerCnt = json.realPlayersCnt;
        ldLog(`ping ${server.value.padEnd(10)} ${String(server.ping).padStart(5)}ms  players=${json.realPlayersCnt}`);
      } catch (e) {
        server.offline = true;
        server.ping = Infinity;
        ldLog(`ping ${server.value.padEnd(10)}  OFFLINE/TIMEOUT after ${Date.now() - start}ms`);
      }
    }));
  } finally {
    endAll({ pings: servers.map(s => `${s.value}=${s.ping}`) });
    isUpdating = false; // Reset flag whether update is successful or not
  }

  return servers;
}

export async function getServerList() {
  console.time('updatePingServerList')
  const end = span('getServerList');
  await updatePing();
  end();
  console.timeEnd('updatePingServerList')
  const autoServer = getAutoServer();
  const list = [{
    ...autoServer,
    value: 'auto',
    name: `AUTO (${autoServer.name})`
  }, ...servers];

  return list;
}

/* Lowest ping among the servers not excluded. Falls back to the full list when
   every candidate is excluded, so this always returns something connectable. */
function bestServer(exclude: Set<string>): Server {
  const usable = servers.filter(s => s.address && !exclude.has(s.address));
  const pool = usable.length ? usable : servers;

  let server: Server = pool[0];
  for (const s of pool) {
    if (s.ping < server.ping) server = s;
  }
  return server;
}

function getAutoServer(): Server {
  const server = bestServer(new Set());

  if(server.offline) {
    alert('All servers are offline or blocked. Please refresh the page, or try again later if the problem persists.');
  }

  return server;
}

/* Called when a socket actually opens, so the next boot can skip measuring. */
export function rememberServer(address: string) {
  failedAddresses.delete(address);
  const s = servers.find(x => x.address === address);
  if (s) {
    try { localStorage.setItem(LAST_SERVER_KEY, s.value); } catch (e) {}
  }
}

/* Called when a socket closes without ever having opened. Blacklists the box for
   the rest of the session so the next getServer() picks a different one - clearing
   the remembered key alone is not enough, because an explicit Settings.server
   would just hand back the same dead address on every retry. */
export function forgetServer(address?: string) {
  if (address) failedAddresses.add(address);
  clearLastServer();
}

/* Picks a server WITHOUT waiting on the ping sweep whenever possible - the
   socket is on the critical path for the play button, pings are not. */
export async function getServer(): Promise<Server> {
  // Never hand back a box that already failed this session, or one a completed
  // sweep has since marked offline.
  const pick = (value: string) => servers.find(
    s => s.value === value && s.address && !s.offline && !failedAddresses.has(s.address),
  );

  const explicit = Settings.server !== 'auto' ? pick(Settings.server) : undefined;
  const instant = explicit || pick(readLastServer());

  if (instant) {
    mark('serverlist:instant-pick', instant.value);
    updatePing().catch(() => {}); // refresh in the background for the menu's ping display
    return instant;
  }

  // Either no history, or the preferred box is known-bad - this is the only path
  // that pays for measurement. LAST_SERVER_KEY is deliberately NOT written here;
  // rememberServer() owns it, and only once a socket has actually opened.
  const end = span('serverlist:cold-pick');
  await updatePing();
  end();
  return bestServer(failedAddresses);
}
