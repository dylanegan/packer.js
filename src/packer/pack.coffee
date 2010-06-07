sys: require('sys')
Buffer: require('buffer').Buffer
Base64: require('libraries/base64')

ArgumentError: (message) ->
  @message: message
  @name: 'ArgumentError'

Array::pack: (schema) ->
  new Packer(@, schema).pack()

class Packer
  constructor: (source, schema) ->
    @source: source
    @schema: schema
    @index: 0
    @buffer: new Buffer(256)
    @buffer.used: 0

  pack: ->
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
          @base64(kind, t)
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
          @write_utf8(result.join(''))
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
      arr.push([match[1], match[2]])
    return arr

  write_utf8: (string, times) ->
    times: or 1
    for i in [0...times]
      @buffer.write(string, 'utf8', @buffer.used)
      @buffer.used += Buffer.byteLength(string, 'utf8')
    return true

  ascii_string: (kind, t) ->
    item: @fetch_item()

    throw new TypeError('not a string') if typeof item isnt "string"

    item: item.toString()
    size: @parse_tail(t, kind, item.length + (if kind is 'Z' then 1 else 0))
    padsize: size - item.length
    filler: if kind is "A" then " " else "\0"
    @write_utf8(item.split('')[0...size].join(''))
    @write_utf8(filler, padsize) if padsize > 0
    return true

  ber_compress: (kind, t) ->
    size: @parse_tail(t, kind)
    for i in [0...size]
      item: parseInt(@fetch_item())
      throw new ArgumentError("can't compress negative numbers") if item < 0

      chars: ''
      chars << (item & 0x7f)
      while (item: item >> 7) > 0
        chars << ((item & 0x7f) | 0x80)
      @write_utf8(chars.reverse())
    return true

  base64: (kind, t) ->
    size: @parse_tail(t, kind)
    @write_utf8(Base64.encode(@fetch_item().toString(), size))
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
        @write_utf8(String.fromCharCode(byte))
        byte: 0
    return true
  
  character: (kind, t) ->
    times: @parse_tail(t, kind)
    @write_utf8(String.fromCharCode(parseInt(@fetch_item()) & 0xff)) for i in [0...times]
    return true

  decimal: (kind, t) ->
    throw new ArgumentError('not yet implemented');

    size: @parse_tail(t, kind)

    want_double: switch(kind)
      when 'd', 'D', 'E', 'G'
        true
      when 'e', 'f', 'F', 'g'
        false

    little_endian: switch(kind)
      when 'g', 'G'
        false
      else
        true

    for i in [0...size]
      item: parseInt(@fetch_item())

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
    @write_utf8(result.join(''))
    return true

  integer: (kind, t) ->
    size: @parse_tail(t, kind)

    if t? and (t.search('_') isnt -1 or t.search('!') isnt -1)
      bytes: switch(kind)
        when 'l', 'L'
          2
        when 'i', 'I'
          4
        when 's', 'S'
          4
    else
      bytes: switch(kind)
        when 'i', 'I', 'l', 'L', 'V'
          4
        when 's', 'S', 'v'
          2

    unsigned: true if (kind.search(/I|S|L/) isnt -1)
    little_endian: true if kind is ('v' or 'V')

    throw new ArgumentError('too few array elements') if (@index + size > @source.length)

    for i in [0...size]
      item: parseInt(@fetch_item())

      throw new RangeError("too big to convert into 'unsigned long'") if (Math.abs(item) >= Number.MAX_NUMBER)

      result = []
      if little_endian? and little_endian
        if (item < 0) then item += Math.pow(2, (8 * bytes))
        for ii in [0...bytes]
          result.push(String.fromCharCode(item >> (ii * 8) & 0xff))
      else
        for ii in [0...bytes]
          result.push(String.fromCharCode(item & 0xff))
          item: item >> 8
        result: result.reverse()

      @write_utf8(result.join(''))
    return true

  integer64: (kind, t) ->
    size: @parse_tail(t, kind)

    throw new ArgumentError('too few array elements') if (@index + size) > @source.length

    for i in [0...size]
      item: parseInt(@fetch_item())

      throw new RangeError("too big to convert into 'unsigned long") if Math.abs(item) >= Math.pow(2, 64)

      @buffer[@buffer.used++]: (item & 0xFF00000000000000) >> 56
      @buffer[@buffer.used++]: (item & 0x00FF000000000000) >> 48
      @buffer[@buffer.used++]: (item & 0x0000FF0000000000) >> 40
      @buffer[@buffer.used++]: (item & 0x000000FF00000000) >> 32
      @buffer[@buffer.used++]: (item & 0x00000000FF000000) >> 24
      @buffer[@buffer.used++]: (item & 0x0000000000FF0000) >> 16
      @buffer[@buffer.used++]: (item & 0x000000000000FF00) >> 8
      @buffer[@buffer.used++]: (item & 0x00000000000000FF) >> 0 

    return true

  parse_tail: (t, kind, remaining) ->
    remaining: remaining || @source.length - @index
    tail: undefined
    if t? and (t.search('_') isnt -1 or t.search('!') isnt -1)
      throw new ArgumentError(t + ' allowed only after types sSiIlL') if kind.search('sSiIlL') is -1
      t: t.replace(/_|!/g, '')

    tail: switch (t)
      when undefined
        1
      when '*'
        remaining
      else
        m = t.match(/(\d+)/)
        if m then parseInt(m[0]) else 1
    return tail

  pointer: (kind, t) -> 
    size: @parse_tail(t, kind, (kind == 'p' ? @source.length - @index : 1))
    throw new ArgumentError('too few array elements') if (@index + size > @source.length && kind == 'p')

    for i in [0...size]
      item: @fetch_item()
      if item?
        for i in [0...8]
          @write_utf8('\x00')
    return true
 
  net_long: (t) ->
    size: @parse_tail(t, 'N')

    throw new ArgumentError('too few array elements') if (@index + size > @source.length)

    for i in [0...size]
      item: parseInt(@fetch_item())

      throw new RangeError('too big to be a network long') if (Math.abs(item) >= Number.MAX_NUMBER)

      @buffer[@buffer.used++]: (item & 0x00000000FF000000) >> 24
      @buffer[@buffer.used++]: (item & 0x0000000000FF0000) >> 16
      @buffer[@buffer.used++]: (item & 0x000000000000FF00) >> 8
      @buffer[@buffer.used++]: (item & 0x00000000000000FF) >> 0
    return true

  net_short: (t) -> 
    size: @parse_tail(t, 'n')

    throw new ArgumentError('too few array elements') if (@index + size > @source.length)

    for i in [0...size]
      item: parseInt(@fetch_item())

      throw new RangeError('too big to be a network short') if (Math.abs(item) >= Number.MAX_NUMBER)

      @buffer[@buffer.used++]: (item & 0xFF00) >> 8
      @buffer[@buffer.used++]: (item & 0x00FF) >> 0
    return true

  utf_string: (kind, t) -> 
    size: @parse_tail(t, kind)
    for i in [0...size]
      item: parseInt(@fetch_item())
      throw new RangeError('pack(U): value out of range') if item < 0
      bytes: 0
      match: null

      f: [Math.pow(2, 7), Math.pow(2, 11), Math.pow(2, 16), Math.pow(2, 21), Math.pow(2, 26), Math.pow(2, 31)].filter (n) ->
        if !match?
          bytes += 1
          match = n if item < n
        return true
      throw new RangeError('pack(U): value out of range') if !match?

      if bytes is 1
        @buffer[@buffer.used++]: item
      else
        i: bytes - 1
        buf: []
        while (i -= 1)
          buf.unshift(String.fromCharCode((item | 0x80) & 0xBF))
          item: item >> 6
        buf.unshift(String.fromCharCode((item | ((0x3F00 >> bytes)) & 0xFC)))

        @buffer.write_utf8(buf.join(''))
    return true
