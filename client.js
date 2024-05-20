const readline = require('readline');
const { sendRequest, defaultHeaders } = require('./modules/clientlib');

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
  const bodyString = await getInput('Enter body (JSON format): ');

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

  let body = null;
  try {
    body = JSON.parse(bodyString);
  } catch (e) {
    console.log('Invalid JSON body, sending as raw string.');
    body = bodyString;
  }

  try {
    const response = await sendRequest(url, method, headers, body);
    console.log(response);
  } catch (err) {
    console.error('Error:', err);
  }

  if (callback) callback();
}

// Function to handle predefined GET request
async function handleRequest(callback) {
  let cacheHeaders = {};
  const headers = { ...defaultHeaders, ...cacheHeaders};
  try {
    const response = await sendRequest('http://176.31.196.25:3008/resources', 'GET', headers, null);
    console.log(response);
  } catch (err) {
    console.error('Error:', err);
  }
  if (callback) callback();
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

module.exports = {
  handleRequest,
  manualRequest,
};
