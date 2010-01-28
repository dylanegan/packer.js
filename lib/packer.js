require('sys');

function ArgumentError(message) {
  this.message = message;
  this.name = 'ArgumentError';
}

Array.prototype.pack = function(schema) {
  packer = new Packer(this, schema);
  return packer.dispatch();
}

String.prototype.interpret = function(value) {
  return value == null ? '' : String(value);
}

String.prototype.gsub = function(pattern, replacement) {
  var result = '', source = this, match;
  //replacement = prepareReplacement(replacement);
  //if (Object.isString(pattern))
  //  pattern = RegExp.escape(pattern);
  if (!(pattern.length || pattern.source)) {
    replacement = replacement('');
    return replacement + source.split('').join(replacement) + replacement;
  }
  while (source.length > 0) {
    if (match = source.match(pattern)) {
      result += source.slice(0, match.index);
      result += this.interpret(replacement(match));
      source  = source.slice(match.index + match[0].length);
    } else {
      result += source, source = '';
    }
  }
  return result;
}

String.prototype.escapeChars = function () {
    var c, i, l = this.length, o = '';
    for (i = 0; i < l; i += 1) {
        c = this.charAt(i);
        if (c >= ' ') {
            if (c === '\\' || c === '"') {
                o += '\\';
            }
            o += c;
        } else {
            switch (c) {
            case '\a':
                o += '\\a';
                break;
            case '\b':
                o += '\\b';
                break;
            case '\f':
                o += '\\f';
                break;
            case '\n':
                o += '\\n';
                break;
            case '\r':
                o += '\\r';
                break;
            case '\t':
                o += '\\t';
                break;
            case '\v':
                o += '\\v';
                break;
            default:
                c = c.charCodeAt();
                o += '\\0'
                if (c < 14) {
                  o += '0' + c.toString();
                } else if (c < 16) {
                  o += (c + 2).toString();
                } else if (c < 24) {
                  o += (c + 4).toString();
                } else {
                  o += (c + 6).toString();
                }
            }
        }
    }
    return o;
};

String.prototype.reverse = function() {
  splitext = this.split("");
  revertext = splitext.reverse();
  reversed = revertext.join("");
  return reversed;
}

String.prototype.scan = function(pattern, iterator) {
  this.gsub(pattern, iterator);
  return String(this);
}

function Packer(arr, schema) {
  this.source = arr;
  this.schema = schema;
  this.index = 0;
  this.result = '';
  this.ptr = undefined;
}

Packer.prototype = {
  dispatch : function() {
    parsed = this.parse(this.schema);
    for (var i = 0, length = parsed.length; i < length; i++) {
      kind = parsed[i][0];
      t = parsed[i][1] || undefined;
      switch(kind) {
        case 'a': case 'A': case 'Z':
          this.ascii_string(kind, t);
          break;
        case 'b': case 'B':
          this.bit_string(kind, t);
          break;
        case 'c': case 'C':
          this.character(kind, t);
          break;
        case 'd': case 'D': case 'e': case 'E': case 'f': case 'F': case 'g': case 'G':
          this.decimal(kind, t);
          break;
        case 'h': case 'H':
          this.hex_string(kind, t);
          break;
        case 'i': case 'I': case 'l': case 'L': case 's': case 'S': case 'v': case 'V':
          this.integer(kind, t);
          break;
        case 'm':
          this.result += this.encode(kind, t, 'base64').join(''); // .replace(/(A{1,2})\n\Z/) { "#{'=' * $1.size}\n" } 
          break;
        case 'M':
          item = this.fetch_item().toString();
          line_length = 72;
          if (t != undefined && t.search(/^\d/) != -1 && parseInt(t) >= 3)
            line_length = parseInt(t);
          end
          items = item.scan(/.{1,#{line_length}}/m)
          result = [];
          for (var i = 0; i < items.length; i++) { 
            line = items[i];
            line.gsub(/[^ -<>-~\t\n]/, function(match) {
              result += "=%02X" % m[0] + "=\n"
            });
          }
          this.result = result.join('');
          break;
        case 'n':
          this.net_short(t);
          break;
        case 'N':
          this.net_long(t);
          break;
        case 'p': case 'P':
          this.pointer(kind, t);
          break;
        case 'q': case 'Q':
          this.integer64(kind, t);
          break;
        case 'u':
          this.result += this.encode(kind, t, 'uuencode').join(''); //.gsub(/ /, '`')
          break;
        case 'U':
          this.utf_string(kind, t);
          break;
        case 'w':
          this.ber_compress(kind, t);
          break;
        case '%':
          throw new ArgumentError(kind + " not implement");
          break;
      }
    }
    return this.result;
  },

  parse : function(schema) {
    schema = schema.gsub(/#.*/, '');
    var arr = [];
    schema.scan(/([^\s\d!_\*])([\d!_\*]*)/, function(match) {
      arr.push([match[1], match[2]]);
    });
    return arr;
  },

  ascii_string : function(kind, t) {
    var item = this.fetch_item().toString();
    var size = this.parse_tail(t, kind, item.length + (kind == 'Z' ? 1 : 0));
    var padsize = size - item.length;
    var filler = kind == "A" ? " " : "\0";
    this.result += item.split('').slice(0, size).join('');
    if (padsize > 0) { 
      for (var i = 0; i < padsize.length; i++) {
        this.result += filler; 
      }
    }
  },

  ber_compress : function(kind, t) {
    var size = this.parse_tail(t, kind),
        chars = "",
        item;
    for (var i = 0; i < size; i++) {
      chars = '';
      item = parseInt(this.fetch_item());
    }
  },

  bit_string : function(kind, t) {
    var item = this.fetch_item().toString(),
        byte = 0,
        lsb = (kind == 'b'),
        size = this.parse_tail(t, kind, item.length),
        items = item.split(''),
        bits = [],
        min, min_bits;

    for (var i = 0; i < items.length; i++) {
      bits += items[i][0] & 01;
    }

    min = Math.min(size, item.length);
    min_bits = bits.slice(0, min);
    for (var i = 0; i < min_bits.length; i++) {
      ii = i & 07;
      byte |= bits[i] << (lsb ? i : 07 - i);
      if (ii == 07) {
        this.result += String.fromCharCode(byte);
        byte = 0;
      }
    }
  },

  character : function(kind, t) {
    var times = this.parse_tail(t, kind);
    for (var i = 0; i < times; i++) {
      result = String.fromCharCode(parseInt(this.fetch_item()) & 0xff);
      this.result += result;
    }
  },

  decimal : function(kind, t) {
    var size = this.parse_tail(t, kind);
    var want_double = undefined;
    var little_endian = true;

    switch(kind) {
      case 'd': case 'D': case 'E': case 'G':
        want_double = true;
        break;
      case 'e': case 'f': case 'F': case 'g':
        want_double = false;
        break;
    }

    switch(kind) {
      /* case 'e': case 'E':
        var little_endian = true;
        break; */
      case 'g': case 'G':
        little_endian = false;
        break;
    }

    for (var i = 0; i < size; i++) {
      var item = this.fetch_item();
    }
  },

  encode : function(kind, t) {
    var item = this.fetch_item().toString(); 
  },

  fetch_item : function() {
    if (this.index >= this.source.length) throw new ArgumentError('too few array elements');

    var item = this.source[this.index];
    this.index += 1;
    return item;
  },

  hex_string : function(kind, t) {
    var item = this.fetch_item().toString();
    var size = this.parse_tail(t, kind, item.length);
    var str = [];
    item.slice(0, size).scan(/..?/, function (match) {
     str += match;
    });

    var numbers = [];

    if (kind == "h") {
      for (var i = 0; i < str.length; i++) {
        numbers.push(parseInt(str[i].reverse(), 16));
      }
    } else {
      for (var i = 0; i < str.length; i++) {
        numbers.push(parseInt(str[i], 16));
      }
    }

    if (kind == "H" && numbers.length != 0 && numbers[-1] < 16) {
      numbers[-1] *= 16;
    }

    var diff = size - item.length;

    if (diff > 0) {
      // we couldn't read as much data as was requested,
      // so we'll make up for that with a couple of zeroes.
      if ((item.length % 2) == 0)
        var left = parseInt((diff / 2.0 + 0.5))
      else
        var left = diff / 2
      end
 
      for (var i = 0; i < left; i++) {
        numbers + 0
      }
    }
  
    this.results += numbers.map(function(number) {
      String.fromCharCode(number);
    }).join('')
  },

  integer : function(kind, t) {
    var size = this.parse_tail(t, kind),
        bytes, unsigned, little_endian, result;

    if (t != undefined && (t.search('_') != -1 || t.search('!') != -1)) {
      switch(kind) {
        case 'l': case 'L':
          bytes = 2;
          break;
        case 'i': case 'I':
          bytes = 4;
          break;
        case 's': case 'S':
          bytes = 4;
          break;
      }
    } else {
      switch(kind) {
        case 'i': case 'I': case 'l': case 'L': case 'V':
          bytes = 4;
          break;
        case 's': case 'S': case 'v':
          bytes = 2;
          break;
      }
    }

    if (kind.search(/I|S|L/) != -1) unsigned = true;
    switch(kind) {
      case 'v': case 'V':
        little_endian = true;
        break;
      default:
        break;
    }

    if (this.index + size > this.source.length) throw new ArgumentError('too few array elements');

    for (var i = 0; i < size; i++) {
      var item = parseInt(this.fetch_item());

      if (Math.abs(item) >= Number.MAX_NUMBER) throw new RangeError("too big to convert into 'unsigned long'");

      result = [];
      if (little_endian != undefined && little_endian) {
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
      this.result += result.join('');
    }
  },

  integer64 : function(kind, t) {
    var size = this.parse_tail(t, kind);
    var bytes = 8;
    var little_endian = true;

    if (this.index + size > this.source.length) throw new ArgumentError('too few array elements');

    for (var i = 0; i < size; i++) {
      var item = parseInt(this.fetch_item());
      var max_wordsize = 64;

      if (Math.abs(item) >= Math.pow(2, 64)) throw new RangeError("too big to convert into 'unsigned long");

      throw new ArgumentError('not implemented');
    }
  },

  parse_tail : function(t, kind, remaining) {
    var remaining = remaining || this.source.length - this.index;
    var tail = undefined;
    if (t != undefined && (t.search('_') != -1 || t.search('!') != -1)) {
      if (kind.search('sSiIlL') == -1) {
        throw new ArgumentError(t + ' allowed only after types sSiIlL');
      }
      t = t.replace(/_|!/g, '');
    }

    switch (t) {
      case undefined:
        tail = 1;
        break;
      case '*':
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
    var size = this.parse_tail(t, kind, (kind == 'p' ? this.source.length - this.index : 1)),
        item;
    if (this.index + size > this.source.length && kind == 'p') throw new ArgumentError('too few array elements');

    for (var i = 0; i < size; i++) {
      item = this.fetch_item();
      if (item == undefined) {
        for (var ii = 0; ii < 8; ii++) {
          this.result += "\x00";
        }
      } else {
        item = item.toString();
        throw new ArgumentError("not implemented");
      }
    }
  },

  net_long : function(t) {
    var size = this.parse_tail(t, 'N'),
        item;

    if (this.index + size > this.source.length) throw new ArgumentError('too few array elements');

    for (var i = 0; i < size; i++) {
      item = parseInt(this.fetch_item());

      if (Math.abs(item) >= Number.MAX_NUMBER) throw new RangeError('too big to be a network long');

      throw new ArgumentError('not implemented');
    }
  },

  net_short : function(t) {
    var size = this.parse_tail(t, 'n'),
        item;

    if (this.index + size > this.source.length) throw new ArgumentError('too few array elements');

    for (var i = 0; i < size; i++) {
      item = parseInt(this.fetch_item());

      if (Math.abs(item) >= Number.MAX_NUMBER) throw new RangeError('too big to be a network short');

      throw new ArgumentError('not implemented');
    }
  },

  utf_string : function(kind, t) {
    var size = this.parse_tail(t, kind);
    for (var i = 0; i < size; i++) {
      var item = parseInt(this.fetch_item());
    }
  }
}
