require('../lib/packer');

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
});

describe("String.unpack", function() {
});
