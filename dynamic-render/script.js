;(function() {
  'use strict';

  var Observable = Rx.Observable;
  var fromEvent = Observable.fromEvent;

  var canv = document.getElementById('canvas');
  var contx = canv.getContext('2d');
  contx.clearRect(0, 0, canv.width, canv.height);

  var points = document.getElementById('points');
  var outerRadius = document.getElementById('outer-radius');
  var innerRadius = document.getElementById('inner-radius');
  var angle = document.getElementById('clockwise');
  var lineWidth = document.getElementById('line-width');
  var strokeColor = document.getElementById('stroke-color');
  var fillColor = document.getElementById('fill-color');

  var points$ = fromEvent(points, 'input', function(e) {
    return e.target.value
  }).startWith(points.value);

  var outerRadius$ = fromEvent(outerRadius, 'input', function(e) {
    return e.target.value;
  }).startWith(outerRadius.value).distinctUntilChanged();

  var innerRadius$ = fromEvent(innerRadius, 'input', function (e) {
    return e.target.value;
  }).startWith(innerRadius.value);

  var angle$ = fromEvent(angle, 'input', function(e) {
    return e.target.value;
  }).startWith(angle.value);

  var lineWidth$ = fromEvent(lineWidth, 'input', function(e) {
    return e.target.value;
  }).startWith(lineWidth.value);

  var strokeColor$ = fromEvent(strokeColor, 'input', function(e) {
    return e.target.value;
  }).startWith(strokeColor.value);

  var fillColor$ = fromEvent(fillColor, 'input', function(e) {
    return e.target.value;
  }).startWith(fillColor.value);

  Rx.Observable
    .combineLatest(points$, outerRadius$, innerRadius$, angle$, strokeColor$, fillColor$, lineWidth$)
    .subscribe(function(values) {
      draw.apply(null, values);
  });

  function draw(points, radius1, radius2, alpha0, strokeColor, fillColor, lineWidth) {
    contx.clearRect(0, 0, canv.width, canv.height);
    contx.beginPath();
    drawShape(contx, canv.width / 2,
      canv.height / 2, parseInt(points), parseInt(radius1), parseInt(radius2), parseInt(alpha0), 1);
    contx.strokeStyle = strokeColor;
    contx.fillStyle = fillColor;
    contx.lineWidth = lineWidth;
    contx.stroke();
    contx.fill();
  }

  function drawShape(ctx, x, y, points, radius1, radius2, alpha0, ratio) {
    //points: number of points (or number of sides for polygons)
    //radius1: "outer" radius of the star
    //radius2: "inner" radius of the star (if equal to radius1, a polygon is drawn)
    //angle0: initial angle (clockwise), by default, stars and polygons are 'pointing' up
    var i, angle, radius;
    if (radius2 !== radius1) {
      points = 2 * points;
    }
    for (i = 0; i <= points; i++) {
      angle = i * 2 * Math.PI / points - Math.PI / 2 + alpha0;
      radius = i % 2 === 0 ? radius1 : radius2;
      ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle) * ratio);
    }
  }

})();