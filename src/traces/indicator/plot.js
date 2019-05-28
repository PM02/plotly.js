/**
* Copyright 2012-2019, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var d3 = require('d3');
var Lib = require('../../lib');
var Drawing = require('../../components/drawing');
// var svgTextUtils = require('../../lib/svg_text_utils');
//
// // arc cotangent
// function arcctg(x) { return Math.PI / 2 - Math.atan(x); }

var DIRSYMBOL = {
    increasing: '▲',
    decreasing: '▼'
};

module.exports = function plot(gd, cdModule, transitionOpts, makeOnCompleteCallback) {
    var fullLayout = gd._fullLayout;
    var onComplete;

    // If transition config is provided, then it is only a partial replot and traces not
    // updated are removed.
    var hasTransition = transitionOpts && transitionOpts.duration > 0;

    if(hasTransition) {
        if(makeOnCompleteCallback) {
            // If it was passed a callback to register completion, make a callback. If
            // this is created, then it must be executed on completion, otherwise the
            // pos-transition redraw will not execute:
            onComplete = makeOnCompleteCallback();
        }
    }

    // Compute aspect ratio
    // var aspectratio = fullLayout._size.w / fullLayout._size.h;
    // var theta = arcctg(aspectratio / 2);

    Lib.makeTraceGroups(fullLayout._indicatorlayer, cdModule, 'trace').each(function(cd) {
        var plotGroup = d3.select(this);
        var cd0 = cd[0];
        var trace = cd0.trace;

        var hasTicker = trace.ticker.showticker;

        var fmt = d3.format('.3s');
        var tickerPercentFmt = d3.format('2%');

        // var size = fullLayout._size;
        var domain = trace.domain;
        var size = Lib.extendFlat({}, fullLayout._size, {
            w: fullLayout._size.w * (domain.x[1] - domain.x[0]),
            h: fullLayout._size.h * (domain.y[1] - domain.y[0]),
            l: Math.max(fullLayout._size.l, fullLayout.width * domain.x[0]),
            r: Math.max(fullLayout._size.r, fullLayout.width * (1 - domain.x[1])),
            t: Math.max(fullLayout._size.t, fullLayout.height * domain.y[0]),
            b: Math.max(fullLayout._size.b, fullLayout.height * (1 - domain.y[0]))
        });
        var centerX = size.l + size.w / 2;

        // bignumber
        var isBigNumber = trace.mode === 'bignumber';

        // trendline
        var hasSparkline = trace.mode === 'sparkline';
        if(hasSparkline) isBigNumber = true;

        // gauge related
        var isGauge = trace.mode === 'gauge';
        var theta = Math.PI / 2;
        var radius = Math.min(size.w / 2, size.h * 0.75);
        var innerRadius = 0.75 * radius;
        var isWide = !(size.h > radius);

        function valueToAngle(v) {
            var angle = (v / trace.max) * Math.PI - Math.PI / 2;
            if(angle < -theta) return -theta;
            if(angle > theta) return theta;
            return angle;
        }

        var verticalMargin, mainFontSize, tickerFontSize, gaugeFontSize;
        if(isGauge) {
            verticalMargin = size.t + size.h;
            if(!isWide) verticalMargin -= (size.h - radius) / 2;
            // TODO: check formatted size of the number
            mainFontSize = Math.min(2 * innerRadius / (trace.max.toString().length));
            tickerFontSize = 0.35 * mainFontSize;
        }
        if(isBigNumber) {
            // Center the text
            mainFontSize = Math.min(size.w / (trace.max.toString().length), size.h / 2);
            verticalMargin = size.t + size.h / 2;
            tickerFontSize = 0.5 * mainFontSize;
        }
        gaugeFontSize = 0.25 * mainFontSize;

        plotGroup.each(function() {
            var data;
            // Draw trendline
            data = cd.filter(function() {return hasSparkline;});
            var x = d3.scale.linear().domain([trace.min, cd0.historical.length - 1]).range([0, size.w]);
            var y = d3.scale.linear().domain([trace.min, trace.max]).range([size.h, 0]);
            var line = d3.svg.line()
              .x(function(d, i) { return x(i);})
              .y(function(d) { return y(d);});
            var sparkline = d3.select(this).selectAll('path.sparkline').data(data);
            sparkline.enter().append('svg:path').classed('sparkline', true);
            sparkline
              .attr('d', line(cd0.historical))
              .style('fill', 'none')
              .style('stroke', 'rgba(255, 255, 255, 0.5)')
              .style('stroke-width', 2)
              .attr('transform', 'translate(' + size.l + ', ' + size.t + ')');
            sparkline.exit().remove();

            // bignumber
            var number = d3.select(this).selectAll('text.number').data(cd);
            number.enter().append('text').classed('number', true);

            number.attr({
                x: centerX,
                y: verticalMargin,
                'text-anchor': 'middle',
                'alignment-baseline': isGauge ? 'bottom' : 'middle'
            })
            .call(Drawing.font, trace.font)
            .style('font-size', mainFontSize);

            if(hasTransition) {
                number
                    .transition()
                    .duration(transitionOpts.duration)
                    .ease(transitionOpts.easing)
                    .each('end', function() { onComplete && onComplete(); })
                    .each('interrupt', function() { onComplete && onComplete(); })
                    .attrTween('text', function() {
                        var that = d3.select(this);
                        var i = d3.interpolateNumber(cd[0].lastY, cd[0].y);
                        return function(t) {
                            that.text(fmt(i(t)));
                        };
                    });
            } else {
                number.text(fmt(cd[0].y));
            }
            number.exit().remove();

            // Trace name
            var name = d3.select(this).selectAll('text.name').data(cd);
            name.enter().append('text').classed('name', true);
            name.attr({
                x: centerX,
                y: size.t + gaugeFontSize / 2,
                'text-anchor': 'middle',
                'alignment-baseline': 'middle'
            })
            .call(Drawing.font, trace.font)
            .style('font-size', gaugeFontSize)
            .text(trace.name);
            name.exit().remove();

            // Ticker
            data = cd.filter(function() {return hasTicker;});
            var ticker = d3.select(this).selectAll('text.ticker').data(data);
            ticker.enter().append('text').classed('ticker', true);
            ticker.attr({
                x: centerX,
                'text-anchor': 'middle',
                'alignment-baseline': 'middle'
            })
            .attr('y', function() {
                return isBigNumber ? size.t + size.h - tickerFontSize / 2 : verticalMargin + tickerFontSize;
            })
            .call(Drawing.font, trace.font)
            .style('font-size', tickerFontSize)
            .style('fill', function(d) {
                return d.delta > 0 ? 'green' : 'red';
            })
            .text(function(d) {
                var value = trace.ticker.showpercentage ? tickerPercentFmt(d.relativeDelta) : fmt(d.delta);
                return (d.delta > 0 ? DIRSYMBOL.increasing : DIRSYMBOL.decreasing) + value;
            });
            ticker.exit().remove();

            // Draw gauge
            data = cd.filter(function() {return isGauge;});
            var gauge = d3.select(this).selectAll('g.gauge').data(data);
            gauge.enter().append('g').classed('gauge', true);
            gauge.attr('transform', 'translate(' + fullLayout.width / 2 + ',' + verticalMargin + ')');

            // Draw gauge min and max
            var minText = gauge.selectAll('text.min').data(cd);
            minText.enter().append('text').classed('min', true);
            minText
                  .call(Drawing.font, trace.font)
                  .style('font-size', gaugeFontSize)
                  .attr({
                      x: - (innerRadius + radius) / 2,
                      y: gaugeFontSize,
                      'text-anchor': 'middle'
                  })
                  .text(fmt(trace.min));

            var maxText = gauge.selectAll('text.max').data(cd);
            maxText.enter().append('text').classed('max', true);
            maxText
                  .call(Drawing.font, trace.font)
                  .style('font-size', gaugeFontSize)
                  .attr({
                      x: (innerRadius + radius) / 2,
                      y: gaugeFontSize,
                      'text-anchor': 'middle'
                  })
                  .text(fmt(trace.max));

            var arcPath = d3.svg.arc()
                  .innerRadius(innerRadius).outerRadius(radius)
                  .startAngle(-theta);

            // Draw background
            var bgArc = gauge.selectAll('g.bgArc').data(cd);
            bgArc.enter().append('g').classed('bgArc', true).append('path');
            bgArc.select('path').attr('d', arcPath.endAngle(theta))
                  .style('fill', trace.gauge.background.color)
                  .style('stroke', trace.gauge.background.line.color)
                  .style('stroke-width', trace.gauge.background.line.width);
            bgArc.exit().remove();

            // Draw target
            var thetaTarget = -theta;
            if(trace.target) thetaTarget = valueToAngle(trace.target);
            var targetArc = gauge.selectAll('g.targetArc').data(cd);
            targetArc.enter().append('g').classed('targetArc', true).append('path');
            targetArc.select('path').attr('d', arcPath.endAngle(thetaTarget))
                  .style('fill', trace.gauge.target.color)
                  .style('stroke', trace.gauge.target.line.color)
                  .style('stroke-width', trace.gauge.target.line.width);
            targetArc.exit().remove();

            // Draw foreground with transition
            var fgArc = gauge.selectAll('g.fgArc').data(cd);
            fgArc.enter().append('g').classed('fgArc', true).append('path');

            var fgArcPath = fgArc.select('path');
            if(hasTransition) {
                fgArcPath
                      .transition()
                      .duration(transitionOpts.duration)
                      .ease(transitionOpts.easing)
                      .each('end', function() { onComplete && onComplete(); })
                      .each('interrupt', function() { onComplete && onComplete(); })
                      .attrTween('d', arcTween(arcPath, valueToAngle(cd[0].lastY), valueToAngle(cd[0].y)));
            } else {
                fgArcPath
                      .attr('d', arcPath.endAngle(valueToAngle(cd[0].y)));
            }
            fgArcPath
                  .style('fill', trace.gauge.value.color)
                  .style('stroke', trace.gauge.value.line.color)
                  .style('stroke-width', trace.gauge.value.line.width);
            fgArc.exit().remove();
        });
    });
};

// Returns a tween for a transition’s "d" attribute, transitioning any selected
// arcs from their current angle to the specified new angle.
function arcTween(arc, endAngle, newAngle) {
    return function() {
        var interpolate = d3.interpolate(endAngle, newAngle);
        return function(t) {
            return arc.endAngle(interpolate(t))();
        };
    };
}
