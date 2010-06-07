var ArgumentError, Base64, Buffer, Packer, sys;
sys = require('sys');
Buffer = require('buffer').Buffer;
Base64 = require('libraries/base64');
ArgumentError = function(message) {
  this.message = message;
  this.name = 'ArgumentError';
  return this.name;
};
Array.prototype.pack = function(schema) {
  return new Packer(this, schema).pack();
};
Packer = function(source, schema) {
  this.source = source;
  this.schema = schema;
  this.index = 0;
  this.buffer = new Buffer(256);
  this.buffer.used = 0;
  return this;
};
Packer.prototype.pack = function() {
  var _a, _b, i, parsed;
  parsed = this.parse(this.schema);
  _a = 0; _b = parsed.length;
  for (i = _a; (_a <= _b ? i < _b : i > _b); (_a <= _b ? i += 1 : i -= 1)) {
    (function() {
      var _c, _d, item, items, kind, line_length, num, result, scan, t;
      kind = parsed[i][0];
      t = parsed[i][1] || undefined;
      if ((_c = (kind)) === 'a' || _c === 'A' || _c === 'Z') {
        return this.ascii_string(kind, t);
      } else if (_c === 'b' || _c === 'B') {
        return this.bit_string(kind, t);
      } else if (_c === 'c' || _c === 'C') {
        return this.character(kind, t);
      } else if (_c === 'd' || _c === 'D' || _c === 'e' || _c === 'E' || _c === 'f' || _c === 'F' || _c === 'g' || _c === 'G') {
        return this.decimal(kind, t);
      } else if (_c === 'h' || _c === 'H') {
        return this.hex_string(kind, t);
      } else if (_c === 'i' || _c === 'I' || _c === 'l' || _c === 'L' || _c === 's' || _c === 'S' || _c === 'v' || _c === 'V') {
        return this.integer(kind, t);
      } else if (_c === 'm') {
        return this.base64(kind, t);
      } else if (_c === 'M') {
        item = this.fetch_item().toString();
        line_length = 72;
        (typeof t !== "undefined" && t !== null) && t.search(/^\d/) !== -1 && parseInt(t) >= 3 ? (line_length = parseInt(t)) : null;
        scan = new RegExp(".{1," + line_length + "}");
        // /m
        items = item.scan(scan);
        num = items.length;
        result = (function() {
          _d = [];
          while (num -= 1) {
            _d.push(items[num].gsub(/[^ -<>-~\t\n]/, function(match) {
              return "=%02X" % m[0] + "=\n";
            }));
          }
          return _d;
        })();
        return this.write_utf8(result.join(''));
      } else if (_c === 'n') {
        return this.net_short(t);
      } else if (_c === 'N') {
        return this.net_long(t);
      } else if (_c === 'p' || _c === 'P') {
        return this.pointer(kind, t);
      } else if (_c === 'q' || _c === 'Q') {
        return this.integer64(kind, t);
      } else if (_c === 'u') {
        return this.encode(kind, t, 'uuencode');
        // .join(''); # .gsub(/ /, '`')
      } else if (_c === 'U') {
        return this.utf_string(kind, t);
      } else if (_c === 'w') {
        return this.ber_compress(kind, t);
      } else if (_c === '%') {
        throw new ArgumentError(kind + " not implement");
      }
    }).call(this);
  }
  return this.buffer.slice(0, this.buffer.used);
};
Packer.prototype.parse = function(schema) {
  var arr;
  schema = schema.replace(/#.*/, '');
  arr = [];
  schema.scan(/([^\s\d!_\*])([\d!_\*]*)/, function(match) {
    return arr.push([match[1], match[2]]);
  });
  return arr;
};
Packer.prototype.write_utf8 = function(string, times) {
  var _a, _b, i;
  times = times || 1;
  _a = 0; _b = times;
  for (i = _a; (_a <= _b ? i < _b : i > _b); (_a <= _b ? i += 1 : i -= 1)) {
    this.buffer.write(string, 'utf8', this.buffer.used);
    this.buffer.used += Buffer.byteLength(string, 'utf8');
  }
  return true;
};
Packer.prototype.ascii_string = function(kind, t) {
  var filler, item, padsize, size;
  item = this.fetch_item();
  if (typeof item !== "string") {
    throw new TypeError('not a string');
  }
  item = item.toString();
  size = this.parse_tail(t, kind, item.length + (kind === 'Z' ? 1 : 0));
  padsize = size - item.length;
  filler = kind === "A" ? " " : "\0";
  this.write_utf8(item.split('').slice(0, size).join(''));
  if (padsize > 0) {
    this.write_utf8(filler, padsize);
  }
  return true;
};
Packer.prototype.ber_compress = function(kind, t) {
  var _a, _b, chars, i, item, size;
  size = this.parse_tail(t, kind);
  _a = 0; _b = size;
  for (i = _a; (_a <= _b ? i < _b : i > _b); (_a <= _b ? i += 1 : i -= 1)) {
    item = parseInt(this.fetch_item());
    if (item < 0) {
      throw new ArgumentError("can't compress negative numbers");
    }
    chars = '';
    chars << (item & 0x7f);
    while ((item = item >> 7) > 0) {
      chars << ((item & 0x7f) | 0x80);
    }
    this.write_utf8(chars.reverse());
  }
  return true;
};
Packer.prototype.base64 = function(kind, t) {
  var size;
  size = this.parse_tail(t, kind);
  this.write_utf8(Base64.encode(this.fetch_item().toString(), size));
  return true;
};
Packer.prototype.bit_string = function(kind, t) {
  var _a, _b, bits, byte, i, ii, item, lsb, min, min_bits, size;
  item = this.fetch_item().toString();
  byte = 0;
  lsb = (kind === 'b');
  size = this.parse_tail(t, kind, item.length);
  bits = item.split('').map(function(i) {
    return i[0] & 01;
  });
  min = Math.min(size, item.length);
  min_bits = bits.slice(0, min);
  _a = 0; _b = min_bits.length;
  for (i = _a; (_a <= _b ? i < _b : i > _b); (_a <= _b ? i += 1 : i -= 1)) {
    ii = i & 07;
    byte = byte | bits[i] << (lsb ? ii : 07 - ii);
    if (ii === 07) {
      this.write_utf8(String.fromCharCode(byte));
      byte = 0;
    }
  }
  return true;
};
Packer.prototype.character = function(kind, t) {
  var _a, _b, i, times;
  times = this.parse_tail(t, kind);
  _a = 0; _b = times;
  for (i = _a; (_a <= _b ? i < _b : i > _b); (_a <= _b ? i += 1 : i -= 1)) {
    this.write_utf8(String.fromCharCode(parseInt(this.fetch_item()) & 0xff));
  }
  return true;
};
Packer.prototype.decimal = function(kind, t) {
  var _a, _b, _c, _d, i, item, little_endian, size, want_double;
  throw new ArgumentError('not yet implemented');
  size = this.parse_tail(t, kind);
  want_double = (function() {
    if ((_a = (kind)) === 'd' || _a === 'D' || _a === 'E' || _a === 'G') {
      return true;
    } else if (_a === 'e' || _a === 'f' || _a === 'F' || _a === 'g') {
      return false;
    }
  })();
  little_endian = (function() {
    if ((_b = (kind)) === 'g' || _b === 'G') {
      return false;
    } else {
      return true;
    }
  })();
  _c = 0; _d = size;
  for (i = _c; (_c <= _d ? i < _d : i > _d); (_c <= _d ? i += 1 : i -= 1)) {
    item = parseInt(this.fetch_item());
  }
  return true;
};
Packer.prototype.fetch_item = function() {
  var item;
  if (this.index >= this.source.length) {
    throw new ArgumentError('too few array elements');
  }
  item = this.source[this.index];
  this.index += 1;
  return item;
};
Packer.prototype.hex_string = function(kind, t) {
  var _a, _b, _c, _d, _e, _f, _g, _h, diff, i, item, left, number, numbers, result, size, str;
  item = this.fetch_item().toString();
  size = this.parse_tail(t, kind, item.length);
  str = [];
  item.slice(0, size).scan(/..?/, function(match) {
    return str += match;
  });
  numbers = [];
  _a = 0; _b = str.length;
  for (i = _a; (_a <= _b ? i < _b : i > _b); (_a <= _b ? i += 1 : i -= 1)) {
    kind === "h" ? numbers.push(parseInt(str[i].reverse(), 16)) : numbers.push(parseInt(str[i], 16));
  }
  kind === "H" && numbers.length !== 0 && numbers[-1] < 16 ? numbers[-1] *= 16 : null;
  diff = size - item.length;
  if (diff > 0) {
    left = (item.length % 2) === 0 ? parseInt((diff / 2.0 + 0.5)) : diff / 2;
    _c = 0; _d = left;
    for (i = _c; (_c <= _d ? i < _d : i > _d); (_c <= _d ? i += 1 : i -= 1)) {
      numbers + 0;
    }
  }
  result = (function() {
    _e = []; _g = numbers;
    for (_f = 0, _h = _g.length; _f < _h; _f++) {
      number = _g[_f];
      _e.push(String.fromCharCode(number));
    }
    return _e;
  })();
  this.write_utf8(result.join(''));
  return true;
};
Packer.prototype.integer = function(kind, t) {
  var _a, _b, _c, _d, _e, _f, _g, _h, bytes, i, ii, item, little_endian, result, size, unsigned;
  size = this.parse_tail(t, kind);
  (typeof t !== "undefined" && t !== null) && (t.search('_') !== -1 || t.search('!') !== -1) ? (bytes = (function() {
    if ((_a = (kind)) === 'l' || _a === 'L') {
      return 2;
    } else if (_a === 'i' || _a === 'I') {
      return 4;
    } else if (_a === 's' || _a === 'S') {
      return 4;
    }
  })()) : (bytes = (function() {
    if ((_b = (kind)) === 'i' || _b === 'I' || _b === 'l' || _b === 'L' || _b === 'V') {
      return 4;
    } else if (_b === 's' || _b === 'S' || _b === 'v') {
      return 2;
    }
  })());
  if ((kind.search(/I|S|L/) !== -1)) {
    unsigned = true;
  }
  if (kind === ('v' || 'V')) {
    little_endian = true;
  }
  if ((this.index + size > this.source.length)) {
    throw new ArgumentError('too few array elements');
  }
  _c = 0; _d = size;
  for (i = _c; (_c <= _d ? i < _d : i > _d); (_c <= _d ? i += 1 : i -= 1)) {
    item = parseInt(this.fetch_item());
    if ((Math.abs(item) >= Number.MAX_NUMBER)) {
      throw new RangeError("too big to convert into 'unsigned long'");
    }
    result = [];
    if ((typeof little_endian !== "undefined" && little_endian !== null) && little_endian) {
      (item < 0) ? item += Math.pow(2, (8 * bytes)) : null;
      _e = 0; _f = bytes;
      for (ii = _e; (_e <= _f ? ii < _f : ii > _f); (_e <= _f ? ii += 1 : ii -= 1)) {
        result.push(String.fromCharCode(item >> (ii * 8) & 0xff));
      }
    } else {
      _g = 0; _h = bytes;
      for (ii = _g; (_g <= _h ? ii < _h : ii > _h); (_g <= _h ? ii += 1 : ii -= 1)) {
        result.push(String.fromCharCode(item & 0xff));
        item = item >> 8;
      }
      result = result.reverse();
    }
    this.write_utf8(result.join(''));
  }
  return true;
};
Packer.prototype.integer64 = function(kind, t) {
  var _a, _b, i, item, size;
  size = this.parse_tail(t, kind);
  if ((this.index + size) > this.source.length) {
    throw new ArgumentError('too few array elements');
  }
  _a = 0; _b = size;
  for (i = _a; (_a <= _b ? i < _b : i > _b); (_a <= _b ? i += 1 : i -= 1)) {
    item = parseInt(this.fetch_item());
    if (Math.abs(item) >= Math.pow(2, 64)) {
      throw new RangeError("too big to convert into 'unsigned long");
    }
    this.buffer[this.buffer.used++] = (item & 0xFF00000000000000) >> 56;
    this.buffer[this.buffer.used++] = (item & 0x00FF000000000000) >> 48;
    this.buffer[this.buffer.used++] = (item & 0x0000FF0000000000) >> 40;
    this.buffer[this.buffer.used++] = (item & 0x000000FF00000000) >> 32;
    this.buffer[this.buffer.used++] = (item & 0x00000000FF000000) >> 24;
    this.buffer[this.buffer.used++] = (item & 0x0000000000FF0000) >> 16;
    this.buffer[this.buffer.used++] = (item & 0x000000000000FF00) >> 8;
    this.buffer[this.buffer.used++] = (item & 0x00000000000000FF) >> 0;
  }
  return true;
};
Packer.prototype.parse_tail = function(t, kind, remaining) {
  var _a, m, tail;
  remaining = remaining || this.source.length - this.index;
  tail = undefined;
  if ((typeof t !== "undefined" && t !== null) && (t.search('_') !== -1 || t.search('!') !== -1)) {
    if (kind.search('sSiIlL') === -1) {
      throw new ArgumentError(t + ' allowed only after types sSiIlL');
    }
    t = t.replace(/_|!/g, '');
  }
  tail = (function() {
    if ((_a = (t)) === undefined) {
      return 1;
    } else if (_a === '*') {
      return remaining;
    } else {
      m = t.match(/(\d+)/);
      if (m) {
        return parseInt(m[0]);
      } else {
        return 1;
      }
    }
  })();
  return tail;
};
Packer.prototype.pointer = function(kind, t) {
  var _a, _b, _c, _d, i, item, size;
  size = this.parse_tail(t, kind, (kind === (typeof 'p' !== "undefined" && 'p' !== null) ? 'p' : this.source.length - (this.index = 1)));
  if ((this.index + size > this.source.length && kind === 'p')) {
    throw new ArgumentError('too few array elements');
  }
  _a = 0; _b = size;
  for (i = _a; (_a <= _b ? i < _b : i > _b); (_a <= _b ? i += 1 : i -= 1)) {
    item = this.fetch_item();
    if ((typeof item !== "undefined" && item !== null)) {
      _c = 0; _d = 8;
      for (i = _c; (_c <= _d ? i < _d : i > _d); (_c <= _d ? i += 1 : i -= 1)) {
        this.write_utf8('\x00');
      }
    }
  }
  return true;
};
Packer.prototype.net_long = function(t) {
  var _a, _b, i, item, size;
  size = this.parse_tail(t, 'N');
  if ((this.index + size > this.source.length)) {
    throw new ArgumentError('too few array elements');
  }
  _a = 0; _b = size;
  for (i = _a; (_a <= _b ? i < _b : i > _b); (_a <= _b ? i += 1 : i -= 1)) {
    item = parseInt(this.fetch_item());
    if ((Math.abs(item) >= Number.MAX_NUMBER)) {
      throw new RangeError('too big to be a network long');
    }
    this.buffer[this.buffer.used++] = (item & 0x00000000FF000000) >> 24;
    this.buffer[this.buffer.used++] = (item & 0x0000000000FF0000) >> 16;
    this.buffer[this.buffer.used++] = (item & 0x000000000000FF00) >> 8;
    this.buffer[this.buffer.used++] = (item & 0x00000000000000FF) >> 0;
  }
  return true;
};
Packer.prototype.net_short = function(t) {
  var _a, _b, i, item, size;
  size = this.parse_tail(t, 'n');
  if ((this.index + size > this.source.length)) {
    throw new ArgumentError('too few array elements');
  }
  _a = 0; _b = size;
  for (i = _a; (_a <= _b ? i < _b : i > _b); (_a <= _b ? i += 1 : i -= 1)) {
    item = parseInt(this.fetch_item());
    if ((Math.abs(item) >= Number.MAX_NUMBER)) {
      throw new RangeError('too big to be a network short');
    }
    this.buffer[this.buffer.used++] = (item & 0xFF00) >> 8;
    this.buffer[this.buffer.used++] = (item & 0x00FF) >> 0;
  }
  return true;
};
Packer.prototype.utf_string = function(kind, t) {
  var _a, _b, i, size;
  size = this.parse_tail(t, kind);
  _a = 0; _b = size;
  for (i = _a; (_a <= _b ? i < _b : i > _b); (_a <= _b ? i += 1 : i -= 1)) {
    (function() {
      var buf, bytes, f, item, match;
      item = parseInt(this.fetch_item());
      if (item < 0) {
        throw new RangeError('pack(U): value out of range');
      }
      bytes = 0;
      match = null;
      f = [Math.pow(2, 7), Math.pow(2, 11), Math.pow(2, 16), Math.pow(2, 21), Math.pow(2, 26), Math.pow(2, 31)].filter(function(n) {
        if (!(typeof match !== "undefined" && match !== null)) {
          bytes += 1;
          if (item < n) {
            match = n;
          }
        }
        return true;
      });
      if (!(typeof match !== "undefined" && match !== null)) {
        throw new RangeError('pack(U): value out of range');
      }
      if (bytes === 1) {
        return this.buffer[this.buffer.used++] = item;
      } else {
        i = bytes;
        buf = [];
        while (i -= 1) {
          buf.unshift(String.fromCharCode((item | 0x80) & 0xBF));
          item = item >> 6;
        }
        buf.unshift(String.fromCharCode(item | ((0x3F00 >> bytes)) & 0xFC));
        return this.write_utf8(buf.join(''));
      }
    }).call(this);
  }
  return true;
};
