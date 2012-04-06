"use strict";

function checkErrors(gl, funcId) {
	var err = gl.getError();
	
	if (err != gl.NO_ERROR) {
		switch (err) {
			case gl.OUT_OF_MEMORY:
				console.error(funcId + ": out of memory!");
				break;		
			case gl.INVALID_ENUM:
				console.error(funcId + ": invalid enum!");
				break;
			case gl.INVALID_OPERATION:
				console.error(funcId + ": invalid operation!");
				break;
			case gl.INVALID_FRAMEBUFFER_OPERATION:
				console.error(funcId + ": invalid framebuffer operation!");
				break;
			case gl.INVALID_VALUE:
				console.error(funcId + ": invalid value!");
				break;
			case gl.CONTEXT_LOST_WEBGL:
				console.error(funcId + ": context lost!");
				break;
			default:
				console.error(funcId + ": unknown error!");
				break;
		}
		
		return true;
	}
	
	return false;
}
