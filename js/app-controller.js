// Define module Controller
'use strict';

/* globals PIXI */

/* jshint browserify: true */
/* jshint devel: true */

var OxMath   = require('./core/ox-math.js');
var OxGrid   = require('./core/ox-grid.js');
var AppModel = require('./app-model.js');

module.exports = (function () {

	function Controller () {

		this.model = null;
		
		this.grid = {
			source: null,
			target: null,
		}

		this.brushOffsetCoord = null;

		this.generateBrushes();

	}

	Controller.prototype.loadLevel = function (levelName, levelIndex) {
		
		var returnStatus;

		if (levelIndex === undefined) {
			levelIndex = 0;
		}

		this.levelName = levelName;
		this.levelIndex = levelIndex;

		// Load the level
		this.model = new AppModel();
		returnStatus = this.model.loadLevel(levelName, levelIndex);
		if (returnStatus === false) {
			console.log('ERR: Could not load level with level name "' +
				levelName +
				'".');
			return false;
		}

		//
		var cellConf = {
		stroke: {color:0x587058, width:0.1}, 
		edge  : {color:0xdd2222, width:0.2},
		radial: { vertex:{color:0xffcd00, width:0.18},
				  side  :{color:0xffcd00, width:0.3}}
	   };

		var gridConf = {
			source: {
				position : {x:0,y:0},
				scale    : {x:10,y:10},
				size     : {w:this.model.size.w,h:this.model.size.h},
				cell     : cellConf,
			},
			target: {
				position : {x:100,y:0},
				scale    : {x:10,y:10},
				size     : {w:this.model.size.w,h:this.model.size.h},
				cell     : cellConf,
			},
		};

		// Set up the two grids
		this.grid = {
			source: new OxGrid(gridConf.source, this.model.source),
			target: new OxGrid(gridConf.target, this.model.target),
		}

		// Set up text
		var textLevel  = new PIXI.Text('Level ' + levelName + ' - ' + levelIndex);
		var textTarget = new PIXI.Text('Target');
		var textSource = new PIXI.Text('Source');
		textLevel.anchor  = {x:0.5, y:0.5};
		textTarget.anchor = {x:0.5, y:0.5};
		textSource.anchor = {x:0.5, y:0.5};

		// Scene graph
		this.container = new PIXI.Container();
		this.container.addChild(this.grid.source._graphics);
		this.container.addChild(this.grid.target._graphics);
		this.container.addChild(textLevel);
		this.container.addChild(textTarget);
		this.container.addChild(textSource);

		// Layout
		this.grid.source.centerAt({x:125, y:150});
		this.grid.target.centerAt({x:375, y:150});
		textLevel.position  = {x:250, y:25};
		textTarget.position = {x:375, y:275};
		textSource.position = {x:125, y:275};

		this.draw();
	};

	Controller.prototype.loadNextLevel = function () {
		this.loadLevel(this.levelName, this.levelIndex+1);
	}

	Controller.prototype.showBrush = function (point) {
		var i, cell, offsetCoord;

		offsetCoord = this.grid.source.coordinateSystem.toOffsetCoordinates(point);
		if (this.brushOffsetCoord   !== null          &&
			this.brushOffsetCoord.i === offsetCoord.i &&
			this.brushOffsetCoord.j === offsetCoord.j) {
			return;
		}

		// clear prev brush point
		var prevCells = this.brush.current.getCoords();
		for (i = prevCells.length - 1; i >= 0; i--) {
			cell = this.grid.source.getCell(prevCells[i]);
			cell.highlight(false);
		};

		// show the new one
		this.brushOffsetCoord = offsetCoord;
		var newCoords  = this.brush.current.getCoords();
		var newValues  = this.brush.current.getValues();
		var color;
		for (i = newCoords.length - 1; i >= 0; i--) {
			color = this.model.colorPalette[newValues[i]];

			cell = this.grid.source.getCell(newCoords[i]);
			cell.highlight(true, color);
		};

		this.draw();
	}

	Controller.prototype.applyBrush = function () {
		// if () {

		// }
		var brushCoords = this.brush.current.getCoords();
		var brushValues = this.brush.current.getValues();
		this.model.applyOperationToCells('sum', brushCoords, brushValues);

		var cell, linearCoord, color;
		for (var i = brushCoords.length - 1; i >= 0; i--) {
			cell = this.grid.source.getCell(brushCoords[i]);
			linearCoord = this.grid.source.coordinateSystem.toLinearCoordinates(brushCoords[i]);
			
			color = this.model.source[linearCoord].color;
			cell.color = color;
		};

		this.draw();

		if (this.model.isLevelComplete()) {
			// TODO: Emit events nad make fancy animation hooks and what not.
			this.loadNextLevel();
		}
	}

	Controller.prototype.draw = function () {
		this.grid.source.draw();
		this.grid.target.draw();
	};

	Controller.prototype.renderWith = function (renderer) {
		renderer.render(this.container);
	};

	Controller.prototype.generateBrushes = function () {
		var self;
		self = this;

		this.brush = {};
		
		function testGetCoords () {
			if (self.brushOffsetCoord === null) {
				return [];
			} else {
				self.brush.test.cs = self.grid.source.coordinateSystem;
				return OxMath.hexagon(self.brushOffsetCoord, 1, self.grid.source.coordinateSystem);	
			}
		};
		this.brush.test = new Brush(testGetCoords, [+1,-1,+1,-1,+1,-1]);	

		this.brush.current = this.brush.test;
	};

	// =============
	// 
	function Brush (callback, values) {
		this.values = values;
		this.getCoords = callback;
	}
	Brush.prototype.getValues = function () {
		var values, coords, index;
		values = [];
		coords = this.getCoords();
		for (var i = coords.length - 1; i >= 0; i--) {
			index = coords[i].index;
			values[i] = this.values[index];
		}
		return values;
	}

	var API = Controller;
	return API;
}());