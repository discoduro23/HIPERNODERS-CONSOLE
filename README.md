# 👩🏻‍💻 HTTP group project
https://github.com/pitazzo/usj-http-project/blob/master/README.md?plain=1

## 🛂 Mandatory features

### 🚢 HTTP Client

- [ ] Send HTTP requests, in a way that:
  - [ ] It is possible to choose the URL to which the request will be sent
  - [ ] Use any available HTTP verb in the request (GET, HEAD, POST, PUT, DELETE)
  - [ ] Automatically add the necessary headers to the request so that it can be processed correctly
  - [ ] Add any other arbitrary header desired by the user
  - [ ] Specify the body of the request
- [ ] Receive and display on screen the response message of the sent request
- [ ] Inform about the request status
- [ ] Be able to send successive requests, i.e., to send a second request it is not necessary to restart the program

### 🏗️ HTTP Server

- [x] Support, at least, the following endpoints, when they are correctly called (correct verb, correct headers...):
  - [x] An endpoint that returns static content (e.g., a static HTML file)
  - [x] An endpoint that adds a new resource to the server according to the specified payload
  - [x] An endpoint that allows viewing a list of resources
  - [x] An endpoint that allows modifying a resource
  - [x] An endpoint that allows deleting a resource
- [x] Return the appropriate error codes if the endpoints are not invoked correctly
- [x] Attend to multiple requests concurrently
- [x] Offer minimal configuration that allows choosing on which port the server starts
- [x] It is not necessary for the resources to be persisted; they can be managed in memory

## 🚀 Optional features

- [x] 🔑 Authentication with API key
- [ ] 🔐 Authentication with login flow
- [ ] 📸 Sending and receiving multimedia files
- [DOING] ☢️ TLS
- [x] 📓 Logging
- [ ] 🧪 Automated Testing
- [x] ☁️ Deployment on a real server
- [ ] ⚙️ Refactor with HTTP framework
- [ ] 💾 Conditional GET with cache
- [ ] 🎨 GUI for the client
- [ ] 🍪 Cookies
- [DOING] 🎰 Advanced CRUD
- [ ] 🧠 Anything else (propose to professor)
