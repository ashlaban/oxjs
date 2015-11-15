'use strict';

/* global PIXI */
/* global MersenneTwister */
/* global Hammer */

/* jshint browserify: true */
/* jshint browser   : true */
/* global performance */
/* jshint devel   : true */

var OxCell = require('./core/ox-cell.js');
var OxGrid = require('./core/ox-grid.js');
var OxMath = require('./core/ox-math.js');
var OxAnimationSystem = require('./core/ox-animation-system.js');

var AppModel      = require('./app-model.js');
var AppController = require('./app-controller.js');

(function () {
	// Set up the PIXI renderer
	var canvas = {width: 500, height: 300};
	var options = { transparent : true,
	                antialias   : true,
	                resolution  : window.devicePixelRatio
	               };
	var renderer = new PIXI.WebGLRenderer ( canvas.width,
	                                        canvas.height,
	                                        options
	                                      );
	document.getElementById('canvas-wrapper').appendChild(renderer.view);
	renderer.view.style.width     = canvas.width;
	renderer.view.style.height    = canvas.height;
	renderer.view.style.minWidth  = canvas.width;
	renderer.view.style.minHeight = canvas.height;
	renderer.view.style.maxWidth  = canvas.width;
	renderer.view.style.maxHeight = canvas.height;

	var container = new PIXI.Container();

	// ========================================================================
	// === Set up an example grid
	// ========================================================================
	var game = new AppController();
	game.loadLevel( 'test' );
	game.renderWith(renderer);

	// MOUSE MOVE!
	var mousemoveHandler = function (ev) {
		var pixelCoord  = {x:ev.offsetX, y:ev.offsetY};
		game.showBrush(pixelCoord);
	};
	renderer.view.addEventListener('mousemove', mousemoveHandler, false);
	
	// CLICK!
	var clickHandler = function (ev) {
		game.applyBrush();
	};
	renderer.view.addEventListener('click', clickHandler, false);

	// ========================================================================
	// === Set up an example grid
	// ========================================================================
	// var cellConf = {
	// 	stroke: {color:0x587058, width:0.1}, 
	// 	edge  : {color:0xdd2222, width:0.2},
	// 	radial: {
	// 			 vertex:{color:0xffcd00, width:0.18},
	// 			 side  :{color:0xffcd00, width:0.3}
	// 			}
	//    };
	// var gridConf = {
	// 	position : {x:0,y:0},
	// 	scale    : {x:10,y:10},
	// 	size     : {w:20,h:15},
	// 	cell     : cellConf,
	// }
	// var grid = new OxGrid(gridConf, null);
	// grid.centerAt({x:canvas.width/2,y:canvas.height/2});
	// grid.draw();
	// ========================================================================
	
	// ========================================================================
	// === Set up animation system
	// ========================================================================
	var renderCallback = function () {
		game.renderWith(renderer)
		// renderer.render(container);
	};
	var animationSystem = new OxAnimationSystem.AnimationSystem(renderCallback);

	// Kick-start the animation
	animationSystem.animate();
	// ========================================================================
}());