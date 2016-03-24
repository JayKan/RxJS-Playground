;(function(window, undefined) {
  'use strict';
  
  /**
   * @kind function
   * @name getOffset
   * @param event
   * @description Calculate offset either layerX/Y or offsetX/Y
   */
  function getOffset(event) {
    return {
      offsetX: event.offsetX === undefined ? event.layerX : event.offsetX,
      offsetY: event.offsetY === undefined ? event.layerY : event.offsetY
    };
  }

  function bootstrap() {
    var canvas = document.getElementById('tutorial'),
        move, down, up, context;

    if (canvas.getContext) {
      context = canvas.getContext('2d');
      context.beginPath();

      // check for pinter events
      if (window.navigator.pointerEnabled) {
        move = 'pointermove';
        down = 'pointerdown';
        up   = 'pointerup';
      } else {
        move   = 'mousemove';
        down   = 'mousedown';
        up     = 'mouseup';
      }

      // Get mouse moves.
      var mouseMoves = Rx.Observable.fromEvent(canvas, move);

      // Calculate the difference between two mouse moves.
      var mouseDelta = mouseMoves.zip(mouseMoves.skip(1), function(fst, snd) {
        return { first: getOffset(fst), second: getOffset(snd) };
      });

      // Merge together both mouse up and mouse down events.
      var mouseButton = Rx.Observable.fromEvent(canvas, down)
        .map(function() {
          return true;
        })
        .merge(Rx.Observable.fromEvent(canvas,up).map(function() {
          return false;
        }));

      // Paint if the mouse is down.
      var paint = mouseButton.flatMapLatest(function(down) {
        return down ? mouseDelta : mouseDelta.take(0);
      });

      // Update the canvas.
      paint.subscribe(function(x) {
        context.moveTo(x.first.offsetX, x.first.offsetY);
        context.lineTo(x.second.offsetX, x.second.offsetY);
        context.stroke();
      });
    }
  }

  window.onload = function() {
    bootstrap();
  }

})(window);