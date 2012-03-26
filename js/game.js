// AMBIENT OCCLUSION! http://www.ozone3d.net/tutorials/ambient_occlusion.php#part_1

var DEBUG = false;
			
window.onload = function() {
	/*var box  = {x: 0, y: 0};
	var target = {x: 4, y: 0};
	var anim = new Animation(box, target, Direction.RIGHT, 1.0);
	anim.onexit = function(){ console.log("animation has ended."); };
	anim.start();
	return;*/
	
	var game = new Cubunoid("glcanvas");
	game.initGL();
	game.resizeGL();
	game.attachShader("shader-vs");
	game.attachShader("shader-fs", "shader-fs-phong");
	game.useProgram();
	game.loadMap(0);
};
