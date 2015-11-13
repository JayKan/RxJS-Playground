;(function(){

  'use strict';

  var countElement   = document.getElementById('toCount');
  var resultElement  = document.getElementById('result');
  var result2        = document.getElementById('result2');

  var source = Rx.Observable.fromEvent(countElement, 'keyup')
    .map(function(e){
      return 'length: ' + e.target.value.length;
    })
    .distinctUntilChanged();

  function setHtml(text){
    this.innerHTML = text;
  }

  source.subscribe(function(text){
    resultElement.innerHTML  = text;
  });

  source.subscribe( setHtml.bind( result2 ) );

})();