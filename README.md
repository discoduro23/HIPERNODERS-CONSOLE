# IMPORTANT INFO ABOUT THE CODE
This work can be seen in the repository of [DiscoDuro23/HIPERNODERS-CONSOLE](https://github.com/discoduro23/HIPERNODERS-CONSOLE). Node.js, specifically, v.18 was used.

Because some parts of client.js and server.js had to be modified for the client's graphical interface, we decided to make a deviation in the code and therefore we have two projects.
I will differentiate them like this:

1. The two codes implement:
	 - HTTP Client. 
	 - HTTP Server.
	 - Authentication with API key.
	 	+ Sent trough headers as 'x-api-key:hiperKEY_24'
	 - Logging.
	 	+ Saved in 'server.log'
	 - Deployment on a real server.
	 	+ Used ColdHosting services (CarlosLR bussisnes)
	 - Conditional Get with cache.
	 	+ Saved in 'resourcesCache.json' and only checked and modified by client.

2. Only the client per terminal (HIPERNODERS-CONSOLE REPO, THE ONE YOU ARE WATCHING)
	 - Sending and receiving multimedia files.
	 	+ Used postman to send the MIME images, but recived and sent ~flawlesly.
	 - TLS. 
	 	+ Execute 'node server-crypt.js' and 'node client-crypt.js'. Please, wait until the public key is generated by the server to send a request from the client.
	 - Automated testing.
	 	+ Trough this [link](https://github.com/discoduro23/HIPERNODERS-CONSOLE/actions) or in the repository 
	 - Refactor with HTTP framework.
	 	+ Start the client as always, but the server using 'node server-http.js'

3. ClientGUI only (HIPERNODERS_GUI REPO, YOU CAN FOUND IN [THIS LINK](https://github.com/discoduro23/HIPERNODERS-GUI)):
	 - Authentication with login flow.
	 	+ You need to connect to the server (the bottom button) before trying to send any request of registering. Very important.
	 - GUI for the client.
		+ Execute 'node server.js', 'node client.js' and 'npm start'. Then the GUI will appear. 

/!\ IMPORTANT /!\
The endpoints are '/'. '/resources', '/images'