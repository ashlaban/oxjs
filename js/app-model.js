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