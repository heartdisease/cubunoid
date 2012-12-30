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
 * @copyright 2011 Christoph Matscheko
 * @license
*/

"use strict";

function GameObject(name, mesh, x, y, i) {
	this.name     = name;
	this.mesh     = mesh;
	this.x        = x;
	this.y        = y;
	this.selected = false;
	this.colorID  = new Float32Array([0.0, 0.0, (i == -1) ? 0.0 : (0.1+i*0.1), 1.0]); // allows only 10 different IDs
}

function Mesh(gl) {
	var self = this;
	
	this.width;
	this.height;
	this.depth;
	this.texture;
	this.vertexBuffer;
	this.normalBuffer;
	this.texCoordBuffer;
	this.hasTexture;
	
	function generateGeometry(geometry, verticesOnly) {		
		console.info("genGeom: " + gl);
		
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
		if (!verticesOnly) {
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
			
			self.normalBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, self.normalBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
		
			self.texCoordBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, self.texCoordBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		}
		
		Mesh.createElementBuffer(gl); // is is only done once
		
		self.vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}
	
	function draw(aVertex, aNormal, aTexCoord, uSampler, uUseTexture) {
		// activate vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexBuffer);
		gl.vertexAttribPointer(aVertex, Mesh.vertexItemSize, gl.FLOAT, false, 0, 0);
		// activate normal buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, self.normalBuffer);
		gl.vertexAttribPointer(aNormal, Mesh.normalItemSize, gl.FLOAT, false, 0, 0);
		// activate texture (if available)
		if (self.hasTexture && self.texture.isLoaded()) {
			gl.enableVertexAttribArray(aTexCoord);	// activate texcoord buffer
		
			gl.bindBuffer(gl.ARRAY_BUFFER, self.texCoordBuffer);
			gl.vertexAttribPointer(aTexCoord, Mesh.texCoordItemSize, gl.FLOAT, false, 0, 0);
		
			self.texture.bind(0);			// bind texture to slot 0
			gl.uniform1i(uSampler, 0);		// tell sampler that our texture uses slot 0
			gl.uniform1i(uUseTexture, 1);	// tell shader to use texture
		} else {
			//gl.disableVertexAttribArray(aTexCoord);
			gl.uniform1i(uUseTexture, 0);	// tell shader not to use texture
		}
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Mesh.elementBuffer);
		gl.drawElements(gl.TRIANGLES, Mesh.numItems, gl.UNSIGNED_SHORT, 0);
	}
	
	function setTexture(src, type) {
		self.texture    = new Texture2D(gl, src, type);
		self.hasTexture = true;
	}
	
	/** Frees all WebGL resources (except textures!) */
	function dispose() {
		gl.deleteBuffer(self.vertexBuffer);
		gl.deleteBuffer(self.normalBuffer);
		gl.deleteBuffer(self.texCoordBuffer);
	}
	
	// public variables
	this.hasTexture       = false;
	// public member functions
	this.generateGeometry = generateGeometry;
	this.setTexture       = setTexture;
	this.draw             = draw;
	this.dispose          = dispose;
}
Mesh.numItems            = 36; // 6 vertices for each face (6)
Mesh.vertexItemSize      = 3;
Mesh.normalItemSize      = 3;
Mesh.texCoordItemSize    = 2;
Mesh.elementBuffer       = null;
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

/** class Skybox */
function Skybox(gl, srcPosX, srcNegX, srcPosY, srcNegY, srcPosZ, srcNegZ, type) {
	Mesh.call(this, gl);
	
	var self     = this;
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
	
	// @Override
	function draw(aVertex, uSamplerCube, uUseTexture) {
		// activate vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexBuffer);
		gl.vertexAttribPointer(aVertex, Mesh.vertexItemSize, gl.FLOAT, false, 0, 0);
		// activate texture (if available)
		if (self.hasTexture && self.texture.isLoaded()) {
			self.texture.bind(1);			// bind texture to slot 1
			gl.uniform1i(uSamplerCube, 1);	// tell sampler that our texture is in slot 1
			gl.uniform1i(uUseTexture, 1);	// tell shader to use texture
		} else {
			gl.uniform1i(uUseTexture, 0);	// tell shader not to use texture
		}
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Mesh.elementBuffer);
		gl.drawElements(gl.TRIANGLES, Mesh.numItems, gl.UNSIGNED_SHORT, 0);
	}
	
	// public variables
	this.width  = size;
	this.height = size;
	this.depth  = size;
	// public member functions
	this.draw   = draw;
	
	// construction code
	this.texture    = new TextureCubeMap(gl, srcPosX, srcNegX, srcPosY, srcNegY, srcPosZ, srcNegZ, type);
	this.hasTexture = true;
	
	this.generateGeometry(geometry, true);
}
Skybox.prototype = new Mesh();
Skybox.prototype.constructor = Skybox;

function Platform(gl, width, height){	
	Mesh.call(this, gl);
	
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
	
	// construction code
	this.width  = width;
	this.height = height;
	this.depth  = depth;

	this.generateGeometry(geometry, false);
}
Platform.prototype = new Mesh();
Platform.prototype.constructor = Platform;

function Box(gl){	
	Mesh.call(this, gl);
	
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
	
	this.generateGeometry(geometry, false);
}
Box.prototype = new Mesh();
Box.prototype.constructor = Box;

function Concrete(gl) {
	Mesh.call(this, gl);
	
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
	
	this.generateGeometry(geometry, false);
}
Concrete.prototype = new Mesh();
Concrete.prototype.constructor = Concrete;

function Trigger(gl) {	
	Mesh.call(this, gl);
	
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
	
	this.generateGeometry(geometry, false);
}
Trigger.prototype = new Mesh();
Trigger.prototype.constructor = Trigger;
	
