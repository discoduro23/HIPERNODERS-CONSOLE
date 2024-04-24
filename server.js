const https = require('https');
const url = require('url');
const fs = require('fs');
const os = require('os');

// Cargar clave privada y certificado para HTTPS
const options = {
  key: fs.readFileSync('key.pem'), // Ajusta la ruta
  cert: fs.readFileSync('cert.pem') // Ajusta la ruta
};

// Los recursos se cargan desde un archivo al inicio
let resources = [];
fs.readFile('resources.json', (err, data) => {
  if (!err) {
    resources = JSON.parse(data);
  } else {
    console.error("Error loading resources:", err);
  }
});

// Función para guardar los recursos en un archivo
function saveResources() {
  fs.writeFile('resources.json', JSON.stringify(resources), err => {
    if (err) {
      console.error('Error al guardar los recursos:', err);
    }
  });
}

const server = https.createServer(options, (req, res) => {
  const parsedUrl = new URL(req.url, `https://${req.headers.host}`);
  const path = parsedUrl.pathname;

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
  } else if (path === '/addResource' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const resource = JSON.parse(body);
        resources.push(resource);
        saveResources(); 
        res.writeHead(201);
        res.end('Resource added successfully');
      } catch (err) {
        res.writeHead(400);
        res.end("Invalid JSON");
      }
    });
  } else if (path === '/viewResources') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(resources));
  } else if (path === '/modifyResource' && req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const resource = JSON.parse(body);
        const index = resources.findIndex(r => r.id === resource.id);
        if (index !== -1) {
          resources[index] = resource;
          saveResources();
          res.writeHead(200);
          res.end('Resource modified successfully');
        } else {
          res.writeHead(404);
          res.end('Resource not found');
        }
      } catch (err) {
        res.writeHead(400);
        res.end("Invalid JSON");
      }
    });
  } else if (path === '/deleteResource' && req.method === 'DELETE') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const resource = JSON.parse(body);
        const index = resources.findIndex(r => r.id === resource.id);
        if (index !== -1) {
          resources.splice(index, 1);
          saveResources();
          res.writeHead(200);
          res.end('Resource deleted successfully');
        } else {
          res.writeHead(404);
          res.end('Resource not found');
        }
      } catch (err) {
        res.writeHead(400);
        res.end("Invalid JSON");
      }
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
