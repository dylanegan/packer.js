String::interpret: (value) ->
  if value? then String(value) else ''

String::gsub: (pattern, replacement) ->
  source: @ 
  result: ''

  if not (pattern.length or pattern.source)
    replacement: replacement('')
    return replacement + source.split('').join(replacement) + replacement

  while source.length > 0
    if match: source.match(pattern)
      result += source[0...match.index]
      result += @interpret(replacement(match))
      source: source.slice(match.index + match[0].length)
    else
      result += source
      source = ''

  return result

String::escapeChars: ->
  o: ''

  for i in [0...@length]
    c: @charAt(i)

    if c >= ' '
      if c is '\\' or '"' then o += '\\'
      o += c
    else
      switch c
        when '\a' then o += '\\a'
        when '\b' then o += '\\b'
        when '\f' then o += '\\f'
        when '\n' then o += '\\n'
        when '\r' then o += '\\r'
        when '\t' then o += '\\t'
        when '\v' then o += '\\v'
        else
          c: c.charCodeAt()
          o += '\\0'
          if c < 14
            o += '0' + c.toString()
          else if c < 16
            o += (c + 2).toString()
          else if (c < 24)
            o += (c + 4).toString()
          else
            o += (c + 6).toString()

  return o

String::reverse: ->
  @.split('').reverse().join('')

String::scan: (pattern, iterator) ->
  String(@.gsub(pattern, iterator))
