;(function(){

  'use strict';

  var fromEvent = Rx.Observable.fromEvent;

  var updatesOverTime = [];

  var width   = 960,
      height  = 600,
      margins = { top: 20, bottom: 50, left: 70, right: 20 };

  var svgElement = d3.select('svg')
    .attr('width', width )
    .attr('height', height + 200 );

  var xRange = d3.time.scale()
    .range([margins.left, width - margins.right ])
    .domain([new Date(), new Date() ]);

  var yRange = d3.time.scale()
    .range([height - margins.bottom, margins.top ])
    .domain([0, 0]);

  var xAxis = d3.svg.axis()
    .scale(xRange)
    .tickSize(5)
    .tickSubdivide(true)
    .tickFormat(d3.time.format('%x'));

  var yAxis = d3.svg.axis()
    .scale(yRange)
    .tickSize(5)
    .orient('left')
    .tickSubdivide(true);

  var xAxisElement = svgElement.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,' + (height - margins.bottom ) + ')')
    .call(xAxis);

  /*
    Adds a label to the middle of the xAxis.
   */
  var xAxisWidth = ((width - margins.right) - margins.left) / 2;
  xAxisElement.append('text')
    .attr('x', margins.left + xAxisWidth )
    .attr('y', 0)
    .attr('dy', '3em')
    .style('text-anchor', 'middle')
    .text('Time');

  var yAxisElement = svgElement.append('g')
    .attr('class', 'y axis')
    .attr('transform', 'translate(' + margins.left + ',0)')
    .call(yAxis);

  /*
    Adds a label to the middle of the y axis.
   */
  var yAxisHeight = ((height - margins.bottom) - margins.top) / 2;
  yAxisElement.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0)
    .attr('x', -(margins.top + yAxisHeight))
    .attr('dy', '-3.5em')
    .style('text-anchor', 'middle')
    .text('Updates per second');

  /*
    Defines our line series.
   */
  var lineFunc = d3.svg.line()
    .x(function(d){ return xRange(d.x); })
    .y(function(d){ return yRange(d.y); })
    .interpolate('linear');

  svgElement.append('defs')
    .append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('x', margins.left)
    .attr('y', margins.top)
    .attr('width', width )
    .attr('height', height )
  ;

  var line = svgElement.append('g')
    .attr('clip-path', 'url(#clip)')
    .append('path')
    .attr('stroke', 'blue')
    .attr('fill', 'none')
  ;

  /*
    Adds a text element below the chart, which will
    display the subject of new edits.
   */
  svgElement.append('text')
    .attr('class', 'edit-text')
    .attr('transform', 'translate(' + margins.left + ',' + (height + 20) + ')')
    .attr('width', width - margins.left )
  ;

  /*
    Adds a text element below the chart, which will
    display the times that new users are added.
   */
  var newUserTextWith = 150;
  svgElement.append('text')
    .attr('class', 'new-user-text')
    .attr('fill', 'green')
    .attr('transform', 'translate(' + (width - margins.right - newUserTextWith) + ',' + (height + 20 ) + ')' )
    .attr('width', newUserTextWith )
  ;

  var samplingTime = 2000;
  var maxNumberOfDataPoints = 20;


  /**
   * @private
   * @method update
   * @params updates
   */
  function update(updates) {
    /*
      Updates the ranges of the chart to reflect the new data.
     */
    if (updates.length > 0) {
      xRange.domain(d3.extent(updates, function(d) { return d.x; }));
      yRange.domain([d3.min(updates, function(d) { return d.y; }),
                     d3.max(updates, function(d) { return d.y  }) ]);
    }

    /*
      Until we have filled up our data window, we just keep adding
      data points to the end of the chart.
     */
    if (updates.length < maxNumberOfDataPoints) {
      line
        .transition()
        .ease('linear')
        .attr('d', lineFunc(updates));

      svgElement
        .selectAll('g.x.axis')
        .transition()
        .ease('linear')
        .call(xAxis);
    }
    /*
      Once we have filled up the window, we then remove points from
      the start of the chart, and move the data over so the chart looks
      like it is scrolling forwards in time.
     */
    else {

      /*
        Calculates the amount of translation on the xAxis which
        equate to the time between two samples.
       */
      var xTranslation = xRange(updates[0].x) - yRange(updates[1].x);

      /*
        Transform our line series immediately, then translate it from
        right to left. This gives the effect of our chart scrolling
        forwards in time.
       */
      line
        .attr('d', lineFunc(updates))
        .attr('transform', null )
        .transition()
        .duration(samplingTime - 20)
        .ease('linear')
        .attr('transform', 'translate(' + xTranslation + ')')
      ;

      svgElement
        .selectAll('g.x.axis')
        .transition()
        .duration(samplingTime - 20)
        .ease('linear')
        .call(xAxis)
      ;
    }

    svgElement
      .selectAll('g.y.axis')
      .transition()
      .call(yAxis)
    ;
  }

  var textUpdateTransitionDuration = 550;

  /**
   * @private
   * @param newUser
   * @method updateNewUser
   */
  function updateNewUser(newUser) {
    var text = svgElement.selectAll('text.new-user-text').data(newUser);

    text
      .transition()
      .duration(textUpdateTransitionDuration)
      .style('fill-opacity', 1e-6)
      .transition()
      .duration(textUpdateTransitionDuration)
      .style('fill-opacity', 1)
      .text(function(d) {
        return d;
      })
    ;
  }

  /**
   * @private
   * @param latestEdit
   * @method updateEditText
   */
  function updateEditText(latestEdit) {
    var text = svgElement.selectAll('text.edit-text').data(latestEdit);

    text
      .transition()
      .duration(textUpdateTransitionDuration)
      .style('fill-opacity', 1e-6)
      .transition()
      .duration(textUpdateTransitionDuration)
      .text(function(d){
        return d;
      })
    ;
  }


  // Create our WebSocket to get wiki updates
  var ws = new WebSocket('ws://wiki-update-sockets.herokuapp.com/');

  var openStream = fromEvent(ws, 'open');
  var closeStream = fromEvent(ws, 'close');

  var messageStream = fromEvent(ws, 'message').delaySubscription(openStream).takeUntil(closeStream);

  openStream.subscribe(function() {
    console.log('Connection opened');
  });

  closeStream.subscribe(function() {
    console.log('Connection closed');
  });

  var updateStream = messageStream.map(function(event) {
    var dataString = event.data;
    return JSON.parse(dataString);
  });

  // Filter the 'update' stream for newUser events
  var newUserStream = updateStream.filter(function(update) {
    return update.type === 'newUser';
  });

  newUserStream.subscribe(function(results) {
    console.log('newUserStream.subscribe() returns: ', results);
    var format = d3.time.format('%X');
    updateNewUser(['New user at: ' + format(new Date())]);
  });

  // Filter the 'update' stream for 'unspecified' events, which we're talking
  // to mean edits in this case. [ listen for update.edit events ]
  var editStream = updateStream.filter(function(update) {
    return update.type === 'unspecified';
  });
  editStream.subscribe(function(results) {
    console.log('editStream.subscribe() returns: ', results);
    updateEditText(['Last edit: ' + results.content]);
  });

  // Calculate the rate of updates over time
  var updateCount = updateStream.scan(function(value) {
    return ++value;
  }, 0);

  var sampleUpdates = updateCount.sample(samplingTime);
  var totalUpdatesBeforeLastSample = 0;
  sampleUpdates.subscribe(function(value) {
    updatesOverTime.push({
      x: new Date(),
      y: (value - totalUpdatesBeforeLastSample ) / (samplingTime / 1000)
    });
    if (updatesOverTime.length > maxNumberOfDataPoints) {
      updatesOverTime.shift();
    }
    totalUpdatesBeforeLastSample = value;
    update(updatesOverTime);
  });


})();