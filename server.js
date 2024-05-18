const fs = require('fs');
const os = require('os');
const net = require('net');
const crypto = require('crypto');
const { count } = require('console');
const dotenv = require('dotenv').config();

// Crear un objeto Diffie-Hellman
console.log('Creando objeto Diffie-Hellman...');
const dh = crypto.createDiffieHellman(2048);
const serverKeys = dh.generateKeys();
console.log('Llave pública del servidor:', serverKeys.toString('hex'));

// Cargar clave privada y certificado para HTTPS
const serverPrivateKey = fs.readFileSync('key.pem').toString();
const serverCertificate = fs.readFileSync('cert.pem').toString();

// Paths
const resourcesPath = 'data/resources.json';
const usersPath = 'data/usersdb.json';


// Create a write stream for the log file
const logStream = fs.createWriteStream('server.log', { flags: 'a' });
// Define the api key as "hiperKEY_24"
const API_KEY = dotenv.parsed.API_KEY;
// Los recursos se cargan al inicio
let resources = [];
let userdb = [];
let lastResourceId = 0;


// Function to log messages with a timestamp and a log level
function log(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${level.toUpperCase()} - ${message}\n`;
  logStream.write(logMessage);
  console.log(logMessage);
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
  console.log('\nCliente conectado.');
  log('INFO', '[CLIENT START]');

  let secret; // Almacenará el secreto compartido

  // Envía los parámetros Diffie-Hellman al cliente
  const params = {
    type: 'dh-params',
    prime: dh.getPrime().toString('hex'),
    generator: dh.getGenerator().toString('hex'),
    publicKey: serverKeys.toString('hex')
  };
  socket.write(JSON.stringify(params));

  socket.on('data', (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      console.error('\nError al parsear el mensaje:', error);
      return;
    }

    switch (message.type) {
      case 'dh-key':
        try {
          counter = 0;
          const clientPublicKey = Buffer.from(message.publicKey, 'hex');
          secret = dh.computeSecret(clientPublicKey);
          if(counter == 0){
          console.log('\nSecreto compartido establecido:', secret.toString('hex'));
          counter++;
          }
          // Confirmar el establecimiento del secreto compartido
          socket.write(JSON.stringify({ type: 'key-exchange-complete' }));

        } catch (error) {
          console.error('\nError al establecer el secreto compartido:', error);
          socket.write(JSON.stringify({ type: 'error', message: 'Failed to establish shared secret' }));
          socket.end();
        }
        break;
      case 'secure-message':
        console.log('\nConversación segura iniciada\n');
        try {
          const decryptedMessage = decryptData(message.data, secret);
          console.log('\nMensaje descifrado del cliente:', decryptedMessage);
          // Procesar el mensaje descifrado como sea necesario
        } catch (error) {
          console.error('\nError al descifrar mensaje:', error);
          socket.write(JSON.stringify({ type: 'error', message: 'Failed to decrypt message' }));
        }
        break;
      default:
        console.log('\nTipo de mensaje no reconocido:', message.type);
    }
  });

  socket.on('end', () => log('INFO', '[CLIENT END]'));
});


/**
 * Encrypts data using AES-256-CBC.
 * Assumes the first 16 bytes of the secret are used as the IV and the next 32 bytes as the AES key.
 * @param {string} plaintext - The plaintext data to encrypt.
 * @param {Buffer} secret - The shared secret used to derive the key and IV.
 * @returns {Buffer} The encrypted data.
 */

function encryptData(plaintext, secret) {
  const iv = crypto.randomBytes(16);  // Generar IV
  console.log("Generated IV (encrypt):", iv.toString('hex'));
  const key = crypto.createHash('sha256').update(secret).digest().slice(0, 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'binary');
  encrypted += cipher.final('binary');
  return iv.toString('hex') + encrypted;  // Prepend IV to encrypted data for transmission
}
/**
 * Decrypts data using AES-256-CBC.
 * Assumes the first 16 bytes of the secret are used as the IV and the next 32 bytes as the AES key.
 * @param {Buffer} data - The encrypted data.
 * @param {Buffer} secret - The shared secret used to derive key and IV.
 * @returns {string} The decrypted string.
 */

// Modificar la función para usar la encriptación cuando sea necesario
function writeSecurePacket(socket, statusCode, statusMessage, contentType, body, secret) {
  let response = `HTTP/1.1 ${statusCode} ${statusMessage}\r\n`;
  if (contentType) {
      response += `Content-Type: ${contentType}\r\n`;
  }
  response += '\r\n';
  if (body) {
      response += body;
  }
  
  // Encriptar la respuesta completa antes de enviarla
 // Encriptar la respuesta completa antes de enviarla
 if (secret) {
  const encryptedData = encryptData(response, secret);
  if (encryptedData) {
      socket.write(encryptedData);
  } else {
      console.error('Failed to encrypt response');
      // Opcional: manejar el error de cifrado (p. ej., cerrar la conexión)
  }
} else {
  socket.write(response);
}
}

function decryptData(encrypted, secret) {
  try {
    const iv = Buffer.from(encrypted.slice(0, 32), 'hex'); // Extract IV from the beginning
    encrypted = encrypted.slice(32);
    const key = crypto.createHash('sha256').update(secret).digest().slice(0, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err);
    return null; // Return null or handle the error appropriately
  }
}


function processHTTPRequest(data, socket) {
    const request = secret ? decryptData(data, secret).toString() : data.toString();

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
      writeSecurePacket(socket, 403, 'Forbidden', 'text/plain', 'Invalid API Key', secret);
      return;
    }

    // Handling different endpoints
    if (requestLine[0] === 'GET' && path === '/') {
      // Handle GET request for root
      fs.readFile(__dirname + '/index.html', (err, data) => {
        if (err) {
          writeSecurePacket(socket, 404, 'Not Found', 'text/plain', 'Root not found', secret);
          return;
        }
        writeSecurePacket(socket, 200, 'OK', 'text/html', data.toString(), secret);
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

      const resource = {
        id: newResourceId,  
        nombre: resourceContent.nombre,     
        provincias: resourceContent.provincias ?? ["N/A"]  
      };
      resources.push(resource);
      saveResources();
      writeSecurePacket(socket, 201, 'Created', 'text/plain', `Resource added successfully with ID ${newResourceId}`, secret);
      
      log('INFO', `Resource added with ID ${newResourceId}`);
      socket.end();
    } else if (requestLine[0] === 'GET' && path === '/resources') {
      
      // Handle GET request for resources
      writeSecurePacket(socket, 200, 'OK', 'application/json', JSON.stringify(resources), secret);
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

        resources[resourceIndex].nombre = resourceContent.nombre ?? resources[resourceIndex].nombre;
        resources[resourceIndex].provincias = resourceContent.provincias ?? resources[resourceIndex].provincias;
        saveResources();
        writeSecurePacket(socket, 200, 'OK', 'text/plain', 'Resource updated successfully', secret);

        log('INFO', `Resource updated with ID ${resourceId}`);
      } else {
        writeSecurePacket(socket, 404, 'Not Found', 'text/plain', 'Not found', secret);
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
        writeSecurePacket(socket, 200, 'OK', 'text/plain', 'Resource deleted successfully', secret);
        log('INFO', `Resource deleted with ID ${resourceId}`);
      } else {
        writeSecurePacket(socket, 404, 'Not Found', 'text/plain', 'Not found', secret);
        log('ERROR', `Resource not found with ID ${resourceId}`);
      }
      socket.end();
    } else {
      // Handle unknown endpoints
      writeSecurePacket(socket, 404, 'Not Found', 'text/plain', 'Endpoint not found', secret);
    }
}

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
// server.listen(port, () => {
//   log('INFO', `HiperServer running on http://${ip}:${port}`);

// });
server.listen(8000, () => {
  console.log('Servidor escuchando en el puerto 8000');
});
