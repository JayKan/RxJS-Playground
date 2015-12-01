;(function(){
  if (!Object.assign) {
    Object.defineProperty(Object, 'assign', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: function(target, firstSource) {
        'use strict';
        if (target === undefined || target === null) {
          throw new TypeError('Cannot convert first argument to Object.');
        }
        var to = Object(target);
        for (var i = 1, len = arguments.length; i < len; i+=1) {
          var nextSource = arguments[i];
          if (nextSource === undefined || nextSource === null) continue;
          var keysArray = Object.keys(Object(nextSource));
          for (var nextIndex = 0, ii = keysArray.length; nextIndex < ii; nextIndex+=1) {
            var nextKey = keysArray[nextIndex];
            var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
            if (desc !== undefined && desc.enumerable) { to[nextKey] = nextSource[nextKey]; }
          }
        }
        return to;
      }
    })
  }
})();