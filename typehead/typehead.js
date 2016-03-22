;(function(global, $) {

  'use strict';

  var $input   = $('#textInput'),
      $results = $('#results');
  
  /**
   * @kind function
   * @method searchWikipedia
   * @param term {string}
   * @returns {Promise}
   */
  function searchWikipedia(term) {
    if (!term) throw('Search term must be present in order to fetch from Wikipedia!');
    return $.ajax({
      url: 'http://en.wikipedia.org/w/api.php',
      dataType: 'jsonp',
      data: {
        action: 'opensearch',
        format: 'json',
        search: term
      }
    }).promise();
  }

  /**
   * @kind function
   * @method valueFunc
   * @param data
   */
  function valueFunc(data) {
    // console.log('------- Got new Data: ', data);
    var response = data[1];
    
    // clean current results list
    $results.empty();
    
    $.each(response, function(_, value) {
      $('<li>' + value + '</li>').appendTo($results);
    });
  }

  /**
   * @kind function 
   * @method errorFunc
   * @param error
   */
  function errorFunc(error) {
    // clean current results list
    $results.empty();
    // handle any errors
    $('<li>Error: ' + error  + '</li>').appendTo($results);
  }
  
  function completeFunc() {
    console.log('onComplete gets called!');
  }
  
  /**
   * @kind function
   * @method bootstrap
   */
  function bootstrap() {
    // Grab all distinct key-up events from the input
    var keyup = Rx.Observable.fromEvent($input, 'keyup')
      .map(function(e) {
        // project the text value from the input
        return e.target.value; 
      })
      .filter(function(text) {
        // empty the search results list if its less than 2 characters.
        if (text.length < 2 ) {
          $results.empty();
        }
        // ensure more than 2 characters so you can fetch
        return text.length > 2;
      })
      // Pause for 500ms
      .debounce(500)
      // Only if the value has changed.
      .distinctUntilChanged()
      .flatMapLatest(searchWikipedia)
      .subscribe(valueFunc, errorFunc, completeFunc)
    ;
  }

  global.onload = function() {
    bootstrap();
  };

})(window, jQuery);