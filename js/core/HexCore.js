/**
 * Used for building the complete core distrubution.
 *
 * Usage in project:
 * 	var Ox = require('./lib/oxCore.js');
 * 	Ox.Math.Whatever();
 */
var OxAnimationSystem = require('./HexAnimationSystem.js');
var OxCell            = require('./HexCell.js');
var OxColor           = require('./HexColor.js');
var OxCoordinate      = require('./HexCoordinate.js');
var OxGrid            = require('./HexGrid.js');
var OxMath            = require('./HexMath.js');
var OxUtil            = require('./HexUtil.js');

module.exports = (function () {
	return {
		AnimationSystem : OxAnimationSystem,
		Cell            : OxCell,
		Color           : OxColor,
		Coordinate      : OxCoordinate,
		Grid            : OxGrid,
		Math            : OxMath,
		Util            : OxUtil,
	}
}());