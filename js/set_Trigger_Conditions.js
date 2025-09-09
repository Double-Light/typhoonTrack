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
      $("#slideObject").appendTo(svg)
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
  const $svgObj = $("#svgObj");
  const $control = $("#editor-panel");
  const $overlay = $("#Modal");

  const baseWidth = $svgObj.innerWidth();
  const baseHeight = $svgObj.innerHeight();

  function resizeSlide() {
    if (!document.fullscreenElement) {
      $svgObj.css("transform", "scale(1)");
      $zoom.css("border", "");
      $svgObj.removeClass("fullscreen")
      $control.removeClass("show");

      $svgObj[0].removeEventListener('mousemove', showCtrlPanel, false);
    } else {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      const scale = Math.min(screenWidth / baseWidth, screenHeight / baseHeight);
      $svgObj.css("transform", `scale(${scale})`);
      $zoom.css("border", "none");
      $svgObj.addClass("fullscreen");

      $svgObj[0].addEventListener('mousemove', showCtrlPanel, false);
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
      $("#slideObject").appendTo(svg)
      setEditModel();  // 設定編輯模式
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
      $overlay.appendTo($body);
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
      $svgObj.css("transform", "scale(1)");
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
  $("#btn_download_svg").on("click", () => captureSlide("svg"));
  
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

// 下載功能
// === 全域設定 ===
let segments = []
let myImages = [];   // myImages

async function captureSlide(mode = "clipboard") {
  console.log("執行下載模式：", mode);
  const tStart = performance.now();
  
  cancelProgress = false;
  
  $("#editor-panel").hide();   // 隱藏編輯面板
  $("#productContent").hide(); // 隱藏選項
  $("#progressContent").show();// 顯示進度條

  const $svgObj = $("#svgObj");
  if ($svgObj.length === 0) {
    alert("未找到 #svgObj，無法截圖！");
    return;
  }

  const scaleFactor = $svgObj.hasClass("fullscreen") ? 2.666667 : 2.666667;
  const fileName = `${$("#slide-title").html()}路徑預測示意圖_${moment($("select#trackFcstList option:selected").val()).format("DD日HH時")}`
  
  // 分段設定 segments
  if (mode.includes("gif")){  // GIF ==> segments = [[s1,e1],[s2,e2]...]
    const [tauStart, tauEnd] = [xPData[0].tau, xPData[xPData.length-1].tau]            // 預報起訖時段
    const spiltTau = warning_data.filter(item => item.tau > 0).map(item => item.tau);  // 分段時間點
    if (mode === "gif-split") {  // 回傳分段時間點
      segments = [[tauStart, spiltTau[0]], ...spiltTau.map((t, i) => i < spiltTau.length - 1 ? [t, spiltTau[i + 1]] : null).filter(Boolean), [spiltTau.at(-1), tauEnd]];
    } else if (mode === "gif-capture"){
      segments = [aniParas.tauRange] // 動畫時間範圍
    } else {  // 回傳起訖預報時段
      segments = [[tauStart, tauEnd]];
    }
  } else { // 非GIF ==> segments = [tau1,tau2...]
    // 為"clipboard" 或 "png-capture" ==> 擷取時間軸當下畫面
    if (mode === "clipboard" || mode === "png-capture"){
      if ($("#btn_animsEnable").prop("checked")){   // 動畫啟動
        segments = [Math.min(aniParas.tauRange[0] + (svg.getCurrentTime()/aniParas.dur)%1*(aniParas.tauRange[1]+aniParas.pauseSec*perHr-aniParas.tauRange[0]),aniParas.tauRange[1])] // 動畫模式當下時間點
      } else {
        segments = [parseInt($svgObj.find("#tc_circle").attr("tau")) || 0]  // 靜態模式時間點
      }
    } else if (mode.includes("split")) {  // 回傳分段時間點
      segments = warning_data.filter(item => item.tau>=0).map(item => item.tau)
      if (segments[0] > 0) { segments = [0, ...segments]} // 起始設為0
    } else {
      segments = [0]
    }
  }
  console.log(segments);

  try {
    // Type1: SVG
    if (mode === "svg") {
      exportAsSvg();

    // Type2: 靜態形式 (PNG or PDF)
    } else if (["clipboard", "png-capture", "png", "png-split", "pdf", "pdf-split"].includes(mode)) {
      // step1: 建立 canvasDiv 與分段設定
      let $svgClone = $("#basemap").clone();  // 複製
      $svgClone.find("foreignObject, animate").remove();  // 移除 foreignObject 與 animate

      const $canvasDiv = $("<div id='canvasDiv'>").css({
        display: "flex",
        position: "absolute",
        top: "-9999px",
        width: $svgObj.width(),
        height: $svgObj.height()
      }).append($svgClone).append($("#slide").clone()); // 將 foreignObject 內的 div#slide加入

      $("body").append($canvasDiv);
      
      // step2: 根據 segments 建立 myImages 陣列 (convas)
      // let myImages = [];
      myImages = []
      for (let thisTau of segments) {
        if (cancelProgress) break;
        if ($("#btn_animsEnable").prop("checked")===false && (mode === "clipboard" || mode === "png-capture")){
          // 靜態模式擷取當下畫面不用執行 setTcCircle
        } else { // 更新畫面 setTcCircle
          await setTcCircle(thisTau, $("#canvasDiv>svg"), thisTau === 0 ? true : false, thisTau === 0 ? false : true);
          await new Promise(requestAnimationFrame); // 不等畫面顯示
        }
        const baseCanvas = await makeCanvas($("#canvasDiv")[0], 2.666667);
        myImages.push({tau: thisTau, dataUrl: baseCanvas.toDataURL("image/png")});
      }
      
      // step3: 輸出檔案
      if (mode === "clipboard") {
        // 只擷取第一張
        const blob = dataURLToBlob(myImages[0].dataUrl);
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        alert("已複製畫面到剪貼簿！");
      } else if (mode.includes("png")) {
        if (myImages.length === 1) {
          const link = document.createElement("a");
          link.download = `${fileName}.png`;
          link.href = myImages[0].dataUrl;
          link.click();
        } else {
          // 多個 PNG → 壓縮成 zip
          const zip = new JSZip();
          myImages.forEach((c, i) => {
            zip.file(`${fileName}_${c.tau}.png`, c.dataUrl.split(",")[1], { base64: true });
          });
          const content = await zip.generateAsync({ type: "blob" });
          saveAs(content, `${fileName}.zip`);
        }
      } else if (mode.includes("pdf")) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("landscape", "pt", [$svgObj.width(), $svgObj.height()]);
        for (let i = 0; i < myImages.length; i++) {
          if (cancelProgress) break;
          if (i > 0) pdf.addPage();
          pdf.addImage(myImages[i].dataUrl, "PNG", 0, 0, $svgObj.width(), $svgObj.height());
        }
        pdf.save(`${fileName}.pdf`);
      } 
      
    
    // Type3: GIF動畫形式 或 PPT投影片 => (分成三個圖層)
    } else if (["gif", "gif-split", "gif-capture", "ppt", "ppt-split", "ppt-gif", "ppt-gif-split"].includes(mode)) {

      $("#Modal").show();
      $("#progressText").text("正在處理圖層...");
      $("#progressBar").css("width", "0%");
      $("#modalCancelBtn").hide();
      $("#modalStopBtn").show();
      $("#modalDoneBtn").prop("disabled", true);
      
      // step1: 將截圖區分為三層：底圖層（baseLayer）、動畫層（animLayer）、 標題層（topLayer）##
      // 1. 底圖層（baseLayer）：為SVG內不變動的部分。複製 svg 並移除變動部分、foreignObject與animate
      let $svgClone = $("#basemap").clone();
      $svgClone.find("g#warning_marks .mark-fcst, g#tc_circle, foreignObject, animate").remove();  // 移除  warning_marks .mark-fcst 與  #tc_circle 、foreignObject

      const $baseDiv = $("<div id='baseDiv'>").css({
        position: "absolute",
        top: "-9999px",
        width: $svgObj.width(),
        height: $svgObj.height()
      }).append($svgClone);

      $("body").append($baseDiv);
      
      const baseCanvas = await makeCanvas($("#baseDiv")[0], scaleFactor)
      
      // ✅ Debug: 輸出 baseCanvas base64 圖像
      // console.log(`baseCanvas:`, baseCanvas.toDataURL());
      
      $("#svgObj g#warning_range").show()
      
      // 2. 動畫層（animLayer）：僅保留SVG內會變動的部分
      $svgClone = $("#basemap").clone();
      $svgClone.find("defs style, defs>g:not(#tyIcon_past,#tyIcon_fcst), >g:not(#warning_range), g#warning_circle,g#warning_marks .mark-past, foreignObject, animate").remove() // 只留下 #warning_marks .mark-fcst 與  #tc_circle
      
      const $animDiv = $("<div id='animDiv'>").css({
        position: "absolute",
        top: "-9999px",
        width: $svgObj.width(),
        height: $svgObj.height()
      }).append($svgClone);  

      $("body").append($animDiv);
      
      // 3. 標題層（topLayer），擷取 SVG foreignObject 內的 #silde（HTML文字區）
      const $topDiv = $("<div id='topDiv'>").css({
        position: "absolute",
        top: "-9999px",
        width: $svgObj.width(),
        height: $svgObj.height()
      }).append($("#slide").clone());

      $("body").append($topDiv);
      
      const topCanvas = await makeCanvas($("#topDiv")[0], scaleFactor)
      
      // step2: 建立 myImages 陣列    逐幀處理動畫層（animLayer），並合併三層到一個 canvas
      // let myImages = [];   // myImages
      myImages = []
      
      // 2.1 GIF ==> 收集所有 frame → 存入 canvasList ，再建立 GIF myImages
      if (mode.includes("gif")) {
        let canvasList = [];   // canvasList

        const totalDuration = (mode === "gif-capture" ? (aniParas.dur - pauseSec) : (xPData[xPData.length-1].tau - xPData[0].tau))/perHr || 12; // 動畫總秒數
        const fps = 8;
        const totalFrames = totalDuration * fps;
        
        console.log("totalFrames:",totalFrames)

        for (let frame = 0; frame <= totalFrames; frame++) {
          if (cancelProgress) break;

          const thisTau = parseInt((frame * perHr / fps) + (mode === "gif-capture" ? aniParas.tau[0] : xPData[0].tau));
          console.log(thisTau)

          // 更新暴風圈圖層
          await setTcCircle(thisTau, $("#animDiv>svg"));
          await new Promise(requestAnimationFrame);

          // 擷取 anim 層
          const animCanvas = await makeCanvas($("#animDiv")[0], scaleFactor)
          
          if (mode.includes("ppt")) {
            canvasList.push({ tau: thisTau, canvas: animCanvas });
          } else {
            // 合併三層
            const mergedCanvas = document.createElement("canvas");
            mergedCanvas.width = baseCanvas.width;
            mergedCanvas.height = baseCanvas.height;
            const ctx = mergedCanvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(baseCanvas, 0, 0);
            ctx.drawImage(animCanvas, 0, 0);
            ctx.drawImage(topCanvas, 0, 0);

            // 先存起來，不立即加到 gif
            canvasList.push({ tau: thisTau, canvas: mergedCanvas });
            
            // ⏳ 更新進度條
            const percent = Math.round((frame / totalFrames/3) * 100);
            // console.log(thisTau,frame,totalFrames,percent)
            $("#progressText").text("正在處理影格圖片...");
            $("#progressBar").css("width", `${percent}%`);
          }
        }
        
        // 使用：segments = [[tauStart1, tauEnd1], [tauStart2, tauEnd2], ...]
        console.log("canvasList:",canvasList.length)
        const myImages = await buildGifsBySegments(canvasList, segments, fps, pauseSec);
        
        console.log("myImages.length:", myImages.length)
        console.log(myImages[0].dataUrl)

        // myImages = [{segment:0, blob:GIFBlob}, {segment:1, blob:GIFBlob}, ...]
        // 可以用 saveAs(myImages[i].blob, `segment_${i}.gif`);
        
      // 2.2 PPT非GIF ==> 依照 segments 建立 myImages
      } else if (mode.startsWith("ppt-")) { 
        for (let thisTau of segments) {
          if (cancelProgress) break;
          if ($("#btn_animsEnable").prop("checked")===false && (mode === "clipboard" || mode === "png-capture")){
            // 靜態模式擷取當下畫面不用執行 setTcCircle
          } else { // 更新畫面 setTcCircle
            await setTcCircle(thisTau, $("#animDiv>svg"), thisTau === 0 ? true : false, thisTau === 0 ? false : true);
            await new Promise(requestAnimationFrame); // 不等畫面顯示
          }
          const animCanvas = await makeCanvas($("#animDiv")[0], 2.666667)
          myImages.push({ tau: thisTau, dataUrl: animCanvas.toDataURL("image/png")});
        }
      }

      // step3: 輸出檔案
      if (mode === "gif") {  
        // 單一 GIF → 直接下載
        if (myImages.length > 0) {
          const url = myImages[0].dataUrl;
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fileName}.gif`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else if (mode === "gif-split") {
        // 多個 GIF → zip 壓縮
        const zip = new JSZip();
        myImages.forEach((img, i) => {
          console.log(`${fileName}_${img.segment.join("-")}.gif`)
          zip.file(`${fileName}_${img.segment.join("-")}.gif`, dataURLToBlob(img.dataUrl));
        });
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (mode.startsWith("ppt-")) {  // 輸出檔案類型為 PPT
        // slide 寬高 換算成英吋
        const widthIn = 720 / 72;
        const heightIn = 405 / 72;

        const pptx = new PptxGenJS();
        pptx.defineLayout({ name: "custom", width: widthIn, height: heightIn });
        pptx.layout = "custom";
        
        const baseImgData = baseCanvas.toDataURL("image/png");
        const topImgData = topCanvas.toDataURL("image/png");
        
        for (let c of myImages) {
          if (cancelProgress) break;
          let slide = pptx.addSlide();
          slide.addImage({ data: baseImgData, x: 0, y: 0, w: widthIn, h: heightIn });
          slide.addImage({ data: c.dataUrl,   x: 0, y: 0, w: widthIn, h: heightIn });
          slide.addImage({ data: topImgData,  x: 0, y: 0, w: widthIn, h: heightIn });
        }
        await pptx.writeFile({ fileName: `${fileName}.pptx` });
        // console.log("PPT下載完成")
      }
    }

  } catch (err) {
    console.error("截圖錯誤：", err);
    alert("截圖發生錯誤！");
  } finally {
    ["#baseDiv", "#animDiv", "#topDiv", "#canvasDiv"].forEach(sel => $(sel).remove());
    $("#editor-panel").show();
  }
}

// === 工具函式 ===
// 匯出 SVG（包含 foreignObject）
function exportAsSvg(fileName = "screenshot" ) {
  
  const svgEl = document.querySelector("svg#basemap");
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

async function makeCanvas(canvasDiv,scaleFactor) {
  const myCanvas = await html2canvas(canvasDiv, {
    backgroundColor: null,
    scale: scaleFactor,
    useCORS: true,
    removeContainer: true,         // 清除臨時容器節省記憶體
    logging: false                 // 關閉 log
  });
  
  return myCanvas;
}

// 依照 segments 分段輸出 GIF
// GIF → 轉 blob → dataUrl
async function buildGifsBySegments(canvasList, segments, fps, pauseSec) {
  const gifs = [];

  for (let i = 0; i < segments.length; i++) {
    const [startTau, endTau] = segments[i];
    const gif = new GIF({
      workers: 2,
      quality: 1,
      // width: baseCanvas.width,
      // height: baseCanvas.height,
      width: canvasList[0].canvas.width,
      height: canvasList[0].canvas.height,
      workerScript: "./js/gif.worker.js"
    });

    canvasList.forEach((frame, idx) => {
      if (frame.tau >= startTau && frame.tau <= endTau) {
        gif.addFrame(frame.canvas, {
          delay: (idx + 1 === canvasList.length && pauseSec > 0)
            ? 1000 * pauseSec
            : 1000 / fps
        });
      }
    });

    gifs.push(new Promise((resolve) => {
      gif.on("finished", async (blob) => {
        const dataUrl = await blobToDataUrl(blob);
        resolve({ segment: segments[i], dataUrl });
      });
      gif.render();
    }));
  }

  return Promise.all(gifs);
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function dataURLToBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
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
      $("#slide").offset().left + 5,
      $("#slide").offset().top + 55,
      $("#slide").offset().left + 715 - $("#keypoint").outerWidth(),
      $("#slide").offset().top + 325 - $("#keypoint").outerHeight()
    ];
    $("#keypoint").draggable({ containment: pointRange });
    
    // console.log("#keypoint draggable")
    
    
    // div#keypoint-mark>div 可拖曳   
    // const markRange = [
      // $("#slide").position().left + 5,
      // $("#slide").position().top + 55,
      // $("#slide").position().left + 715 - $("#keypoint-mark div").width(),
      // $("#slide").position().top + 325 - $("#keypoint-mark div").height()
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
  const ppt_theme_type = $("select#ppt_theme_type option:selected").val();
  let editableSelectors = [];

  if (ppt_theme_type === "Full_Map_1") {
    editableSelectors = [
      "#slide-title",
      "#slide-description",
      "#slide-production>div",
      "#keypoint-content .warning-text span:nth-of-type(4)"
    ];
  } else if (ppt_theme_type === "Right_Map_1") {
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
    if (ppt_theme_type === "Right_Map_1") {
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
  // const svg = document.querySelector("svg#basemap");
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

    let ppt_theme_type = $("select#ppt_theme_type option:selected").val() // 投影片樣式

    // 邊界檢查
    if (ppt_theme_type === "Full_Map_1") {
      if (newX < 0) newX = 0;
    } else if (ppt_theme_type === "Right_Map_1") {
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
  let oldWidth = parseInt($('#basemap').attr('width'), 10)
  let oldHeight = parseInt($('#basemap').attr('height'), 10)
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
  
  let ppt_theme_type = $("select#ppt_theme_type option:selected").val() // 投影片樣式

  // 6.3 位置檢查 (超出邊框則改為靠邊對齊)
  if (newLeft < 0 && ppt_theme_type != "Right_Map_1") {
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

// 顯示當前的 經緯度範圍(Domain_Range) 資訊
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
  
  let ppt_theme_type = $("select#ppt_theme_type option:selected").val() // 投影片樣式

  // currentViewBox.textContent = `現在的 viewBox 範圍為：(${Domain_LTWH})`
  currentViewBox.setAttribute('per_LonLat', per_LonLat.toString().replaceAll(",", " "))
  currentViewBox.setAttribute('Domain_Range', Domain_Range.toString().replaceAll(",", " "))
  currentViewBox.textContent = `經緯度範圍： ${parseFloat(Domain_Range[1][0]).toFixed(2)}N ~ ${parseFloat(Domain_Range[1][1]).toFixed(2)}N ; ${parseFloat(ppt_theme_type === "Right_Map_1" ? Domain_Range[0][0] + (Domain_Range[0][1]-Domain_Range[0][0])/2 : Domain_Range[0][0]).toFixed(2)}E ~ ${parseFloat(Domain_Range[0][1]).toFixed(2)}E`
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
