// AMBIENT OCCLUSION! http://www.ozone3d.net/tutorials/ambient_occlusion.php#part_1

var DEBUG = false;
			
window.onload = function() {
	var game = new Cubunoid("glcanvas");
	game.initGL();
	game.initOverlays();
	game.resizeGL();
	game.initShaders();
	game.loadMap(0);
};
