// AMBIENT OCCLUSION! http://www.ozone3d.net/tutorials/ambient_occlusion.php#part_1
			
window.onload = function() {
	var game = new Cubunoid("glcanvas");
	game.initGL();
	game.resizeGL();
	game.attachShader("shader-vs");
	game.attachShader("shader-fs", "shader-fs-phong");
	game.useProgram();
	game.loadMap(0);
};