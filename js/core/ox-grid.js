// Define module OxGrid
'use strict';

/* globals PIXI */
/* jshint browserify: true */

var OxMath       = require('./ox-math.js');
var OxCell       = require('./ox-cell.js');
var OxCoordinate = require('./ox-coordinate.js');

module.exports = (function () {
    function Grid( conf, model ) {

        // ========================================================================
        // === Constructor       ==================================================
        // ========================================================================
        this.conf = conf;

        this._graphics = new PIXI.Graphics();
        this.position  = conf.position;
        // this._graphics.scale.x = conf.scale.x;
        // this._graphics.scale.y = conf.scale.y;

        this.scale = conf.scale;
        this.size  = conf.size;

        this.coordinateSystem = new OxCoordinate.System(this.size, this.scale, this.position);

        this.cells = [];
        for (var iy = 0; iy < this.size.h; ++iy) {
            for (var ix = 0; ix < this.size.w; ++ix) {
                var cellOffsetCoord = {i:ix, j:iy};
                var cellPixelCoord  = this.coordinateSystem.offset.toPixelCoordinates( cellOffsetCoord );
                var cellLinearCoord = this.coordinateSystem.offset.toLinearCoordinates( cellOffsetCoord );
                
                var color = (model!==null) ? model[cellLinearCoord].color : (0xffffff);
                var cell = new OxCell.Cell( cellPixelCoord, this.scale, color, conf.cell);

                this._graphics.addChild(cell._graphics);
                this.cells.push(cell);
            }
        }
    }

    Grid.prototype.width = function () {
        return (this.size.w > 1) ?
            ((this.size.w*0.75+0.5) * OxMath.hexagonWidth) * this.scale.x :
            (OxMath.hexagonWidth * this.scale.x);
    };
    Grid.prototype.height = function () {
        return (this.size.h > 1) ?
        ((this.size.h+0.5) * this.scale.y * OxMath.hexagonHeight):
        ((this.size.h+1.0) * this.scale.y * OxMath.hexagonHeight);
    };

    Grid.prototype.centerAt = function (point) {
        var w, h;

        w = this.width();
        h = this.height();

        this.position = {
            x: point.x - w/2 + this.scale.x * OxMath.hexagonWidth/2,
            y: point.y - h/2 + this.scale.y * OxMath.hexagonHeight,
        }

        this.coordinateSystem.originPixelCoord.x = this.position.x;
        this.coordinateSystem.originPixelCoord.y = this.position.y;
        for (var iy = 0; iy < this.size.h; ++iy) {
            for (var ix = 0; ix < this.size.w; ++ix) {
                var cellOffsetCoord = {i:ix, j:iy};
                var cellPixelCoord  = this.coordinateSystem.offset.toPixelCoordinates(cellOffsetCoord);
                var cell            = this.getCell(cellOffsetCoord);

                cell._graphics.position.x = cellPixelCoord.x;
                cell._graphics.position.y = cellPixelCoord.y;
            }
        }


    };

    /**
     * The callback function will be provided the offsetCoordinates and the current
     * cell as arguments, in that order. The callback will use the grid as its this
     * variable.
     * @param  {[type]} fun [description]
     * @return {[type]}     [description]
     */
    Grid.prototype.applyToCells = function ( callback ) {
        var offsetCoord     ,
            linearCoord     ,
            cell            ;

        for (var i = 0; i < this.conf.size.w; ++i) {
            for (var j = 0; j < this.conf.size.h; ++j) {
                offsetCoord = {i:i, j:j};
                linearCoord = this.coordinateSystem.toLinearCoordinates(offsetCoord);
                cell        = this.getCell(offsetCoord);

                callback.call(this, offsetCoord, linearCoord, cell);

            }
        }
    };

    Grid.prototype.draw = function () {
        // TODO: clear first
        for (var key in this.cells) {
            var obj = this.cells[key];
            obj.draw();
        }
    };

    Grid.prototype.drawCell = function ( cell ) {
        cell.draw();
    };

    Grid.prototype.getCell = function ( coordinate ) {
        var offsetCoord = this.coordinateSystem.toOffsetCoordinates(coordinate);

        if (offsetCoord.i < 0 || offsetCoord.i >= this.size.w) {return null;}
        if (offsetCoord.j < 0 || offsetCoord.j >= this.size.h) {return null;}

        var index = offsetCoord.i + offsetCoord.j * this.size.w;
        
        if (index > 0 || index < this.cells.length) {
            return this.cells[index];    
        }

        return null;
    };

    Grid.prototype.renderWith = function ( renderer ) {
        renderer.render(this._graphics);
    };

    Grid.prototype.highlightCells = function () {

    };

    return Grid;
}());