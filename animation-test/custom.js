;(function(){

  'use strict';

  console.log('Animation Test loading');

  var fromEvent = Rx.Observable.fromEvent;

  /**
   * Extends RxJS Observable
   * @method movingWindow
   * @param size {number}
   * @param selector {Function} Current box
   * @param onShift {Function}
   */
  Rx.Observable.prototype.movingWindow = function(size, selector, onShift) {
    var fn = this;
    return Rx.Observable.create(function(observable) {
      var arr = [];
      return fn.subscribe(
        function(x) {
          var item = selector(x);
          arr.push(item);
          if (arr.length > size) {
            var i = arr.shift();
            onShift(i);
          }
        },
        function(e) { observable.onError(e); },
        function() { observable.onCompleted(); }
      );
    });
  };

  /**
   * @class
   * @constructor
   * @param point
   * @param parent
   * @namespace Box
   */
  function Box(point, parent) {
    this.parent = parent;
    this.id = 'box_' + Date.now();
    this.point = {};
    this.point.x = point[0];
    this.point.y = point[1];
    this.buildBox();
  }

  Box.prototype = {
    /**
     * @method buildBox
     * @returns Box instance for chaining.
     */
    buildBox: function buildBox(){
      var box = $("<div class=\"box\" id=\"" + this.id + "\">").css({
        height: 20,
        width: 20,
        position: 'absolute',
        top: this.point.y - 10,
        left: this.point.x - 10,
        display: 'none',
        backgroundColor: 'rgb(' + (random(0, 255)) + ', ' + (random(0, 255)) + ', ' + (random(0, 255)) + ')'
      });
      this.parent.append(box);
      return this;
    },

    /**
     * Finds the parent <div> with current box.id and then
     * adds jQuery fadeIn animation.
     */
    showBox: function(){
      return this.parent.find('#' + this.id).fadeIn('fast');
    },
    /**
     * Find the parent <div> and then remove current box.
     */
    hideBox: function(){
      return this.parent.find("#" + this.id).fadeOut('fast', function() {
        return $(this).remove();
      });
    }
  };

  /**
   * @private
   * @function random
   * @param low
   * @param high
   * @returns {number}
   */
  function random(low, high) {
    return Math.floor(Math.random() * (high + 1)) - low;
  }

  function load(){
    var canvasElement = $('#drawing');
    return Rx.Observable.fromEvent(canvasElement, 'mousemove')
      .movingWindow(
        25,
        function(x) {
          var box = new Box([x.clientX, x.clientY], canvasElement);
          box.showBox();
          return box;
        },
        function(box){
          box.hideBox();
        }
      ).subscribe();
  }
  window.onload = load;
})();
