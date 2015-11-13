"use strict";

var HexCell = require('./core/HexCell.js');
var HexMath = require('./core/HexMath.js');
var HexAnimationSystem = require('./core/HexAnimationSystem.js');

var API = {}
module.exports = API;

(function () {
	// Set up the PIXI renderer
	var canvas = {width: 500, height: 300};
	var renderer = new PIXI.WebGLRenderer   (
												canvas.width,
												canvas.height,
												{
													transparent : true,
													antialias   : true,
													resolution  : window.devicePixelRatio
												}
											);
	document.getElementById('canvas-wrapper').appendChild(renderer.view);
	renderer.view.style.width     = canvas.width;
	renderer.view.style.height    = canvas.height;
	renderer.view.style.minWidth  = canvas.width;
	renderer.view.style.minHeight = canvas.height;
	renderer.view.style.maxWidth  = canvas.width;
	renderer.view.style.maxHeight = canvas.height;

	var container = new PIXI.Container();

	function CellFactory(position, scale, color, conf) {
		this.position = position;
		this.scale    = scale;
		this.color    = color;
		this.conf     = conf;
	}

	CellFactory.prototype.newCell = function(shallowCopy) {
		if (shallowCopy) {
			var position = this.position;    
			var scale = this.scale;
			var color = this.color;
			var conf = this.conf;
		} else {
			// var position = this.position.clone()
			var position = {x: this.position.x, y:this.position.y};
			// var scale = this.scale.clone()
			var scale = {x: this.scale.x, y:this.scale.y};
			// var color = this.color.clone()
			var color = this.color;
			// var conf = this.conf.clone()
			var conf = {
				stroke: {
					color:this.conf.stroke.color,
					width:this.conf.stroke.width
				}, 
				edge: {
					color:this.conf.edge.color, 
					width:this.conf.edge.color
				},
				radial: {
					vertex: {
						color:this.conf.radial.vertex.color,
						width:this.conf.radial.vertex.width
					},
					side: {
						color:this.conf.radial.side.color,
						width:this.conf.radial.side.width
					},
				}  // End radial
			}; // End conf
		} // End if (shallowCopy)

		return new HexCell(position, scale, color, conf);
	};

	// TODO: Paint an example icon.
	var position = {x:canvas.width/2, y:canvas.height/2};
	var scale    = {x:100, y:100};
	var color    = 0x0069A9;
	var conf     = {
					stroke: {color:0x587058, width:0.0}, 
					edge  : {color:0xdd2222, width:0.2},
					radial: {
							 vertex:{color:0xffcd00, width:0.18},
							 side  :{color:0xffcd00, width:0.3}
							}
				   };
	var cellFactory = new CellFactory(position, scale, color, conf);
	var cell  = cellFactory.newCell();
	cellFactory.color = 0x605989
	var cell2 = cellFactory.newCell();
	cellFactory.color = 0x6900A9
	var cell3 = cellFactory.newCell();


	cell.edges             = [];
	cell.radialVertexLines = [1, 4];
	cell.radialSideLines   = [0, 3];
	cell.draw();

	// cell2.edges             = [];
	// cell2.radialVertexLines = [1, 4];
	// cell2.radialSideLines   = [0, 3];
	// cell2.draw();

	// cell3.edges             = [];
	// cell3.radialVertexLines = [1, 4];
	// cell3.radialSideLines   = [0, 3];
	// cell3.draw();

	container.addChild(cell._graphics);
	// container.addChild(cell2._graphics);
	// container.addChild(cell3._graphics);

	var mt_rng = new MersenneTwister(1337);
	var root_seed = mt_rng.int();
	var currentIconIndex = 0;

	function randomiseIconCell(cell, index) {
		mt_rng.seed(root_seed^(index*0xdeadbeef));

		console.log('Randomise Icon', index);

		function gaussian(mean, deviation) {
			// Wikipedia - Box-Muller transform
			var u1 = mt_rng.rnd();
			var u2 = mt_rng.rnd();
			var z0 = Math.sqrt(-2.0*Math.log(u1))*Math.cos(6.28318530718*u2);
			var z1 = Math.sqrt(-2.0*Math.log(u1))*Math.sin(6.28318530718*u2);

			return z0*deviation + mean;
		}

		function randomInt(min, max) {
			return min + Math.floor(mt_rng.rndHiRes()*(max-min+1))
		}
		function randomArray(min, max, nElem) { 
			var a = [];
			while (a.length < nElem) {
				var n = randomInt(min, max);
				for (var i = a.length - 1; i >= 0; i--) {
					if (a[i]==n) {continue;}
				};
				a.push(n);
			};
			return a;
		}

		function shuffle(array) {
			// Knuth's unbiased shuffle
			// http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
			var currentIndex = array.length, temporaryValue, randomIndex ;

			// While there remain elements to shuffle...
			while (0 !== currentIndex) {

			// Pick a remaining element...
				randomIndex = Math.floor(mt_rng.rnd() * currentIndex);
				currentIndex -= 1;

				// And swap it with the current element.
				temporaryValue = array[currentIndex];
				array[currentIndex] = array[randomIndex];
				array[randomIndex] = temporaryValue;
			}

			return array;
		}

		// cell.color = mt_rng.int();

		var nElements = randomInt(0,15);
		var elem1 = randomInt(0,Math.min(5,nElements));
		var elem2 = randomInt(0,Math.min(5,nElements-elem1));
		var elem3 = randomInt(0,Math.min(5,nElements-elem2-elem1));
		var elems = [elem1, elem2, elem3];
		shuffle(elems);

		var edges      = randomArray(0, 5, elems[0]);
		var sides      = randomArray(0, 5, elems[1]);
		var verts      = randomArray(0, 5, elems[2]);

		cell.edges             = edges;
		cell.radialVertexLines = verts;
		cell.radialSideLines   = sides;

		// cell.radialVertexLineColor = mt_rng.int();
		// cell.radialSideLineColor = mt_rng.int();
		// cell.edgeColor = mt_rng.int();

		cell.radialVertexLineWidth = gaussian(0.125,0.01);
		cell.radialSideLineWidth   = gaussian(0.125,0.01);
		cell.edgeWidth             = gaussian(0.125,0.1);
		cell.strokeWidth           = gaussian(0.01,0.1);

		cell.draw();
	}

	// grid = new HexGrid(gridconf, null);
	// grid.applyToCells(randomiseIconCell)
	// grid.draw();
	// grid.renderWith(renderer);

	function WiggleCellAnimationFactory (cell, duration, targetX, isRepeating) {

		var startTime = performance.now();
		var endTime   = startTime + duration;
		var startX    = cell._graphics.position.x;

		var temp;
		var span = targetX - startX;

		var wiggle = function (dt, currentTime) {

			var t = currentTime - startTime;

			var x = HexMath.easeInOutQuad(t, startX, span, duration);
			cell._graphics.position.x = x;

			// Repeating function
			if (isRepeating && t > duration) {
				startTime = performance.now();
				endTime   = startTime + duration;

				temp    = startX;
				startX  = targetX;
				targetX = temp;

				span     *= -1;
			}
			
			if (!isRepeating && t>duration) return true;

			return false;
		};
		return wiggle;
	}

	function PanCellAnimationFactory (cell) {
		var isDone   = false;
		var isEnding = false;
		var endingAnimation = null;
		this.cancel = function (duration) {
			if (duration <= 0) {
				isDone = true;
				return;
			} else {
				// TODO: Abstract with chaining.                
				endingAnimation = WiggleCellAnimationFactory(cell, duration, 250);
				isEnding = true;
				return;
			}
		};

		var x  = cell._graphics.position.x;
		var dx = 0;
		this.setdx = function (newdx) {dx = newdx;}

		this.animation = function (dt, currentTime) {
			// console.log(cell._graphics.position.x);
			if (isDone) return isDone;
			// TODO: Add starting phase?
			if (isEnding) {
				return endingAnimation(dt, currentTime)
			} else {
				cell._graphics.position.x = x + dx;
				return isDone;
			};
		};
	}

	var renderCallback = function () {
		renderer.render(container);
	}
	var animationSystem = new HexAnimationSystem.AnimationSystem(renderCallback);
	// animationSystem.add(WiggleCellAnimationFactory(cell, 2000, 200));

	// Kick-start the animation
	animationSystem.animate();
	randomiseIconCell(cell, 0);

	// === Hammer time ===
	var swipeOptions = {
		threshold: 10,
		direction: Hammer.DIRECTION_HORIZONTAL,
		velocity : 0.55,
	}
	var swipe = new Hammer.Swipe(swipeOptions);

	var panOptions = {
		threshold: 1,
		direction: Hammer.DIRECTION_HORIZONTAL,
	}
	var pan = new Hammer.Pan(panOptions);

	swipe.recognizeWith(pan);
	// swipe.recognizeWith(pan);
	// pan.requireFailure(swipe);

	var mc = new Hammer.Manager(renderer.view);
	mc.add(swipe);
	mc.add(pan);


	mc.on('swipe', function (ev) {
		console.log("Sch-wipe!");
		// currentPanAnimation.cancel(0);
		var dur  = 250;
		var dist = 1000;
		if (ev.angle > 135 || ev.angle < -135) {
			// animationSystem.add(WiggleCellAnimationFactory(cell , dur, -0));
			// animationSystem.add(WiggleCellAnimationFactory(cell2, dur, -dist));
			// animationSystem.add(WiggleCellAnimationFactory(cell3, dur, -dist));
			
			currentIconIndex -= 1;
		} else if (ev.angle < 45 || ev.angle > -45) {
			// animationSystem.add(WiggleCellAnimationFactory(cell , dur,  500));
			// animationSystem.add(WiggleCellAnimationFactory(cell2, dur,  dist));
			// animationSystem.add(WiggleCellAnimationFactory(cell3, dur,  dist));
			
			currentIconIndex += 1;
		}

		randomiseIconCell(cell, currentIconIndex);
		// console.log(ev)
	});

	var currentPanAnimation = null;
	mc.on('panstart', function (ev) {
		console.log("Peter Pan! (Start)");
		// Capture position of cell
		currentPanAnimation = new PanCellAnimationFactory(cell, 0);
		animationSystem.add(currentPanAnimation.animation);
	});
	mc.on('panmove', function (ev) {
		console.log("Peter Pan! (Move)");
		// console.log(ev.deltaX)
		currentPanAnimation.setdx(ev.deltaX);
	});
	mc.on('panend', function (ev) {
		console.log("Peter Pan (End)!");
		var dur  = 250;
		currentPanAnimation.cancel(dur);
	});

	// document.body.ontouchstart = function(ev) {
	//     console.log('test')
	// };
	// renderer.view.onmousemove = function(ev) {
	//     isCellDirty = true;

	//     // console.log(ev);
	//     updateCellAnimation(cell, ev.offsetX)
	// };
}());