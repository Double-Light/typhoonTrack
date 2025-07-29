// gifWorker.js

console.log("[Worker] loaded");

importScripts("./gif.js");


self.onmessage = async (e) => {
  const { type, svgBase, svgAnim, slideHTML, width, height, fps, duration, scale } = e.data;
  
  console.log(type);

  if (type === "start") {
    const totalFrames = Math.round(duration * fps);
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    const gif = new GIF({
      workers: 1,
      workerScript: "./gif.worker.js", // 建議使用 module 版本或 ES6 編譯版本
      width: scaledWidth,
      height: scaledHeight,
      quality: 10,
      dither: false,
    });

    const baseCanvas = await svgToCanvas(svgBase, scaledWidth, scaledHeight);
    const animCanvas = await svgToCanvas(svgAnim, scaledWidth, scaledHeight);

    const ctx = baseCanvas.getContext("2d");

    for (let i = 0; i < totalFrames; i++) {
      if (cancelRequested) return;

      ctx.clearRect(0, 0, scaledWidth, scaledHeight);
      ctx.drawImage(baseCanvas, 0, 0);
      ctx.drawImage(animCanvas, 0, 0);

      gif.addFrame(ctx, { copy: true, delay: 1000 / fps });

      const percent = Math.round((i / totalFrames) * 100);
      self.postMessage({ type: "progress", data: { percent } });
    }

    gif.on("finished", (blob) => {
      const totalTime = (performance.now() - startTime) / 1000;
      self.postMessage({ type: "done", data: { blob, time: totalTime } });
    });

    const startTime = performance.now();
    gif.render();
  }

  if (type === "cancel") {
    cancelRequested = true;
  }
}

let cancelRequested = false;

async function svgToCanvas(svgString, width, height) {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}
