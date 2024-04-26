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


let debugMode = false;
try {
  debugMode = window.location.search.includes("debugAlertMode");
  } catch(e) {}

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

export async function updatePing() {
  const cache: Record<string, Server> = {};
  // Wait if update is already in progress
  while (isUpdating) {
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for 10ms before checking again
  }

  if (Date.now() - lastPingUpdate < 60000) {
    return servers;
  }

  isUpdating = true; // Set flag to indicate update is in progress
  lastPingUpdate = Date.now();

  try {
    for (const server of servers) {
      // instead lets do it at the same time
      // const promises = servers.map((server2) => {
      const start = Date.now();
      if (!server.address || (!config.isDev && server.address.includes('localhost'))) {
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
  console.time('updatePingServerList')
  await updatePing();
  console.timeEnd('updatePingServerList')
  const autoServer = getAutoServer();
  const list = [{
    ...autoServer,
    value: 'auto',
    name: `AUTO (${autoServer.name})`
  }, ...servers];

  return list;
}

function getAutoServer(): Server {

  let server: Server = servers[0];

  // pick server with lowest ping
  for (let i = 0; i < servers.length; i++) {
    if (servers[i].ping < server.ping) {
      server = servers[i];
    }
  }

  if(server.offline) {
    alert('All servers are offline or blocked. Please try again in 5-10 mins. If not fixed, please report to support@swordbattle.io');
  }

  return server;
}

export async function getServer(): Promise<Server> {
  console.time('updatePingServer')
  await updatePing();
  console.timeEnd('updatePingServer')
  let server: Server = getAutoServer();

  if (Settings.server === 'auto') {
    return server;
  }

  for (let i = 0; i < servers.length; i++) {
    if (Settings.server === servers[i].value && !servers[i].offline) {
      server = servers[i];
      console.log('Selected server:', server);
      break;
    }
  }
  if(Settings.server !== server.value) {
    if(debugMode) {
      alert('changed server to ' + server.value+ ' because the previous one was offline, previous server: ' + Settings.server)
    }
    Settings.server = server.value;
    window.location.reload();
  }
  return server;
}
