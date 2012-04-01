"use strict";

var GameObject = function(name, mesh, x, y, i){
	this.name     = name;
	this.mesh     = mesh;
	this.x        = x;
	this.y        = y;
	this.selected = false;
	this.colorID  = new Float32Array([0.0, 0.0, (i == -1) ? 0.0 : (0.1+i*0.1), 1.0]); // allows only 10 different IDs
};

function Mesh(gl) {
	Mesh.numItems         = 36; // 6 vertices for each face (6)
	Mesh.vertexItemSize   = 3;
	Mesh.normalItemSize   = 3;
	Mesh.texCoordItemSize = 2;
	Mesh.elementBuffer    = null;
	Mesh.createElementBuffer = function(gl) {
		if (!Mesh.elementBuffer) {
			 var elements = [
			 	 0,  1,  2,    0,  2,  3, // +z
			 	 4,  5,  6,    4,  6,  7, // -x
			 	 8,  9, 10,    8, 10, 11, // -z
			 	12, 13, 14,   12, 14, 15, // +x
			 	16, 17, 18,   16, 18, 19, // +y
			 	20, 21, 22,   20, 22, 23  // -y
			 ];
			 
			 Mesh.elementBuffer = gl.createBuffer();
			 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Mesh.elementBuffer);
			 gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(elements), gl.STATIC_DRAW);
			 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		}
	};
	
	var gl;
	
	this.width;
	this.height;
	this.depth;
	this.texture;
	this.vertexBuffer;
	this.normalBuffer;
	this.texCoordBuffer;
	this.hasTexture;
	
	this.generateGeometry = function(glRef, geometry, createSkybox) {
		var vertices = [
			// +z
			geometry[0][0], geometry[0][1], geometry[0][2],
			geometry[1][0], geometry[1][1], geometry[1][2],
			geometry[2][0], geometry[2][1], geometry[2][2],
			geometry[3][0], geometry[3][1], geometry[3][2],
			// -x
			geometry[4][0], geometry[4][1], geometry[4][2],
			geometry[0][0], geometry[0][1], geometry[0][2],
			geometry[3][0], geometry[3][1], geometry[3][2],
			geometry[7][0], geometry[7][1], geometry[7][2],
			// -z
			geometry[5][0], geometry[5][1], geometry[5][2],
			geometry[4][0], geometry[4][1], geometry[4][2],
			geometry[7][0], geometry[7][1], geometry[7][2],
			geometry[6][0], geometry[6][1], geometry[6][2],
			// +x
			geometry[1][0], geometry[1][1], geometry[1][2],
			geometry[5][0], geometry[5][1], geometry[5][2],
			geometry[6][0], geometry[6][1], geometry[6][2],
			geometry[2][0], geometry[2][1], geometry[2][2],
			// +y
			geometry[4][0], geometry[4][1], geometry[4][2],
			geometry[5][0], geometry[5][1], geometry[5][2],
			geometry[1][0], geometry[1][1], geometry[1][2],
			geometry[0][0], geometry[0][1], geometry[0][2],
			// -y
			geometry[7][0], geometry[7][1], geometry[7][2],
			geometry[6][0], geometry[6][1], geometry[6][2],
			geometry[2][0], geometry[2][1], geometry[2][2],
			geometry[3][0], geometry[3][1], geometry[3][2]
		];
		var normals = [
			// +z
			 0.0,  0.0,  1.0,
			 0.0,  0.0,  1.0,
			 0.0,  0.0,  1.0,
			 0.0,  0.0,  1.0,
			// -x
			-1.0,  0.0,  0.0,
			-1.0,  0.0,  0.0,
			-1.0,  0.0,  0.0,
			-1.0,  0.0,  0.0,
			// -z
			 0.0,  0.0, -1.0,
			 0.0,  0.0, -1.0,
			 0.0,  0.0, -1.0,
			 0.0,  0.0, -1.0,
			// +x
			 1.0,  0.0,  0.0,
			 1.0,  0.0,  0.0,
			 1.0,  0.0,  0.0,
			 1.0,  0.0,  0.0,
			// +y
			 0.0,  1.0,  0.0,
			 0.0,  1.0,  0.0,
			 0.0,  1.0,  0.0,
			 0.0,  1.0,  0.0,
			// -y
			 0.0, -1.0,  0.0,
			 0.0, -1.0,  0.0,
			 0.0, -1.0,  0.0,
			 0.0, -1.0,  0.0
		];
		var texCoords = [
			// +z
			0.0,  1.0,
			1.0,  1.0,
			1.0,  0.0,
			0.0,  0.0,
			// -x
			0.0,  1.0,
			1.0,  1.0,
			1.0,  0.0,
			0.0,  0.0,
			// -z
			0.0,  1.0,
			1.0,  1.0,
			1.0,  0.0,
			0.0,  0.0,
			// +x
			0.0,  1.0,
			1.0,  1.0,
			1.0,  0.0,
			0.0,  0.0,
			// +y
			0.0,  1.0,
			1.0,  1.0,
			1.0,  0.0,
			0.0,  0.0,
			// -y
			0.0,  1.0,
			1.0,  1.0,
			1.0,  0.0,
			0.0,  0.0
		];
		
		gl = glRef;
		Mesh.createElementBuffer(gl); // is is only done once
		
		this.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		
		this.normalBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
		
		this.texCoordBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	};
	
	this.draw = function(aVertex, aNormal, aTexCoord, uSampler, uTextureMode){
		// activate vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.vertexAttribPointer(aVertex, Mesh.vertexItemSize, gl.FLOAT, false, 0, 0);
		// activate normal buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.vertexAttribPointer(aNormal, Mesh.normalItemSize, gl.FLOAT, false, 0, 0);
		// activate texture (if available)
		if (this.hasTexture && this.texture.isLoaded()) {
			gl.enableVertexAttribArray(aTexCoord);	// activate texcoord buffer
		
			gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
			gl.vertexAttribPointer(aTexCoord, Mesh.texCoordItemSize, gl.FLOAT, false, 0, 0);
		
			this.texture.bind(uSampler, uTextureMode, 0);
		} else {
			gl.disableVertexAttribArray(aTexCoord);
			gl.uniform1i(uTextureMode, 0);			// tell shader not to use texture
		}
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Mesh.elementBuffer);
		gl.drawElements(gl.TRIANGLES, Mesh.numItems, gl.UNSIGNED_SHORT, 0);
	};
	
	this.setTexture = function(src){
		this.texture    = new Texture2D(src, gl);
		this.hasTexture = true;
	};
	
	/** Frees all WebGL resources (except textures!) */
	this.dispose = function(){
		gl.deleteBuffer(this.vertexBuffer);
		gl.deleteBuffer(this.normalBuffer);
		gl.deleteBuffer(this.texCoordBuffer);
	};
	
	// construction code
	this.hasTexture = false;
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
	
	this.generateGeometry(gl, geometry, true);
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

	this.generateGeometry(gl, geometry, false);
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
	
	this.generateGeometry(gl, geometry, false);
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
	
	this.generateGeometry(gl, geometry, false);
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
	
	this.generateGeometry(gl, geometry, false);
};
Trigger.prototype = new Mesh();
Trigger.prototype.constructor = Trigger;
	
