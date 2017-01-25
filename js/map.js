function choropleth() {
    var width = 740;
    var height = 480;
    var data = {};
    // var stateJson, cityJson, tractJson, cityCsv, tractCsv;
    var svg;
    var g;
    var state, proj, path;
    var isZoomed = false; // true after clicking on a city
    var tractTip;


    function chart(selection) {
        svg = selection
            .append('svg')
            // .attr('width', width)
            // .attr('height', height)
            .attr('width', '100%')
            .attr('viewBox', '0 0 ' + width + ' ' + height);
        g = svg.append('g')
            .attr('width', width)
            .attr('height', height);

        setupMap();
    }

    function setupMap() {
        state = topojson.feature(data.stateJson, data.stateJson.objects.state);

        // from Learning D3.js Mapping on packtlib
        proj = d3.geoMercator();
        path = d3.geoPath().projection(proj);
        proj.scale(1).translate([0, 0]);

        var b = path.bounds(state);
        // bounding box comes as array [[left, bottom], [right, top]]
        var s = 0.95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
        var t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];
        proj.scale(s).translate(t);

        // make tiles
        var tiler = d3.tile().size([width, height]);

        g.selectAll('g.tile')
            .data(tiler.scale(proj.scale() * 2 * Math.PI).translate(proj([0, 0])))
            .enter().append('g')
                .attr('class', 'tile')
                .each(function(d) {
                    var tileG = d3.select(this);

                    d3.json('https://tile.mapzen.com/mapzen/vector/v1/roads/' + d[2] + '/' + d[0] + '/' + d[1] + '.json?api_key=mapzen-a4SLVBh', function(error, tiles) {
                        if (error) throw error;
                        tileG.selectAll('path.vectorPaths')
                            .data(tiles.features.sort(function(a, b) { return a.properties.sort_key - b.properties.sort_key; }))
                            .enter().append('path')
                                .attr('class', function(d) {
                                    return 'vectorPaths ' + d.properties.kind;
                                })
                                .attr('d', path);
                    });
                });

        drawState();
        drawTracts();
        drawCities();
    }

    function drawState() {
        var ct = g.append('g')
            .selectAll('path.state')
            .data(state.features)
            .enter().append('path')
                .attr('d', path)
                .attr('class', 'state')
                .on('click', reset);
        d3.select('#reset').on('click', reset);
    }

    function drawTracts() {
        var tracts = g.append('g')
            .selectAll('path.tract')
            .data(topojson.feature(data.tractJson, data.tractJson.objects.tracts_fips).features)
            .enter().append('path')
                .attr('d', path)
                .attr('class', 'tract');

        var uniquefips = [];
        data.tractJson.objects.tracts_fips.geometries.forEach(function(d) {
            if (uniquefips.indexOf(d.properties.CityName) === -1) {
                uniquefips.push(d.properties.CityName);
            }
        });

        var cityBlobs = uniquefips.map(function(city) {
            var geo = topojson.merge(data.tractJson, data.tractJson.objects.tracts_fips.geometries.filter(function(d) {
                return d.properties.CityName === city;
            }));
            geo.CityName = city;
            return geo;
        });

        // draw merged geos
        g.append('g')
            .selectAll('path.city-blob')
            .data(cityBlobs)
            .enter().append('path')
                .attr('class', 'city-blob')
                .attr('d', path)
                .attr('id', function(d) { return 'city' + d.CityName.replace(' ', ''); });
        svg.append('g')
            .attr('class', 'legendQuant')
            .attr('transform', 'translate(' + (width - 250) + ',' + (height - 60) + ')');

        tractTip = d3.tip()
            .attr('class', 'd3-tip dark-tip')
            .attr('id', 'tractTip');
    }

    function drawCities() {
        var cityTip = d3.tip()
            .attr('class', 'd3-tip')
            .attr('id', 'cityTip');
            // .html(function(d) { return d.properties.CityName; });
        cityTip.offset([-6, 10]); // seems reversed?

        var circles = g.append('g')
            .selectAll('circle.city')
            .data(topojson.feature(data.cityJson, data.cityJson.objects.Cities).features)
            .enter().append('circle')
                .attr('cx', function(d) { return proj(d.geometry.coordinates)[0]; })
                .attr('cy', function(d) { return proj(d.geometry.coordinates)[1]; })
                .attr('r', 30)
                .attr('class', 'city');
        circles.call(cityTip);
        circles.on('mouseover', mouseoverCity)
                .on('mouseout', mouseoutCity)
                .on('click', toggleZoom);

        // info box of what city is zoomed in, plus its value
        // seems too cluttered
        // svg.append('text')
        // d3.select('#map')
        //     .append('div')
        //     .attr('id', 'cityRate')
        //     .attr('class', 'dark-tip');
            // .attr('transform', 'translate(20, 10)');

        function mouseoverCity(circle) {
            if (!isZoomed) {
                var cityName = circle.properties.CityName;
                var dot = d3.select('#' + cityName.replace(' ', '') + 'Dot');
                d3.select(this).classed('city-hover', true);
                dot.classed('hilite', true);

                var val = d3.format('.0%')(dot.data()[0].Data_Value);
                cityTip.html(cityName + ': ' + val);
                cityTip.show();

                // call dotTip.show() in dots.js

            }
        }
        function mouseoutCity(circle) {
            d3.select(this).classed('city-hover', false);
        // if (!isZoomed) {
            cityTip.html('');
            cityTip.hide();
        // }
            var cityName = circle.properties.CityName;
            if (!isZoomed) {
                d3.select('#' + cityName.replace(' ', '') + 'Dot')
                    .classed('hilite', false);
            }


            // call dotTip.hide() in dots.js
        }

    }

    function toggleZoom(city) {
        var circle = d3.select(this);
        if (isZoomed) {
            // circle.classed('city-nofill', false);
            return reset();
        }
        isZoomed = true;
        d3.selectAll('.city')
            .classed('.city-hover', false);
        d3.select('#cityTip').style('display', 'none');
        // var circle = d3.select(this)
        circle.classed('city-nofill', true);
        var cityName = city.properties.CityName.replace(' ', '');

        // zoom to bounding box of city, e.g. #cityNewHaven
        var cityGeo = d3.select('#city' + cityName).data()[0];
        var bounds = path.bounds(cityGeo),
            dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2;
        var scale = 0.9 / Math.max(dx / width, dy / height);
        var translate = [width / 2 - scale * x, height / 2 - scale * y];

        g.transition()
            .duration(600)
            .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')' +
                    'scale(' + scale + ')' +
                    'translate(' + (-x) + ',' + (-y) + ')'
            );
        d3.selectAll('.tract').classed('zoomed', true);
        d3.selectAll('.city-blob').classed('zoomed', true);

        d3.select('#' + cityName + 'Dot')
            .classed('hilite', true);

        // console.log(city.properties);
        // d3.select('#cityRate')
        //     .text(city.properties.CityName + ' city-wide: ' + city.properties.Data_Value);
        d3.select('#reset').classed('hidden', false);
    }

    function reset() {
        d3.selectAll('.city').classed('city-nofill', false);
        d3.selectAll('city-blob').classed('zoomed', false);
        g.transition()
            .duration(600)
            .attr('transform', '');
        d3.select('#cityTip').style('display', 'block');
        d3.selectAll('.dot')
            .classed('hilite', false);
        d3.select('#reset').classed('hidden', true);

        isZoomed = false;
    }

/////////////// public function

    chart.colorMap = function(indicatorId) {
        var nested = d3.nest()
            .key(function(d) { return d.MeasureId; })
            .map(data.tractCsv);

        var indicatorVals = nested.get(indicatorId);
        // use jenks breaks from simple-statistics
        var vals = indicatorVals.map(function(d) { return +d.Data_Value; });
        var breaks = ss.ckmeans(vals, 7).map(function(val) { return val[0]; }).slice(1);

        var color = d3.scaleThreshold()
            .domain(breaks)
            .range(d3.schemeGnBu[7]);

        var mapData = {};
        indicatorVals.forEach(function(d) {
            mapData[d.TractFIPS] = +d.Data_Value;
        });
        var tracts = d3.selectAll('.tract')
            // .transition()
            // .duration(100)
            .attr('fill', function(d) {
                // var value = mapData[d.properties.GEOID].value;
                var value = mapData[d.properties.GEOID];

                if (typeof value === 'undefined') {
                    return '#bbb';
                } else {
                    return color(value);
                }
            });

        // draw legend
        // try appending straight to svg to keep in corner

        var legend = d3.legendColor()
            .labelFormat(d3.format('.0%'))
            .labels(thresholdLabels)
            .useClass(false)
            .shapeWidth(30)
            .orient('horizontal')
            // .labelAlign('center')
            .scale(color);
        var legendG = svg.select('.legendQuant');

        legendG.call(legend);
        legendG.selectAll('text.label')
            .attr('transform', 'translate(35, 30)');


        // tooltip
        // var tractTip = d3.tip()
        //     .attr('class', 'd3-tip dark-tip')
        //     .attr('id', 'tractTip');

        tracts.call(tractTip);
        tracts.on('mouseover', mouseoverTract)
            .on('mouseout', mouseoutTract);

        function mouseoverTract(tract) {
            if (isZoomed) {
                d3.select(this).classed('tract-hover', true);
                tractTip.html(function() {
                    var value = mapData[tract.properties.GEOID];
                    if (typeof value === 'undefined') {
                        return 'N/A';
                    } else {
                        return d3.format('.0%')(value);
                    }
                });
                tractTip.show();
            }
        }
        function mouseoutTract(tract) {
            d3.select(this).classed('tract-hover', false);
            // if (isZoomed) {
                tractTip.html('');
                tractTip.hide();
            // }

        }

    };

    function thresholdLabels(l) {
        var val = l.domain[l.i];
        return val ? d3.format('.0%')(val) : '';
    }


    // getters & setters
    chart.width = function(_) {
        if (!arguments.length) { return width; }
        width = _;
        return chart;
    };

    chart.height = function(_) {
        if(!arguments.length) { return height; }
        height = _;
        return chart;
    };

    chart.data = function(_) {
        if (!arguments.length) { return data; }
        data = _;
        return chart;
    };

    return chart;
}



//
//
// function drawMap(stateJson, cityJson, tractJson, cityCsv, tractCsv) {
//
//     var width = 960;
//     var height = 600;
//
//     var svg = d3.select('#map')
//         .append('svg')
//         .attr('width', width)
//         .attr('height', height)
//         .attr('id', 'mapsvg');
//
//     var state = topojson.feature(stateJson, stateJson.objects.state);
//
//     // from Learning D3.js Mapping on packtlib
//     var proj = d3.geoMercator();
//     var path = d3.geoPath().projection(proj);
//     proj.scale(1).translate([0, 0]);
//
//     var b = path.bounds(state);
//     // bounding box comes as array [[left, bottom], [right, top]]
//     var s = 0.95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
//     var t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];
//     proj.scale(s).translate(t);
//
//     drawState();
//     drawPolygons(tractJson);
//
//
//
//
// /////////////////////////////////////////////////////////////
//
//     function drawState() {
//         var tiler = d3.tile().size([width, height]);
//
//         d3.select('#mapsvg')
//             .selectAll('g')
//             .data(tiler.scale(proj.scale() * 2 * Math.PI).translate(proj([0, 0])))
//             .enter().append('g')
//                 .each(function(d) {
//                     var g = d3.select(this);
//
//                     d3.json('https://tile.mapzen.com/mapzen/vector/v1/roads/' + d[2] + '/' + d[0] + '/' + d[1] + '.json?api_key=mapzen-a4SLVBh', function(error, tiles) {
//                         if (error) throw error;
//                         g.selectAll('path')
//                             .data(tiles.features.sort(function(a, b) { return a.properties.sort_key - b.properties.sort_key; }))
//                             .enter().append('path')
//                                 .attr('class', function(d) {
//                                     return d.properties.kind;
//                                 })
//                                 .attr('d', path);
//                     });
//                 });
//
//         svg.append('g')
//             .selectAll('path')
//             .data(state.features)
//             .enter().append('path')
//                 .attr('d', path)
//                 .attr('class', 'state');
//     }
//
//     function drawPolygons(json) {
//         var svg = d3.select('#mapsvg');
//     }
//
// }
//
// function colorMap() {
//
// }
