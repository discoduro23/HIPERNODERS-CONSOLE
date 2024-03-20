const net = require("net");

const handleRequest = (data) => {
  const request = data.toString();

  const bodyIndex = request.indexOf("\r\n\r\n");
  const body = request.substring(bodyIndex + 4);

  const response = `HTTP/1.1 200 OK
Content-Type: text/plain
Connection: close

Echoing back your request body:
${body}`;

  return response;
};

const server = net.createServer((socket) => {
  console.log("Client connected");

  socket.on("data", (data) => {
    const response = handleRequest(data);
    socket.end(response);
  });

  socket.on("end", () => {
    console.log("Client disconnected");
  });
});

server.listen(3000, () => {
  console.log("Server listening on port 3000");
});