function updateCanvasRenderBufferSize(canvas: HTMLCanvasElement) {
	let dpr = window.devicePixelRatio;
	let w = canvas.clientWidth * dpr;
	let h = canvas.clientHeight * dpr;
	if (canvas.width != w || canvas.height != h) {
		canvas.width = canvas.clientWidth * dpr;
		canvas.height = canvas.clientHeight * dpr;
	}
}

export interface HistogramBucket {
	value: number;
	count: number;
}

export class Histogram {
	buckets: HistogramBucket[] = [];
	totalCount = 0;

	constructor (public readonly numBuckets = 64) {
	}

	addSample(value: number) {
		let buckets = this.buckets;
		this.totalCount++;

		for (let i = 0; i < buckets.length; i++) {
			let bucket = buckets[i];
			if (bucket.value == value) {
				bucket.count++;
				return;
			}

			if (bucket.value > value) {
				this.insertSorted(value);
				this.trim();
				return;
			}
		}

		this.buckets.push({ value: value, count: 1 });
		this.trim();
	}

	quantile(quantile: number) {
		let buckets = this.buckets;
		let count = quantile * this.totalCount;
		for (let i = 0; i < buckets.length; i++) {
			count -= buckets[i].count;
			if (count <= 0) {
				return buckets[i].value;
			}
		}
		return -1;
	}

	private insertSorted(value: number) {
		let buckets = this.buckets;
		let min = 0;
		let max = buckets.length;
		var index = Math.floor((min + max) / 2);
		while (max > min) {
			let arrayValue = buckets[index].value;
			if (value < arrayValue) {
				max = index;
			} else {
				min = index + 1;
			}
			index = Math.floor((min + max) / 2);
		}
		buckets.splice(index, 0, { value: value, count: 1 });
	};

	private trim() {
		let buckets = this.buckets;
		while (buckets.length > this.numBuckets) {

			let minDelta = Number.POSITIVE_INFINITY;
			let minIndex = 0;

			for (let i = 0; i < buckets.length; i++) {
				if (i == 0) continue;
				let delta = buckets[i].value - buckets[i - 1].value;
				if (delta < minDelta) {
					minDelta = delta;
					minIndex = i;
				}
			}

			let totalCount = buckets[minIndex - 1].count + buckets[minIndex].count;
			buckets[minIndex] = {
				value: (buckets[minIndex - 1].value * buckets[minIndex - 1].count + buckets[minIndex].value * buckets[minIndex].count) / totalCount,
				count: totalCount
			}
			buckets.splice(minIndex - 1, 1);
		}
	}
}

export interface HistogramChartConfig {
	histogram: Histogram,
	padding?: number,
	backgroundColor?: string,
	barColor?: string,
	hoverBarColor?: string,
	showInfoOnHover?: boolean,
	infoColor?: string
	infoSize?: number
}

export class HistogramChart {
	private ctx: CanvasRenderingContext2D;
	private mouseX;

	constructor (public canvas: HTMLCanvasElement, public config: HistogramChartConfig) {
		if (!config.padding) config.padding = 18;
		if (!config.backgroundColor) config.backgroundColor = "lightgray";
		if (!config.barColor) config.barColor = "lightgreen";
		if (!config.hoverBarColor) config.hoverBarColor = "green";
		if (config.showInfoOnHover == undefined) config.showInfoOnHover = true;
		if (!config.infoColor) config.infoColor = "black";
		if (config.infoSize == undefined) config.infoSize = 18;
		this.ctx = canvas.getContext("2d");

		canvas.addEventListener("mousemove", e => {
			this.mouseX = e.offsetX / canvas.clientWidth * canvas.width;
		});
	}

	render() {
		updateCanvasRenderBufferSize(this.canvas);
		let ctx = this.ctx;
		let hist = this.config.histogram;
		let buckets = hist.buckets;
		let w = this.canvas.width;
		let h = this.canvas.height;
		let padding = this.config.padding;

		let minCount = Number.POSITIVE_INFINITY;
		let maxCount = Number.NEGATIVE_INFINITY;
		for (let bucket of buckets) {
			minCount = Math.min(minCount, bucket.count);
			maxCount = Math.max(maxCount, bucket.count);
		}
		let bucketWidth = (w - padding * 2) / buckets.length;
		let bucketHeightScale = (h - padding * 2) / maxCount;

		let mouseHoverBucket = buckets[Math.floor(Math.max(padding, Math.min(w - padding, this.mouseX)) / bucketWidth)];
		if (this.mouseX < padding) mouseHoverBucket = null;

		ctx.fillStyle = this.config.backgroundColor;
		ctx.fillRect(0, 0, w, h);

		let x = padding;
		for (let i = 0; i < buckets.length; i++, x += bucketWidth) {
			let bucket = buckets[i];
			let bucketHeight = bucket.count * bucketHeightScale;
			if (bucket == mouseHoverBucket) ctx.fillStyle = this.config.hoverBarColor;
			else ctx.fillStyle = this.config.barColor;
			ctx.fillRect(x, h - bucketHeight, bucketWidth, bucketHeight);
		}

		if (mouseHoverBucket) {
			let fontSize = this.config.infoSize * window.devicePixelRatio;
			ctx.font = `${fontSize}px Arial`;
			ctx.fillStyle = this.config.infoColor;
			ctx.fillText(`value: ${mouseHoverBucket.value}`, padding, padding + fontSize);
			ctx.fillText(`count: ${mouseHoverBucket.count}`, padding, padding + fontSize * 2);
		}
	}
}