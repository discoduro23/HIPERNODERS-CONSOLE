const https = require('https');
const url = require('url');
const fs = require('fs');
const os = require('os');

// Cargar clave privada y certificado para HTTPS
const options = {
  key: fs.readFileSync('key.pem'), // Ajusta la ruta
  cert: fs.readFileSync('cert.pem') // Ajusta la ruta
};


// Define the api key as "hiperKEY_24"
const API_KEY = 'hiperKEY_24';

// Los recursos se cargan al inicio
let resources = [];
let userdb = [];

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
    "resources.json",
    "usersdb.json"
  ]

  loaddata.forEach(element => {
    fs.readFile(element, (err, data) => {
      if (element = "resources.json") {
        resources = JSON.parse(data);
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
  fs.writeFile('resources.json', JSON.stringify(resources), err => {
    if (err) {
      console.error('Error al guardar los recursos:', err);
    }
  });
}

const server = https.createServer(options, (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;


    const requestApiKey = req.headers['x-api-key'];
    if (requestApiKey !== API_KEY) {
      res.writeHead(403);
      res.end('403 Forbidden');
      return;
    }

  if (path === '/') {
    fs.readFile(__dirname + '/index.html', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('404 Not Found');
        return;
      }
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(data);
    });
  } else if (path === '/resources' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      // search the id
      let id = 1;
      const resourceContent = JSON.parse(body);
      const resource = { id: id++, content: resourceContent }; // Crea el recurso con ID y contenido
      resources.push(resource);
      saveResources(); 
      res.writeHead(201);
      res.end('Resource added successfully');
    });
  }else if (path === '/resources'  && req.method === 'GET') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(resources));
  } else if (path === '/resources' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const resourceContent = JSON.parse(body);
      const resource = { id: id++, content: resourceContent }; // Crea el recurso con ID y contenido
      resources.push(resource);
      saveResources(); 
      res.writeHead(201);
      res.end('Resource added successfully');
    });
  } else {
    res.writeHead(404);
    res.end('404 Not Found');
  }
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
  console.log(`HiperServer listening on https://${ip}:${port}`);
});
