import { config } from './config';

const endpoint = `${window.location.protocol}//${config.apiEndpoint}`;
const unavialableMessage = 'Server is temporarily unavailable, try again later';

function get(url: string, callback = (data: any) => {}): any {
  fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': endpoint,
    },
  })
  .then(res => res.json())
  .then(callback)
  .catch((err) => callback({ message: err }));
}

function post(url: string, body: any, callback = (data: any) => {}): any {
  fetch(url, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': endpoint,
    },
  })
  .then(res => res.json())
  .then(callback)
  .catch(() => callback({ message: unavialableMessage }));
}

function method(url: string, options: {}, callback = (data: any) => {}): any {
  fetch(url, {
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Access-Control-Allow-Origin': endpoint,
    },
    ...options,
  })
  .then(res => res.json())
  .then(callback)
  .catch(() => callback({ message: unavialableMessage }));
}

export default { endpoint, get, post, method };
