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
 * @copyright 2011, 2012 Christoph Matscheko
 * @license
*/
"use strict";

// OpenGL Framebuffers: http://www.swiftless.com/tutorials/opengl/framebuffer.html (!!)

/*const*/ var DEG45_RAD  = Math.PI / 4;
/*const*/ var DEG135_RAD = DEG45_RAD * 3;
/*const*/ var DEG225_RAD = DEG45_RAD * 5;
/*const*/ var DEG315_RAD = DEG45_RAD * 7;
/*const*/ var MAX_RAD    = Math.PI * 2;

/*const*/ var DEFAULT_ROT_X = -MAX_RAD/11.0;
/*const*/ var DEFAULT_ROT_Z = 0.0;

var Cubunoid = function(query){
	var canvas    = document.querySelector(query);
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
	var levels    = [map1, map2, map3, map4, map5]; // , map6
	var textureFormat;
	var pickingBuffer   = null;
	var shaderVariables = null; // always stores the variable locations of the current program
	var extensions = { // just pro forma, never gets used directly
		floatTexture: null,
		oesTextureFloatLinear: null,
		webglColorBufferFloat: null
	};
	var programs = {
		standard: null,
		skybox:   null
	};
	var animations = {
		platformRotation: null
	};
	var overlays = {
		errorSignal: null,
		levelDialog: null
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
	var rotX = DEFAULT_ROT_X;
	var rotZ = DEFAULT_ROT_Z;
	var zDistance = 0.0;
	
	function adjustCanvasSize() {
		canvas.width  = window.innerWidth;
		canvas.height = window.innerHeight;
	}
	
	function loadExtensions() {
		var exts = gl.getSupportedExtensions();
		
		if (exts.indexOf("OES_texture_float") !== -1) {
			console.info("WebGL extension 'OES_texture_float' is available!");
			
			if (exts.indexOf("OES_texture_float_linear") !== -1) {
				console.info("WebGL extension 'OES_texture_float_linear' is available!");
				
				extensions.floatTexture = gl.getExtension("OES_texture_float");
				extensions.oesTextureFloatLinear = gl.getExtension("OES_texture_float_linear");
				extensions.webglColorBufferFloat = gl.getExtension("WEBGL_color_buffer_float");
				
				textureFormat = gl.FLOAT;
				
				console.log("Loaded 'OES_texture_float' extension.");
				console.log("Loaded 'OES_texture_float_linear' extension.");
				console.log("Loaded 'WEBGL_color_buffer_float' extension.");
			} else {
				textureFormat = gl.UNSIGNED_BYTE;
				console.warning("Cannot load 'OES_texture_float_linear' extension!");
			}			
		} else {
			textureFormat = gl.UNSIGNED_BYTE;
			console.warning("Cannot load 'OES_texture_float' extension!");
		}
	}
	
	this.initGL = function(){
		adjustCanvasSize();

		gl = canvas.getContext("webgl", {preserveDrawingBuffer: true}); // preserveDrawingBuffer is required for gl.readPixels()
		if (!gl) {
			window.alert("Fatal error: cannot initialize WebGL context!");
			return;
		}

		loadExtensions();

		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
		//gl.enable(gl.TEXTURE_CUBE_MAP_SEAMLESS);

		//gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		//gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
		gl.hint(gl.GENERATE_MIPMAP_HINT, gl.NICEST); // tell WebGL to create nice mipmaps (does not work with firefox)

		checkErrors(gl, "Cubunoid::initGL()");

		input = new InputManager(this.eventHandler, this.mouseHandler, this.pickHandler);
		pickingBuffer = new FrameBuffer(gl, canvas.width, canvas.height, gl.DEPTH_COMPONENT16, textureFormat);
		pickingBuffer.pickX = pickingBuffer.pickY = 0;

		window.addEventListener("resize", this.resizeGL, false);
	};
	
	function initStandardProgram() {
		var vertexShader   = new Shader(gl, "standard-vs", gl.VERTEX_SHADER);
		var fragmentShader = new Shader(gl, "standard-fs", gl.FRAGMENT_SHADER);
		
		vertexShader.compile();
		fragmentShader.compile();
		
		programs.standard = new Program(gl, vertexShader, fragmentShader);
		programs.standard.link();
		programs.standard.locations = {
			aVertex:      programs.standard.getAttribLocation("aVertex"),
			aNormal:      programs.standard.getAttribLocation("aNormal"),
			aTexCoord:    programs.standard.getAttribLocation("aTexCoord"),
			uUseTexture:  programs.standard.getUniformLocation("uUseTexture"),
			uUsePicking:  programs.standard.getUniformLocation("uUsePicking"),
			uHighlight:   programs.standard.getUniformLocation("uHighlight"),
			uSampler:     programs.standard.getUniformLocation("uSampler"),
			uBoxId:       programs.standard.getUniformLocation("uBoxId"),
			uNMatrix:     programs.standard.getUniformLocation("uNMatrix"),
			uMvMatrix:    programs.standard.getUniformLocation("uMvMatrix"),
			uMvpMatrix:   programs.standard.getUniformLocation("uMvpMatrix")
		};
		
		gl.enableVertexAttribArray(programs.standard.locations.aVertex);
		gl.enableVertexAttribArray(programs.standard.locations.aNormal);
		
		console.log("Compiled standard shaders.");
	}
	
	function initSkyboxProgram() {
		var vertexShader   = new Shader(gl, "skybox-vs", gl.VERTEX_SHADER);
		var fragmentShader = new Shader(gl, "skybox-fs", gl.FRAGMENT_SHADER);
		
		vertexShader.compile();
		fragmentShader.compile();
		
		programs.skybox = new Program(gl, vertexShader, fragmentShader);
		programs.skybox.link();
		programs.skybox.locations = {
			aVertex:      programs.skybox.getAttribLocation("aVertex"),
			uUseTexture:  programs.skybox.getUniformLocation("uUseTexture"),
			uSamplerCube: programs.skybox.getUniformLocation("uSamplerCube"),
			uMvpMatrix:   programs.skybox.getUniformLocation("uMvpMatrix")
		};
		
		gl.enableVertexAttribArray(programs.skybox.locations.aVertex);
		
		console.log("Compiled skybox shaders.");
	}
	
	this.initShaders = function(){
		initStandardProgram();
		initSkyboxProgram();
	};
	
	function deactivateProgram(program) {
		if (program == programs.skybox) {
			gl.disableVertexAttribArray(shaderVariables.aVertex);
		} else {
			gl.disableVertexAttribArray(shaderVariables.aVertex);
			gl.disableVertexAttribArray(shaderVariables.aNormal);
			gl.disableVertexAttribArray(shaderVariables.aTexCoord);
		}
		
		shaderVariables = null;
	}
	
	function activateProgram(program) {
		program.use();
		shaderVariables = program.locations;
		
		/*if (program == programs.skybox) {
			gl.enableVertexAttribArray(shaderVariables.aVertex);
		} else {
			gl.enableVertexAttribArray(shaderVariables.aVertex);
			gl.enableVertexAttribArray(shaderVariables.aNormal);
		}*/
	}
	
	this.initOverlays = function() {
		var transEndFunc = function(e){
			if (e.target.className == "fadeOut") {
				document.body.removeChild(e.target);
			}
		};
		
		overlays.levelDialog         = document.createElement("div");
		overlays.levelDialog.id      = "levelDialog";
		overlays.levelDialog.textBox = document.createElement("p");
		overlays.levelDialog.button  = document.createElement("button");
		overlays.levelDialog.appendChild(overlays.levelDialog.textBox);
		overlays.levelDialog.appendChild(overlays.levelDialog.button);
		
		overlays.errorSignal    = document.createElement("div");
		overlays.errorSignal.id = "errorSignal";
		
		overlays.levelDialog.addEventListener("transitionend", transEndFunc, false);
		overlays.levelDialog.addEventListener("webkitTransitionEnd", transEndFunc, false);
		
		overlays.errorSignal.addEventListener("transitionend", transEndFunc, false);
		overlays.errorSignal.addEventListener("webkitTransitionEnd", transEndFunc, false);
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
		if (shaderVariables.uMvMatrix)
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
		
		if (obj == objects.skybox) {
			obj.mesh.draw(
				shaderVariables.aVertex,
				shaderVariables.uSamplerCube,
				shaderVariables.uUseTexture
			);
		} else {
			obj.mesh.draw(
				shaderVariables.aVertex,
				shaderVariables.aNormal,
				shaderVariables.aTexCoord,
				shaderVariables.uSampler,
				shaderVariables.uUseTexture
			);
		}
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
			for (var i = 0; i < array.length; ++i) {
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
			window.requestAnimationFrame(paintGL);
		} else {
			return;
		}
		
		// calculate transformation matrices
		mat4.identity(mvMatrix);
		mat4.translate(mvMatrix, [0.0, 0.0, -zDistance]);
		mat4.rotate(mvMatrix, rotX, [1.0, 0.0, 0.0]);
		mat4.rotate(mvMatrix, rotZ, [0.0, 0.0, 1.0]);
		
		// activate standard program
		activateProgram(programs.standard);
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
			mat4.rotate(mvMatrix, rotZ, [0.0, 1.0, 0.0]);
			//deactivateProgram(programs.standard);	// deactivate standard program
			activateProgram(programs.skybox);		// activate skybox program
			drawSkybox();							// draw skybox at last for performance reasons
			//deactivateProgram(programs.skybox);		// deactivate skybox program
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
		} else if (rotZ <= 0.0) {
			rotZ += MAX_RAD - rz;
		} else {
			rotZ += rz;
		}
		
		if (rotX >= MAX_RAD)
			rotX -= MAX_RAD - rx;
		else if (rotZ <= 0.0)
			rotX += MAX_RAD - rx;
		else
			rotX += rx;
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
		overlays.levelDialog.className = "fadeOut";
		if (animations.platformRotation)
			window.clearInterval(animations.platformRotation);
		rotX = DEFAULT_ROT_X;
		rotZ = DEFAULT_ROT_Z;
		loadMap(++level);
		input.setLocked(false);
		
		console.log("Goto level " + (level + 1));
	}
	
	function showErrorSignal() {
		overlays.errorSignal.className = "fadeIn";	// start CSS transition
		document.body.appendChild(overlays.errorSignal);
		window.setTimeout(function(){ overlays.errorSignal.className = "fadeOut"; }, 500); // start fade out animation after a few mss
	}
	
	function showLevelDialog() {
		if (level+1 >= levels.length) {
			overlays.levelDialog.textBox.innerHTML       = "Congratulations!<br />You've mastered all quests!";
			overlays.levelDialog.button.style.visibility = "hidden";
		} else {
			overlays.levelDialog.textBox.innerHTML = "Congratulations!<br />You've mastered level " + (level+1) + "!";
			overlays.levelDialog.button.innerHTML  = "Go to level " + (level+2);
			overlays.levelDialog.button.onclick    = nextLevel;
		}
		
		document.body.appendChild(overlays.levelDialog);
		overlays.levelDialog.className = "fadeIn";
	}
	
	function showIntroDialog() {
		var o = overlays;
		var i = input;
		
		i.setLocked(true); // prevent user from starting the game while intro dialog is still visible
		
		o.levelDialog.textBox.innerHTML = '<h2>Welcome to Cubunoid!</h2>' +
			'<p>This game is about solving levels by activating switches with wooden boxes.</p>' +
			'<p>Boxes can be selected by clicking them. They can be moved with the arrow keys.</p>' +
			'<p>Since the ground is solid ice, boxes will glide in the desired direction until they ' +
			'reach the end of the arena or collide with another box.' +
			'Try to invent strategies to let one of the boxes come to a halt exactly on the switch.</p>' +
			'<p>Keep in mind that from the games perspective you are a person pushing around boxes. Sometimes ' +
			'it may be impossible to move a box because another box is standing where you would be, trying to push the box!</p>';
		o.levelDialog.button.innerHTML  = 'Let\'s get started';
		o.levelDialog.button.onclick    = function() {
			o.levelDialog.className = "fadeOut";
			i.setLocked(false);
		};
		
		document.body.appendChild(overlays.levelDialog);
		overlays.levelDialog.className = "fadeIn";
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
			meshes.skybox = new Skybox( // had to swap neg.Y with pos.Y
				gl, 
				"textures/terrain_positive_x.png",
				"textures/terrain_negative_x.png",
				"textures/terrain_negative_y.png",
				"textures/terrain_positive_y.png",
				"textures/terrain_positive_z.png",
				"textures/terrain_negative_z.png",
				textureFormat
			);
			objects.skybox = new GameObject("skybox", meshes.skybox, 0.0, 0.0, -1);
		}		
		// generate other geometry
		if (!meshes.box) {
			meshes.box = new Box(gl);
			meshes.box.setTexture("textures/2_store.jpg", textureFormat);
		}
		if (!meshes.concrete) {
			meshes.concrete = new Concrete(gl);
			meshes.concrete.setTexture("textures/ice2.jpg", textureFormat);
		}
		if (!meshes.trigger) {
			meshes.trigger = new Trigger(gl);
			meshes.trigger.setTexture("textures/24_met.jpg", textureFormat);
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
	this.showIntroDialog = showIntroDialog;
};
