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
   */
  function initBoundingBox(size) {
    boundingBox = {
      x: 0,
      y: 0,
      x2: size.width,
      y2: size.height
    };
  }
  
  

})(window);