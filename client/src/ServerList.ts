import { Settings } from './game/Settings';
import { config } from './config';

interface Server {
  value: string;
  name: string;
  address: string;
  ping: number;
  offline?: boolean;
}

const servers: Server[] = [
  { value: 'eu', name: 'Europe', address: config.serverEU, ping: 0 },
  { value: 'us', name: 'USA', address: config.serverUS, ping: 0 },
  { value: 'usbackup', name: 'USA Backup', address: config.serverUSBackup, ping: 0 },
];
if (config.isDev) {
  servers.unshift({ value: 'dev', name: 'Development', address: config.serverDev, ping: 0 });
}

export async function updatePing() {
  for (const server of servers) {
    const start = Date.now();
    if(!config.isDev && server.address.includes('localhost')) {
      server.offline = true;
      server.ping = Infinity;
      continue;
    }
    await fetch(`${window.location.protocol}//${server.address}/ping`, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain',
      },
    })
    .then(() => {
      server.offline = false;
      server.ping = Date.now() - start;
    })
    .catch(() => {
      server.offline = true;
      server.ping = Infinity;
    });
  }
}

export async function getServerList() {
  await updatePing();

  const autoServer = await getAutoServer();
  const list = [{
    ...autoServer,
    value: 'auto',
    name: `AUTO (${autoServer.name})`,
  }, ...servers];

  return list;
}

async function getAutoServer(): Promise<Server> {
  await updatePing();

  let server: Server = servers[0];
  for (let i = 1; i < servers.length; i++) {
    if (server.ping > servers[i].ping) {
      server = servers[i];
    }
  }
  return server;
}

export async function getServer(): Promise<Server> {
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
