/// TODO
// * improve phong-blinn lighting

// OpenGL Framebuffers: http://www.swiftless.com/tutorials/opengl/framebuffer.html (!!)

var DEG45_RAD  = Math.PI / 4;
var DEG135_RAD = DEG45_RAD * 3;
var DEG225_RAD = DEG45_RAD * 5;
var DEG315_RAD = DEG45_RAD * 7;
var MAX_RAD    = Math.PI * 2;

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
	var level     = 0;
	var levels    = [map1, map2, map3, map4, map5, map6];
	var shaderVariables = {
		aVertex:        -1,
		aNormal:        -1,
		aTexCoord:      -1,
		uTextureMode: null,
		uUsePicking:  null,
		uHighlight:   null,
		uSampler:     null,
		uSamplerCube: null,
		uBoxId:       null,
		uNMatrix:     null,
		uMvMatrix:    null,
		uMvpMatrix:   null
	};
	var pickingBuffer = {
		frameBuffer:  null,
		renderBuffer: null,
		texture:      null,
		pickX:           0,
		pickY:           0
	};
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
	var rotX = -MAX_RAD/9.0;
	var rotZ = 0.0;
	var zDistance = 0.0;
	
	this.initGL = function(){
		gl = WebGLUtils.setupWebGL(canvas, {preserveDrawingBuffer: true}); // option needed for gl.readPixels
		if (!gl) {
			window.alert("Fatal error: cannot initialize WebGL context!");
			return;
		}
		
		gl.clearColor(1.0, 1.0, 1.0, 1.0);
    	gl.enable(gl.DEPTH_TEST);
    	
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    	
		window.addEventListener("resize", this.resizeGL, false);
		input = new InputManager(this.eventHandler, this.mouseHandler, this.pickHandler);
	};
	
	function initPickingBuffer() {
		// create frame buffer
		pickingBuffer.frameBuffer  = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, pickingBuffer.frameBuffer);
		gl.viewport(0, 0, canvas.width, canvas.height); // set viewport for framebuffer
		
		// create render buffer
		pickingBuffer.renderBuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, pickingBuffer.renderBuffer);		
		
		// create texture to render to
		pickingBuffer.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, pickingBuffer.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		
		// configure render buffer and apply it to frame buffer
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickingBuffer.texture, 0);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, pickingBuffer.renderBuffer);
		
		// unbind buffers and texture
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}
	
	function deletePickingBuffer() {
		if (pickingBuffer.texture)
			gl.deleteTexture(pickingBuffer.texture);
		if (pickingBuffer.renderBuffer)
			gl.deleteRenderbuffer(pickingBuffer.renderBuffer);
		if (pickingBuffer.frameBuffer)
			gl.deleteFramebuffer(pickingBuffer.frameBuffer);
	}
	
	this.resizeGL = function(){
		canvas.width  = window.innerWidth;
		canvas.height = window.innerHeight;
		
		console.log("Set viewport to " + canvas.width + "x" + canvas.height);
		gl.viewport(0, 0, canvas.width, canvas.height);
		// create new  frame buffer
		deletePickingBuffer();
		initPickingBuffer();
		
		mat4.perspective(45, canvas.width/canvas.height, 0.1, 100.0, pMatrix);
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
		var modelView1 = mat4.create(), modelView2 = mat4.create();
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
			window.setTimeout(function(){ window.requestAnimFrame(paintGL); }, 33);
			//window.requestAnimFrame(paintGL);
		} else {return;}
		
		// calculate transformation matrices
		mat4.identity(mvMatrix);
		mat4.translate(mvMatrix, [0.0, 0.0, -zDistance]);
		mat4.rotate(mvMatrix, rotX, [1.0, 0.0, 0.0]);
		mat4.rotate(mvMatrix, rotZ, [0.0, 0.0, 1.0]);
		
		// activate or deactivate picking
		gl.uniform1i(shaderVariables.uUsePicking, picking ? 1 : 0);
		if (picking) {
			// bind frame buffer
			gl.bindFramebuffer(gl.FRAMEBUFFER, pickingBuffer.frameBuffer);
			// clear framebuffer
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			// draw data
			drawPlatform();
			drawObjects(objects.boxes);
			// evaluate picking result
			var pickID = new Uint8Array(4);
			// in WebGL 1.0 readPixels only works with UNSIGNED_BYTE!
			// IMPORTANT NOTE: frame buffers store pixels vertically mirrored!
			gl.readPixels(pickingBuffer.pickX, canvas.height - pickingBuffer.pickY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickID);
			
			// do something
			console.log("Picked @ x:" + pickingBuffer.pickX + "/y:" + pickingBuffer.pickY + " ID: [" + pickID[0] + ", " + pickID[1] + ", " + pickID[2] + ", " + pickID[3] + "]");
			changeBoxSelection(Math.ceil(pickID[2]/255*10) - 1);
			
			// unbind framebuffer und disable picking
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
			drawSkybox(); // draw skybox at last (performance reasons)
		}
	};
	
	this.attachShader = function(id, altId){
		var shader;
		var shaderSource;
		var shaderScript = document.getElementById(id);

		if (shaderScript.type == "x-shader/x-fragment")
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		else if (shaderScript.type == "x-shader/x-vertex")
			shader = gl.createShader(gl.VERTEX_SHADER);
		else {
			console.log("ERROR: Cannot create shader of unknown type!");
		}
		shaderSource = shaderScript.innerHTML;
		if (altId)
			shaderSource = shaderSource.replace("#import <"+altId+">", document.getElementById(altId).innerHTML);
		
		//console.log("Shader source: " + shaderSource);
		
		gl.shaderSource(shader, shaderSource);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
			console.log(id + ": " + gl.getShaderInfoLog(shader));
		else
			shaders.push(shader);

	};
	
	var linkProgram = function(){
		program = gl.createProgram();

		for (var i in shaders)
			gl.attachShader(program, shaders[i]);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS))
			console.log(gl.getProgramInfoLog(program));
		else {
			gl.useProgram(program);
			console.log("use program.");
		}
	};
	
	this.useProgram = function(){
		linkProgram();
		getShaderVariables();
	};
	
	var getShaderVariables = function(){
		shaderVariables.aVertex      = gl.getAttribLocation(program, "aVertex");
		shaderVariables.aNormal      = gl.getAttribLocation(program, "aNormal");
		shaderVariables.aTexCoord    = gl.getAttribLocation(program, "aTexCoord");
		
		shaderVariables.uUsePicking  = gl.getUniformLocation(program, "uUsePicking");
		shaderVariables.uTextureMode = gl.getUniformLocation(program, "uTextureMode");
		shaderVariables.uHighlight   = gl.getUniformLocation(program, "uHighlight");
		shaderVariables.uBoxId       = gl.getUniformLocation(program, "uBoxId");
		shaderVariables.uSampler     = gl.getUniformLocation(program, "uSampler");
		shaderVariables.uSamplerCube = gl.getUniformLocation(program, "uSamplerCube");
		shaderVariables.uNMatrix     = gl.getUniformLocation(program, "uNMatrix");
		shaderVariables.uMvMatrix    = gl.getUniformLocation(program, "uMvMatrix");
		shaderVariables.uMvpMatrix   = gl.getUniformLocation(program, "uMvpMatrix");
		
		gl.enableVertexAttribArray(shaderVariables.aVertex);
		gl.enableVertexAttribArray(shaderVariables.aNormal);
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
	
	var rotate = function(rz, rx){
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
	};
	
	function changeBoxSelection(n) {
		for (var i = 0; i < objects.boxes.length; ++i)
			objects.boxes[i].selected = (i == n);	
	}
	
	var shiftBox = function(dir){
		var pos;
		var box;
		var animation;
		var speed = 0.2;
		
		for (var i = 0; i < objects.boxes.length; ++i) {
			if (objects.boxes[i].selected) {
				pos = window.shiftBox(objects.boxes[i], dir);
				if (pos == null) {
					window.alert("Invalid move!");
				} else {
					input.setLocked(true);
					inputRef  = input; // 'input' is out of scope for nested function
					levelRef  = level;
					levelsRef = levels;
					
					var animation = new Animation(objects.boxes[i], pos, dir, 1.0);
					animation.addEventListener("exit", function(){
						inputRef.setLocked(false);
		
						// check if player has completed level
						if (isGameOver()) {
							window.alert("Level complete!");
							if (levelRef+1 >= levelsRef.length)
								window.alert("Congratulations! You've mastered all quests!");
							else
								loadMap(++levelRef);
						}
						
						//console.log("animation has ended.");
					});
					animation.start();
				}
			}
		}
	};
	
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
	
	var loadMap = this.loadMap = function(level){
		var i;
		var map = levels[level];
		
		active = false; // disable rendering
		console.log("Create platform " + map.width + "x" + map.height);
		
		// generate skybox (only once)
		if (!meshes.skybox) {
			meshes.skybox = new Skybox(gl);
			meshes.skybox.loadTextureCube(
				"textures/terrain_positive_x.png",
				"textures/terrain_negative_x.png",
				"textures/terrain_positive_y.png",
				"textures/terrain_negative_y.png",
				"textures/terrain_positive_z.png",
				"textures/terrain_negative_z.png"
			);
			objects.skybox = new GameObject("skybox", meshes.skybox, 0.0, 0.0, -1);
		}		
		// generate other geometry
		if (!meshes.box) {
			meshes.box = new Box(gl);
			meshes.box.setTexture("textures/wood.jpg", gl);
		}
		if (!meshes.concrete) {
			meshes.concrete = new Concrete(gl);
			meshes.concrete.setTexture("textures/ice.jpg", gl);
		}
		if (!meshes.trigger) {
			meshes.trigger = new Trigger(gl);
			meshes.trigger.setTexture("textures/metalfloor.jpg", gl);
		}
		if (meshes.platform)
			meshes.platform.dispose(gl);
		meshes.platform            = new Platform(gl, map.width, map.height);
		meshes.platform.texture    = meshes.concrete.texture;
		meshes.platform.hasTexture = true;
		
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
		zDistance = Math.max(map.width, map.height) + 3.0;
		
		active = true; // enable rendering
		paintGL();     // start render loop
	};
};
