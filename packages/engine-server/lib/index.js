const server = require('http').createServer()
const io = require('socket.io')(server)
require('events').defaultMaxListeners = 25
require('./cache')

const port = 4000

server.listen(port)

require('./routes')(io)
