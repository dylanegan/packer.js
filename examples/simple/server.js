var sys = require('sys');
var net = require('net');
require('../../lib/packer');
var server = net.createServer(function (stream) {
  stream.addListener("data", function (data) {
    sys.debug(sys.inspect(data));
  });
  stream.addListener("end", function () {
    stream.end();
  });
});
server.listen(7000, "localhost");
