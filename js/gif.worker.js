importScripts("./js/gif.js");

self.onmessage = async (e) => {
  const msg = e.data;
  if (msg.type === "cancel") {
    self.cancelled = true;
    return;
  }

  if (msg.type !== "start") return;

  const {
    svgBase, svgAnim, slideHTML,
    width, height, fps, duration, scale
  } = msg;

  const totalFrames = duration * fps;
  const gif = new GIF({
    workers: 2,
    quality: 2,
    width: width * scale,
    height: height * scale,
    workerScript: "./js/gif.worker.js"
  });

  const parseSvgToCanvas = async (svgStr) => {
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = await loadImage(url);
    const canvas = new OffscreenCanvas(width * scale, height * scale);
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    return canvas;
  };

  const parseHtmlToCanvas = async (htmlStr) => {
    const blob = new Blob(
      [`<html><body style="margin:0">${htmlStr}</body></html>`],
      { type: "text/html" }
    );
    const url = URL.createObjectURL(blob);
    const img = await loadImage(url);
    const canvas = new OffscreenCanvas(width * scale, height * scale);
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    return canvas;
  };

  const loadImage = (url) =>
    new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.src = url;
    });

  const baseCanvas = await parseSvgToCanvas(svgBase);
  const topCanvas = await parseHtmlToCanvas(slideHTML);

  const tStart = performance.now();
  let lastHash = "";

  for (let frame = 0; frame <= totalFrames; frame++) {
    if (self.cancelled) return;

    const svgFrame = svgAnim.replace("{{tau}}", frame);

    const animCanvas = await parseSvgToCanvas(svgFrame);

    const merged = new OffscreenCanvas(width * scale, height * scale);
    const ctx = merged.getContext("2d");
    ctx.drawImage(baseCanvas, 0, 0);
    ctx.drawImage(animCanvas, 0, 0);
    ctx.drawImage(topCanvas, 0, 0);

    const hash = await hashCanvas(merged);
    if (hash === lastHash) continue;
    lastHash = hash;

    gif.addFrame(ctx, { copy: true, delay: 1000 / fps });

    self.postMessage({ type: "progress", data: { percent: Math.round((frame / totalFrames) * 100) } });
  }

  gif.on("finished", (blob) => {
    const tEnd = performance.now();
    self.postMessage({ type: "done", data: { blob, time: (tEnd - tStart) / 1000 } });
  });

  gif.render();
};

async function hashCanvas(canvas) {
  const bitmap = await canvas.transferToImageBitmap();
  const tempCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = tempCanvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;

  let hash = 0;
  for (let i = 0; i < data.length; i += 4) {
    hash = ((hash << 5) - hash) + data[i];
    hash |= 0;
  }
  return hash.toString();
}
