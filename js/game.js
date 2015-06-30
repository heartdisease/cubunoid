/**
 * This file is part of Cubunoid.
 * 
 * Cubunoid is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Cubunoid is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with Cubunoid.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @copyright 2011, 2012 Christoph Matscheko
 * @license
*/

// AMBIENT OCCLUSION! http://www.ozone3d.net/tutorials/ambient_occlusion.php#part_1

var DEBUG = false;
			
window.onload = function() {
	var game = new Cubunoid("#glcanvas");
	game.initGL();
	game.initOverlays();
	game.resizeGL();
	game.initShaders();
	game.showIntroDialog();
	game.loadMap(0);
};
