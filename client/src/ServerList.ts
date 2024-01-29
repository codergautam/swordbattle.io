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
  { value: 'usbackup', name: 'USA Backup', address: config.serverUSBackup, ping: 0 },
];
if (config.isDev) {
  servers.unshift({ value: 'dev', name: 'Development', address: config.serverDev, ping: 0 });
}

export async function updatePing() {
  for (const server of servers) {
  // instead lets do it at the same time
  // const promises = servers.map((server2) => {
    const start = Date.now();
    if(!config.isDev && server.address.includes('localhost')) {
      server.offline = true;
      server.ping = Infinity;
    } else {
    await fetch(`${window.location.protocol}//${server.address}/serverinfo`, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain',
      },
    })
    .then((data) => {
      data.json().then((json) => {
        console.log(`pinged ${server.address} and got ${JSON.stringify(json)}`); // eslint-disable-line no-console
      server.offline = false;
      server.ping = Date.now() - start;
      server.playerCnt = json.playerCnt;
      }).catch((e) => {
        server.offline = true;
        server.ping = Infinity;
      });
    })
    .catch((e) => {
      server.offline = true;
      server.ping = Infinity;
    });
  }

    // return fn(server2);
  // });

  // await Promise.all(promises);
  }
  return servers;
}

export async function getServerList() {
  await updatePing();

  const autoServer = await getAutoServer();
  console.log(JSON.stringify(autoServer), 'es el servfer auto') // eslint-disable-line no-console
  const list = [{
    ...autoServer,
    value: 'auto',
    name: `AUTO (${autoServer.name})`
  }, ...servers];

  return list;
}

async function getAutoServer(): Promise<Server> {
  await updatePing();

  let server: Server = servers[0];
  for (let i = 1; i < servers.length; i++) {
    console.log(servers[i])
    if (server.ping > servers[i].ping) {
      server = servers[i];
    }
  }
  console.log(JSON.stringify(server), 'es el server auto') // eslint-disable-line no-console
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
