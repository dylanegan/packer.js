require('../lib/packer');

describe("Array.pack", function() {
  it("returns a String", function() {
    assert(["abc", "def"].pack("A*") instanceof String);
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
});

describe("String.unpack", function() {
});
