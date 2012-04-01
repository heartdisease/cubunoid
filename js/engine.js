/// TODO
// * improve phong-blinn lighting

// OpenGL Framebuffers: http://www.swiftless.com/tutorials/opengl/framebuffer.html (!!)

/*const*/ var DEG45_RAD  = Math.PI / 4;
/*const*/ var DEG135_RAD = DEG45_RAD * 3;
/*const*/ var DEG225_RAD = DEG45_RAD * 5;
/*const*/ var DEG315_RAD = DEG45_RAD * 7;
/*const*/ var MAX_RAD    = Math.PI * 2;

/*const*/ var DEFAULT_ROT_X = -MAX_RAD/6.0;
/*const*/ var DEFAULT_ROT_Z = 0.0;

var Cubunoid = function(id){
	var canvas    = document.getElementById(id);
	var input     = null;
	var gl        = null;
	var active    = false; // true = render loop is currently running
	var picking   = false; // true = need to check which object has been clicked at by user
	var shaders   = new Array();
	var program   = null;
	var pMatrix   = mat4.create(); // projection matrix
	var nMatrix   = mat4.create(); // normal matrix
	var mvMatrix  = mat4.create(); // model-view matrix
	var mvpMatrix = mat4.create(); // model-view-projection matrix
	var level     = new Number(0);
	var levels    = [map1, map2, map3, map4, map5, map6];
	var shaderVariables = null; // always stores the variable locations of the current program
	var animations = {
		platformRotation: null
	};
	var programs = {
		standard: null,
		skybox:   null
	};
	var pickingBuffer = null;
	var meshes = { // geometry for game objects
		skybox:   null,
		platform: null,
		boxes:    null,
		trigger:  null,
		concrete: null
	};
	var objects = { // actual game objects
		skybox:   null,
		platform: null,
		boxes:    new Array(),
		trigger:  new Array(),
		concrete: new Array()
	};
	var rotX = DEFAULT_ROT_X;
	var rotZ = DEFAULT_ROT_Z;
	var zDistance = 0.0;
	
	function adjustCanvasSize() {
		canvas.width  = window.innerWidth;
		canvas.height = window.innerHeight;
	}
	
	this.initGL = function(){
		adjustCanvasSize();
		
		gl = WebGLUtils.setupWebGL(canvas, {preserveDrawingBuffer: true}); // option needed for gl.readPixels
		if (!gl) {
			window.alert("Fatal error: cannot initialize WebGL context!");
			return;
		}
		
		gl.clearColor(1.0, 1.0, 1.0, 1.0);
    	gl.enable(gl.DEPTH_TEST);
    	//gl.enable(gl.TEXTURE_CUBE_MAP_SEAMLESS);
    	
		//gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		//gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    	
		input = new InputManager(this.eventHandler, this.mouseHandler, this.pickHandler);
		pickingBuffer = new FrameBuffer(gl, canvas.width, canvas.height);
		pickingBuffer.pickX = pickingBuffer.pickY = 0;
		
		window.addEventListener("resize", this.resizeGL, false);
	};
	
	this.initShaders = function(){
		var vertexShader   = new Shader(gl, "shader-vs", gl.VERTEX_SHADER);
		var fragmentShader = new Shader(gl, "shader-fs", gl.FRAGMENT_SHADER);
		
		vertexShader.compile();
		fragmentShader.compile();
		
		programs.standard  = new Program(gl, vertexShader, fragmentShader);
		programs.standard.link();
		programs.standard.locations = {
			aVertex:      programs.standard.getAttribLocation("aVertex"),
			aNormal:      programs.standard.getAttribLocation("aNormal"),
			aTexCoord:    programs.standard.getAttribLocation("aTexCoord"),
			uTextureMode: programs.standard.getUniformLocation("uTextureMode"),
			uUsePicking:  programs.standard.getUniformLocation("uUsePicking"),
			uHighlight:   programs.standard.getUniformLocation("uHighlight"),
			uSampler:     programs.standard.getUniformLocation("uSampler"),
			uSamplerCube: programs.standard.getUniformLocation("uSamplerCube"),
			uBoxId:       programs.standard.getUniformLocation("uBoxId"),
			uNMatrix:     programs.standard.getUniformLocation("uNMatrix"),
			uMvMatrix:    programs.standard.getUniformLocation("uMvMatrix"),
			uMvpMatrix:   programs.standard.getUniformLocation("uMvpMatrix")
		};
		shaderVariables = programs.standard.locations;
		
		programs.standard.use();		
		gl.enableVertexAttribArray(shaderVariables.aVertex);
		gl.enableVertexAttribArray(shaderVariables.aNormal);
	};
	
	this.initOverlays = function() {
		var levelDialog = document.querySelector("#levelDialog");
		var errorSignal = document.querySelector("#error_signal");
		var transEndFunc = function(e){
			if (e.target.className == "fadeOut") {
				e.target.zIndex = 1;
				console.log("faded out.");
			}
		};
		
		levelDialog.addEventListener("transitionend", transEndFunc, false);
		levelDialog.addEventListener("webkitTransitionEnd", transEndFunc, false);
		
		errorSignal.addEventListener("transitionend", transEndFunc, false);
		errorSignal.addEventListener("webkitTransitionEnd", transEndFunc, false);
	};
	
	this.resizeGL = function(){
		adjustCanvasSize();
		
		console.log("Set viewport to " + canvas.width + "x" + canvas.height);
		gl.viewport(0, 0, canvas.width, canvas.height);
		pickingBuffer.resize(canvas.width, canvas.height);
		
		mat4.perspective(90, canvas.width/canvas.height, 0.1, 100.0, pMatrix);
	};
	
	var uploadMatrices = function(modelView, calcNM){
		// calculate model-view-projection matrix
		mat4.multiply(pMatrix, modelView, mvpMatrix);
		gl.uniformMatrix4fv(shaderVariables.uMvMatrix, false, modelView);
		gl.uniformMatrix4fv(shaderVariables.uMvpMatrix, false, mvpMatrix);
		// calculate normal matrix
		if (calcNM) {
			mat4.inverse(modelView, nMatrix);
			mat4.transpose(nMatrix, nMatrix);
			gl.uniformMatrix4fv(shaderVariables.uNMatrix, false, nMatrix); // WebGL cannot use transposition!
		}
	};
	
	var drawObject = function(obj){
		// send object ID to shader in picking mode
		if (picking)
			gl.uniform4fv(shaderVariables.uBoxId, obj.colorID);
		// highlight object if it is selected
		gl.uniform1i(shaderVariables.uHighlight, obj.selected ? 1 : 0);
		
		obj.mesh.draw(
			shaderVariables.aVertex,
			shaderVariables.aNormal,
			shaderVariables.aTexCoord,
			(obj.name == "skybox") ? shaderVariables.uSamplerCube : shaderVariables.uSampler,
			shaderVariables.uTextureMode
		);
	};
	
	var drawPlatform = function(){
		uploadMatrices(mvMatrix, true);
		drawObject(objects.platform);
	};
	
	var drawSkybox = function(){
		uploadMatrices(mvMatrix, false);
		drawObject(objects.skybox);
	};
	
	/** Renders an array with game objects (like boxes, trigger, ...) */
	var drawObjects = function(array){
		var modelView1 = mat4.create();
		var modelView2 = mat4.create();
		var halfBoxSize;
		var xOffset, yOffset;
		
		if (array.length > 0) {
			halfBoxSize = array[0].mesh.width / 2;
			
			mat4.set(mvMatrix, modelView1);	// copy global model-view matrix
			mat4.translate(modelView1, [0.0, 0.0, array[0].mesh.depth/2]);
			for (var i in array) {
				// calculate position
				xOffset = (objects.platform.mesh.width / 2)  - array[i].x - halfBoxSize;
				yOffset = (objects.platform.mesh.height / 2) - array[i].y - halfBoxSize;
			
				mat4.set(modelView1, modelView2);	// copy local model-view matrix
				mat4.translate(modelView2, [-xOffset, 0.0, 0.0]);
				mat4.translate(modelView2, [0.0, yOffset, 0.0]);
			
				uploadMatrices(modelView2, false);
				drawObject(array[i]);
			}
		}
	};
	
	var paintGL = function(){
		if (active) {
			window.requestAnimFrame(paintGL);
		} else {
			return;
		}
		
		// calculate transformation matrices
		mat4.identity(mvMatrix);
		mat4.translate(mvMatrix, [0.0, 0.0, -zDistance]);
		mat4.rotate(mvMatrix, rotX, [1.0, 0.0, 0.0]);
		mat4.rotate(mvMatrix, rotZ, [0.0, 0.0, 1.0]);
		
		// activate or deactivate picking
		gl.uniform1i(shaderVariables.uUsePicking, picking ? 1 : 0);
		if (picking) {
			var pickID; // Uint8Array(4)
			
			// bind frame buffer
			pickingBuffer.bind();
			// clear framebuffer
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			// draw data
			drawPlatform();
			drawObjects(objects.boxes);
			// evaluate picking result
			pickID = pickingBuffer.readPixel(pickingBuffer.pickX, pickingBuffer.pickY);
			console.log("Picked @ x:" + pickingBuffer.pickX + "/y:" + pickingBuffer.pickY + " ID: [" + pickID[0] + ", " + pickID[1] + ", " + pickID[2] + ", " + pickID[3] + "]");
			changeBoxSelection(Math.ceil(pickID[2]/255*10) - 1);
			// unbind framebuffer und disable picking
			pickingBuffer.unbind();
			picking = false;
			//active = false;
		} else {
			// clear framebuffer
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			// draw data
			drawPlatform();
			drawObjects(objects.boxes);
			drawObjects(objects.concrete);
			drawObjects(objects.trigger);
			// recalculate matrix
			mat4.identity(mvMatrix);
			mat4.rotate(mvMatrix, -rotZ, [0.0, 1.0, 0.0]);
			//mat4.rotate(mvMatrix, -rotX, [1.0, 0.0, 0.0]);
			drawSkybox(); // draw skybox at last (performance reasons)
		}
	};
	
	var getPositionCode = function(){
		if (rotZ >= DEG315_RAD || rotZ <= DEG45_RAD)
			return 0;
		else if (rotZ <= DEG135_RAD)
			return 1;
		else if (rotZ <= DEG225_RAD)
			return 2;
		else // rotZ <= DEG315_RAD
			return 3;
	};
	
	function rotate(rz, rx) {
		if (rotZ >= MAX_RAD) {
			rotZ -= MAX_RAD - rz;
			//console.log("Hop back to: " + rotZ);
		} else if (rotZ <= 0.0) {
			rotZ += MAX_RAD - rz;
			//console.log("Hop back to: " + rotZ);
		} else {
			rotZ += rz;
		}
		
		if (rotX >= MAX_RAD)
			rotX -= MAX_RAD - rx;
		else if (rotZ <= 0.0)
			rotX += MAX_RAD - rx;
		else
			rotX += rx;
		
		//console.log("Rotation: " + rotZ + "rad (" + (rotZ/MAX_RAD*360) + " deg)");
	}
	
	function rotatePlatform() {
		var localRotate = rotate;
		
		rotX = DEFAULT_ROT_X;
		animations.platformRotation = window.setInterval(function(){ localRotate(0.01, 0.0); }, 30);
	}
	
	function changeBoxSelection(n) {
		for (var i = 0; i < objects.boxes.length; ++i)
			objects.boxes[i].selected = (i == n);	
	}
	
	function nextLevel() {
		var levelDialog = document.querySelector("#levelDialog");
		
		levelDialog.className = "fadeOut";
		if (animations.platformRotation)
			window.clearInterval(animations.platformRotation);
		rotX = DEFAULT_ROT_X;
		rotZ = DEFAULT_ROT_Z;
		loadMap(++level);
		input.setLocked(false);
		
		console.log("goto next level");
	}
	
	function showErrorSignal() {
		var errorSignal = document.querySelector("#error_signal");
		
		errorSignal.style.zIndex = 3;			// make container visible
		errorSignal.className    = "fadeIn";	// start CSS transition

		window.setTimeout(function(){ errorSignal.className = "fadeOut"; }, 700);
	}
	
	function showLevelDialog() {
		var levelDialog = document.querySelector("#levelDialog");
		var textBox     = levelDialog.getElementsByTagName("p")[0];
		var button      = levelDialog.getElementsByTagName("button")[0];
		
		if (level+1 >= levels.length) {
			textBox.innerHTML       = "Congratulations!<br />You've mastered all quests!";
			button.style.visibility = "hidden";
		} else {
			textBox.innerHTML = "Congratulations!<br />You've mastered level " + (level+1) + "!";
			button.innerHTML  = "Go to level " + (level+2);
			button.onclick    = nextLevel;
		}
		
		levelDialog.style.zIndex = 3; // make container visible
		levelDialog.className    = "fadeIn";
	}
	
	function shiftBox(dir) {
		var pos;
		var box;
		var animation;
		var speed = 0.2;
		
		for (var i = 0; i < objects.boxes.length; ++i) {
			if (objects.boxes[i].selected) {
				pos = window.shiftBox(objects.boxes[i], dir);
				if (pos == null) {
					showErrorSignal();
				} else {
					input.setLocked(true);
					
					animation = new Animation(objects.boxes[i], pos, dir, 1.0);
					animation.addEventListener("exit", function(){
						// check if player has completed level
						if (isGameOver()) {
							rotatePlatform();
							showLevelDialog();
						} else {
							input.setLocked(false);
						}
					});
					animation.start();
					break;
				}
			}
		}
	}
	
	this.eventHandler = function(action){
		var dir;
		
		switch (action) {
			case InputType.SPIN:
				rotate();
				break;
			case InputType.BOX1:
			case InputType.BOX2:
			case InputType.BOX3:
			case InputType.BOX4:
			case InputType.BOX5:
				changeBoxSelection(action-1);
				break;
			case InputType.K_LEFT:				
				switch (getPositionCode()) {
					case 0: dir = Direction.LEFT; break;
					case 1: dir = Direction.UP; break;
					case 2: dir = Direction.RIGHT; break;
					case 3: dir = Direction.DOWN; break;
				};
				
				shiftBox(dir);
				break;
			case InputType.K_RIGHT:
				switch (getPositionCode()) {
					case 0: dir = Direction.RIGHT; break;
					case 1: dir = Direction.DOWN; break;
					case 2: dir = Direction.LEFT; break;
					case 3: dir = Direction.UP; break;
				};
				
				shiftBox(dir);
				break;
			case InputType.K_UP:
				switch (getPositionCode()) {
					case 0: dir = Direction.UP; break;
					case 1: dir = Direction.RIGHT; break;
					case 2: dir = Direction.DOWN; break;
					case 3: dir = Direction.LEFT; break;
				};
				
				shiftBox(dir);
				break;
			case InputType.K_DOWN:
				switch (getPositionCode()) {
					case 0: dir = Direction.DOWN; break;
					case 1: dir = Direction.LEFT; break;
					case 2: dir = Direction.UP; break;
					case 3: dir = Direction.RIGHT; break;
				};
				
				shiftBox(dir);
				break;
		}
	};
	
	this.pickHandler = function(xPos, yPos){
		pickingBuffer.pickX = xPos;
		pickingBuffer.pickY = yPos;
		picking             = true;
	};
	
	this.mouseHandler = function(xOffset, yOffset){
		rotate((-xOffset/400), (-yOffset/400));
	};
	
	function loadGeometry(map) {
		// generate skybox
		if (!meshes.skybox) {
			meshes.skybox = new Skybox(gl);
			// had to swap neg.Y with pos.Y
			meshes.skybox.loadTextureCube(
				"textures/terrain_positive_x.png",
				"textures/terrain_negative_x.png",
				"textures/terrain_negative_y.png",
				"textures/terrain_positive_y.png",
				"textures/terrain_positive_z.png",
				"textures/terrain_negative_z.png"
			);
			objects.skybox = new GameObject("skybox", meshes.skybox, 0.0, 0.0, -1);
		}		
		// generate other geometry
		if (!meshes.box) {
			meshes.box = new Box(gl);
			meshes.box.setTexture("textures/2_store.jpg");
		}
		if (!meshes.concrete) {
			meshes.concrete = new Concrete(gl);
			meshes.concrete.setTexture("textures/ice2.jpg");
		}
		if (!meshes.trigger) {
			meshes.trigger = new Trigger(gl);
			meshes.trigger.setTexture("textures/24_met.jpg");
		}
		if (meshes.platform)
			meshes.platform.dispose();
		
		meshes.platform            = new Platform(gl, map.width, map.height);
		meshes.platform.texture    = meshes.concrete.texture;
		meshes.platform.hasTexture = true;
	}
	
	function loadMap(level){
		var i;
		var map = levels[level];
		
		active = false; // disable rendering
		console.log("Create platform " + map.width + "x" + map.height);
		
		loadGeometry(map);
		
		// generate platform
		objects.platform = new GameObject("platform", meshes.platform, 0.0, 0.0, -1);
		// generate boxes
		objects.boxes.splice(0, objects.boxes.length);
		for (i = 0; i < map.boxes.length; ++i)
			objects.boxes.push(new GameObject("box" + i, meshes.box, map.boxes[i].x, map.boxes[i].y, i));
		// generate misc obstacles
		objects.concrete.splice(0, objects.concrete.length);
		for (i = 0; i < map.concrete.length; ++i)
			objects.concrete.push(new GameObject("concrete" + i, meshes.concrete, map.concrete[i].x, map.concrete[i].y, -1));
		// generate trigger
		objects.trigger.splice(0, objects.trigger.length);
		for (i = 0; i < map.switches.length; ++i)
			objects.trigger.push(new GameObject("trigger" + i, meshes.trigger, map.switches[i].x, map.switches[i].y, -1));
			
		// see logic.js (LEGACY!)
		window.level = {
			width:    map.width,
			height:   map.height,
			boxes:    objects.boxes,
			concrete: objects.concrete,
			switches: objects.trigger
		};
		zDistance = Math.max(map.width, map.height) + 0.5;
		
		active = true; // enable rendering
		paintGL();     // start render loop
	}
	
	this.loadMap = loadMap;
};
