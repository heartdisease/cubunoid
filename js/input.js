var InputType = {
	SPIN:    0,
	BOX1:    1,
	BOX2:    2,
	BOX3:    3,
	K_LEFT:  4,
	K_RIGHT: 5,
	K_UP:    6,
	K_DOWN:  7
};

var InputManager = function(func){
	var eventHandler = func;
	
	var keyListener = function(e){
		switch (e.keyCode) {
			case 32: // space
				eventHandler(InputType.SPIN);
				break;
			case 97: case 49: // key 1
				eventHandler(InputType.BOX1);
				break;
			case 98: case 50: // key 2
				eventHandler(InputType.BOX2);
				break;
			case 99: case 51: // key 3
				eventHandler(InputType.BOX3);
				break;
			case 37: // key left
				eventHandler(InputType.K_LEFT);
				break;
			case 39: // key right
				eventHandler(InputType.K_RIGHT);
				break;
			case 38: // key up
				eventHandler(InputType.K_UP);
				break;
			case 40: // key down
				eventHandler(InputType.K_DOWN);
				break;
		}
	};
	
	window.addEventListener("keydown", keyListener, false);
};
