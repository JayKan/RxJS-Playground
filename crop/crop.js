;(function(window) {

  'use strict';

  var boundingBox, // a model for the region of the image to be cropped.
      handles = [],// an array of draggable elements that modify the crop region.
      hanleNodes,  // we need to handle as a nodeList in order to add multiple event listeners at once.
      overlay, // `overlay` is a canvas element that allows us to darken the portion of the image that will be removed.
      context; // `context` will the drawing context for `overlay`.


  /**
   * @kind function 
   * @name loadImage
   * @returns {Observable}
   */
  function loadImage() {
    // `buffer` is a canvas element that displays the actual image to crop.
    var buffer = document.getElementById('buffer');
    // `image` is an img element tag we use to load the image, though we never add it to the DOM.
    var image = document.createElement('img');
    image.src = 'images/leaf-twirl.jpg';
    
    // Returns an observable which fires when the image is loaded.
    return Rx.Observable.fromEvent(image, 'load').map(function() {
      overlay.width = image.width;
      overlay.height = image.height;
      
      buffer.width = image.width;
      buffer.height = image.height;
      buffer.getContext('2d').drawImage(image, 0, 0);
      
      return {
        width: image.width,
        height: image.height
      }
    });
  }


  /**
   * @kind function 
   * @name initBoundingBox
   * @param size
   * @returns {void}
   */
  function initBoundingBox(size) {
    boundingBox = {
      x: 0,
      y: 0,
      x2: size.width,
      y2: size.height
    };
  }

  /**
   * @kind function
   * @name createHandles
   */
  function createHandles() {
    var container = document.getElementById('container');
    
    function _createHandler(id, render, updateModel) {
      var handle = document.createElement('div');
      handle.className += ' handle';
      handle.setAttribute('id', id);
      container.appendChild(handle);
      
      // `render` allows us to visually update the handle after it has been dragged.
      handle['render'] = render;
      // `updateModel` allows us to modify the correct part of the crop region model.
      handle['updateModel'] = updateModel;

      handles.push(handle);
    }

    // top left drag event.
    _createHandler('tl', function() {
      this.style.top = boundingBox.y + 'px';
      this.style.left = boundingBox.x + 'px';
    }, function(x, y) {
      boundingBox.x = x;
      boundingBox.y = y;
    });

    // top right drag event.
    _createHandler('tr', function() {
      this.style.top = boundingBox.y + 'px';
      this.style.left = boundingBox.x2 + 'px';
    }, function(x, y) {
      boundingBox.y = y;
      boundingBox.x2 = x;
    });

    // bottom left drag event.
    _createHandler('bl', function() {
      this.style.top = boundingBox.y2 + 'px';
      this.style.left = boundingBox.x + 'px';
    }, function(x, y) {
      boundingBox.x = x;
      boundingBox.y2 = y;
    });

    // bottom right drag event.
    _createHandler('br', function() {
      this.style.top = boundingBox.y2 + 'px';
      this.style.left = boundingBox.x2 + 'px';
    }, function(x, y) {
      boundingBox.x2 = x;
      boundingBox.y2 = y;
    });

    // render the handles in their initial positions
    handles.forEach(function(element) {
      element['render']();
    });

    // grab handles in a nodeList so we can add mouseDown listeners to all of them at once.
    hanleNodes = document.querySelectorAll('.handle');
  }

  /**
   * @kind function
   * @name respondToGestures
   */
  function respondToGestures() {
    // check for pointer events
    var moves = 'mousemove',
        downs = 'mousedown',
        ups   = 'mouseup';

    if (window.navigator.pointerEnabled) {
      moves = 'pointermove';
      downs = 'pointerdown';
      ups   = 'pointerup';
    }

    var fromEvent = Rx.Observable.fromEvent,
        move      = fromEvent(overlay, moves),
        up        = fromEvent(document, ups),
        down      = fromEvent(hanleNodes, downs);

    // when the mouse is down on a handle, returns the handle element.
    return down.flatMap(function(handle) {
      handle.preventDefault();

      return move
        // we combine the handle element with the position data from the move event.
        .map(function(pos) {
          return {
            element: handle.target,
            offsetX: pos.offsetX,
            offsetY: pos.offsetY
          };
        })
        // However, when the mouse is up (anywhere on the document) then stop the stream.
        .takeUntil(up);
    });
  }

  /**
   * @kind function
   * @name drawOverlay
   */
  function drawOverlay() {
    var x = boundingBox.x,
        y = boundingBox.y,
        w = boundingBox.x2 - boundingBox.x,
        h = boundingBox.y2 - boundingBox.y;

    context.globalCompositeOperation = 'source-over';

    context.clearRect(0, 0, overlay.width, overlay.height);
    context.fillStyle = 'rgba(0,0,0,0.7)';
    context.fillRect(0, 0, overlay.width, overlay.height);

    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = 'rgba(0,0,0,1)';
    context.fillRect(x, y, w, h);

    handles.forEach(function(element) { element['render'](); });
  }

  /**
   * @kind function
   * @name main
   */
  function main() {
    overlay = document.getElementById('overlay');
    context = overlay.getContext('2d');

    var subscription = loadImage()
      .flatMap(function(size) {

        // initialize after load
        initBoundingBox(size);
        createHandles();

        // return respondToGestures();
        var newPos = respondToGestures();
        return respondToGestures();
      })
      .subscribe(function(data) {
        console.log('------ drag & drop position ---: ', data);
        // update model and redraw via an async operation
        data.element.updateModel(data.offsetX, data.offsetY);

        Rx.Scheduler.requestAnimationFrame.schedule(drawOverlay);
      });
  }

  window.onload = function(){
    main();
  }


})(window);