function dotplot() {
    var fullwidth = 740;
    var fullheight = 76;
    var data = {};
    var svg, g;
    var xscale, xaxis;
    var rmin = 8;
    var rmax = 12;
    var margin = {top: 6, right: 18, bottom: 12, left: 18};
    var width = fullwidth - margin.left - margin.right;
    var height = fullheight - margin.top - margin.bottom;
    var cityNest, tractNest;
    var dotTip;

    function chart(selection) {
        svg = selection
            .append('svg')
            // .attr('width', fullwidth)
            // .attr('height', fullheight);
            .attr('width', '100%')
            .attr('viewBox', '0 0 ' + fullwidth + ' ' + fullheight);
        g = svg.append('g')
            .attr('width', width)
            .attr('height', height)
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        setupDots();

    }

    chart.updateDots = function(indicatorId) {
        var tractVals = tractNest.get(indicatorId);
        var cityVals = cityNest.get(indicatorId);

        xscale.domain(d3.extent(tractVals, function(d) { return +d.Data_Value; }));

        var summary = [
			{type: 'min', Data_Value: d3.min(tractVals, function(d) { return d.Data_Value; })},
			{type: 'max', Data_Value: d3.max(tractVals, function(d) { return d.Data_Value; })},
			{type: 'median', Data_Value: d3.median(tractVals, function(d) { return d.Data_Value; })}
		];

        var summaryDots = g.selectAll('.summary')
            .data(summary);

        summaryDots.enter().append('circle')
            .attr('class', 'summary all-dot');

        summaryDots.transition()
            .ease(d3.easeCubic)
            .duration(500)
            .attr('cx', function(d) { return xscale(d.Data_Value); })
            .attr('cy', height / 3)
            .attr('r', rmax);
        summaryDots.exit().remove();

        var dots = g.selectAll('.dot')
            .data(cityVals);

        dots.enter().append('circle')
            .attr('id', function(d) { return d.CityName.replace(' ', '') + 'Dot'; })
            .attr('class', 'dot all-dot');
        dots.transition()
            .ease(d3.easeCubic)
            .duration(500)
            .attr('cx', function(d) { return xscale(d.Data_Value); })
            .attr('cy', height / 3)
            .attr('r', rmin);
        dots.exit().remove();

        g.select('.x.axis')
            .transition()
            .duration(500)
            .call(xaxis);
        g.select('.x.axis').exit().remove();

        // var dotTip = d3.tip()
        //     .attr('class', 'd3-tip dark-tip')
        //     .attr('id', 'dotTip')
        //     .html(function(d) {
        //         var name = d.CityName ? d.CityName : 'Tract ' + d.type;
        //         var val = d3.format('.0%')(d.Data_Value);
        //         return name + ': ' + val;
        //     });
        g.selectAll('.all-dot').call(dotTip);
        g.selectAll('.all-dot')
            .on('mouseover', dotTip.show)
            .on('mouseout', dotTip.hide);

        // var axis = g.append('g')
        //     .attr('class', 'x axis')
        //     .attr('transform', 'translate(0,' + (height - margin.top - margin.bottom) + ')')
        //     .call(xaxis);
    };

    function setupDots() {
        data.cityCsv.forEach(function(d) { d.Data_Value = +d.Data_Value; });
        data.tractCsv.forEach(function(d) { d.Data_Value = +d.Data_Value; });

        cityNest = d3.nest()
            .key(function(d) { return d.MeasureId; })
            .map(data.cityCsv);
        tractNest = d3.nest()
            .key(function(d) { return d.MeasureId; })
            .map(data.tractCsv);

        xscale = d3.scaleLinear()
            // .range([0, width])
			.range([margin.left, width - margin.right])
            .nice();
        xaxis = d3.axisBottom()
            .scale(xscale)
            .ticks(6, '%')
            .tickSize(-40)
            .tickSizeOuter(-20);

        g.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + (height - margin.top - margin.bottom) + ')')
            .call(xaxis);

        dotTip = d3.tip()
            .attr('class', 'd3-tip dark-tip')
            .attr('id', 'dotTip')
            .html(function(d) {
                var name = d.CityName ? d.CityName : 'Tract ' + d.type;
                var val = d3.format('.2p')(d.Data_Value);
                return name + ': ' + val;
            });

        // chart.updateDots(d3.select('#indicMenu').node().value);
        chart.updateDots('CHECKUP');
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

    // chart.triggerTipShow = function(id) {
    //     dotTip.show()
    // };

    return chart;
}
