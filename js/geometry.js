"use strict";

var GameObject = function(name, mesh, x, y, i){
	this.name     = name;
	this.mesh     = mesh;
	this.x        = x;
	this.y        = y;
	this.selected = false;
	this.colorID  = new Float32Array([0.0, 0.0, (i == -1) ? 0.0 : (0.1+i*0.1), 1.0]); // allows only 10 different IDs
};

function Texture() {
	this.texture;
	
	this.bind;
	this.isLoaded;
	this.dispose;
}

function Texture2D(src, gl) {
	var self    = this;
	var loaded  = false;
	var image   = new Image();
	
	function isLoaded() {
		return loaded;
	}
	
	function dispose() {
		gl.deleteTexture(self.texture);
	}
	
	function bind(uSampler, uTextureMode, unit) {
		//console.log("bind tex on " + unit);
		
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, self.texture);
		gl.uniform1i(uSampler, unit);		// tell sampler that our texture uses slot 'unit' (should be 0)
		gl.uniform1i(uTextureMode, 1);		// tell shader to use texture
	}
	
	image.onload = function(){
		console.log("Create texture (" + image.width + "x" + image.height + ") ...");
	
		gl.bindTexture(gl.TEXTURE_2D, self.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); //gl.CLAMP_TO_EDGE
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
	
		loaded = true;
	};
	image.src = src;
	
	this.texture  = gl.createTexture();
	this.bind     = bind;
	this.isLoaded = isLoaded;
	this.dispose  = dispose;
}
Texture2D.prototype = new Texture();
Texture2D.prototype.constructor = Texture2D;

function TextureCubeMap(srcPosX, srcNegX, srcPosY, srcNegY, srcPosZ, srcNegZ, gl) {
	var self         = this;
	var loaded       = false;
	var loadedImages = 0;
	var images       = {
		positiveX: null,
		negativeX: null,
		positiveY: null,
		negativeY: null,
		positiveZ: null,
		negativeZ: null
	};
	
	function bind(uSampler, uTextureMode, unit) {
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, self.texture);
		gl.uniform1i(uSampler, unit);		// tell sampler that our texture uses slot 'unit' (should be 0)
		gl.uniform1i(uTextureMode, 2);		// tell shader to use texture
	}
	
	function isLoaded() {
		return loaded;
	}
	
	function dispose() {
		gl.deleteTexture(this.texture);
	}
	
	function generateCubeMap() {
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, self.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		
		// not enough arguments??
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.positiveX);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.negativeX);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.positiveY);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.negativeY);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.positiveZ);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.negativeZ);

		gl.bindTexture(gl.TEXTURE_2D, null);
		
		loaded = true;
	}
	
	function imageLoaded() {
		console.log("Create cube map texture (" + loadedImages + ") ...");
		if (++loadedImages == 6) // all textures have been loaded
			generateCubeMap();
	}
	
	function loadImage(src, img) {
		img        = new Image();
		img.onload = imageLoaded;
		img.src    = src;
	}
	
	loadImage(srcPosX, images.positiveX);
	loadImage(srcNegX, images.negativeX);
	loadImage(srcPosY, images.positiveY);
	loadImage(srcNegY, images.negativeY);
	loadImage(srcPosZ, images.positiveZ);
	loadImage(srcNegZ, images.negativeZ);
	
	this.texture  = gl.createTexture();
	this.bind     = bind;
	this.isLoaded = isLoaded;
	this.dispose  = dispose;
}
TextureCubeMap.prototype = new Texture();
TextureCubeMap.prototype.constructor = TextureCubeMap;

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
		
		this.draw = function(aVertex, aNormal, aTexCoord, uSampler, uTextureMode){
			// activate vertex buffer
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
			gl.vertexAttribPointer(aVertex, this.vertexItemSize, gl.FLOAT, false, 0, 0);
			// activate normal buffer
			gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
			gl.vertexAttribPointer(aNormal, this.normalItemSize, gl.FLOAT, false, 0, 0);
			// activate texture (if available)
			if (this.hasTexture && this.texture.isLoaded()) {
				gl.enableVertexAttribArray(aTexCoord);	// activate texcoord buffer
			
				gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
				gl.vertexAttribPointer(aTexCoord, this.texCoordItemSize, gl.FLOAT, false, 0, 0);
			
				this.texture.bind(uSampler, uTextureMode, 0);
			} else {
				gl.disableVertexAttribArray(aTexCoord);
				gl.uniform1i(uTextureMode, 0);			// tell shader not to use texture
			}
			
			gl.drawArrays(gl.TRIANGLES, 0, this.numItems);
		};
		
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
		this.texture    = new Texture2D(src, gl);
		this.hasTexture = true;
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

/** class Skybox */
function Skybox(gl) {
	var self = this;
	
	this.loadTextureCube = function(srcPosX, srcNegX, srcPosY, srcNegY, srcPosZ, srcNegZ){
		this.texture    = new TextureCubeMap(srcPosX, srcNegX, srcPosY, srcNegY, srcPosZ, srcNegZ, gl);
		this.hasTexture = true;
	};
	
	// construction code
	var size     = 100.0;  // width = height
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
}
Skybox.prototype = new Mesh();
Skybox.prototype.constructor = Skybox;

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
	
