const net = require("net");
const server = "example.com";
const port = 80;

const request = `GET / HTTP/1.1
Host: ${server}
Connection: close

`;

const client = new net.Socket();
client.connect(port, server, () => {
  console.log("Connected to server");
  client.write(request);
});

client.on("data", (data) => {
  console.log("Received: " + data.toString());
  client.destroy();
});

client.on("close", () => {
  console.log("Connection closed");
});