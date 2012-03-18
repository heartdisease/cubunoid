/// TODO
// * implement phong-blinn lighting
// * include textures
// * implement picking with multiple render targets and frame- and renderbuffers

var MAX_RAD = Math.PI * 2;

var Cubunoid = function(id){
	var canvas    = document.getElementById(id);
	var input     = null;
	var gl        = null;
	var shaders   = new Array();
	var program   = null;
	var pMatrix   = mat4.create(); // projection matrix
	var nMatrix   = mat4.create(); // normal matrix
	var mvMatrix  = mat4.create(); // model-view matrix
	var mvpMatrix = mat4.create(); // model-view-projection matrix
	var shaderVariables = {
		aVertex:       -1,
		aNormal:       -1,
		aTexCoord:     -1,
		uUseTexture: null,
		uHighlight:  null,
		uSampler:    null,
		uNMatrix:    null,
		uMvMatrix:   null,
		uMvpMatrix:  null
	};
	var meshes = { // geometry for game objects
		platform: null,
		boxes:    null,
		trigger:  null,
		concrete: null
	};
	var objects = { // actual game objects
		platform:        null,
		boxes:    new Array(),
		trigger:  new Array(),
		concrete: new Array()
	};
	var rotX = -MAX_RAD/6.0;
	var rotZ = 0.0;
	var view = 0; // platform rotation in degrees
	
	this.initGL = function(){
		gl = WebGLUtils.setupWebGL(canvas);
		if (!gl) {
			window.alert("Fatal error: cannot initialize WebGL context!");
			return;
		}
		
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
    	gl.enable(gl.DEPTH_TEST);
    	
		window.addEventListener("resize", this.resizeGL, false);
		input = new InputManager(this.eventHandler);
	};
	
	this.resizeGL = function(){
		canvas.width  = window.innerWidth;
		canvas.height = window.innerHeight;
		
		console.log("Set viewport to " + canvas.width + "x" + canvas.height);
		gl.viewport(0, 0, canvas.width, canvas.height);
		
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
		// activate vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, obj.mesh.vertexBuffer);
		gl.vertexAttribPointer(shaderVariables.aVertex, obj.mesh.vertexItemSize, gl.FLOAT, false, 0, 0);
		// activate normal buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, obj.mesh.normalBuffer);
		gl.vertexAttribPointer(shaderVariables.aNormal, obj.mesh.normalItemSize, gl.FLOAT, false, 0, 0);
		// activate texture (if available)
		if (obj.mesh.texture && obj.mesh.texture.isLoaded()) {
			gl.enableVertexAttribArray(shaderVariables.aTexCoord);	// activate texcoord buffer
			gl.uniform1i(shaderVariables.uUseTexture, 1);			// tell shader to use texture
			
			gl.bindBuffer(gl.ARRAY_BUFFER, obj.mesh.texCoordBuffer);
			gl.vertexAttribPointer(shaderVariables.aTexCoord, obj.mesh.texCoordItemSize, gl.FLOAT, false, 0, 0);
			
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, obj.mesh.texture.texture);
			gl.uniform1i(shaderVariables.uSampler, 0);				// tell sampler that our texture uses slot 0
		} else {
			gl.disableVertexAttribArray(shaderVariables.aTexCoord);
			gl.uniform1i(shaderVariables.uUseTexture, 0);			// tell shader not to use texture
		}
		// highlight object if it is selected
		gl.uniform1i(shaderVariables.uHighlight, obj.selected ? 1 : 0);

		gl.drawArrays(gl.TRIANGLES, 0, obj.mesh.numItems);
	};
	
	var drawPlatform = function(){
		uploadMatrices(mvMatrix, true);
		drawObject(objects.platform);
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
				mat4.translate(modelView2, [xOffset, 0.0, 0.0]);
				mat4.translate(modelView2, [0.0, yOffset, 0.0]);
			
				uploadMatrices(modelView2, false);
				drawObject(array[i]);
			}
		}
	};
	
	var paintGL = function(){
		window.setTimeout(function(){ window.requestAnimFrame(paintGL); }, 100);
		//window.requestAnimFrame(paintGL);
		
		// clear framebuffer
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		// calculate transformation matrices
		mat4.identity(mvMatrix);
		mat4.translate(mvMatrix, [0.0, 0.0, -8.5]);
		mat4.rotate(mvMatrix, rotX, [1.0, 0.0, 0.0]);
		mat4.rotate(mvMatrix, rotZ, [0.0, 0.0, 1.0]);
		// draw data
		drawPlatform();
		drawObjects(objects.boxes);
		drawObjects(objects.concrete);
		drawObjects(objects.trigger);
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
		
		console.log("Shader source: " + shaderSource);
		
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
	
	var getShaderVariables = function(){
		shaderVariables.aVertex     = gl.getAttribLocation(program, "aVertex");
		shaderVariables.aNormal     = gl.getAttribLocation(program, "aNormal");
		shaderVariables.aTexCoord   = gl.getAttribLocation(program, "aTexCoord");
		shaderVariables.uUseTexture = gl.getUniformLocation(program, "uUseTexture");
		shaderVariables.uHighlight  = gl.getUniformLocation(program, "uHighlight");
		shaderVariables.uSampler    = gl.getUniformLocation(program, "uSampler");
		shaderVariables.uNMatrix    = gl.getUniformLocation(program, "uNMatrix");
		shaderVariables.uMvMatrix   = gl.getUniformLocation(program, "uMvMatrix");
		shaderVariables.uMvpMatrix  = gl.getUniformLocation(program, "uMvpMatrix");
		
		gl.enableVertexAttribArray(shaderVariables.aVertex);
		gl.enableVertexAttribArray(shaderVariables.aNormal);
	};
	
	var rotate = function(){
		if (view < 360) {
			rotZ += Math.PI/4;
			view += 45;
		} else {
			rotZ = Math.PI/4;
			view = 45;
		}
		
		console.log("Rotation: " + view + "deg");
	};
	
	this.mainLoop = function(){
		var animation;
		
		linkProgram();
		getShaderVariables();
		//animation = window.setInterval(rotate, 33);
		paintGL();
	};
	
	/** HINT: Rendering is probably mirrored! */
	this.eventHandler = function(action){
		var dir;
		
		switch (action) {
			case InputType.SPIN:
				rotate();
				break;
			case InputType.BOX1:
				for (var i = 0; i < objects.boxes.length; ++i)
					objects.boxes[i].selected = (i == 0);
				break;
			case InputType.BOX2:
				for (var i = 0; i < objects.boxes.length; ++i)
					objects.boxes[i].selected = (i == 1);
				break;
			case InputType.BOX3:
				for (var i = 0; i < objects.boxes.length; ++i)
					objects.boxes[i].selected = (i == 2);
				break;
			case InputType.K_LEFT:
				if (view <= 45 || view == 360)
					dir = Direction.RIGHT;
				else if (view <= 135)
					dir = Direction.UP;
				else if (view <= 225)
					dir = Direction.LEFT;
				else // view <= 315
					dir = Direction.DOWN;
				
				for (var i = 0; i < objects.boxes.length; ++i)
				{
					if (objects.boxes[i].selected)
						shiftBox(objects.boxes[i], dir);
				}
				break;
			case InputType.K_RIGHT:
				if (view <= 45 || view == 360)
					dir = Direction.LEFT; // right
				else if (view <= 135)
					dir = Direction.DOWN; // up
				else if (view <= 225)
					dir = Direction.RIGHT; // left
				else // view <= 315
					dir = Direction.UP; // down
				
				for (var i = 0; i < objects.boxes.length; ++i)
				{
					if (objects.boxes[i].selected)
						shiftBox(objects.boxes[i], dir);
				}
				break;
			case InputType.K_UP:
				if (view <= 45 || view == 360)
					dir = Direction.UP;
				else if (view <= 135)
					dir = Direction.LEFT;
				else if (view <= 225)
					dir = Direction.DOWN;
				else // view <= 315
					dir = Direction.RIGHT;
				
				for (var i = 0; i < objects.boxes.length; ++i)
				{
					if (objects.boxes[i].selected)
						shiftBox(objects.boxes[i], dir);
				}
				break;
			case InputType.K_DOWN:
				if (view <= 45 || view == 360)
					dir = Direction.DOWN;
				else if (view <= 135)
					dir = Direction.RIGHT;
				else if (view <= 225)
					dir = Direction.UP;
				else // view <= 315
					dir = Direction.LEFT;
				
				for (var i = 0; i < objects.boxes.length; ++i)
				{
					if (objects.boxes[i].selected)
						shiftBox(objects.boxes[i], dir);
				}
				break;
		}
	};
	
	this.loadMap = function(map){
		var i;
		
		console.log("Create platform " + map.width + "x" + map.height);
		
		// generate geometry
		meshes.platform = new Platform(gl, map.width, map.height);
		meshes.box      = new Box(gl);
		meshes.concrete = new Concrete(gl);
		meshes.trigger  = new Trigger(gl);
		
		meshes.platform.setTexture("textures/ice.jpg", gl);
		meshes.box.setTexture("textures/wood.jpg", gl);
		meshes.concrete.texture = meshes.platform.texture;
		meshes.trigger.setTexture("textures/metalfloor.jpg", gl);
		
		// generate platform
		objects.platform = new GameObject("platform", meshes.platform, 0.0, 0.0);
		// generate boxes
		for (i = 0; i < map.boxes.length; ++i)
			objects.boxes.push(new GameObject("box" + i, meshes.box, map.boxes[i].x, map.boxes[i].y));
		// generate misc obstacles
		for (i = 0; i < map.concrete.length; ++i)
			objects.concrete.push(new GameObject("concrete" + i, meshes.concrete, map.concrete[i].x, map.concrete[i].y));
		// generate trigger
		for (i = 0; i < map.switches.length; ++i)
			objects.trigger.push(new GameObject("trigger" + i, meshes.trigger, map.switches[i].x, map.switches[i].y));
			
		// see logic.js
		level = {
			width:    map.width,
			height:   map.height,
			boxes:    objects.boxes,
			concrete: objects.concrete,
			switches: objects.trigger
		};
	};
};
