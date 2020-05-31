// var express = require('express');
// var request = require('request');
// var app = express();
 
// //  主页输出 "Hello World"
// app.get('/', function (req, res) {
//   console.log("主页 GET 请求 "+req.url);
//   req.pipe(request(req.url)).pipe(res);
// })

// //  POST 请求
// app.post('/', function (req, res) {
//   console.log("主页 POST 请求");
//   res.send('Hello POST');
// })
 
// var server = app.listen(3000, function () {
//   var host = server.address().address
//   var port = server.address().port
//   console.log("应用实例，访问地址为 http://%s:%s", host, port)
// })

const http = require('http')
const port = process.env.PORT || 3000
const net = require('net')
const url = require('url')
const auth = {
	"suna":"suna",
	"admin":"234592380",
	"test":"test",
}


const requestHandler = (req, res) => { // discard all request to proxy server except HTTP/1.1 CONNECT method
  res.writeHead(405, {'Content-Type': 'text/plain'})
  res.end('Method not allowed')
}

const server = http.createServer(requestHandler)
const listener = server.listen(port, (err) => {
  if (err) {
    return console.error(err)
  }
  const info = listener.address()
  console.log(`Server is listening on address ${info.address} port ${info.port}`)
})

server.on('connect', (req, clientSocket, head) => { // listen only for HTTP/1.1 CONNECT method
  console.log(clientSocket.remoteAddress, clientSocket.remotePort, req.method, req.url);
  // var isAuth = true;
  // if (!req.headers['proxy-authorization']) { // here you can add check for any username/password, I just check that this header must exist!
  //   isAuth = false;
  // }
  // try{
	//     var base64Str = req.headers['proxy-authorization'].split(" ")[1];
	// 	var [username,password] = new Buffer.from(base64Str, 'base64').toString().split(":");
	// 	console.log("username:"+username+" password:"+password);
	// 	if (auth[username]!=password) {isAuth = false;}
  // }catch(e)
  // {
	// isAuth = false;
  // }
  // if (!isAuth) 
  // {
  //   clientSocket.write([
  //     'HTTP/1.1 407 Proxy Authentication Required',
  //     'Proxy-Authenticate: Basic realm="proxy"',
  //     'Proxy-Connection: close',
  //   ].join('\r\n'))
  //   clientSocket.end('\r\n\r\n')  // empty body
  //   return;	
  // }

  const {port, hostname} = url.parse(`//${req.url}`, false, true) // extract destination host and port from CONNECT request

  if (hostname && port) {
    const serverErrorHandler = (err) => {
      console.error(err.message)
      if (clientSocket) {
        clientSocket.end(`HTTP/1.1 500 ${err.message}\r\n`)
      }
    }
    const serverEndHandler = () => {
      if (clientSocket) {
        clientSocket.end(`HTTP/1.1 500 External Server End\r\n`)
      }
    }
    const serverSocket = net.connect(port, hostname) // connect to destination host and port
    const clientErrorHandler = (err) => {
      console.error(err.message)
      if (serverSocket) {
        serverSocket.end()
      }
    }
    const clientEndHandler = () => {
      if (serverSocket) {
        serverSocket.end()
      }
    }
    clientSocket.on('error', clientErrorHandler)
    clientSocket.on('end', clientEndHandler)
    serverSocket.on('error', serverErrorHandler)
    serverSocket.on('end', serverEndHandler)
    serverSocket.on('connect', () => {
      clientSocket.write([
        'HTTP/1.1 200 Connection Established',
        'Proxy-agent: Node-VPN',
      ].join('\r\n'))
      clientSocket.write('\r\n\r\n') // empty body
      // "blindly" (for performance) pipe client socket and destination socket between each other
      serverSocket.pipe(clientSocket, {end: false})
      clientSocket.pipe(serverSocket, {end: false})
    })
  } else {
    clientSocket.end('HTTP/1.1 400 Bad Request\r\n')
    clientSocket.destroy()
  }
})


