/**
 * Used for building the complete core distrubution.
 *
 * Usage in project:
 * 	var Ox = require('./lib/oxCore.js');
 * 	Ox.Math.Whatever();
 */
var OxAnimationSystem = require('./ox-animation-system.js');
var OxCell            = require('./ox-cell.js');
var OxColor           = require('./ox-color.js');
var OxCoordinate      = require('./ox-coordinate.js');
var OxGrid            = require('./ox-grid.js');
var OxMath            = require('./ox-math.js');
var OxUtil            = require('./ox-util.js');

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