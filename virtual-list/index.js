; (function () {
	'use strict';

	initScanVelocity(Rx);
	initConcatFriction(Rx);

	var sparse = new SparseArray(),
		side = "top",
		topBoxes = [],
		bottomBoxes = [],
		boxWidth = 90, boxMargin = 5,
		movies = getMovies2(),
		movieSizes = movies.map(function (movie) {
			return boxWidth;
		});

	sparse.setGap(boxMargin * 2);

	for (var i = -1; ++i < movies.length;) {
		sparse.insert(i);
		sparse.setItemSize(i, movieSizes[i]);
	}

	console.log(sparse.toString());

	$(function () {
		var topContainer = document.getElementsByClassName("top")[0],
			bottomContainer = document.getElementsByClassName("bottom")[0],
			listPositionInfo = { virtualX: 0, realX: 0, prev: -1 };
		$(window)
			.resizeAsObservable()
			.throttle(100, Rx.Scheduler.requestAnimationFrame)
			.startWith(null)
			.doAction(function () {
				var box,
					rect = topContainer.getBoundingClientRect(),
					i = topBoxes.length - 1,
					n = 1 + (rect.width / boxWidth) | 0;

				while (++i < n) {
					topBoxes[i] = box = new BoxArt();
					topContainer.appendChild(box.div[0]);
					bottomBoxes[i] = box = new BoxArt();
					bottomContainer.appendChild(box.div[0]);
				}

				i = topBoxes.length + 1;
				while (--i > n) {
					box = topBoxes.pop().div[0];
					if (topContainer.contains(box)) {
						topContainer.removeChild(box);
					}
					box = bottomBoxes.pop().div[0];
					if (bottomContainer.contains(box)) {
						bottomContainer.removeChild(box);
					}
				}
			})
			.flatMapLatest(function () {
				return getScrollObs([topContainer, bottomContainer])
					.startWith({ deltaX: 0, deltaY: 0 })
					// .startWith({deltaX:sparse.end(sparse.getLength() - 1) - 200, deltaY:0})
					.scan(listPositionInfo, function (x, e) {

						var virtualX = x.virtualX - e.deltaX,
							realX = x.realX - e.deltaX,
							index = sparse.indexOf(virtualX),
							length = sparse.getLength(),
							end = sparse.end(length - 1),
							overflow = 0;

						x.virtualX = virtualX;
						x.realX = realX;
						x.index = index < 0 ? 0 : index >= length ? length - 1 : index;

						if (virtualX < 0) {
							overflow = Math.abs((virtualX - boxMargin) / 10);
							if (Math.floor(e.velocity) <= 5) {
								e.velocity = overflow;
							} else if (Math.floor(e.velocity) > overflow) {
								e.velocity -= 5;
							}
							e.angle = Math.PI;
						} else if (virtualX > end) {
							overflow = Math.abs((virtualX - end + boxMargin) / 10);
							if (Math.floor(e.velocity) <= 5) {
								e.velocity = overflow;
							} else if (Math.floor(e.velocity) > overflow) {
								e.velocity -= 5;
							}
							e.angle = 0;
						}

						x.velocity = e.velocity;
						x.angle = e.angle;

						return x;
					})
					.doAction(function (x) {
						translateContainer(topContainer, x.realX * -1);
						translateContainer(bottomContainer, x.realX * -1);
					})
					.distinctUntilChanged(null, function (b, a) {
						return a.prev === a.index ?
							(a.prev = a.index) && true :
							(a.prev = a.index) && false;
					})
					.flatMapLatest(function (x) {
						var index = x.index,
							videos = side === "top" ? topBoxes : bottomBoxes;
						return Rx.Observable
							.forkJoin(videos.map(function (box, i) {
								return box.load(movies[i + index]);
							}))
							.doAction(function () {
								topContainer.style['z-index'] = Number(side === "top");
								bottomContainer.style['z-index'] = Number(side === "bottom");
								side = side === "bottom" ? "top" : "bottom";
							})
							.defaultIfEmpty()
							.select(function () {
								return (x.realX = x.virtualX - sparse.start(index)) * -1;
							});
					});
			})
			.subscribe(function (x) {
				translateContainer(topContainer, x);
				translateContainer(bottomContainer, x);
			});

		function translateContainer(container, x) {
			var style = container.style;
			style["transform"] =
				style["webkitTransform"] = "translate3d(" + x + "px, 0, 0)";
		}
	});

	function getScrollObs(containers) {
		return $(containers)
			.pressAsObservable()
			.cancelEvent()
			.flatMapLatest(function (x) {
				var originX = x.pageX,
					originY = x.pageY;
				x.absDeltaX = 0;
				x.absDeltaY = 0;
				return $(window)
					.moveAsObservable()
					.cancelEvent()
					.scan(x, function (a, b) {
						b.absDeltaX = a.absDeltaX - (a.pageX - b.pageX);
						b.absDeltaY = a.absDeltaY - (a.pageY - b.pageY);
						b.x = originX + b.absDeltaX;
						b.y = originY + b.absDeltaY;
						return b;
					})
					.takeUntil($(window).upAsObservable())
					.scanVelocity()
					.concatFriction(0.08)
					.scan(function (a, b) {
						b.deltaX = b.x - a.x;
						b.deltaY = b.y - a.y;
						return b;
					})
					.skip(1)
			});
	}

	function getColors() {
		return ["red", "green", "blue", "yellow", "purple"];
	}

	function getMovies() {
		return ["images/0/822761.jpg", "images/0/829299.jpg", "images/0/829508.jpg", "images/0/830288.jpg", "images/0/840951.jpg", "images/0/841112.jpg", "images/0/841246.jpg", "images/0/841257.jpg", "images/0/841270.jpg", "images/0/841271.jpg", "images/0/841337.jpg", "images/0/850831.jpg", "images/0/851778.jpg", "images/1/868813.jpg", "images/1/868989.jpg", "images/1/868992.jpg", "images/1/868994.jpg", "images/1/869023.jpg", "images/1/869096.jpg", "images/1/869203.jpg", "images/1/869237.jpg", "images/1/869380.jpg", "images/1/869382.jpg", "images/1/869386.jpg", "images/1/869476.jpg", "images/1/869508.jpg", "images/2/1585264.jpg", "images/2/1585360.jpg", "images/2/1641134.jpg", "images/2/869510.jpg", "images/2/869516.jpg", "images/2/869533.jpg", "images/2/869541.jpg", "images/2/869548.jpg", "images/2/872532.jpg", "images/2/925010.jpg", "images/2/925077.jpg", "images/2/928203.jpg", "images/2/929016.jpg", "images/2/930241.jpg", "images/3/1712289.jpg", "images/3/1829772.jpg", "images/3/2036766.jpg", "images/3/2086307.jpg", "images/3/2091847.jpg", "images/3/2171006.jpg", "images/3/2171910.jpg", "images/3/2187391.jpg", "images/3/2316690.jpg", "images/3/2324402.jpg", "images/3/2325775.jpg", "images/3/2365903.jpg", "images/3/2371520.jpg", "images/3/2372627.jpg"];
	}

	function getMovies2() {
		return getMovies().reduce(function (a, movie) {
			return a.concat(getMovies());
		}, []);
	}

	function getMovies3() {
		return getMovies2().reduce(function (a, movie) {
			return a.concat(getMovies());
		}, []);
	}

	function BoxArt() {
		this.div = $("<div class='box-art'></div>");
		this.img = $("<img></img>");
		this.div.append(this.img);
	}

	BoxArt.prototype.load = function (url) {
		var self = this;
		return Rx.Observable.defer(function () {
			var obs = self.img.loadAsObservable()
				.take(1)
				.publishLast();
			obs.connect();
			self.img.attr("src", url);
			return obs;
		});
	}

	function BoxColor() {
		this.div = $("<div class='box-art border'></div>").css('border-width', 10);
	}

	BoxColor.prototype.load = function (color) {
		this.div.css('border-color', color);
		return Rx.Observable.empty();
	}

	BoxColor.prototype.update = function () {
		return Rx.Observable.empty();
	}

	function initLargestOfLast(Rx) {
		Rx.Observable.prototype.largestOfLast = function (count, largestSelector) {
			var list = [];
			return this.scan(list, function (list, e) {
				list.unshift(e);
				return list;
			})
				.map(function (xs) { return xs[0]; })
				.skipLast(Number(count > 0))
				.concat(Rx.Observable.defer(function () {
					list.length = Math.max(Math.min(list.length, count), 0);
					return list.length > 0 ?
						Rx.Observable.return(largestSelector(list)) :
						Rx.Observable.empty();
				}));
		}
	}

	function initScanVelocity(Rx) {
		Rx.Observable.prototype.scanVelocity = function (xS, yS) {
			if (typeof xS !== 'function')
				xS = function (m) { return m.x; };
			if (typeof yS !== 'function')
				yS = function (m) { return m.y; };
			return this
				.timeInterval()
				.scan(function (memo, latest) {
					var event = latest.value,
						interval = latest.interval,
						mx = xS(memo.value),
						my = yS(memo.value),
						ex = xS(event),
						ey = yS(event),
						vx = (ex - mx) / interval,
						vy = (ey - my) / interval;
					event.velocity = Math.abs(
						Math.sqrt((ex * ex) + (ey * ey)) -
						Math.sqrt((mx * mx) + (my * my))
					);
					event.angle = Math.atan2(vy, vx);
					return latest;
				})
				.skip(1)
				.select(function (wrapper) {
					return wrapper.value;
				});
		}
	}

	function initConcatFriction(Rx) {
		Rx.Observable.prototype.concatFriction = function (u, xS, yS, vS, aS) {

			if (typeof xS !== 'function')
				xS = function (m) { return m.x; };
			if (typeof yS !== 'function')
				yS = function (m) { return m.y; };
			if (typeof vS !== 'function')
				vS = function (m) { return m.velocity; };
			if (typeof aS !== 'function')
				aS = function (m) { return m.angle; };

			var latest = null;

			return this
				.doAction(saveLatest)
				.concat(Rx.Observable.defer(fakeDrags));

			function saveLatest(val) { latest = val; };
			function fakeDrags() {

				if (latest == null) return Rx.Observable.empty();

				var deceleration = Math.abs(u * 9.8);

				return Rx.Observable.create(function (observer) {
					// var scheduler = Rx.Scheduler.timeout;
					var scheduler = Rx.Scheduler.requestAnimationFrame;
					return scheduler.scheduleRecursive(function (reschedule) {
						observer.onNext(0);
						reschedule();
					});
				})
					.scan(latest, decelerate)
					.takeWhile(hasVelocity);

				function decelerate(memo, b) {
					var v = vS(memo),
						a = aS(memo),
						vx = v * Math.cos(a),
						vy = v * Math.sin(a),
						x = xS(memo) + vx,
						y = yS(memo) + vy;
					v -= deceleration;
					return {
						x: x,
						y: y,
						angle: a,
						velocity: v
					};
				}

				function hasVelocity(drag) {
					return drag.velocity > 0;
				}
			}
		}
	}
})();