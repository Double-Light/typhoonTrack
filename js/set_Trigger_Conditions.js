// https://pjchender.dev/html/html-svg-drag-drop-3/

// 初始化觸發條件 (SVG拖曳縮放、 經緯度範圍顯示、 編輯/拖曳模式切換、 全螢幕切換)
setTriggerConditions = function() {  
  // 1. SVG拖曳縮放
  // 啟用SVG拖曳縮放
  enableMapDragZoom();
  
  // 2. 指定經緯度範圍顯示區塊
  currentViewBox = document.getElementById('showDomainRange')
  currentPoint = document.getElementById('showLatLon')

  // 監聽滑鼠進入SVG元素
  svg.addEventListener('mouseenter', function() {
    // 顯示currentPoint元素
    currentPoint.style.display = 'block';
  });

  // 監聽滑鼠離開SVG元素
  svg.addEventListener('mouseleave', function() {
    // 隱藏currentPoint元素
    currentPoint.style.display = 'none';
  });

  // 更新 經緯度範圍 資訊
  showViewBox();
  
  // 3. 編輯/拖曳模式切換按鈕
  $("#btn_edit").on("click", function () {
    const $btn = $(this);
    const mode = $btn.attr("type");

    // 按鈕切換
    if (mode === "svg-drag-zoom") {         // 進入編輯模式
      console.log("切換成編輯模式");
      $btn.attr("type", "shape-edit");
      $btn.attr("title", "物件編輯模式");
      $("#TrackFcst").addClass("editMode");
      $("#TrackFcst").removeClass("dragMode");
      
      // 移動到 <svg> 最後一層（即 foreignObject 上層）
      $("g#warning_range").appendTo(svg);
    } else {                                 // 返回地圖拖曳
      console.log("切換成地圖拖曳縮放模式");
      $btn.attr("type", "svg-drag-zoom");
      $btn.attr("title", "地圖拖曳縮放模式");
      $("#TrackFcst").addClass("dragMode");
      $("#TrackFcst").removeClass("editMode");
      $("#shpObjs").appendTo(svg)
    }

    setEditModel()   // 設定編輯模式
    setDragRange()   // 設定區塊拖曳範圍
  });
  
  // 4. 標記放大/縮小按鈕
  $("#btn_markLarge").on("click", function () {
    let fontSize = parseFloat($("g#warning_marks").css("font-size"))
    setWarningMarksSize(fontSize+=1)
  });
  
  $("#btn_markSmall").on("click", function () {
    let fontSize = parseFloat($("g#warning_marks").css("font-size"))
    setWarningMarksSize(fontSize-=1)
  });
  
  // 5. 全螢幕切換、視窗變化
  const $zoom = $("#track-zoom");
  const $control = $("#editor-panel");
  const $overlay = $("#Modal");

  function resizeSlide() {
    const $slide = $("#slideObj");
    const baseWidth = $slide.innerWidth();
    const baseHeight = $slide.innerHeight();

    if (!document.fullscreenElement) {
      $slide.css({
        "transform": "scale(1)",
        "margin": "0 auto",
        "background": ""
      });
      $zoom.css("border", "");
      $slide.removeClass("fullscreen");
      $control.removeClass("show");
      $slide[0].removeEventListener("mousemove", showCtrlPanel, false);
    } else {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // 計算等比例縮放
      const scale = Math.min(screenWidth / baseWidth, screenHeight / baseHeight);

      $slide.css({
        "transform": `scale(${scale})`,
        "transform-origin": "center center",
        "margin": "auto",
        "background": "black"   // 黑底
      });

      $zoom.css("border", "none");
      $slide.addClass("fullscreen");
      $slide[0].addEventListener("mousemove", showCtrlPanel, false);
    }

    setDragRange();
  }


  // 滑鼠移至螢幕下緣時顯示控制面板
  function showCtrlPanel(e) {
    const threshold = 80;
    const fromBottom = window.innerHeight - e.clientY;

    if (fromBottom < threshold) {
      $control.addClass('show');
    } else {
      $control.removeClass('show');
    }
  }

  $("#btn_fullscreen").on("click", () => {
    const el = $zoom[0];
    // console.log("#btn_fullscreen on click");
    if (!document.fullscreenElement) {
      $overlay.appendTo($zoom); // 先移進全螢幕容器
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
      
      // 切換成地圖拖曳縮放
      // console.log("切換成地圖拖曳縮放");
      $("#btn_edit").attr("title","地圖拖曳縮放")
      $("#btn_edit").attr("type", "svg-drag-zoom");
      $("#TrackFcst").addClass("dragMode");
      $("#TrackFcst").removeClass("editMode");
      $("#shpObjs").appendTo(svg)
      setEditModel();  // 設定編輯模式
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
      $overlay.appendTo($("body"));
    }
    // setDragRange()   // 設定區塊拖曳範圍
  });
  
  const $hint = $("#fullscreenHint");

  $(document).on("fullscreenchange", () => {
    // console.log("on fullscreenchange");
    if (document.fullscreenElement === $zoom[0]) {
      $hint.show();
      $control.addClass("show");
      setTimeout(() => {
        $hint.fadeOut();
        $control.removeClass("show");
      }, 3000);
      // resizeSlide();
    } else {
      $overlay.appendTo($("body"));
      $("#slideObj").css("transform", "scale(1)");
      $zoom.css("border", "");
    }
  });
  
  // 監聽視窗大小變化事件 
  $(window).on("resize", resizeSlide);
  
  // 監聽視窗大小變化事件 --> 重設 keypoint 拖動
  // $(window).on("resize", setEditModel());
  
  // 6. 動畫控制(啟用/停用、播放/暫停)
  // 啟用/停用動畫按鈕
  $("#btn_animsEnable").on("change", () => {
    setTcAnimate()
    toggleAnimEnable()
  });

  // 播放/暫停動畫按鈕
  $("#btn_animsPlayPause").on("click", () => {
    toggleAnimState()
  });
  
  // 上一個/下一個位置按鈕
  $("#btn-back-point").on("click", () => {
    setTcAnimate("go-back-point")
  });
  
  $("#btn-next-point").on("click", () => {
    setTcAnimate("go-next-point")
  });
  
  $(document).on("keydown", function(e) {
    // 如果動畫功能是「未啟用」狀態時
    if (!$("#btn_animsEnable").prop("checked")) {
      if (e.key === "ArrowLeft") {
        setTcAnimate("go-back-point");
      } else if (e.key === "ArrowRight") {
        setTcAnimate("go-next-point");
      }
    }
  });

  // 7. 下載功能
  // 點擊 #slide_production 時，打開 Modal 並顯示選項
  $("#slide_production").on("click", function() {
    $("#Modal").show();          // 顯示 Modal
    $("#productContent").show(); // 顯示選項
    $("#progressContent").hide();// 隱藏進度條
    $("#modalStopBtn").hide();   // 隱藏中斷按鈕
  });

  // $("#slide_production").on("click", () => captureSlide("pdf"));
  $("#btn_screenshot").on("click", () => captureSlide("clipboard"));
  $("#btn_download_png").on("click", () => captureSlide("png-capture"));
  $("#btn_download_gif").on("click", () => captureSlide("gif-capture"));
  $("#btn_download_svg").on("click", () => exportAsSvg());
  
  // 8. Modal
  
  // 中斷按鈕
  $("#modalStopBtn").off("click").on("click", () => {
    cancelProgress = true;
    $("#progressText").text("已中斷");
    $("#modalCancelBtn").show();
    $("#modalStopBtn").hide();
    $("#modalDoneBtn").prop("disabled", false);
  });

  // . 啟用區段動畫
  // $("#keypoint-content .warning-text-Estimate").on("click", function () {
    // console.log($(this).attr("name"))
    // setTcAnimate($(this).attr("name"))
  // });
};

// === 下載功能 ===

// === 全域設定 ===
let segments = [];
let canvasDict = [];
let myImages = [];


// === 主程式 ===
async function captureSlide(mode = "clipboard") {
  console.log("[captureSlide] 執行下載模式：", mode);
  const tStart = performance.now();

  $("#editor-panel").hide();

  if ($("#slideObj").length === 0) {
    alert("未找到 #slideObj，無法截圖！");
    return;
  }
  
  cancelProgress = false;          // 中斷執行
  let showProgress =false          // 顯示進度條
  let layerType = "SingleLayer"    // 擷取影像方式(圖層類型)
  if (mode.includes("gif") || mode.includes("ppt")) { layerType = "ThreeLayer"}
  if (!["clipboard", "png-capture"].includes(mode)) { showProgress =true}
  
  const scaleFactor = 2.666667;
  const fileName = `${$("#slide-title").text().trim().replace("路徑預測示意圖","")}路徑預測示意圖_${moment($("select#trackFcstList option:selected").val()).format("DD日HH時")}`;
  
  // 進度條初始設定
  if (showProgress) {
    $("#productContent").hide();
    $("#progressText").text("正在處理圖層...");
    $("#progressBar").css("width", "0%");
    $("#progressContent").removeClass("wrong").show();
    $("#modalCancelBtn").hide();
    $("#modalStopBtn").show();
    $("#modalDoneBtn").prop("disabled", true);
    $("#Modal").show();
  }

  // === Step A: 設定 segments ===
  try {
    segments = buildSegments(mode);
    if (!segments || segments.length === 0) {
      throw new Error("segments 無效，請檢查輸入資料");
    }
    console.log("[captureSlide] segments:", segments);
  } catch (err) {
    console.error("[captureSlide] 建立 segments 發生錯誤：", err);
    // alert("無法建立分段設定！詳細請見 console log。");
    
    // 錯誤回報
    $("#progressContent").addClass("wrong");
    $("#progressText").text("分段設定出錯！詳情請見log");
    $("#modalCancelBtn").show();
    $("#modalStopBtn").hide();
    $("#modalDoneBtn").prop("disabled", false);
    
    $("#editor-panel").show();
    return;
  }
  
  // === Step B: 影像處理 ===
  try {
    myImages = await handleImage(mode,layerType,scaleFactor);
    console.log("[captureSlide] 影像處理完成，myImages數量:", myImages.length);
  } catch (err) {
    console.error("[captureSlide] 截圖錯誤：", err);
    // alert("截圖發生錯誤！詳細請見 console log。");
    // ["#baseDiv", "#animDiv", "#topDiv", "#canvasDiv"].forEach(sel => $(sel).remove());
    $("#canvasDivs").empty()  // 清空canvasDiv
    
    // 錯誤回報
    $("#progressContent").addClass("wrong");
    $("#progressText").text("截圖發生錯誤！詳情請見log");
    $("#modalCancelBtn").show();
    $("#modalStopBtn").hide();
    $("#modalDoneBtn").prop("disabled", false);
    
    $("#editor-panel").show();
    return
  } 

  // === Step C: 檔案輸出 ===
  try {
    if (["clipboard", "png-capture", "png", "png-split", "pdf", "pdf-split","gif", "gif-split", "gif-capture", "ppt", "ppt-split", "ppt-gif", "ppt-gif-split"].includes(mode)) {
      await exportFile(mode, myImages, fileName, scaleFactor) // 依 mode 匯出
      
      // 計算費時
      const tEnd = performance.now();
      const seconds = ((tEnd - tStart) / 1000).toFixed(1);
      $("#progressBar").css("width", "100%");
      $("#progressText").text(`下載完成，用時 ${seconds} 秒`);
      console.log(`[captureSlide] 完成，耗時 ${Math.round(performance.now() - tStart)}ms`);
    } else {
      console.warn("[captureSlide] 未知模式：", mode);
    }
  } catch (err) {
    console.error("[captureSlide] 檔案輸出錯誤：", err);
    // alert("檔案輸出發生錯誤！詳細請見 console log。");
    
    // 錯誤回報
    $("#progressContent").addClass("wrong");
    $("#progressText").text("檔案輸出錯誤！詳情請見log");

  } finally {
    // ["#baseDiv", "#animDiv", "#topDiv", "#canvasDiv"].forEach(sel => $(sel).remove());
    $("#canvasDivs").empty()  // 清空canvasDiv
    
    $("#modalCancelBtn").show();
    $("#modalStopBtn").hide();
    $("#modalDoneBtn").prop("disabled", false);
    $("#editor-panel").show();
  }
}

// === Step A: 建立 segments ===
function buildSegments(mode) {
  if (mode.includes("gif")) {
    const [tauStart, tauEnd] = [xPData[0].tau, xPData.at(-1).tau];                     // 預報起訖時段
    const splitTau = warning_data.filter(item => item.tau > 0).map(item => item.tau);  // 分段時間點

    if (mode.includes("gif-split")) {     // 回傳分段時間點
      return [
        [tauStart, splitTau[0]],
        ...splitTau.map((t, i) => i < splitTau.length - 1 ? [t, splitTau[i + 1]] : null).filter(Boolean),
        [splitTau.at(-1), tauEnd]
      ];
    } else if (mode.includes("gif-capture")) {
      return [aniParas.tauRange];   // 動畫時間範圍
    } else {
      return [[tauStart, tauEnd]];  // 回傳起訖預報時段
    }
  } else {  // 非GIF ==> segments = [tau1,tau2...]
    // 為"clipboard" 或 "png-capture" ==> 擷取時間軸當下畫面
    if (["clipboard", "png-capture"].includes(mode)) {
      if ($("#btn_animsEnable").prop("checked")) {
        return [Math.min(aniParas.tauRange[0] + (svg.getCurrentTime() / aniParas.dur) % 1 * (aniParas.tauRange[1] + aniParas.pauseSec * perHr - aniParas.tauRange[0]), aniParas.tauRange[1])];  // 動畫模式當下時間點
      } else {
        return [parseInt($("#slideObj").find("#tc_circle").attr("tau")) || 0];  // 靜態模式時間點
      }
    } else if (mode.includes("split")) { // 回傳分段時間點
      let segs = warning_data.filter(item => item.tau >= 0).map(item => item.tau);
      if (segs[0] > 0) segs = [0, ...segs]; // 起始設為0
      return segs;
    } else {
      return [0];
    }
  }
}

// === Step B: 影像處理 ===
async function handleImage(mode,layerType,scaleFactor){
  let myImages = []
  
  $("#canvasDivs").css("width",$("#slideObj").width()).css("height",$("#slideObj").height())

  // console.log(`開始影像處理:`, mode,layerType,scaleFactor);
  
  // Step 1: 建立 Canvas Div
  if (layerType === "SingleLayer") {
    if ($("select#map_theme_type option:selected").val() === "Satellite_Map"){
      const $bottomDiv = await makeCanvasDiv_Bottom()
      const $canvasDiv = await makeCanvasDiv("canvasDiv",$("#slideObj #svgObj"),"g#bottom, foreignObject, animate",$("#slideShps"))
    } else {
      const $canvasDiv = await makeCanvasDiv("canvasDiv",$("#slideObj #svgObj"),"foreignObject, animate",$("#slideShps"))
    }
  } else if (layerType === "ThreeLayer") {  // 將截圖區分為三層：底圖層（baseLayer）、動畫層（animLayer）、 標題層（topLayer
    // 1. 底圖層（baseLayer）：為SVG內不變動的部分。複製 svg 並移除變動部分、foreignObject與animate
    if ($("select#map_theme_type option:selected").val() === "Satellite_Map"){
      const $bottomDiv = await makeCanvasDiv_Bottom()
      const $baseDiv = await makeCanvasDiv("baseDiv",$("#slideObj #svgObj"),"g#bottom, g#warning_marks .mark-fcst, g#tc_circle, foreignObject, animate")
    } else {
      const $baseDiv = await makeCanvasDiv("baseDiv",$("#slideObj #svgObj"),"g#warning_marks .mark-fcst, g#tc_circle, foreignObject, animate")
    }

    // 2. 動畫層（animLayer）：僅保留SVG內會變動的部分(只留下 #warning_marks .mark-fcst 與  #tc_circle)
    const $animDiv = await makeCanvasDiv("animDiv",$("#slideObj #svgObj"),"defs style, defs>g:not(#tyIcon_past,#tyIcon_fcst), >g:not(#warning_range), g#warning_circle,g#warning_marks .mark-past, foreignObject, animate")
    
    // 3. 標題層（topLayer） ：擷取 SVG foreignObject 內的 #silde（HTML文字區）
    const $topDiv = await makeCanvasDiv("topDiv",$("#slideObj #slideShps"))
  }
  
  // 擷取各層靜態圖層(動態圖層先存為 null)
  canvasDict = await makeCanvasDict(["animCanvas"], scaleFactor)

  // Step 2: 建立影像陣列 (myImages)
  // 2.1 GIF ==> 逐幀處理動畫層（animLayer） → 合併三層並存入 frameList ，再建立 GIF myImages
  if (mode.includes("gif")) {
    let frameList = [];   // frameList => GIF 每幀 canvas 截圖

    const totalDuration = (mode === "gif-capture" ? (aniParas.dur - pauseSec) : (xPData[xPData.length-1].tau - xPData[0].tau)/perHr) || 12; // 動畫總秒數
    const fps = 8;
    const totalFrames = totalDuration * fps;
    
    // 擷取靜態圖層
    // let baseCanvas= null
    // if (!mode.includes("ppt")) {
      // baseCanvas = await makeCanvas($("#baseDiv")[0], scaleFactor)
    // }
    // const topCanvas = await makeCanvas($("#topDiv")[0], scaleFactor)

    
    // ✅ Debug: 輸出 baseCanvas base64 圖像
    // console.log(`baseCanvas:`, baseCanvas.toDataURL());

    for (let frame = 0; frame <= totalFrames; frame++) {
      if (cancelProgress) break;

      const thisTau = parseInt((frame * perHr / fps) + (mode === "gif-capture" ? aniParas.tau[0] : xPData[0].tau));

      // 更新暴風圈圖層
      await setTcCircle(thisTau, $("#animDiv>svg"));
      await new Promise(requestAnimationFrame);

      // 擷取 anim 層，並更新canvasDict
      canvasDict["animCanvas"] = await makeCanvas($("#animDiv")[0], scaleFactor);
      
      // 合併圖層
      const mergedCanvas = await makeMergedCanvas(canvasDict,mode.includes("ppt") ? ["topCanvas"] : [])  // 投影片不合併標題層
      frameList.push({ tau: thisTau, canvas: mergedCanvas });    
      
      
      // ⏳ 更新進度條
      const percent = Math.round((frame / totalFrames/2) * 100);
      // console.log(thisTau,frame,totalFrames,percent)
      $("#progressText").text(`正在逐幀處理影格... (${percent}%)`);
      $("#progressBar").css("width", `${percent}%`);
    }
    
    // 使用：segments = [[tauStart1, tauEnd1], [tauStart2, tauEnd2], ...]
    // console.log("frameList:",frameList.length)
    myImages = await buildGifsBySegments(frameList, segments, fps, pauseSec);
    
    // ppt + gif ==> 第一頁加上tau=0全景圖
    if (mode.startsWith("ppt")){
      const tau = 0
      await setTcCircle(tau, $(`#animDiv>svg`), true, false);
      await new Promise(requestAnimationFrame); // 不等畫面顯示
      
      // 擷取 anim 層，並更新canvasDict
      canvasDict["animCanvas"] = await makeCanvas($("#animDiv")[0], scaleFactor);
      
      // 合併圖層
      const mergedCanvas = await makeMergedCanvas(canvasDict,mode.includes("ppt") ? ["topCanvas"] : [])  // 投影片不合併標題層
      
      const blob = await canvasToBlob(mergedCanvas);
      myImages = [{ tau, blob, dataUrl: mergedCanvas.toDataURL("image/png") }, ...myImages]
    }
    
  // 2.2 非GIF ==> 依照 segments 建立 myImages
  } else { 
    let s = 0
    for (let tau of segments) {
      s +=1
      if (cancelProgress) break;
      
      if (mode.startsWith("ppt")){
        canvasDivId = "animDiv"
      } else {
        canvasDivId = "canvasDiv"
      }

      if (!["clipboard", "png-capture"].includes(mode) || $("#btn_animsEnable").prop("checked")) {  // 靜態模式擷取當下畫面不用執行 setTcCircle
        await setTcCircle(tau, $(`#${canvasDivId}>svg`), tau === 0, tau !== 0);
        await new Promise(requestAnimationFrame); // 不等畫面顯示
      }

      // const canvas = await makeCanvas($(`#${canvasDivId}`)[0], scaleFactor);
      // const blob = await canvasToBlob(canvas);
      // myImages.push({ tau, blob, dataUrl: canvas.toDataURL("image/png") });
      
      // 擷取 anim 層，並更新canvasDict
      canvasDict[canvasDivId.replace("canvasDiv", "canvas").replace(/Div$/, "Canvas")] = await makeCanvas($(`#${canvasDivId}`)[0], scaleFactor);
      
      // 合併圖層
      const mergedCanvas = await makeMergedCanvas(canvasDict,mode.includes("ppt") ? ["topCanvas"] : [])  // 投影片不合併標題層
      
      const blob = await canvasToBlob(mergedCanvas);
      myImages.push({ tau, blob, dataUrl: mergedCanvas.toDataURL("image/png") });
      
      // ⏳ 更新進度條
      const percent = Math.round((s/segments.length) * 100);
      // console.log(thisTau,s,segments.length,percent)
      $("#progressText").text("正在處理圖片..." + (segments.length > 1 ? `(${s}/${segments.length})` : ""));
      $("#progressBar").css("width", `${percent}%`);
    }
  }
  // console.log("myImages數量:", myImages.length)
  // console.log(myImages[0].dataUrl)
  
  return myImages
}

// === GIF Builder: 回傳 { segment, blob, dataUrl } ===
async function buildGifsBySegments(frameList, segments, fps, pauseSec) {
  const gifs = [];
  const numerators = segments.map(segment => segment[1]-segment[0]+1) // 各段 tau 數量
  const denominator = eval(numerators.join('+'))                      // tau數量總和     => 作為進度分母
  let multiplys = new Array(segments.length).fill(0);                 // 進度*該段tau數量 => 作為進度分子

  $("#progressText").text("正在轉成GIF...");

  for (let i = 0; i < segments.length; i++) {
    const [startTau, endTau] = segments[i];
    const gif = new GIF({
      workers: 2,
      quality: 1,
      width: frameList[0].canvas.width,
      height: frameList[0].canvas.height,
      workerScript: "./js/gif.worker.js"
      // transparent: "#fff0"  // 透明色
    });
    
    // 先篩選出需要的 frames
    const segmentFrames = frameList.filter(frame => frame.tau >= startTau && frame.tau <= endTau);

    segmentFrames.forEach((frame, idx) => {
      const isLast = idx === segmentFrames.length - 1;
      gif.addFrame(frame.canvas, {
        copy: true, // 避免後續污染
        delay: (isLast && pauseSec > 0) ? 1000 * pauseSec : 1000 / fps
      });
    });
    gifs.push(new Promise((resolve) => {
      gif.on("progress", (p) => {
        // ⏳ 更新進度條
        // multiplys[i] = p*numerators[i] // 單張GIF進度(0~1) * 該段 tau 數量
        multiplys[i] += 1
        const percent = Math.min(Math.round((1/2 + eval(multiplys.join('+'))/denominator/2) * 100),99);
        // console.log([i, p.toFixed(2), "['" + multiplys.join("','") + "']", percent].join("\t"))
        $("#progressText").text(`正在轉成GIF... (${percent}%)`);
        $("#progressBar").css("width", `${percent}%`);
      });

      gif.on("finished", async (blob) => {
        const dataUrl = await blobToDataUrl(blob);
        resolve({ segment: segments[i], blob, dataUrl });
      });
      gif.render();
    }));
  
  }

  return Promise.all(gifs);
}

// === Step C: 檔案輸出 ===
async function exportFile(mode, myImages, fileName, scaleFactor) {
  // 🔑 確保 myImages 不是 Promise，而是陣列
  myImages = await Promise.resolve(myImages);

  if (!Array.isArray(myImages) || myImages.length === 0) {
    console.error("⚠️ exportFile: myImages 無效或為空陣列");
    return;
  }
  
  $("#progressText").text("檔案輸出中...");

  if (mode === "clipboard") {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": myImages[0].blob })]);
    alert("已複製畫面到剪貼簿！");
  } else if (mode.startsWith("png")) {  
    if (myImages.length === 1) {  // 單一 PNG
      downloadBlob(myImages[0].blob, `${fileName}.png`);
    } else {                      // 多個 PNG → zip
      await downloadZip(myImages, fileName, "png");
    }

  } else if (mode.startsWith("gif")) {
    if (myImages.length === 1) {  // 單一 GIF
      downloadBlob(myImages[0].blob, `${fileName}.gif`);
    } else {                      // 多個 GIF → zip
      await downloadZip(myImages, fileName, "gif");
    }
    
  } else if (mode.startsWith("pdf")) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("landscape", "pt", [$("#slideObj").width(), $("#slideObj").height()]);
    for (let i = 0; i < myImages.length; i++) {
      if (cancelProgress) break;
      if (i > 0) pdf.addPage();
      pdf.addImage(myImages[i].dataUrl, "PNG", 0, 0, $("#slideObj").width(), $("#slideObj").height());
    }
    await pdf.save(`${fileName}.pdf`);
    
  } else if (mode.startsWith("ppt")) {  // 輸出檔案類型為 PPT
    // console.log("輸出檔案類型為 PPT")
    // slide 寬高 換算成英吋
    const widthIn = $("#slideObj").width() / 72;
    const heightIn = $("#slideObj").height() / 72;

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "custom", width: widthIn, height: heightIn });
    pptx.layout = "custom";
    
    // 擷取靜態圖層
    // const baseCanvas = await makeCanvas($("#baseDiv")[0], scaleFactor)
    // const topCanvas = await makeCanvas($("#topDiv")[0], scaleFactor)
    
    // ✅ Debug: 輸出 baseCanvas base64 圖像
    // console.log(`baseCanvas:`, baseCanvas.toDataURL());

    // const baseImgData = baseCanvas.toDataURL("image/png");
    const topImgData = canvasDict["topCanvas"].toDataURL("image/png");

    // PPTX with PNG
    for (let img of myImages) {
      const slide = pptx.addSlide();
      // slide.addImage({ data: baseImgData, x: 0, y: 0, w: "100%", h: "100%" });
      slide.addImage({ data: img.dataUrl, x: 0, y: 0, w: "100%", h: "100%" });
      slide.addImage({ data: topImgData,  x: 0, y: 0, w: "100%", h: "100%" });
    }
    await pptx.writeFile({ fileName: `${fileName}.pptx` });
  }
}

// === 工具函式 ===
function exportAsSvg(fileName = `${$("#slide-title").html()}路徑預測示意圖_${moment($("select#trackFcstList option:selected").val()).format("DD日HH時")}`) {
  const svgEl = document.querySelector("svg#svgObj");
  const clonedSvg = svgEl.cloneNode(true);
  // optional: 將不必要的元素隱藏/刪除

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(clonedSvg);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });

  const link = document.createElement("a");
  link.download = `${fileName}.svg`;
  link.href = URL.createObjectURL(svgBlob);
  link.click();
  URL.revokeObjectURL(link.href);
}

// 建立用於截圖的區塊(CanvasDiv)
async function makeCanvasDiv(canvasDivId, target, rmChild = "", target2 = null) {
  let $targetClone = target.clone();
  $targetClone.find(rmChild).remove();  // 移除 rmChild 物件

  const $canvasDiv = $(`<div id='${canvasDivId}'>`).css({
    display: "flex",
    position: "absolute",
    overflow: "hidden",
    width: $("#slideObj").width(),
    height: $("#slideObj").height()
  }).append($targetClone);
  
  if (target2 != null) {$canvasDiv.append(target2.clone())}

  $("#canvasDivs").append($canvasDiv);
  return $canvasDiv
}

// 建立截圖Canvas
async function makeCanvas(el, scaleFactor) {
  return html2canvas(el, {
    backgroundColor: null,
    scale: scaleFactor,
    useCORS: true,
    removeContainer: true,
    logging: false
  });
}

// 建立截圖 canvasDict
async function makeCanvasDict(exceptions = [], scaleFactor = 1) { // exceptions = ["animCanvas"]
  const canvasDict = {};

  // 轉成 Array 處理比較直覺
  const divs = $("#canvasDivs > div[id]").toArray();

  for (const div of divs) {
    const $div = $(div);
    const divId = $div.attr("id");

    // 把 Div 名稱轉成 Canvas 名稱
    const canvasKey = divId.replace("canvasDiv", "canvas").replace(/Div$/, "Canvas");

    // 例外條件： Canvas:null
    if (exceptions.includes(canvasKey)) {
      canvasDict[canvasKey] = null;
      continue;
    }

    // 將 div 轉為 canvas
    try {
      const canvas = await makeCanvas($div[0], scaleFactor);
      canvasDict[canvasKey] = canvas;
    } catch (err) {
      console.error(`轉換 ${divId} 失敗:`, err);
      canvasDict[canvasKey] = null;
    }
  }

  return canvasDict;
}

async function makeMergedCanvas(canvasDict,exceptions = []) {  // canvasDict = ["baseCanvas":baseCanvas,"animCanvas":animCanvas,"topCanvas":topCanvas]
  if (!canvasDict || Object.keys(canvasDict).length === 0) return null;

  // 取第一個 canvas 作為基準大小
  const firstKey = Object.keys(canvasDict)[0];
  const baseCanvas = canvasDict[firstKey];

  const mergedCanvas = document.createElement("canvas");
  mergedCanvas.width = baseCanvas.width;
  mergedCanvas.height = baseCanvas.height;

  const ctx = mergedCanvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, mergedCanvas.width, mergedCanvas.height);

  // 照 key 出現順序繪製
  for (const key of Object.keys(canvasDict)) {
    if (exceptions.includes(key)) continue;  // 例外條件：跳過
    
    const c = canvasDict[key];
    if (c) ctx.drawImage(c, 0, 0);
  }

  return mergedCanvas;
}






async function canvasToBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadZip(images, fileName, ext) {
  const zip = new JSZip();
  images.forEach(img => {
    zip.file(`${fileName}_tau=${img.tau ?? img.segment.join("-")}.${ext}`, img.blob);
  });
  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, `${fileName}.zip`);
}


// 將衛星影像圖移出SVG
function makeCanvasDiv_Bottom() {
  const $gBottom = $("#slideObj #svgObj g#bottom");
  const $canvasDiv = $("<div id='bottomDiv'>").css({
    display: "flex",
    position: "absolute",
    overflow: "hidden",
    width: $("#slideObj").width(),
    height: $("#slideObj").height(),
  })
  
  // 取出 viewBox & 實際顯示大小
  const viewBox = $("#slideObj #svgObj")[0].viewBox.baseVal;
  const minX = viewBox.x, minY = viewBox.y;
  const vbW = viewBox.width, vbH = viewBox.height;
  const svgW = $("#slideObj #svgObj")[0].clientWidth, svgH = $("#slideObj #svgObj")[0].clientHeight;
  
  // 轉換 g#bottom 裡的每一個 <image>，並插入 #bottomDiv
  $gBottom.find("image").each(function () {
    const $tile = $(this);
    const img = $("<img>");
    img.attr("src", $tile.attr("href") || $tile.attr("xlink:href"));

    const x = parseFloat($tile.attr("x"));
    const y = parseFloat($tile.attr("y"));
    const w = parseFloat($tile.attr("width"));
    const h = parseFloat($tile.attr("height"));

    // SVG → CSS pixel
    const cssX = (x - minX) * (svgW / vbW);
    const cssY = (y - minY) * (svgH / vbH);
    const cssW = w * (svgW / vbW);
    const cssH = h * (svgH / vbH);

    img.css({
      position: "absolute",
      left: cssX + "px",
      top: cssY + "px",
      width: cssW + "px",
      height: cssH + "px"
    });

    $canvasDiv.append(img);
  });
  
  $("#canvasDivs").append($canvasDiv);
  return $canvasDiv
}



// ---------------------------------------------------------------------------------------------------------------

// 設定區塊拖曳範圍 (編輯模式改變、視窗大小變化、全螢幕切換時觸發)  PS:不含enableMarkDrag()，因為無限制拖曳範圍
function setDragRange() {
  const enable = $("#TrackFcst").hasClass("editMode")
  // console.log("call setDragRange()")
  
  // 關閉區塊拖曳拖曳
  if ($("#keypoint").data("ui-draggable")){$("#keypoint").draggable("destroy");} // 關閉 keypoint 拖曳
  // if ($("#keypoint-mark div").data("ui-draggable")){$("#keypoint-mark div").draggable("destroy");} // 關閉 div#keypoint-mark>div 拖曳
  
  if (enable) {
    // --- keypoint 區塊拖曳範圍 ---
    const pointRange = [
      $("#slideShps").offset().left + 5,
      $("#slideShps").offset().top + 55,
      $("#slideShps").offset().left + 715 - $("#keypoint").outerWidth(),
      $("#slideShps").offset().top + 325 - $("#keypoint").outerHeight()
    ];
    $("#keypoint").draggable({ containment: pointRange });
    
    // console.log("#keypoint draggable")
    
    
    // div#keypoint-mark>div 可拖曳   
    // const markRange = [
      // $("#slideShps").position().left + 5,
      // $("#slideShps").position().top + 55,
      // $("#slideShps").position().left + 715 - $("#keypoint-mark div").width(),
      // $("#slideShps").position().top + 325 - $("#keypoint-mark div").height()
    // ];
    // $("#keypoint-mark div").draggable({ containment: markRange });
  } 
}

// 設定編輯模式
function setEditModel() {
  // 先解除所有 click 事件
  $("#keypoint-content .warning-text, #warning_circle g, #keypoint-label").off("click");
  
  // console.log("設定編輯模式")
  
  const enable = $("#TrackFcst").hasClass("editMode")
  // console.log(enable)
  if (enable) {  // 編輯模式
    /* ===== 進入編輯模式 ===== */
    enableMapDragZoom(false);   // 關掉地圖拖曳/縮放
    enableTextEdit(true);       // slide div 啟用雙擊編輯
    enableMarkDrag(true);       // g#warning_marks>g 可拖曳
    
    if ($("#btn_animsEnable").prop("checked")){
      $("#btn_animsEnable").prop("checked",false) // 關閉動畫
      setTcAnimate()
      toggleAnimEnable()
    }
  } else {       // 拖曳/縮放模式
    /* ===== 離開編輯模式 ===== */
    enableMapDragZoom();        // 恢復地圖拖曳/縮放
    enableTextEdit(false);      // slide div 停用雙擊編輯
    enableMarkDrag(false);      // 關閉 g#warning_marks>g 拖曳
    
    // 啟用區段動畫
    $("#keypoint-content .warning-text, #warning_circle g").on("click", function () {
      // console.log($(this).attr("name"),"區段動畫設定")
      setTcAnimate($(this).attr("name"))
      // console.log("結束區段動畫設定")
      // toggleAnimEnable()  // 啟用/停用動畫
    });
    
    // 恢復全預報時段動畫按鈕
    $("#keypoint-label").on("click", function () {
      // console.log($(this).attr("name"))
      setTcAnimate()
      // toggleAnimEnable()  // 啟用/停用動畫
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------

// slide 內容 啟用雙擊編輯
function enableTextEdit(enable = true) {
  /* ---------- 先全面解除上一輪的 dblclick.textEdit  ---------- */
  $(document).find("*").off("dblclick.textEdit");   // 任何元素上的 dblclick.textEdit
  $(document).off("mousedown.textEdit");           // 解除文件上 mousedown.textEdit
  $("textarea.slide-textarea").remove();           // 移除殘留的 textarea

  /* ---------- 依投影片版型決定可編輯元素 ---------- */
  const slide_theme_type = $("select#slide_theme_type option:selected").val();
  let editableSelectors = [];

  if (slide_theme_type === "Full_Map_1") {
    editableSelectors = [
      "#slide-title",
      "#slide-description",
      "#slide-production>div",
      "#keypoint-content .warning-text span:nth-of-type(4)"
    ];
  } else if (slide_theme_type === "Right_Map_1") {
    editableSelectors = [
      "#slide-title p",
      "#slide-description-table td[name]",
      "#slide-production>div"
    ];
  }

  if (enable) {
    /* ---------- 雙擊插入 <textarea> 編輯 ---------- */
    editableSelectors.forEach((selector) => {
      $(selector).on("dblclick.textEdit", function () {
        const $el = $(this);
        if ($el.find("textarea.slide-textarea").length) return;   // 已在編輯中

        const original = $el.html().replace(/<br\s*\/?>/g, "\n");  //.trim();
        const { top, left } = $el.offset();
        let width  = $el.width();
        let height = $el.height();
        
        console.log(selector);
        
        if (selector == "#slide-production>div") {width*=0.666667}

        const $ta = $("<textarea>")
          .val(original)
          .addClass("slide-textarea")
          .css({
            position: "absolute",
            top,
            left,
            width,
            height,
            "z-index": 9999,
            resize: "none",
            border: "1px solid #ccc",
            margin: 0,
            padding: $el.css("padding"),
            "font-family": $el.css("font-family"),
            "font-size":   $el.css("font-size"),
            "line-height": $el.css("line-height"),
            "text-align":  $el.css("text-align")
          });

        $("body").append($ta);
        $ta.focus().on("blur", function () {
          $el.html($(this).val().replace(/\\n/g, "<br>"));
          $(this).remove();
        });
      });
    });
    
    // warning-text 轉換
    if (slide_theme_type === "Right_Map_1") {
      $('#keypoint-content div.warning-text').off("dblclick.textEdit").on("dblclick.textEdit", function () {
        const $el = $(this);
        $el.addClass("editable")
        // console.log($(this).name)
        if ($el.hasClass("warning-text-upper")) {
          // console.log("移至下層")
          $el.removeClass("warning-text-upper")
          $el.addClass("warning-text-lower")
        } else {
          // console.log("移至上層")
          $el.removeClass("warning-text-lower")
          $el.addClass("warning-text-upper")
        }
      });
    }

    /* ---------- 點其他區域時自動完成編輯 ---------- */
    $(document).on("mousedown.textEdit", (e) => {
      if (!$(e.target).is("textarea.slide-textarea")) {
        $("textarea.slide-textarea").trigger("blur");
      }
    });
  }
  /* 這裡不需要 else 區塊，因為一開始已經 off 掉所有事件與 textarea */
}



// --- 編輯模式拖曳用的暫存變數 (放外層方便 on/off) ---
let isMarkDragging = false;
let startX = 0, startY = 0;
let currentTransform = { x: 0, y: 0 };

// 啟用/停用mark移動功能
function enableMarkDrag(enable = true) {
  // const svg = document.querySelector("svg#svgObj");
  const $marks = $("#warning_marks g");

  let dragging = null;
  let startPt = { x: 0, y: 0 }; // SVG座標（拖曳起點）
  let origRectPos = { x: 0, y: 0 }; // rect原始位置

  const toSvgPoint = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  if (enable) {
    $marks
      .css("cursor", "move")
      .off("mousedown.markDrag")
      .on("mousedown.markDrag", function (e) {
        dragging = this;
        startPt = toSvgPoint(e);

        // 取得該 g 裡的 rect 元素
        const rect = dragging.querySelector("rect");
        if (!rect) {
          dragging = null;
          return;
        }

        // 讀取 rect 原始 x,y，轉成數字
        origRectPos.x = parseFloat(rect.getAttribute("x")) || 0;
        origRectPos.y = parseFloat(rect.getAttribute("y")) || 0;

        e.preventDefault();
      });

    $(document)
      .off("mousemove.markDrag mouseup.markDrag")
      .on("mousemove.markDrag", function (e) {
        if (!dragging) return;

        const pt = toSvgPoint(e);
        const dx = pt.x - startPt.x;
        const dy = pt.y - startPt.y;

        const rect = dragging.querySelector("rect");
        if (!rect) return;

        // 設定新的 x,y 位置
        rect.setAttribute("x", origRectPos.x + dx);
        rect.setAttribute("y", origRectPos.y + dy);

        // 如果你想要連動調整 line 和 text 位置，也可以在這邊一起更新，
        // 例如調整同一 <g> 內的 line 的 x1,y1,x2,y2 和 text 的 x,y，
        // 要用相同的偏移 dx, dy 做加減
        // 範例：
        const line = dragging.querySelector("line");
        if (line) {
          // 讀取原始座標，並更新
          if (!line._orig) {
            line._orig = {
              x1: parseFloat(line.getAttribute("x1")) || 0,
              y1: parseFloat(line.getAttribute("y1")) || 0,
              x2: parseFloat(line.getAttribute("x2")) || 0,
              y2: parseFloat(line.getAttribute("y2")) || 0,
            };
          }
          line.setAttribute("x1", line._orig.x1 + dx);
          line.setAttribute("y1", line._orig.y1 + dy);
          line.setAttribute("x2", line._orig.x2);
          line.setAttribute("y2", line._orig.y2);
        }

        const text = dragging.querySelector("text");
        if (text) {
          if (!text._orig) {
            // 因為 text 可能有多個 tspan，這邊只簡單移整個 text
            text._orig = {
              x: parseFloat(text.getAttribute("x")) || 0,
              y: parseFloat(text.getAttribute("y")) || 0,
            };
          }
          text.setAttribute("x", text._orig.x + dx);
          text.setAttribute("y", text._orig.y + dy);
          
          // 修改tspan
          text.querySelectorAll("tspan").forEach(tspan => {
            tspan.setAttribute("x", text._orig.x + dx);
          });
        }
      })
      .on("mouseup.markDrag", function () {
        if (!dragging) return;

        const rect = dragging.querySelector("rect");
        const line = dragging.querySelector("line");
        if (rect && line) {
          // 取得 rect 的位置和大小
          const rx = parseFloat(rect.getAttribute("x")) || 0;
          const ry = parseFloat(rect.getAttribute("y")) || 0;
          const rw = parseFloat(rect.getAttribute("width")) || 0;
          const rh = parseFloat(rect.getAttribute("height")) || 0;

          // 定義 ConnectorItem 對應位移倍率
          const ConnectorItem = [
            [-0.5, 0],   // 上 0
            [0, -0.5],   // 左 1
            [-0.5, -1],  // 下 2
            [-1, -0.5]   // 右 3
          ];

          // 轉換為實際座標
          const midPoints = ConnectorItem.map(([dx, dy]) => ({
            x: rx - dx * rw,
            y: ry - dy * rh,
          }));

          // 取得 line 的終點 (x2, y2)
          const x2 = parseFloat(line.getAttribute("x2")) || 0;
          const y2 = parseFloat(line.getAttribute("y2")) || 0;

          // 找距離最近的連接點
          let minDist = Infinity;
          let nearestPoint = midPoints[0];
          let connectorIndex = 0;

          midPoints.forEach((pt, idx) => {
            const dist = Math.hypot(pt.x - x2, pt.y - y2);
            if (dist < minDist) {
              minDist = dist;
              nearestPoint = pt;
              connectorIndex = idx+1;
            }
          });

          // 更新 line 起點座標
          line.setAttribute("x1", nearestPoint.x);
          line.setAttribute("y1", nearestPoint.y);

          // 設定 connectortype 屬性（自訂屬性）
          line.setAttribute("connectortype", connectorIndex);
        }

        dragging = null;

        // 清除儲存的原始座標，讓下次拖曳重新計算
        $("#warning_marks g line").each((_, el) => delete el._orig);
        $("#warning_marks g text").each((_, el) => delete el._orig);
      });


  } else {
    $marks.css("cursor", "").off("mousedown.markDrag");
    $(document).off("mousemove.markDrag mouseup.markDrag");
  }
}

// ---------------------------------------------------------------------------------------------------------------

// 啟用/停用SVG拖曳縮放
function enableMapDragZoom(enable=true) {
  if (enable) {  // 啟用SVG拖曳縮放
    svg.addEventListener("mousedown",    mouseDown, false);
    svg.addEventListener("mousemove",    drag,      false);
    svg.addEventListener("mouseup",      mouseUp,   false);
    svg.addEventListener("wheel",        zoom,      false);
  } else {       // 停用SVG拖曳縮放
    svg.removeEventListener("mousedown", mouseDown, false);
    svg.removeEventListener("mousemove", drag,      false);
    svg.removeEventListener("mouseup",   mouseUp,   false);
    svg.removeEventListener("wheel",     zoom,      false);
  }
}

/* 開始：鼠標拖曳的效果 */
let moving;

// 鼠標點下，開始拖曳
mouseDown = function(e) {
  moving = true;
  svg.style.cursor = 'grabbing'; // 設定遊標樣式為move
}

// SVG拖曳移動過程
drag = function(e) {
  if (moving === true) {
    // 1. 取得一開始的 viewBox 值，原本是字符串，拆成陣列，方便之後運算
    let startViewBox = svg
    .getAttribute('viewBox')
    .split(' ')
    .map((n) => parseFloat(n));

    // 2. 取得鼠標當前 viewport 中 client 座標值
    let startClient = {
      x: e.clientX,
      y: e.clientY,
    };

    // 3. 計算對應回去的 SVG 座標值
    let newSVGPoint = svg.createSVGPoint();
    let CTM = svg.getScreenCTM();
    newSVGPoint.x = startClient.x;
    newSVGPoint.y = startClient.y;
    let startSVGPoint = newSVGPoint.matrixTransform(CTM.inverse());

    // 4. 計算拖曳後鼠標所在的 viewport client 座標值
    let moveToClient = {
      x: e.clientX + e.movementX,
      y: e.clientY + e.movementY,
    };

    // 5. 計算對應回去的 SVG 座標值
    newSVGPoint = svg.createSVGPoint();
    CTM = svg.getScreenCTM();
    newSVGPoint.x = moveToClient.x;
    newSVGPoint.y = moveToClient.y;
    let moveToSVGPoint = newSVGPoint.matrixTransform(CTM.inverse());

    // 6. 計算位移量
    let delta = {
      dx: startSVGPoint.x - moveToSVGPoint.x,
      dy: startSVGPoint.y - moveToSVGPoint.y,
    };

    // 7. 設定新的 viewBox 值，但請確保不超過SVG範圍
    let newX = startViewBox[0] + delta.dx;
    let newY = startViewBox[1] + delta.dy;
    let newWidth = startViewBox[2];
    let newHeight = startViewBox[3];

    let slide_theme_type = $("select#slide_theme_type option:selected").val() // 投影片樣式

    // 邊界檢查
    if (slide_theme_type === "Full_Map_1") {
      if (newX < 0) newX = 0;
    } else if (slide_theme_type === "Right_Map_1") {
      if (newX < -newWidth / 2) newX = -newWidth / 2;
    }
    if (newY < 0) newY = 0;
    if (newX + newWidth > Map_Size[0]) newX = Map_Size[0] - newWidth;
    if (newY + newHeight > Map_Size[1]) newY = Map_Size[1] - newHeight;

    let moveToViewBox = `${newX} ${newY} ${newWidth} ${newHeight}`;
    svg.setAttribute('viewBox', moveToViewBox);
    fObj.style.transform = `translate(${newX}px, ${newY}px) scale(${newWidth/720})`

    // console.log(startViewBox, moveToViewBox);

    // 更新 經緯度範圍 資訊
    showViewBox();
  } else {
    //	建立 SVG 座標點（0, 0）
    const clientPoint = svg.createSVGPoint()
    //	取得 CTM
    const CTM = svg.getScreenCTM()
    //  將 SVG 座標點的 x, y 設成 client(x, y)
    clientPoint.x = e.clientX
    clientPoint.y = e.clientY
    //	將 client 的座標點轉成 SVG 座標點
    SVGPoint = clientPoint.matrixTransform(CTM.inverse())
    //  將資訊顯示於視窗上
    // currentPoint.textContent = `svg (${SVGPoint.x.toFixed(0)}, ${SVGPoint.y.toFixed(0)})`
    currentPoint.textContent = `經緯度位置： ${parseFloat(SVGPoint.y.toFixed(0) / per_Lat + Map_Range[3]).toFixed(2)}N ${parseFloat((SVGPoint.x.toFixed(0)) / per_Lon + Map_Range[0]).toFixed(2)}E`
  }
}

// 鼠標點擊結束（拖曳結束）
mouseUp = function() {
  moving = false;
  svg.style.cursor = ''; // 還原遊標樣式為預設值
}

/* 結束：鼠標拖曳的效果 */


/* SVG縮放的效果 */
zoom = function(e) {
  e.preventDefault(); // 封鎖預設的滾輪事件

  // 1.取得一開始的 viewBox。
  let startViewBox = svg
  .getAttribute('viewBox')
  .split(' ')
  .map((n) => parseFloat(n));

  // 2.取得鼠標執行縮放位置的 viewPort Client 坐標，並利用 CTM 對應取得 SVG 坐標。

  // 2.1 取得鼠標執行縮放的位置
  let startClient = {
    x: e.clientX,
    y: e.clientY,
  };
  // console.log("startClient:", startClient);

  // 2.2 轉換成 SVG 座標系統中的 SVG 座標點
  let newSVGPoint = svg.createSVGPoint();
  let CTM = svg.getScreenCTM();
  newSVGPoint.x = startClient.x;
  newSVGPoint.y = startClient.y;
  let startSVGPoint = newSVGPoint.matrixTransform(CTM.inverse());

  // 3.進行縮放
  // 3.1 設定縮放倍率
  let r;
  if (e.deltaY < 0) {
    r = 0.95;
  } else if (e.deltaY > 0) {
    r = 1.05;
  } else {
    r = 1;
  }
  // 3.2 進行縮放並檢查大小(長寬不可超過原始地圖大小)
  let oldWidth = parseInt($('#svgObj').attr('width'), 10)
  let oldHeight = parseInt($('#svgObj').attr('height'), 10)
  // console.log(oldWidth,oldHeight);

  // 寬度較大 --> 高度易超出範圍(先調整高度)
  if (oldWidth / oldHeight > 1) {}
  let newHeight = startViewBox[3] * r;
  if (newHeight > Map_Size[1]) {
    newHeight = Map_Size[1];
    // console.log("調整高度")
  }
  let newWidth = newHeight * oldWidth / oldHeight;
  if (newWidth > Map_Size[0]) {
    newWidth = Map_Size[0];
    newHeight = newWidth * oldHeight / oldWidth;
    // console.log("調整寬度")
  } else { // 高度較大 --> 寬度易超出範圍(先調整寬度)
    let newWidth = startViewBox[2] * r;
    if (newWidth > Map_Size[0]) {
      newWidth = Map_Size[0];
      // console.log("調整寬度")
    }
    let newHeight = newWidth * oldHeight / oldWidth;
    if (newHeight > Map_Size[1]) {
      newHeight = Map_Size[1];
      newWidth = newHeight * oldWidth / oldHeight;
      // console.log("調整高度")
    }
  }

  // 4.設定中繼 viewBox，並計算對應的 SVG 座標
  // 4.1 設定中繼 viewBox (middleViewBox)
  svg.setAttribute('viewBox', `${startViewBox[0]} ${startViewBox[1]} ${newWidth} ${newHeight}`);
  fObj.style.transform = `translate(${startViewBox[0]}px, ${startViewBox[1]}px) scale(${newWidth/720})`

  // 4.2 將一開始鼠標的執行縮放位置的 viewPort Client 座標利用新的 CTM ，轉換出對應的 SVG 座標。
  CTM = svg.getScreenCTM();
  let moveToSVGPoint = newSVGPoint.matrixTransform(CTM.inverse());

  // 5.取得在縮放過程中該圓點的位移量 `(svgX0 - svgX1)`。
  let delta = {
    dx: startSVGPoint.x - moveToSVGPoint.x,
    dy: startSVGPoint.y - moveToSVGPoint.y,
  };
  // console.log("delta:", delta);

  // 6.進行位移
  // 6.1 讀取中繼 viewBox (middleViewBox)
  let middleViewBox = svg
  .getAttribute('viewBox')
  .split(' ')
  .map((n) => parseFloat(n));
  
  // console.log("middleViewBox:", middleViewBox);

  // 6.2 新位置計算
  let newLeft = middleViewBox[0] + delta.dx;
  let newTop = middleViewBox[1] + delta.dy;
  
  let slide_theme_type = $("select#slide_theme_type option:selected").val() // 投影片樣式

  // 6.3 位置檢查 (超出邊框則改為靠邊對齊)
  if (newLeft < 0 && slide_theme_type != "Right_Map_1") {
    newLeft = 0;
    // console.log('靠左對齊');
  } else if (newLeft + middleViewBox[2] > Map_Size[0]) {
    newLeft = Map_Size[0] - middleViewBox[2];
    // console.log('靠右對齊');
  }
  if (newTop < 0) {
    newTop = 0;
    // console.log('靠上對齊');
  } else if (newTop + middleViewBox[3] > Map_Size[1]) {
    newTop = Map_Size[1] - middleViewBox[3];
    // console.log('靠下對齊');
  }

  // 7.設定最終的 viewBox2
  let moveBackViewBox = `${newLeft} ${newTop} ${middleViewBox[2]} ${middleViewBox[3]}`;
  svg.setAttribute('viewBox', moveBackViewBox);
  fObj.style.transform = `translate(${newLeft}px, ${newTop}px) scale(${middleViewBox[2]/720})`

  // console.log('viewBox: ' + moveBackViewBox);
  // console.log(startViewBox, moveBackViewBox);

  // 更新 經緯度範圍 資訊
  showViewBox();
}

// ---------------------------------------------------------------------------------------------------------------

// 選擇 zoom (越大越清楚，但需要更多 tile)
function chooseZoom(widthPx, heightPx, west, east, south, north) {
  // console.log(widthPx, heightPx, west, east, south, north)
  let bestZoom = 3;
  for (let z = 5; z <= 20; z++) { // 擴大到更大 zoom
    const x1 = lon2tile(west, z);
    const x2 = lon2tile(east, z);
    const y1 = lat2tile(north, z);
    const y2 = lat2tile(south, z);

    const tilesX = x2 - x1 + 1;
    const tilesY = y2 - y1 + 1;

    if (tilesX * 256 >= widthPx && tilesY * 256 >= heightPx) {
      // console.log(z, tilesX, tilesY)
      if (tilesX <= 16 && tilesY <= 9) {
        bestZoom = z; // 每次都更新，最後會取最大符合的 zoom
      } else {
        break    // 超出數量即停止
      }
    }
  }
  return bestZoom;
}


// 已繪製的 tile 集合
let drawnTiles = new Set();
let drawZoom = null 

function drawGoogleTiles(Domain_Range) {
  const bottom = document.querySelector("g#myMap g#bottom");
  // bottom.innerHTML = "";

  const west  = Domain_Range[0][0];
  const east  = Domain_Range[0][1];
  const south = Domain_Range[1][0];
  const north = Domain_Range[1][1];

  const vb = $("#slideObj #svgObj")[0].viewBox.baseVal;
  const vbWidth  = vb.width;
  const vbHeight = vb.height;

  // 選擇 zoom
  const zoom = chooseZoom(vbWidth, vbHeight, west, east, south, north);
  // console.log("zoom:", zoom);
  
  // zoom 改變 ==> 清空 drawnTiles
  if (zoom != drawZoom) {
    // console.log("清空 drawnTiles")
    drawZoom = zoom;
    drawnTiles.clear();
    bottom.innerHTML = "";
  }

  const x1 = lon2tile(west, zoom);
  const x2 = lon2tile(east, zoom);
  const y1 = lat2tile(north, zoom);
  const y2 = lat2tile(south, zoom);

  const yTop = Math.min(y1, y2);
  const yBottom = Math.max(y1, y2);

  for (let x = x1; x <= x2; x++) {
    for (let y = yTop; y <= yBottom; y++) {
      const key = `${zoom}_${x}_${y}`;
      if (drawnTiles.has(key)) continue; // 已經抓過就跳過
      drawnTiles.add(key);
      
      // console.log(key);

      const url = `https://khms3.google.com/kh/v=1000&x=${x}&y=${y}&z=${zoom}`;

      const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
      img.setAttribute("href", url);

      const tileLeftLon   = x / Math.pow(2, zoom) * 360 - 180;
      const tileRightLon  = (x+1) / Math.pow(2, zoom) * 360 - 180;
      const tileTopLat    = tile2lat(y, zoom);
      const tileBottomLat = tile2lat(y + 1, zoom);
      // const tileTopLat    = 180 - (y) / Math.pow(2, zoom) * 360;
      // const tileBottomLat = 180 - (y+1) / Math.pow(2, zoom) * 360;
      
      // console.log(key, tileLeftLon,tileRightLon,tileTopLat,tileBottomLat)

      const svgX = (tileLeftLon - west) / (east - west) * vbWidth + vb.x;
      const svgY = (north - tileTopLat) / (north - south) * vbHeight + vb.y;
      const svgW = (tileRightLon - tileLeftLon) / (east - west) * vbWidth;
      const svgH = (tileTopLat - tileBottomLat) / (north - south) * vbHeight;

      img.setAttribute("x", svgX.toFixed(6));
      img.setAttribute("y", svgY.toFixed(6));
      img.setAttribute("width", (svgW*1.01).toFixed(6));   // 略為加大，消除白縫
      img.setAttribute("height", (svgH*1.01).toFixed(6));  // 略為加大，消除白縫
      
      // 允許非等比縮放，填滿格子
      img.setAttribute("preserveAspectRatio", "none");
      
      // 確保來源支援 CORS
      img.setAttribute("crossorigin", "anonymous");

      bottom.appendChild(img);
    }
  }
}


// tile → lat
function tile2lat(y, zoom) {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// lon → tile
function lon2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

// lat → tile
function lat2tile(lat, zoom) {
  const rad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(rad) + 1/Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, zoom));
}

// ---------------------------------------------------------------------------------------------------------------

// 顯示當前的 經緯度範圍(Domain_Range) 資訊  +  重新拼貼衛星影像圖
showViewBox = function() {
  Domain_LTWH = svg
    .getAttribute('viewBox')
    .split(' ')
    .map((n) => parseFloat(n));

  Domain_Range = [
    [(Domain_LTWH[0]) / per_Lon + Map_Range[0],
     (Domain_LTWH[0] + Domain_LTWH[2]) / per_Lon + Map_Range[0]
    ],
    [
      (Domain_LTWH[1] + Domain_LTWH[3]) / per_Lat + Map_Range[3],
      (Domain_LTWH[1]) / per_Lat + Map_Range[3]
    ]
  ];

  // console.log(per_Lon, per_Lat);
  // console.log(Domain_Range);

  per_LonLat = [svg.width.baseVal.value / (Domain_Range[0][1] - Domain_Range[0][0]), svg.height.baseVal.value / (Domain_Range[1][0] - Domain_Range[1][1])]

  // console.log(per_LonLat);

  currentViewBox = document.getElementById('showDomainRange')
  
  let slide_theme_type = $("select#slide_theme_type option:selected").val() // 投影片樣式

  // currentViewBox.textContent = `現在的 viewBox 範圍為：(${Domain_LTWH})`
  currentViewBox.setAttribute('per_LonLat', per_LonLat.toString().replaceAll(",", " "))
  currentViewBox.setAttribute('Domain_Range', Domain_Range.toString().replaceAll(",", " "))
  currentViewBox.textContent = `經緯度範圍： ${parseFloat(Domain_Range[1][0]).toFixed(2)}N ~ ${parseFloat(Domain_Range[1][1]).toFixed(2)}N ; ${parseFloat(slide_theme_type === "Right_Map_1" ? Domain_Range[0][0] + (Domain_Range[0][1]-Domain_Range[0][0])/2 : Domain_Range[0][0]).toFixed(2)}E ~ ${parseFloat(Domain_Range[0][1]).toFixed(2)}E`
  

  // 依zoom調整邊界、線段大小
  const west  = Domain_Range[0][0];
  const east  = Domain_Range[0][1];
  const south = Domain_Range[1][0];
  const north = Domain_Range[1][1];

  const vb = $("#slideObj #svgObj")[0].viewBox.baseVal;
  const vbWidth  = vb.width;
  const vbHeight = vb.height;

  // 選擇 zoom
  const zoom = chooseZoom(vbWidth, vbHeight, west, east, south, north);
  // console.log("zoom:", zoom);
  
  // zoom 改變 ==> 調整邊界、線段大小
  if (zoom != drawZoom) {
    $("#slideObj #svgObj").find("g#world, g#nearSea path, g#LatLonLines").css("stroke-width",4/Math.pow(2, zoom-3).toFixed(3))
    $("#slideObj #svgObj").find("g#臺灣").css("stroke-width",4/Math.pow(2, zoom-2).toFixed(3))
    $("#slideObj #svgObj").find("g#pastPath, g#fcstPath").css("stroke-width",4/Math.pow(2, zoom-4).toFixed(3))
  }
  
  // 底圖為"衛星影像" ==> 重新拼貼衛星影像圖 (加 debounce)
  if ($("select#map_theme_type option:selected").val() === "Satellite_Map"){
    if (window.tileTimer) clearTimeout(window.tileTimer);
    window.tileTimer = setTimeout(() => {
      drawGoogleTiles(Domain_Range);  // 傳入當前經緯度範圍
    }, 200);
  }
}

// ---------------------------------------------------------------------------------------------------------------

// 動畫狀態設定 啟用/停用動畫
function toggleAnimEnable() {
  if (!svg || !$("#btn_animsPlayPause").length) return;

  if ($("#btn_animsEnable").prop("checked")) {
    // 啟用動畫
    console.log("啟用動畫")
    svg.unpauseAnimations();

    $("#btn_animsPlayPause").show().prop("disabled", false).attr("type", "animsPlay");
    // $("#btn_screenshot, #btn_download_png").prop("disabled", true)  // 暫停截圖、PNG下載
    $("#btn_download_gif").prop("disabled", false)                  // 恢復GIF下載
    $("#btn-back-point, #btn-next-point").hide();
  } else {
    // 停用動畫
    console.log("停用動畫")
    svg.pauseAnimations();

    $("#btn_animsPlayPause").hide().prop("disabled", true).attr("type", "animsPause");
    // $("#btn_screenshot, #btn_download_png").prop("disabled", false) // 恢復截圖、PNG下載
    $("#btn_download_gif").prop("disabled", true)                   // 暫停GIF下載
    $("#btn-back-point, #btn-next-point").show();
  }
  
  // 重設所有動畫元素至初始位置
  const anims = svg.querySelectorAll("animate, animateMotion, animateTransform");
  $(anims).each(function () {
    try {
      this.beginElement();
    } catch (e) {
      console.warn("無法重啟動畫元素", this, e);
    }
  });
}


// 動畫狀態設定 播放/暫停動畫
function toggleAnimState() {
  const btn = document.getElementById("btn_animsPlayPause");

  if (!svg || !btn) return;

  const currentType = btn.getAttribute("type");

  if (currentType === "animsPlay") {
    console.log("暫停動畫")
    svg.pauseAnimations();
    btn.setAttribute("type", "animsPause"); // 切換為「播放中 → 暫停圖示」
  } else {
    console.log("播放動畫")
    svg.unpauseAnimations();
    btn.setAttribute("type", "animsPlay"); // 切換為「暫停中 → 播放圖示」
  }
}
