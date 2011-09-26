var netb = process.binding('net');
var pair = netb.socketpair();

var s1 = new net.Stream(pair[0], 'unix');
var s2 = new net.Stream(pair[1], 'unix');

var op = require('../')

op.onProxy(s2, 'foo', function (id, proxy) {
  console.log('got id', id);
  proxy.foo('bar', 'baz');
});

var test = {
  x: 1,
  y: 2,
  foo: function() {
    console.log('[foo]', arguments);
  },
  setX: function(x) {
    this.x = x;
  }
}
op.createProxy(s1, 'foo', 'id', test, {
  properties: ['y'],
  methods: {
    setX: test.setX
  }
});
