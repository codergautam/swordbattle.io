import { config } from './config';

const endpoint = `${window.location.protocol}//${config.apiEndpoint}`;
const backupEndpoint = config.apiEndpointBackup ? `${window.location.protocol}//${config.apiEndpointBackup}` : null;
let currentEndpoint: string | null = null;

const unavialableMessage = 'Server is temporarily unavailable, try again later';

let debugMode = false;
try {
  debugMode = window.location.search.includes("debugAlertMode");
  } catch(e) {}

async function checkEndpoint() {
  if (!currentEndpoint) {
    currentEndpoint = endpoint;
    await fetch(`${currentEndpoint}/games/ping`, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain',
      },
    })
    .catch(() => {
      console.log('Endpoint is not available, switching to backup');
      currentEndpoint = backupEndpoint;
    });
  }
}

function get(url: string, callback = (data: any) => {}): any {
  if(!currentEndpoint) {
    checkEndpoint().then(() => {
      call();
    });
  } else {
    call();
  }

  function call() {
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
}

function post(url: string, body: any, callback = (data: any) => {}, token?: string, useRecaptcha = false) {

  if(!body) body = {};
  
      let secret: string | null = null;
      try {
       secret = window.localStorage.getItem('secret');
      } catch(e) {
        console.log('Error getting secret', e);
      }
  if(!currentEndpoint) {
    checkEndpoint().then(() => {
      call();
    });
  } else {
    call();
  }

  function call() {
  const recaptchaClientKey = config.recaptchaClientKey;

  const sendRequest = (recaptchaToken = '') => {
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': endpoint,
      'Authorization': token ? `Bearer ${token}` : '',
      'Recaptcha-Token': ''
    };

    if (recaptchaToken) {
      body.recaptchaToken = recaptchaToken;
    }
    if(secret) {
      body.secret = secret;
    }

    fetch(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify(body),
      headers: headers,
    })
    .then(res => res.json())
    .then(callback)
    .catch(() => callback({ message: unavialableMessage }));
  };

  if (useRecaptcha && recaptchaClientKey && (window as any).recaptcha) {
      const endpointName = url.split('/').pop() as string;
      (window as any).recaptcha.execute(endpointName, {}).then((recaptchaToken: string) => {
        if(debugMode) alert('got recaptcha of length '+recaptchaToken.length)
        sendRequest(recaptchaToken);
      });
  } else {
    sendRequest();
  }
}
}

async function postAsync(url: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    post(url, body, (data: any) => {
      resolve(data);
    });
  });
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

export default { endpoint, get, post, method, postAsync };
