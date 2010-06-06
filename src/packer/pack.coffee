sys: require('sys')
Buffer: require('buffer').Buffer

ArgumentError: (message) ->
  @message: message
  @name: 'ArgumentError'

Array::pack: (schema) ->
  new Packer(@, schema).dispatch()

class Packer
  constructor: (source, schema) ->
    @source: source
    @schema: schema
    @index: 0
    @buffer: new Buffer(256)
    @buffer.used: 0

  dispatch: ->
    parsed: @parse(@schema)
    for i in [0...parsed.length]
      kind: parsed[i][0]
      t: parsed[i][1] || undefined
      switch(kind)
        when 'a', 'A', 'Z'
          @ascii_string(kind, t)
        when 'b', 'B'
          @bit_string(kind, t)
        when 'c', 'C'
          @character(kind, t)
        when 'd', 'D', 'e', 'E', 'f', 'F', 'g', 'G'
          @decimal(kind, t)
        when 'h', 'H'
          @hex_string(kind, t)
        when 'i', 'I', 'l', 'L', 's', 'S', 'v', 'V'
          @integer(kind, t)
        when 'm'
          @encode(kind, t, 'base64') # .join(''); # .replace(/(A{1,2})\n\Z/) { "#{'=' * $1.size}\n" } 
        when 'M'
          item: @fetch_item().toString()
          line_length: 72
          if t? && t.search(/^\d/) isnt -1 && parseInt(t) >= 3 then line_length = parseInt(t)
          scan: new RegExp(".{1," + line_length + "}") # /m
          items: item.scan(scan)
          num: items.length
          result: while num -= 1
            items[num].gsub /[^ -<>-~\t\n]/, (match) ->
              "=%02X" % m[0] + "=\n"
          result = result.join('')
          @buffer.write(result, 'utf8', @buffer.used)
          @buffer.used += Buffer.byteLength(result, 'utf8')
        when 'n'
          @net_short(t)
        when 'N'
          @net_long(t)
        when 'p', 'P'
          @pointer(kind, t)
        when 'q', 'Q'
          @integer64(kind, t)
        when 'u'
          @encode(kind, t, 'uuencode'); # .join(''); # .gsub(/ /, '`')
        when 'U'
          @utf_string(kind, t)
        when 'w'
          @ber_compress(kind, t)
        when '%'
          throw new ArgumentError(kind + " not implement")
    return @buffer[0...@buffer.used]

  parse: (schema) ->
    schema: schema.replace(/#.*/, '')
    arr: []
    schema.scan /([^\s\d!_\*])([\d!_\*]*)/, (match) ->
      arr.push([match[1], match[2]]);
    return arr

  ascii_string: (kind, t) ->
    item: @fetch_item()
    if typeof item isnt "string" then throw new TypeError('not a string')
    item: item.toString()
    size: @parse_tail(t, kind, item.length + (if kind is 'Z' then 1 else 0))
    padsize: size - item.length
    filler: if kind is "A" then " " else "\0"
    item: item.split('')[0...size].join('')
    @buffer.write(item, 'utf8', @buffer.used)
    @buffer.used += Buffer.byteLength(item, 'utf8')
    if padsize > 0
      while padsize -= 1
        @buffer.write(filler, 'utf8', @buffer.used)
        @buffer.used++
    return true

  bit_string: (kind, t) ->
    item: @fetch_item().toString()
    byte: 0
    lsb: (kind is 'b')
    size: @parse_tail(t, kind, item.length)
    bits: item.split('').map (i) ->
        return i[0] & 01

    min: Math.min(size, item.length)
    min_bits: bits[0...min]
    for i in [0...min_bits.length]
      ii: i & 07
      byte: byte | bits[i] << (if lsb then ii else 07 - ii)
      if ii == 07
        s: String.fromCharCode(byte)
        @buffer.write(s, 'utf8', @buffer.used)
        @buffer.used += Buffer.byteLength(s, 'utf8')
        byte: 0
    return true

  character: (kind, t) ->
    times: @parse_tail(t, kind)
    for i in [0...times]
      s: String.fromCharCode(parseInt(@fetch_item()) & 0xff)
      @buffer.write(s, 'utf8', @buffer.used)
      @buffer.used += Buffer.byteLength(s, 'utf8')
    return true

  fetch_item: ->
    if @index >= @source.length then throw new ArgumentError('too few array elements')
    item: @source[@index]
    @index += 1
    return item

  hex_string: (kind, t) ->
    item: @fetch_item().toString()
    size: @parse_tail(t, kind, item.length)
    str: []
    item[0...size].scan /..?/, (match) ->
      str += match

    numbers: []

    for i in [0...str.length]
      if kind is "h"
        numbers.push(parseInt(str[i].reverse(), 16))
      else
        numbers.push(parseInt(str[i], 16))

    if kind is "H" and numbers.length isnt 0 and numbers[-1] < 16
      numbers[-1] *= 16

    diff: size - item.length

    if diff > 0
      left: if (item.length % 2) is 0
        parseInt((diff / 2.0 + 0.5))
      else
        diff / 2
 
      for i in [0...left]
        numbers + 0
  
    result: String.fromCharCode(number) for number in numbers
    result: result.join('')
    @buffer.write(result, 'utf8', @buffer.used)
    @buffer.used += Buffer.byteLength(result, 'utf8')
    return true

###
  integer : function(kind, t) {
    var size = @parse_tail(t, kind),
        bytes, unsigned, little_endian, result;

    if (t != undefined && (t.search('_') != -1 || t.search('!') != -1)) {
      switch(kind) {
        when 'l', 'L':
          bytes = 2;
          break;
        when 'i', 'I':
          bytes = 4;
          break;
        when 's', 'S':
          bytes = 4;
          break;
      }
    } else {
      switch(kind) {
        when 'i', 'I', 'l', 'L', 'V':
          bytes = 4;
          break;
        when 's', 'S', 'v':
          bytes = 2;
          break;
      }
    }

    if (kind.search(/I|S|L/) != -1) unsigned = true;
    switch(kind) {
      when 'v', 'V':
        little_endian = true;
        break;
      default:
        break;
    }

    if (@index + size > @source.length) throw new ArgumentError('too few array elements');

    for (var i = 0; i < size; i++) {
      var item = parseInt(@fetch_item());

      if (Math.abs(item) >= Number.MAX_NUMBER) throw new RangeError("too big to convert into 'unsigned long'");

      result = [];
      if (little_endian != null && little_endian) {
        if (item < 0) item += Math.pow(2, (8 * bytes));
        for (var ii = 0; ii < bytes; ii++) {
          result.push(String.fromCharCode(item >> (ii * 8) & 0xff));
        }
      } else {
        for (var ii = 0; ii < bytes; ii++) {
          result.push(String.fromCharCode(item & 0xff));
          item >>= 8;
        }
        result = result.reverse();
      }
      result = result.join('');
      @buffer.write(result, 'utf8', @buffer.used);
      @buffer.used += Buffer.byteLength(result);
    }
  },

  integer64 : function(kind, t) {
    var size = @parse_tail(t, kind);
    var bytes = 8;
    var little_endian = true;

    if (@index + size > @source.length) throw new ArgumentError('too few array elements');

    for (var i = 0; i < size; i++) {
      var item = parseInt(@fetch_item());
      var max_wordsize = 64;

      if (Math.abs(item) >= Math.pow(2, 64)) throw new RangeError("too big to convert into 'unsigned long");

      throw new ArgumentError('not implemented');
    }
  },

  parse_tail : function(t, kind, remaining) {
    var remaining = remaining || @source.length - @index;
    var tail = undefined;
    if (t != undefined && (t.search('_') != -1 || t.search('!') != -1)) {
      if (kind.search('sSiIlL') == -1) {
        throw new ArgumentError(t + ' allowed only after types sSiIlL');
      }
      t = t.replace(/_|!/g, '');
    }

    switch (t) {
      when undefined:
        tail = 1;
        break;
      when '*':
        tail = remaining;
        break;
      default:
        var m = t.match(/(\d+)/);
        tail = m ? parseInt(m[0]) : 1;
        break;
    }
    return tail;
  },

  pointer : function(kind, t) {
    var size = @parse_tail(t, kind, (kind == 'p' ? @source.length - @index : 1)),
        item;
    if (@index + size > @source.length && kind == 'p') throw new ArgumentError('too few array elements');

    for (var i = 0; i < size; i++) {
      item = @fetch_item();
      if (item == undefined) {
        for (var ii = 0; ii < 8; ii++) {
          @buffer.write("\x00", 'utf8', @buffer.used);
          @buffer.used += Buffer.byteLength('\x00', 'utf8');
        }
      } else {
        item = item.toString();
        throw new ArgumentError("not implemented");
      }
    }
  },

  net_long : function(t) {
    var size = @parse_tail(t, 'N'),
        item;

    if (@index + size > @source.length) throw new ArgumentError('too few array elements');

    for (var i = 0; i < size; i++) {
      item = parseInt(@fetch_item());

      if (Math.abs(item) >= Number.MAX_NUMBER) throw new RangeError('too big to be a network long');

      @buffer[@buffer.used++] = (item & 0x00000000FF000000) >> 24;
      @buffer[@buffer.used++] = (item & 0x0000000000FF0000) >> 16;
      @buffer[@buffer.used++] = (item & 0x000000000000FF00) >> 8;
      @buffer[@buffer.used++] = (item & 0x00000000000000FF) >> 0;
    }
  },

  net_short : function(t) {
    var size = @parse_tail(t, 'n'),
        item;

    if (@index + size > @source.length) throw new ArgumentError('too few array elements');

    for (var i = 0; i < size; i++) {
      item = parseInt(@fetch_item());

      if (Math.abs(item) >= Number.MAX_NUMBER) throw new RangeError('too big to be a network short');

      @buffer[@buffer.used++] = (item & 0xFF00) >> 8;
      @buffer[@buffer.used++] = (item & 0x00FF) >> 0;
    }
  },

  utf_string : function(kind, t) {
    var size = @parse_tail(t, kind);
    for (var i = 0; i < size; i++) {
      var item = parseInt(@fetch_item());
    }
  }
}

  ber_compress: (kind, t) ->
    size: @parse_tail(t, kind)
    chars: = ""
    for (var i = 0; i < size; i++) {
      chars = '';
      item: parseInt(@fetch_item());
    }
  },

  decimal: (kind, t) ->
    size: @parse_tail(t, kind)
    want_double: undefined
    little_endian: true

    switch(kind)
      when 'd', 'D', 'E', 'G'
        want_double = true;
      when 'e', 'f', 'F', 'g'
        want_double = false;

    switch(kind)
      # when 'e', 'E'
      #   var little_endian = true
      when 'g', 'G'
        little_endian = false

    for i in [0...size]
      item: @fetch_item()


encode : function(kind, t) {
    var item = @fetch_item().toString(); 
  },

 
###
