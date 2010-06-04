require 'socket'

class ClientQuitError < RuntimeError; end

port = 7000
server = TCPServer.open('127.0.0.1', port)
directive = ARGV.first

loop do
  socket = server.accept

  Thread.start do
    s = socket

    port, name, addr = s.peeraddr[1..3]

    puts "#{Time.now} -> recieving from #{name}:#{port}"

    begin
      while line = s.gets
        puts "#{Time.now} -> #{line.inspect}"
        puts "#{Time.now} -> #{line.unpack(directive).inspect}"
      end
    ensure
      s.close
    end

    puts "#{Time.now} -> done with #{name}:#{port}"
  end

end
