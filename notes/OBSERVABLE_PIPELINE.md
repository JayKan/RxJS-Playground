# Observable Pipeline
> An Observable pipeline is a technique that combines a group of operators chained together, where each one takes an Observable as input and returns an Observable as output. 

### Pipeline Example
```javascript
Rx.Observable
    .from(1, 2, 3, 4, 5, 6, 7, 8)
    .filter(function(val) { return val % 2 })
    .map(function(val) { return val * 10 });
```
Pipelines are self-contained. All state flows from one operator to the next, without the need for any external variables. As a result, the operators in a pipeline should always use pure functions to avoid any side effects.

Pure functions always return the same output given the same input. It's easier to design programs with high concurrency when we can guarantee that a function in the program can't modify state other functions rely on.

### Pipelines are efficient
```javascript
stringObservalbe // represents an observable emitting 1,000 strings
    .map(function(str) {
        return str.toUpperCase();
    })
    .filter(function(str) {
        return /^[A-Z]+$/.test(str);
    })
    .subscribe(function(str) {
        console.log(str);
    });
```

Observable pipelines look extremely similar to array chains, but their similarities end here. In an Observable, nothing ever happens until we **subscribe** to it, no matter how many queries and transformations we apply to it. When we chain a transformation like *map*, we're composing a single function that will operate on every item of the array once.

With Observables, we'll ONLY go through our array list once, and we'll apply the transformations only if absolutely required. This way of operating is called *lazy evaluation*, and it is very common in functional languages such as Haskell and Miranda.

