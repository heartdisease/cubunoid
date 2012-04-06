"use strict";

function Texture() {
	this.texture;
	
	this.bind;
	this.isLoaded;
	this.dispose;
}

var textureCanvas = document.createElement("canvas");

function createFloatTexture(img) {
	textureCanvas.width  = img.width;
	textureCanvas.height = img.height;
	
	var imageData;
	var context       = textureCanvas.getContext("2d");
	var floatTexture  = new Float32Array(img.width * img.height * 4); // 4 channels (RGBA)
	
	context.drawImage(img, 0, 0);
	imageData = context.getImageData(0, 0, img.width, img.height);
	for (var i = 0; i < imageData.data.length; ++i)
		floatTexture[i] = (imageData.data[i] / 255) * 1.3;
	
	return floatTexture;
}

function Texture2D(src, type, gl) {
	var self    = this;
	var loaded  = false;
	var image   = new Image();
	
	function isLoaded() {
		return loaded;
	}
	
	function dispose() {
		gl.deleteTexture(self.texture);
	}
	
	function bind(unit) {
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, self.texture);
	}
	
	image.onload = function(){
		console.log("Create texture (" + image.width + "x" + image.height + ") ...");
		
		gl.bindTexture(gl.TEXTURE_2D, self.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); //gl.CLAMP_TO_EDGE
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		if (type == gl.FLOAT) {
			var floatTexture = createFloatTexture(image);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.FLOAT, floatTexture);
			
			if (!checkErrors(gl))
				console.log("Successfully loaded float texture.");
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, type, image);
		}
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
		
		checkErrors(gl, "Texture2D::image.onload()");
	
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

function TextureCubeMap(srcPosX, srcNegX, srcPosY, srcNegY, srcPosZ, srcNegZ, type, gl) {
	var self         = this;
	var loaded       = false;
	var loadedImages = 0;
	var images       = {
		positiveX: new Image(),
		negativeX: new Image(),
		positiveY: new Image(),
		negativeY: new Image(),
		positiveZ: new Image(),
		negativeZ: new Image()
	};
	
	function bind(unit) {
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, self.texture);
	}
	
	function isLoaded() {
		return loaded;
	}
	
	function dispose() {
		gl.deleteTexture(self.texture);
	}
	
	function glTexImage2D(target, level, internalformat, format, type, image) {
		if (type == gl.FLOAT) {
			var floatTexture = createFloatTexture(image);
			
			gl.texImage2D(target, level, internalformat, image.width, image.height, 0, format, type, floatTexture);
			if (!checkErrors(gl, "TextureCubeMap::glTexImage2D("+image.src+")"))
				console.log("Successfully converted '" + image.src + "' to float texture.");
		} else {
			gl.texImage2D(target, level, internalformat, format, type, image);
		}
	}
	
	function generateCubeMap() {
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, self.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		
		// JS says 'not enough arguments' if image is null!
		// glTexImage2D() is a customized function which supports float texture conversion
		glTexImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, type, images.positiveX);
		glTexImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, type, images.negativeX);
		glTexImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, type, images.positiveY);
		glTexImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, type, images.negativeY);
		glTexImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, type, images.positiveZ);
		glTexImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, type, images.negativeZ);

		gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
		
		checkErrors(gl, "TextureCubeMap::generateCubeMap()");
		
		loaded = true;
	}
	
	function imageLoaded() {
		console.log("Create cube map texture (" + loadedImages + ") ...");
		if (++loadedImages == 6) // all textures have been loaded
			generateCubeMap();
	}
	
	function loadImage(src, img) {
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

function FrameBuffer(gl, width, height, internalformat, type) {
	var frameBuffer  = gl.createFramebuffer();
	var renderBuffer = gl.createRenderbuffer();
	var texture      = gl.createTexture();
	
	function setupFrameBuffer() {
		// bind frame buffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		gl.viewport(0, 0, width, height);
		// bind render buffer
		gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, internalformat, width, height);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);
		// bind texture
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		// unbind everthing
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		
		checkErrors(gl, "FrameBuffer::setupFrameBuffer()");
	}
	
	function dispose() {
		if (texture)
			gl.deleteTexture(texture);
		if (renderBuffer)
			gl.deleteRenderbuffer(renderBuffer);
		if (frameBuffer)
			gl.deleteFramebuffer(frameBuffer);
	}
	
	function resize(newWidth, newHeight) {
		width  = newWidth;
		height = newHeight;
		
		setupFrameBuffer();
	}
	
	function bind() {
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
	}
	
	function unbind() {
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}
	
	function readPixel(x, y) {
		var pixelData = new Uint8Array(4);
		// in WebGL 1.0 readPixels only works with UNSIGNED_BYTE!
		// IMPORTANT NOTE: frame buffers store pixels vertically mirrored!
		gl.readPixels(x, (height - y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
		
		return pixelData;
	}
	
	this.dispose   = dispose;
	this.resize    = resize;
	this.bind      = bind;
	this.unbind    = unbind;
	this.readPixel = readPixel;
	
	setupFrameBuffer();
}
