(function(root, factory) {

  var dependencies = [
    'jquery',
    'underscore',
    'rx',
    'rx.jquery',
    'rx.time',
    'rx.selectors'
  ];

  var freeExports = typeof exports == 'object' && exports &&
    (typeof root == 'object' && root && root == root.global && (window = root), exports);

  // Because of build optimizers
  if (typeof define === 'function' && define.amd) {
    define(dependencies, function() {
      return factory.apply(root, [root].concat(Array.prototype.slice.call(arguments)));
    });
  } else if (typeof module == 'object' && module && module.exports == freeExports) {
    module.exports = factory.apply(null, [root].concat(dependencies.map(require)));
  } else {
    return factory(root, root.$, root._, root.Rx);
  }
})(this, function(window, $, _, Rx) {

  var rxs = Rx.selectors,
    oProto = Rx.Observable.prototype,
    dummyTouches = [],
    TAGNAMES = {
      'select': 'input',
      'change': 'input',
      'submit': 'form',
      'reset': 'form',
      'error': 'img',
      'load': 'img',
      'abort': 'img'
    },
    KeyEvent = window.KeyEvent = defineKeyEvent(),
    letterCodes = _.range(KeyEvent.DOM_VK_A, KeyEvent.DOM_VK_Z + 1),
    numberCodes = _.range(KeyEvent.DOM_VK_0, KeyEvent.DOM_VK_9 + 1),
    numpadCodes = _.range(KeyEvent.DOM_VK_NUMPAD0, KeyEvent.DOM_VK_NUMPAD9 + 1),
    punctuationCodes = _.range(KeyEvent.DOM_VK_COMMA, KeyEvent.DOM_VK_QUOTE + 1),
    mathCodes = _.range(KeyEvent.DOM_VK_MULTIPLY, KeyEvent.DOM_VK_DIVIDE + 1);

  oProto.cancelEvent = function cancelEvent() {
    return this.doAction(stopAndCancelEvent);
  }

  $.fn.downAsObservable = function downAsObservable() {

    var target = $(this),

      touch = target
        .bindAsObservable('touchstart')
        .selectMany(normalizeTouches),

      mouse = target
        .bindAsObservable('mousedown')
        .select(normalizeMouse);

    return Rx.Observable.ifThen(
      supported('touchstart'),
      touch, mouse
    )
      .doAction(rxs.pluck([target, 'addClass', 'down']))
      .select(attachOrigin);
  }

  $.fn.moveAsObservable = function moveAsObservable(identifier) {

    var target = $(this),

      touch = target
        .bindAsObservable('touchmove')
        .selectMany(normalizeTouches)
        .letBind(function(obs) {
          return (identifier === undefined) ?
            obs :
            obs.where(rxs.pluck('identifier', rxs.eq(identifier)));
        }),

      mouse = target
        .bindAsObservable('mousemove')
        .select(normalizeMouse);

    return Rx.Observable.ifThen(
      supported('touchmove'),
      touch, mouse
    );
  }

  $.fn.upAsObservable = function upAsObservable(identifier) {

    var target = $(this),

      touch = target
        .bindAsObservable('touchend')
        .selectMany(normalizeTouches)
        .letBind(function(obs) {
          return (identifier === undefined) ?
            obs :
            obs.where(rxs.sequence(
              rxs.pluck('identifier'),
              rxs.eq(identifier)
            ))
        }),

      mouse = target
        .bindAsObservable('mouseup')
        .select(normalizeMouse);

    return Rx.Observable.ifThen(
      supported('touchend'),
      touch, mouse
    )
      .doAction(rxs.pluck([target, 'removeClass', 'down press']));
  }

  $.fn.tapAsObservable = function tapAsObservable(timeout, radius) {

    if (timeout === undefined) timeout = 250;
    if (radius === undefined) radius = {
      x: 10,
      y: 10
    }

    var target = $(this),
      down = target.downAsObservable(),
      up = target.upAnywhere(),
      move = target
        .moveAnywhere()
        .doAction(rxs.pluck([target, 'removeClass', 'down press']))
        .ignoreElements(),

      tap = down.selectMany(function(start) {

        var timeoutContingency = Rx.Observable.empty(),

          upWithinRadius = up
            .doAction(rxs.pluck([target, 'removeClass', 'down press']))
            .select(_.partial(scanDeltas, start))
            .where(rxs.not(outside(radius)));

        upWithinTime = upWithinRadius
          .select(rxs.value(start))
          .timeout(timeout)
          .catchException(timeoutContingency);

        return move.merge(upWithinTime);
      });

    return tap;
  }

  $.fn.pressAsObservable = function pressAsObservable(time, radius) {

    // The time to wait until the we consider the press activated.
    if (time === undefined) time = 0;

    // The distance from the origin the pointing device is
    // allowed to move and still activate the press gesture.
    if (radius === undefined) radius = {
      x: 10,
      y: 10
    };

    var target = $(this),
      down = target.downAsObservable();

    if (time === 0) return down;

    var move = target.moveAnywhere(),
      press = down.selectMany(function(start) {

        var timer = Rx.Observable.timer(time),
          movedAway = move
            .where(outside(radius))
            .doAction(rxs.pluck([target, 'removeClass', 'down press']));

        return timer
          .takeUntil(movedAway)
          .select(rxs.value(start));
      });

    return press.doAction(rxs.pluck([target, 'addClass', 'press']));
  }

  $.fn.dragAsObservable = function dragAsObservable(time, radius) {

    var target = $(this),
      press = target.pressAsObservable(time, radius),
      moveAnywhere = target.moveAnywhere(),
      upAnywhere = target.upAnywhere();

    return press
      .selectMany(function(start) {
        return moveAnywhere.startWith(scanDeltas(start, start));
      })
      .cancelEvent()
      .takeUntil(upAnywhere)
      .scan(scanDeltas)
      .scan(scanOrigins);
  }

  $.fn.keysAsObservable = function keysAsObservable() {

    var target = this,
      codes = _.toArray(arguments),
      codes = ((typeof codes[0] === 'number') ? [codes] : codes),
      predicates = _.map(codes, function(list) {

        if (typeof list === 'number') list = [list];

        return function(code) {
          return _.contains(list, code);
        };
      }),
      predicate = predicates.length <= 1 ?
        predicates[0] :
        rxs.or.apply(null, predicates),
      keydowns = (
        target.data('keydowns') ||
        target
          .keydownAsObservable()
          .publish()
          .refCount()
      );

    target.data('keydowns', keydowns);

    return keydowns.where(rxs.pluck('which', predicate));
  }

  $.fn.keyAsObservable = function keyAsObservable(code) {
    return this.keysAsObservable([code]);
  }

  $.fn.numbersAsObservable = function numbersAsObservable(except) {
    return this.keysAsObservable(_.without(numberCodes, except || []), numpadCodes);
  }

  $.fn.charsAsObservable = function charsAsObservable(except) {
    return this.keysAsObservable(_.without(letterCodes, except || []));
  }

  $.fn.alphaNumericAsObservable = function alphaNumericAsObservable(except) {
    except = except || [];
    return this.keysAsObservable(
      _.without(numberCodes, except),
      _.without(letterCodes, except)
    );
  }

  $.fn.punctuationAsObservable = function punctuationAsObservable(except) {
    return this.keysAsObservable(_.without(punctuationCodes, except || []));
  }

  $.fn.mathKeysAsObservable = function mathKeysAsObservable(except) {
    return this.keysAsObservable(_.without(mathCodes, except || []));
  }

  $.fn.textInputAsObservable = function textInputAsObservable(except) {
    except = except || [];
    return this.keysAsObservable(
      _.without(numberCodes, except),
      _.without(letterCodes, except),
      _.without(punctuationCodes, except),
      _.without(mathCodes, except),
      _.without([KeyEvent.DOM_VK_BACK_SPACE], except),
      _.without([KeyEvent.DOM_VK_DELETE], except)
    );
  }

  $.fn.enterAsObservable = function enterAsObservable() {
    return $(this).keysAsObservable([KeyEvent.DOM_VK_RETURN, KeyEvent.DOM_VK_ENTER]);
  }

  $.fn.downAnywhere = function downAnywhere() {
    return $(window).downAsObservable();
  }

  $.fn.moveAnywhere = function moveAnywhere() {
    return $(window).moveAsObservable();
  }

  $.fn.upAnywhere = function upAnywhere() {
    return $(window).upAsObservable();
  }

  return $;

  function eventSupported(name) {

    var element = document.createElement(TAGNAMES[name] || 'div');

    name = "on" + name;

    var supported = name in element;

    if (supported === true) return supported;

    // if it has no 'setAttribute' (i.e. doesn't implement Node interface), try generic element
    if (!element.setAttribute) {
      element = document.createElement('div')
    }

    if (!element.setAttribute || !element.removeAttribute) return false;

    element.setAttribute(name, '');
    supported = typeof element[name] == 'function';

    if (element[name]) element[name] = undefined;

    element.removeAttribute(name);

    return supported;
  }

  function supported(type) {
    return function() {
      return eventSupported(type);
    }
  }

  function stopAndCancelEvent(value) {

    var e = 'event' in value ?
      value.event :
      value;

    if ('stopPropagation' in e) e.stopPropagation();
    if ('preventDefault' in e) e.preventDefault();

    return value;
  }

  function findTouch(identifier, changed) {

    if (changed === undefined) changed = true;

    return function(event) {

      var original = event.originalEvent,
        touches = changed ?
          original.changedTouches :
          original.touches,
        touch,
        i = 0,
        n = touches.length;

      for (; i < n; ++i) {
        touch = touches[i];

        if (touch.identifier === identifier)
          return touch;
      }

      return null;
    }
  }

  function normalizeMouse(event) {
    return {
      event: event,
      pageX: event.pageX,
      pageY: event.pageY,
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screeY: event.screenY,
      identifier: 0,
      touches: dummyTouches,
      changedTouches: dummyTouches
    }
  }

  function normalizeTouches(event) {

    var original = event.originalEvent,
      touches = original.touches,
      changedTouches = original.changedTouches;

    return Rx.Observable
      .fromArray(changedTouches)
      .select(function(touch) {
        return {
          event: event,
          pageX: touch.pageX,
          pageY: touch.pageY,
          clientX: touch.clientX,
          clientY: touch.clientY,
          screenX: touch.screenX,
          screeY: touch.screenY,
          identifier: touch.identifier,
          touches: touches,
          changedTouches: changedTouches
        }
      });
  }

  function attachOrigin(normalized) {

    normalized.origin = {
      x: normalized.clientX,
      y: normalized.clientY
    };

    return normalized;
  }

  function scanDeltas(b, a) {

    if (!a) return b;

    var delta = {
      x: 0,
      y: 0
    };
    var total = {
      x: 0,
      y: 0
    };

    a.delta = delta;
    a.total = total;

    if (!b) return a;

    if (!b.delta) b.delta = delta;
    if (!b.total) b.total = total;

    delta.x = a.clientX - b.clientX;
    delta.y = a.clientY - b.clientY;

    total.x = delta.x + b.total.x;
    total.y = delta.y + b.total.y;

    a.origin = b.origin || {
        x: a.clientX,
        y: a.clientY
      };
    a.previous = b;

    return a;
  }

  function scanOrigins(b, a) {

    if (!a) return b;
    if (!b) return a;

    a.origin = b.origin;

    return a;
  }

  function epsilon(w, h, dx, dy) {
    return (w * h) < (dx * dx) + (dy * dy);
  }

  function outside(radius) {
    return function(event) {
      return epsilon(
        radius.x, radius.y,
        event.total.x, event.total.y
      );
    }
  }

  function defineKeyEvent() {
    return typeof window.KeyEvent != "undefined" ?
      window.KeyEvent : {
      DOM_VK_CANCEL: 3,
      DOM_VK_HELP: 6,
      DOM_VK_BACK_SPACE: 8,
      DOM_VK_TAB: 9,
      DOM_VK_CLEAR: 12,
      DOM_VK_RETURN: 13,
      DOM_VK_ENTER: 14,
      DOM_VK_SHIFT: 16,
      DOM_VK_CONTROL: 17,
      DOM_VK_ALT: 18,
      DOM_VK_PAUSE: 19,
      DOM_VK_CAPS_LOCK: 20,
      DOM_VK_ESCAPE: 27,
      DOM_VK_SPACE: 32,
      DOM_VK_PAGE_UP: 33,
      DOM_VK_PAGE_DOWN: 34,
      DOM_VK_END: 35,
      DOM_VK_HOME: 36,
      DOM_VK_LEFT: 37,
      DOM_VK_UP: 38,
      DOM_VK_RIGHT: 39,
      DOM_VK_DOWN: 40,
      DOM_VK_PRINTSCREEN: 44,
      DOM_VK_INSERT: 45,
      DOM_VK_DELETE: 46,
      DOM_VK_0: 48,
      DOM_VK_1: 49,
      DOM_VK_2: 50,
      DOM_VK_3: 51,
      DOM_VK_4: 52,
      DOM_VK_5: 53,
      DOM_VK_6: 54,
      DOM_VK_7: 55,
      DOM_VK_8: 56,
      DOM_VK_9: 57,
      DOM_VK_SEMICOLON: 59,
      DOM_VK_EQUALS: 61,
      DOM_VK_A: 65,
      DOM_VK_B: 66,
      DOM_VK_C: 67,
      DOM_VK_D: 68,
      DOM_VK_E: 69,
      DOM_VK_F: 70,
      DOM_VK_G: 71,
      DOM_VK_H: 72,
      DOM_VK_I: 73,
      DOM_VK_J: 74,
      DOM_VK_K: 75,
      DOM_VK_L: 76,
      DOM_VK_M: 77,
      DOM_VK_N: 78,
      DOM_VK_O: 79,
      DOM_VK_P: 80,
      DOM_VK_Q: 81,
      DOM_VK_R: 82,
      DOM_VK_S: 83,
      DOM_VK_T: 84,
      DOM_VK_U: 85,
      DOM_VK_V: 86,
      DOM_VK_W: 87,
      DOM_VK_X: 88,
      DOM_VK_Y: 89,
      DOM_VK_Z: 90,
      DOM_VK_CONTEXT_MENU: 93,
      DOM_VK_NUMPAD0: 96,
      DOM_VK_NUMPAD1: 97,
      DOM_VK_NUMPAD2: 98,
      DOM_VK_NUMPAD3: 99,
      DOM_VK_NUMPAD4: 100,
      DOM_VK_NUMPAD5: 101,
      DOM_VK_NUMPAD6: 102,
      DOM_VK_NUMPAD7: 103,
      DOM_VK_NUMPAD8: 104,
      DOM_VK_NUMPAD9: 105,
      DOM_VK_MULTIPLY: 106,
      DOM_VK_ADD: 107,
      DOM_VK_SEPARATOR: 108,
      DOM_VK_SUBTRACT: 109,
      DOM_VK_DECIMAL: 110,
      DOM_VK_DIVIDE: 111,
      DOM_VK_F1: 112,
      DOM_VK_F2: 113,
      DOM_VK_F3: 114,
      DOM_VK_F4: 115,
      DOM_VK_F5: 116,
      DOM_VK_F6: 117,
      DOM_VK_F7: 118,
      DOM_VK_F8: 119,
      DOM_VK_F9: 120,
      DOM_VK_F10: 121,
      DOM_VK_F11: 122,
      DOM_VK_F12: 123,
      DOM_VK_F13: 124,
      DOM_VK_F14: 125,
      DOM_VK_F15: 126,
      DOM_VK_F16: 127,
      DOM_VK_F17: 128,
      DOM_VK_F18: 129,
      DOM_VK_F19: 130,
      DOM_VK_F20: 131,
      DOM_VK_F21: 132,
      DOM_VK_F22: 133,
      DOM_VK_F23: 134,
      DOM_VK_F24: 135,
      DOM_VK_NUM_LOCK: 144,
      DOM_VK_SCROLL_LOCK: 145,
      DOM_VK_COMMA: 188,
      DOM_VK_DASH: 189,
      DOM_VK_PERIOD: 190,
      DOM_VK_SLASH: 191,
      DOM_VK_BACK_QUOTE: 192,
      DOM_VK_OPEN_BRACKET: 219,
      DOM_VK_BACK_SLASH: 220,
      DOM_VK_CLOSE_BRACKET: 221,
      DOM_VK_QUOTE: 222,
      DOM_VK_META: 224
    };
  }

})();