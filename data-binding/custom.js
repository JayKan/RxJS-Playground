;(function(){

  'use strict';

  /**
   * @private
   * @method setText
   * @param text {string}
   */
  function setText(text){
    this.textContent = text;
  }

  /**
   * @private
   * @method fromEvent
   * @param {Object} HTML DOM element or NodeList to attach a listener.
   * @param {string} eventName to attach to the observable sequence.
   * @returns {Observable} An observable sequence of events from the specified element
   * and the specified event.
   */
  var fromEvent = Rx.Observable.fromEvent;


  // Make a simple binding
  var label1 = document.getElementById('label1');
  var hello = new Rx.BehaviorSubject('Hello');
  hello.subscribe( setText.bind(label1) );

  /**
   * Rx.BehaviorSubject Class
   * - A Rx.BehaviorSubject Class represents a value that changes over time.
   *   Observers can subscribe to the subject to receive the last (or initial) value and
   *   all subsequent notifications
   */
  // Initialize with initial value of 42
  var subject = new Rx.BehaviorSubject(42);

  var subscription = subject.subscribe(
    function(x){
      console.log('onNext Called: ' + x.toString() );
    },
    function(err){
      console.log('Error: ', + err );
    },
    function(){
      console.log('onCompleted invoked!');
    }
  );
  subject.onNext(56); // => Next: 56
  subject.onCompleted(); // => Completed


  // Create simple bindings for first and last name
  var firstNameSubject = new Rx.BehaviorSubject('');
  var lastNameSubject = new Rx.BehaviorSubject('');

  // Create first and last name composite
  var fullNameSubject = firstNameSubject.combineLatest(lastNameSubject, function(first, last){
    return first + ' ' + last;
  });

  // Subscribe to them all
  var firstNameElement = document.getElementById('firstName');
  firstNameSubject.subscribe(
    function(text){
      firstNameElement.value = text;
    }
  );

  var lastNameElement  = document.getElementById('lastName');
  lastNameSubject.subscribe(
    function(text){
      lastNameElement.value = text;
    },
    function(error){
      console.log('onError: ', error);
    },
    function(){
      console.log('onCompleted lastNameElement!');
    }
  );

  var formDataElement  = document.getElementById('formData');
  fullNameSubject.subscribe(function(text){
    formDataElement.value = text;
  });

  fromEvent(firstNameElement, 'keyup')
    .subscribe(
      function(e){
        firstNameSubject.onNext(e.target.value)
      },
      function(){
        console.log('Error on firstName input element');
      },
      function(){
        console.log('FirstName input element completed subscription!');
      }
    );

  fromEvent(lastNameElement, 'keyup')
    .subscribe(
      function(e){
        lastNameSubject.onNext(e.target.value);
      },
      function(){
        console.log('Error on lastName input element.');
      },
      function(){
        console.log('LastName input element completed subscription!');
      }
    );


})();