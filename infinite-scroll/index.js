;(function() {
  'use strict';

  var currentPage = 1;
  var scrollElem = document.getElementById('infinite-scroller');
  var scrollEvent$ = Rx.Observable.fromEvent(scrollElem, 'scroll');

  function getQuotesAPI() {
    return 'https://node-hnapi.herokuapp.com/news?page=' + currentPage;
  }

  // Check if the user is scrolling down by previous
  // scroll position and current scroll position
  function isUserScrollingDown(positions) {
    return positions[0].sT < positions[1].sT
  }

  // Check if the scroll position at required percentage
  function isScrollExpectedPercent(position, percent) {
    return ((position.sT + position.cH) / position.sH) > (percent / 100);
  }

  // Render each news on the view
  function renderNews(news) {
    var li = document.createElement('li');
    li.innerHTML = [news.id, news.title].join(' - ');
    scrollElem.appendChild(li);
  }

  // Process data returned from api
  function processData(res) {
    res.json()
      .then(function (news) {
        currentPage++;
        news.forEach(renderNews);
      });
  }

  // User scroll down stream
  var userScrolledDown$ = scrollEvent$
    .map(function (e) {
      return {
        sH: e.target.scrollHeight,
        sT: e.target.scrollTop,
        cH: e.target.clientHeight
      };
    })
    .pairwise()
    .filter(function (positions) {
      return isUserScrollingDown(positions) && isScrollExpectedPercent(positions[1], 70);
    });

  var requestOnScroll$ = userScrolledDown$
    .startWith([])
    .exhaustMap(function () {
      return Rx.Observable.fromPromise(fetch(getQuotesAPI()))
    });


  // Subscribe and apply effects
  requestOnScroll$.subscribe(processData);

})();