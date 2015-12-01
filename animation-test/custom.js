;(function(){

  'use strict';

  console.log('Animation Test loading');

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
     * @returns {*}
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
     * @method showBox
     */
    showBox: function(){
      return this.parent.find('#' + this.id).fadeIn('fast');
    },
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




})();
