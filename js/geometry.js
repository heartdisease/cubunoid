"use strict";

var GameObject = function(name, mesh, x, y, i){
	this.name     = name;
	this.mesh     = mesh;
	this.x        = x;
	this.y        = y;
	this.selected = false;
	this.colorID  = new Float32Array([0.0, 0.0, (i == -1) ? 0.0 : (0.1+i*0.1), 1.0]); // allows only 10 different IDs
};

var Texture = function(src, gl){
	var loaded  = false;
	var image   = new Image();
	var texture = gl.createTexture();
	
	this.dispose = function(){
		gl.deleteTexture(texture);
	};
	
	image.addEventListener(
		"load",
		function(){
			console.log("Create texture (" + image.width + "x" + image.height + ") ...");
		
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.bindTexture(gl.TEXTURE_2D, null);
		
			loaded = true;
		},
		false
	);
	image.src = src;
	
	this.texture = texture;
	this.isLoaded = function(){
		return loaded;
	};
};

var Mesh = function(){ // dirty solution! no proper separation	
	this.width;
	this.height;
	this.depth;
	this.texture;
	this.vertexBuffer;
	this.normalBuffer;
	this.texCoordBuffer;
	this.vertexItemSize;
	this.normalItemSize;
	this.texCoordItemSize;
	this.numItems;
	this.hasTexture;
	
	this.generateGeometry = function(geometry, gl){
		var vertices  = new Array(this.numItems * this.vertexItemSize);
		var normals   = new Array(this.numItems * this.normalItemSize);
		var texCoords = new Array(this.numItems * this.texCoordItemSize);
		
		// describes the order of vertices
		var elements = [
			[0, 1, 3], [1, 2, 3], // front face
			[4, 5, 7], [5, 6, 7], // back face
			[4, 0, 3], [4, 7, 3], // left face
			[1, 5, 2], [5, 6, 2], // right face
			[4, 5, 0], [5, 1, 0], // top face
			[7, 6, 3], [6, 2, 3]  // bottom face
		];
		
		var vi = 0, ti = 0;
		var tmp;
		for (var y = 0; y < elements.length; ++y) {
			for (var x = 0; x < elements[y].length; ++x) {
				tmp = geometry[elements[y][x]];
				
				vertices[vi+0] = tmp[0];
				vertices[vi+1] = tmp[1];
				vertices[vi+2] = tmp[2];
				
				if (y < 4) { // front and back face
					normals[vi+0] = 0.0;
					normals[vi+1] = 0.0;
					normals[vi+2] = (y < 2) ? 1.0 : -1.0;
					
					switch (elements[y][x]) {
						case 0: case 4:
							texCoords[ti+0] = 0.0;
							texCoords[ti+1] = 1.0;
							break;
						case 1: case 5:
							texCoords[ti+0] = 1.0;
							texCoords[ti+1] = 1.0;
							break;
						case 2: case 6:
							texCoords[ti+0] = 1.0;
							texCoords[ti+1] = 0.0;
							break;
						case 3: case 7:
							texCoords[ti+0] = 0.0;
							texCoords[ti+1] = 0.0;
							break;
					}
				} else if (y < 8) { // left and right face
					normals[vi+0] = (y < 6) ? -1.0 : 1.0;
					normals[vi+1] = 0.0;
					normals[vi+2] = 0.0;
					
					switch (elements[y][x]) {
						case 4: case 5:
							texCoords[ti+0] = 0.0;
							texCoords[ti+1] = 1.0;
							break;
						case 0: case 1:
							texCoords[ti+0] = 1.0;
							texCoords[ti+1] = 1.0;
							break;
						case 7: case 6:
							texCoords[ti+0] = 0.0;
							texCoords[ti+1] = 0.0;
							break;
						case 3: case 2:
							texCoords[ti+0] = 1.0;
							texCoords[ti+1] = 0.0;
							break;
					}
				} else { // y < 12 (top and bottom face)
					normals[vi+0] = 0.0;
					normals[vi+1] = (y < 10) ? 1.0 : -1.0;
					normals[vi+2] = 0.0;
					
					switch (elements[y][x]) {
						case 4: case 7:
							texCoords[ti+0] = 0.0;
							texCoords[ti+1] = 1.0;
							break;
						case 5: case 6:
							texCoords[ti+0] = 1.0;
							texCoords[ti+1] = 1.0;
							break;
						case 0: case 3:
							texCoords[ti+0] = 0.0;
							texCoords[ti+1] = 0.0;
							break;
						case 1: case 2:
							texCoords[ti+0] = 1.0;
							texCoords[ti+1] = 0.0;
							break;
					}
				}
				
				vi += 3;
				ti += 2;
			}
		}
		
		this.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		
		this.normalBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
		
		this.texCoordBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	};
	
	this.setTexture = function(src, gl){
		this.texture = new Texture(src, gl);
	};
	
	/** Frees all WebGL resources (except textures!) */
	this.dispose = function(gl){
		gl.deleteBuffer(this.vertexBuffer);
		gl.deleteBuffer(this.normalBuffer);
		gl.deleteBuffer(this.texCoordBuffer);
	};
	
	// construction code
	this.hasTexture       = false;
	this.vertexItemSize   = 3;
	this.normalItemSize   = 3;
	this.texCoordItemSize = 2;
	this.numItems         = 36;
};

var Platform = function(gl, width, height){	
	this.width  = width;
	this.height = height;
	this.depth  = depth;
	
	var halfWidth  = width/2;
	var halfHeight = height/2;
	var depth      = 0.25;
	var geometry   = [
		// front face
		[-halfWidth,  halfHeight,    0.0],
		[ halfWidth,  halfHeight,    0.0],
		[ halfWidth, -halfHeight,    0.0],
		[-halfWidth, -halfHeight,    0.0],
		// back face
		[-halfWidth,  halfHeight, -depth],
		[ halfWidth,  halfHeight, -depth],
		[ halfWidth, -halfHeight, -depth],
		[-halfWidth, -halfHeight, -depth]
	];

	this.generateGeometry(geometry, gl);
};
Platform.prototype = new Mesh();
Platform.prototype.constructor = Platform;

var Box = function(gl){	
	// construction code
	var size     = 1.0;  // with = height
	var halfSize = size / 2;
	var geometry = [
		// front face
		[-halfSize,  halfSize,  halfSize],
		[ halfSize,  halfSize,  halfSize],
		[ halfSize, -halfSize,  halfSize],
		[-halfSize, -halfSize,  halfSize],
		// back face
		[-halfSize,  halfSize, -halfSize],
		[ halfSize,  halfSize, -halfSize],
		[ halfSize, -halfSize, -halfSize],
		[-halfSize, -halfSize, -halfSize]
	];
	
	this.width  = size;
	this.height = size;
	this.depth  = size;
	
	this.generateGeometry(geometry, gl);
};
Box.prototype = new Mesh();
Box.prototype.constructor = Box;

var Concrete = function(gl){
	var size      = 1.0; // with = height
	var depth     = 0.1; // z-axis
	var halfSize  = size / 2;
	var halfDepth = depth / 2;
	var geometry  = [
		// front face
		[-halfSize,  halfSize,  halfDepth],
		[ halfSize,  halfSize,  halfDepth],
		[ halfSize, -halfSize,  halfDepth],
		[-halfSize, -halfSize,  halfDepth],
		// back face
		[-halfSize,  halfSize, -halfDepth],
		[ halfSize,  halfSize, -halfDepth],
		[ halfSize, -halfSize, -halfDepth],
		[-halfSize, -halfSize, -halfDepth]
	];
	
	this.width  = size;
	this.height = size;
	this.depth  = depth;
	
	this.generateGeometry(geometry, gl);
};
Concrete.prototype = new Mesh();
Concrete.prototype.constructor = Concrete;

var Trigger = function(gl){	
	var size        = 1.0; // with = height
	var depth       = 0.1; // z-axis
	var halfSize    = size / 2;
	var quarterSize = size / 4;
	var halfDepth   = depth / 2;
	var geometry    = [
		// front face
		[-quarterSize,  quarterSize,  halfDepth],
		[ quarterSize,  quarterSize,  halfDepth],
		[ quarterSize, -quarterSize,  halfDepth],
		[-quarterSize, -quarterSize,  halfDepth],
		// back face
		[-halfSize,  halfSize, -halfDepth],
		[ halfSize,  halfSize, -halfDepth],
		[ halfSize, -halfSize, -halfDepth],
		[-halfSize, -halfSize, -halfDepth]
	];
	
	this.width  = size;
	this.height = size;
	this.depth  = depth;
	
	this.generateGeometry(geometry, gl);
};
Trigger.prototype = new Mesh();
Trigger.prototype.constructor = Trigger;
	
