(function(root, factory) {

  var dependencies = ['rx', 'underscore'];

  var freeExports = typeof exports == 'object' && exports,
    freeModule = typeof module == 'object' && module && module.exports == freeExports && module,
    freeGlobal = typeof global == 'object' && global;
  if (freeGlobal.global === freeGlobal) {
    window = freeGlobal;
  }

  // Because of build optimizers
  if (typeof define === 'function' && define.amd) {
    define(dependencies, function(Rx, _) {
      root.Rx = factory(root, Rx, _);
      return root.Rx;
    });
  } else if (typeof module === 'object' && module && module.exports === freeExports) {
    module.exports = factory.apply(root, [root].concat(dependencies.map(require)));
  } else {
    root.Rx = factory(root, root.Rx, root._);
  }
}(this, function(global, Rx, _, undefined) {

  var selectors = {
    i: identity,
    k: value,
    identity: identity,
    value: value,
    keyOf: keyOf,
    a: apply,
    apply: apply,
    args: args,
    tuple: tuple,
    merge: merge,

    print: print,

    sequence: sequence,
    fork: fork,
    not: not,
    pluck: pluck,

    first: first,
    last: last,

    and: and,
    or: or,

    eq: eq,
    gt: gt,
    gte: gte,
    lt: lt,
    lte: lte
  };

  Rx.selectors = selectors;

  return Rx;

  function identity() {
    return arguments[0];
  }

  function value(val) {
    return function() {
      return val;
    }
  }

  function keyOf(hash) {
    return function(key) {
      return _.has(hash, key);
    }
  }

  function apply(fn, context) {
    return function(arr) {
      return fn.apply(context, _.isArray(arr) ? arr : arguments);
    }
  }

  function args() {
    return _.toArray(arguments);
  }

  function tuple(a, b) {
    return [a, b];
  }

  function first() {
    return arguments[0];
  }

  function last() {
    return arguments[arguments.length - 1];
  }

  function merge() {
    return _.flatten(arguments, true);
  }

  function sequence() {
    var fns = _.toArray(arguments);
    return function(value) {
      return _.reduce(fns, function(memo, fn) {
        return fn(memo);
      }, value);
    }
  }

  function fork() {
    var fns = _.toArray(arguments);
    return function() {
      var args = arguments;
      return _.map(fns, function(fn) {
        return fn.apply(null, args);
      });
    }
  }

  function print() {
    var messages = _.toArray(arguments) || [];
    return function() {
      var values = _.toArray(arguments) || [];
      console.log.apply(console, messages.concat(values));
      return values[0];
    }
  }

  function not(fn, context) {
    return function() {
      return !fn.apply(context, arguments);
    }
  }

  function pluck() {

    var invocations = _.toArray(arguments),
      invocations = _.map(invocations, mapArrayInv),
      invocations = _.map(_.flatten(invocations), mapStringInv('.')),
      invocations = _.map(_.flatten(invocations), mapObjectInv),
      invocations = _.map(_.flatten(invocations), mapInvocationFns);

    return _.compose.apply(_, invocations.reverse());
  }

  function or() {
    var fns = _.toArray(arguments);
    return function() {
      var args = arguments;
      return _.detect(fns, function(fn) {
        return fn.apply(null, args);
      });
    }
  }

  function and() {
    var fns = _.toArray(arguments);
    return function() {
      var args = arguments;
      return _.every(fns, function(fn) {
        return fn.apply(null, args);
      });
    }
  }

  function eq(valueToMatch) {
    return function(value) {
      return value === valueToMatch;
    }
  }

  function gt(smallerValue) {
    return function(largerValue) {
      return largerValue > smallerValue;
    }
  }

  function gte(smallerOrEqualValue) {
    return function(largerOrEqualValue) {
      return largerOrEqualValue >= smallerOrEqualValue;
    }
  }

  function lt(largerValue) {
    return function(smallerValue) {
      return smallerValue < largerValue;
    }
  }

  function lte(largerOrEqualValue) {
    return function(smallerOrEqualValue) {
      return smallerOrEqualValue <= largerOrEqualValue;
    }
  }

  function mapStringInv(delimiter) {
    return function(item) {
      return typeof item === 'string' ?
        item.split(delimiter) :
        item;
    }
  }

  function mapArrayInv(item) {

    if (_.isArray(item) === false) return item;

    var args = item.length > 3 ?
      _.take(item, 2) :
      item.length == 3 ?
        item[2] : [];

    return {
      isInvocation: true,
      context: item[0],
      name: item[1],
      args: _.isArray(args) ? args : [args]
    };
  }

  function mapObjectInv(item) {

    if (_.isPlainObject(item) === false) return item;
    if (item.isInvocation === true) return item;

    return _.map(item, function(val, key) {
      return {
        name: key,
        args: _.isArray(val) ? val : [val]
      };
    });
  }

  function mapInvocationFns(invocation) {

    if (_.isString(invocation) === true) {
      return function(item) {
        var val = item[invocation];

        return _.isFunction(val) ?
          val.call(item) :
          val;
      };
    }

    if (_.isFunction(invocation) === true) {
      return invocation;
    }

    if (_.isPlainObject(invocation) === true) {
      return function(item) {
        var fn = invocation.name,
          args = invocation.args || [item],
          context = invocation.context || item,
          val = context[fn];

        return _.isFunction(val) ?
          val.apply(context, args) :
          val;
      }
    }

    return function() {};
  }
}));