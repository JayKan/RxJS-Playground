;(function(){

  'use strict';

  function extractClientX(e) { return e.clientX; }
  function extractClientY(e) { return e.clientY; }
  function setLeft(x) { this.style.left = x + 'px'; }
  function setTop(y) { this.style.top = y + 'px'; }
  function add(x, y) { return x + y }
  function partialAdd(x) { return add.bind(null, x); }
  function randomize() { return Math.round(10 * Math.random() -5); }

  var delay = 300;

  var mouseMove = Rx.Observable.fromEvent(document, 'mousemove');
  var left = mouseMove.map(extractClientX);
  var top = mouseMove.map(extractClientY);

  // Update the mouse
  var theMouse = document.querySelector('#theMouse');
  left.subscribe(setLeft.bind(theMouse));
  top.subscribe(setTop.bind(theMouse));

  // Update the tail
  var mouseOffset = theMouse.offsetWidth;
  var theTail = document.querySelector('#theTail');
  left
    .map(partialAdd(mouseOffset))
    .delay(delay)
    .subscribe(setLeft.bind(theTail))
  ;
  top
    .delay(delay)
    .subscribe(setTop.bind(theTail))
  ;

  // Update the wagging
  var wagDelay = delay * 1.5;
  var wagging = document.querySelector('#theWagging');
  var mouseAndTailOffset = mouseOffset + theTail.offsetWidth;
  left
    .map(partialAdd(mouseAndTailOffset))
    .delay(wagDelay)
    .subscribe(setLeft.bind(wagging))
  ;
  var waggingDelay = Rx.Observable
    .interval(100)
    .map(randomize)
  ;

  top
    .delay(wagDelay)
    .combineLatest(waggingDelay, add)
    .subscribe(setTop.bind(wagging))
  ;

})();