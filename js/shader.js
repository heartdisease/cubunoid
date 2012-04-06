"use strict";

function Shader(gl, shaderLocation, shaderType) {
	this.shader = gl.createShader(shaderType);
	
	function compile() {
		gl.compileShader(this.shader);
		if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS))
			console.error(shaderLocation + ": " + gl.getShaderInfoLog(this.shader));
	}
	
	this.compile = compile;
	
	var shaderSource = Shader.loadShader(shaderLocation);
	if (shaderSource)
		gl.shaderSource(this.shader, shaderSource);
	else
		console.error("Cannot load shader source!");
}
Shader.loadShader = function(src) {
	var sid = document.getElementById(src);
	var shaderSource = null;
	
	if (sid) {
		shaderSource = sid.innerHTML;
	} else {
		// do ajax
	}
	
	// manage imports
	var imports = shaderSource.match(/#import <.*>/g);
	if (imports) {
		var importPath;
		var importSource;
		
		for (var i = 0; i < imports.length; i++) {
			importPath   = imports[i].substring(imports[i].indexOf('<')+1, imports[i].indexOf('>'));
			importSource = Shader.loadShader(importPath);
			if (importSource)
				shaderSource = shaderSource.replace(imports[i], importSource);
			else
				console.error("Cannot import shader \"" + importPath + "\"!");
		}
	}
	
	return shaderSource;
};

/**
 * Shader program. WebGL only supports one vertex and fragment shader
 * per program!
*/
function Program(gl, vertexShader, fragmentShader){
	var program = gl.createProgram();
	
	function link() {
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS))
			console.error(gl.getProgramInfoLog(program));
	}
	
	function use() {
		gl.useProgram(program);
	}
	
	function getAttribLocation(name) {
		return gl.getAttribLocation(program, name);
	}
	
	function getUniformLocation(name) {
		return gl.getUniformLocation(program, name);
	}
	
	this.link = link;
	this.use  = use;
	this.getAttribLocation  = getAttribLocation;
	this.getUniformLocation = getUniformLocation;
	
	gl.attachShader(program, vertexShader.shader);
	gl.attachShader(program, fragmentShader.shader);
}
