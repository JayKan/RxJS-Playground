### RxJS's Subject Class
> A Subject is a type that implements both Observer and Observables types. As an Observer, it can subscribe to Observables, and as an Observable it can produce values and have Observers subscribe to it.

In some scenarios a single Subject can do the work of a **combination** of Observers and Observables. For instance, for making a proxy object between a data source and the Subject's listeners, we could use something like this:
```javascript
// Create a new Subject
var subject = new Rx.Subject();

// Create a `source` Observable
var source = Rx.Observable
    .interval(1000)
    .map(function(v) { return 'Interval message #' + v; })
    .take(5);

// Subscribe the `Subject` to the `Observable`
source.subscribe(subject);

// Subscribe an `Observer` to the `Subject`. `Subject` now behaves as an Observable now.
var subscription = subject.subscribe(
    function onNext(e) { console.log('onNext: ' + x); },
    function onError(e) { console.log('onError: ' + e.message); },
    function onCompleted() { console.log('onCompleted'); }
);

// Make our Subject emits values of its own (message1 and message2)
subject.onNext('Our message #1');
subject.onNext('Our message #2');

setTimeout(function() {
    subject.onCompleted();
}, 2000);
```

### AsyncSubject
> AsyncSubject emits the last value of a sequence only if the sequence completes. This value is then cached forever, and any Observer that subscribes after the value has been emitted will receive it right away. AsyncSubject is convenient for asynchronous operations that return a single value, such as Ajax requests.

```javascript
// Create a new AsyncSubject
var subject = new Rx.AsyncSubject();

// Create a delayed Observable
var delayed$ = Rx.Observable.range(0, 5).delay(1000);

// Subscribe our Observable to AsyncSubject.
delayed$.subscribe(subject);

subject.subscribe(
    function onNext(v) { console.log('onNext: ' + v); },
    function onError(e) { console.log('onError: ' + e.message); },
    function onCompleted() { console.log('onCompleted'); }
);
```

*AsyncSubject* represents the result of an asynchronous action, and you can use it as a substitute for a promise. The difference internally is that a promise will only ever process a single value, whereas **AsyncSubject** processes all values in a sequence, only ever emitting (and caching) the **last one**.

### BehaviorSubject
> When an Observer subscribes to a BehaviorSubject, it receives the last emitted value and then all the subsequent values. BehaviorSubject requires that we provide a **starting value**, so that all Observers will always receive a value when they subscribe to a BehaviorSubject.

```javascript
var subject = new Rx.BehaviorSubject('Waiting for content');

subject.subscribe( 
    function(result) {
        document.body.textContent = result.response || result;
    },
    function(err) {
        document.body.textContent = 'There was an error retrieving content';
    } 
);

Rx.DOM.get('/remote/content').subscribe(subject);
```

### ReplaySubject
> A ReplaySubject caches its values and re-emits them to any Observer that subscribes late to it. Unlike with AsyncSubject, the sequence does not need to be completed for this to happen.

*ReplaySubject* is useful to make sure that Observers get **all the values** emitted by an Observable from the start. It spares us from writing messy code that caches previous values, saving us from nasty concurrency-related bugs.

