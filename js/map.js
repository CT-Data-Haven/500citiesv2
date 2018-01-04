function choropleth() {

    var containterWidth = d3.select('#mapWrapper').style('width').replace('px', '');
    var containerHeight = d3.select('#mapWrapper').style('height').replace('px', '');

    var width = Math.min(740, +containterWidth);
    var ratio = width / 740;
    var height = 480 * ratio + 20; // keep proportions
    var data = {};
    var svg, g;
    var state, proj, path;
    var isZoomed = false;
    var tractTip;
    var pi = Math.PI, tau = 2 * pi;
    var map;
    var tiler;
    var zoom;
    // making a class for state, city, tract outlines to call for redrawing on zoom
    var ct;
    var defaultZoom;


    function chart(selection) {
        map = selection
            .attr('class', 'map')
            .style('width', width + 'px')
            .style('height', height + 'px');
        map.append('div')
            .attr('class', 'layer')
            .attr('id', 'waterDiv');
        map.append('div')
            .attr('class', 'layer')
            .attr('id', 'roadDiv');
        svg = map.append('div')
            .attr('class', 'layer')
            .attr('id', 'shapeDiv')
            .append('svg')
            // .attr('width', '100%')
            // .attr('viewBox', '0 0 ' + width + ' ' + height);
            .attr('width', width)
            .attr('height', height);
        g = svg.append('g')
            .attr('width', width)
            .attr('height', height);

        setupMap();
    }

    function setupMap() {
        state = topojson.feature(data.stateJson, data.stateJson.objects.state);

        proj = d3.geoMercator()
            .scale(1 / tau)
            .translate([0, 0]);
        path = d3.geoPath().projection(proj);

        var center = proj([-72.75, 41.5]);

        tiler = d3.tile().size([width, height]);

        zoom = d3.zoom()
            .scaleExtent([1 << 16, 1 << 21])
            .on('zoom', callZoom);





        drawState();
        drawTracts();
        drawCities();

        // normally default scale = 115000, but need to get ratio with width

        var scale = ratio * 115000;

        defaultZoom = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-center[0], -center[1]);
        map.call(zoom)
            .call(zoom.transform, defaultZoom);
    }

    function drawState() {
        ct = g.append('g')
            .selectAll('path.state')
            .data(state.features)
            .enter().append('path')
                .attr('d', path)
                .attr('class', 'state redraw');
        d3.select('#reset').on('click', reset);
    }

    function drawTracts() {
        var tracts = g.append('g')
            .selectAll('path.tract')
            .data(topojson.feature(data.tractJson, data.tractJson.objects.tracts_fips).features)
            .enter().append('path')
                .attr('d', path)
                .attr('class', 'tract redraw');

        // build legend
        svg.append('g')
            .attr('class', 'legendQuant')
            .attr('transform', 'translate(' + (width - 250) + ',' + (height - 40) + ')');

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
        var cities = g.append('g')
            .selectAll('path.city-blob')
            .data(cityBlobs)
            .enter().append('path')
                .attr('class', 'city redraw')
                .attr('d', path)
                .attr('id', function(d) { return 'city' + d.CityName.replace(' ', ''); });
        cities.call(cityTip);
        cities.on('mouseover', mouseoverCity)
            .on('mouseout', mouseoutCity)
            // .on('touchend', mouseoverCity) // turning touch off so clicking can trigger zoom
            .on('click', toggleZoom);

        function mouseoverCity(city) {
            if (!isZoomed) {
                var cityName = city.CityName;
                var dot = d3.select('#' + cityName.replace(' ', '') + 'Dot');
                d3.select(this).classed('city-hover', true);
                dot.classed('hilite', true);

                var val = d3.format('.2p')(dot.data()[0].Data_Value);
                cityTip.html(cityName + ': ' + val);
                cityTip.show();
                // call dotTip.show() in dots.js
            }
        }
        function mouseoutCity(city) {
            d3.select(this).classed('city-hover', false);
        // if (!isZoomed) {
            cityTip.html('');
            cityTip.hide();
        // }
            var cityName = city.CityName;
            if (!isZoomed) {
                d3.select('#' + cityName.replace(' ', '') + 'Dot')
                    .classed('hilite', false);
            }
            // call dotTip.hide() in dots.js
        }
    }

    function callZoom() {
        var transform = d3.event.transform;

        var tiles = tiler
            .scale(transform.k)
            .translate([transform.x, transform.y])();

        proj
            .scale(transform.k / tau)
            .translate([transform.x, transform.y]);

        var layers = [
            {div: 'waterDiv', type: 'water'},
            {div: 'roadDiv', type: 'roads'}
        ];
        layers.forEach(function(layer) {
            var div = d3.select('#' + layer.div);
            var img = div
                .style('transform', stringify(tiles.scale, tiles.translate))
            // var img = tileHolder
                // .attr('transform', stringify(tiles.scale, tiles.translate))
                .selectAll('.tile')
                .data(tiles, function(d) { return d; });
            img.exit()
                .each(function(d) { this._xhr.abort(); })
                .remove();
            img.enter().append('svg')
            // img.enter().append('g')
                .attr('class', 'tile')
                .style('left', function(d) { return d[0] * 256 + 'px'; })
                .style('top', function(d) { return d[1] * 256 + 'px'; })
                .each(function(d) { this._xhr = render(d, this, layer.type); });
        });

        // redraw paths
        d3.selectAll('.redraw').attr('d', path);
    }

    function toggleZoom(city) {
        if (isZoomed) {
            // return reset();
            // don't want this bc need to be able to get tract tip on touch
        }
        isZoomed = true;
        d3.select('#cityTip').style('display', 'none');
        d3.select('#tractTip').style('display', 'block');
        var cityName = city.CityName.replace(' ', '');
        d3.selectAll('.city').classed('city-zoom', true);


        var bounds = path.bounds(city),
            dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2;
        var factor = 0.85 / Math.max(dx / width, dy / height);

        var current = d3.zoomTransform(d3.select('#map').node());

        var diff1 = [width / 2 - x, height / 2 - y];

        var t1 = d3.zoomIdentity
            .translate(current.x + diff1[0], current.y + diff1[1])
            .scale(current.k);

        map.transition().duration(100)
            .call(zoom.transform, t1);

        zoom.scaleBy(map, factor);
        var updated = d3.zoomTransform(d3.select('#map').node());
        // idk why I have to do this twice to get it to work
        bounds = path.bounds(city);
        x = (bounds[0][0] + bounds[1][0]) / 2;
        y = (bounds[0][1] + bounds[1][1]) / 2;
        diff2 = [width / 2 - x, height / 2 - y];

        t2 = d3.zoomIdentity
            .translate(updated.x + diff2[0], updated.y + diff2[1])
            .scale(updated.k);
        map.transition().duration(500)
            .call(zoom.transform, t2);


        d3.select('#' + cityName + 'Dot')
            .classed('hilite', true);
        d3.select('#reset').classed('hidden', false);
    }

    function reset() {
        d3.select('#cityTip').style('display', 'block');
        d3.select('#tractTip').style('display', 'none');
        d3.selectAll('.dot').classed('hilite', false);
        d3.select('#reset').classed('hidden', true);
        d3.selectAll('.city').classed('city-zoom', false);

        map.transition().duration(500)
            .call(zoom.transform, defaultZoom);

        isZoomed = false;
    }

    function render(d, node, layer) {

        var tile =  d3.json('https://tile.mapzen.com/mapzen/vector/v1/' + layer + '/' + d[2] + '/' + d[0] + '/' + d[1] + '.json?api_key=mapzen-a4SLVBh', function(error, tileJson) {
            if (error) throw error;

            var k = Math.pow(2, d[2]) * 256;
            var tilePath = d3.geoPath()
                .projection(d3.geoMercator()
                    .scale(k / tau)
                    .translate([k / 2 - d[0] * 256, k / 2 - d[1] * 256])
                    .precision(0));

            d3.select(node).selectAll('path')
                .data(tileJson.features.sort(function(a, b) { return a.properties.sort_key - b.properties.sort_key; }))
                .enter().append('path')
                    .attr('class', function(d) { return d.properties.kind; })
                    .attr('d', tilePath);
        });
        return tile;
    }

    function stringify(scale, translate) {
        var k = scale / 256;
        var r = scale % 1 ? Number : Math.round;
        return 'matrix3d(' + [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, r(translate[0] * scale), r(translate[1] * scale), 0, 1] + ')';
        // return 'translate(' + r(translate[0] * scale) + ',' + r(translate[1] * scale) + ') scale(' + k + ')';
    }

    // PUBLIC FUNCTIONS
    //////////////////////////////////////////

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
        function thresholdLabels(l) {
            var val = l.domain[l.i];
            return val ? d3.format('.0%')(val) : '';
        }
    };

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
