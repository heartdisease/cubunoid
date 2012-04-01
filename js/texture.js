"use strict";

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

// TODO: use own shader program for cube map!
function TextureCubeMap(srcPosX, srcNegX, srcPosY, srcNegY, srcPosZ, srcNegZ, gl) {
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
	
	function bind(uSampler, uTextureMode, unit) {
		gl.activeTexture(gl.TEXTURE1 + unit);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, self.texture);
		gl.uniform1i(uSampler, unit+1);		// tell sampler that our texture uses slot 'unit' (should be 1)
		gl.uniform1i(uTextureMode, 2);		// tell shader to use texture
	}
	
	function isLoaded() {
		return loaded;
	}
	
	function dispose() {
		gl.deleteTexture(self.texture);
	}
	
	function generateCubeMap() {
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, self.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		
		// JS says 'not enough arguments' if image is null!
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.positiveX);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.negativeX);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.positiveY);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.negativeY);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.positiveZ);
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.negativeZ);

		gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
		
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

function FrameBuffer(gl, width, height) {
	var frameBuffer  = gl.createFramebuffer();
	var renderBuffer = gl.createRenderbuffer();
	var texture      = gl.createTexture();
	
	function setupFrameBuffer() {
		// bind frame buffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		gl.viewport(0, 0, width, height); // set viewport for framebuffer
		// bind render buffer
		gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height); // configure render buffer with 16bit depth and apply it to frame buffer
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);
		// bind texture
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		// unbind everthing
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
