;(function () {
  'use strict';

  var input = document.getElementById('range');
  var updateButton = document.getElementById('update');

  // Utility functions
  function takeUntilFunc(endRange, currentNumber) {
    return endRange > currentNumber
      ? function (val) { return val <= endRange; }
      : function (val) { return val >= endRange; }
  }

  function positiveOrNegative(endRange, currentNumber) {
    return endRange > currentNumber ? 1 : -1;
  }

  function updateHTML(id) {
    return function (val) {
      return document.getElementById(id).innerHTML = val;
    };
  }

  // Creating subscription
  var subscription = (function(currentNumber) {
    return Rx.Observable
      .fromEvent(updateButton, 'click')
      .map(function() { return parseInt(input.value); })
      .switchMap(function(endRange) {
        return Rx.Observable.timer(0, 20)
          .mapTo(positiveOrNegative(endRange, currentNumber))
          .startWith(currentNumber)
          .scan(function(acc, curr) {
            return acc + curr;
          })
          .takeWhile(takeUntilFunc(endRange, currentNumber));
      })
      .do(function(v) {
        return currentNumber = v;
      })
      .startWith(currentNumber)
      .subscribe(updateHTML('display'));
  })(0);
})();