;(function() {

  'use strict';

  var amount = document.querySelector('#amount');
  var rate = document.querySelector('#rate');
  var years = document.querySelector('#years');
  var result = document.querySelector('#result');

  function calculateDebt(amount, rate, years) {
    return parseInt(amount) + (amount / 100 * rate) * years;
  }

  // Helper function to get a stream of values from each input.
  function inputStreamGenerator(element) {
    return Rx.Observable.fromEvent(element, 'input')
      .map(function(e) {
        return e.target.value;
      })
      .startWith(element.value);
  }

  function applyValue(value) {
    this.innerHTML = 'Total Debt: $' + value;
  }

  var amount$ = inputStreamGenerator(amount);
  var rate$  = inputStreamGenerator(rate);
  var years$ = inputStreamGenerator(years);

  // observer listen to observable for changes and applies new value.
  var observer = applyValue.bind(result);

  // Merge the latest values from each stream and update the output result.
  Rx.Observable.combineLatest(
    amount$,
    rate$,
    years$,
    calculateDebt
  ).subscribe(observer);


  function pmt(interestRate, numberOfPeriods, presentValue, futureValue, type) {
    /*
     * interestRate   - interest rate per month
     * numberOfPeriods   - number of periods (months)
     * presentValue   - present value
     * futureValue   - future value
     * type - when the payments are due:
     *        0: end of the period, e.g. end of month (default)
     *        1: beginning of period
     */
    var payment, pvif;

    futureValue || (futureValue = 0);
    type || (type = 0);

    if (interestRate === 0)
      return -(presentValue + futureValue) / numberOfPeriods;

    pvif = Math.pow(1 + interestRate, numberOfPeriods);
    payment = - interestRate * presentValue * (pvif + futureValue) / (pvif -1);

    if (type === 1)
      payment /= (1+interestRate);

    return payment;
  }


  var monthly = pmt(0.035/12, 10*12, -190000);
  console.log('----------- Monthly --------------: ', monthly);

  console.clear();

  var average$ = Rx.Observable.range(2, 5)
    .reduce(function(prev, cur) {
      console.log('cur: ', cur);
      return {
        sum: prev.sum + cur,
        count: prev.count + 1
      };
    }, { sum: 0, count: 0 })
    .map(function(o) {
      console.log('Count: ', o.count);
      console.log('Sum: ', o.sum);
      return o.sum / o.count;
    });

  var subscription = average$.subscribe(function(result) {
    console.log('Average Result: ', result);
  });

  console.clear();

  /**
   * PROBLEM: Calculate the average speed while users walking.
   *
   * Even if the user has not finished walking, we need to be able to make a
   * calculation using the speed values we know so far. We want to log the average of an infinite sequence in real time.
   * The problem is that if the sequence never ends, an aggregate operator like reduce will never call its Observers’
   * onNext operator*
   *
   */
  var averageSpeed$ = Rx.Observable.interval(1000)
    .scan(function(prev, cur) {
      return {
        sum: prev.sum + cur,
        count: prev.count + 1
      }
    }, { sum: 0, count: 0 })
    .map(function(res) {
      return res.sum / res.count;
    });

  var averageSpeedSubscription = averageSpeed$.subscribe(function(data) {
    // console.log('Average Speed User is walking: ', data);
  });

  // console.log(averageSpeedSubscription);
  setTimeout(function() {
    // console.log('Cancel!!');
    averageSpeedSubscription.dispose();
  }, 2000);

  console.clear();

  /**
   * `concatAll` Implementation
   * @example
   * concatAll([[0, 1, 2], [3, 4, 5], [6, 7, 8]]) => [0, 1, 2, 3, 4, 5, 6, 7, 8]
   */
  function concatAll(source) {
    return source.reduce(function(a, b) {
      return a.concat(b);
    });
  }
  var flatten = concatAll([[0, 1, 2], [3, 4, 5], [6, 7, 8]]);
  console.log('Flatten array dimension: ', flatten);
  console.clear();


  var p = new Promise(function(resolve, reject) {
    window.setTimeout(resolve, 1000);
  });

  p.then(function() {
    // console.log('Potential side effect!');
  });

  var pSub = Rx.Observable.fromPromise(p).subscribe(function(msg) {
    console.log('Observable resolved: ', msg);
  });
  pSub.dispose();


  /**
   * Errors Handling in Observable
   */
  function getJSON(arr) {
    return Rx.Observable.from(arr).map(function(str) {
      return JSON.parse(str);
    });
  }

  var caught$ = getJSON(['{"1": 1, "2": 2}', '{"1: 1}'])
    .catch(Rx.Observable.return(
      { error: 'There was an error parsing JSON' }
    )
  );

  caught$.subscribe(function(data) {
    console.log('Success: ', data);
  }, function(e) {
    console.log('ERROR: ', e);
  })



})();