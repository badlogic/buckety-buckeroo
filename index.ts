export interface StringMap<T> {
	[key: string]: T;
}

function updateCanvasRenderBufferSize(canvas: HTMLCanvasElement) {
	let dpr = window.devicePixelRatio;
	let w = canvas.clientWidth * dpr;
	let h = canvas.clientHeight * dpr;
	if (canvas.width != w || canvas.height != h) {
		canvas.width = canvas.clientWidth * dpr;
		canvas.height = canvas.clientHeight * dpr;
	}
}

