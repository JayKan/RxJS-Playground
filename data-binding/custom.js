;(function(){

  'use strict';

  function setText(text){
    this.textContent = text;
  }

  // Make a simple binding
  var label1 = document.getElementById('label1');
  var hello = new Rx.BehaviorSubject('Hello');
  hello.subscribe( setText.bind(label1) );

})();