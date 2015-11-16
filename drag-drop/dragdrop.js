;(function(){

  'use strict';

  function main () {

    var targetElement = document.getElementById('dragTarget');

    /*
      Get the three major mouseEvents we'll be observing.
     */
    var mouseUp   = Rx.Observable.fromEvent( targetElement, 'mouseup'   );
    var mouseMove = Rx.Observable.fromEvent( document,      'mousemove' );
    var mouseDown = Rx.Observable.fromEvent( targetElement, 'mousedown' );

    var mouseDrag = mouseDown.flatMap(function (md) {

      /*
       Calculates the offsets when mouse starting moving down
       */
      var startX = md.offsetX,
          startY = md.offsetY;

      /*
       Calculates delta with mouseMove events
       until mouseUp events are done.
       */
      return mouseMove.map(function (mm) {
        mm.preventDefault();

        return {
          left: mm.clientX - startX,
          top: mm.clientY - startY
        };
      }).takeUntil(mouseUp);
    });

    function updateElementPosition(position){
      this.style.top = position.top + 'px';
      this.style.left = position.left + 'px';
    }

    /*
     Updates drag&drop Element position.
     */
    mouseDrag.subscribe(
      updateElementPosition.bind( targetElement )
    );
  }

  main();

})();