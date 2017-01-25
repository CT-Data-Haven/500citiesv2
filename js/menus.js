function makeMenus(csv) {
    var byTopic = d3.nest()
        .key(function(d) { return d.Category; })
        .entries(csv);

    var nested = d3.nest()
        .key(function(d) { return d.Short_Question_Text; })
        .entries(csv);
    nested.map(function(d) {
        d.Id = d.values[0].MeasureId;
        d.Measure = d.values[0].Measure;
        d.Category = d.values[0].Category;
    });

    d3.select('#topicMenu')
        .selectAll('option')
        .data(byTopic)
        .enter().append('option')
            .attr('value', function(d) { return d.key; })
            .text(function(d) { return d.key; });

    $('#topicMenu').on('change', {nested: nested}, changeTopic);
    $('#indicMenu').on('change', changeIndicator);
    $('#topicMenu').change();
}


function changeTopic(event) {
    var topic = this.value;
    d3.select('.topic-header').text('Category: ' + topic);

    var nested = event.data.nested;
    var filtered = nested.filter(function(d) { return d.Category === topic; });

    $('#indicMenu').empty();
    var options = d3.select('#indicMenu')
        .selectAll('option')
        .data(filtered)
        .enter().append('option')
            .attr('value', function(d) { return d.Id; })
            .attr('data-measure', function(d) { return d.Measure; })
            .text(function(d) { return d.key; });

    $('#indicMenu').change();
}

function changeIndicator(event) {
    var s = d3.select(this).node();
    var indicatorId = s.options[s.selectedIndex].value;
    var indicatorText = s.options[s.selectedIndex].dataset.measure;
    d3.selectAll('.indic-header').text('Indicator: ' + indicatorText);

    map.colorMap(indicatorId);
    dots.updateDots(indicatorId);
}





// function initMenus(csv) {
//     var byTopic = d3.nest()
//         .key(function(d) { return d.Category; })
//         .entries(csv);
//     d3.select('#topicMenu')
//         .selectAll('option')
//         .data(byTopic)
//         .enter().append('option')
//             .attr('value', function(d) { return d.key; })
//             .text(function(d) { return d.key; });
//     $('#topicMenu').on('change', {csv: csv}, changeTopic);
//     $('#indicMenu').on('change', changeIndicator);
//     $('#topicMenu').change();
// }
//
// function changeTopic(event) {
//     var topic = this.value;
//     d3.select('.topic-header').text(topic);
//     $('#indicMenu').empty();
//
//     var csv = event.data.csv;
//
//     var filtered = csv.filter(function(d) { return d.Category === topic; });
//     var nested = d3.nest()
//         .key(function(d) { return d.Short_Question_Text; })
//         .entries(filtered);
//     d3.select('#indicMenu')
//         .selectAll('option')
//         .data(nested)
//         .enter().append('option')
//             .attr('value', function(d) { return d.key; })
//             .text(function(d) { return d.key; });
//     // console.log(nested);
//     $('#indicMenu').change();
// }
//
// function changeIndicator(event) {
//     var indicator = this.value;
//     console.log(indicator);
//     $('.indic-header').text(indicator);
//
//     // need to pass nested data?
//     // scaleCities(nested, indicator);
// }
