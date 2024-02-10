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
  .then(res => res.json())
  .then(callback)
  .catch((err) => callback({ message: err }));
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
  .then(res => res.json())
  .then(callback)
  .catch((err) => callback({ message: err }));
}

module.exports = { get, post };
