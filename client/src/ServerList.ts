import { Settings } from './game/Settings';
import { config } from './config';

interface Server {
  value: string;
  name: string;
  address: string;
  ping: number;
  offline?: boolean;
  playerCnt?: number;
}

const servers: Server[] = [
  { value: 'eu', name: 'Europe', address: config.serverEU, ping: 0 },
  { value: 'us', name: 'USA', address: config.serverUS, ping: 0 },
];
if (config.isDev) {
  servers.unshift({ value: 'dev', name: 'Development', address: config.serverDev, ping: 0 });
}

let lastPingUpdate = 0;
let isUpdating = false;

export async function updatePing() {
  const cache: Record<string, Server> = {};
  // Wait if update is already in progress
  while (isUpdating) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for 100ms before checking again
  }

  if (Date.now() - lastPingUpdate < 60000) {
    return servers;
  }

  isUpdating = true; // Set flag to indicate update is in progress
  lastPingUpdate = Date.now();

  try {
    for (const server of servers) {
      console.log('updating ping for', server.address);
      // instead lets do it at the same time
      // const promises = servers.map((server2) => {
      const start = Date.now();
      if (!config.isDev && server.address.includes('localhost')) {
        server.offline = true;
        server.ping = Infinity;
      } else {
        if (cache[server.address]) {
          server.offline = cache[server.address].offline;
          server.ping = cache[server.address].ping;
          server.playerCnt = cache[server.address].playerCnt;
        } else {
          try {
            const data = await fetch(`${window.location.protocol}//${server.address}/serverinfo?${Date.now()}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'text/plain',
              },
            })
            try {
              const json = await data.json()
              server.offline = false;
              server.ping = Date.now() - start;
              server.playerCnt = json.playerCnt;
              cache[server.address] = server;
            } catch (e) {

              server.offline = true;
              server.ping = Infinity;
              cache[server.address] = server;
            }

          } catch (e) {
            server.offline = true;
            server.ping = Infinity;
            cache[server.address] = server;
          }
        }
      }
    }


  } finally {
    isUpdating = false; // Reset flag whether update is successful or not
  }

  return servers;
}

export async function getServerList() {
  await updatePing();
  const autoServer = await getAutoServer();
  const list = [{
    ...autoServer,
    value: 'auto',
    name: `AUTO (${autoServer.name})`
  }, ...servers];

  return list;
}

async function getAutoServer(): Promise<Server> {

  let server: Server = servers[0];

  // pick server with lowest ping
  for (let i = 1; i < servers.length; i++) {
    if (servers[i].ping < server.ping) {
      server = servers[i];
    }
  }

  return server;
}

export async function getServer(): Promise<Server> {
  await updatePing();
  if (Settings.server === 'auto') {
    return getAutoServer();
  }

  let server: Server = servers[0];
  for (let i = 1; i < servers.length; i++) {
    if (Settings.server === servers[i].value) {
      server = servers[i];
      break;
    }
  }
  return server;
}
