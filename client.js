const fs = require('fs');
const net = require('net');
const readline = require('readline');

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
function sendRequest(url, method, headers, body, callback) {
  headers['If-Modified-Since'] = setCacheHeaders(getCache());
  const urlObj = new URL(url);
  const options = {
    host: urlObj.hostname,
    port: urlObj.port || 80,
  };

  const client = net.createConnection(options, () => {
    console.log('Connected to server');
    let requestData = `${method} ${urlObj.pathname} HTTP/1.1\r\n`;

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
      body: responseData
    };
    handleResponse(response, callback);
    client.destroy();
  });

  client.on('error', (err) => {
    console.error('Error:', err);
    callback(err);
    client.destroy();
  });
}

// Function to handle the response based on status code
function handleResponse(response, callback) {
  console.log('Response:', response);

  if (response.statusCode === 200) {
    fs.writeFileSync(cacheFile, response.body);
    console.log('Resources saved to cache.');
    console.log('Cached resources:', JSON.parse(response.body));
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
  }  
  else {
    console.log('Unexpected status:', response.statusCode, response.statusMessage);
  }
  if (callback) callback();
}

// Main function to handle the entire process
function handleRequest(callback) {
  let cacheHeaders = {};
  cacheHeaders['If-Modified-Since'] = setCacheHeaders(getCache());
  const headers = { ...defaultHeaders, ...cacheHeaders};
  sendRequest('http://176.31.196.25:3008/resources', 'GET', headers, null, (err, response) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    callback();
  });
}

// Function to get input from the user
function getInput(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => rl.question(prompt, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

// Function to handle manual input
async function manualRequest(callback) {

  let url = await getInput('Enter URL: ');
  // if not provided, use the same as we use in the predefined request
  if (!url) {
    url = 'http://176.31.196.25:3008/resources';
  }
  let method;
  do {
    method = await getInput('Enter HTTP Method (GET, POST, PUT, DELETE): ');
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
      console.log('Invalid method. Please enter GET, POST, PUT, or DELETE.');
    }
  } while (!['GET', 'POST', 'PUT', 'DELETE'].includes(method));

  const headerString = await getInput('Enter headers (key:value, separate multiple with commas): ');
  // an example of multiple headers: 'Content-Type:application/json,Authorization:Bearer 123456'
  const bodyString = await getInput('Enter body (JSON format): ');
  // an example of body: '{"key": "value"}'

  let headers = {
    'x-api-key': 'hiperKEY_24',
  };

  if (headerString) {
    const headerPairs = headerString.split(',');
    headerPairs.forEach(pair => {
      const [key, value] = pair.split(':');
      headers[key.trim()] = value.trim();
    });
  }

  headers['If-Modified-Since'] = setCacheHeaders(getCache());

  let body = null;
  try {
    body = JSON.parse(bodyString);
  } catch (e) {
    console.log('Invalid JSON body, sending as raw string.');
    body = bodyString;
  }

  sendRequest(url, method, headers, body, (err, response) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    callback();
  });
}

// Function to show menu and handle choices
async function showMenu() {
  console.log('Menu:');
  console.log('1) Enter the function parameters manually');
  console.log('2) Make the GET function (predefined before)');
  const choice = await getInput('Choose an option: ');

  switch (choice) {
    case '1':
      await manualRequest(showMenu);
      break;
    case '2':
      handleRequest(showMenu);
      break;
    default:
      console.log('Invalid choice. Exiting.');
      return; // Exit if invalid choice
  }
}

// Start the menu
showMenu();
