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
 * Move animation for a box.
 *
 * @param obj the game object of the box
 * @param targetPos a structure containing the
          position the box should move onto (containing x and y)
 * @param speed 1.0 means normal speed (=40ms per field)
*/
function Animation(obj, targetPos, dir, speed) {
	/*const*/ var MS_PER_FIELD = 60;
	
	var animation;
	var startPos;
	var totalTime;   // total of milliseconds the animation lasts
	var totalLength; // number of fields to pass (can be negative)
	var startTime;
	var onexit; // event handler executed when animation has finished
	
	// equations see also http://msdn.microsoft.com/en-us/library/system.windows.media.animation.sineease.aspx
	function sineEaseIn(t) {
		return -Math.cos(t * Math.PI * 0.5) + 1.0;
	}
	
	var animate = function(){
		var elapsedTime = new Date().getTime() - startTime;
		var easing      = sineEaseIn(elapsedTime/totalTime);
		
		//console.log("pos: " + (Math.floor(obj.x*1000)/1000) + "/" + obj.y + " (" + elapsedTime + "ms)");
		switch (dir) {
			case Direction.UP:
				if (obj.y <= targetPos.y) // animation ends
					break;
			case Direction.DOWN:
				if (dir == Direction.DOWN && obj.y >= targetPos.y) // animation ends
					break;
				obj.y = (easing >= 1.0) ? targetPos.y : (startPos.y + totalLength * easing);
				return; // quit function after moving block
			case Direction.LEFT:
				if (obj.x <= targetPos.x) // animation ends
					break;
			case Direction.RIGHT:
				if (dir == Direction.RIGHT && obj.x >= targetPos.x) // animation ends
					break;
				obj.x = (easing >= 1.0) ? targetPos.x : (startPos.x + totalLength * easing);
				return; // quit function after moving block
			default:
				console.log("ERROR: no valid direction!");
		}

		// exit code
		window.clearInterval(animation);
		if (onexit)
			onexit();
	};
	
	this.addEventListener = function(type, func){
		if (type == "exit")
			onexit = func;
	};
	
	function start() {
		switch (dir) {
			case Direction.UP:
			case Direction.DOWN:
				totalLength = targetPos.y - obj.y;
				break;
			case Direction.LEFT:
			case Direction.RIGHT:
				totalLength = targetPos.x - obj.x;
				break;
			default:
				console.log("ERROR: no valid direction!");
				return;
		}
		
		totalTime = Math.abs(totalLength) * Math.floor(speed * MS_PER_FIELD);
		startTime = new Date().getTime();
		startPos  = {x: obj.x, y: obj.y};
		animation = window.setInterval(animate, 10);
	}
	
	this.start = start;
}
