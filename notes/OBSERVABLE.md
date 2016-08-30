# Learning RxJS 

### Observable

### How to create an Observer **explicitly**:
```javascript
var observer = Rx.Observer.create(
    function onNext(x) { console.log('Next: ' + x); },
    function onErorr(err) { console.log('Error: ', + err) },
    function onCompleted() { console.log('Completed') }
};

```

### How to make Ajax Calls with an Observable:
```javascript
function get(url) {
    return Rx.Observable.create(function(observer) {
        // make your request
        var req = new XMLHttpRequest();
        req.open('GET', url);
        
        req.onload = function() {
            if (req.status === 200) {
                observer.onNext(req.resposne);
                observer.onCompleted();
            } else {
                observer.onError(new Error(req.statusText));
            }
        };
        
        req.onerror = function() {
            observer.onError(new Error('Unknown Error'));
        };
        
        req.send();
    });        
}

// Create your Ajax Observable
var ajax$ = get('/api/contents.json');

// Subscribe an `Observer` to our `ajax` observable
ajax$.subscribe(
    function onNext(x) { console.log('Result: ' + x); },
    function onError(e) { console.log('Error: ' + e); },
    function onCompleted() { console.log('Completed'); }
);

```

### How to create Observables from Arrays
```javascript

Rx.Observable
    .from (['A', 'B', 'C'])
    .subscribe(
        function(x) { console.log('Next: ' + x); },
        function(e) { console.log('Error: ', + e); },
        function() { console.log('Completed'); }
    );
        
```

### How to create Observables from JavaScript Events
The following `allMouseMoves$` observable example demonstrates how to emit the coordinates of the mouse pointer:
```javascript
var allMouseMoves$ = Rx.Observable.fromEvent(document, 'mousemove');

allMouseMoves$.subscribe(function(e) {
    console.log(e.clientX, e.clientY);
});

```

### How to create new Observables based on the original Observables:
```javascript

// Create `movesOnTheRight$` observable based from previously `allMouseMoves$`
var movesOnTheRight$ = allMouseMoves$.filter(function(e) {
    return e.clientX > window.innerWidth /2;
});

```


### How to effectively use sequences in our programs?
- `merge` operator takes two different Observables and returns a new one with the merged values.
- `interval` operator returns an Observable that yields incremental numbers at a given interval of time, expressed in milliseconds.


### Transforming Operators:
`Map` is the sequence transformation operator. It takes an `Observable` and a function and applies that function to each of the values in the source Observable and returns a new Observable with the transformed values.
```javascript

var logValue = function(val) { console.log(val); };

var src$ = Rx.Observable.range(1, 5);

var upper$ = src$.map(function(name) {
    return name * 2;
});

upper$.subscribe(logValue);

```
In the above case, `src$` observable doesn't mutate. If you would like to pass a function to `map` operator that does a asynchronous computation to transform the value, you would probably use `flatMap` operator.


### Canceling Sequences
There are two main ways we can cancel an `Observable`: *implicitly* and *explicitly*
```javascript

// Explicit cancellation example:
var counter = Rx.Observable.interval(1000);

var subscription1 = counter.subscribe(function(i) {
    console.log('Subscription 1: ', i);
});

var subscription2 = counter.subscribe(function(i) {
    console.log('Subscription 2: ', i);
});

setTimeout(function() {
    console.log('Canceling subscription2!'); 
    subscription2.dispose();
}, 2000);
```







