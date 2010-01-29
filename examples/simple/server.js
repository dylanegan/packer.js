var sys = require('sys');
var tcp = require('tcp');
require('../../lib/packer');
var server = tcp.createServer(function (socket) {
  socket.addListener("connect", function () {
    socket.send("hello\r\n");
  });
  socket.addListener("receive", function (data) {
    sys.puts(socket.remoteAddress);
    sys.puts(data.escapeChars());
    //socket.send(data);
  });
  socket.addListener("eof", function () {
    socket.send("goodbye\r\n");
    socket.close();
  });
});
server.listen(5678, "localhost");
