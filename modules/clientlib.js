const fs = require('fs');
const net = require('net');

const cacheFile = 'resourcesCache.json';

const defaultHeaders = {
  'x-api-key': 'hiperKEY_24',
};

// Load cached resources if available
function getCache() {
  if (fs.existsSync(cacheFile)) {
    const cacheData = fs.readFileSync(cacheFile);
    const cachedResources = JSON.parse(cacheData);
    if (cachedResources && cachedResources.length > 0) {
      return cachedResources;
    }
  }
  return {};
}

function setCacheHeaders(cachedResources) {
  if (cachedResources && cachedResources.length > 0) {
    return cachedResources[0].lastModified;
  } else {
    delete defaultHeaders['If-Modified-Since'];
  }
  return null;
}

// Function to send HTTP requests
function sendRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    headers['If-Modified-Since'] = setCacheHeaders(getCache());
    const urlObj = new URL(url);
    const options = {
      host: urlObj.hostname,
      port: urlObj.port || 3008,
    };

    const client = net.createConnection(options, () => {
      console.log('Connected to server');
      let requestData = `${method} ${urlObj.pathname}${urlObj.search} HTTP/1.1\r\n`;

      // Add automatic headers
      const defaultHeaders = {
        'Content-Type': 'application/json',
        'Content-Length': body ? Buffer.byteLength(JSON.stringify(body)) : 0,
        'Host': urlObj.hostname,
        'Connection': 'keep-alive',
        'Accept': '*/*',
        'User-Agent': 'HiperNodeJSClient/1.0.0',
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
    let statusCode = null;
    let statusMessage = null;
    let responseHeaders = {};

    client.on('data', (chunk) => {
      responseData += chunk.toString();
      const endOfHeaders = responseData.indexOf('\r\n\r\n');
      if (endOfHeaders !== -1) {
        const headersRaw = responseData.substring(0, endOfHeaders).split('\r\n');
        headersRaw.shift(); // Remove HTTP status line
        headersRaw.forEach(header => {
          const [key, value] = header.split(': ');
          responseHeaders[key] = value;
        });
        const statusLine = responseData.substring(0, endOfHeaders).split('\r\n')[0].split(' ');
        statusCode = parseInt(statusLine[1]);
        statusMessage = statusLine.slice(2).join(' ');
        responseData = responseData.substring(endOfHeaders + 4);
      }
    });

    client.on('end', () => {
      const response = {
        statusCode,
        statusMessage,
        headers: responseHeaders,
        body: responseData,
        method: method
      };
      handleResponse(response);
      resolve(response);
      client.destroy();
    });

    client.on('error', (err) => {
      console.error('Error:', err);
      reject(err);
      client.destroy();
    });
  });
}

// Function to handle the response based on status code
function handleResponse(response) {
  console.log("Response:\n", response, "\n");
  if (response.statusCode === 200) {
    //if is a GET request and the status code is 200
    if (response.method === 'GET') {
      fs.writeFileSync(cacheFile, response.body);
      console.log('Resources saved to cache.');
      console.log('Cached resources:', JSON.parse(response.body));
    }
    else {
      console.log('200 OK.');
    }
  } else if (response.statusCode === 201) {
    console.log('Resource created successfully.');
  } else if (response.statusCode === 204) {
    console.log('Resource updated successfully.');
  } else if (response.statusCode === 304) {
    const cachedResources = getCache();
    console.log('Resources are up-to-date.');
    console.log('Cached resources:', cachedResources);
  } else if (response.statusCode === 400) {
    console.log('Bad request:', response.statusMessage);
  } else if (response.statusCode === 401) {
    console.log('Unauthorized:', response.statusMessage);
  } else if (response.statusCode === 403) {
    console.log('Forbidden:', response.statusMessage);
  } else if (response.statusCode === 404) {
    console.log('Resource not found:', response.statusMessage);
  } else {
    console.log('Unexpected status:', response.statusCode, response.statusMessage);
  }
}

module.exports = {
    sendRequest,
    defaultHeaders,
};
