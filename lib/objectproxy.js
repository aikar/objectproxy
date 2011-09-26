
var EventEmitter = require('events').EventEmitter;
var whPrefix = ':op::';
var Wormhole = require('wormhole');
var vm = require('vm')

function createProxy(stream, channel, id, obj, forwarders) {
  var payload = {id: id, channel: channel, forwarders: {}};
  var proxiedObject = {
    stream: stream,
    id: id,
    obj: obj,
    origProperties:{},
    forwarders: forwarders,
    payload: payload
  };
  var orig = proxiedObject.origProperties;
  Wormhole(stream, onParentCommand.bind(proxiedObject));
  
  if (forwarders && forwarders.properties && forwarders.properties.length) {
    forwarders.properties.forEach(function(prop) {
      orig[prop] = obj[prop];
      delete obj[prop];
      Object.defineProperty(obj, prop, {
        get: function() {
          return orig[prop];
        },
        set: function(v) {
          orig[prop] = v;
          // send the propery set request to the proxy.
          stream.write(whPrefix+channel, ['ps',[prop, v]]);
          return v;
        }
      });
    });
  }
  
  if (forwarders && forwarders.methods && forwarders.methods.length) {
    Object.keys(forwarders.methods).forEach(function(prop) {
      orig[prop] = obj[prop];
      var proxyfunc = forwarders.methods[prop].toString();
      payload.forwarders[prop] = proxyfunc;
      obj[prop]  = function() {
        var args = arguments.length === 1
           ? [arguments[0]] : Array.apply(null, arguments);
        var ret = orig[prop].apply(obj, args);
        stream.write(whPrefix+channel, ['e',[prop, args, ret]]);
        return ret;
      }
    });
  }
  
  stream.write(whPrefix + channel, ['np', payload]);
}

function onChildCommand(msg, fd, channel) {
  var proxiedObject = this;
  if (msg.length == 4) {
    var cmd = msg[0];
    var args = msg[1];
    switch (cmd) {
      case 'e': {
        var method = msg[0],
            args   = msg[1],
            //proxyfunc = vm.runInThisContext(msg[2], 'objectproxy-'+ proxiedObject.id),
            ret    = msg[3];
            proxiedObject.forwarders.
        break;
      }
    }
  }
}

function onParentCommand(msg, fd, channel) {
  var proxiedObject = this;
  if (msg.length == 2) {
    var cmd = msg[0];
    var args = msg[1];
    
    switch (cmd) {
      case 'ps':
        if (args[0] && args[1] !== undefined) {
          proxiedObject.origProperties[args[0]] = args[1];
        }
        break;
      case 'e': {
        if (args[0] && typeof args[1] == 'array') {
          // check origProperties first so we dont invoke an overloaded version.
          var fn = proxiedObject.origProperties[args[0]];
          if (typeof fn !== 'function') {
            fn = proxiedObject.obj[args[0]];
          }
          if (typeof fn === 'function') {
            fn.apply(proxiedObject.obj, args[1]);
          }
        }
        break;
      }
      default:
        break;
      
    }
  }
}
