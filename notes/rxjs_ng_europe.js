'use strict';

function map(transformFn) {
  const inputObservable = this;
  const outputObservable = createObservable(function subscribe(outputObserver) {
    inputObservable.subscribe({
      next: function(x) {
        const y = transformFn(x);
        outputObserver.next(y);
      },
      error: function(e) {
        outputObserver.error(e);
      },
      complete: function () {
        outputObserver.complete();
      }
    })
  });
  return outputObservable;
}

function filter(conditionFn) {
  const inputObservable = this;
  const outputObservable = createObservable(function subscribe(outputObserver) {
    inputObservable.subscribe({
      next: function(x) {
        if (conditionFn(x)) {
          outputObserver.next(x);
        }
      },
      error: function(e) {
        outputObserver.error(e);
      },
      complete: function () {
        outputObserver.complete();
      }
    })
  });
  return outputObservable;
}


function createObservable(subscribe) {
  return {
    subscribe: subscribe,
    map: map,
    filter: filter
  };
}

const arrayObservable = createObservable(function(observer) {
  [10, 20, 30].forEach(observer.next);
  observer.complete();
});

const observer = {
  next: function nextCallback(data) {
    console.log(data);
  },
  error: function errorCallback(err) {
    console.error(err);
  },
  complete: function completeCallback() {
    console.log('done');
  }
};


arrayObservable
  .map(function(x) { return x / 10; })
  .filter(function (x) { return x !== 2; })
  .subscribe(observer);

