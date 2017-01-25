//////////// global variables--as few as possible
var map, dots;


d3.queue()
    .defer(d3.json, 'json/state.json')
    .defer(d3.json, 'json/cities.json')
    .defer(d3.json, 'json/tracts_fips.json')
    .defer(d3.csv, 'data/cities.csv')
    .defer(d3.csv, 'data/tracts.csv')
    .defer(d3.csv, 'data/menus.csv')
    .awaitAll(init);

function init(error, files) {
    if (error) throw error;

    map = choropleth()
        // .width(740)
        // .height(480)
        .data({stateJson: files[0],
            cityJson: files[1],
            tractJson: files[2],
            cityCsv: files[3],
            tractCsv: files[4]
            // cityCsv: cityCsv,
            // tractCsv: tractCsv
        });
    d3.select('#map').call(map);

    dots = dotplot()
        .data({
            cityCsv: files[3],
            tractCsv: files[4]
            // cityCsv: cityCsv,
            // tractCsv: tractCsv
        });
    d3.select('#dots').call(dots);

    // do this later
    makeMenus(files[5]);
}


// make data available to other scripts from setup.js; other scripts built as var barchart = function() { 'use strict'; ... return chart; }
// look at http://backstopmedia.booktype.pro/developing-a-d3js-edge/6-load-and-prep-the-data/
