require('../../lib/packer');

var tcp = require('tcp');
var conn = tcp.createConnection(5678);
conn.addListener("connect", function() {
  for (var i = 0; i < 100; i++) {
    conn.send([i].pack('c'));
  }
  conn.close();
});
