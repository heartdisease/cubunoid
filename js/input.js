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

var InputType = {
	SPIN:    0,
	BOX1:    1,
	BOX2:    2,
	BOX3:    3,
	BOX4:    4,
	BOX5:    5,
	K_LEFT:  6,
	K_RIGHT: 7,
	K_UP:    8,
	K_DOWN:  9
};

var InputManager = function(kh, dh, ch){
	var keyHandler = kh;
	var dragHandler = dh;
	var clickHandler = ch;
	var drag = false;
	var lock = false;
	var startPos = {x: -1, y: -1};
	var lastPos  = {x: -1, y: -1};
	
	this.setLocked = function(b){
		lock = b;
		if (DEBUG) {
			if (b)
				console.log("lock input");
			else
				console.log("unlock input");
		}
	};
	
	function keyListener(e) {
		//console.log(e.keyCode);
		
		if (lock) {
			if (DEBUG)
				console.log("input is locked!");
			return;
		}
		switch (e.keyCode) {
			case 32: // space
				keyHandler(InputType.SPIN);
				break;
			case 97: case 49: // key 1
				keyHandler(InputType.BOX1);
				break;
			case 98: case 50: // key 2
				keyHandler(InputType.BOX2);
				break;
			case 99: case 51: // key 3
				keyHandler(InputType.BOX3);
				break;
			case 100: case 52: // key 4
				keyHandler(InputType.BOX4);
				break;
			case 101: case 53: // key 5
				keyHandler(InputType.BOX5);
				break;
			case 37: // key left
				keyHandler(InputType.K_LEFT);
				break;
			case 39: // key right
				keyHandler(InputType.K_RIGHT);
				break;
			case 38: // key up
				keyHandler(InputType.K_UP);
				break;
			case 40: // key down
				keyHandler(InputType.K_DOWN);
				break;
		}
	}
	
	var mouseDownListener = function(e){
		if (lock)
			return;
		startPos.x = lastPos.x = e.pageX;
		startPos.y = lastPos.y = e.pageY;
		drag = true;
	};
	
	var mouseMoveListener = function(e){
		if (!lock && drag) {
			dragHandler(lastPos.x - e.pageX, lastPos.y - e.pageY);
			
			lastPos.x = e.pageX;
			lastPos.y = e.pageY;
		}
	};
	
	var mouseUpListener = function(e){
		if (lock)
			return;
		if (startPos.x == e.pageX && startPos.y == e.pageY)
			clickHandler(e.pageX, e.pageY);
		
		drag = false;
	};
	
	window.addEventListener("keydown", keyListener, false);
	window.addEventListener("mousedown", mouseDownListener, false);
	window.addEventListener("mousemove", mouseMoveListener, false);
	window.addEventListener("mouseup", mouseUpListener, false);
	
};
