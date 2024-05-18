const fs = require('fs');
const os = require('os');
const net = require('net');
const dotenv = require('dotenv').config();
const CONST = require('./modules/constants.js');

const resourcesPath = 'data/resources.json';
const usersPath = 'data/usersdb.json';
const imagesDir = 'images/';

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

const logStream = fs.createWriteStream('server.log', { flags: 'a' });
const API_KEY = dotenv.parsed.API_KEY;

let resources = [];
let userdb = [];
let lastResourceId = 0;

function log(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${level.toUpperCase()} - ${message}\n`;
  logStream.write(logMessage);
  console.log(logMessage);
}

function loadJson() {
  let loaddata = [resourcesPath, usersPath];

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
    });
  });
}

loadJson();

function saveResources() {
  fs.writeFile(resourcesPath, JSON.stringify(resources), err => {
    if (err) {
      console.error('Error al guardar los recursos:', err);
    }
  });
}

function writePacket(socket, statusCode, statusMessage, contentType, body) {
  let response = `HTTP/1.1 ${statusCode} ${statusMessage}\r\n`;
  if (contentType) {
    response += `Content-Type: ${contentType}\r\n`;
  }
  response += '\r\n';
  if (body) {
    socket.write(response);
    socket.write(body);
  } else {
    socket.write(response);
  }
  socket.end();
}

const server = net.createServer((socket) => {
  log('INFO', '[CLIENT START]');
  
  let requestData = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    requestData = Buffer.concat([requestData, chunk]);

    const requestString = requestData.toString();
    if (requestString.includes('\r\n\r\n')) {
      const headerEndIndex = requestString.indexOf('\r\n\r\n') + 4;
      const contentLengthMatch = requestString.match(/Content-Length: (\d+)/i);
      if (contentLengthMatch) {
        const contentLength = parseInt(contentLengthMatch[1], 10);
        if (requestData.length >= headerEndIndex + contentLength) {
          processRequest(socket, requestData);
          requestData = Buffer.alloc(0);
        }
      } else {
        processRequest(socket, requestData);
        requestData = Buffer.alloc(0);
      }
    }
  });

  socket.on('error', (err) => {
    log('ERROR', `Socket error: ${err.message}`);
  });

  socket.on('end', () => {
    log('INFO', '[CLIENT END]');
  });
});

function processRequest(socket, requestData) {
  const requestString = requestData.toString();
  //log('DEBUG', `Received request: ${requestString}`);

  const lines = requestString.split('\r\n');
  const requestLine = lines[0] ? lines[0].split(' ') : [];

  if (requestLine.length < 2) {
    writePacket(socket, CONST.CODE_400, CONST.CODE_400_MESSAGE);
    log('ERROR', 'Invalid request line');
    return;
  }

  const method = requestLine[0];
  const [path, queryParams] = requestLine[1].split('?');
  const params = new URLSearchParams(queryParams || '');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key'
  };
  for (let i = 1; i < lines.length; i++) {
    const [key, value] = lines[i].split(': ');
    headers[key.toLowerCase()] = value;
  }

  if (headers['x-api-key'] !== API_KEY) {
    writePacket(socket, CONST.CODE_403, CONST.CODE_403_MESSAGE);
    log('ERROR', 'Invalid API key');
    return;
  }

  if (method === 'GET' && path === '/') {
    fs.readFile(__dirname + '/index.html', (err, data) => {
      if (err) {
        writePacket(socket, CONST.CODE_404, CONST.CODE_404_MESSAGE);
        log('ERROR', 'Root not found');
        return;
      }
      writePacket(socket, CONST.CODE_200, CONST.CODE_200_MESSAGE, 'text/html', data);
      log('INFO', 'Root sent');
    });
  } else if (method === 'POST' && path === '/resources') {
    let body = '';
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '') {
        body = lines.slice(i + 1).join('\r\n');
        break;
      }
    }

    if (body === '') {
      writePacket(socket, CONST.CODE_400, CONST.CODE_400_MESSAGE);
      log('ERROR', 'Empty body');
      return;
    }

    const resourceContent = JSON.parse(body);
    const newResourceId = ++lastResourceId;
    const resource = {
      id: newResourceId,
      nombre: resourceContent.nombre ?? "N/A",
      provincias: resourceContent.provincias ?? ["N/A"]
    };
    resources.push(resource);
    saveResources();

    writePacket(socket, CONST.CODE_201, CONST.CODE_201_MESSAGE, 'text/plain', `Resource added successfully with ID ${newResourceId}`);
    log('INFO', `Resource added with ID ${newResourceId}`);
  } else if (method === 'GET' && path === '/resources') {
    writePacket(socket, CONST.CODE_200, CONST.CODE_200_MESSAGE, 'application/json', JSON.stringify(resources));
    log('INFO', 'Resources sent');
  } else if (method === 'PUT' && path === '/resources') {
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

      const resourceContent = JSON.parse(body);

      resources[resourceIndex].nombre = resourceContent.nombre ?? resources[resourceIndex].nombre;
      resources[resourceIndex].provincias = resourceContent.provincias ?? resources[resourceIndex].provincias;
      saveResources();
      writePacket(socket, CONST.CODE_200, CONST.CODE_200_MESSAGE, 'text/plain', 'Resource updated successfully');
      log('INFO', `Resource updated with ID ${resourceId}`);
    } else {
      writePacket(socket, CONST.CODE_404, CONST.CODE_404_MESSAGE);
      log('ERROR', `Resource not found with ID ${resourceId}`);
    }
  } else if (method === 'DELETE' && path === '/resources') {
    const resourceId = parseInt(params.get('id'));
    const resourceIndex = resources.findIndex(resource => resource.id === resourceId);
    if (resourceIndex !== -1) {
      resources.splice(resourceIndex, 1);
      saveResources();
      writePacket(socket, CONST.CODE_200, CONST.CODE_200_MESSAGE, 'text/plain', 'Resource deleted successfully');
      log('INFO', `Resource deleted with ID ${resourceId}`);
    } else {
      writePacket(socket, CONST.CODE_404, CONST.CODE_404_MESSAGE);
      log('ERROR', `Resource not found with ID ${resourceId}`);
    }
  } else if (method === 'POST' && path === '/images') {
    const boundary = headers['content-type'].split('boundary=')[1];

    // Función para dividir el buffer en partes
    const splitBuffer = (buffer, separator) => {
      let parts = [];
      let start = 0;
      let index;
      while ((index = buffer.indexOf(separator, start)) !== -1) {
        parts.push(buffer.slice(start, index));
        start = index + separator.length;
      }
      parts.push(buffer.slice(start));
      return parts;
    };

    const parts = splitBuffer(requestData, Buffer.from(`--${boundary}`)).filter(part => part.length > 0 && part.toString().trim() !== '--');

    const filePart = parts.find(part => part.includes('filename='));
    if (!filePart) {
      writePacket(socket, CONST.CODE_400, CONST.CODE_400_MESSAGE, 'text/plain', 'No file uploaded');
      log('ERROR', 'No file uploaded');
      return;
    }

    const contentDispositionMatch = filePart.toString().match(/Content-Disposition: form-data; name="file"; filename="(.+)"/);
    const contentTypeMatch = filePart.toString().match(/Content-Type: (.+)/);

    if (!contentDispositionMatch || !contentTypeMatch) {
      writePacket(socket, CONST.CODE_400, CONST.CODE_400_MESSAGE, 'text/plain', 'Invalid file upload');
      log('ERROR', 'Invalid file upload');
      return;
    }

    const filename = contentDispositionMatch[1].trim();

    const filePartString = filePart.toString();
    const lines = filePartString.split('\r\n');


    //Encontrar la línea donde comienza el contenido de la imagen
    let dataStartIndex = 0;
    let typeofimage = '';
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('Content-Type: image/')) {
        typeofimage = lines[i].split('image/')[1];
        if (i + 2 < lines.length) {
          dataStartIndex = filePartString.indexOf(lines[i + 2]);
        }
        break;
      } 
    }

    if (typeofimage === '') {
      writePacket(socket, CONST.CODE_405, CONST.CODE_405_MESSAGE, 'text/plain', 'Invalid file type');
      log('ERROR', 'Invalid file type');
      return;
    }

    // Encontrar el final de los datos del archivo basándonos en `\r\n--` que marca el final de la parte
    const fileDataEndIndex = filePart.indexOf(Buffer.from('\r\n--'), dataStartIndex);

    // Si `\r\n--` no se encuentra, utilizar la longitud completa de `filePart`
    const fileData = (fileDataEndIndex !== -1) ? filePart.slice(dataStartIndex, fileDataEndIndex) : filePart.slice(dataStartIndex);

    const filePath = imagesDir + filename;

    fs.writeFile(filePath, fileData, err => {
      if (err) {
        writePacket(socket, CONST.CODE_500, CONST.CODE_500_MESSAGE);
        log('ERROR', 'Error saving image' + err);
        return;
      }
      writePacket(socket, CONST.CODE_201, CONST.CODE_201_MESSAGE, 'text/plain', `Image saved as ${filename}`);
      log('INFO', `Image saved: ${filename}`);
    });
  } else if (method === 'GET' && path.startsWith('/images')) {
    const filename = path.split('/images/')[1];
    const filePath = imagesDir + filename;

    fs.readFile(filePath, (err, data) => {
      if (err) {
        writePacket(socket, CONST.CODE_404, CONST.CODE_404_MESSAGE);
        log('ERROR', 'Image not found');
        return;
      }
      writePacket(socket, CONST.CODE_200, CONST.CODE_200_MESSAGE, 'image/png', data);
      log('INFO', `Image sent: ${filename}`);
    });
  } else {
    writePacket(socket, CONST.CODE_404, CONST.CODE_404_MESSAGE);
    log('ERROR', `Unknown endpoint: ${path}`);
  }
}

const networkInterfaces = os.networkInterfaces();
let ip;
for (let iface in networkInterfaces) {
  for (let version of networkInterfaces[iface]) {
    if (version.family === 'IPv4' && !version.internal) {
      ip = version.address;
    }
  }
}

const port = process.argv[2] || 3008;
server.listen(port, () => {
  log('INFO', `HiperServer running on http://${ip}:${port}`);
});
