const net = require('net');

function sendRequest(url, method, headers, body, callback) {
  const urlObj = new URL(url);
  const options = {
    host: urlObj.hostname,
    port: urlObj.port,
  };

  const client = net.createConnection(options, () => {
    console.log('Connected to server');
    var requestData = `${method} ${urlObj.pathname} HTTP/1.1\r\n`;

    // Add automatic headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Content-Length': body ? JSON.stringify(body).length : 0,
      'Host': urlObj.hostname,
      'Connection': 'keep-alive',
      'Accept': '*/*',
      'User-Agent': 'HiperNodeJSClient/1.0.0',
      'Accept-Encoding': 'gzip, deflate, br',
    };

    const allHeaders = { ...defaultHeaders, ...headers };

    Object.entries(allHeaders).forEach(([key, value]) => {
      requestData += `${key}: ${value}\r\n`;
    });

    requestData += '\r\n';

    if (body) {
      requestData += JSON.stringify(body);
    }

    client.write(requestData);
  });

  let responseData = '';

  client.on('data', (chunk) => {
    responseData += chunk;
  });

  client.on('end', () => {
    callback(null, responseData);
    client.destroy();
  });

  client.on('error', (err) => {
    console.error('Error:', err);
    callback(err);
    client.destroy();
  });
}


// ------------------------------------------- 

const body = { name: 'New Resource', data: 'Sample data' }; // Adjust this as needed

// Usage
const headers = {
  'x-api-key': 'hiperKEY_24',
};

sendRequest('http://176.31.196.25:3008/resources', 'GET', headers, body, (err, data) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Response:', data);
  }
});