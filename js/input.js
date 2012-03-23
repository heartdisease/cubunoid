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
	var lastPos = {x: -1, y: -1};
	
	var keyListener = function(e){
		console.log(e.keyCode);
		
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
	};
	
	var mouseDownListener = function(e){
		clickHandler(e.pageX, e.pageY);
		
		lastPos.x = e.pageX;
		lastPos.y = e.pageY;
		drag = true;
	};
	
	var mouseMoveListener = function(e){
		if (drag) {
			dragHandler(lastPos.x - e.pageX, lastPos.y - e.pageY);
			
			lastPos.x = e.pageX;
			lastPos.y = e.pageY;
		}
	};
	
	var mouseUpListener = function(e){
		drag = false;
	};
	
	window.addEventListener("keydown", keyListener, false);
	window.addEventListener("mousedown", mouseDownListener, false);
	window.addEventListener("mousemove", mouseMoveListener, false);
	window.addEventListener("mouseup", mouseUpListener, false);
	
};
