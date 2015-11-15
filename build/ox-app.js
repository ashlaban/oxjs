(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./app-model.js":2,"./core/ox-grid.js":7,"./core/ox-math.js":8}],2:[function(require,module,exports){
// Define module Model
'use strict';

/* jshint browserify: true */
/* jshint devel: true */

var OxCoordinate = require('./core/ox-coordinate.js');
var OxColor      = require('./core/ox-color.js');

module.exports = (function () {

	var levels = {
		'test': {
			numberOfLevels: 2,
			0: {size: {w:3,h:3}, target:{0:-1,1:1,2:-1,3:1,5:1,7:-1,}},
			1: {size: {w:7,h:7}, target:{
				 9:-1, 10:-1, 11:-1,
				15:-1, 17:-1, 19:-1,
				22:-1, 23:-1, 25:-1, 26:-1,
				29:-1, 30:-1, 32:-1, 33:-1,
				38:-1},
			},
			2: {size: {w:10,h:10}, target:{15:1,16:1,17:1,18:1,19:1}},
		// 'tutorial': {},
		// 'basics': {},
		},
	};

	function Model () {

		this.size = null;
		this.source = [];
		this.target = [];

		this.coordinateSystem = null;

		this.colorPalette = {
			'1' : OxColor.HSV.toINT(0.8,0.8,0.8),
			'0' : OxColor.HSV.toINT(0.6,0.6,0.6),
			'-1': OxColor.HSV.toINT(0.2,0.8,0.8),
		};
	}

	Model.prototype.loadLevel = function (levelName, levelIndex) {

		var level = levels[levelName][levelIndex];
		if (level === undefined ) {
			console.log('ERR: Level with name ("' +
				levelName +
				'") and index ("' +
				levelIndex +
				'") does not exist.');
			return false;
		}

		// Init size
		this.size = {
			w: level.size.w,
			h: level.size.h,
			n: level.size.w * level.size.h,
		};

		this.coordinateSystem = new OxCoordinate.System(this.size);

		// Init source
		this.initSource();

		// Init target
		this.loadTarget(level.target);
		return true;
	};

	Model.prototype.initSource = function () {
		var i, self;

		self = this;

		for (i = this.size.n - 1; i >= 0; i--) {
			this.source[i] = {
				value: 0,
			};
			(function () {
				var innerIndex = i;
				Object.defineProperty(self.source[innerIndex], 'color', {
				get: function () {
						return self.colorPalette[self.source[innerIndex].value.toString()];
					},
				});
			}());
		}
		
		return true;
	};

	Model.prototype.loadTarget = function (target) {
		var i, self, value;

		self = this;

		for (i = this.size.n - 1; i >= 0; i--) {
			value = (target[i]) ? (target[i]) : (0) ;
			this.target[i] = {
				value: value,
			};
			(function () {
				var innerIndex = i;
				Object.defineProperty(self.target[innerIndex], 'color', {
				get: function () {
						return self.colorPalette[self.target[innerIndex].value.toString()];
					},
				});
			}());
		}
		return true;
	};

	Model.prototype.isLevelComplete = function () {
		var i;

		for (i = this.size.n - 1; i >= 0; i--) {
			if (this.source[i].value !== this.target[i].value) {return false;}
		}
		return true;
	};

	Model.prototype.applyOperationToCells = function (operation, cubeCoords, values) {

		if (!Array.isArray(cubeCoords)) {
			console.log('ERR: "cubeCoords" is not an array.');
			return false;
		}
		if (!Array.isArray(values)) {
			console.log('ERR: "values" is not an array.');
			return false;
		}
		if (cubeCoords.length !== values.length) {
			console.log('ERR: "cubeCoords" (len ' +
				cubeCoords.length + 
				') and "values" (len ' +
				values.length +
				') of different length.');
			return false;
		}

		var i, returnStatus;
		for (i = cubeCoords.length - 1; i >= 0; i--) {
			returnStatus = this.applyOperationToCell(operation, cubeCoords[i], values[i]);
			if (returnStatus === false) {
				console.log('ERR: Could not apply ternary operation at index "' +
					i +
					'"', cubeCoords, values);
				return false;
			}
		}

		return true;
	};

	Model.prototype.applyOperationToCell = function (operation, cubeCoord, brushValue) {
		var indexSource = this.coordinateSystem.toLinearCoordinates(cubeCoord);
		var sourceValue = this.source[indexSource];

		var a, b, r;
		a = brushValue;
		b = sourceValue.value;

		if ( !(a === 1 || a === 0 || a === -1) ) {
			console.log('ERR: Brush contains invalid ternary value ("' +
				a +
				'").');
			return false;
		}
		if ( !(b === 1 || b === 0 || b === -1) ) {
			console.log('ERR: Level["' +
				indexSource +
				'"] contains invalid ternary value ("' +
				b +
				'").');
			return false;
		}

		switch (operation) {
			case 'and':
			case 'min':
				r = Math.min(a, b);
				break;
			case 'or' :
			case 'max':
				r = Math.max(a, b);
				break;
			case 'xor':
				r = -(a*b);
				break;
			case 'sum':
				r = (a+b);
				r = (Math.abs(r) === 2) ? (-Math.sign(r)) : (r) ;
				break;
			case 'not':
				r = -b;
				break;
			default:
		}

		this.source[indexSource].value = r;
		return true;
	};

	var API = Model;
	return API;
}());
},{"./core/ox-color.js":5,"./core/ox-coordinate.js":6}],3:[function(require,module,exports){
// Define module OxAnimationSystem
'use strict';

/* jshint browserify: true */

var OxUtil = require('./ox-util.js');

module.exports = (function () {

    // === Animation List ===
    // =============================================
    function AnimationSystem (renderCallback) {
        this.prevTime = -1;
        this.animList = new OxUtil.LinkedList();
        this.renderCallback = renderCallback;
    }

    /*
     * callback(dt, currentTime)
     *     A function providing the acutal animation.
     *     this       : An Animation object.
     *     dt         : Time since last frame
     *     currentTime: An absolute measure of time. 
     */
    AnimationSystem.prototype.add = function (callback) {
        var anim;
        anim = new Animation(callback);
        this.animList.push(anim);
    };

    AnimationSystem.prototype.updateAndPurge = function (dt, currentTime) {
        var node, nextNode, data, isExpired;
        node = this.animList.first;

        while (node !== null) {
            data = node.data;

            nextNode  = node.next;
            isExpired = data.update(dt, currentTime);

            if (isExpired) {
                this.animList.remove(node);
            }

            node = nextNode;
        }
    };

    AnimationSystem.prototype.update = function (dt, currentTime) {
        var node, data;
        node = this.animList.first;

        while (node !== null) {
            data = node.data;

            data.update(dt, currentTime);

            node = node.next;
        }
    };
    // AnimationSystem.prototype.purge  = function () {
    //     var node, nextNode, data;
        
    //     node  = animList.first;

    //     while (node !== null) {
    //         data = node.data;

    //         nextNode = node.next;

    //         if (data.isExpired()) {
    //             animList.remove(node);
    //         }

    //         node = nextNode;
    //     }
    // };
    
    AnimationSystem.prototype.animate = function (currentTime) {
        var dt;

        requestAnimationFrame(this.animate.bind(this));

        if (this.prevTime === -1 || this.prevTime === undefined) {
            this.prevTime = currentTime;
            return;
        }

        dt = currentTime - this.prevTime;
        this.prevTime = currentTime;

        this.updateAndPurge(dt, currentTime);
        this.renderCallback();
    };

    // =============================================
    // === END Animation List ===
    
    // === Animation ===
    // =============================================
    // 
    /*
     * callback(dt, currentTime)
     *     A function providing the acutal animation.
     *     this       : The Animation object.
     *     dt         : Time since last frame
     *     currentTime: An absolute measure of time.
     */ 
    function Animation (callback) {
        this.callback = callback;
    }
    
    Animation.prototype.update = function (dt, currentTime) {
        return this.callback.call(this, dt, currentTime);
    };

    // =============================================
    // === END Animation === 

    // External API
    var API = {
        AnimationSystem: AnimationSystem,
        Animation      : Animation
    };

    return API;
}());
},{"./ox-util.js":9}],4:[function(require,module,exports){
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
        this.color          = color;
        this.highlightColor = color;

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

        this.isHighlighted = false;
    }

    // Cell.prototype.pushColor = function (newColor) {
    //     this._colorStack.push(this.color);
    //     this.color = newColor;
    //     this.draw();
    // };
    // Cell.prototype.popColor = function () {
    //     if (this._colorStack) {
    //         this.color = this._colorStack.pop();
    //     }
    //     this.draw();
    // };

    Cell.prototype.highlight = function (doHighlight, color) {
        if (doHighlight === undefined) {
            this.isHighlighted = !this.isHighlighted;
        } else if (doHighlight) {
            this.isHighlighted = true;
        } else {
            this.isHighlighted = false;
        }

        this.highlightColor = color;
        if (this.highlightColor === undefined) {
            this.highlightColor = this.color;
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

        // Main hexagon
        this._graphics.clear(); // Important, otherwise mem-consumption will explode!
        this._graphics.beginFill(this.color);
        this._graphics.drawShape(OxMath.hexShape);
        this._graphics.endFill();

        if (this.isHighlighted) {
            var color;
            color = this.highlightColor;
            // color = OxColor.brighten(this.highlightColor);
            this._graphics.beginFill(color, 0.6);
            this._graphics.drawShape(OxMath.hexShape);
            this._graphics.endFill();
        }

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

    // ========================================================================
    // === Cell Factory
    // ========================================================================
    function Factory(position, scale, color, conf) {
        this.position = position;
        this.scale    = scale;
        this.color    = color;
        this.conf     = conf;
    }

    Factory.prototype.newCell = function(shallowCopy) {
        var position,
            scale,
            color,
            conf;

        if (shallowCopy) {
            position = this.position;    
            scale = this.scale;
            color = this.color;
            conf = this.conf;
        } else {
            // position = this.position.clone()
            position = {x: this.position.x, y:this.position.y};
            // scale = this.scale.clone()
            scale = {x: this.scale.x, y:this.scale.y};
            // color = this.color.clone()
            color = this.color;
            // conf = this.conf.clone()
            conf = {
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

        return new Cell(position, scale, color, conf);
    };
    // ========================================================================
    // === END Cell Factory

    // ========================================================================
    // === Exported API
    // ========================================================================
    var API = {
        Cell: Cell,
        Factory: Factory,
    };

    return API;
}());
},{"./ox-color.js":5,"./ox-math.js":8}],5:[function(require,module,exports){
// Define module OxColor
'use strict';

/* jshint browserify: true */
/* jshint newcap: false */

module.exports = (function () {
    function isRGB(c) {
        return  (c &&
            c.r !== undefined &&
            c.g !== undefined &&
            c.b !== undefined);
    }
    function isHSV(c) {
        return  (c &&
            c.h !== undefined &&
            c.s !== undefined &&
            c.v !== undefined);
    }
    function isINT(c) {
        return Number.isInteger(c);
    }

    /**
     * Converts from the HSV color space to RGB.
     *
     * Takes h, s, v values or an object with field .h, .s, .v.
     * The components should be normalised to [0, 1].
     * 
     * @param {float} h hue channel
     * @param {float} s satuartion channel
     * @param {float} v value channel
     *
     * @return an object with components .r, .g .b normalised to [0, 255].
     */
    function HSVtoRGB(h, s, v) {
        // Taken from:
        // http://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
        var r, g, b, i, f, p, q, t;
        if (h && s === undefined && v === undefined) {
            s = h.s; v = h.v; h = h.h;
        }
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        return {
            r: (r * 255),
            g: (g * 255),
            b: (b * 255)
        };
    }

    // ========================================================================
    // === Conversions
    // ========================================================================
    /**
     * Converts from the RGB color space to to HSV.
     * 
     * Takes r, g, b values or an object with fields .r, .g and .b.
     * The components should be normalised to [0, 255].
     * 
     * @param {float} r red channel
     * @param {float} g green channel
     * @param {float} b blue channel
     *
     * @return an object with fields .h, .s, .v normalised to [0, 1].
     */
    function RGBtoHSV(r, g, b) {
        var h, s, v, M, m, C, H;
        if ( r && g === undefined && b === undefined) {
            g = r.g; b = r.b; r = r.r;
        }
        if (r > 1) {r = (r%256)/255;}
        if (g > 1) {g = (g%256)/255;}
        if (b > 1) {b = (b%256)/255;}

        // Chroma
        M = Math.max(r,g,b);
        m = Math.min(r,g,b);
        C = M-m;

        // Hue
        // Note: Javascript % is the remainder operator. To get the modulo 
        // operator the idiom ((x%n)+n)%n is used.
        if      ( C === 0 ) { H = 0; }
        else if ( M === r ) { H = ((g-b)/C) % 6; H = (H+6) % 6; }
        else if ( M === g ) { H = ((b-r)/C) + 2; }
        else if ( M === b ) { H = ((r-g)/C) + 4; }
        h = H / 6;

        // Value
        v = M;

        // Saturation
        s = (v === 0) ? (0) : (C/v);

        return {h:h,s:s,v:v};
    }

    function INTtoRGB(c) {
        var r = Math.floor(c        ) % 256;
        var g = Math.floor(c/256    ) % 256;
        var b = Math.floor(c/256/256) % 256;
        var rgb = {r:r,g:g,b:b};
        return rgb;
    }

    function RGBtoINT(r, g, b) {
        if ( r && g === undefined && b === undefined) {
            g = r.g; b = r.b; r = r.r;
        }
        var c = Math.floor(r) + 256*Math.floor(g) + 256*256*Math.floor(b);
        return c;
    }

    function INTtoHSV(c) {
        return RGBtoHSV(INTtoRGB(c));
    }

    function HSVtoINT(h, s, v) {
        if (h && s === undefined && v === undefined) {
            s = h.s; v = h.v; h = h.h;
        }
        return RGBtoINT(HSVtoRGB(h, s, v));
    }
    // ========================================================================
    // === END Conversions

    // ========================================================================
    // === Palette
    // ========================================================================
    /**
     * Class HexColor.HexPalette
     * @param {[type]} generatorFunction [description]
     * @param {[type]} nColors           [description]
     */
    function HexPalette( generatorFunction, nColors ) {

        var self = this;
        
        self.colors = [];

        for (var i = nColors - 1; i >= 0; i--) {
            var color = generatorFunction();
            self.colors.push( color );
        }

        self.random = function() {
            var index = Math.floor( Math.random() * self.colors.length );
            return self.colors[index];
        };
    }

    function getRandomPastellColor() {
        var h = Math.random();
        var s = 0.20 + (Math.random() - 0.5) * 0.125;
        var v = 0.75 + (Math.random() - 0.5) * 0.125;

        var c = HSVtoINT( h, s, v );
        return c;
    }

    function getNEquallySpacedPastellColors(n) {
        var colors = [];
        var interval = 1/n;
        var h, s, v;

        h = Math.random()*interval;
        
        for (var i = 0; i<n; ++i) {
            s = 0.20 + (Math.random() - 0.5) * 0.200;
            v = 0.75 + (Math.random() - 0.5) * 0.200;

            colors.push( HSVtoINT( h, s, v ) );
            h += interval;
            h %= 1;
        }

        return colors;
    }
    // ========================================================================
    // === END Palette

    function brighten(c) {
        var result;

        if (isRGB(c)) {
            
            result = RGBtoHSV(c);
            result.v = result.v + 0.5;
            if (result.v > 1.0) {result.v = 1.0;}
            result = HSVtoRGB(result);

        } else if (isHSV(c)) {
            
            result.v = result.v + 0.5;
            if (result.v > 1.0) {result.v = 1.0;}
        
        } else {
        
            result = INTtoHSV(c);
            result.v = result.v + 0.5;
            if (result.v > 1.0) {result.v = 1.0;}
            result = HSVtoINT(result);
        
        }

        return result;
    }

    function invertValue(c) {
        var result;
        if (isRGB(c)) {
            result   = RGBtoHSV(c);
            result.v = 1-result.v;
            result   = HSVtoRGB(result);
        } else if (isHSV(c)) {
            result.v = 1-result.v;
        } else {
            result   = INTtoHSV(c);
            result.v = 1-result.v;
            result   = HSVtoINT(result);
        }
        return result;
    }

    function desaturate(c) {
        var result;
        if (isRGB(c)) {
            result   = RGBtoHSV(c);
            result.s = 0.1;
            result   = HSVtoRGB(result);
        } else if (isHSV(c)) {
            result.s = 0.1;
        } else {
            result   = INTtoHSV(c);
            result.s = 0.1;
            result   = HSVtoINT(result);
        }
        return result;
    }

    // ========================================================================
    // === Exported API
    // ========================================================================
    var API = {
        names: {
            blue     : 0x0000FF,
            green    : 0x00FF00,
            red      : 0xFF0000,
            cyan     : 0x00FFFF,
            magenta  : 0xFF00FF,
            yellow   : 0xFFFF00,
            black    : 0x000000,
            darkGray : 0x444444,
            gray     : 0x888888,
            lightGray: 0xBBBBBB,
            white    : 0xFFFFFF
        },
        HexPalette : HexPalette,
        pastell : getRandomPastellColor,
        getNEquallySpacedPastellColors : getNEquallySpacedPastellColors,
        brighten : brighten,
        invertValue : invertValue,
        desaturate : desaturate,
        RGB : {
            isRGB: isRGB,
            toHSV: RGBtoHSV,
            toINT: RGBtoINT
        },
        HSV : {
            isHSV: isHSV,
            toRGB: HSVtoRGB,
            toINT: HSVtoINT,
        },
        INT : {
            isINT: isINT,
            toHSV: INTtoHSV,
            toRGB: INTtoRGB
        },
    };

    return API;

}());
},{}],6:[function(require,module,exports){
// Define module OxCoordinate
'use strict';

/* jshint browserify: true */

module.exports = (function () {
    // ========================================================================
    // === Coordinate system ==================================================
    // ========================================================================
    // 
    // Applies coordinate handling and conversion to the HexGrid prototype.
    //
    // There are five coordinate types.
    // Pixel:
    //      Basis: x, y
    // Offset:
    //      Basis: i, j
    // Cube:
    //      Basis: x, y, z
    // Axial:
    //      Basis: q, r
    // Linear:
    //      Basis: integer
    
    /**
     * Constructs a new Coordinate System for use. Should be fed an object
     * containing the w and h properties. These fields specify the size of the
     * heaxgon coordinate system.
     * 
     * @param {Object} size Must contain a w and h property.
     */
    function System ( size, scale, originPixelCoord ) {
        var self = this;

        this.pixel  = {};
        this.offset = {};
        this.cube   = {};
        this.axial  = {};
        this.linear = {};

        // TODO: Make pixel-coords optional
        // For pixel-to-cell conversion
        if (originPixelCoord !== undefined && originPixelCoord !== null) {
            this.originPixelCoord = {
                x: originPixelCoord.x,
                y: originPixelCoord.y,
            };
        } else {
            this.originPixelCoord = null
        }

        // TODO: Implement centering and arbitrary bounds.
        this.originOffsetCoord = {i:0, j:0}; /* currently unused */
        
        // For pixel-to-cell conversion
        if (scale !== undefined && scale !== null) {
            this.scale  = {
                x: scale.x,
                y: scale.y,
            };
        } else {
            this.scale = null;
        }

        // For conversion between different cell-coordinates
        this.size   = {
            w: size.w,
            h: size.h,
        };

        // Derived properties
        // var northWestCornerPixelCoord  = 
        // var northEastCornerPixelCoord  = 
        // var southEastCornerPixelCoord  = 
        // var southWestCornerPixelCoord  = 

        // var a = Math.floor(this.size.w/2);
        // var b = Math.floor(this.size.h/2);
        // var c = Math.floor(this.size.w/2);
        // var d = Math.floor(this.size.w/2);

        // var northWestCornerOffsetCoord = originOffsetCoord.i
        // var northEastCornerOffsetCoord = 
        // var southEastCornerOffsetCoord = 
        // var southWestCornerOffsetCoord = 

        // --------------------------------------------------------------------
        // --- Methods declared on sub-objects --------------------------------
        // --------------------------------------------------------------------
        self.pixel.toOffsetCoordinates = function (pixelCoord) {
            var cubeCoord   = self.pixel.toCubeCoordinates(pixelCoord);
            var offsetCoord = self.cube.toOffsetCoordinates(cubeCoord);
            return offsetCoord;
        };
        self.pixel.toCubeCoordinates = function (pixelCoord) {
            var axialCoord = self.pixel.toAxialCoordinates(pixelCoord);
            var cubeCoord  = self.axial.toCubeCoordinates(axialCoord);
            return cubeCoord;
        };
        self.pixel.toAxialCoordinates = function (pixelCoord) {
            pixelCoord.x -= self.originPixelCoord.x;
            pixelCoord.y -= self.originPixelCoord.y;
            var q = pixelCoord.x * 2/3 / self.scale.x;
            var r = (-pixelCoord.x / 3 + Math.sqrt(3)/3 * pixelCoord.y) / self.scale.y;
            var axialCoord = {q:q,r:r};
            return self.axialRound( axialCoord );
        };
        self.pixel.toLinearCoordinates = function (pixelCoord) {
            var offsetCoord = self.pixel.toOffsetCoordinates(pixelCoord);
            var linearCoord = self.offset.toLinearCoordinates(offsetCoord);
            return linearCoord;
        };

        self.offset.toPixelCoordinates = function (offsetCoord) {
            var axialCoord = self.offset.toAxialCoordinates(offsetCoord);
            var pixelCoord = self.axial.toPixelCoordinates(axialCoord);
            return pixelCoord;
        };
        self.offset.toCubeCoordinates = function (offsetCoord) {
            var x = offsetCoord.i;
            var z = offsetCoord.j - (offsetCoord.i + (offsetCoord.i&1)) / 2;
            var y = -x-z;
            var cubeCoord = {x:x,y:y,z:z};
            return cubeCoord;
        };
        self.offset.toAxialCoordinates = function (offsetCoord) {
            var cubeCoord  = self.offset.toCubeCoordinates(offsetCoord);
            var axialCoord = self.cube.toAxialCoordinates(cubeCoord);
            return axialCoord;
        };
        self.offset.toLinearCoordinates = function (offsetCoord) {
            return offsetCoord.i + (offsetCoord.j * self.size.w);
        };
        self.offset.inBounds = function (offsetCoord) {
            return (
                (offsetCoord.i >= 0 && 
                offsetCoord.i  < self.size.w) &&
                (offsetCoord.j >= 0 &&
                offsetCoord.j  < self.size.h)
                );
        };

        self.cube.toPixelCoordinates = function (cubeCoord) {
            var axialCoord = self.cube.toAxialCoordinates(cubeCoord);
            var pixelCoord = self.axial.toPixelCoordinates(axialCoord);
            return pixelCoord;
        };
        self.cube.toOffsetCoordinates = function (cubeCoord) {
            var i = cubeCoord.x;
            var j = cubeCoord.z + (cubeCoord.x + (cubeCoord.x&1)) / 2;
            var offsetCoord = {i:i,j:j};
            return offsetCoord;
        };
        self.cube.toAxialCoordinates = function (cubeCoord) {
            var q = cubeCoord.x;
            var r = cubeCoord.z;
            var axialCoord = {q:q,r:r};
            return axialCoord;
        };
        self.cube.toLinearCoordinates = function (cubeCoord) {
            var offsetCoord = self.cube.toOffsetCoordinates(cubeCoord);
            var linearCoord = self.offset.toLinearCoordinates(offsetCoord);
            return linearCoord;
        };
        self.cube.inBounds = function (cubeCoord) {
            var offsetCoord = self.cube.toOffsetCoordinates(cubeCoord);
            return self.offset.inBounds(offsetCoord);
        };

        self.axial.toPixelCoordinates = function (axialCoord) {
            var x = self.scale.x * 3/2 * axialCoord.q;
            var y = self.scale.y * Math.sqrt(3) * (axialCoord.r + axialCoord.q/2);
            var pixelCoord = {
                x:x + self.originPixelCoord.x,
                y:y + self.originPixelCoord.y,
            };
            return pixelCoord;
        };
        self.axial.toOffsetCoordinates = function (axialCoord) {
            var cubeCoord = self.axial.toCubeCoordinates(cubeCoord);
            var offsetCoord = self.cube.toOffsetCoordinates(axialCoord);
            return offsetCoord;
        };
        self.axial.toCubeCoordinates = function (axialCoord) {
            var x = axialCoord.q;
            var z = axialCoord.r;
            var y = -x-z;
            return {x:x,y:y,z:z};
        };
        self.axial.toLinearCoordinates = function (axialCoord) {
            var offsetCoord = self.axial.toOffsetCoordinates(axialCoord);
            var linearCoord = self.offset.toLinearCoordinates(offsetCoord);
            return linearCoord;
        };

        self.linear.toPixelCoordinates  = function (linearCoord) {
            var offsetCoord = self.linear.toOffsetCoordinates(linearCoord);
            var pixelCoord  = self.offset.toPixelCoordinates(offsetCoord);
            return pixelCoord;
        };
        self.linear.toOffsetCoordinates = function (linearCoord) {
            var i = linearCoord % self.size.w;
            var j = linearCoord / self.size.w;
            return {i:i,j:j};
        };
        self.linear.toCubeCoordinates   = function (linearCoord) {
            var offsetCoord = self.linear.toOffsetCoordinates(linearCoord);
            var cubeCoord   = self.offset.toCubeCoordinates(offsetCoord);
            return cubeCoord;
        };
        self.linear.toAxialCoordinates  = function (linearCoord) {
            var offsetCoord = self.linear.toOffsetCoordinates(linearCoord);
            var axialCoord  = self.offset.toAxialCoordinates(offsetCoord);
            return axialCoord;
        };
        self.linear.inBounds            = function (linearCoord) {
            var offsetCoord = self.linear.toOffsetCoordinates(linearCoord);
            return self.offset.inBounds(offsetCoord);
        };
    }

    // ========================================================================
    // === Ordinary methods ===================================================
    // ========================================================================

    System.prototype.cubeRound = function (h) {
        // From amit
        var rx = Math.round(h.x);
        var ry = Math.round(h.y);
        var rz = Math.round(h.z);

        var x_diff = Math.abs(rx - h.x);
        var y_diff = Math.abs(ry - h.y);
        var z_diff = Math.abs(rz - h.z);

        if (x_diff > y_diff && x_diff > z_diff) {
            rx = -ry-rz;
        } else if (y_diff > z_diff) {
            ry = -rx-rz;
        } else {
            rz = -rx-ry;
        }

        return {x:rx, y:ry, z:rz};
    };

    System.prototype.axialRound = function (axialCoord) {
        // From amit
        var cubeCoord;
        cubeCoord  = this.axial.toCubeCoordinates(axialCoord);
        cubeCoord  = this.cubeRound(cubeCoord);
        axialCoord = this.cube.toAxialCoordinates(cubeCoord);
        return axialCoord;
    };

    function isPixelCoordinates(c) {
        return c &&
            c.x !== undefined &&
            c.y !== undefined &&
            c.z === undefined;
    }
    function isOffsetCoordinates(c) {
        return c && 
            c.i !== undefined &&
            c.j !== undefined;
    }
    function isCubeCoordinates(c) {
        return c &&
            c.x !== undefined &&
            c.y !== undefined &&
            c.z !== undefined;

    }
    function isAxialCoordinates(c) {
        return c && 
            c.q !== undefined &&
            c.r !== undefined;
    }
    function isLinearCoordinates(c) {
        return Number.isInteger(c);
    }

    System.prototype.toPixelCoordinates = function (c) {
        if        (isPixelCoordinates(  c )) {
            return c;
        } else if (isOffsetCoordinates( c )) {
            return this.offset.toPixelCoordinates;
        } else if (isCubeCoordinates(   c )) {
            return this.cube.toPixelCoordinates(c);
        } else if (isAxialCoordinates(  c )) {
            return this.axial.toPixelCoordinates(c);
        } else if (isLinearCoordinates( c )) {
            return this.linear.toPixelCoordinates(c);
        }
    };
    /**
     * Converts the current coordinate object to offset coordinates.
     * @param  {pixel|offset|cube|axial} c coordinates given in any of the four coordinate types.
     * @return {offset} the same coordinate in the offset coordinate system.
     */
    System.prototype.toOffsetCoordinates = function (c) {
        if        (isPixelCoordinates(  c )) {
            return this.pixel.toOffsetCoordinates(c);
        } else if (isOffsetCoordinates( c )) {
            return c;
        } else if (isCubeCoordinates(   c )) {
            return this.cube.toOffsetCoordinates(c);
        } else if (isAxialCoordinates(  c )) {
            return this.axial.toOffsetCoordinates(c);
        } else if (isLinearCoordinates( c )) {
            return this.linear.toOffsetCoordinates(c);
        }
    };
    System.prototype.toCubeCoordinates = function (c) {
        if        (isPixelCoordinates(  c )) {
            return this.pixel.toCubeCoordinates(c);
        } else if (isOffsetCoordinates( c )) {
            return this.offset.toCubeCoordinates(c);
        } else if (isCubeCoordinates(   c )) {
            return c;
        } else if (isAxialCoordinates(  c )) {
            return this.axial.toCubeCoordinates(c);
        }
         else if (isLinearCoordinates( c )) {
            return this.linear.toCubeCoordinates(c);
        }
    };
    System.prototype.toAxialCoordinates = function (c) {
        if        (isPixelCoordinates(  c )) {
            return this.pixel.toAxialCoordinates(c);
        } else if (isOffsetCoordinates( c )) {
            return this.offset.toAxialCoordinates(c);
        } else if (isCubeCoordinates(   c )) {
            return this.cube.toAxialCoordinates(c);
        } else if (isAxialCoordinates(  c )) {
            return c;
        } else if (isLinearCoordinates( c )) {
            return this.linear.toAxialCoordinates(c);
        }
    };
    System.prototype.toLinearCoordinates = function (c) {
        if        (isPixelCoordinates(  c )) {
            return this.pixel.toLinearCoordinates(c);
        } else if (isOffsetCoordinates( c )) {
            return this.offset.toLinearCoordinates(c);
        } else if (isCubeCoordinates(   c )) {
            return this.cube.toLinearCoordinates(c);
        } else if (isAxialCoordinates(  c )) {
            return this.axial.toLinearCoordinates(c);
        } else if (isLinearCoordinates( c )) {
            return c;
        }
    };

    // ========================================================================
    // === Exported API
    // ========================================================================
    var API = {
        System: System,
    };

    return API;

}());
},{}],7:[function(require,module,exports){
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
},{"./ox-cell.js":4,"./ox-coordinate.js":6,"./ox-math.js":8}],8:[function(require,module,exports){
// Define module OxMath
'use strict';

/* globals PIXI */
/* jshint browserify: true */

module.exports = (function () {

	var direction = {
		north    : {x: 0, y: 1, z:-1},
		northEast: {x: 1, y: 0, z:-1},
		southEast: {x: 1, y:-1, z: 0},
		south    : {x: 0, y:-1, z: 1},
		southWest: {x:-1, y: 0, z: 1},
		northWest: {x:-1, y: 1, z: 0},
		nil      : {x:0, y:0, z:0}
	};
	direction.asArray = [ 	direction.north,
							direction.northEast,
							direction.southEast,
							direction.south,
							direction.southWest,
							direction.northWest ];
	direction.toInt = {
		north    : 0,
		northEast: 1,
		southEast: 2,
		south    : 3,
		southWest: 4,
		northWest: 5,
	};

	var cos_30 = 0.86602540378;
	var cos_60 = 0.5;
	var sin_30 = 0.5;
    var sin_60 = 0.86602540378;
    var tan_30 = 0.57735026919;
    var tan_60 = 1.73205080757;

    var hexagonWidth  = 4*cos_60; // 2;
	var hexagonHeight = 2*sin_60; // Math.sqrt(3);

	function randomGaussian(mean, deviation, rand) {
		// Wikipedia - Box-Muller transform
		var u1 = rand();
		var u2 = rand();
		var z0 = Math.sqrt(-2.0*Math.log(u1))*Math.cos(6.28318530718*u2);
		// var z1 = Math.sqrt(-2.0*Math.log(u1))*Math.sin(6.28318530718*u2);
		return z0*deviation + mean;
	}

	function randomInt(min, max, rand) {
		return min + Math.floor(rand()*(max-min+1));
	}

	function randomIntArray(min, max, nElem) { 
		var a, n, i;
		a = [];
		while (a.length < nElem) {
			n = randomInt(min, max);
			for (i = a.length - 1; i >= 0; i--) {
				if (a[i]==n) {continue;}
			}
			a.push(n);
		}
		return a;
	}

	function shuffleArray(array, rand) {
		// Knuth's unbiased shuffle
		// http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
		var currentIndex = array.length, temporaryValue, randomIndex ;

		// While there remain elements to shuffle...
		while (0 !== currentIndex) {

		// Pick a remaining element...
			randomIndex = Math.floor(rand() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	}

    var corners = {
    	northEast : [-1      ,  0     ],
    	east      : [-cos_60 , -sin_60],
    	southEast : [ cos_60 , -sin_60],
    	southWest : [ 1      ,  0     ],
    	west      : [ cos_60 ,  sin_60],
    	northWest : [-cos_60 ,  sin_60],
    };

	var hexPoints = [].concat(
			corners.northEast,
			corners.east     ,
			corners.southEast,
			corners.southWest,
			corners.west     ,
			corners.northWest
		);
	var hexShape  = new PIXI.Polygon(hexPoints);

	var hexEdge = {
		north    : function(t) {return new PIXI.Polygon([-cos_60, -sin_60,  cos_60, -sin_60,  cos_60+t*cos_60, -sin_60+t*sin_60, -cos_60-t*cos_60, -sin_60+t*sin_60 ]);},
		northEast: function(t) {return new PIXI.Polygon([ cos_60, -sin_60,       1,       0,       1-t*cos_60,       0+t*sin_60,  cos_60-t       , -sin_60          ]);},
		southEast: function(t) {return new PIXI.Polygon([      1,       0,  cos_60,  sin_60,  cos_60-t       ,  sin_60         ,       1-t*cos_60,       0-t*sin_60 ]);},
		south    : function(t) {return new PIXI.Polygon([ cos_60,  sin_60, -cos_60,  sin_60, -cos_60-t*cos_60,  sin_60-t*sin_60,  cos_60+t*cos_60,  sin_60-t*sin_60 ]);},
		southWest: function(t) {return new PIXI.Polygon([-cos_60,  sin_60,      -1,       0,      -1+t*cos_60,       0-t*sin_60, -cos_60+t       ,  sin_60          ]);},
		northWest: function(t) {return new PIXI.Polygon([     -1,       0, -cos_60, -sin_60, -cos_60+t       , -sin_60         ,      -1+t*cos_60,       0+t*sin_60 ]);},
	};
	hexEdge[0] = hexEdge.north;
	hexEdge[1] = hexEdge.northEast;
	hexEdge[2] = hexEdge.southEast;
	hexEdge[3] = hexEdge.south;
	hexEdge[4] = hexEdge.southWest;
	hexEdge[5] = hexEdge.northWest;

	// NOTE: The north corner is the corner to the right of the north (   top-most) edge.
	// NOTE: The south corner is the corner to the left  of the south (bottom-most) edge.
	var hexRadialLineVertex = {
		north    : function(t) {return new PIXI.Polygon([ cos_60-t     , -sin_60      ,  cos_60, -sin_60,  cos_60*(1+t)  ,  sin_60*(t-1),  t*(1-cos_60), t*sin_60, -t*cos_60, t*sin_60, -2*t*cos_60,  0        ]);},
		northEast: function(t) {return new PIXI.Polygon([ 1-t*cos_60   ,  0-t*sin_60  ,  1     ,       0,  1-t*cos_60    ,  t*sin_60    , -t*cos_60    , t*sin_60, -t       , 0       , -t*cos_60  , -t*sin_60 ]);},
		southEast: function(t) {return new PIXI.Polygon([ cos_60*(1+t) ,  sin_60*(1-t),  cos_60,  sin_60,  cos_60-t      ,  sin_60      , -t           , 0       , -t*cos_60,-t*sin_60,  t*cos_60  , -t*sin_60 ]);},
		south    : function(t) {return new PIXI.Polygon([-cos_60*(t+1) ,  sin_60*(1-t), -cos_60,  sin_60,  (2*t-1)*cos_60,  sin_60      ,  2*t*cos_60  , 0       , t*cos_60 ,-t*sin_60, -t*cos_60  , -t*sin_60 ]);},
		southWest: function(t) {return new PIXI.Polygon([-1+t*cos_60   , -sin_60*t    , -1     ,       0, -1+t*cos_60    ,  sin_60*t    ,  t*cos_60    , sin_60*t, t        , 0       ,  t*cos_60  , -sin_60*t ]);},
		northWest: function(t) {return new PIXI.Polygon([-cos_60+t     , -sin_60      , -cos_60, -sin_60, -(t+1)*cos_60  ,  (t-1)*sin_60, -t*cos_60    , sin_60*t, t*cos_60 , sin_60*t,  t         ,  0        ]);},
	};
	hexRadialLineVertex[0] = hexRadialLineVertex.north;
	hexRadialLineVertex[1] = hexRadialLineVertex.northEast;
	hexRadialLineVertex[2] = hexRadialLineVertex.southEast;
	hexRadialLineVertex[3] = hexRadialLineVertex.south;
	hexRadialLineVertex[4] = hexRadialLineVertex.southWest;
	hexRadialLineVertex[5] = hexRadialLineVertex.northWest;

	var hexRadialLineSide = {
		north    : function(t) {return new PIXI.Polygon([
			-t*cos_60      , -sin_60    ,
			 t*cos_60      , -sin_60    ,
			 t*cos_60      ,  0         ,
			 t*cos_60/2    ,  t*sin_60/2,
			-t*cos_60/2    ,  t*sin_60/2,
			-t*cos_60      ,  0         ,
			]);},

		northEast: function(t) {return new PIXI.Polygon([
			 1-(t+1)*cos_60/2, -(t+1)*sin_60/2,
			 1+(t-1)*cos_60/2,  (t-1)*sin_60/2,
			 t*cos_60/2      ,  t*sin_60/2    ,
			-t*cos_60/2      ,  t*sin_60/2    ,
			-t*cos_60        ,  0             ,
			-t*cos_60/2      , -t*sin_60/2    ,
			]);},
		
		southEast: function(t) {return new PIXI.Polygon([
		    (3+t)*cos_60/2,  (1-t)*sin_60/2,
		    (3-t)*cos_60/2,  (1+t)*sin_60/2,
		    -cos_60/2*t   ,  sin_60/2*t    ,
		    -cos_60*t     ,  0             ,
		    -cos_60/2*t   , -sin_60/2*t    ,
		     cos_60/2*t   , -sin_60/2*t    ,
		    ]);},
		
		south    : function(t) {return new PIXI.Polygon([
			 t*cos_60      ,  sin_60    ,
			-t*cos_60      ,  sin_60    ,
			-t*cos_60      ,  0         ,
			-t*cos_60/2    , -t*sin_60/2,
			 t*cos_60/2    , -t*sin_60/2,
			 t*cos_60      ,  0         ,
			]);},

		southWest: function(t) {return new PIXI.Polygon([
			 -(1-(t+1)*cos_60/2),  (t+1)*sin_60/2,
			 -(1+(t-1)*cos_60/2), -(t-1)*sin_60/2,
			-t*cos_60/2      , -t*sin_60/2    ,
			 t*cos_60/2      , -t*sin_60/2    ,
			 t*cos_60        ,  0             ,
			 t*cos_60/2      ,  t*sin_60/2    ,
			]);},

		northWest: function(t) {return new PIXI.Polygon([
		    -(3+t)*cos_60/2, -(1-t)*sin_60/2,
		    -(3-t)*cos_60/2, -(1+t)*sin_60/2,
		     cos_60/2*t    , -sin_60/2*t,
		     cos_60*t      ,  0,
		     cos_60/2*t    ,  sin_60/2*t,
		    -cos_60/2*t    ,  sin_60/2*t,
		    ]);},
	};
		
	hexRadialLineSide[0] = hexRadialLineSide.north;
	hexRadialLineSide[1] = hexRadialLineSide.northEast;
	hexRadialLineSide[2] = hexRadialLineSide.southEast;
	hexRadialLineSide[3] = hexRadialLineSide.south;
	hexRadialLineSide[4] = hexRadialLineSide.southWest;
	hexRadialLineSide[5] = hexRadialLineSide.northWest;

	function directionForPoints(p0, p1, coordinateSystem) {
		p0 = coordinateSystem.toCubeCoordinates(p0);
		p1 = coordinateSystem.toCubeCoordinates(p1);

		var d = {x: p1.x-p0.x, y: p1.y-p0.y, z: p1.z-p0.z};

		for (var i = 0; i < direction.asArray.length; ++i) {
			var dir = direction.asArray[i];
			if 	( d.x === dir.x &&
				  d.y === dir.y &&
				  d.z === dir.z)
			{ return i; }
		}
		return -1;
	}

	function distance(p0, p1, coordinateSystem) {
		p0 = coordinateSystem.toCubeCoordinates(p0);
		p1 = coordinateSystem.toCubeCoordinates(p1);

		var dx = Math.abs(p1.x - p0.x);
		var dy = Math.abs(p1.y - p0.y);
		var dz = Math.abs(p1.z - p0.z);

		var d = (dx + dy + dz) / 2;

		return d;
	}

	function hexagon(p0, r, coordinateSystem) {
		p0 = coordinateSystem.toCubeCoordinates(p0);

		if (r === 0) {
			p0.index = 0;
			return [p0];
		}

    	var results = [];
    	var dir = direction.southWest;
    	var cube = {x:p0.x + r*dir.x, y:p0.y + r*dir.y, z:p0.z + r*dir.z,};
	    for (var i = 0; i < 6; ++i) {
	    	// Choose direction
	    	dir = direction.asArray[i];
	        for (var j = 0; j < r; ++j) {
	            if (coordinateSystem.cube.inBounds(cube)) {
	            	cube.index = i*(j+1);
	            	results.push(cube);
	            }
	            // Walk one step in the chosen direction
	            cube = {x:cube.x + dir.x, y:cube.y + dir.y, z:cube.z + dir.z,};
	        }
	    }

		return results;
	}

	function hexagonSpiral(p0, r, coordinateSystem) {
		p0 = coordinateSystem._toCubeCoordinates(p0);

	    var results = [p0];
    	for (var i = 1; i <= r; ++i) {
    		results.concat(hexagon(p0, i, coordinateSystem));
    	}
    	return results;
	}

	function hexagonDisc(p0, r, coordinateSystem) {
		p0 = coordinateSystem._toCubeCoordinates(p0);

		var results = [];
		for (var dx = -r; dx <= r; ++dx) {
			for (var dy = Math.max(-r, -dx-r); dy <= Math.min(r, -dx+r); ++dy) {
			    var dz = -dx-dy;
				var p = { x:p0.x+dx, y:p0.y+dy, z:p0.z+dz };
			    results.push(p);
			}
		}
		return results;
	}

	function getNeighbour(p0, direction, coordinateSystem) {
		var cubeCoord = coordinateSystem.toCubeCoordinates(p0);

		cubeCoord = {	x:cubeCoord.x+direction.x,
						y:cubeCoord.y+direction.y,
						z:cubeCoord.z+direction.z
					};

		return cubeCoord;
	}

	function getNeighbours(p0, coordinateSystem) {
		return hexagon(p0, 1, coordinateSystem);	
	}

	// ========================================================================
	// === Easing functions
	// ========================================================================
	// Courtesy of "http://gizma.com/easing"
	// 
	function easeInOutQuad (t, x, dx, duration) {
		t /= duration/2;
		if (t < 1) return dx/2*t*t + x;
		t--;
		return -dx/2 * (t*(t-2) - 1) + x;
	}
	function easeInOutExp (t, x, dx, duration) {
		t /= duration/2;
		if (t < 1) return dx/2 * Math.pow( 2, 10 * (t - 1) ) + x;
		t--;
		return dx/2 * ( -Math.pow( 2, -10 * t) + 2 ) + x;
	}
	// ========================================================================
	// == END Easing functions

	// ========================================================================
	// === Exported API
	// ========================================================================
	var API = {

		direction: direction,

		directionForPoints: directionForPoints,

		dist          : distance,
		hexagon       : hexagon,
		hexagonSpiral : hexagonSpiral,
		hexagonDisc   : hexagonDisc,

		getNeighbour : getNeighbour,
		getNeighbours: getNeighbours,

		cos_30 : cos_30,
		cos_60 : cos_60,
		sin_30 : sin_30,
		sin_60 : sin_60,
		tan_30 : tan_30,
		tan_60 : tan_60,

		hexagonWidth : hexagonWidth,
		hexagonHeight: hexagonHeight,

		randomGaussian : randomGaussian,
		randomInt      : randomInt,
		randomIntArray : randomIntArray,
		shuffleArray: shuffleArray,

		hexPoints        : hexPoints,
		hexShape         : hexShape,
		hexEdge            : hexEdge,
		hexRadialLineVertex: hexRadialLineVertex,
		hexRadialLineSide  : hexRadialLineSide,

		// Easing
		easeInOutQuad : easeInOutQuad,
		easeInOutExp : easeInOutExp,
	};

	return API;
}());
},{}],9:[function(require,module,exports){
// Define module HexUtil
'use strict';

/* jshint browserify: true */

module.exports = (function () {
	// ========================================================================
	// === Simple Linked List implementation ===
	// ========================================================================
	function LinkedList () {
		this.first = null;
		this.last  = null;
		this.length = 0;
	}
	LinkedList.prototype.insert = function (index, data){
		var insertAfterNode, dataNode;

		dataNode = new LinkedListNode(data);

		if (this.length === 0) {
			this.first = dataNode;
			this.last  = dataNode;
		} else {
			insertAfterNode = this.get(index);
			if (insertAfterNode.next !== null) {
				insertAfterNode.next.prev = dataNode;
			}
			insertAfterNode.next = data;
		}

		if (index === this.length-1) {
			this.last = dataNode;
		}

		this.length += 1;
		return;
	};

	LinkedList.prototype.remove = function (index) {
		return this.removeElement(this.getNode(index));
	};

	LinkedList.prototype.removeElement = function (node) {
		var removeNode;

		if (node === null) {return;}

		removeNode = node;
		if (removeNode.next !== null &&
			removeNode.prev !== null)
		{
			removeNode.next.prev = removeNode.prev;
			removeNode.prev.next = removeNode.next;
		}
		else if (removeNode.next === null &&
				 removeNode.prev === null)
		{
			this.first = null;
			this.last  = null;
		}
		else if (removeNode.next === null)
		{
			removeNode.prev.next = null;
			this.last            = removeNode.prev;
		}
		else if (removeNode.prev === null)
		{
			removeNode.next.prev = null;
			this.first           = removeNode.next;
		}

		removeNode.next = null;
		removeNode.prev = null;

		this.length -= 1;
		return removeNode.data;
	};

	LinkedList.prototype.get = function (index) {
		return this.getNode(index).data;
	};

	LinkedList.prototype.getNode = function (index) {
		var length, searchIndex, searchNode;

		length = this.length;
		if (length - index > length/2) {
			// Search from end
			searchIndex = length-index-1;
			searchNode  = this.last;
			while (searchIndex > 0) {
				searchIndex -= 1;
				searchNode   = searchNode.prev;
			}
		} else {
			// Search from start
			searchIndex = index;
			searchNode  = this.first;
			while (searchIndex > 0) {
				searchIndex -= 1;
				searchNode   = searchNode.next;
			}
		}
		return searchNode;
	};

	LinkedList.prototype.peek   = function () {};
	
	LinkedList.prototype.pop    = function () {
		var node;

		if (this.length === 0) {return null;}

		node = this.last;

		if (node.prev !== null) {
			node.prev.next = null;
		} else {
			this.first = null;
		}

		this.last = node.prev;

		this.length -= 1;
		return node.data;
	};
	
	LinkedList.prototype.push = function (data) {
		var node;

		node = new LinkedListNode(data);

		if (this.length === 0) {
			this.first = node;
			this.last  = node;
		} else {
			node.prev = this.last;
			this.last.next = node;
			this.last      = node;
		}

		this.length += 1;
		return;
	};

	// LinkedList.prototype.iterator = function* () {};

	function LinkedListNode (data) {
		this.next = null;
		this.prev = null;

		this.data = data;
	}
	// ========================================================================
	// === END Simple Linked List implementation

	// ========================================================================
	// === Hash set for coordinates
	// ========================================================================	
	function CoordinateSet () {
		this.hash = Object.create(null);
	}

	CoordinateSet.prototype.add = function ( x, y, z ) {
		var hash;

		hash = this.hash;
		hash = hash[x];
		if (hash === undefined) {
			this.hash[x] = Object.create(null);
			hash = this.hash[x];
		}

		hash = hash[y];
		if (hash === undefined) {
			this.hash[x][y] = Object.create(null);
			hash = this.hash[x][y];
		}

		hash[z] = true;
	};
	CoordinateSet.prototype.remove = function (x, y, z) {
		var hash;
		hash = this.hash[x];
		if (hash === undefined) {return;}
		hash = this.hash[y];
		if (hash === undefined) {return;}
		hash = this.hash[z];
		hash[z] = false;
	};
	CoordinateSet.prototype.in = function (x, y, z) {
		var hash = this.hash;
		hash = hash[x];
		hash = hash && hash[y];
		hash = hash && hash[z];
		return hash;
	};
	// ========================================================================
	// === END Hash set for coordinates

	// ========================================================================
	// === Exported API
	// ========================================================================
	var API = {
		LinkedList: LinkedList,
		CoordinateSet: CoordinateSet
	};
	return API;
}());
},{}],10:[function(require,module,exports){
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
},{"./app-controller.js":1,"./app-model.js":2,"./core/ox-animation-system.js":3,"./core/ox-cell.js":4,"./core/ox-grid.js":7,"./core/ox-math.js":8}]},{},[10])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9hcHAtY29udHJvbGxlci5qcyIsImpzL2FwcC1tb2RlbC5qcyIsImpzL2NvcmUvb3gtYW5pbWF0aW9uLXN5c3RlbS5qcyIsImpzL2NvcmUvb3gtY2VsbC5qcyIsImpzL2NvcmUvb3gtY29sb3IuanMiLCJqcy9jb3JlL294LWNvb3JkaW5hdGUuanMiLCJqcy9jb3JlL294LWdyaWQuanMiLCJqcy9jb3JlL294LW1hdGguanMiLCJqcy9jb3JlL294LXV0aWwuanMiLCJqcy9veC1hcHAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIERlZmluZSBtb2R1bGUgQ29udHJvbGxlclxuJ3VzZSBzdHJpY3QnO1xuXG4vKiBnbG9iYWxzIFBJWEkgKi9cblxuLyoganNoaW50IGJyb3dzZXJpZnk6IHRydWUgKi9cbi8qIGpzaGludCBkZXZlbDogdHJ1ZSAqL1xuXG52YXIgT3hNYXRoICAgPSByZXF1aXJlKCcuL2NvcmUvb3gtbWF0aC5qcycpO1xudmFyIE94R3JpZCAgID0gcmVxdWlyZSgnLi9jb3JlL294LWdyaWQuanMnKTtcbnZhciBBcHBNb2RlbCA9IHJlcXVpcmUoJy4vYXBwLW1vZGVsLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uICgpIHtcblxuXHRmdW5jdGlvbiBDb250cm9sbGVyICgpIHtcblxuXHRcdHRoaXMubW9kZWwgPSBudWxsO1xuXHRcdFxuXHRcdHRoaXMuZ3JpZCA9IHtcblx0XHRcdHNvdXJjZTogbnVsbCxcblx0XHRcdHRhcmdldDogbnVsbCxcblx0XHR9XG5cblx0XHR0aGlzLmJydXNoT2Zmc2V0Q29vcmQgPSBudWxsO1xuXG5cdFx0dGhpcy5nZW5lcmF0ZUJydXNoZXMoKTtcblxuXHR9XG5cblx0Q29udHJvbGxlci5wcm90b3R5cGUubG9hZExldmVsID0gZnVuY3Rpb24gKGxldmVsTmFtZSwgbGV2ZWxJbmRleCkge1xuXHRcdFxuXHRcdHZhciByZXR1cm5TdGF0dXM7XG5cblx0XHRpZiAobGV2ZWxJbmRleCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRsZXZlbEluZGV4ID0gMDtcblx0XHR9XG5cblx0XHR0aGlzLmxldmVsTmFtZSA9IGxldmVsTmFtZTtcblx0XHR0aGlzLmxldmVsSW5kZXggPSBsZXZlbEluZGV4O1xuXG5cdFx0Ly8gTG9hZCB0aGUgbGV2ZWxcblx0XHR0aGlzLm1vZGVsID0gbmV3IEFwcE1vZGVsKCk7XG5cdFx0cmV0dXJuU3RhdHVzID0gdGhpcy5tb2RlbC5sb2FkTGV2ZWwobGV2ZWxOYW1lLCBsZXZlbEluZGV4KTtcblx0XHRpZiAocmV0dXJuU3RhdHVzID09PSBmYWxzZSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0VSUjogQ291bGQgbm90IGxvYWQgbGV2ZWwgd2l0aCBsZXZlbCBuYW1lIFwiJyArXG5cdFx0XHRcdGxldmVsTmFtZSArXG5cdFx0XHRcdCdcIi4nKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvL1xuXHRcdHZhciBjZWxsQ29uZiA9IHtcblx0XHRzdHJva2U6IHtjb2xvcjoweDU4NzA1OCwgd2lkdGg6MC4xfSwgXG5cdFx0ZWRnZSAgOiB7Y29sb3I6MHhkZDIyMjIsIHdpZHRoOjAuMn0sXG5cdFx0cmFkaWFsOiB7IHZlcnRleDp7Y29sb3I6MHhmZmNkMDAsIHdpZHRoOjAuMTh9LFxuXHRcdFx0XHQgIHNpZGUgIDp7Y29sb3I6MHhmZmNkMDAsIHdpZHRoOjAuM319XG5cdCAgIH07XG5cblx0XHR2YXIgZ3JpZENvbmYgPSB7XG5cdFx0XHRzb3VyY2U6IHtcblx0XHRcdFx0cG9zaXRpb24gOiB7eDowLHk6MH0sXG5cdFx0XHRcdHNjYWxlICAgIDoge3g6MTAseToxMH0sXG5cdFx0XHRcdHNpemUgICAgIDoge3c6dGhpcy5tb2RlbC5zaXplLncsaDp0aGlzLm1vZGVsLnNpemUuaH0sXG5cdFx0XHRcdGNlbGwgICAgIDogY2VsbENvbmYsXG5cdFx0XHR9LFxuXHRcdFx0dGFyZ2V0OiB7XG5cdFx0XHRcdHBvc2l0aW9uIDoge3g6MTAwLHk6MH0sXG5cdFx0XHRcdHNjYWxlICAgIDoge3g6MTAseToxMH0sXG5cdFx0XHRcdHNpemUgICAgIDoge3c6dGhpcy5tb2RlbC5zaXplLncsaDp0aGlzLm1vZGVsLnNpemUuaH0sXG5cdFx0XHRcdGNlbGwgICAgIDogY2VsbENvbmYsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHQvLyBTZXQgdXAgdGhlIHR3byBncmlkc1xuXHRcdHRoaXMuZ3JpZCA9IHtcblx0XHRcdHNvdXJjZTogbmV3IE94R3JpZChncmlkQ29uZi5zb3VyY2UsIHRoaXMubW9kZWwuc291cmNlKSxcblx0XHRcdHRhcmdldDogbmV3IE94R3JpZChncmlkQ29uZi50YXJnZXQsIHRoaXMubW9kZWwudGFyZ2V0KSxcblx0XHR9XG5cblx0XHQvLyBTZXQgdXAgdGV4dFxuXHRcdHZhciB0ZXh0TGV2ZWwgID0gbmV3IFBJWEkuVGV4dCgnTGV2ZWwgJyArIGxldmVsTmFtZSArICcgLSAnICsgbGV2ZWxJbmRleCk7XG5cdFx0dmFyIHRleHRUYXJnZXQgPSBuZXcgUElYSS5UZXh0KCdUYXJnZXQnKTtcblx0XHR2YXIgdGV4dFNvdXJjZSA9IG5ldyBQSVhJLlRleHQoJ1NvdXJjZScpO1xuXHRcdHRleHRMZXZlbC5hbmNob3IgID0ge3g6MC41LCB5OjAuNX07XG5cdFx0dGV4dFRhcmdldC5hbmNob3IgPSB7eDowLjUsIHk6MC41fTtcblx0XHR0ZXh0U291cmNlLmFuY2hvciA9IHt4OjAuNSwgeTowLjV9O1xuXG5cdFx0Ly8gU2NlbmUgZ3JhcGhcblx0XHR0aGlzLmNvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpO1xuXHRcdHRoaXMuY29udGFpbmVyLmFkZENoaWxkKHRoaXMuZ3JpZC5zb3VyY2UuX2dyYXBoaWNzKTtcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0aGlzLmdyaWQudGFyZ2V0Ll9ncmFwaGljcyk7XG5cdFx0dGhpcy5jb250YWluZXIuYWRkQ2hpbGQodGV4dExldmVsKTtcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0ZXh0VGFyZ2V0KTtcblx0XHR0aGlzLmNvbnRhaW5lci5hZGRDaGlsZCh0ZXh0U291cmNlKTtcblxuXHRcdC8vIExheW91dFxuXHRcdHRoaXMuZ3JpZC5zb3VyY2UuY2VudGVyQXQoe3g6MTI1LCB5OjE1MH0pO1xuXHRcdHRoaXMuZ3JpZC50YXJnZXQuY2VudGVyQXQoe3g6Mzc1LCB5OjE1MH0pO1xuXHRcdHRleHRMZXZlbC5wb3NpdGlvbiAgPSB7eDoyNTAsIHk6MjV9O1xuXHRcdHRleHRUYXJnZXQucG9zaXRpb24gPSB7eDozNzUsIHk6Mjc1fTtcblx0XHR0ZXh0U291cmNlLnBvc2l0aW9uID0ge3g6MTI1LCB5OjI3NX07XG5cblx0XHR0aGlzLmRyYXcoKTtcblx0fTtcblxuXHRDb250cm9sbGVyLnByb3RvdHlwZS5sb2FkTmV4dExldmVsID0gZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMubG9hZExldmVsKHRoaXMubGV2ZWxOYW1lLCB0aGlzLmxldmVsSW5kZXgrMSk7XG5cdH1cblxuXHRDb250cm9sbGVyLnByb3RvdHlwZS5zaG93QnJ1c2ggPSBmdW5jdGlvbiAocG9pbnQpIHtcblx0XHR2YXIgaSwgY2VsbCwgb2Zmc2V0Q29vcmQ7XG5cblx0XHRvZmZzZXRDb29yZCA9IHRoaXMuZ3JpZC5zb3VyY2UuY29vcmRpbmF0ZVN5c3RlbS50b09mZnNldENvb3JkaW5hdGVzKHBvaW50KTtcblx0XHRpZiAodGhpcy5icnVzaE9mZnNldENvb3JkICAgIT09IG51bGwgICAgICAgICAgJiZcblx0XHRcdHRoaXMuYnJ1c2hPZmZzZXRDb29yZC5pID09PSBvZmZzZXRDb29yZC5pICYmXG5cdFx0XHR0aGlzLmJydXNoT2Zmc2V0Q29vcmQuaiA9PT0gb2Zmc2V0Q29vcmQuaikge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIGNsZWFyIHByZXYgYnJ1c2ggcG9pbnRcblx0XHR2YXIgcHJldkNlbGxzID0gdGhpcy5icnVzaC5jdXJyZW50LmdldENvb3JkcygpO1xuXHRcdGZvciAoaSA9IHByZXZDZWxscy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0Y2VsbCA9IHRoaXMuZ3JpZC5zb3VyY2UuZ2V0Q2VsbChwcmV2Q2VsbHNbaV0pO1xuXHRcdFx0Y2VsbC5oaWdobGlnaHQoZmFsc2UpO1xuXHRcdH07XG5cblx0XHQvLyBzaG93IHRoZSBuZXcgb25lXG5cdFx0dGhpcy5icnVzaE9mZnNldENvb3JkID0gb2Zmc2V0Q29vcmQ7XG5cdFx0dmFyIG5ld0Nvb3JkcyAgPSB0aGlzLmJydXNoLmN1cnJlbnQuZ2V0Q29vcmRzKCk7XG5cdFx0dmFyIG5ld1ZhbHVlcyAgPSB0aGlzLmJydXNoLmN1cnJlbnQuZ2V0VmFsdWVzKCk7XG5cdFx0dmFyIGNvbG9yO1xuXHRcdGZvciAoaSA9IG5ld0Nvb3Jkcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0Y29sb3IgPSB0aGlzLm1vZGVsLmNvbG9yUGFsZXR0ZVtuZXdWYWx1ZXNbaV1dO1xuXG5cdFx0XHRjZWxsID0gdGhpcy5ncmlkLnNvdXJjZS5nZXRDZWxsKG5ld0Nvb3Jkc1tpXSk7XG5cdFx0XHRjZWxsLmhpZ2hsaWdodCh0cnVlLCBjb2xvcik7XG5cdFx0fTtcblxuXHRcdHRoaXMuZHJhdygpO1xuXHR9XG5cblx0Q29udHJvbGxlci5wcm90b3R5cGUuYXBwbHlCcnVzaCA9IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBpZiAoKSB7XG5cblx0XHQvLyB9XG5cdFx0dmFyIGJydXNoQ29vcmRzID0gdGhpcy5icnVzaC5jdXJyZW50LmdldENvb3JkcygpO1xuXHRcdHZhciBicnVzaFZhbHVlcyA9IHRoaXMuYnJ1c2guY3VycmVudC5nZXRWYWx1ZXMoKTtcblx0XHR0aGlzLm1vZGVsLmFwcGx5T3BlcmF0aW9uVG9DZWxscygnc3VtJywgYnJ1c2hDb29yZHMsIGJydXNoVmFsdWVzKTtcblxuXHRcdHZhciBjZWxsLCBsaW5lYXJDb29yZCwgY29sb3I7XG5cdFx0Zm9yICh2YXIgaSA9IGJydXNoQ29vcmRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRjZWxsID0gdGhpcy5ncmlkLnNvdXJjZS5nZXRDZWxsKGJydXNoQ29vcmRzW2ldKTtcblx0XHRcdGxpbmVhckNvb3JkID0gdGhpcy5ncmlkLnNvdXJjZS5jb29yZGluYXRlU3lzdGVtLnRvTGluZWFyQ29vcmRpbmF0ZXMoYnJ1c2hDb29yZHNbaV0pO1xuXHRcdFx0XG5cdFx0XHRjb2xvciA9IHRoaXMubW9kZWwuc291cmNlW2xpbmVhckNvb3JkXS5jb2xvcjtcblx0XHRcdGNlbGwuY29sb3IgPSBjb2xvcjtcblx0XHR9O1xuXG5cdFx0dGhpcy5kcmF3KCk7XG5cblx0XHRpZiAodGhpcy5tb2RlbC5pc0xldmVsQ29tcGxldGUoKSkge1xuXHRcdFx0Ly8gVE9ETzogRW1pdCBldmVudHMgbmFkIG1ha2UgZmFuY3kgYW5pbWF0aW9uIGhvb2tzIGFuZCB3aGF0IG5vdC5cblx0XHRcdHRoaXMubG9hZE5leHRMZXZlbCgpO1xuXHRcdH1cblx0fVxuXG5cdENvbnRyb2xsZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5ncmlkLnNvdXJjZS5kcmF3KCk7XG5cdFx0dGhpcy5ncmlkLnRhcmdldC5kcmF3KCk7XG5cdH07XG5cblx0Q29udHJvbGxlci5wcm90b3R5cGUucmVuZGVyV2l0aCA9IGZ1bmN0aW9uIChyZW5kZXJlcikge1xuXHRcdHJlbmRlcmVyLnJlbmRlcih0aGlzLmNvbnRhaW5lcik7XG5cdH07XG5cblx0Q29udHJvbGxlci5wcm90b3R5cGUuZ2VuZXJhdGVCcnVzaGVzID0gZnVuY3Rpb24gKCkge1xuXHRcdHZhciBzZWxmO1xuXHRcdHNlbGYgPSB0aGlzO1xuXG5cdFx0dGhpcy5icnVzaCA9IHt9O1xuXHRcdFxuXHRcdGZ1bmN0aW9uIHRlc3RHZXRDb29yZHMgKCkge1xuXHRcdFx0aWYgKHNlbGYuYnJ1c2hPZmZzZXRDb29yZCA9PT0gbnVsbCkge1xuXHRcdFx0XHRyZXR1cm4gW107XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzZWxmLmJydXNoLnRlc3QuY3MgPSBzZWxmLmdyaWQuc291cmNlLmNvb3JkaW5hdGVTeXN0ZW07XG5cdFx0XHRcdHJldHVybiBPeE1hdGguaGV4YWdvbihzZWxmLmJydXNoT2Zmc2V0Q29vcmQsIDEsIHNlbGYuZ3JpZC5zb3VyY2UuY29vcmRpbmF0ZVN5c3RlbSk7XHRcblx0XHRcdH1cblx0XHR9O1xuXHRcdHRoaXMuYnJ1c2gudGVzdCA9IG5ldyBCcnVzaCh0ZXN0R2V0Q29vcmRzLCBbKzEsLTEsKzEsLTEsKzEsLTFdKTtcdFxuXG5cdFx0dGhpcy5icnVzaC5jdXJyZW50ID0gdGhpcy5icnVzaC50ZXN0O1xuXHR9O1xuXG5cdC8vID09PT09PT09PT09PT1cblx0Ly8gXG5cdGZ1bmN0aW9uIEJydXNoIChjYWxsYmFjaywgdmFsdWVzKSB7XG5cdFx0dGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG5cdFx0dGhpcy5nZXRDb29yZHMgPSBjYWxsYmFjaztcblx0fVxuXHRCcnVzaC5wcm90b3R5cGUuZ2V0VmFsdWVzID0gZnVuY3Rpb24gKCkge1xuXHRcdHZhciB2YWx1ZXMsIGNvb3JkcywgaW5kZXg7XG5cdFx0dmFsdWVzID0gW107XG5cdFx0Y29vcmRzID0gdGhpcy5nZXRDb29yZHMoKTtcblx0XHRmb3IgKHZhciBpID0gY29vcmRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRpbmRleCA9IGNvb3Jkc1tpXS5pbmRleDtcblx0XHRcdHZhbHVlc1tpXSA9IHRoaXMudmFsdWVzW2luZGV4XTtcblx0XHR9XG5cdFx0cmV0dXJuIHZhbHVlcztcblx0fVxuXG5cdHZhciBBUEkgPSBDb250cm9sbGVyO1xuXHRyZXR1cm4gQVBJO1xufSgpKTsiLCIvLyBEZWZpbmUgbW9kdWxlIE1vZGVsXG4ndXNlIHN0cmljdCc7XG5cbi8qIGpzaGludCBicm93c2VyaWZ5OiB0cnVlICovXG4vKiBqc2hpbnQgZGV2ZWw6IHRydWUgKi9cblxudmFyIE94Q29vcmRpbmF0ZSA9IHJlcXVpcmUoJy4vY29yZS9veC1jb29yZGluYXRlLmpzJyk7XG52YXIgT3hDb2xvciAgICAgID0gcmVxdWlyZSgnLi9jb3JlL294LWNvbG9yLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uICgpIHtcblxuXHR2YXIgbGV2ZWxzID0ge1xuXHRcdCd0ZXN0Jzoge1xuXHRcdFx0bnVtYmVyT2ZMZXZlbHM6IDIsXG5cdFx0XHQwOiB7c2l6ZToge3c6MyxoOjN9LCB0YXJnZXQ6ezA6LTEsMToxLDI6LTEsMzoxLDU6MSw3Oi0xLH19LFxuXHRcdFx0MToge3NpemU6IHt3OjcsaDo3fSwgdGFyZ2V0Ontcblx0XHRcdFx0IDk6LTEsIDEwOi0xLCAxMTotMSxcblx0XHRcdFx0MTU6LTEsIDE3Oi0xLCAxOTotMSxcblx0XHRcdFx0MjI6LTEsIDIzOi0xLCAyNTotMSwgMjY6LTEsXG5cdFx0XHRcdDI5Oi0xLCAzMDotMSwgMzI6LTEsIDMzOi0xLFxuXHRcdFx0XHQzODotMX0sXG5cdFx0XHR9LFxuXHRcdFx0Mjoge3NpemU6IHt3OjEwLGg6MTB9LCB0YXJnZXQ6ezE1OjEsMTY6MSwxNzoxLDE4OjEsMTk6MX19LFxuXHRcdC8vICd0dXRvcmlhbCc6IHt9LFxuXHRcdC8vICdiYXNpY3MnOiB7fSxcblx0XHR9LFxuXHR9O1xuXG5cdGZ1bmN0aW9uIE1vZGVsICgpIHtcblxuXHRcdHRoaXMuc2l6ZSA9IG51bGw7XG5cdFx0dGhpcy5zb3VyY2UgPSBbXTtcblx0XHR0aGlzLnRhcmdldCA9IFtdO1xuXG5cdFx0dGhpcy5jb29yZGluYXRlU3lzdGVtID0gbnVsbDtcblxuXHRcdHRoaXMuY29sb3JQYWxldHRlID0ge1xuXHRcdFx0JzEnIDogT3hDb2xvci5IU1YudG9JTlQoMC44LDAuOCwwLjgpLFxuXHRcdFx0JzAnIDogT3hDb2xvci5IU1YudG9JTlQoMC42LDAuNiwwLjYpLFxuXHRcdFx0Jy0xJzogT3hDb2xvci5IU1YudG9JTlQoMC4yLDAuOCwwLjgpLFxuXHRcdH07XG5cdH1cblxuXHRNb2RlbC5wcm90b3R5cGUubG9hZExldmVsID0gZnVuY3Rpb24gKGxldmVsTmFtZSwgbGV2ZWxJbmRleCkge1xuXG5cdFx0dmFyIGxldmVsID0gbGV2ZWxzW2xldmVsTmFtZV1bbGV2ZWxJbmRleF07XG5cdFx0aWYgKGxldmVsID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnRVJSOiBMZXZlbCB3aXRoIG5hbWUgKFwiJyArXG5cdFx0XHRcdGxldmVsTmFtZSArXG5cdFx0XHRcdCdcIikgYW5kIGluZGV4IChcIicgK1xuXHRcdFx0XHRsZXZlbEluZGV4ICtcblx0XHRcdFx0J1wiKSBkb2VzIG5vdCBleGlzdC4nKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBJbml0IHNpemVcblx0XHR0aGlzLnNpemUgPSB7XG5cdFx0XHR3OiBsZXZlbC5zaXplLncsXG5cdFx0XHRoOiBsZXZlbC5zaXplLmgsXG5cdFx0XHRuOiBsZXZlbC5zaXplLncgKiBsZXZlbC5zaXplLmgsXG5cdFx0fTtcblxuXHRcdHRoaXMuY29vcmRpbmF0ZVN5c3RlbSA9IG5ldyBPeENvb3JkaW5hdGUuU3lzdGVtKHRoaXMuc2l6ZSk7XG5cblx0XHQvLyBJbml0IHNvdXJjZVxuXHRcdHRoaXMuaW5pdFNvdXJjZSgpO1xuXG5cdFx0Ly8gSW5pdCB0YXJnZXRcblx0XHR0aGlzLmxvYWRUYXJnZXQobGV2ZWwudGFyZ2V0KTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcblxuXHRNb2RlbC5wcm90b3R5cGUuaW5pdFNvdXJjZSA9IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgaSwgc2VsZjtcblxuXHRcdHNlbGYgPSB0aGlzO1xuXG5cdFx0Zm9yIChpID0gdGhpcy5zaXplLm4gLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0dGhpcy5zb3VyY2VbaV0gPSB7XG5cdFx0XHRcdHZhbHVlOiAwLFxuXHRcdFx0fTtcblx0XHRcdChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHZhciBpbm5lckluZGV4ID0gaTtcblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHNlbGYuc291cmNlW2lubmVySW5kZXhdLCAnY29sb3InLCB7XG5cdFx0XHRcdGdldDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNlbGYuY29sb3JQYWxldHRlW3NlbGYuc291cmNlW2lubmVySW5kZXhdLnZhbHVlLnRvU3RyaW5nKCldO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSgpKTtcblx0XHR9XG5cdFx0XG5cdFx0cmV0dXJuIHRydWU7XG5cdH07XG5cblx0TW9kZWwucHJvdG90eXBlLmxvYWRUYXJnZXQgPSBmdW5jdGlvbiAodGFyZ2V0KSB7XG5cdFx0dmFyIGksIHNlbGYsIHZhbHVlO1xuXG5cdFx0c2VsZiA9IHRoaXM7XG5cblx0XHRmb3IgKGkgPSB0aGlzLnNpemUubiAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHR2YWx1ZSA9ICh0YXJnZXRbaV0pID8gKHRhcmdldFtpXSkgOiAoMCkgO1xuXHRcdFx0dGhpcy50YXJnZXRbaV0gPSB7XG5cdFx0XHRcdHZhbHVlOiB2YWx1ZSxcblx0XHRcdH07XG5cdFx0XHQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR2YXIgaW5uZXJJbmRleCA9IGk7XG5cdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzZWxmLnRhcmdldFtpbm5lckluZGV4XSwgJ2NvbG9yJywge1xuXHRcdFx0XHRnZXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBzZWxmLmNvbG9yUGFsZXR0ZVtzZWxmLnRhcmdldFtpbm5lckluZGV4XS52YWx1ZS50b1N0cmluZygpXTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KTtcblx0XHRcdH0oKSk7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXG5cdE1vZGVsLnByb3RvdHlwZS5pc0xldmVsQ29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIGk7XG5cblx0XHRmb3IgKGkgPSB0aGlzLnNpemUubiAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRpZiAodGhpcy5zb3VyY2VbaV0udmFsdWUgIT09IHRoaXMudGFyZ2V0W2ldLnZhbHVlKSB7cmV0dXJuIGZhbHNlO31cblx0XHR9XG5cdFx0cmV0dXJuIHRydWU7XG5cdH07XG5cblx0TW9kZWwucHJvdG90eXBlLmFwcGx5T3BlcmF0aW9uVG9DZWxscyA9IGZ1bmN0aW9uIChvcGVyYXRpb24sIGN1YmVDb29yZHMsIHZhbHVlcykge1xuXG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KGN1YmVDb29yZHMpKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnRVJSOiBcImN1YmVDb29yZHNcIiBpcyBub3QgYW4gYXJyYXkuJyk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZXMpKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnRVJSOiBcInZhbHVlc1wiIGlzIG5vdCBhbiBhcnJheS4nKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0aWYgKGN1YmVDb29yZHMubGVuZ3RoICE9PSB2YWx1ZXMubGVuZ3RoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnRVJSOiBcImN1YmVDb29yZHNcIiAobGVuICcgK1xuXHRcdFx0XHRjdWJlQ29vcmRzLmxlbmd0aCArIFxuXHRcdFx0XHQnKSBhbmQgXCJ2YWx1ZXNcIiAobGVuICcgK1xuXHRcdFx0XHR2YWx1ZXMubGVuZ3RoICtcblx0XHRcdFx0Jykgb2YgZGlmZmVyZW50IGxlbmd0aC4nKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHR2YXIgaSwgcmV0dXJuU3RhdHVzO1xuXHRcdGZvciAoaSA9IGN1YmVDb29yZHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdHJldHVyblN0YXR1cyA9IHRoaXMuYXBwbHlPcGVyYXRpb25Ub0NlbGwob3BlcmF0aW9uLCBjdWJlQ29vcmRzW2ldLCB2YWx1ZXNbaV0pO1xuXHRcdFx0aWYgKHJldHVyblN0YXR1cyA9PT0gZmFsc2UpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0VSUjogQ291bGQgbm90IGFwcGx5IHRlcm5hcnkgb3BlcmF0aW9uIGF0IGluZGV4IFwiJyArXG5cdFx0XHRcdFx0aSArXG5cdFx0XHRcdFx0J1wiJywgY3ViZUNvb3JkcywgdmFsdWVzKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXG5cdE1vZGVsLnByb3RvdHlwZS5hcHBseU9wZXJhdGlvblRvQ2VsbCA9IGZ1bmN0aW9uIChvcGVyYXRpb24sIGN1YmVDb29yZCwgYnJ1c2hWYWx1ZSkge1xuXHRcdHZhciBpbmRleFNvdXJjZSA9IHRoaXMuY29vcmRpbmF0ZVN5c3RlbS50b0xpbmVhckNvb3JkaW5hdGVzKGN1YmVDb29yZCk7XG5cdFx0dmFyIHNvdXJjZVZhbHVlID0gdGhpcy5zb3VyY2VbaW5kZXhTb3VyY2VdO1xuXG5cdFx0dmFyIGEsIGIsIHI7XG5cdFx0YSA9IGJydXNoVmFsdWU7XG5cdFx0YiA9IHNvdXJjZVZhbHVlLnZhbHVlO1xuXG5cdFx0aWYgKCAhKGEgPT09IDEgfHwgYSA9PT0gMCB8fCBhID09PSAtMSkgKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnRVJSOiBCcnVzaCBjb250YWlucyBpbnZhbGlkIHRlcm5hcnkgdmFsdWUgKFwiJyArXG5cdFx0XHRcdGEgK1xuXHRcdFx0XHQnXCIpLicpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRpZiAoICEoYiA9PT0gMSB8fCBiID09PSAwIHx8IGIgPT09IC0xKSApIHtcblx0XHRcdGNvbnNvbGUubG9nKCdFUlI6IExldmVsW1wiJyArXG5cdFx0XHRcdGluZGV4U291cmNlICtcblx0XHRcdFx0J1wiXSBjb250YWlucyBpbnZhbGlkIHRlcm5hcnkgdmFsdWUgKFwiJyArXG5cdFx0XHRcdGIgK1xuXHRcdFx0XHQnXCIpLicpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHN3aXRjaCAob3BlcmF0aW9uKSB7XG5cdFx0XHRjYXNlICdhbmQnOlxuXHRcdFx0Y2FzZSAnbWluJzpcblx0XHRcdFx0ciA9IE1hdGgubWluKGEsIGIpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ29yJyA6XG5cdFx0XHRjYXNlICdtYXgnOlxuXHRcdFx0XHRyID0gTWF0aC5tYXgoYSwgYik7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAneG9yJzpcblx0XHRcdFx0ciA9IC0oYSpiKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdzdW0nOlxuXHRcdFx0XHRyID0gKGErYik7XG5cdFx0XHRcdHIgPSAoTWF0aC5hYnMocikgPT09IDIpID8gKC1NYXRoLnNpZ24ocikpIDogKHIpIDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdub3QnOlxuXHRcdFx0XHRyID0gLWI7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHR9XG5cblx0XHR0aGlzLnNvdXJjZVtpbmRleFNvdXJjZV0udmFsdWUgPSByO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXG5cdHZhciBBUEkgPSBNb2RlbDtcblx0cmV0dXJuIEFQSTtcbn0oKSk7IiwiLy8gRGVmaW5lIG1vZHVsZSBPeEFuaW1hdGlvblN5c3RlbVxuJ3VzZSBzdHJpY3QnO1xuXG4vKiBqc2hpbnQgYnJvd3NlcmlmeTogdHJ1ZSAqL1xuXG52YXIgT3hVdGlsID0gcmVxdWlyZSgnLi9veC11dGlsLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uICgpIHtcblxuICAgIC8vID09PSBBbmltYXRpb24gTGlzdCA9PT1cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBmdW5jdGlvbiBBbmltYXRpb25TeXN0ZW0gKHJlbmRlckNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMucHJldlRpbWUgPSAtMTtcbiAgICAgICAgdGhpcy5hbmltTGlzdCA9IG5ldyBPeFV0aWwuTGlua2VkTGlzdCgpO1xuICAgICAgICB0aGlzLnJlbmRlckNhbGxiYWNrID0gcmVuZGVyQ2FsbGJhY2s7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBjYWxsYmFjayhkdCwgY3VycmVudFRpbWUpXG4gICAgICogICAgIEEgZnVuY3Rpb24gcHJvdmlkaW5nIHRoZSBhY3V0YWwgYW5pbWF0aW9uLlxuICAgICAqICAgICB0aGlzICAgICAgIDogQW4gQW5pbWF0aW9uIG9iamVjdC5cbiAgICAgKiAgICAgZHQgICAgICAgICA6IFRpbWUgc2luY2UgbGFzdCBmcmFtZVxuICAgICAqICAgICBjdXJyZW50VGltZTogQW4gYWJzb2x1dGUgbWVhc3VyZSBvZiB0aW1lLiBcbiAgICAgKi9cbiAgICBBbmltYXRpb25TeXN0ZW0ucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICB2YXIgYW5pbTtcbiAgICAgICAgYW5pbSA9IG5ldyBBbmltYXRpb24oY2FsbGJhY2spO1xuICAgICAgICB0aGlzLmFuaW1MaXN0LnB1c2goYW5pbSk7XG4gICAgfTtcblxuICAgIEFuaW1hdGlvblN5c3RlbS5wcm90b3R5cGUudXBkYXRlQW5kUHVyZ2UgPSBmdW5jdGlvbiAoZHQsIGN1cnJlbnRUaW1lKSB7XG4gICAgICAgIHZhciBub2RlLCBuZXh0Tm9kZSwgZGF0YSwgaXNFeHBpcmVkO1xuICAgICAgICBub2RlID0gdGhpcy5hbmltTGlzdC5maXJzdDtcblxuICAgICAgICB3aGlsZSAobm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgZGF0YSA9IG5vZGUuZGF0YTtcblxuICAgICAgICAgICAgbmV4dE5vZGUgID0gbm9kZS5uZXh0O1xuICAgICAgICAgICAgaXNFeHBpcmVkID0gZGF0YS51cGRhdGUoZHQsIGN1cnJlbnRUaW1lKTtcblxuICAgICAgICAgICAgaWYgKGlzRXhwaXJlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYW5pbUxpc3QucmVtb3ZlKG5vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBub2RlID0gbmV4dE5vZGU7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQW5pbWF0aW9uU3lzdGVtLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoZHQsIGN1cnJlbnRUaW1lKSB7XG4gICAgICAgIHZhciBub2RlLCBkYXRhO1xuICAgICAgICBub2RlID0gdGhpcy5hbmltTGlzdC5maXJzdDtcblxuICAgICAgICB3aGlsZSAobm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgZGF0YSA9IG5vZGUuZGF0YTtcblxuICAgICAgICAgICAgZGF0YS51cGRhdGUoZHQsIGN1cnJlbnRUaW1lKTtcblxuICAgICAgICAgICAgbm9kZSA9IG5vZGUubmV4dDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgLy8gQW5pbWF0aW9uU3lzdGVtLnByb3RvdHlwZS5wdXJnZSAgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gICAgIHZhciBub2RlLCBuZXh0Tm9kZSwgZGF0YTtcbiAgICAgICAgXG4gICAgLy8gICAgIG5vZGUgID0gYW5pbUxpc3QuZmlyc3Q7XG5cbiAgICAvLyAgICAgd2hpbGUgKG5vZGUgIT09IG51bGwpIHtcbiAgICAvLyAgICAgICAgIGRhdGEgPSBub2RlLmRhdGE7XG5cbiAgICAvLyAgICAgICAgIG5leHROb2RlID0gbm9kZS5uZXh0O1xuXG4gICAgLy8gICAgICAgICBpZiAoZGF0YS5pc0V4cGlyZWQoKSkge1xuICAgIC8vICAgICAgICAgICAgIGFuaW1MaXN0LnJlbW92ZShub2RlKTtcbiAgICAvLyAgICAgICAgIH1cblxuICAgIC8vICAgICAgICAgbm9kZSA9IG5leHROb2RlO1xuICAgIC8vICAgICB9XG4gICAgLy8gfTtcbiAgICBcbiAgICBBbmltYXRpb25TeXN0ZW0ucHJvdG90eXBlLmFuaW1hdGUgPSBmdW5jdGlvbiAoY3VycmVudFRpbWUpIHtcbiAgICAgICAgdmFyIGR0O1xuXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdGUuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgaWYgKHRoaXMucHJldlRpbWUgPT09IC0xIHx8IHRoaXMucHJldlRpbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5wcmV2VGltZSA9IGN1cnJlbnRUaW1lO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZHQgPSBjdXJyZW50VGltZSAtIHRoaXMucHJldlRpbWU7XG4gICAgICAgIHRoaXMucHJldlRpbWUgPSBjdXJyZW50VGltZTtcblxuICAgICAgICB0aGlzLnVwZGF0ZUFuZFB1cmdlKGR0LCBjdXJyZW50VGltZSk7XG4gICAgICAgIHRoaXMucmVuZGVyQ2FsbGJhY2soKTtcbiAgICB9O1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gPT09IEVORCBBbmltYXRpb24gTGlzdCA9PT1cbiAgICBcbiAgICAvLyA9PT0gQW5pbWF0aW9uID09PVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFxuICAgIC8qXG4gICAgICogY2FsbGJhY2soZHQsIGN1cnJlbnRUaW1lKVxuICAgICAqICAgICBBIGZ1bmN0aW9uIHByb3ZpZGluZyB0aGUgYWN1dGFsIGFuaW1hdGlvbi5cbiAgICAgKiAgICAgdGhpcyAgICAgICA6IFRoZSBBbmltYXRpb24gb2JqZWN0LlxuICAgICAqICAgICBkdCAgICAgICAgIDogVGltZSBzaW5jZSBsYXN0IGZyYW1lXG4gICAgICogICAgIGN1cnJlbnRUaW1lOiBBbiBhYnNvbHV0ZSBtZWFzdXJlIG9mIHRpbWUuXG4gICAgICovIFxuICAgIGZ1bmN0aW9uIEFuaW1hdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIH1cbiAgICBcbiAgICBBbmltYXRpb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChkdCwgY3VycmVudFRpbWUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLCBkdCwgY3VycmVudFRpbWUpO1xuICAgIH07XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyA9PT0gRU5EIEFuaW1hdGlvbiA9PT0gXG5cbiAgICAvLyBFeHRlcm5hbCBBUElcbiAgICB2YXIgQVBJID0ge1xuICAgICAgICBBbmltYXRpb25TeXN0ZW06IEFuaW1hdGlvblN5c3RlbSxcbiAgICAgICAgQW5pbWF0aW9uICAgICAgOiBBbmltYXRpb25cbiAgICB9O1xuXG4gICAgcmV0dXJuIEFQSTtcbn0oKSk7IiwiLy8gRGVmaW5lIG1vZHVsZSBPeENlbGxcbid1c2Ugc3RyaWN0JztcblxuLyoganNoaW50IGJyb3dzZXJpZnk6IHRydWUgKi9cbi8qIGdsb2JhbHMgUElYSSAqL1xuXG52YXIgT3hNYXRoICA9IHJlcXVpcmUoJy4vb3gtbWF0aC5qcycpO1xudmFyIE94Q29sb3IgPSByZXF1aXJlKCcuL294LWNvbG9yLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIENlbGwoIHBvc2l0aW9uLCBzY2FsZSwgY29sb3IsIGNvbmYpIHtcbiAgICAgICAgdGhpcy5fZ3JhcGhpY3MgPSBuZXcgUElYSS5HcmFwaGljcygpO1xuICAgICAgICB0aGlzLl9ncmFwaGljcy5wb3NpdGlvbi54ID0gcG9zaXRpb24ueDtcbiAgICAgICAgdGhpcy5fZ3JhcGhpY3MucG9zaXRpb24ueSA9IHBvc2l0aW9uLnk7XG4gICAgICAgIHRoaXMuX2dyYXBoaWNzLnNjYWxlLnggPSBzY2FsZS54O1xuICAgICAgICB0aGlzLl9ncmFwaGljcy5zY2FsZS55ID0gc2NhbGUueTtcbiAgICAgICAgdGhpcy5jb2xvciAgICAgICAgICA9IGNvbG9yO1xuICAgICAgICB0aGlzLmhpZ2hsaWdodENvbG9yID0gY29sb3I7XG5cbiAgICAgICAgdGhpcy5yYWRpYWxWZXJ0ZXhMaW5lcyAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5yYWRpYWxWZXJ0ZXhMaW5lV2lkdGggPSAwO1xuICAgICAgICB0aGlzLnJhZGlhbFZlcnRleExpbmVDb2xvciA9IDA7XG5cbiAgICAgICAgdGhpcy5yYWRpYWxTaWRlTGluZXMgICAgID0gW107XG4gICAgICAgIHRoaXMucmFkaWFsU2lkZUxpbmVXaWR0aCA9IDA7XG4gICAgICAgIHRoaXMucmFkaWFsU2lkZUxpbmVDb2xvciA9IDA7XG5cbiAgICAgICAgdGhpcy5lZGdlcyAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5lZGdlV2lkdGggPSAwO1xuICAgICAgICB0aGlzLmVkZ2VDb2xvciA9IDA7XG5cbiAgICAgICAgdGhpcy5zdHJva2UgICAgICA9IGZhbHNlO1xuICAgICAgICB0aGlzLnN0cm9rZVdpZHRoID0gMDtcbiAgICAgICAgdGhpcy5zdHJva2VDb2xvciA9IDA7XG5cbiAgICAgICAgaWYgKGNvbmYpIHtcbiAgICAgICAgICAgIHRoaXMucmFkaWFsVmVydGV4TGluZXMgICAgID0gW107XG4gICAgICAgICAgICB0aGlzLnJhZGlhbFZlcnRleExpbmVXaWR0aCA9IGNvbmYucmFkaWFsLnZlcnRleC53aWR0aDtcbiAgICAgICAgICAgIHRoaXMucmFkaWFsVmVydGV4TGluZUNvbG9yID0gY29uZi5yYWRpYWwudmVydGV4LmNvbG9yO1xuXG4gICAgICAgICAgICB0aGlzLnJhZGlhbFNpZGVMaW5lcyAgICAgPSBbXTtcbiAgICAgICAgICAgIHRoaXMucmFkaWFsU2lkZUxpbmVXaWR0aCA9IGNvbmYucmFkaWFsLnNpZGUud2lkdGg7XG4gICAgICAgICAgICB0aGlzLnJhZGlhbFNpZGVMaW5lQ29sb3IgPSBjb25mLnJhZGlhbC5zaWRlLmNvbG9yO1xuXG4gICAgICAgICAgICB0aGlzLmVkZ2VzICAgICA9IFtdO1xuICAgICAgICAgICAgdGhpcy5lZGdlV2lkdGggPSBjb25mLmVkZ2Uud2lkdGg7XG4gICAgICAgICAgICB0aGlzLmVkZ2VDb2xvciA9IGNvbmYuZWRnZS5jb2xvcjtcblxuICAgICAgICAgICAgdGhpcy5zdHJva2UgICAgICA9IGNvbmYuc3Ryb2tlLmNvbG9yICE9PSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLnN0cm9rZVdpZHRoID0gY29uZi5zdHJva2Uud2lkdGg7XG4gICAgICAgICAgICB0aGlzLnN0cm9rZUNvbG9yID0gY29uZi5zdHJva2UuY29sb3I7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmlzSGlnaGxpZ2h0ZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBDZWxsLnByb3RvdHlwZS5wdXNoQ29sb3IgPSBmdW5jdGlvbiAobmV3Q29sb3IpIHtcbiAgICAvLyAgICAgdGhpcy5fY29sb3JTdGFjay5wdXNoKHRoaXMuY29sb3IpO1xuICAgIC8vICAgICB0aGlzLmNvbG9yID0gbmV3Q29sb3I7XG4gICAgLy8gICAgIHRoaXMuZHJhdygpO1xuICAgIC8vIH07XG4gICAgLy8gQ2VsbC5wcm90b3R5cGUucG9wQ29sb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gICAgIGlmICh0aGlzLl9jb2xvclN0YWNrKSB7XG4gICAgLy8gICAgICAgICB0aGlzLmNvbG9yID0gdGhpcy5fY29sb3JTdGFjay5wb3AoKTtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICB0aGlzLmRyYXcoKTtcbiAgICAvLyB9O1xuXG4gICAgQ2VsbC5wcm90b3R5cGUuaGlnaGxpZ2h0ID0gZnVuY3Rpb24gKGRvSGlnaGxpZ2h0LCBjb2xvcikge1xuICAgICAgICBpZiAoZG9IaWdobGlnaHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5pc0hpZ2hsaWdodGVkID0gIXRoaXMuaXNIaWdobGlnaHRlZDtcbiAgICAgICAgfSBlbHNlIGlmIChkb0hpZ2hsaWdodCkge1xuICAgICAgICAgICAgdGhpcy5pc0hpZ2hsaWdodGVkID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXNIaWdobGlnaHRlZCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5oaWdobGlnaHRDb2xvciA9IGNvbG9yO1xuICAgICAgICBpZiAodGhpcy5oaWdobGlnaHRDb2xvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLmhpZ2hsaWdodENvbG9yID0gdGhpcy5jb2xvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZHJhdygpO1xuICAgICAgICAvLyBUT0RPOiBTaWduYWwgZGlydHkgY2VsbFxuICAgIH07XG5cbiAgICBDZWxsLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY29sb3IsXG4gICAgICAgICAgICBsaW5lLFxuICAgICAgICAgICAgaUxpbmUsXG4gICAgICAgICAgICBlZGdlLFxuICAgICAgICAgICAgZWRnZVNoYXBlLFxuICAgICAgICAgICAgaUVkZ2U7XG5cbiAgICAgICAgLy8gTWFpbiBoZXhhZ29uXG4gICAgICAgIHRoaXMuX2dyYXBoaWNzLmNsZWFyKCk7IC8vIEltcG9ydGFudCwgb3RoZXJ3aXNlIG1lbS1jb25zdW1wdGlvbiB3aWxsIGV4cGxvZGUhXG4gICAgICAgIHRoaXMuX2dyYXBoaWNzLmJlZ2luRmlsbCh0aGlzLmNvbG9yKTtcbiAgICAgICAgdGhpcy5fZ3JhcGhpY3MuZHJhd1NoYXBlKE94TWF0aC5oZXhTaGFwZSk7XG4gICAgICAgIHRoaXMuX2dyYXBoaWNzLmVuZEZpbGwoKTtcblxuICAgICAgICBpZiAodGhpcy5pc0hpZ2hsaWdodGVkKSB7XG4gICAgICAgICAgICB2YXIgY29sb3I7XG4gICAgICAgICAgICBjb2xvciA9IHRoaXMuaGlnaGxpZ2h0Q29sb3I7XG4gICAgICAgICAgICAvLyBjb2xvciA9IE94Q29sb3IuYnJpZ2h0ZW4odGhpcy5oaWdobGlnaHRDb2xvcik7XG4gICAgICAgICAgICB0aGlzLl9ncmFwaGljcy5iZWdpbkZpbGwoY29sb3IsIDAuNik7XG4gICAgICAgICAgICB0aGlzLl9ncmFwaGljcy5kcmF3U2hhcGUoT3hNYXRoLmhleFNoYXBlKTtcbiAgICAgICAgICAgIHRoaXMuX2dyYXBoaWNzLmVuZEZpbGwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJhZGlhbCBsaW5lcyB0byB2ZXJ0ZWNpZXNcbiAgICAgICAgaWYgKHRoaXMucmFkaWFsVmVydGV4TGluZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9ncmFwaGljcy5iZWdpbkZpbGwodGhpcy5yYWRpYWxWZXJ0ZXhMaW5lQ29sb3IpO1xuICAgICAgICAgICAgZm9yIChpTGluZSA9IHRoaXMucmFkaWFsVmVydGV4TGluZXMubGVuZ3RoIC0gMTsgaUxpbmUgPj0gMDsgLS1pTGluZSkge1xuICAgICAgICAgICAgICAgIGxpbmUgICAgICA9IHRoaXMucmFkaWFsVmVydGV4TGluZXNbaUxpbmVdO1xuICAgICAgICAgICAgICAgIGVkZ2VTaGFwZSA9IE94TWF0aC5oZXhSYWRpYWxMaW5lVmVydGV4W2xpbmVdKHRoaXMucmFkaWFsVmVydGV4TGluZVdpZHRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9ncmFwaGljcy5kcmF3U2hhcGUoZWRnZVNoYXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2dyYXBoaWNzLmVuZEZpbGwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJhZGlhbCBsaW5lcyB0byBzaWRlc1xuICAgICAgICBpZiAodGhpcy5yYWRpYWxTaWRlTGluZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9ncmFwaGljcy5iZWdpbkZpbGwodGhpcy5yYWRpYWxTaWRlTGluZUNvbG9yKTtcbiAgICAgICAgICAgIGZvciAoaUxpbmUgPSB0aGlzLnJhZGlhbFNpZGVMaW5lcy5sZW5ndGggLSAxOyBpTGluZSA+PSAwOyAtLWlMaW5lKSB7XG4gICAgICAgICAgICAgICAgbGluZSAgICAgID0gdGhpcy5yYWRpYWxTaWRlTGluZXNbaUxpbmVdO1xuICAgICAgICAgICAgICAgIGVkZ2VTaGFwZSA9IE94TWF0aC5oZXhSYWRpYWxMaW5lU2lkZVtsaW5lXSh0aGlzLnJhZGlhbFNpZGVMaW5lV2lkdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2dyYXBoaWNzLmRyYXdTaGFwZShlZGdlU2hhcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fZ3JhcGhpY3MuZW5kRmlsbCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3BlY2lmaWMgZWRnZXNcbiAgICAgICAgaWYgKHRoaXMuZWRnZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLl9ncmFwaGljcy5iZWdpbkZpbGwodGhpcy5lZGdlQ29sb3IpO1xuICAgICAgICAgICAgZm9yIChpRWRnZSA9IHRoaXMuZWRnZXMubGVuZ3RoIC0gMTsgaUVkZ2UgPj0gMDsgLS1pRWRnZSkge1xuICAgICAgICAgICAgICAgIGVkZ2UgICAgICA9IHRoaXMuZWRnZXNbaUVkZ2VdO1xuICAgICAgICAgICAgICAgIGVkZ2VTaGFwZSA9IE94TWF0aC5oZXhFZGdlW2VkZ2VdKHRoaXMuZWRnZVdpZHRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9ncmFwaGljcy5kcmF3U2hhcGUoZWRnZVNoYXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2dyYXBoaWNzLmVuZEZpbGwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN0cm9rZVxuICAgICAgICBpZiAodGhpcy5zdHJva2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2dyYXBoaWNzLmxpbmVTdHlsZSggdGhpcy5zdHJva2VXaWR0aCwgdGhpcy5zdHJva2VDb2xvciwgMSApO1xuICAgICAgICAgICAgdGhpcy5fZ3JhcGhpY3MuZHJhd1NoYXBlKCBPeE1hdGguaGV4U2hhcGUgKTtcbiAgICAgICAgICAgIHRoaXMuX2dyYXBoaWNzLmxpbmVTdHlsZSggdGhpcy5zdHJva2VXaWR0aCwgdGhpcy5zdHJva2VDb2xvciwgMCApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGV4dFxuICAgIH07XG5cbiAgICBDZWxsLnByb3RvdHlwZS5yZW5kZXJXaXRoID0gZnVuY3Rpb24gKCByZW5kZXJlciApIHtcbiAgICAgICAgcmVuZGVyZXIucmVuZGVyKHRoaXMuX2dyYXBoaWNzKTtcbiAgICB9O1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gPT09IENlbGwgRmFjdG9yeVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGZ1bmN0aW9uIEZhY3RvcnkocG9zaXRpb24sIHNjYWxlLCBjb2xvciwgY29uZikge1xuICAgICAgICB0aGlzLnBvc2l0aW9uID0gcG9zaXRpb247XG4gICAgICAgIHRoaXMuc2NhbGUgICAgPSBzY2FsZTtcbiAgICAgICAgdGhpcy5jb2xvciAgICA9IGNvbG9yO1xuICAgICAgICB0aGlzLmNvbmYgICAgID0gY29uZjtcbiAgICB9XG5cbiAgICBGYWN0b3J5LnByb3RvdHlwZS5uZXdDZWxsID0gZnVuY3Rpb24oc2hhbGxvd0NvcHkpIHtcbiAgICAgICAgdmFyIHBvc2l0aW9uLFxuICAgICAgICAgICAgc2NhbGUsXG4gICAgICAgICAgICBjb2xvcixcbiAgICAgICAgICAgIGNvbmY7XG5cbiAgICAgICAgaWYgKHNoYWxsb3dDb3B5KSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IHRoaXMucG9zaXRpb247ICAgIFxuICAgICAgICAgICAgc2NhbGUgPSB0aGlzLnNjYWxlO1xuICAgICAgICAgICAgY29sb3IgPSB0aGlzLmNvbG9yO1xuICAgICAgICAgICAgY29uZiA9IHRoaXMuY29uZjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbi5jbG9uZSgpXG4gICAgICAgICAgICBwb3NpdGlvbiA9IHt4OiB0aGlzLnBvc2l0aW9uLngsIHk6dGhpcy5wb3NpdGlvbi55fTtcbiAgICAgICAgICAgIC8vIHNjYWxlID0gdGhpcy5zY2FsZS5jbG9uZSgpXG4gICAgICAgICAgICBzY2FsZSA9IHt4OiB0aGlzLnNjYWxlLngsIHk6dGhpcy5zY2FsZS55fTtcbiAgICAgICAgICAgIC8vIGNvbG9yID0gdGhpcy5jb2xvci5jbG9uZSgpXG4gICAgICAgICAgICBjb2xvciA9IHRoaXMuY29sb3I7XG4gICAgICAgICAgICAvLyBjb25mID0gdGhpcy5jb25mLmNsb25lKClcbiAgICAgICAgICAgIGNvbmYgPSB7XG4gICAgICAgICAgICAgICAgc3Ryb2tlOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOnRoaXMuY29uZi5zdHJva2UuY29sb3IsXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOnRoaXMuY29uZi5zdHJva2Uud2lkdGhcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICBlZGdlOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOnRoaXMuY29uZi5lZGdlLmNvbG9yLCBcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6dGhpcy5jb25mLmVkZ2UuY29sb3JcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJhZGlhbDoge1xuICAgICAgICAgICAgICAgICAgICB2ZXJ0ZXg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOnRoaXMuY29uZi5yYWRpYWwudmVydGV4LmNvbG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6dGhpcy5jb25mLnJhZGlhbC52ZXJ0ZXgud2lkdGhcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc2lkZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6dGhpcy5jb25mLnJhZGlhbC5zaWRlLmNvbG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6dGhpcy5jb25mLnJhZGlhbC5zaWRlLndpZHRoXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSAgLy8gRW5kIHJhZGlhbFxuICAgICAgICAgICAgfTsgLy8gRW5kIGNvbmZcbiAgICAgICAgfSAvLyBFbmQgaWYgKHNoYWxsb3dDb3B5KVxuXG4gICAgICAgIHJldHVybiBuZXcgQ2VsbChwb3NpdGlvbiwgc2NhbGUsIGNvbG9yLCBjb25mKTtcbiAgICB9O1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vID09PSBFTkQgQ2VsbCBGYWN0b3J5XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyA9PT0gRXhwb3J0ZWQgQVBJXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgdmFyIEFQSSA9IHtcbiAgICAgICAgQ2VsbDogQ2VsbCxcbiAgICAgICAgRmFjdG9yeTogRmFjdG9yeSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIEFQSTtcbn0oKSk7IiwiLy8gRGVmaW5lIG1vZHVsZSBPeENvbG9yXG4ndXNlIHN0cmljdCc7XG5cbi8qIGpzaGludCBicm93c2VyaWZ5OiB0cnVlICovXG4vKiBqc2hpbnQgbmV3Y2FwOiBmYWxzZSAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gaXNSR0IoYykge1xuICAgICAgICByZXR1cm4gIChjICYmXG4gICAgICAgICAgICBjLnIgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgYy5nICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgIGMuYiAhPT0gdW5kZWZpbmVkKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNIU1YoYykge1xuICAgICAgICByZXR1cm4gIChjICYmXG4gICAgICAgICAgICBjLmggIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgYy5zICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgIGMudiAhPT0gdW5kZWZpbmVkKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNJTlQoYykge1xuICAgICAgICByZXR1cm4gTnVtYmVyLmlzSW50ZWdlcihjKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBmcm9tIHRoZSBIU1YgY29sb3Igc3BhY2UgdG8gUkdCLlxuICAgICAqXG4gICAgICogVGFrZXMgaCwgcywgdiB2YWx1ZXMgb3IgYW4gb2JqZWN0IHdpdGggZmllbGQgLmgsIC5zLCAudi5cbiAgICAgKiBUaGUgY29tcG9uZW50cyBzaG91bGQgYmUgbm9ybWFsaXNlZCB0byBbMCwgMV0uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtmbG9hdH0gaCBodWUgY2hhbm5lbFxuICAgICAqIEBwYXJhbSB7ZmxvYXR9IHMgc2F0dWFydGlvbiBjaGFubmVsXG4gICAgICogQHBhcmFtIHtmbG9hdH0gdiB2YWx1ZSBjaGFubmVsXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIGFuIG9iamVjdCB3aXRoIGNvbXBvbmVudHMgLnIsIC5nIC5iIG5vcm1hbGlzZWQgdG8gWzAsIDI1NV0uXG4gICAgICovXG4gICAgZnVuY3Rpb24gSFNWdG9SR0IoaCwgcywgdikge1xuICAgICAgICAvLyBUYWtlbiBmcm9tOlxuICAgICAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE3MjQyMTQ0L2phdmFzY3JpcHQtY29udmVydC1oc2ItaHN2LWNvbG9yLXRvLXJnYi1hY2N1cmF0ZWx5XG4gICAgICAgIHZhciByLCBnLCBiLCBpLCBmLCBwLCBxLCB0O1xuICAgICAgICBpZiAoaCAmJiBzID09PSB1bmRlZmluZWQgJiYgdiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzID0gaC5zOyB2ID0gaC52OyBoID0gaC5oO1xuICAgICAgICB9XG4gICAgICAgIGkgPSBNYXRoLmZsb29yKGggKiA2KTtcbiAgICAgICAgZiA9IGggKiA2IC0gaTtcbiAgICAgICAgcCA9IHYgKiAoMSAtIHMpO1xuICAgICAgICBxID0gdiAqICgxIC0gZiAqIHMpO1xuICAgICAgICB0ID0gdiAqICgxIC0gKDEgLSBmKSAqIHMpO1xuICAgICAgICBzd2l0Y2ggKGkgJSA2KSB7XG4gICAgICAgICAgICBjYXNlIDA6IHIgPSB2OyBnID0gdDsgYiA9IHA7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxOiByID0gcTsgZyA9IHY7IGIgPSBwOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjogciA9IHA7IGcgPSB2OyBiID0gdDsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM6IHIgPSBwOyBnID0gcTsgYiA9IHY7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0OiByID0gdDsgZyA9IHA7IGIgPSB2OyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNTogciA9IHY7IGcgPSBwOyBiID0gcTsgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHI6IChyICogMjU1KSxcbiAgICAgICAgICAgIGc6IChnICogMjU1KSxcbiAgICAgICAgICAgIGI6IChiICogMjU1KVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vID09PSBDb252ZXJzaW9uc1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGZyb20gdGhlIFJHQiBjb2xvciBzcGFjZSB0byB0byBIU1YuXG4gICAgICogXG4gICAgICogVGFrZXMgciwgZywgYiB2YWx1ZXMgb3IgYW4gb2JqZWN0IHdpdGggZmllbGRzIC5yLCAuZyBhbmQgLmIuXG4gICAgICogVGhlIGNvbXBvbmVudHMgc2hvdWxkIGJlIG5vcm1hbGlzZWQgdG8gWzAsIDI1NV0uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtmbG9hdH0gciByZWQgY2hhbm5lbFxuICAgICAqIEBwYXJhbSB7ZmxvYXR9IGcgZ3JlZW4gY2hhbm5lbFxuICAgICAqIEBwYXJhbSB7ZmxvYXR9IGIgYmx1ZSBjaGFubmVsXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIGFuIG9iamVjdCB3aXRoIGZpZWxkcyAuaCwgLnMsIC52IG5vcm1hbGlzZWQgdG8gWzAsIDFdLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFJHQnRvSFNWKHIsIGcsIGIpIHtcbiAgICAgICAgdmFyIGgsIHMsIHYsIE0sIG0sIEMsIEg7XG4gICAgICAgIGlmICggciAmJiBnID09PSB1bmRlZmluZWQgJiYgYiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBnID0gci5nOyBiID0gci5iOyByID0gci5yO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyID4gMSkge3IgPSAociUyNTYpLzI1NTt9XG4gICAgICAgIGlmIChnID4gMSkge2cgPSAoZyUyNTYpLzI1NTt9XG4gICAgICAgIGlmIChiID4gMSkge2IgPSAoYiUyNTYpLzI1NTt9XG5cbiAgICAgICAgLy8gQ2hyb21hXG4gICAgICAgIE0gPSBNYXRoLm1heChyLGcsYik7XG4gICAgICAgIG0gPSBNYXRoLm1pbihyLGcsYik7XG4gICAgICAgIEMgPSBNLW07XG5cbiAgICAgICAgLy8gSHVlXG4gICAgICAgIC8vIE5vdGU6IEphdmFzY3JpcHQgJSBpcyB0aGUgcmVtYWluZGVyIG9wZXJhdG9yLiBUbyBnZXQgdGhlIG1vZHVsbyBcbiAgICAgICAgLy8gb3BlcmF0b3IgdGhlIGlkaW9tICgoeCVuKStuKSVuIGlzIHVzZWQuXG4gICAgICAgIGlmICAgICAgKCBDID09PSAwICkgeyBIID0gMDsgfVxuICAgICAgICBlbHNlIGlmICggTSA9PT0gciApIHsgSCA9ICgoZy1iKS9DKSAlIDY7IEggPSAoSCs2KSAlIDY7IH1cbiAgICAgICAgZWxzZSBpZiAoIE0gPT09IGcgKSB7IEggPSAoKGItcikvQykgKyAyOyB9XG4gICAgICAgIGVsc2UgaWYgKCBNID09PSBiICkgeyBIID0gKChyLWcpL0MpICsgNDsgfVxuICAgICAgICBoID0gSCAvIDY7XG5cbiAgICAgICAgLy8gVmFsdWVcbiAgICAgICAgdiA9IE07XG5cbiAgICAgICAgLy8gU2F0dXJhdGlvblxuICAgICAgICBzID0gKHYgPT09IDApID8gKDApIDogKEMvdik7XG5cbiAgICAgICAgcmV0dXJuIHtoOmgsczpzLHY6dn07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gSU5UdG9SR0IoYykge1xuICAgICAgICB2YXIgciA9IE1hdGguZmxvb3IoYyAgICAgICAgKSAlIDI1NjtcbiAgICAgICAgdmFyIGcgPSBNYXRoLmZsb29yKGMvMjU2ICAgICkgJSAyNTY7XG4gICAgICAgIHZhciBiID0gTWF0aC5mbG9vcihjLzI1Ni8yNTYpICUgMjU2O1xuICAgICAgICB2YXIgcmdiID0ge3I6cixnOmcsYjpifTtcbiAgICAgICAgcmV0dXJuIHJnYjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBSR0J0b0lOVChyLCBnLCBiKSB7XG4gICAgICAgIGlmICggciAmJiBnID09PSB1bmRlZmluZWQgJiYgYiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBnID0gci5nOyBiID0gci5iOyByID0gci5yO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjID0gTWF0aC5mbG9vcihyKSArIDI1NipNYXRoLmZsb29yKGcpICsgMjU2KjI1NipNYXRoLmZsb29yKGIpO1xuICAgICAgICByZXR1cm4gYztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBJTlR0b0hTVihjKSB7XG4gICAgICAgIHJldHVybiBSR0J0b0hTVihJTlR0b1JHQihjKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gSFNWdG9JTlQoaCwgcywgdikge1xuICAgICAgICBpZiAoaCAmJiBzID09PSB1bmRlZmluZWQgJiYgdiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzID0gaC5zOyB2ID0gaC52OyBoID0gaC5oO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSR0J0b0lOVChIU1Z0b1JHQihoLCBzLCB2KSk7XG4gICAgfVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vID09PSBFTkQgQ29udmVyc2lvbnNcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vID09PSBQYWxldHRlXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLyoqXG4gICAgICogQ2xhc3MgSGV4Q29sb3IuSGV4UGFsZXR0ZVxuICAgICAqIEBwYXJhbSB7W3R5cGVdfSBnZW5lcmF0b3JGdW5jdGlvbiBbZGVzY3JpcHRpb25dXG4gICAgICogQHBhcmFtIHtbdHlwZV19IG5Db2xvcnMgICAgICAgICAgIFtkZXNjcmlwdGlvbl1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBIZXhQYWxldHRlKCBnZW5lcmF0b3JGdW5jdGlvbiwgbkNvbG9ycyApIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICBzZWxmLmNvbG9ycyA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSBuQ29sb3JzIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIHZhciBjb2xvciA9IGdlbmVyYXRvckZ1bmN0aW9uKCk7XG4gICAgICAgICAgICBzZWxmLmNvbG9ycy5wdXNoKCBjb2xvciApO1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5yYW5kb20gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IE1hdGguZmxvb3IoIE1hdGgucmFuZG9tKCkgKiBzZWxmLmNvbG9ycy5sZW5ndGggKTtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmNvbG9yc1tpbmRleF07XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0UmFuZG9tUGFzdGVsbENvbG9yKCkge1xuICAgICAgICB2YXIgaCA9IE1hdGgucmFuZG9tKCk7XG4gICAgICAgIHZhciBzID0gMC4yMCArIChNYXRoLnJhbmRvbSgpIC0gMC41KSAqIDAuMTI1O1xuICAgICAgICB2YXIgdiA9IDAuNzUgKyAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiAwLjEyNTtcblxuICAgICAgICB2YXIgYyA9IEhTVnRvSU5UKCBoLCBzLCB2ICk7XG4gICAgICAgIHJldHVybiBjO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5FcXVhbGx5U3BhY2VkUGFzdGVsbENvbG9ycyhuKSB7XG4gICAgICAgIHZhciBjb2xvcnMgPSBbXTtcbiAgICAgICAgdmFyIGludGVydmFsID0gMS9uO1xuICAgICAgICB2YXIgaCwgcywgdjtcblxuICAgICAgICBoID0gTWF0aC5yYW5kb20oKSppbnRlcnZhbDtcbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpPG47ICsraSkge1xuICAgICAgICAgICAgcyA9IDAuMjAgKyAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiAwLjIwMDtcbiAgICAgICAgICAgIHYgPSAwLjc1ICsgKE1hdGgucmFuZG9tKCkgLSAwLjUpICogMC4yMDA7XG5cbiAgICAgICAgICAgIGNvbG9ycy5wdXNoKCBIU1Z0b0lOVCggaCwgcywgdiApICk7XG4gICAgICAgICAgICBoICs9IGludGVydmFsO1xuICAgICAgICAgICAgaCAlPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvbG9ycztcbiAgICB9XG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gPT09IEVORCBQYWxldHRlXG5cbiAgICBmdW5jdGlvbiBicmlnaHRlbihjKSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgICAgaWYgKGlzUkdCKGMpKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJlc3VsdCA9IFJHQnRvSFNWKGMpO1xuICAgICAgICAgICAgcmVzdWx0LnYgPSByZXN1bHQudiArIDAuNTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQudiA+IDEuMCkge3Jlc3VsdC52ID0gMS4wO31cbiAgICAgICAgICAgIHJlc3VsdCA9IEhTVnRvUkdCKHJlc3VsdCk7XG5cbiAgICAgICAgfSBlbHNlIGlmIChpc0hTVihjKSkge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXN1bHQudiA9IHJlc3VsdC52ICsgMC41O1xuICAgICAgICAgICAgaWYgKHJlc3VsdC52ID4gMS4wKSB7cmVzdWx0LnYgPSAxLjA7fVxuICAgICAgICBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgXG4gICAgICAgICAgICByZXN1bHQgPSBJTlR0b0hTVihjKTtcbiAgICAgICAgICAgIHJlc3VsdC52ID0gcmVzdWx0LnYgKyAwLjU7XG4gICAgICAgICAgICBpZiAocmVzdWx0LnYgPiAxLjApIHtyZXN1bHQudiA9IDEuMDt9XG4gICAgICAgICAgICByZXN1bHQgPSBIU1Z0b0lOVChyZXN1bHQpO1xuICAgICAgICBcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW52ZXJ0VmFsdWUoYykge1xuICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICBpZiAoaXNSR0IoYykpIHtcbiAgICAgICAgICAgIHJlc3VsdCAgID0gUkdCdG9IU1YoYyk7XG4gICAgICAgICAgICByZXN1bHQudiA9IDEtcmVzdWx0LnY7XG4gICAgICAgICAgICByZXN1bHQgICA9IEhTVnRvUkdCKHJlc3VsdCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNIU1YoYykpIHtcbiAgICAgICAgICAgIHJlc3VsdC52ID0gMS1yZXN1bHQudjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCAgID0gSU5UdG9IU1YoYyk7XG4gICAgICAgICAgICByZXN1bHQudiA9IDEtcmVzdWx0LnY7XG4gICAgICAgICAgICByZXN1bHQgICA9IEhTVnRvSU5UKHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXNhdHVyYXRlKGMpIHtcbiAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgaWYgKGlzUkdCKGMpKSB7XG4gICAgICAgICAgICByZXN1bHQgICA9IFJHQnRvSFNWKGMpO1xuICAgICAgICAgICAgcmVzdWx0LnMgPSAwLjE7XG4gICAgICAgICAgICByZXN1bHQgICA9IEhTVnRvUkdCKHJlc3VsdCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNIU1YoYykpIHtcbiAgICAgICAgICAgIHJlc3VsdC5zID0gMC4xO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ICAgPSBJTlR0b0hTVihjKTtcbiAgICAgICAgICAgIHJlc3VsdC5zID0gMC4xO1xuICAgICAgICAgICAgcmVzdWx0ICAgPSBIU1Z0b0lOVChyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gPT09IEV4cG9ydGVkIEFQSVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIHZhciBBUEkgPSB7XG4gICAgICAgIG5hbWVzOiB7XG4gICAgICAgICAgICBibHVlICAgICA6IDB4MDAwMEZGLFxuICAgICAgICAgICAgZ3JlZW4gICAgOiAweDAwRkYwMCxcbiAgICAgICAgICAgIHJlZCAgICAgIDogMHhGRjAwMDAsXG4gICAgICAgICAgICBjeWFuICAgICA6IDB4MDBGRkZGLFxuICAgICAgICAgICAgbWFnZW50YSAgOiAweEZGMDBGRixcbiAgICAgICAgICAgIHllbGxvdyAgIDogMHhGRkZGMDAsXG4gICAgICAgICAgICBibGFjayAgICA6IDB4MDAwMDAwLFxuICAgICAgICAgICAgZGFya0dyYXkgOiAweDQ0NDQ0NCxcbiAgICAgICAgICAgIGdyYXkgICAgIDogMHg4ODg4ODgsXG4gICAgICAgICAgICBsaWdodEdyYXk6IDB4QkJCQkJCLFxuICAgICAgICAgICAgd2hpdGUgICAgOiAweEZGRkZGRlxuICAgICAgICB9LFxuICAgICAgICBIZXhQYWxldHRlIDogSGV4UGFsZXR0ZSxcbiAgICAgICAgcGFzdGVsbCA6IGdldFJhbmRvbVBhc3RlbGxDb2xvcixcbiAgICAgICAgZ2V0TkVxdWFsbHlTcGFjZWRQYXN0ZWxsQ29sb3JzIDogZ2V0TkVxdWFsbHlTcGFjZWRQYXN0ZWxsQ29sb3JzLFxuICAgICAgICBicmlnaHRlbiA6IGJyaWdodGVuLFxuICAgICAgICBpbnZlcnRWYWx1ZSA6IGludmVydFZhbHVlLFxuICAgICAgICBkZXNhdHVyYXRlIDogZGVzYXR1cmF0ZSxcbiAgICAgICAgUkdCIDoge1xuICAgICAgICAgICAgaXNSR0I6IGlzUkdCLFxuICAgICAgICAgICAgdG9IU1Y6IFJHQnRvSFNWLFxuICAgICAgICAgICAgdG9JTlQ6IFJHQnRvSU5UXG4gICAgICAgIH0sXG4gICAgICAgIEhTViA6IHtcbiAgICAgICAgICAgIGlzSFNWOiBpc0hTVixcbiAgICAgICAgICAgIHRvUkdCOiBIU1Z0b1JHQixcbiAgICAgICAgICAgIHRvSU5UOiBIU1Z0b0lOVCxcbiAgICAgICAgfSxcbiAgICAgICAgSU5UIDoge1xuICAgICAgICAgICAgaXNJTlQ6IGlzSU5ULFxuICAgICAgICAgICAgdG9IU1Y6IElOVHRvSFNWLFxuICAgICAgICAgICAgdG9SR0I6IElOVHRvUkdCXG4gICAgICAgIH0sXG4gICAgfTtcblxuICAgIHJldHVybiBBUEk7XG5cbn0oKSk7IiwiLy8gRGVmaW5lIG1vZHVsZSBPeENvb3JkaW5hdGVcbid1c2Ugc3RyaWN0JztcblxuLyoganNoaW50IGJyb3dzZXJpZnk6IHRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKCkge1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vID09PSBDb29yZGluYXRlIHN5c3RlbSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFxuICAgIC8vIEFwcGxpZXMgY29vcmRpbmF0ZSBoYW5kbGluZyBhbmQgY29udmVyc2lvbiB0byB0aGUgSGV4R3JpZCBwcm90b3R5cGUuXG4gICAgLy9cbiAgICAvLyBUaGVyZSBhcmUgZml2ZSBjb29yZGluYXRlIHR5cGVzLlxuICAgIC8vIFBpeGVsOlxuICAgIC8vICAgICAgQmFzaXM6IHgsIHlcbiAgICAvLyBPZmZzZXQ6XG4gICAgLy8gICAgICBCYXNpczogaSwgalxuICAgIC8vIEN1YmU6XG4gICAgLy8gICAgICBCYXNpczogeCwgeSwgelxuICAgIC8vIEF4aWFsOlxuICAgIC8vICAgICAgQmFzaXM6IHEsIHJcbiAgICAvLyBMaW5lYXI6XG4gICAgLy8gICAgICBCYXNpczogaW50ZWdlclxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgQ29vcmRpbmF0ZSBTeXN0ZW0gZm9yIHVzZS4gU2hvdWxkIGJlIGZlZCBhbiBvYmplY3RcbiAgICAgKiBjb250YWluaW5nIHRoZSB3IGFuZCBoIHByb3BlcnRpZXMuIFRoZXNlIGZpZWxkcyBzcGVjaWZ5IHRoZSBzaXplIG9mIHRoZVxuICAgICAqIGhlYXhnb24gY29vcmRpbmF0ZSBzeXN0ZW0uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNpemUgTXVzdCBjb250YWluIGEgdyBhbmQgaCBwcm9wZXJ0eS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBTeXN0ZW0gKCBzaXplLCBzY2FsZSwgb3JpZ2luUGl4ZWxDb29yZCApIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMucGl4ZWwgID0ge307XG4gICAgICAgIHRoaXMub2Zmc2V0ID0ge307XG4gICAgICAgIHRoaXMuY3ViZSAgID0ge307XG4gICAgICAgIHRoaXMuYXhpYWwgID0ge307XG4gICAgICAgIHRoaXMubGluZWFyID0ge307XG5cbiAgICAgICAgLy8gVE9ETzogTWFrZSBwaXhlbC1jb29yZHMgb3B0aW9uYWxcbiAgICAgICAgLy8gRm9yIHBpeGVsLXRvLWNlbGwgY29udmVyc2lvblxuICAgICAgICBpZiAob3JpZ2luUGl4ZWxDb29yZCAhPT0gdW5kZWZpbmVkICYmIG9yaWdpblBpeGVsQ29vcmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMub3JpZ2luUGl4ZWxDb29yZCA9IHtcbiAgICAgICAgICAgICAgICB4OiBvcmlnaW5QaXhlbENvb3JkLngsXG4gICAgICAgICAgICAgICAgeTogb3JpZ2luUGl4ZWxDb29yZC55LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMub3JpZ2luUGl4ZWxDb29yZCA9IG51bGxcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRPRE86IEltcGxlbWVudCBjZW50ZXJpbmcgYW5kIGFyYml0cmFyeSBib3VuZHMuXG4gICAgICAgIHRoaXMub3JpZ2luT2Zmc2V0Q29vcmQgPSB7aTowLCBqOjB9OyAvKiBjdXJyZW50bHkgdW51c2VkICovXG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgcGl4ZWwtdG8tY2VsbCBjb252ZXJzaW9uXG4gICAgICAgIGlmIChzY2FsZSAhPT0gdW5kZWZpbmVkICYmIHNjYWxlICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLnNjYWxlICA9IHtcbiAgICAgICAgICAgICAgICB4OiBzY2FsZS54LFxuICAgICAgICAgICAgICAgIHk6IHNjYWxlLnksXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zY2FsZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGb3IgY29udmVyc2lvbiBiZXR3ZWVuIGRpZmZlcmVudCBjZWxsLWNvb3JkaW5hdGVzXG4gICAgICAgIHRoaXMuc2l6ZSAgID0ge1xuICAgICAgICAgICAgdzogc2l6ZS53LFxuICAgICAgICAgICAgaDogc2l6ZS5oLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlcml2ZWQgcHJvcGVydGllc1xuICAgICAgICAvLyB2YXIgbm9ydGhXZXN0Q29ybmVyUGl4ZWxDb29yZCAgPSBcbiAgICAgICAgLy8gdmFyIG5vcnRoRWFzdENvcm5lclBpeGVsQ29vcmQgID0gXG4gICAgICAgIC8vIHZhciBzb3V0aEVhc3RDb3JuZXJQaXhlbENvb3JkICA9IFxuICAgICAgICAvLyB2YXIgc291dGhXZXN0Q29ybmVyUGl4ZWxDb29yZCAgPSBcblxuICAgICAgICAvLyB2YXIgYSA9IE1hdGguZmxvb3IodGhpcy5zaXplLncvMik7XG4gICAgICAgIC8vIHZhciBiID0gTWF0aC5mbG9vcih0aGlzLnNpemUuaC8yKTtcbiAgICAgICAgLy8gdmFyIGMgPSBNYXRoLmZsb29yKHRoaXMuc2l6ZS53LzIpO1xuICAgICAgICAvLyB2YXIgZCA9IE1hdGguZmxvb3IodGhpcy5zaXplLncvMik7XG5cbiAgICAgICAgLy8gdmFyIG5vcnRoV2VzdENvcm5lck9mZnNldENvb3JkID0gb3JpZ2luT2Zmc2V0Q29vcmQuaVxuICAgICAgICAvLyB2YXIgbm9ydGhFYXN0Q29ybmVyT2Zmc2V0Q29vcmQgPSBcbiAgICAgICAgLy8gdmFyIHNvdXRoRWFzdENvcm5lck9mZnNldENvb3JkID0gXG4gICAgICAgIC8vIHZhciBzb3V0aFdlc3RDb3JuZXJPZmZzZXRDb29yZCA9IFxuXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vIC0tLSBNZXRob2RzIGRlY2xhcmVkIG9uIHN1Yi1vYmplY3RzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIHNlbGYucGl4ZWwudG9PZmZzZXRDb29yZGluYXRlcyA9IGZ1bmN0aW9uIChwaXhlbENvb3JkKSB7XG4gICAgICAgICAgICB2YXIgY3ViZUNvb3JkICAgPSBzZWxmLnBpeGVsLnRvQ3ViZUNvb3JkaW5hdGVzKHBpeGVsQ29vcmQpO1xuICAgICAgICAgICAgdmFyIG9mZnNldENvb3JkID0gc2VsZi5jdWJlLnRvT2Zmc2V0Q29vcmRpbmF0ZXMoY3ViZUNvb3JkKTtcbiAgICAgICAgICAgIHJldHVybiBvZmZzZXRDb29yZDtcbiAgICAgICAgfTtcbiAgICAgICAgc2VsZi5waXhlbC50b0N1YmVDb29yZGluYXRlcyA9IGZ1bmN0aW9uIChwaXhlbENvb3JkKSB7XG4gICAgICAgICAgICB2YXIgYXhpYWxDb29yZCA9IHNlbGYucGl4ZWwudG9BeGlhbENvb3JkaW5hdGVzKHBpeGVsQ29vcmQpO1xuICAgICAgICAgICAgdmFyIGN1YmVDb29yZCAgPSBzZWxmLmF4aWFsLnRvQ3ViZUNvb3JkaW5hdGVzKGF4aWFsQ29vcmQpO1xuICAgICAgICAgICAgcmV0dXJuIGN1YmVDb29yZDtcbiAgICAgICAgfTtcbiAgICAgICAgc2VsZi5waXhlbC50b0F4aWFsQ29vcmRpbmF0ZXMgPSBmdW5jdGlvbiAocGl4ZWxDb29yZCkge1xuICAgICAgICAgICAgcGl4ZWxDb29yZC54IC09IHNlbGYub3JpZ2luUGl4ZWxDb29yZC54O1xuICAgICAgICAgICAgcGl4ZWxDb29yZC55IC09IHNlbGYub3JpZ2luUGl4ZWxDb29yZC55O1xuICAgICAgICAgICAgdmFyIHEgPSBwaXhlbENvb3JkLnggKiAyLzMgLyBzZWxmLnNjYWxlLng7XG4gICAgICAgICAgICB2YXIgciA9ICgtcGl4ZWxDb29yZC54IC8gMyArIE1hdGguc3FydCgzKS8zICogcGl4ZWxDb29yZC55KSAvIHNlbGYuc2NhbGUueTtcbiAgICAgICAgICAgIHZhciBheGlhbENvb3JkID0ge3E6cSxyOnJ9O1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuYXhpYWxSb3VuZCggYXhpYWxDb29yZCApO1xuICAgICAgICB9O1xuICAgICAgICBzZWxmLnBpeGVsLnRvTGluZWFyQ29vcmRpbmF0ZXMgPSBmdW5jdGlvbiAocGl4ZWxDb29yZCkge1xuICAgICAgICAgICAgdmFyIG9mZnNldENvb3JkID0gc2VsZi5waXhlbC50b09mZnNldENvb3JkaW5hdGVzKHBpeGVsQ29vcmQpO1xuICAgICAgICAgICAgdmFyIGxpbmVhckNvb3JkID0gc2VsZi5vZmZzZXQudG9MaW5lYXJDb29yZGluYXRlcyhvZmZzZXRDb29yZCk7XG4gICAgICAgICAgICByZXR1cm4gbGluZWFyQ29vcmQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2VsZi5vZmZzZXQudG9QaXhlbENvb3JkaW5hdGVzID0gZnVuY3Rpb24gKG9mZnNldENvb3JkKSB7XG4gICAgICAgICAgICB2YXIgYXhpYWxDb29yZCA9IHNlbGYub2Zmc2V0LnRvQXhpYWxDb29yZGluYXRlcyhvZmZzZXRDb29yZCk7XG4gICAgICAgICAgICB2YXIgcGl4ZWxDb29yZCA9IHNlbGYuYXhpYWwudG9QaXhlbENvb3JkaW5hdGVzKGF4aWFsQ29vcmQpO1xuICAgICAgICAgICAgcmV0dXJuIHBpeGVsQ29vcmQ7XG4gICAgICAgIH07XG4gICAgICAgIHNlbGYub2Zmc2V0LnRvQ3ViZUNvb3JkaW5hdGVzID0gZnVuY3Rpb24gKG9mZnNldENvb3JkKSB7XG4gICAgICAgICAgICB2YXIgeCA9IG9mZnNldENvb3JkLmk7XG4gICAgICAgICAgICB2YXIgeiA9IG9mZnNldENvb3JkLmogLSAob2Zmc2V0Q29vcmQuaSArIChvZmZzZXRDb29yZC5pJjEpKSAvIDI7XG4gICAgICAgICAgICB2YXIgeSA9IC14LXo7XG4gICAgICAgICAgICB2YXIgY3ViZUNvb3JkID0ge3g6eCx5Onksejp6fTtcbiAgICAgICAgICAgIHJldHVybiBjdWJlQ29vcmQ7XG4gICAgICAgIH07XG4gICAgICAgIHNlbGYub2Zmc2V0LnRvQXhpYWxDb29yZGluYXRlcyA9IGZ1bmN0aW9uIChvZmZzZXRDb29yZCkge1xuICAgICAgICAgICAgdmFyIGN1YmVDb29yZCAgPSBzZWxmLm9mZnNldC50b0N1YmVDb29yZGluYXRlcyhvZmZzZXRDb29yZCk7XG4gICAgICAgICAgICB2YXIgYXhpYWxDb29yZCA9IHNlbGYuY3ViZS50b0F4aWFsQ29vcmRpbmF0ZXMoY3ViZUNvb3JkKTtcbiAgICAgICAgICAgIHJldHVybiBheGlhbENvb3JkO1xuICAgICAgICB9O1xuICAgICAgICBzZWxmLm9mZnNldC50b0xpbmVhckNvb3JkaW5hdGVzID0gZnVuY3Rpb24gKG9mZnNldENvb3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gb2Zmc2V0Q29vcmQuaSArIChvZmZzZXRDb29yZC5qICogc2VsZi5zaXplLncpO1xuICAgICAgICB9O1xuICAgICAgICBzZWxmLm9mZnNldC5pbkJvdW5kcyA9IGZ1bmN0aW9uIChvZmZzZXRDb29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAob2Zmc2V0Q29vcmQuaSA+PSAwICYmIFxuICAgICAgICAgICAgICAgIG9mZnNldENvb3JkLmkgIDwgc2VsZi5zaXplLncpICYmXG4gICAgICAgICAgICAgICAgKG9mZnNldENvb3JkLmogPj0gMCAmJlxuICAgICAgICAgICAgICAgIG9mZnNldENvb3JkLmogIDwgc2VsZi5zaXplLmgpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzZWxmLmN1YmUudG9QaXhlbENvb3JkaW5hdGVzID0gZnVuY3Rpb24gKGN1YmVDb29yZCkge1xuICAgICAgICAgICAgdmFyIGF4aWFsQ29vcmQgPSBzZWxmLmN1YmUudG9BeGlhbENvb3JkaW5hdGVzKGN1YmVDb29yZCk7XG4gICAgICAgICAgICB2YXIgcGl4ZWxDb29yZCA9IHNlbGYuYXhpYWwudG9QaXhlbENvb3JkaW5hdGVzKGF4aWFsQ29vcmQpO1xuICAgICAgICAgICAgcmV0dXJuIHBpeGVsQ29vcmQ7XG4gICAgICAgIH07XG4gICAgICAgIHNlbGYuY3ViZS50b09mZnNldENvb3JkaW5hdGVzID0gZnVuY3Rpb24gKGN1YmVDb29yZCkge1xuICAgICAgICAgICAgdmFyIGkgPSBjdWJlQ29vcmQueDtcbiAgICAgICAgICAgIHZhciBqID0gY3ViZUNvb3JkLnogKyAoY3ViZUNvb3JkLnggKyAoY3ViZUNvb3JkLngmMSkpIC8gMjtcbiAgICAgICAgICAgIHZhciBvZmZzZXRDb29yZCA9IHtpOmksajpqfTtcbiAgICAgICAgICAgIHJldHVybiBvZmZzZXRDb29yZDtcbiAgICAgICAgfTtcbiAgICAgICAgc2VsZi5jdWJlLnRvQXhpYWxDb29yZGluYXRlcyA9IGZ1bmN0aW9uIChjdWJlQ29vcmQpIHtcbiAgICAgICAgICAgIHZhciBxID0gY3ViZUNvb3JkLng7XG4gICAgICAgICAgICB2YXIgciA9IGN1YmVDb29yZC56O1xuICAgICAgICAgICAgdmFyIGF4aWFsQ29vcmQgPSB7cTpxLHI6cn07XG4gICAgICAgICAgICByZXR1cm4gYXhpYWxDb29yZDtcbiAgICAgICAgfTtcbiAgICAgICAgc2VsZi5jdWJlLnRvTGluZWFyQ29vcmRpbmF0ZXMgPSBmdW5jdGlvbiAoY3ViZUNvb3JkKSB7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0Q29vcmQgPSBzZWxmLmN1YmUudG9PZmZzZXRDb29yZGluYXRlcyhjdWJlQ29vcmQpO1xuICAgICAgICAgICAgdmFyIGxpbmVhckNvb3JkID0gc2VsZi5vZmZzZXQudG9MaW5lYXJDb29yZGluYXRlcyhvZmZzZXRDb29yZCk7XG4gICAgICAgICAgICByZXR1cm4gbGluZWFyQ29vcmQ7XG4gICAgICAgIH07XG4gICAgICAgIHNlbGYuY3ViZS5pbkJvdW5kcyA9IGZ1bmN0aW9uIChjdWJlQ29vcmQpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXRDb29yZCA9IHNlbGYuY3ViZS50b09mZnNldENvb3JkaW5hdGVzKGN1YmVDb29yZCk7XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5vZmZzZXQuaW5Cb3VuZHMob2Zmc2V0Q29vcmQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNlbGYuYXhpYWwudG9QaXhlbENvb3JkaW5hdGVzID0gZnVuY3Rpb24gKGF4aWFsQ29vcmQpIHtcbiAgICAgICAgICAgIHZhciB4ID0gc2VsZi5zY2FsZS54ICogMy8yICogYXhpYWxDb29yZC5xO1xuICAgICAgICAgICAgdmFyIHkgPSBzZWxmLnNjYWxlLnkgKiBNYXRoLnNxcnQoMykgKiAoYXhpYWxDb29yZC5yICsgYXhpYWxDb29yZC5xLzIpO1xuICAgICAgICAgICAgdmFyIHBpeGVsQ29vcmQgPSB7XG4gICAgICAgICAgICAgICAgeDp4ICsgc2VsZi5vcmlnaW5QaXhlbENvb3JkLngsXG4gICAgICAgICAgICAgICAgeTp5ICsgc2VsZi5vcmlnaW5QaXhlbENvb3JkLnksXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIHBpeGVsQ29vcmQ7XG4gICAgICAgIH07XG4gICAgICAgIHNlbGYuYXhpYWwudG9PZmZzZXRDb29yZGluYXRlcyA9IGZ1bmN0aW9uIChheGlhbENvb3JkKSB7XG4gICAgICAgICAgICB2YXIgY3ViZUNvb3JkID0gc2VsZi5heGlhbC50b0N1YmVDb29yZGluYXRlcyhjdWJlQ29vcmQpO1xuICAgICAgICAgICAgdmFyIG9mZnNldENvb3JkID0gc2VsZi5jdWJlLnRvT2Zmc2V0Q29vcmRpbmF0ZXMoYXhpYWxDb29yZCk7XG4gICAgICAgICAgICByZXR1cm4gb2Zmc2V0Q29vcmQ7XG4gICAgICAgIH07XG4gICAgICAgIHNlbGYuYXhpYWwudG9DdWJlQ29vcmRpbmF0ZXMgPSBmdW5jdGlvbiAoYXhpYWxDb29yZCkge1xuICAgICAgICAgICAgdmFyIHggPSBheGlhbENvb3JkLnE7XG4gICAgICAgICAgICB2YXIgeiA9IGF4aWFsQ29vcmQucjtcbiAgICAgICAgICAgIHZhciB5ID0gLXgtejtcbiAgICAgICAgICAgIHJldHVybiB7eDp4LHk6eSx6Onp9O1xuICAgICAgICB9O1xuICAgICAgICBzZWxmLmF4aWFsLnRvTGluZWFyQ29vcmRpbmF0ZXMgPSBmdW5jdGlvbiAoYXhpYWxDb29yZCkge1xuICAgICAgICAgICAgdmFyIG9mZnNldENvb3JkID0gc2VsZi5heGlhbC50b09mZnNldENvb3JkaW5hdGVzKGF4aWFsQ29vcmQpO1xuICAgICAgICAgICAgdmFyIGxpbmVhckNvb3JkID0gc2VsZi5vZmZzZXQudG9MaW5lYXJDb29yZGluYXRlcyhvZmZzZXRDb29yZCk7XG4gICAgICAgICAgICByZXR1cm4gbGluZWFyQ29vcmQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2VsZi5saW5lYXIudG9QaXhlbENvb3JkaW5hdGVzICA9IGZ1bmN0aW9uIChsaW5lYXJDb29yZCkge1xuICAgICAgICAgICAgdmFyIG9mZnNldENvb3JkID0gc2VsZi5saW5lYXIudG9PZmZzZXRDb29yZGluYXRlcyhsaW5lYXJDb29yZCk7XG4gICAgICAgICAgICB2YXIgcGl4ZWxDb29yZCAgPSBzZWxmLm9mZnNldC50b1BpeGVsQ29vcmRpbmF0ZXMob2Zmc2V0Q29vcmQpO1xuICAgICAgICAgICAgcmV0dXJuIHBpeGVsQ29vcmQ7XG4gICAgICAgIH07XG4gICAgICAgIHNlbGYubGluZWFyLnRvT2Zmc2V0Q29vcmRpbmF0ZXMgPSBmdW5jdGlvbiAobGluZWFyQ29vcmQpIHtcbiAgICAgICAgICAgIHZhciBpID0gbGluZWFyQ29vcmQgJSBzZWxmLnNpemUudztcbiAgICAgICAgICAgIHZhciBqID0gbGluZWFyQ29vcmQgLyBzZWxmLnNpemUudztcbiAgICAgICAgICAgIHJldHVybiB7aTppLGo6an07XG4gICAgICAgIH07XG4gICAgICAgIHNlbGYubGluZWFyLnRvQ3ViZUNvb3JkaW5hdGVzICAgPSBmdW5jdGlvbiAobGluZWFyQ29vcmQpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXRDb29yZCA9IHNlbGYubGluZWFyLnRvT2Zmc2V0Q29vcmRpbmF0ZXMobGluZWFyQ29vcmQpO1xuICAgICAgICAgICAgdmFyIGN1YmVDb29yZCAgID0gc2VsZi5vZmZzZXQudG9DdWJlQ29vcmRpbmF0ZXMob2Zmc2V0Q29vcmQpO1xuICAgICAgICAgICAgcmV0dXJuIGN1YmVDb29yZDtcbiAgICAgICAgfTtcbiAgICAgICAgc2VsZi5saW5lYXIudG9BeGlhbENvb3JkaW5hdGVzICA9IGZ1bmN0aW9uIChsaW5lYXJDb29yZCkge1xuICAgICAgICAgICAgdmFyIG9mZnNldENvb3JkID0gc2VsZi5saW5lYXIudG9PZmZzZXRDb29yZGluYXRlcyhsaW5lYXJDb29yZCk7XG4gICAgICAgICAgICB2YXIgYXhpYWxDb29yZCAgPSBzZWxmLm9mZnNldC50b0F4aWFsQ29vcmRpbmF0ZXMob2Zmc2V0Q29vcmQpO1xuICAgICAgICAgICAgcmV0dXJuIGF4aWFsQ29vcmQ7XG4gICAgICAgIH07XG4gICAgICAgIHNlbGYubGluZWFyLmluQm91bmRzICAgICAgICAgICAgPSBmdW5jdGlvbiAobGluZWFyQ29vcmQpIHtcbiAgICAgICAgICAgIHZhciBvZmZzZXRDb29yZCA9IHNlbGYubGluZWFyLnRvT2Zmc2V0Q29vcmRpbmF0ZXMobGluZWFyQ29vcmQpO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYub2Zmc2V0LmluQm91bmRzKG9mZnNldENvb3JkKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyA9PT0gT3JkaW5hcnkgbWV0aG9kcyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIFN5c3RlbS5wcm90b3R5cGUuY3ViZVJvdW5kID0gZnVuY3Rpb24gKGgpIHtcbiAgICAgICAgLy8gRnJvbSBhbWl0XG4gICAgICAgIHZhciByeCA9IE1hdGgucm91bmQoaC54KTtcbiAgICAgICAgdmFyIHJ5ID0gTWF0aC5yb3VuZChoLnkpO1xuICAgICAgICB2YXIgcnogPSBNYXRoLnJvdW5kKGgueik7XG5cbiAgICAgICAgdmFyIHhfZGlmZiA9IE1hdGguYWJzKHJ4IC0gaC54KTtcbiAgICAgICAgdmFyIHlfZGlmZiA9IE1hdGguYWJzKHJ5IC0gaC55KTtcbiAgICAgICAgdmFyIHpfZGlmZiA9IE1hdGguYWJzKHJ6IC0gaC56KTtcblxuICAgICAgICBpZiAoeF9kaWZmID4geV9kaWZmICYmIHhfZGlmZiA+IHpfZGlmZikge1xuICAgICAgICAgICAgcnggPSAtcnktcno7XG4gICAgICAgIH0gZWxzZSBpZiAoeV9kaWZmID4gel9kaWZmKSB7XG4gICAgICAgICAgICByeSA9IC1yeC1yejtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJ6ID0gLXJ4LXJ5O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHt4OnJ4LCB5OnJ5LCB6OnJ6fTtcbiAgICB9O1xuXG4gICAgU3lzdGVtLnByb3RvdHlwZS5heGlhbFJvdW5kID0gZnVuY3Rpb24gKGF4aWFsQ29vcmQpIHtcbiAgICAgICAgLy8gRnJvbSBhbWl0XG4gICAgICAgIHZhciBjdWJlQ29vcmQ7XG4gICAgICAgIGN1YmVDb29yZCAgPSB0aGlzLmF4aWFsLnRvQ3ViZUNvb3JkaW5hdGVzKGF4aWFsQ29vcmQpO1xuICAgICAgICBjdWJlQ29vcmQgID0gdGhpcy5jdWJlUm91bmQoY3ViZUNvb3JkKTtcbiAgICAgICAgYXhpYWxDb29yZCA9IHRoaXMuY3ViZS50b0F4aWFsQ29vcmRpbmF0ZXMoY3ViZUNvb3JkKTtcbiAgICAgICAgcmV0dXJuIGF4aWFsQ29vcmQ7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGlzUGl4ZWxDb29yZGluYXRlcyhjKSB7XG4gICAgICAgIHJldHVybiBjICYmXG4gICAgICAgICAgICBjLnggIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgYy55ICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgIGMueiA9PT0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpc09mZnNldENvb3JkaW5hdGVzKGMpIHtcbiAgICAgICAgcmV0dXJuIGMgJiYgXG4gICAgICAgICAgICBjLmkgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgYy5qICE9PSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzQ3ViZUNvb3JkaW5hdGVzKGMpIHtcbiAgICAgICAgcmV0dXJuIGMgJiZcbiAgICAgICAgICAgIGMueCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICBjLnkgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgYy56ICE9PSB1bmRlZmluZWQ7XG5cbiAgICB9XG4gICAgZnVuY3Rpb24gaXNBeGlhbENvb3JkaW5hdGVzKGMpIHtcbiAgICAgICAgcmV0dXJuIGMgJiYgXG4gICAgICAgICAgICBjLnEgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgYy5yICE9PSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzTGluZWFyQ29vcmRpbmF0ZXMoYykge1xuICAgICAgICByZXR1cm4gTnVtYmVyLmlzSW50ZWdlcihjKTtcbiAgICB9XG5cbiAgICBTeXN0ZW0ucHJvdG90eXBlLnRvUGl4ZWxDb29yZGluYXRlcyA9IGZ1bmN0aW9uIChjKSB7XG4gICAgICAgIGlmICAgICAgICAoaXNQaXhlbENvb3JkaW5hdGVzKCAgYyApKSB7XG4gICAgICAgICAgICByZXR1cm4gYztcbiAgICAgICAgfSBlbHNlIGlmIChpc09mZnNldENvb3JkaW5hdGVzKCBjICkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9mZnNldC50b1BpeGVsQ29vcmRpbmF0ZXM7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNDdWJlQ29vcmRpbmF0ZXMoICAgYyApKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jdWJlLnRvUGl4ZWxDb29yZGluYXRlcyhjKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0F4aWFsQ29vcmRpbmF0ZXMoICBjICkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF4aWFsLnRvUGl4ZWxDb29yZGluYXRlcyhjKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVhckNvb3JkaW5hdGVzKCBjICkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxpbmVhci50b1BpeGVsQ29vcmRpbmF0ZXMoYyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRoZSBjdXJyZW50IGNvb3JkaW5hdGUgb2JqZWN0IHRvIG9mZnNldCBjb29yZGluYXRlcy5cbiAgICAgKiBAcGFyYW0gIHtwaXhlbHxvZmZzZXR8Y3ViZXxheGlhbH0gYyBjb29yZGluYXRlcyBnaXZlbiBpbiBhbnkgb2YgdGhlIGZvdXIgY29vcmRpbmF0ZSB0eXBlcy5cbiAgICAgKiBAcmV0dXJuIHtvZmZzZXR9IHRoZSBzYW1lIGNvb3JkaW5hdGUgaW4gdGhlIG9mZnNldCBjb29yZGluYXRlIHN5c3RlbS5cbiAgICAgKi9cbiAgICBTeXN0ZW0ucHJvdG90eXBlLnRvT2Zmc2V0Q29vcmRpbmF0ZXMgPSBmdW5jdGlvbiAoYykge1xuICAgICAgICBpZiAgICAgICAgKGlzUGl4ZWxDb29yZGluYXRlcyggIGMgKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGl4ZWwudG9PZmZzZXRDb29yZGluYXRlcyhjKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc09mZnNldENvb3JkaW5hdGVzKCBjICkpIHtcbiAgICAgICAgICAgIHJldHVybiBjO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQ3ViZUNvb3JkaW5hdGVzKCAgIGMgKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3ViZS50b09mZnNldENvb3JkaW5hdGVzKGMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXhpYWxDb29yZGluYXRlcyggIGMgKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXhpYWwudG9PZmZzZXRDb29yZGluYXRlcyhjKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVhckNvb3JkaW5hdGVzKCBjICkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxpbmVhci50b09mZnNldENvb3JkaW5hdGVzKGMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBTeXN0ZW0ucHJvdG90eXBlLnRvQ3ViZUNvb3JkaW5hdGVzID0gZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgaWYgICAgICAgIChpc1BpeGVsQ29vcmRpbmF0ZXMoICBjICkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBpeGVsLnRvQ3ViZUNvb3JkaW5hdGVzKGMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzT2Zmc2V0Q29vcmRpbmF0ZXMoIGMgKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMub2Zmc2V0LnRvQ3ViZUNvb3JkaW5hdGVzKGMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQ3ViZUNvb3JkaW5hdGVzKCAgIGMgKSkge1xuICAgICAgICAgICAgcmV0dXJuIGM7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBeGlhbENvb3JkaW5hdGVzKCAgYyApKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5heGlhbC50b0N1YmVDb29yZGluYXRlcyhjKTtcbiAgICAgICAgfVxuICAgICAgICAgZWxzZSBpZiAoaXNMaW5lYXJDb29yZGluYXRlcyggYyApKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5saW5lYXIudG9DdWJlQ29vcmRpbmF0ZXMoYyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFN5c3RlbS5wcm90b3R5cGUudG9BeGlhbENvb3JkaW5hdGVzID0gZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgaWYgICAgICAgIChpc1BpeGVsQ29vcmRpbmF0ZXMoICBjICkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBpeGVsLnRvQXhpYWxDb29yZGluYXRlcyhjKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc09mZnNldENvb3JkaW5hdGVzKCBjICkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9mZnNldC50b0F4aWFsQ29vcmRpbmF0ZXMoYyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNDdWJlQ29vcmRpbmF0ZXMoICAgYyApKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jdWJlLnRvQXhpYWxDb29yZGluYXRlcyhjKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0F4aWFsQ29vcmRpbmF0ZXMoICBjICkpIHtcbiAgICAgICAgICAgIHJldHVybiBjO1xuICAgICAgICB9IGVsc2UgaWYgKGlzTGluZWFyQ29vcmRpbmF0ZXMoIGMgKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGluZWFyLnRvQXhpYWxDb29yZGluYXRlcyhjKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgU3lzdGVtLnByb3RvdHlwZS50b0xpbmVhckNvb3JkaW5hdGVzID0gZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgaWYgICAgICAgIChpc1BpeGVsQ29vcmRpbmF0ZXMoICBjICkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBpeGVsLnRvTGluZWFyQ29vcmRpbmF0ZXMoYyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNPZmZzZXRDb29yZGluYXRlcyggYyApKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vZmZzZXQudG9MaW5lYXJDb29yZGluYXRlcyhjKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0N1YmVDb29yZGluYXRlcyggICBjICkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmN1YmUudG9MaW5lYXJDb29yZGluYXRlcyhjKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0F4aWFsQ29vcmRpbmF0ZXMoICBjICkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF4aWFsLnRvTGluZWFyQ29vcmRpbmF0ZXMoYyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNMaW5lYXJDb29yZGluYXRlcyggYyApKSB7XG4gICAgICAgICAgICByZXR1cm4gYztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyA9PT0gRXhwb3J0ZWQgQVBJXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgdmFyIEFQSSA9IHtcbiAgICAgICAgU3lzdGVtOiBTeXN0ZW0sXG4gICAgfTtcblxuICAgIHJldHVybiBBUEk7XG5cbn0oKSk7IiwiLy8gRGVmaW5lIG1vZHVsZSBPeEdyaWRcbid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFscyBQSVhJICovXG4vKiBqc2hpbnQgYnJvd3NlcmlmeTogdHJ1ZSAqL1xuXG52YXIgT3hNYXRoICAgICAgID0gcmVxdWlyZSgnLi9veC1tYXRoLmpzJyk7XG52YXIgT3hDZWxsICAgICAgID0gcmVxdWlyZSgnLi9veC1jZWxsLmpzJyk7XG52YXIgT3hDb29yZGluYXRlID0gcmVxdWlyZSgnLi9veC1jb29yZGluYXRlLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBHcmlkKCBjb25mLCBtb2RlbCApIHtcblxuICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgICAgLy8gPT09IENvbnN0cnVjdG9yICAgICAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgICB0aGlzLmNvbmYgPSBjb25mO1xuXG4gICAgICAgIHRoaXMuX2dyYXBoaWNzID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcbiAgICAgICAgdGhpcy5wb3NpdGlvbiAgPSBjb25mLnBvc2l0aW9uO1xuICAgICAgICAvLyB0aGlzLl9ncmFwaGljcy5zY2FsZS54ID0gY29uZi5zY2FsZS54O1xuICAgICAgICAvLyB0aGlzLl9ncmFwaGljcy5zY2FsZS55ID0gY29uZi5zY2FsZS55O1xuXG4gICAgICAgIHRoaXMuc2NhbGUgPSBjb25mLnNjYWxlO1xuICAgICAgICB0aGlzLnNpemUgID0gY29uZi5zaXplO1xuXG4gICAgICAgIHRoaXMuY29vcmRpbmF0ZVN5c3RlbSA9IG5ldyBPeENvb3JkaW5hdGUuU3lzdGVtKHRoaXMuc2l6ZSwgdGhpcy5zY2FsZSwgdGhpcy5wb3NpdGlvbik7XG5cbiAgICAgICAgdGhpcy5jZWxscyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpeSA9IDA7IGl5IDwgdGhpcy5zaXplLmg7ICsraXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGl4ID0gMDsgaXggPCB0aGlzLnNpemUudzsgKytpeCkge1xuICAgICAgICAgICAgICAgIHZhciBjZWxsT2Zmc2V0Q29vcmQgPSB7aTppeCwgajppeX07XG4gICAgICAgICAgICAgICAgdmFyIGNlbGxQaXhlbENvb3JkICA9IHRoaXMuY29vcmRpbmF0ZVN5c3RlbS5vZmZzZXQudG9QaXhlbENvb3JkaW5hdGVzKCBjZWxsT2Zmc2V0Q29vcmQgKTtcbiAgICAgICAgICAgICAgICB2YXIgY2VsbExpbmVhckNvb3JkID0gdGhpcy5jb29yZGluYXRlU3lzdGVtLm9mZnNldC50b0xpbmVhckNvb3JkaW5hdGVzKCBjZWxsT2Zmc2V0Q29vcmQgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgY29sb3IgPSAobW9kZWwhPT1udWxsKSA/IG1vZGVsW2NlbGxMaW5lYXJDb29yZF0uY29sb3IgOiAoMHhmZmZmZmYpO1xuICAgICAgICAgICAgICAgIHZhciBjZWxsID0gbmV3IE94Q2VsbC5DZWxsKCBjZWxsUGl4ZWxDb29yZCwgdGhpcy5zY2FsZSwgY29sb3IsIGNvbmYuY2VsbCk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9ncmFwaGljcy5hZGRDaGlsZChjZWxsLl9ncmFwaGljcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5jZWxscy5wdXNoKGNlbGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgR3JpZC5wcm90b3R5cGUud2lkdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5zaXplLncgPiAxKSA/XG4gICAgICAgICAgICAoKHRoaXMuc2l6ZS53KjAuNzUrMC41KSAqIE94TWF0aC5oZXhhZ29uV2lkdGgpICogdGhpcy5zY2FsZS54IDpcbiAgICAgICAgICAgIChPeE1hdGguaGV4YWdvbldpZHRoICogdGhpcy5zY2FsZS54KTtcbiAgICB9O1xuICAgIEdyaWQucHJvdG90eXBlLmhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLnNpemUuaCA+IDEpID9cbiAgICAgICAgKCh0aGlzLnNpemUuaCswLjUpICogdGhpcy5zY2FsZS55ICogT3hNYXRoLmhleGFnb25IZWlnaHQpOlxuICAgICAgICAoKHRoaXMuc2l6ZS5oKzEuMCkgKiB0aGlzLnNjYWxlLnkgKiBPeE1hdGguaGV4YWdvbkhlaWdodCk7XG4gICAgfTtcblxuICAgIEdyaWQucHJvdG90eXBlLmNlbnRlckF0ID0gZnVuY3Rpb24gKHBvaW50KSB7XG4gICAgICAgIHZhciB3LCBoO1xuXG4gICAgICAgIHcgPSB0aGlzLndpZHRoKCk7XG4gICAgICAgIGggPSB0aGlzLmhlaWdodCgpO1xuXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSB7XG4gICAgICAgICAgICB4OiBwb2ludC54IC0gdy8yICsgdGhpcy5zY2FsZS54ICogT3hNYXRoLmhleGFnb25XaWR0aC8yLFxuICAgICAgICAgICAgeTogcG9pbnQueSAtIGgvMiArIHRoaXMuc2NhbGUueSAqIE94TWF0aC5oZXhhZ29uSGVpZ2h0LFxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb29yZGluYXRlU3lzdGVtLm9yaWdpblBpeGVsQ29vcmQueCA9IHRoaXMucG9zaXRpb24ueDtcbiAgICAgICAgdGhpcy5jb29yZGluYXRlU3lzdGVtLm9yaWdpblBpeGVsQ29vcmQueSA9IHRoaXMucG9zaXRpb24ueTtcbiAgICAgICAgZm9yICh2YXIgaXkgPSAwOyBpeSA8IHRoaXMuc2l6ZS5oOyArK2l5KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpeCA9IDA7IGl4IDwgdGhpcy5zaXplLnc7ICsraXgpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2VsbE9mZnNldENvb3JkID0ge2k6aXgsIGo6aXl9O1xuICAgICAgICAgICAgICAgIHZhciBjZWxsUGl4ZWxDb29yZCAgPSB0aGlzLmNvb3JkaW5hdGVTeXN0ZW0ub2Zmc2V0LnRvUGl4ZWxDb29yZGluYXRlcyhjZWxsT2Zmc2V0Q29vcmQpO1xuICAgICAgICAgICAgICAgIHZhciBjZWxsICAgICAgICAgICAgPSB0aGlzLmdldENlbGwoY2VsbE9mZnNldENvb3JkKTtcblxuICAgICAgICAgICAgICAgIGNlbGwuX2dyYXBoaWNzLnBvc2l0aW9uLnggPSBjZWxsUGl4ZWxDb29yZC54O1xuICAgICAgICAgICAgICAgIGNlbGwuX2dyYXBoaWNzLnBvc2l0aW9uLnkgPSBjZWxsUGl4ZWxDb29yZC55O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gd2lsbCBiZSBwcm92aWRlZCB0aGUgb2Zmc2V0Q29vcmRpbmF0ZXMgYW5kIHRoZSBjdXJyZW50XG4gICAgICogY2VsbCBhcyBhcmd1bWVudHMsIGluIHRoYXQgb3JkZXIuIFRoZSBjYWxsYmFjayB3aWxsIHVzZSB0aGUgZ3JpZCBhcyBpdHMgdGhpc1xuICAgICAqIHZhcmlhYmxlLlxuICAgICAqIEBwYXJhbSAge1t0eXBlXX0gZnVuIFtkZXNjcmlwdGlvbl1cbiAgICAgKiBAcmV0dXJuIHtbdHlwZV19ICAgICBbZGVzY3JpcHRpb25dXG4gICAgICovXG4gICAgR3JpZC5wcm90b3R5cGUuYXBwbHlUb0NlbGxzID0gZnVuY3Rpb24gKCBjYWxsYmFjayApIHtcbiAgICAgICAgdmFyIG9mZnNldENvb3JkICAgICAsXG4gICAgICAgICAgICBsaW5lYXJDb29yZCAgICAgLFxuICAgICAgICAgICAgY2VsbCAgICAgICAgICAgIDtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY29uZi5zaXplLnc7ICsraSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmNvbmYuc2l6ZS5oOyArK2opIHtcbiAgICAgICAgICAgICAgICBvZmZzZXRDb29yZCA9IHtpOmksIGo6an07XG4gICAgICAgICAgICAgICAgbGluZWFyQ29vcmQgPSB0aGlzLmNvb3JkaW5hdGVTeXN0ZW0udG9MaW5lYXJDb29yZGluYXRlcyhvZmZzZXRDb29yZCk7XG4gICAgICAgICAgICAgICAgY2VsbCAgICAgICAgPSB0aGlzLmdldENlbGwob2Zmc2V0Q29vcmQpO1xuXG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBvZmZzZXRDb29yZCwgbGluZWFyQ29vcmQsIGNlbGwpO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgR3JpZC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gVE9ETzogY2xlYXIgZmlyc3RcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHRoaXMuY2VsbHMpIHtcbiAgICAgICAgICAgIHZhciBvYmogPSB0aGlzLmNlbGxzW2tleV07XG4gICAgICAgICAgICBvYmouZHJhdygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEdyaWQucHJvdG90eXBlLmRyYXdDZWxsID0gZnVuY3Rpb24gKCBjZWxsICkge1xuICAgICAgICBjZWxsLmRyYXcoKTtcbiAgICB9O1xuXG4gICAgR3JpZC5wcm90b3R5cGUuZ2V0Q2VsbCA9IGZ1bmN0aW9uICggY29vcmRpbmF0ZSApIHtcbiAgICAgICAgdmFyIG9mZnNldENvb3JkID0gdGhpcy5jb29yZGluYXRlU3lzdGVtLnRvT2Zmc2V0Q29vcmRpbmF0ZXMoY29vcmRpbmF0ZSk7XG5cbiAgICAgICAgaWYgKG9mZnNldENvb3JkLmkgPCAwIHx8IG9mZnNldENvb3JkLmkgPj0gdGhpcy5zaXplLncpIHtyZXR1cm4gbnVsbDt9XG4gICAgICAgIGlmIChvZmZzZXRDb29yZC5qIDwgMCB8fCBvZmZzZXRDb29yZC5qID49IHRoaXMuc2l6ZS5oKSB7cmV0dXJuIG51bGw7fVxuXG4gICAgICAgIHZhciBpbmRleCA9IG9mZnNldENvb3JkLmkgKyBvZmZzZXRDb29yZC5qICogdGhpcy5zaXplLnc7XG4gICAgICAgIFxuICAgICAgICBpZiAoaW5kZXggPiAwIHx8IGluZGV4IDwgdGhpcy5jZWxscy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNlbGxzW2luZGV4XTsgICAgXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuXG4gICAgR3JpZC5wcm90b3R5cGUucmVuZGVyV2l0aCA9IGZ1bmN0aW9uICggcmVuZGVyZXIgKSB7XG4gICAgICAgIHJlbmRlcmVyLnJlbmRlcih0aGlzLl9ncmFwaGljcyk7XG4gICAgfTtcblxuICAgIEdyaWQucHJvdG90eXBlLmhpZ2hsaWdodENlbGxzID0gZnVuY3Rpb24gKCkge1xuXG4gICAgfTtcblxuICAgIHJldHVybiBHcmlkO1xufSgpKTsiLCIvLyBEZWZpbmUgbW9kdWxlIE94TWF0aFxuJ3VzZSBzdHJpY3QnO1xuXG4vKiBnbG9iYWxzIFBJWEkgKi9cbi8qIGpzaGludCBicm93c2VyaWZ5OiB0cnVlICovXG5cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uICgpIHtcblxuXHR2YXIgZGlyZWN0aW9uID0ge1xuXHRcdG5vcnRoICAgIDoge3g6IDAsIHk6IDEsIHo6LTF9LFxuXHRcdG5vcnRoRWFzdDoge3g6IDEsIHk6IDAsIHo6LTF9LFxuXHRcdHNvdXRoRWFzdDoge3g6IDEsIHk6LTEsIHo6IDB9LFxuXHRcdHNvdXRoICAgIDoge3g6IDAsIHk6LTEsIHo6IDF9LFxuXHRcdHNvdXRoV2VzdDoge3g6LTEsIHk6IDAsIHo6IDF9LFxuXHRcdG5vcnRoV2VzdDoge3g6LTEsIHk6IDEsIHo6IDB9LFxuXHRcdG5pbCAgICAgIDoge3g6MCwgeTowLCB6OjB9XG5cdH07XG5cdGRpcmVjdGlvbi5hc0FycmF5ID0gWyBcdGRpcmVjdGlvbi5ub3J0aCxcblx0XHRcdFx0XHRcdFx0ZGlyZWN0aW9uLm5vcnRoRWFzdCxcblx0XHRcdFx0XHRcdFx0ZGlyZWN0aW9uLnNvdXRoRWFzdCxcblx0XHRcdFx0XHRcdFx0ZGlyZWN0aW9uLnNvdXRoLFxuXHRcdFx0XHRcdFx0XHRkaXJlY3Rpb24uc291dGhXZXN0LFxuXHRcdFx0XHRcdFx0XHRkaXJlY3Rpb24ubm9ydGhXZXN0IF07XG5cdGRpcmVjdGlvbi50b0ludCA9IHtcblx0XHRub3J0aCAgICA6IDAsXG5cdFx0bm9ydGhFYXN0OiAxLFxuXHRcdHNvdXRoRWFzdDogMixcblx0XHRzb3V0aCAgICA6IDMsXG5cdFx0c291dGhXZXN0OiA0LFxuXHRcdG5vcnRoV2VzdDogNSxcblx0fTtcblxuXHR2YXIgY29zXzMwID0gMC44NjYwMjU0MDM3ODtcblx0dmFyIGNvc182MCA9IDAuNTtcblx0dmFyIHNpbl8zMCA9IDAuNTtcbiAgICB2YXIgc2luXzYwID0gMC44NjYwMjU0MDM3ODtcbiAgICB2YXIgdGFuXzMwID0gMC41NzczNTAyNjkxOTtcbiAgICB2YXIgdGFuXzYwID0gMS43MzIwNTA4MDc1NztcblxuICAgIHZhciBoZXhhZ29uV2lkdGggID0gNCpjb3NfNjA7IC8vIDI7XG5cdHZhciBoZXhhZ29uSGVpZ2h0ID0gMipzaW5fNjA7IC8vIE1hdGguc3FydCgzKTtcblxuXHRmdW5jdGlvbiByYW5kb21HYXVzc2lhbihtZWFuLCBkZXZpYXRpb24sIHJhbmQpIHtcblx0XHQvLyBXaWtpcGVkaWEgLSBCb3gtTXVsbGVyIHRyYW5zZm9ybVxuXHRcdHZhciB1MSA9IHJhbmQoKTtcblx0XHR2YXIgdTIgPSByYW5kKCk7XG5cdFx0dmFyIHowID0gTWF0aC5zcXJ0KC0yLjAqTWF0aC5sb2codTEpKSpNYXRoLmNvcyg2LjI4MzE4NTMwNzE4KnUyKTtcblx0XHQvLyB2YXIgejEgPSBNYXRoLnNxcnQoLTIuMCpNYXRoLmxvZyh1MSkpKk1hdGguc2luKDYuMjgzMTg1MzA3MTgqdTIpO1xuXHRcdHJldHVybiB6MCpkZXZpYXRpb24gKyBtZWFuO1xuXHR9XG5cblx0ZnVuY3Rpb24gcmFuZG9tSW50KG1pbiwgbWF4LCByYW5kKSB7XG5cdFx0cmV0dXJuIG1pbiArIE1hdGguZmxvb3IocmFuZCgpKihtYXgtbWluKzEpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJhbmRvbUludEFycmF5KG1pbiwgbWF4LCBuRWxlbSkgeyBcblx0XHR2YXIgYSwgbiwgaTtcblx0XHRhID0gW107XG5cdFx0d2hpbGUgKGEubGVuZ3RoIDwgbkVsZW0pIHtcblx0XHRcdG4gPSByYW5kb21JbnQobWluLCBtYXgpO1xuXHRcdFx0Zm9yIChpID0gYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0XHRpZiAoYVtpXT09bikge2NvbnRpbnVlO31cblx0XHRcdH1cblx0XHRcdGEucHVzaChuKTtcblx0XHR9XG5cdFx0cmV0dXJuIGE7XG5cdH1cblxuXHRmdW5jdGlvbiBzaHVmZmxlQXJyYXkoYXJyYXksIHJhbmQpIHtcblx0XHQvLyBLbnV0aCdzIHVuYmlhc2VkIHNodWZmbGVcblx0XHQvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzI0NTA5NTQvaG93LXRvLXJhbmRvbWl6ZS1zaHVmZmxlLWEtamF2YXNjcmlwdC1hcnJheVxuXHRcdHZhciBjdXJyZW50SW5kZXggPSBhcnJheS5sZW5ndGgsIHRlbXBvcmFyeVZhbHVlLCByYW5kb21JbmRleCA7XG5cblx0XHQvLyBXaGlsZSB0aGVyZSByZW1haW4gZWxlbWVudHMgdG8gc2h1ZmZsZS4uLlxuXHRcdHdoaWxlICgwICE9PSBjdXJyZW50SW5kZXgpIHtcblxuXHRcdC8vIFBpY2sgYSByZW1haW5pbmcgZWxlbWVudC4uLlxuXHRcdFx0cmFuZG9tSW5kZXggPSBNYXRoLmZsb29yKHJhbmQoKSAqIGN1cnJlbnRJbmRleCk7XG5cdFx0XHRjdXJyZW50SW5kZXggLT0gMTtcblxuXHRcdFx0Ly8gQW5kIHN3YXAgaXQgd2l0aCB0aGUgY3VycmVudCBlbGVtZW50LlxuXHRcdFx0dGVtcG9yYXJ5VmFsdWUgPSBhcnJheVtjdXJyZW50SW5kZXhdO1xuXHRcdFx0YXJyYXlbY3VycmVudEluZGV4XSA9IGFycmF5W3JhbmRvbUluZGV4XTtcblx0XHRcdGFycmF5W3JhbmRvbUluZGV4XSA9IHRlbXBvcmFyeVZhbHVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBhcnJheTtcblx0fVxuXG4gICAgdmFyIGNvcm5lcnMgPSB7XG4gICAgXHRub3J0aEVhc3QgOiBbLTEgICAgICAsICAwICAgICBdLFxuICAgIFx0ZWFzdCAgICAgIDogWy1jb3NfNjAgLCAtc2luXzYwXSxcbiAgICBcdHNvdXRoRWFzdCA6IFsgY29zXzYwICwgLXNpbl82MF0sXG4gICAgXHRzb3V0aFdlc3QgOiBbIDEgICAgICAsICAwICAgICBdLFxuICAgIFx0d2VzdCAgICAgIDogWyBjb3NfNjAgLCAgc2luXzYwXSxcbiAgICBcdG5vcnRoV2VzdCA6IFstY29zXzYwICwgIHNpbl82MF0sXG4gICAgfTtcblxuXHR2YXIgaGV4UG9pbnRzID0gW10uY29uY2F0KFxuXHRcdFx0Y29ybmVycy5ub3J0aEVhc3QsXG5cdFx0XHRjb3JuZXJzLmVhc3QgICAgICxcblx0XHRcdGNvcm5lcnMuc291dGhFYXN0LFxuXHRcdFx0Y29ybmVycy5zb3V0aFdlc3QsXG5cdFx0XHRjb3JuZXJzLndlc3QgICAgICxcblx0XHRcdGNvcm5lcnMubm9ydGhXZXN0XG5cdFx0KTtcblx0dmFyIGhleFNoYXBlICA9IG5ldyBQSVhJLlBvbHlnb24oaGV4UG9pbnRzKTtcblxuXHR2YXIgaGV4RWRnZSA9IHtcblx0XHRub3J0aCAgICA6IGZ1bmN0aW9uKHQpIHtyZXR1cm4gbmV3IFBJWEkuUG9seWdvbihbLWNvc182MCwgLXNpbl82MCwgIGNvc182MCwgLXNpbl82MCwgIGNvc182MCt0KmNvc182MCwgLXNpbl82MCt0KnNpbl82MCwgLWNvc182MC10KmNvc182MCwgLXNpbl82MCt0KnNpbl82MCBdKTt9LFxuXHRcdG5vcnRoRWFzdDogZnVuY3Rpb24odCkge3JldHVybiBuZXcgUElYSS5Qb2x5Z29uKFsgY29zXzYwLCAtc2luXzYwLCAgICAgICAxLCAgICAgICAwLCAgICAgICAxLXQqY29zXzYwLCAgICAgICAwK3Qqc2luXzYwLCAgY29zXzYwLXQgICAgICAgLCAtc2luXzYwICAgICAgICAgIF0pO30sXG5cdFx0c291dGhFYXN0OiBmdW5jdGlvbih0KSB7cmV0dXJuIG5ldyBQSVhJLlBvbHlnb24oWyAgICAgIDEsICAgICAgIDAsICBjb3NfNjAsICBzaW5fNjAsICBjb3NfNjAtdCAgICAgICAsICBzaW5fNjAgICAgICAgICAsICAgICAgIDEtdCpjb3NfNjAsICAgICAgIDAtdCpzaW5fNjAgXSk7fSxcblx0XHRzb3V0aCAgICA6IGZ1bmN0aW9uKHQpIHtyZXR1cm4gbmV3IFBJWEkuUG9seWdvbihbIGNvc182MCwgIHNpbl82MCwgLWNvc182MCwgIHNpbl82MCwgLWNvc182MC10KmNvc182MCwgIHNpbl82MC10KnNpbl82MCwgIGNvc182MCt0KmNvc182MCwgIHNpbl82MC10KnNpbl82MCBdKTt9LFxuXHRcdHNvdXRoV2VzdDogZnVuY3Rpb24odCkge3JldHVybiBuZXcgUElYSS5Qb2x5Z29uKFstY29zXzYwLCAgc2luXzYwLCAgICAgIC0xLCAgICAgICAwLCAgICAgIC0xK3QqY29zXzYwLCAgICAgICAwLXQqc2luXzYwLCAtY29zXzYwK3QgICAgICAgLCAgc2luXzYwICAgICAgICAgIF0pO30sXG5cdFx0bm9ydGhXZXN0OiBmdW5jdGlvbih0KSB7cmV0dXJuIG5ldyBQSVhJLlBvbHlnb24oWyAgICAgLTEsICAgICAgIDAsIC1jb3NfNjAsIC1zaW5fNjAsIC1jb3NfNjArdCAgICAgICAsIC1zaW5fNjAgICAgICAgICAsICAgICAgLTErdCpjb3NfNjAsICAgICAgIDArdCpzaW5fNjAgXSk7fSxcblx0fTtcblx0aGV4RWRnZVswXSA9IGhleEVkZ2Uubm9ydGg7XG5cdGhleEVkZ2VbMV0gPSBoZXhFZGdlLm5vcnRoRWFzdDtcblx0aGV4RWRnZVsyXSA9IGhleEVkZ2Uuc291dGhFYXN0O1xuXHRoZXhFZGdlWzNdID0gaGV4RWRnZS5zb3V0aDtcblx0aGV4RWRnZVs0XSA9IGhleEVkZ2Uuc291dGhXZXN0O1xuXHRoZXhFZGdlWzVdID0gaGV4RWRnZS5ub3J0aFdlc3Q7XG5cblx0Ly8gTk9URTogVGhlIG5vcnRoIGNvcm5lciBpcyB0aGUgY29ybmVyIHRvIHRoZSByaWdodCBvZiB0aGUgbm9ydGggKCAgIHRvcC1tb3N0KSBlZGdlLlxuXHQvLyBOT1RFOiBUaGUgc291dGggY29ybmVyIGlzIHRoZSBjb3JuZXIgdG8gdGhlIGxlZnQgIG9mIHRoZSBzb3V0aCAoYm90dG9tLW1vc3QpIGVkZ2UuXG5cdHZhciBoZXhSYWRpYWxMaW5lVmVydGV4ID0ge1xuXHRcdG5vcnRoICAgIDogZnVuY3Rpb24odCkge3JldHVybiBuZXcgUElYSS5Qb2x5Z29uKFsgY29zXzYwLXQgICAgICwgLXNpbl82MCAgICAgICwgIGNvc182MCwgLXNpbl82MCwgIGNvc182MCooMSt0KSAgLCAgc2luXzYwKih0LTEpLCAgdCooMS1jb3NfNjApLCB0KnNpbl82MCwgLXQqY29zXzYwLCB0KnNpbl82MCwgLTIqdCpjb3NfNjAsICAwICAgICAgICBdKTt9LFxuXHRcdG5vcnRoRWFzdDogZnVuY3Rpb24odCkge3JldHVybiBuZXcgUElYSS5Qb2x5Z29uKFsgMS10KmNvc182MCAgICwgIDAtdCpzaW5fNjAgICwgIDEgICAgICwgICAgICAgMCwgIDEtdCpjb3NfNjAgICAgLCAgdCpzaW5fNjAgICAgLCAtdCpjb3NfNjAgICAgLCB0KnNpbl82MCwgLXQgICAgICAgLCAwICAgICAgICwgLXQqY29zXzYwICAsIC10KnNpbl82MCBdKTt9LFxuXHRcdHNvdXRoRWFzdDogZnVuY3Rpb24odCkge3JldHVybiBuZXcgUElYSS5Qb2x5Z29uKFsgY29zXzYwKigxK3QpICwgIHNpbl82MCooMS10KSwgIGNvc182MCwgIHNpbl82MCwgIGNvc182MC10ICAgICAgLCAgc2luXzYwICAgICAgLCAtdCAgICAgICAgICAgLCAwICAgICAgICwgLXQqY29zXzYwLC10KnNpbl82MCwgIHQqY29zXzYwICAsIC10KnNpbl82MCBdKTt9LFxuXHRcdHNvdXRoICAgIDogZnVuY3Rpb24odCkge3JldHVybiBuZXcgUElYSS5Qb2x5Z29uKFstY29zXzYwKih0KzEpICwgIHNpbl82MCooMS10KSwgLWNvc182MCwgIHNpbl82MCwgICgyKnQtMSkqY29zXzYwLCAgc2luXzYwICAgICAgLCAgMip0KmNvc182MCAgLCAwICAgICAgICwgdCpjb3NfNjAgLC10KnNpbl82MCwgLXQqY29zXzYwICAsIC10KnNpbl82MCBdKTt9LFxuXHRcdHNvdXRoV2VzdDogZnVuY3Rpb24odCkge3JldHVybiBuZXcgUElYSS5Qb2x5Z29uKFstMSt0KmNvc182MCAgICwgLXNpbl82MCp0ICAgICwgLTEgICAgICwgICAgICAgMCwgLTErdCpjb3NfNjAgICAgLCAgc2luXzYwKnQgICAgLCAgdCpjb3NfNjAgICAgLCBzaW5fNjAqdCwgdCAgICAgICAgLCAwICAgICAgICwgIHQqY29zXzYwICAsIC1zaW5fNjAqdCBdKTt9LFxuXHRcdG5vcnRoV2VzdDogZnVuY3Rpb24odCkge3JldHVybiBuZXcgUElYSS5Qb2x5Z29uKFstY29zXzYwK3QgICAgICwgLXNpbl82MCAgICAgICwgLWNvc182MCwgLXNpbl82MCwgLSh0KzEpKmNvc182MCAgLCAgKHQtMSkqc2luXzYwLCAtdCpjb3NfNjAgICAgLCBzaW5fNjAqdCwgdCpjb3NfNjAgLCBzaW5fNjAqdCwgIHQgICAgICAgICAsICAwICAgICAgICBdKTt9LFxuXHR9O1xuXHRoZXhSYWRpYWxMaW5lVmVydGV4WzBdID0gaGV4UmFkaWFsTGluZVZlcnRleC5ub3J0aDtcblx0aGV4UmFkaWFsTGluZVZlcnRleFsxXSA9IGhleFJhZGlhbExpbmVWZXJ0ZXgubm9ydGhFYXN0O1xuXHRoZXhSYWRpYWxMaW5lVmVydGV4WzJdID0gaGV4UmFkaWFsTGluZVZlcnRleC5zb3V0aEVhc3Q7XG5cdGhleFJhZGlhbExpbmVWZXJ0ZXhbM10gPSBoZXhSYWRpYWxMaW5lVmVydGV4LnNvdXRoO1xuXHRoZXhSYWRpYWxMaW5lVmVydGV4WzRdID0gaGV4UmFkaWFsTGluZVZlcnRleC5zb3V0aFdlc3Q7XG5cdGhleFJhZGlhbExpbmVWZXJ0ZXhbNV0gPSBoZXhSYWRpYWxMaW5lVmVydGV4Lm5vcnRoV2VzdDtcblxuXHR2YXIgaGV4UmFkaWFsTGluZVNpZGUgPSB7XG5cdFx0bm9ydGggICAgOiBmdW5jdGlvbih0KSB7cmV0dXJuIG5ldyBQSVhJLlBvbHlnb24oW1xuXHRcdFx0LXQqY29zXzYwICAgICAgLCAtc2luXzYwICAgICxcblx0XHRcdCB0KmNvc182MCAgICAgICwgLXNpbl82MCAgICAsXG5cdFx0XHQgdCpjb3NfNjAgICAgICAsICAwICAgICAgICAgLFxuXHRcdFx0IHQqY29zXzYwLzIgICAgLCAgdCpzaW5fNjAvMixcblx0XHRcdC10KmNvc182MC8yICAgICwgIHQqc2luXzYwLzIsXG5cdFx0XHQtdCpjb3NfNjAgICAgICAsICAwICAgICAgICAgLFxuXHRcdFx0XSk7fSxcblxuXHRcdG5vcnRoRWFzdDogZnVuY3Rpb24odCkge3JldHVybiBuZXcgUElYSS5Qb2x5Z29uKFtcblx0XHRcdCAxLSh0KzEpKmNvc182MC8yLCAtKHQrMSkqc2luXzYwLzIsXG5cdFx0XHQgMSsodC0xKSpjb3NfNjAvMiwgICh0LTEpKnNpbl82MC8yLFxuXHRcdFx0IHQqY29zXzYwLzIgICAgICAsICB0KnNpbl82MC8yICAgICxcblx0XHRcdC10KmNvc182MC8yICAgICAgLCAgdCpzaW5fNjAvMiAgICAsXG5cdFx0XHQtdCpjb3NfNjAgICAgICAgICwgIDAgICAgICAgICAgICAgLFxuXHRcdFx0LXQqY29zXzYwLzIgICAgICAsIC10KnNpbl82MC8yICAgICxcblx0XHRcdF0pO30sXG5cdFx0XG5cdFx0c291dGhFYXN0OiBmdW5jdGlvbih0KSB7cmV0dXJuIG5ldyBQSVhJLlBvbHlnb24oW1xuXHRcdCAgICAoMyt0KSpjb3NfNjAvMiwgICgxLXQpKnNpbl82MC8yLFxuXHRcdCAgICAoMy10KSpjb3NfNjAvMiwgICgxK3QpKnNpbl82MC8yLFxuXHRcdCAgICAtY29zXzYwLzIqdCAgICwgIHNpbl82MC8yKnQgICAgLFxuXHRcdCAgICAtY29zXzYwKnQgICAgICwgIDAgICAgICAgICAgICAgLFxuXHRcdCAgICAtY29zXzYwLzIqdCAgICwgLXNpbl82MC8yKnQgICAgLFxuXHRcdCAgICAgY29zXzYwLzIqdCAgICwgLXNpbl82MC8yKnQgICAgLFxuXHRcdCAgICBdKTt9LFxuXHRcdFxuXHRcdHNvdXRoICAgIDogZnVuY3Rpb24odCkge3JldHVybiBuZXcgUElYSS5Qb2x5Z29uKFtcblx0XHRcdCB0KmNvc182MCAgICAgICwgIHNpbl82MCAgICAsXG5cdFx0XHQtdCpjb3NfNjAgICAgICAsICBzaW5fNjAgICAgLFxuXHRcdFx0LXQqY29zXzYwICAgICAgLCAgMCAgICAgICAgICxcblx0XHRcdC10KmNvc182MC8yICAgICwgLXQqc2luXzYwLzIsXG5cdFx0XHQgdCpjb3NfNjAvMiAgICAsIC10KnNpbl82MC8yLFxuXHRcdFx0IHQqY29zXzYwICAgICAgLCAgMCAgICAgICAgICxcblx0XHRcdF0pO30sXG5cblx0XHRzb3V0aFdlc3Q6IGZ1bmN0aW9uKHQpIHtyZXR1cm4gbmV3IFBJWEkuUG9seWdvbihbXG5cdFx0XHQgLSgxLSh0KzEpKmNvc182MC8yKSwgICh0KzEpKnNpbl82MC8yLFxuXHRcdFx0IC0oMSsodC0xKSpjb3NfNjAvMiksIC0odC0xKSpzaW5fNjAvMixcblx0XHRcdC10KmNvc182MC8yICAgICAgLCAtdCpzaW5fNjAvMiAgICAsXG5cdFx0XHQgdCpjb3NfNjAvMiAgICAgICwgLXQqc2luXzYwLzIgICAgLFxuXHRcdFx0IHQqY29zXzYwICAgICAgICAsICAwICAgICAgICAgICAgICxcblx0XHRcdCB0KmNvc182MC8yICAgICAgLCAgdCpzaW5fNjAvMiAgICAsXG5cdFx0XHRdKTt9LFxuXG5cdFx0bm9ydGhXZXN0OiBmdW5jdGlvbih0KSB7cmV0dXJuIG5ldyBQSVhJLlBvbHlnb24oW1xuXHRcdCAgICAtKDMrdCkqY29zXzYwLzIsIC0oMS10KSpzaW5fNjAvMixcblx0XHQgICAgLSgzLXQpKmNvc182MC8yLCAtKDErdCkqc2luXzYwLzIsXG5cdFx0ICAgICBjb3NfNjAvMip0ICAgICwgLXNpbl82MC8yKnQsXG5cdFx0ICAgICBjb3NfNjAqdCAgICAgICwgIDAsXG5cdFx0ICAgICBjb3NfNjAvMip0ICAgICwgIHNpbl82MC8yKnQsXG5cdFx0ICAgIC1jb3NfNjAvMip0ICAgICwgIHNpbl82MC8yKnQsXG5cdFx0ICAgIF0pO30sXG5cdH07XG5cdFx0XG5cdGhleFJhZGlhbExpbmVTaWRlWzBdID0gaGV4UmFkaWFsTGluZVNpZGUubm9ydGg7XG5cdGhleFJhZGlhbExpbmVTaWRlWzFdID0gaGV4UmFkaWFsTGluZVNpZGUubm9ydGhFYXN0O1xuXHRoZXhSYWRpYWxMaW5lU2lkZVsyXSA9IGhleFJhZGlhbExpbmVTaWRlLnNvdXRoRWFzdDtcblx0aGV4UmFkaWFsTGluZVNpZGVbM10gPSBoZXhSYWRpYWxMaW5lU2lkZS5zb3V0aDtcblx0aGV4UmFkaWFsTGluZVNpZGVbNF0gPSBoZXhSYWRpYWxMaW5lU2lkZS5zb3V0aFdlc3Q7XG5cdGhleFJhZGlhbExpbmVTaWRlWzVdID0gaGV4UmFkaWFsTGluZVNpZGUubm9ydGhXZXN0O1xuXG5cdGZ1bmN0aW9uIGRpcmVjdGlvbkZvclBvaW50cyhwMCwgcDEsIGNvb3JkaW5hdGVTeXN0ZW0pIHtcblx0XHRwMCA9IGNvb3JkaW5hdGVTeXN0ZW0udG9DdWJlQ29vcmRpbmF0ZXMocDApO1xuXHRcdHAxID0gY29vcmRpbmF0ZVN5c3RlbS50b0N1YmVDb29yZGluYXRlcyhwMSk7XG5cblx0XHR2YXIgZCA9IHt4OiBwMS54LXAwLngsIHk6IHAxLnktcDAueSwgejogcDEuei1wMC56fTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGlyZWN0aW9uLmFzQXJyYXkubGVuZ3RoOyArK2kpIHtcblx0XHRcdHZhciBkaXIgPSBkaXJlY3Rpb24uYXNBcnJheVtpXTtcblx0XHRcdGlmIFx0KCBkLnggPT09IGRpci54ICYmXG5cdFx0XHRcdCAgZC55ID09PSBkaXIueSAmJlxuXHRcdFx0XHQgIGQueiA9PT0gZGlyLnopXG5cdFx0XHR7IHJldHVybiBpOyB9XG5cdFx0fVxuXHRcdHJldHVybiAtMTtcblx0fVxuXG5cdGZ1bmN0aW9uIGRpc3RhbmNlKHAwLCBwMSwgY29vcmRpbmF0ZVN5c3RlbSkge1xuXHRcdHAwID0gY29vcmRpbmF0ZVN5c3RlbS50b0N1YmVDb29yZGluYXRlcyhwMCk7XG5cdFx0cDEgPSBjb29yZGluYXRlU3lzdGVtLnRvQ3ViZUNvb3JkaW5hdGVzKHAxKTtcblxuXHRcdHZhciBkeCA9IE1hdGguYWJzKHAxLnggLSBwMC54KTtcblx0XHR2YXIgZHkgPSBNYXRoLmFicyhwMS55IC0gcDAueSk7XG5cdFx0dmFyIGR6ID0gTWF0aC5hYnMocDEueiAtIHAwLnopO1xuXG5cdFx0dmFyIGQgPSAoZHggKyBkeSArIGR6KSAvIDI7XG5cblx0XHRyZXR1cm4gZDtcblx0fVxuXG5cdGZ1bmN0aW9uIGhleGFnb24ocDAsIHIsIGNvb3JkaW5hdGVTeXN0ZW0pIHtcblx0XHRwMCA9IGNvb3JkaW5hdGVTeXN0ZW0udG9DdWJlQ29vcmRpbmF0ZXMocDApO1xuXG5cdFx0aWYgKHIgPT09IDApIHtcblx0XHRcdHAwLmluZGV4ID0gMDtcblx0XHRcdHJldHVybiBbcDBdO1xuXHRcdH1cblxuICAgIFx0dmFyIHJlc3VsdHMgPSBbXTtcbiAgICBcdHZhciBkaXIgPSBkaXJlY3Rpb24uc291dGhXZXN0O1xuICAgIFx0dmFyIGN1YmUgPSB7eDpwMC54ICsgcipkaXIueCwgeTpwMC55ICsgcipkaXIueSwgejpwMC56ICsgcipkaXIueix9O1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCA2OyArK2kpIHtcblx0ICAgIFx0Ly8gQ2hvb3NlIGRpcmVjdGlvblxuXHQgICAgXHRkaXIgPSBkaXJlY3Rpb24uYXNBcnJheVtpXTtcblx0ICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHI7ICsraikge1xuXHQgICAgICAgICAgICBpZiAoY29vcmRpbmF0ZVN5c3RlbS5jdWJlLmluQm91bmRzKGN1YmUpKSB7XG5cdCAgICAgICAgICAgIFx0Y3ViZS5pbmRleCA9IGkqKGorMSk7XG5cdCAgICAgICAgICAgIFx0cmVzdWx0cy5wdXNoKGN1YmUpO1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgIC8vIFdhbGsgb25lIHN0ZXAgaW4gdGhlIGNob3NlbiBkaXJlY3Rpb25cblx0ICAgICAgICAgICAgY3ViZSA9IHt4OmN1YmUueCArIGRpci54LCB5OmN1YmUueSArIGRpci55LCB6OmN1YmUueiArIGRpci56LH07XG5cdCAgICAgICAgfVxuXHQgICAgfVxuXG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH1cblxuXHRmdW5jdGlvbiBoZXhhZ29uU3BpcmFsKHAwLCByLCBjb29yZGluYXRlU3lzdGVtKSB7XG5cdFx0cDAgPSBjb29yZGluYXRlU3lzdGVtLl90b0N1YmVDb29yZGluYXRlcyhwMCk7XG5cblx0ICAgIHZhciByZXN1bHRzID0gW3AwXTtcbiAgICBcdGZvciAodmFyIGkgPSAxOyBpIDw9IHI7ICsraSkge1xuICAgIFx0XHRyZXN1bHRzLmNvbmNhdChoZXhhZ29uKHAwLCBpLCBjb29yZGluYXRlU3lzdGVtKSk7XG4gICAgXHR9XG4gICAgXHRyZXR1cm4gcmVzdWx0cztcblx0fVxuXG5cdGZ1bmN0aW9uIGhleGFnb25EaXNjKHAwLCByLCBjb29yZGluYXRlU3lzdGVtKSB7XG5cdFx0cDAgPSBjb29yZGluYXRlU3lzdGVtLl90b0N1YmVDb29yZGluYXRlcyhwMCk7XG5cblx0XHR2YXIgcmVzdWx0cyA9IFtdO1xuXHRcdGZvciAodmFyIGR4ID0gLXI7IGR4IDw9IHI7ICsrZHgpIHtcblx0XHRcdGZvciAodmFyIGR5ID0gTWF0aC5tYXgoLXIsIC1keC1yKTsgZHkgPD0gTWF0aC5taW4ociwgLWR4K3IpOyArK2R5KSB7XG5cdFx0XHQgICAgdmFyIGR6ID0gLWR4LWR5O1xuXHRcdFx0XHR2YXIgcCA9IHsgeDpwMC54K2R4LCB5OnAwLnkrZHksIHo6cDAueitkeiB9O1xuXHRcdFx0ICAgIHJlc3VsdHMucHVzaChwKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXROZWlnaGJvdXIocDAsIGRpcmVjdGlvbiwgY29vcmRpbmF0ZVN5c3RlbSkge1xuXHRcdHZhciBjdWJlQ29vcmQgPSBjb29yZGluYXRlU3lzdGVtLnRvQ3ViZUNvb3JkaW5hdGVzKHAwKTtcblxuXHRcdGN1YmVDb29yZCA9IHtcdHg6Y3ViZUNvb3JkLngrZGlyZWN0aW9uLngsXG5cdFx0XHRcdFx0XHR5OmN1YmVDb29yZC55K2RpcmVjdGlvbi55LFxuXHRcdFx0XHRcdFx0ejpjdWJlQ29vcmQueitkaXJlY3Rpb24uelxuXHRcdFx0XHRcdH07XG5cblx0XHRyZXR1cm4gY3ViZUNvb3JkO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0TmVpZ2hib3VycyhwMCwgY29vcmRpbmF0ZVN5c3RlbSkge1xuXHRcdHJldHVybiBoZXhhZ29uKHAwLCAxLCBjb29yZGluYXRlU3lzdGVtKTtcdFxuXHR9XG5cblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdC8vID09PSBFYXNpbmcgZnVuY3Rpb25zXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHQvLyBDb3VydGVzeSBvZiBcImh0dHA6Ly9naXptYS5jb20vZWFzaW5nXCJcblx0Ly8gXG5cdGZ1bmN0aW9uIGVhc2VJbk91dFF1YWQgKHQsIHgsIGR4LCBkdXJhdGlvbikge1xuXHRcdHQgLz0gZHVyYXRpb24vMjtcblx0XHRpZiAodCA8IDEpIHJldHVybiBkeC8yKnQqdCArIHg7XG5cdFx0dC0tO1xuXHRcdHJldHVybiAtZHgvMiAqICh0Kih0LTIpIC0gMSkgKyB4O1xuXHR9XG5cdGZ1bmN0aW9uIGVhc2VJbk91dEV4cCAodCwgeCwgZHgsIGR1cmF0aW9uKSB7XG5cdFx0dCAvPSBkdXJhdGlvbi8yO1xuXHRcdGlmICh0IDwgMSkgcmV0dXJuIGR4LzIgKiBNYXRoLnBvdyggMiwgMTAgKiAodCAtIDEpICkgKyB4O1xuXHRcdHQtLTtcblx0XHRyZXR1cm4gZHgvMiAqICggLU1hdGgucG93KCAyLCAtMTAgKiB0KSArIDIgKSArIHg7XG5cdH1cblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdC8vID09IEVORCBFYXNpbmcgZnVuY3Rpb25zXG5cblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdC8vID09PSBFeHBvcnRlZCBBUElcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdHZhciBBUEkgPSB7XG5cblx0XHRkaXJlY3Rpb246IGRpcmVjdGlvbixcblxuXHRcdGRpcmVjdGlvbkZvclBvaW50czogZGlyZWN0aW9uRm9yUG9pbnRzLFxuXG5cdFx0ZGlzdCAgICAgICAgICA6IGRpc3RhbmNlLFxuXHRcdGhleGFnb24gICAgICAgOiBoZXhhZ29uLFxuXHRcdGhleGFnb25TcGlyYWwgOiBoZXhhZ29uU3BpcmFsLFxuXHRcdGhleGFnb25EaXNjICAgOiBoZXhhZ29uRGlzYyxcblxuXHRcdGdldE5laWdoYm91ciA6IGdldE5laWdoYm91cixcblx0XHRnZXROZWlnaGJvdXJzOiBnZXROZWlnaGJvdXJzLFxuXG5cdFx0Y29zXzMwIDogY29zXzMwLFxuXHRcdGNvc182MCA6IGNvc182MCxcblx0XHRzaW5fMzAgOiBzaW5fMzAsXG5cdFx0c2luXzYwIDogc2luXzYwLFxuXHRcdHRhbl8zMCA6IHRhbl8zMCxcblx0XHR0YW5fNjAgOiB0YW5fNjAsXG5cblx0XHRoZXhhZ29uV2lkdGggOiBoZXhhZ29uV2lkdGgsXG5cdFx0aGV4YWdvbkhlaWdodDogaGV4YWdvbkhlaWdodCxcblxuXHRcdHJhbmRvbUdhdXNzaWFuIDogcmFuZG9tR2F1c3NpYW4sXG5cdFx0cmFuZG9tSW50ICAgICAgOiByYW5kb21JbnQsXG5cdFx0cmFuZG9tSW50QXJyYXkgOiByYW5kb21JbnRBcnJheSxcblx0XHRzaHVmZmxlQXJyYXk6IHNodWZmbGVBcnJheSxcblxuXHRcdGhleFBvaW50cyAgICAgICAgOiBoZXhQb2ludHMsXG5cdFx0aGV4U2hhcGUgICAgICAgICA6IGhleFNoYXBlLFxuXHRcdGhleEVkZ2UgICAgICAgICAgICA6IGhleEVkZ2UsXG5cdFx0aGV4UmFkaWFsTGluZVZlcnRleDogaGV4UmFkaWFsTGluZVZlcnRleCxcblx0XHRoZXhSYWRpYWxMaW5lU2lkZSAgOiBoZXhSYWRpYWxMaW5lU2lkZSxcblxuXHRcdC8vIEVhc2luZ1xuXHRcdGVhc2VJbk91dFF1YWQgOiBlYXNlSW5PdXRRdWFkLFxuXHRcdGVhc2VJbk91dEV4cCA6IGVhc2VJbk91dEV4cCxcblx0fTtcblxuXHRyZXR1cm4gQVBJO1xufSgpKTsiLCIvLyBEZWZpbmUgbW9kdWxlIEhleFV0aWxcbid1c2Ugc3RyaWN0JztcblxuLyoganNoaW50IGJyb3dzZXJpZnk6IHRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKCkge1xuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0Ly8gPT09IFNpbXBsZSBMaW5rZWQgTGlzdCBpbXBsZW1lbnRhdGlvbiA9PT1cblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdGZ1bmN0aW9uIExpbmtlZExpc3QgKCkge1xuXHRcdHRoaXMuZmlyc3QgPSBudWxsO1xuXHRcdHRoaXMubGFzdCAgPSBudWxsO1xuXHRcdHRoaXMubGVuZ3RoID0gMDtcblx0fVxuXHRMaW5rZWRMaXN0LnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoaW5kZXgsIGRhdGEpe1xuXHRcdHZhciBpbnNlcnRBZnRlck5vZGUsIGRhdGFOb2RlO1xuXG5cdFx0ZGF0YU5vZGUgPSBuZXcgTGlua2VkTGlzdE5vZGUoZGF0YSk7XG5cblx0XHRpZiAodGhpcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHRoaXMuZmlyc3QgPSBkYXRhTm9kZTtcblx0XHRcdHRoaXMubGFzdCAgPSBkYXRhTm9kZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aW5zZXJ0QWZ0ZXJOb2RlID0gdGhpcy5nZXQoaW5kZXgpO1xuXHRcdFx0aWYgKGluc2VydEFmdGVyTm9kZS5uZXh0ICE9PSBudWxsKSB7XG5cdFx0XHRcdGluc2VydEFmdGVyTm9kZS5uZXh0LnByZXYgPSBkYXRhTm9kZTtcblx0XHRcdH1cblx0XHRcdGluc2VydEFmdGVyTm9kZS5uZXh0ID0gZGF0YTtcblx0XHR9XG5cblx0XHRpZiAoaW5kZXggPT09IHRoaXMubGVuZ3RoLTEpIHtcblx0XHRcdHRoaXMubGFzdCA9IGRhdGFOb2RlO1xuXHRcdH1cblxuXHRcdHRoaXMubGVuZ3RoICs9IDE7XG5cdFx0cmV0dXJuO1xuXHR9O1xuXG5cdExpbmtlZExpc3QucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChpbmRleCkge1xuXHRcdHJldHVybiB0aGlzLnJlbW92ZUVsZW1lbnQodGhpcy5nZXROb2RlKGluZGV4KSk7XG5cdH07XG5cblx0TGlua2VkTGlzdC5wcm90b3R5cGUucmVtb3ZlRWxlbWVudCA9IGZ1bmN0aW9uIChub2RlKSB7XG5cdFx0dmFyIHJlbW92ZU5vZGU7XG5cblx0XHRpZiAobm9kZSA9PT0gbnVsbCkge3JldHVybjt9XG5cblx0XHRyZW1vdmVOb2RlID0gbm9kZTtcblx0XHRpZiAocmVtb3ZlTm9kZS5uZXh0ICE9PSBudWxsICYmXG5cdFx0XHRyZW1vdmVOb2RlLnByZXYgIT09IG51bGwpXG5cdFx0e1xuXHRcdFx0cmVtb3ZlTm9kZS5uZXh0LnByZXYgPSByZW1vdmVOb2RlLnByZXY7XG5cdFx0XHRyZW1vdmVOb2RlLnByZXYubmV4dCA9IHJlbW92ZU5vZGUubmV4dDtcblx0XHR9XG5cdFx0ZWxzZSBpZiAocmVtb3ZlTm9kZS5uZXh0ID09PSBudWxsICYmXG5cdFx0XHRcdCByZW1vdmVOb2RlLnByZXYgPT09IG51bGwpXG5cdFx0e1xuXHRcdFx0dGhpcy5maXJzdCA9IG51bGw7XG5cdFx0XHR0aGlzLmxhc3QgID0gbnVsbDtcblx0XHR9XG5cdFx0ZWxzZSBpZiAocmVtb3ZlTm9kZS5uZXh0ID09PSBudWxsKVxuXHRcdHtcblx0XHRcdHJlbW92ZU5vZGUucHJldi5uZXh0ID0gbnVsbDtcblx0XHRcdHRoaXMubGFzdCAgICAgICAgICAgID0gcmVtb3ZlTm9kZS5wcmV2O1xuXHRcdH1cblx0XHRlbHNlIGlmIChyZW1vdmVOb2RlLnByZXYgPT09IG51bGwpXG5cdFx0e1xuXHRcdFx0cmVtb3ZlTm9kZS5uZXh0LnByZXYgPSBudWxsO1xuXHRcdFx0dGhpcy5maXJzdCAgICAgICAgICAgPSByZW1vdmVOb2RlLm5leHQ7XG5cdFx0fVxuXG5cdFx0cmVtb3ZlTm9kZS5uZXh0ID0gbnVsbDtcblx0XHRyZW1vdmVOb2RlLnByZXYgPSBudWxsO1xuXG5cdFx0dGhpcy5sZW5ndGggLT0gMTtcblx0XHRyZXR1cm4gcmVtb3ZlTm9kZS5kYXRhO1xuXHR9O1xuXG5cdExpbmtlZExpc3QucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChpbmRleCkge1xuXHRcdHJldHVybiB0aGlzLmdldE5vZGUoaW5kZXgpLmRhdGE7XG5cdH07XG5cblx0TGlua2VkTGlzdC5wcm90b3R5cGUuZ2V0Tm9kZSA9IGZ1bmN0aW9uIChpbmRleCkge1xuXHRcdHZhciBsZW5ndGgsIHNlYXJjaEluZGV4LCBzZWFyY2hOb2RlO1xuXG5cdFx0bGVuZ3RoID0gdGhpcy5sZW5ndGg7XG5cdFx0aWYgKGxlbmd0aCAtIGluZGV4ID4gbGVuZ3RoLzIpIHtcblx0XHRcdC8vIFNlYXJjaCBmcm9tIGVuZFxuXHRcdFx0c2VhcmNoSW5kZXggPSBsZW5ndGgtaW5kZXgtMTtcblx0XHRcdHNlYXJjaE5vZGUgID0gdGhpcy5sYXN0O1xuXHRcdFx0d2hpbGUgKHNlYXJjaEluZGV4ID4gMCkge1xuXHRcdFx0XHRzZWFyY2hJbmRleCAtPSAxO1xuXHRcdFx0XHRzZWFyY2hOb2RlICAgPSBzZWFyY2hOb2RlLnByZXY7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFNlYXJjaCBmcm9tIHN0YXJ0XG5cdFx0XHRzZWFyY2hJbmRleCA9IGluZGV4O1xuXHRcdFx0c2VhcmNoTm9kZSAgPSB0aGlzLmZpcnN0O1xuXHRcdFx0d2hpbGUgKHNlYXJjaEluZGV4ID4gMCkge1xuXHRcdFx0XHRzZWFyY2hJbmRleCAtPSAxO1xuXHRcdFx0XHRzZWFyY2hOb2RlICAgPSBzZWFyY2hOb2RlLm5leHQ7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBzZWFyY2hOb2RlO1xuXHR9O1xuXG5cdExpbmtlZExpc3QucHJvdG90eXBlLnBlZWsgICA9IGZ1bmN0aW9uICgpIHt9O1xuXHRcblx0TGlua2VkTGlzdC5wcm90b3R5cGUucG9wICAgID0gZnVuY3Rpb24gKCkge1xuXHRcdHZhciBub2RlO1xuXG5cdFx0aWYgKHRoaXMubGVuZ3RoID09PSAwKSB7cmV0dXJuIG51bGw7fVxuXG5cdFx0bm9kZSA9IHRoaXMubGFzdDtcblxuXHRcdGlmIChub2RlLnByZXYgIT09IG51bGwpIHtcblx0XHRcdG5vZGUucHJldi5uZXh0ID0gbnVsbDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5maXJzdCA9IG51bGw7XG5cdFx0fVxuXG5cdFx0dGhpcy5sYXN0ID0gbm9kZS5wcmV2O1xuXG5cdFx0dGhpcy5sZW5ndGggLT0gMTtcblx0XHRyZXR1cm4gbm9kZS5kYXRhO1xuXHR9O1xuXHRcblx0TGlua2VkTGlzdC5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0dmFyIG5vZGU7XG5cblx0XHRub2RlID0gbmV3IExpbmtlZExpc3ROb2RlKGRhdGEpO1xuXG5cdFx0aWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHR0aGlzLmZpcnN0ID0gbm9kZTtcblx0XHRcdHRoaXMubGFzdCAgPSBub2RlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRub2RlLnByZXYgPSB0aGlzLmxhc3Q7XG5cdFx0XHR0aGlzLmxhc3QubmV4dCA9IG5vZGU7XG5cdFx0XHR0aGlzLmxhc3QgICAgICA9IG5vZGU7XG5cdFx0fVxuXG5cdFx0dGhpcy5sZW5ndGggKz0gMTtcblx0XHRyZXR1cm47XG5cdH07XG5cblx0Ly8gTGlua2VkTGlzdC5wcm90b3R5cGUuaXRlcmF0b3IgPSBmdW5jdGlvbiogKCkge307XG5cblx0ZnVuY3Rpb24gTGlua2VkTGlzdE5vZGUgKGRhdGEpIHtcblx0XHR0aGlzLm5leHQgPSBudWxsO1xuXHRcdHRoaXMucHJldiA9IG51bGw7XG5cblx0XHR0aGlzLmRhdGEgPSBkYXRhO1xuXHR9XG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHQvLyA9PT0gRU5EIFNpbXBsZSBMaW5rZWQgTGlzdCBpbXBsZW1lbnRhdGlvblxuXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHQvLyA9PT0gSGFzaCBzZXQgZm9yIGNvb3JkaW5hdGVzXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVx0XG5cdGZ1bmN0aW9uIENvb3JkaW5hdGVTZXQgKCkge1xuXHRcdHRoaXMuaGFzaCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cdH1cblxuXHRDb29yZGluYXRlU2V0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAoIHgsIHksIHogKSB7XG5cdFx0dmFyIGhhc2g7XG5cblx0XHRoYXNoID0gdGhpcy5oYXNoO1xuXHRcdGhhc2ggPSBoYXNoW3hdO1xuXHRcdGlmIChoYXNoID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuaGFzaFt4XSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cdFx0XHRoYXNoID0gdGhpcy5oYXNoW3hdO1xuXHRcdH1cblxuXHRcdGhhc2ggPSBoYXNoW3ldO1xuXHRcdGlmIChoYXNoID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuaGFzaFt4XVt5XSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cdFx0XHRoYXNoID0gdGhpcy5oYXNoW3hdW3ldO1xuXHRcdH1cblxuXHRcdGhhc2hbel0gPSB0cnVlO1xuXHR9O1xuXHRDb29yZGluYXRlU2V0LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoeCwgeSwgeikge1xuXHRcdHZhciBoYXNoO1xuXHRcdGhhc2ggPSB0aGlzLmhhc2hbeF07XG5cdFx0aWYgKGhhc2ggPT09IHVuZGVmaW5lZCkge3JldHVybjt9XG5cdFx0aGFzaCA9IHRoaXMuaGFzaFt5XTtcblx0XHRpZiAoaGFzaCA9PT0gdW5kZWZpbmVkKSB7cmV0dXJuO31cblx0XHRoYXNoID0gdGhpcy5oYXNoW3pdO1xuXHRcdGhhc2hbel0gPSBmYWxzZTtcblx0fTtcblx0Q29vcmRpbmF0ZVNldC5wcm90b3R5cGUuaW4gPSBmdW5jdGlvbiAoeCwgeSwgeikge1xuXHRcdHZhciBoYXNoID0gdGhpcy5oYXNoO1xuXHRcdGhhc2ggPSBoYXNoW3hdO1xuXHRcdGhhc2ggPSBoYXNoICYmIGhhc2hbeV07XG5cdFx0aGFzaCA9IGhhc2ggJiYgaGFzaFt6XTtcblx0XHRyZXR1cm4gaGFzaDtcblx0fTtcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdC8vID09PSBFTkQgSGFzaCBzZXQgZm9yIGNvb3JkaW5hdGVzXG5cblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdC8vID09PSBFeHBvcnRlZCBBUElcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdHZhciBBUEkgPSB7XG5cdFx0TGlua2VkTGlzdDogTGlua2VkTGlzdCxcblx0XHRDb29yZGluYXRlU2V0OiBDb29yZGluYXRlU2V0XG5cdH07XG5cdHJldHVybiBBUEk7XG59KCkpOyIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIFBJWEkgKi9cbi8qIGdsb2JhbCBNZXJzZW5uZVR3aXN0ZXIgKi9cbi8qIGdsb2JhbCBIYW1tZXIgKi9cblxuLyoganNoaW50IGJyb3dzZXJpZnk6IHRydWUgKi9cbi8qIGpzaGludCBicm93c2VyICAgOiB0cnVlICovXG4vKiBnbG9iYWwgcGVyZm9ybWFuY2UgKi9cbi8qIGpzaGludCBkZXZlbCAgIDogdHJ1ZSAqL1xuXG52YXIgT3hDZWxsID0gcmVxdWlyZSgnLi9jb3JlL294LWNlbGwuanMnKTtcbnZhciBPeEdyaWQgPSByZXF1aXJlKCcuL2NvcmUvb3gtZ3JpZC5qcycpO1xudmFyIE94TWF0aCA9IHJlcXVpcmUoJy4vY29yZS9veC1tYXRoLmpzJyk7XG52YXIgT3hBbmltYXRpb25TeXN0ZW0gPSByZXF1aXJlKCcuL2NvcmUvb3gtYW5pbWF0aW9uLXN5c3RlbS5qcycpO1xuXG52YXIgQXBwTW9kZWwgICAgICA9IHJlcXVpcmUoJy4vYXBwLW1vZGVsLmpzJyk7XG52YXIgQXBwQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vYXBwLWNvbnRyb2xsZXIuanMnKTtcblxuKGZ1bmN0aW9uICgpIHtcblx0Ly8gU2V0IHVwIHRoZSBQSVhJIHJlbmRlcmVyXG5cdHZhciBjYW52YXMgPSB7d2lkdGg6IDUwMCwgaGVpZ2h0OiAzMDB9O1xuXHR2YXIgb3B0aW9ucyA9IHsgdHJhbnNwYXJlbnQgOiB0cnVlLFxuXHQgICAgICAgICAgICAgICAgYW50aWFsaWFzICAgOiB0cnVlLFxuXHQgICAgICAgICAgICAgICAgcmVzb2x1dGlvbiAgOiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpb1xuXHQgICAgICAgICAgICAgICB9O1xuXHR2YXIgcmVuZGVyZXIgPSBuZXcgUElYSS5XZWJHTFJlbmRlcmVyICggY2FudmFzLndpZHRoLFxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FudmFzLmhlaWdodCxcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnNcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuXHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzLXdyYXBwZXInKS5hcHBlbmRDaGlsZChyZW5kZXJlci52aWV3KTtcblx0cmVuZGVyZXIudmlldy5zdHlsZS53aWR0aCAgICAgPSBjYW52YXMud2lkdGg7XG5cdHJlbmRlcmVyLnZpZXcuc3R5bGUuaGVpZ2h0ICAgID0gY2FudmFzLmhlaWdodDtcblx0cmVuZGVyZXIudmlldy5zdHlsZS5taW5XaWR0aCAgPSBjYW52YXMud2lkdGg7XG5cdHJlbmRlcmVyLnZpZXcuc3R5bGUubWluSGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcblx0cmVuZGVyZXIudmlldy5zdHlsZS5tYXhXaWR0aCAgPSBjYW52YXMud2lkdGg7XG5cdHJlbmRlcmVyLnZpZXcuc3R5bGUubWF4SGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcblxuXHR2YXIgY29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKCk7XG5cblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdC8vID09PSBTZXQgdXAgYW4gZXhhbXBsZSBncmlkXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHR2YXIgZ2FtZSA9IG5ldyBBcHBDb250cm9sbGVyKCk7XG5cdGdhbWUubG9hZExldmVsKCAndGVzdCcgKTtcblx0Z2FtZS5yZW5kZXJXaXRoKHJlbmRlcmVyKTtcblxuXHQvLyBNT1VTRSBNT1ZFIVxuXHR2YXIgbW91c2Vtb3ZlSGFuZGxlciA9IGZ1bmN0aW9uIChldikge1xuXHRcdHZhciBwaXhlbENvb3JkICA9IHt4OmV2Lm9mZnNldFgsIHk6ZXYub2Zmc2V0WX07XG5cdFx0Z2FtZS5zaG93QnJ1c2gocGl4ZWxDb29yZCk7XG5cdH07XG5cdHJlbmRlcmVyLnZpZXcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgbW91c2Vtb3ZlSGFuZGxlciwgZmFsc2UpO1xuXHRcblx0Ly8gQ0xJQ0shXG5cdHZhciBjbGlja0hhbmRsZXIgPSBmdW5jdGlvbiAoZXYpIHtcblx0XHRnYW1lLmFwcGx5QnJ1c2goKTtcblx0fTtcblx0cmVuZGVyZXIudmlldy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNsaWNrSGFuZGxlciwgZmFsc2UpO1xuXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHQvLyA9PT0gU2V0IHVwIGFuIGV4YW1wbGUgZ3JpZFxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0Ly8gdmFyIGNlbGxDb25mID0ge1xuXHQvLyBcdHN0cm9rZToge2NvbG9yOjB4NTg3MDU4LCB3aWR0aDowLjF9LCBcblx0Ly8gXHRlZGdlICA6IHtjb2xvcjoweGRkMjIyMiwgd2lkdGg6MC4yfSxcblx0Ly8gXHRyYWRpYWw6IHtcblx0Ly8gXHRcdFx0IHZlcnRleDp7Y29sb3I6MHhmZmNkMDAsIHdpZHRoOjAuMTh9LFxuXHQvLyBcdFx0XHQgc2lkZSAgOntjb2xvcjoweGZmY2QwMCwgd2lkdGg6MC4zfVxuXHQvLyBcdFx0XHR9XG5cdC8vICAgIH07XG5cdC8vIHZhciBncmlkQ29uZiA9IHtcblx0Ly8gXHRwb3NpdGlvbiA6IHt4OjAseTowfSxcblx0Ly8gXHRzY2FsZSAgICA6IHt4OjEwLHk6MTB9LFxuXHQvLyBcdHNpemUgICAgIDoge3c6MjAsaDoxNX0sXG5cdC8vIFx0Y2VsbCAgICAgOiBjZWxsQ29uZixcblx0Ly8gfVxuXHQvLyB2YXIgZ3JpZCA9IG5ldyBPeEdyaWQoZ3JpZENvbmYsIG51bGwpO1xuXHQvLyBncmlkLmNlbnRlckF0KHt4OmNhbnZhcy53aWR0aC8yLHk6Y2FudmFzLmhlaWdodC8yfSk7XG5cdC8vIGdyaWQuZHJhdygpO1xuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0XG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHQvLyA9PT0gU2V0IHVwIGFuaW1hdGlvbiBzeXN0ZW1cblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdHZhciByZW5kZXJDYWxsYmFjayA9IGZ1bmN0aW9uICgpIHtcblx0XHRnYW1lLnJlbmRlcldpdGgocmVuZGVyZXIpXG5cdFx0Ly8gcmVuZGVyZXIucmVuZGVyKGNvbnRhaW5lcik7XG5cdH07XG5cdHZhciBhbmltYXRpb25TeXN0ZW0gPSBuZXcgT3hBbmltYXRpb25TeXN0ZW0uQW5pbWF0aW9uU3lzdGVtKHJlbmRlckNhbGxiYWNrKTtcblxuXHQvLyBLaWNrLXN0YXJ0IHRoZSBhbmltYXRpb25cblx0YW5pbWF0aW9uU3lzdGVtLmFuaW1hdGUoKTtcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG59KCkpOyJdfQ==
