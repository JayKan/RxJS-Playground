(function () {
    // find DOM elements
    var sampleImage = document.querySelector("#sample");
    var selectedColorsList = document.querySelector(".selected-colors");
    var actualColorDiv = document.querySelector(".actual-color");
    var actualColorLabel = document.querySelector(".actual-color-label");
    var canvas = document.createElement("canvas");

    init();

    var mouseMoveStream = Rx.Observable.fromEvent(sampleImage, "mousemove")
        .map(retrieveColorFromEvent);

    var clickStream = Rx.Observable.fromEvent(sampleImage, "mousedown")
        .map(retrieveColorFromEvent).distinctUntilChanged();

    mouseMoveStream.subscribe(function (color) {
        addActualColor(color);
    });

    clickStream.subscribe(function (color) {
        addSelectedColor(color);
    });

    function init(){
        canvas.width = sampleImage.clientWidth;
        canvas.height = sampleImage.clientHeight;
    }

    function retrieveColorFromEvent(event) {
        var point = {
            x: event.offsetX,
            y: event.offsetY
        };

        canvas.getContext('2d').drawImage(sampleImage, 0, 0, canvas.width, canvas.height);
        var pixelData = canvas.getContext('2d').getImageData(point.x, point.y, 1, 1).data;

        return "rgba(" + pixelData[0] + "," + pixelData[1] + "," + pixelData[2] + "," + pixelData[3] / 255 + ")";
    }

    function addActualColor(color) {
        actualColorDiv.style.backgroundColor = color;
        actualColorLabel.innerHTML = color;
    }

    function addSelectedColor(color) {
        selectedColorsList.innerHTML += '<li><div style="background-color: ' + color + '" title="' + color + '"></div></li>';
    }
}());
