const config = require('../config');

const endpoint = config.apiEndpoint;
const token = config.serverSecret;

function get(path, callback = (data) => {}) {
  fetch(endpoint + path, {
    method: 'GET',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': endpoint,
      'Authorization': `Bearer ${token}`,
    },
  })
  .then(async res => {
    if (!res.ok) {
      const text = await res.text();
      return { error: true, status: res.status, message: text };
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return res.json();
    } else {
      const text = await res.text();
      return { error: true, message: text };
    }
  })
  .then(callback)
  .catch((err) => callback({ error: true, message: err.message || String(err) }));
}

function post(path, body, callback = (data) => {}) {
  fetch(endpoint + path, {
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': endpoint,
      'Authorization': `Bearer ${token}`,
    },
  })
  .then(async res => {
    if (!res.ok) {
      const text = await res.text();
      return { error: true, status: res.status, message: text };
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return res.json();
    } else {
      const text = await res.text();
      return { error: true, message: text };
    }
  })
  .then(callback)
  .catch((err) => callback({ error: true, message: err.message || String(err) }));
}

module.exports = { get, post };
