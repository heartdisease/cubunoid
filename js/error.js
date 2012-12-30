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
 * @copyright 2011 Christoph Matscheko
 * @license
*/

"use strict";

/**
 * Returns true if an error has been detected and
 * prints a message to the console.
*/
function checkErrors(gl, funcId) {
	var err = gl.getError();
	
	if (err != gl.NO_ERROR) {
		switch (err) {
			case gl.OUT_OF_MEMORY:
				console.error(funcId + ": out of memory!");
				break;		
			case gl.INVALID_ENUM:
				console.error(funcId + ": invalid enum!");
				break;
			case gl.INVALID_OPERATION:
				console.error(funcId + ": invalid operation!");
				break;
			case gl.INVALID_FRAMEBUFFER_OPERATION:
				console.error(funcId + ": invalid framebuffer operation!");
				break;
			case gl.INVALID_VALUE:
				console.error(funcId + ": invalid value!");
				break;
			case gl.CONTEXT_LOST_WEBGL:
				console.error(funcId + ": context lost!");
				break;
			default:
				console.error(funcId + ": unknown error!");
				break;
		}
		
		return true;
	}
	
	return false;
}
