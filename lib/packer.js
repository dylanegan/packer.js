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
  this.schema = new String(schema);
  this.index = 0;
  this.result = new String;
  this.ptr = undefined;
}

Packer.prototype = {
  dispatch : function() {
    parsed = this.parse(this.schema);
    for (var i = 0; i < parsed.length; i++) {
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
          this.result += this.encode(kind, t, 'base64').join // .replace(/(A{1,2})\n\Z/) { "#{'=' * $1.size}\n" } 
        case '%':
          throw new ArgumentError(kind + " not implement");
          break;
      }
    }
    return new String(this.result);
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

  bit_string : function(kind, t) {
    var item = this.fetch_item().toString();
  },

  character : function(kind, t) {
    var times = this.parse_tail(t, kind);
    for (var i = 0; i < times; i++) {
      this.result += parseInt(this.fetch_item()) & 0xff;
    }
  },

  decimal : function(kind, t) {
    var size = this.parse_tail(t, kind);

    switch(kind) {
      case 'd': case 'D': case 'E': case 'G':
        var want_double = true;
        break;
      case 'e': case 'f': case 'F': case 'g':
        var want_double = false;
        break;
    }

    switch(kind) {
      case 'e': case 'E':
        var little_endian = true;
        break;
      case 'g': case 'G':
        var little_endian = false;
        break;
      default:
        var little_endian = true;
        break;
    }

    for (var i = 0; i < size; i++) {
      var item = this.fetch_item();
    }
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
    var str = item.slice(0, size).scan(/..?/);
    var numbers = [];

    if (kind == "h") {
      for (var i = 0; i < str.length; i++) {
        numbers + parseInt(str[i].reverse(), 16);
      }
    } else {
      for (var i = 0; i < str.length; i++) {
      }
    }
  },

  integer : function(kind, t) {
    var size = this.parse_tail(t, kind);
    if (t != undefined && (t.search('_') != -1 || t.search('!') != -1)) {
      switch(kind) {
        case 'l': case 'L':
          var bytes = short;
          break;
      }
    }
  },

  parse_tail : function(t, kind, remaining) {
    var remaining = remaining || this.source.length - this.index;
    if (t != undefined && (t.search('_') != -1 || t.search('!') != -1)) {
      if (kind.search('sSiIlL') == -1) {
        throw new ArgumentError(t + ' allowed only after types sSiIlL');
      }
      t = t.replace(/_|!/g, '');
    }

    switch (t) {
      case undefined:
        var tail = 1;
        break;
      case '*':
        var tail = remaining;
        break;
      default:
        m = t.match(/(\d+)/);
        var tail = m ? parseInt(m[0]) : 1;
        break;
    }
    return tail;
  }
}
