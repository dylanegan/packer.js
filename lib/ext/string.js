String.prototype.interpret = function(value) {
  if ((typeof value !== "undefined" && value !== null)) {
    return String(value);
  } else {
    return '';
  }
};
String.prototype.gsub = function(pattern, replacement) {
  var match, result, source;
  source = this;
  result = '';
  if (!(pattern.length || pattern.source)) {
    replacement = replacement('');
    return replacement + source.split('').join(replacement) + replacement;
  }
  while (source.length > 0) {
    if ((match = source.match(pattern))) {
      result += source.slice(0, match.index);
      result += this.interpret(replacement(match));
      source = source.slice(match.index + match[0].length);
    } else {
      result += source;
      source = '';
    }
  }
  return result;
};
String.prototype.escapeChars = function() {
  var _a, _b, c, i, o;
  o = '';
  _a = 0; _b = this.length;
  for (i = _a; (_a <= _b ? i < _b : i > _b); (_a <= _b ? i += 1 : i -= 1)) {
    c = this.charAt(i);
    if (c >= ' ') {
      c === '\\' || '"' ? o += '\\' : null;
      o += c;
    } else {
      if (c === '\a') {
        o += '\\a';
      } else if (c === '\b') {
        o += '\\b';
      } else if (c === '\f') {
        o += '\\f';
      } else if (c === '\n') {
        o += '\\n';
      } else if (c === '\r') {
        o += '\\r';
      } else if (c === '\t') {
        o += '\\t';
      } else if (c === '\v') {
        o += '\\v';
      } else {
        c = c.charCodeAt();
        o += '\\0';
        if (c < 14) {
          o += '0' + c.toString();
        } else if (c < 16) {
          o += (c + 2).toString();
        } else if ((c < 24)) {
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
  return this.split('').reverse().join('');
};
String.prototype.scan = function(pattern, iterator) {
  return String(this.gsub(pattern, iterator));
};