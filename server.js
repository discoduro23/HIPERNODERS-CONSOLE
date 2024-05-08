const fs = require('fs');
const os = require('os');
const net = require('net');
const dot = require('dotenv').config();
const crypto = require('crypto');

// Crear un objeto Diffie-Hellman
const dh = crypto.createDiffieHellman(2048);
const serverKeys = dh.generateKeys();

// Paths
const resourcesPath = 'data/resources.json';
const usersPath = 'data/usersdb.json';

// Cargar clave privada y certificado para HTTPS
const serverPrivateKey = fs.readFileSync('key.pem').toString();
const serverCertificate = fs.readFileSync('cert.pem').toString();

// Create a write stream for the log file
const logStream = fs.createWriteStream('server.log', { flags: 'a' });

// Function to log messages with a timestamp and a log level
function log(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${level.toUpperCase()} - ${message}\n`;
  logStream.write(logMessage);
  console.log(logMessage);
}

// Define the api key as "hiperKEY_24"
const API_KEY = dot.parsed.API_KEY;
// Los recursos se cargan al inicio
let resources = [];
let userdb = [];
let lastResourceId = 0;

function generateToken() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 10; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    token += characters[randomIndex];
  }
  return token;
}

function loadJson() {
  let loaddata = [
    resourcesPath,
    usersPath
  ]

  loaddata.forEach(element => {
    fs.readFile(element, (err, data) => {
      if (element === resourcesPath) {
        resources = JSON.parse(data);
        if (resources.length > 0) {
          lastResourceId = resources[resources.length - 1].id;
        }
      } else {
        userdb = JSON.parse(data);
      }
    })
  });
}

//cargar los datos json
loadJson();

// Función para guardar los recursos en un archivo
function saveResources() {
  fs.writeFile(resourcesPath, JSON.stringify(resources), err => {
    if (err) {
      console.error('Error al guardar los recursos:', err);
    }
  });
}

// Función para escribir un paquete de respuesta HTTP
function writePacket(socket, statusCode, statusMessage, contentType, body) {
  let response = `HTTP/1.1 ${statusCode} ${statusMessage}\r\n`;
  if (contentType) {
    response += `Content-Type: ${contentType}\r\n`;
  }
  response += '\r\n';
  if (body) {
    response += body;
  }
  socket.write(response);
}

const server = net.createServer((socket) => {
  log('INFO', '[CLIENT START]');

  socket.on('data', (data) => {
    const clientPublicKey = data;  // Asumimos que el cliente envía su llave pública
    const secret = dh.computeSecret(clientPublicKey);  // Calcular el secreto compartido
    // Aquí usarías `secret` para cifrar/descifrar mensajes
    console.log('Secreto compartido establecido:', secret.toString('hex'));


    console.log("Data received from client:", data.toString());

    // Simulamos el handshake enviando el certificado del servidor al cliente
    socket.write(serverCertificate);
    

    const request = data.toString();
    log('DEBUG', `Received request: ${request}`);
    const lines = request.split('\r\n');

    // Extracting request path and query parameters
    const requestLine = lines[0].split(' ');
    const [path, queryParams] = requestLine[1].split('?');
    const params = new URLSearchParams(queryParams);

    // Extracting headers
    const headers = {};
    for (let i = 1; i < lines.length; i++) {
      const [key, value] = lines[i].split(': ');
      headers[key.toLowerCase()] = value;
    }

    // Handling API key check
    if (headers['x-api-key'] !== API_KEY) {
      writePacket(socket, 403, 'Forbidden');
      log('ERROR', 'Invalid API key');
      socket.end();
      return;
    }

    // Handling different endpoints
    if (requestLine[0] === 'GET' && path === '/') {
      // Handle GET request for root
      fs.readFile(__dirname + '/index.html', (err, data) => {
        if (err) {
          writePacket(socket, 404, 'Not Found');
          log('ERROR', 'Root not found');
          socket.end();
          return;
        }
        writePacket(socket, 200, 'OK', 'text/html', data);
        log('INFO', 'Root sent');
        socket.end();
      });
    } else if (requestLine[0] === 'POST' && path === '/resources') {
      // Handle POST request for resources
      let body = '';
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === '') {
          body = lines.slice(i + 1).join('\r\n');
          break;
        }
      }

      // Processing resource content
      const resourceContent = JSON.parse(body);
      const newResourceId = ++lastResourceId;
      const resouranew = { }
      const resource = { id: newResourceId, content: resourceContent }; // Assigning unique ID
      resources.push(resource);
      saveResources();

      writePacket(socket, 201, 'Created', 'text/plain', `Resource added successfully with ID ${newResourceId}`);
      log('INFO', `Resource added with ID ${newResourceId}`);
      socket.end();
    } else if (requestLine[0] === 'GET' && path === '/resources') {
      // Handle GET request for resources
      writePacket(socket, 200, 'OK', 'application/json', JSON.stringify(resources));
      log('INFO', 'Resources sent');
      socket.end();
    } else if (requestLine[0] === 'PUT' && path === '/resources') {
      // Handle PUT request for updating resources
      const resourceId = parseInt(params.get('id'));
      const resourceIndex = resources.findIndex(resource => resource.id === resourceId);
      if (resourceIndex !== -1) {
        let body = '';
        for (let i = 0; i < lines.length; i++) {
          if (lines[i] === '') {
            body = lines.slice(i + 1).join('\r\n');
            break;
          }
        }

        // Processing resource content
        const resourceContent = JSON.parse(body);
        resources[resourceIndex].content = resourceContent;
        saveResources();
        writePacket(socket, 200, 'OK', 'text/plain', 'Resource updated successfully');
        log('INFO', `Resource updated with ID ${resourceId}`);
      } else {
        writePacket(socket, 404, 'Not Found');
        log('ERROR', `Resource not found with ID ${resourceId}`);
      }
      socket.end();
    } else if (requestLine[0] === 'DELETE' && path === '/resources') {
      // Handle DELETE request for deleting resources
      const resourceId = parseInt(params.get('id'));
      const resourceIndex = resources.findIndex(resource => resource.id === resourceId);
      if (resourceIndex !== -1) {
        resources.splice(resourceIndex, 1);
        saveResources();
        writePacket(socket, 200, 'OK', 'text/plain', 'Resource deleted successfully');
        log('INFO', `Resource deleted with ID ${resourceId}`);
      } else {
        writePacket(socket, 404, 'Not Found');
        log('ERROR', `Resource not found with ID ${resourceId}`);
      }
      socket.end();
    } else {
      // Handle unknown endpoints
      writePacket(socket, 404, 'Not Found');
      log('ERROR', `Unknown endpoint: ${path}`);
      socket.end();
    }
  });
  // Envía la llave pública del servidor al cliente
  socket.write(serverKeys);

  socket.on('end', () => {
    log('INFO', '[CLIENT END]');
  });
});


server.listen(3001, () => {
console.log('Server listening on port 3001');
});


// Obtén la dirección IP de la red
const networkInterfaces = os.networkInterfaces();
let ip;
for (let interface in networkInterfaces) {
  for (let version of networkInterfaces[interface]) {
    if (version.family === 'IPv4' && !version.internal) {
      ip = version.address;
    }
  }
}

const port = process.env.PORT || process.argv[2] || 3008;
server.listen(port, () => {
  log('INFO', `HiperServer running on http://${ip}:${port}`);

});
