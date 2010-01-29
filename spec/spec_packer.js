require('../lib/packer');

function FauxObject() {}
FauxObject.prototype = { toString : function() { return 'abc'; } }

describe("Array.pack", function() {
  it("returns a String", function() {
    assert(typeof ["abc", "def"].pack("A*") == "string");
  });

  it("raises an ArgumentError with ('%')", function() {
    assertRaise('ArgumentError', function () {
      [].pack("%");
    });
  });

  it("raises an ArgumentError on empty array", function() {
    var arr = ['A', 'a', 'B', 'b', 'C', 'c', 'D', 'd',
               'E', 'e', 'F', 'f', 'G', 'g', 'H', 'h',
               'I', 'i', 'L', 'l', 'M', 'm', 'N', 'n',
               'Q', 'q', 'U', 'u','w', 'Z'];
    for (var i = 0; i < arr.length; i++) {
      assertRaise('ArgumentError', function() {
        [].pack(arr[i]);
      });
    }
  });

  it("sequentially processes each pack format, which consumes element in the array, and finally concatenates their result", function() {
    assertEqual('a\\001\\000\\002\\000A ', ["abc", 1, 2, '01000001', 0x20].pack('Av2B8c').escapeChars());
  });

  it("just ignores unknown format", function() {
    assertNotRaise(function() {
      [].pack("2");
      [].pack("J");
      [].pack("\xFF");
    });
    assertEqual('ad', ["abc", "def"].pack("A\x7EA"));
  });

  it("ignores white spaces", function() {
    assertEqual("a\\001\\000\\002\\000A a", ["abc", 1, 2, '01000001', 0x20, 0x61].pack("A  \f   v2\t\rB8\nc\vC").escapeChars());
  });

  it("treats a white space as a separator of formats", function() {
    assertEqual("ad", ["abc", "def"].pack("A 3A"));
  });

  it("skips everything till the end of line (LF) string with ('#')", function() {
    assertEqual("abc", ["abc", "def"].pack("A*#A10%"));
    assertEqual("abcdef       ", ["abc", "def"].pack("A*#junk junk junk junk junk\nA10"));
    //assertEqual("abc", ["abc", "def"].pack("A*#junk junk junk junk junk\rA10"));
  });

  it("reuses last array element as often as needed to complete the string", function() {
    var result = "httpready"
    for (var i = 0; i < 247; i++) {
      result += "\\000";
    }
    assertEqual(result, ['httpready', ''].pack('a16a240').escapeChars());
  });
});

describe("Array#pack with the empty format", function() {
  it("returns an empty string", function() {
    assertEqual('', [1, 2, 3, true].pack(""));
  });
});

function asciiPack(f) {
  this.format = f;
  function format(count) {
    if (count == undefined) count = '';
    return this.format + count;
  }

  it("returns a String", function() {
    assert(typeof ["abc"].pack(format()) == "string");
  });

  it("cuts string if its size greater than directive count", function() {
    assertEqual('abc', ['abcde'].pack(format(3)));
  });

  it("considers count = 1 if count omited", function() {
    assertEqual('a', ['abcde'].pack(format()));
  });

  it("returns empty string if count = 0 with", function() {
    assertEqual('', ['abcde'].pack(format(0)));
  });

  it("returns the whole argument string with star parameter", function() {
    assertEqual('abcdef', ['abcdef'].pack(format('*')));
  });

  it("comsumres only one array item per a format", function() {
    assertEqual('abc', ["abc", "def"].pack(format('*')));
    assertEqual('abcdef', ["abc", "def"].pack(format('*') + format('*')));
  });

  it("tries to convert the pack argument to a String using toString()", function() {
    assertEqual('a', [new FauxObject()].pack(format()));
  });

  it("raises a TypeError if array item is not String with ('A<count>')", function() {
    assertRaise('TypeError', function() { [123].pack(format(5)) });
    assertRaise('TypeError', function() { [[]].pack(format(5)) });
  });
};

describe("Array#pack with format 'A'", function() {
  asciiPack('A');

  it("returns space padded string", function() {
    assertEqual('abcde  ', ['abcde'].pack('A7'));
  });
});

describe("Array#pack with format 'a'", function() {
  asciiPack('a');

  it("returns null padded string with ('a<count>')", function() {
    assertEqual('abcde\\000\\000', ['abcde'].pack('a7').escapeChars());
  });
});

describe("Array#pack with format 'Z'", function() {
  asciiPack('a');

  it("returns null padded string with ('Z<count>')", function() {
    assertEqual('abcde\\000\\000', ['abcde'].pack('Z7').escapeChars());
  });
});

describe("Array#pack with format 'B'", function() {
  it("returns packed bit-string descending order", function() {
    assertEqual('abc', ["011000010110001001100011"].pack('B24'));
  });
});

describe("String.unpack", function() {
});


