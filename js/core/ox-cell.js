// Define module OxCell
'use strict';

/* jshint browserify: true */
/* globals PIXI */

var OxMath  = require('./ox-math.js');
var OxColor = require('./ox-color.js');

module.exports = (function () {

    function Cell( position, scale, color, conf) {
        this._graphics = new PIXI.Graphics();
        this._graphics.position.x = position.x;
        this._graphics.position.y = position.y;
        this._graphics.scale.x = scale.x;
        this._graphics.scale.y = scale.y;
        this.color = color;

        this.radialVertexLines     = [];
        this.radialVertexLineWidth = 0;
        this.radialVertexLineColor = 0;

        this.radialSideLines     = [];
        this.radialSideLineWidth = 0;
        this.radialSideLineColor = 0;

        this.edges     = [];
        this.edgeWidth = 0;
        this.edgeColor = 0;

        this.stroke      = false;
        this.strokeWidth = 0;
        this.strokeColor = 0;

        if (conf) {
            this.radialVertexLines     = [];
            this.radialVertexLineWidth = conf.radial.vertex.width;
            this.radialVertexLineColor = conf.radial.vertex.color;

            this.radialSideLines     = [];
            this.radialSideLineWidth = conf.radial.side.width;
            this.radialSideLineColor = conf.radial.side.color;

            this.edges     = [];
            this.edgeWidth = conf.edge.width;
            this.edgeColor = conf.edge.color;

            this.stroke      = conf.stroke.color !== undefined;
            this.strokeWidth = conf.stroke.width;
            this.strokeColor = conf.stroke.color;
        }

        this._colorStack = [];

        this.isHighlighted = false;
    }

    Cell.prototype._pushColor = function (newColor) {
        this._colorStack.push(this.color);
        this.color = newColor;
    };
    Cell.prototype._popColor = function () {
        if (this._colorStack) {
            this.color = this._colorStack.pop();
        }
    };

    Cell.prototype.highlight = function (doHighlight) {
        if (doHighlight === undefined) {
            this.isHighlighted = !this.isHighlighted;
        } else if (doHighlight) {
            this.isHighlighted = true;
        } else {
            this.isHighlighted = false;
        }
        this.draw();
        // TODO: Signal dirty cell
    };

    Cell.prototype.draw = function () {
        var color,
            line,
            iLine,
            edge,
            edgeShape,
            iEdge;
        if (this.isHighlighted) {
            color = OxColor.brighten(this.color);
        } else {
            color = this.color;
        }

        // Main hexagon
        this._graphics.clear(); // Important, otherwise mem-consumption will explode!
        this._graphics.beginFill(color);
        this._graphics.drawShape(OxMath.hexShape);
        this._graphics.endFill();

        // Radial lines to vertecies
        if (this.radialVertexLines.length) {
            this._graphics.beginFill(this.radialVertexLineColor);
            for (iLine = this.radialVertexLines.length - 1; iLine >= 0; --iLine) {
                line      = this.radialVertexLines[iLine];
                edgeShape = OxMath.hexRadialLineVertex[line](this.radialVertexLineWidth);
                this._graphics.drawShape(edgeShape);
            }
            this._graphics.endFill();
        }

        // Radial lines to sides
        if (this.radialSideLines.length) {
            this._graphics.beginFill(this.radialSideLineColor);
            for (iLine = this.radialSideLines.length - 1; iLine >= 0; --iLine) {
                line      = this.radialSideLines[iLine];
                edgeShape = OxMath.hexRadialLineSide[line](this.radialSideLineWidth);
                this._graphics.drawShape(edgeShape);
            }
            this._graphics.endFill();
        }

        // Specific edges
        if (this.edges.length) {
            this._graphics.beginFill(this.edgeColor);
            for (iEdge = this.edges.length - 1; iEdge >= 0; --iEdge) {
                edge      = this.edges[iEdge];
                edgeShape = OxMath.hexEdge[edge](this.edgeWidth);
                this._graphics.drawShape(edgeShape);
            }
            this._graphics.endFill();
        }

        // Stroke
        if (this.stroke) {
            this._graphics.lineStyle( this.strokeWidth, this.strokeColor, 1 );
            this._graphics.drawShape( OxMath.hexShape );
            this._graphics.lineStyle( this.strokeWidth, this.strokeColor, 0 );
        }

        // Text
    };

    Cell.prototype.renderWith = function ( renderer ) {
        renderer.render(this._graphics);
    };

    return Cell;
}());