const net = require('net');
const crypto = require('crypto');

// En ambos, cliente y servidor
console.log('Creando objeto Diffie-Hellman...');
const dh = crypto.createDiffieHellman(2048); // Usa un grupo predefinido
const clientKeys = dh.generateKeys();

console.log('Clave pública del cliente:', clientKeys.toString('hex'));

let secret, state = 'AWAITING_SERVER_KEY';

// const client = new net.Socket();
// client.connect(3008, 'localhost', () => {
//   console.log('\nConnected to server!');
//   // Envía la clave pública del cliente al servidor
//   client.write(clientKeys);
// });

const client = new net.Socket();
client.connect({ port: 3008 }, () => {
  console.log('\nConectado al servidor');
  // Envía la clave pública del cliente al servidor justo después de la conexión
  client.write(JSON.stringify({ type: 'dh-key', publicKey: clientKeys.toString('hex') }));
});

client.on('data', (data) => {
  let message;
  try {
    message = JSON.parse(data.toString());
  } catch (error) {
    console.error('Error al parsear el mensaje:', error);
    return;
  }

  if (message.type === 'dh-params' && state === 'AWAITING_SERVER_KEY') {
    const dh = crypto.createDiffieHellman(Buffer.from(message.prime, 'hex'), Buffer.from(message.generator, 'hex'));
    const clientKeys = dh.generateKeys();
    secret = dh.computeSecret(Buffer.from(message.publicKey, 'hex'));

    console.log('\nSecreto compartido establecido:', secret.toString('hex'));
    console.log('\nConversación segura iniciada\n');

    // Ahora cambiamos el estado y enviamos nuestra clave pública
    state = 'READY_FOR_SECURE_COMMUNICATION';
    client.write(JSON.stringify({ type: 'dh-key', publicKey: clientKeys.toString('hex') }));
    
    // Ahora que tenemos el secreto, encriptamos y enviamos un mensaje seguro
    const secureMessage = "Hola, este mensaje es seguro";
    console.log('\nMensaje a cifrar:', secureMessage);
    const encryptedMessage = encryptData(secureMessage, secret);
    client.write(JSON.stringify({ type: 'secure-message', data: encryptedMessage }));
  }
  else if (message.type === 'secure-message' && state === 'READY_FOR_SECURE_COMMUNICATION') {
    const decryptedMessage = decryptData(message.data, secret);
    console.log('Mensaje descifrado del servidor:', decryptedMessage);
  }
});

client.on('close', () => {
  console.log('Connection closed');
});

client.on('error', (err) => {
  console.error('Error:', err);
});

function encryptData(plaintext, secret) {
  const iv = crypto.randomBytes(16);  // Generar IV
  console.log("Generated IV (encrypt):", iv.toString('hex'));
  const key = crypto.createHash('sha256').update(secret).digest().slice(0, 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + encrypted;  // Prepend IV to encrypted data for transmission
}


function decryptData(encrypted, secret) {
  try {
    const iv = Buffer.from(encrypted.slice(0, 32), 'hex'); // Extract IV from the beginning
    encrypted = encrypted.slice(32);
    const key = crypto.createHash('sha256').update(secret).digest().slice(0, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'binary', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err);
    return null; // Return null or handle the error appropriately
  }
}



