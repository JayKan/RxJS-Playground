(function () {
  var mouseUpStream = Rx.Observable.fromEvent(document,"mouseup");
  var mouseMoveStream = Rx.Observable.fromEvent(document,"mousemove")
      .takeUntil(mouseUpStream);


  var mouseDownStream = Rx.Observable.fromEvent(document,"mousedown")
      .flatMap(function(){
        return mouseMoveStream;
      })
      .map(function(event){
        return { x: event.clientX, y: event.clientY};
      });

  var cntLabel = document.querySelector("h1");

  mouseDownStream.subscribe(function(result){
    cntLabel.textContent = "x: " + result.x + " , y: "+ result.y;
  });

}());