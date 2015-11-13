// Define module OxGrid
'use strict';

/* globals PIXI */
/* jshint browserify: true */

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
        this._graphics.scale.x = conf.scale.x;
        this._graphics.scale.y = conf.scale.y;

        this.scale = conf.scale;
        this.size  = conf.size;

        this.coordinateSystem = new OxCoordinate.System(this.size, this.scale, this.position);

        this.cells = [];
        for (var iy = 0; iy < this.size.h; ++iy) {
            for (var ix = 0; ix < this.size.w; ++ix) {

                var cellPixelCoord  = this.coordinateSystem.offset.toPixelCoordinates(  {i:ix, j:iy} );
                var cellLinearCoord = this.coordinateSystem.offset.toLinearCoordinates( {i:ix, j:iy} );
                var color = (model!==null) ? model[cellLinearCoord].color : (0xffffff);
                var cell     = new OxCell(     cellPixelCoord,
                                                this.scale,
                                                color,
                                                conf.cell
                                            );
                this._graphics.addChild(cell._graphics);
                this.cells.push(cell);
            }
        }
    }

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