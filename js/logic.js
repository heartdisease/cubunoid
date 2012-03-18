"use strict";

var TILE_SIZE = 100;
var Direction = {NONE: -1, UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3};

var Field = function(x, y) {
	this.x = x;
	this.y = y;
	this.node = null;
};

var map1 = {
	width :    3,
	height :   5,
	switches : [new Field(1, 2)],
	boxes :    [new Field(2, 0), new Field(0, 4), new Field(2, 4)],
	concrete : []
};

var map2 = {
	width :    4,
	height :   4,
	switches : [new Field(1, 1), new Field(2, 2)],
	boxes :    [new Field(3, 0), new Field(0, 3), new Field(3, 3)],
	concrete : [new Field(0, 0)]
};

var map3 = {
	width :    5,
	height :   5,
	switches : [new Field(2, 2)],
	boxes :    [new Field(4, 0), new Field(0, 4), new Field(4, 4)],
	concrete : []
};

var map4 = {
	width :    5,
	height :   6,
	switches : [new Field(2, 0), new Field(2, 3)],
	boxes :    [new Field(0, 1), new Field(0, 5), new Field(4, 5)],
	concrete : [new Field(0, 0), new Field(1, 0), new Field(3, 0), new Field(4, 0), new Field(4, 1)]
};

var map5 = {
	width :    6,
	height :   6,
	switches : [new Field(1, 3), new Field(3, 2)],
	boxes :    [new Field(5, 0), new Field(0, 5), new Field(5, 5)],
	concrete : [new Field(3, 4), new Field(1, 2)]
};

var c;
var level = null;

/**
 * Returns false if the move is invalid.
*/
function validate(box, dir)
{
	var tmp;
	for (var i in level.boxes)
	{
		tmp = level.boxes[i];
		if (tmp.node != box)
		{
			switch (dir) {
				case Direction.NONE:
					return false;
				case Direction.UP:
					if (box.x == tmp.x && (box.y + 1) == tmp.y)
						return false;
					break;
				case Direction.DOWN:
					if (box.x == tmp.x && (box.y - 1) == tmp.y)
						return false;
					break;
				case Direction.LEFT:
					if (box.y == tmp.y && (box.x + 1) == tmp.x)
						return false;
					break;
				case Direction.RIGHT:
					if (box.y == tmp.y && (box.x - 1) == tmp.x)
						return false;
					break;
			}
		}
	}
	
	return true;
}

function getClosest(box, obstacles, limit, dir) {
	var tmp, obj = null;
	
	switch (dir) {
		case Direction.UP:    // negative offset
			for (var i in obstacles) {
				tmp = obstacles[i];
				if (
					tmp.x == box.x &&					// obstacles share same column
					tmp.y >= limit && tmp.y < box.y &&	// obstacle is between limit and box
					(obj == null || tmp.y > obj.y)		// obstacle is nearer than last detected one
				)
					obj = tmp;
			}
			break;
		case Direction.DOWN:  // positive offset
			for (var i in obstacles) {
				tmp = obstacles[i];
				if (
					tmp.x == box.x &&					// obstacles share same column
					tmp.y <= limit && tmp.y > box.y &&	// obstacle is between limit and box
					(obj == null || tmp.y < obj.y)		// obstacle is nearer than last detected one
				)
					obj = tmp;
			}
			break;
		case Direction.LEFT:  // negative offset
			for (var i in obstacles) {
				tmp = obstacles[i];
				if (
					tmp.y == box.y &&					// obstacles share same row
					tmp.x >= limit && tmp.x < box.x &&	// obstacle is between limit and box
					(obj == null || tmp.x > obj.x)		// obstacle is nearer than last detected one
				)
					obj = tmp;
			}
			break;
		case Direction.RIGHT: // positive offset
			for (var i in obstacles) {
				tmp = obstacles[i];
				if (
					tmp.y == box.y &&					// obstacles share same row
					tmp.x <= limit && tmp.x > box.x &&	// obstacle is between (including) limit and box
					(obj == null || tmp.x < obj.x)		// obstacle is nearer than last detected one
				)
					obj = tmp;
			}
			break;
	}
	
	return obj;
}

function shiftBox(box, dir) {
	var field, target = 0;
	
	if (validate(box, dir)) {
		switch (dir) {
			case Direction.UP:
				target = -1;  // imaginary box outside the arena (wall)
			case Direction.DOWN:
				if (target == 0)
					target = level.height; // imaginary box outside the arena (wall)
				
				field = getClosest(box, level.boxes, target, dir);
				if (field != null) {
					target = field.y;
					console.log("we're hitting box at " + field.x + ":" + field.y);
				} else { console.log("we're hitting the wall! (box check)"); }
				field = getClosest(box, level.concrete, target, dir);
				if (field != null) {
					target = field.y;
					console.log("we're hitting concrete field at " + field.x + ":" + field.y);
				} else { console.log("we're hitting the wall! (concrete check)"); }
				break;
			case Direction.LEFT:
				target = -1; // imaginary box outside the arena (wall)
			case Direction.RIGHT:
				if (target == 0)
					target = level.width; // imaginary box outside the arena (wall)
				
				field = getClosest(box, level.boxes, target, dir);
				if (field != null) {
					target = field.x;
					console.log("we're hitting box at " + field.x + ":" + field.y);
				} else { console.log("we're hitting the wall! (box check)"); }
				field = getClosest(box, level.concrete, target, dir);
				if (field != null) {
					target = field.x;
					console.log("we're hitting concrete field at " + field.x + ":" + field.y);
				} else { console.log("we're hitting the wall! (concrete check)"); }
				break;
		}
		
		switch (dir) {
			case Direction.UP:
				box.y               = target + 1;
				//box.node.style.top  = (TILE_SIZE * box.y) + "px";
				console.log("move box on Y axis to " + box.y + ".");
				break;
			case Direction.DOWN:
				box.y               = target - 1;
				//box.node.style.top  = (TILE_SIZE * box.y) + "px";
				console.log("move box on Y axis to " + box.y + ".");
				break;
			case Direction.LEFT:
				box.x               = target + 1;
				//box.node.style.left = (TILE_SIZE * box.x) + "px";
				console.log("move box on X axis to " + box.x + ".");
				break;
			case Direction.RIGHT:
				box.x               = target - 1;
				//box.node.style.left = (TILE_SIZE * box.x) + "px";
				console.log("move box on X axis to " + box.x + ".");
				break;
		}
	}
	else
		window.alert("Invalid move!");
}

/**
 * Computes in which area of the box the cursor currently is.
*/
function getDirection(posX, posY) {
	var margin = TILE_SIZE * 0.1;
	var x = posX % TILE_SIZE;
	var y = posY % TILE_SIZE;
	
	if ((x >= margin) && (x <= (TILE_SIZE-margin))) {
		if ((y >= 0) && (y <= margin)) // top
			return Direction.DOWN;
		else if (y >= (TILE_SIZE-margin) && y <= TILE_SIZE) // bottom
			return Direction.UP;
	} else if (y >= margin && y <= (TILE_SIZE-margin)) {
		if (x >= 0 && x <= margin) // left
			return Direction.RIGHT;
		if (x >= (TILE_SIZE-margin) && x <= TILE_SIZE) // right
			return Direction.LEFT;
	}
	return Direction.NONE;
}

function getBoxIndex(boxObj) {
	for (var i in level.boxes) {
		if (level.boxes[i].node == boxObj)
			return i;
	}
	
	return -1;
}

function createField(x, y) {
	var b = document.createElement("div");
	
	b.style.position = "absolute";
	b.style.top      = (y * TILE_SIZE) + "px";
	b.style.left     = (x * TILE_SIZE) + "px";
	b.style.width    = TILE_SIZE + "px";
	b.style.height   = TILE_SIZE + "px";
	
	c.appendChild(b);
	return b;
}

function createSwitch(x, y) {
	var b = createField(x, y);
	b.className = "switch";
	
	return b;
}

function createObstacle(x, y) {
	var b = createField(x, y);
	b.className = "obstacle";
	
	return b;
}

function createBox(x, y) {
	var b = createField(x, y);
	b.className   = "box";
	b.onmousemove = function(e) { // change mouse cursor dependent on the side of the box
		e          = e || window.event;
		var target = e.target || e.srcElement;
		switch (getDirection(e.pageX, e.pageY)) {
			case Direction.UP:    target.style.cursor = "n-resize"; break;
			case Direction.DOWN:  target.style.cursor = "s-resize"; break;
			case Direction.LEFT:  target.style.cursor = "w-resize"; break;
			case Direction.RIGHT: target.style.cursor = "e-resize"; break;
			case Direction.NONE:  target.style.cursor = "default"; break;
		}
	};
	b.onclick = function(e) {
		e          = e || window.event;
		var target = e.target || e.srcElement;
		var dir    = getDirection(e.pageX, e.pageY);
		switch (dir) {
			case Direction.UP:
			case Direction.DOWN:
			case Direction.LEFT:
			case Direction.RIGHT:
				var i = getBoxIndex(target);
				
				if (i == -1)
					window.alert("[ERROR] Internal error: cannot find box index!");
				else
					shiftBox(level.boxes[i], dir);
				break;
			default: window.alert("no action"); break;
		}
	};
	
	c.appendChild(b);
	return b;
}

function resetMap(map) {
	var i;
	
	if (map == null)
		return;
	for (i in map.switches)
		c.removeChild(map.switches[i].node)
	// generate boxes
	for (i in map.boxes)
		c.removeChild(map.boxes[i].node)
	// generate misc obstacles
	for (i in map.concrete)
		c.removeChild(map.concrete[i].node)
}

function initMap(map) {
	var i;
	
	resetMap(level);
	level = map;
	// set dimensions of main div container
	c.style.width  = (level.width  * TILE_SIZE) + "px";
	c.style.height = (level.height * TILE_SIZE) + "px";
	// generate switches
	for (i in map.switches)
		map.switches[i].node = createSwitch(map.switches[i].x, map.switches[i].y);
	// generate boxes
	for (i in map.boxes)
		map.boxes[i].node = createBox(map.boxes[i].x, map.boxes[i].y);
	// generate misc obstacles
	for (i in map.concrete)
		map.concrete[i].node = createObstacle(map.concrete[i].x, map.concrete[i].y);
}
