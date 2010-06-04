require('../../lib/packer');

var net = require('net');
var stream = net.createConnection(7000);
stream.addListener("connect", function() {
  var pack = ["abc", 1, 2, '01000001', 0x20].pack('Av2B8c');
  stream.write(pack);
  stream.end();
});
