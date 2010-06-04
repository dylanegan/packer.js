require('../lib/packer');
var Buffer = require('buffer').Buffer;

function FauxObject() {}
FauxObject.prototype = { 
  toString : function() {
    return 'abc';
  }
}

describe("Array.pack", function() {
  it("returns a Buffer", function() {
    assert(["abc", "def"].pack("A*") instanceof Buffer);
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
    assertEqual('a\\001\\000\\002\\000A ', ["abc", 1, 2, '01000001', 0x20].pack('Av2B8c').toString().escapeChars());
  });

  it("just ignores unknown format", function() {
    assertNotRaise(function() {
      [].pack("2");
      [].pack("J");
      [].pack("\xFF");
    });
    //assertEqual('ad', ["abc", "def"].pack("A\x7EA"));
  });

  it("ignores white spaces", function() {
    assertEqual("a\\001\\000\\002\\000A a", ["abc", 1, 2, '01000001', 0x20, 0x61].pack("A  \f   v2\t\rB8\nc\vC").toString().escapeChars());
  });

  it("treats a white space as a separator of formats", function() {
    assertEqual("ad", ["abc", "def"].pack("A 3A").toString().escapeChars());
  });

  it("skips everything till the end of line (LF) string with ('#')", function() {
    assertEqual("abc", ["abc", "def"].pack("A*#A10%").toString().escapeChars());
    assertEqual("abcdef       ", ["abc", "def"].pack("A*#junk junk junk junk junk\nA10").toString().escapeChars());
    //assertEqual("abc", ["abc", "def"].pack("A*#junk junk junk junk junk\rA10"));
  });

  it("reuses last array element as often as needed to complete the string", function() {
    var result = "httpready"
    for (var i = 0; i < 247; i++) {
      result += "\\000";
    }
    assertEqual(result, ['httpready', ''].pack('a16a240').toString().escapeChars());
  });
});

describe("Array#pack with the empty format", function() {
  it("returns an empty string", function() {
    assertEqual('', [1, 2, 3, true].pack("").toString().escapeChars());
  });
});

function asciiPack(f) {
  this.format = f;
  function format(count) {
    if (count == undefined) count = '';
    return this.format + count;
  }

  it("returns a Buffer", function() {
    assert(["abc"].pack(format()) instanceof Buffer);
  });

  it("cuts string if its size greater than directive count", function() {
    assertEqual('abc', ['abcde'].pack(format(3)).toString());
  });

  it("considers count = 1 if count omited", function() {
    assertEqual('a', ['abcde'].pack(format()).toString());
  });

  it("returns empty string if count = 0 with", function() {
    assertEqual('', ['abcde'].pack(format(0)).toString());
  });

  it("returns the whole argument string with star parameter", function() {
    assertEqual('abcdef', ['abcdef'].pack(format('*')).toString());
  });

  it("comsumres only one array item per a format", function() {
    assertEqual('abc', ["abc", "def"].pack(format('*')).toString());
    assertEqual('abcdef', ["abc", "def"].pack(format('*') + format('*')).toString());
  });

  // Not possible in JS as everything responds to toString();
  //it("tries to convert the pack argument to a String using toString()", function() {
  //  assertEqual('a', [new FauxObject()].pack(format()).toString());
  //});

  it("raises a TypeError if array item is not String with ('A<count>')", function() {
    assertRaise('TypeError', function() { [123].pack(format(5)) });
    assertRaise('TypeError', function() { [[]].pack(format(5)) });
  });
};

describe("Array#pack with format 'A'", function() {
  asciiPack('A');

  it("returns space padded string", function() {
    assertEqual('abcde  ', ['abcde'].pack('A7').toString().escapeChars());
  });
});

describe("Array#pack with format 'a'", function() {
  asciiPack('a');

  it("returns null padded string with ('a<count>')", function() {
    assertEqual('abcde\\000\\000', ['abcde'].pack('a7').toString().escapeChars());
  });
});

describe("Array#pack with format 'Z'", function() {
  asciiPack('a');

  it("returns null padded string with ('Z<count>')", function() {
    assertEqual('abcde\\000\\000', ['abcde'].pack('Z7').toString().escapeChars());
  });
});

describe("Array#pack with format 'B'", function() {
  it("returns packed bit-string descending order", function() {
    assertEqual('abc', ["011000010110001001100011"].pack('B24').toString().escapeChars());
  });
});

function integerNotPlatformDependent(f) {
  this.format = f;
  function format(count) {
    if (count == undefined) count = '';
    return this.format + count;
  }
  
  describe("Array#pack with integer format which can not have platform dependent width", function() {
    it("raises ArgumentError when tails suffix '_'", function() {
      assertRaise('ArgumentError', function() { 
        [1].pack(format() + "_");
      });
    });

    it("raises ArgumentError when tails suffix '!'", function() {
      assertRaise('ArgumentError', function() {
        [1].pack(format() + "!");
      });
    });
  });
};

function integerPackEight(f) {
  this.format = f;
  function format(count) {
    if (count == undefined) count = '';
    return this.format + count;
  }
    
  describe("Array#pack with integer format (8bit)", function() {
    it("returns a string with byte of appropriate number", function() {
      assertEqual('1', [49].pack(format()).toString());
    });

    it("regards negative values as 2's complement in order to converts it to positive", function() {
      assertEqual('\xFF', [-1].pack(format()).toString().escapeChars());
      assertEqual('\x80', [-(Math.pow(2, 7))].pack(format()).toString().escapeChars());
    });

    it("reduces value to fit in byte", function() {
      assertEqual('\u00FF', [Math.pow(2, 8)-1].pack(format()).toString());
      assertEqual('\u0000', [Math.pow(2, 8)  ].pack(format()).toString());
      assertEqual('\u0001', [Math.pow(2, 8)+1].pack(format()).toString());

      assertEqual('\u0001', [Math.pow(2, 8)+1].pack(format()).toString());
      assertEqual('\u0000', [Math.pow(2, 8)  ].pack(format()).toString());
      assertEqual('\u00FF', [Math.pow(2, 8)-1].pack(format()).toString());
    });

    it("tries to convert the pack argument to an Integer using #to_int", function() {
      assertEqual('\u0005', [5.0].pack(format()).toString());

      //assertEqual('\x05', [new FauxObject()].pack(format));
    });

    it("raises a TypeError if a pack argument can't be coerced to Integer", function() {
      //lambda { ["5"].pack(format) }.should raise_error(TypeError)
      //obj = mock('not an integer')
      //lambda { [obj].pack(format) }.should raise_error(TypeError)
    });

    it("processes count number of array elements if count given", function() {
      assertEqual('\u0001\u0002\u0003', [1, 2, 3].pack(format(3)).toString());
      assertEqual('\u0001\u0002\u0003', [1, 2, 3].pack(format(2) + format(1)).toString());
    });

    it("returns empty string if count = 0", function() {
      assertEqual('', [1, 2, 3].pack(format(0)).toString().escapeChars());
    });

    it("with star parameter processes all remaining array items", function() {
      assertEqual('\u0001\u0002\u0003\u0004\u0005', [1, 2, 3, 4, 5].pack(format('*')).toString());
    });

    it("raises an ArgumentError if count is greater than array elements left", function() {
      assertRaise('ArgumentError', function() {
        [1, 2].pack(format(3));
      });
    });
  });
};

function integerPackSixteenBig(f) {
  this.format = f;
  function format(count) {
    if (count == undefined) count = '';
    return this.format + count;
  }

  describe("Array#pack with integer format (16bit, big endian)", function() {
    it("returns a string containing 2 bytes for an integer", function() {
      assertEqual('\ufffd\ufffd', [0xABCD].pack(format()).toString());
      assertEqual('\x00\x00', [0].pack(format()).toString());
    });
  });
};

describe("Array#pack with format 'C'", function() {
  integerNotPlatformDependent('C');
  integerPackEight('C');
});

describe("Array#pack with format 'c'", function() {
  integerNotPlatformDependent('c');
  integerPackEight('c');
});

describe("Array#pack with format 'n'", function() {
  integerNotPlatformDependent('n');
  integerPackSixteenBig('n');
});

describe("Array#pack with format 'N'", function() {
  integerNotPlatformDependent('N');
});
