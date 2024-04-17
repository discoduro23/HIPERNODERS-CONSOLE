const http = require('http');

function sendRequest(url, method, headers, body, callback) {
  const urlObj = new URL(url);
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port,
    method: method,
    path: urlObj.pathname,
    headers: headers
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    console.log(`Status: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      callback(null, responseData);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    callback(e);
  });

  if (body) {
    req.write(JSON.stringify(body));
  }
  req.end();
}

// Usage
const headers = {
  'Content-Type': 'application/json',
  // Add any other headers here
};

const body = {name: 'New Resource', data: 'Sample data'}; // Adjust this as needed

sendRequest('http://localhost:3008/addResource', 'POST', headers, body, (err, data) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Response:', data);
  }
});
