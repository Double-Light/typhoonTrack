// 移速移向文字說明
let Directions = {
  "N": "北",
  "NNE": "北北東",
  "NE": "東北",
  "ENE": "東北東",
  "E": "東",
  "ESE": "東南東",
  "SE": "東南",
  "SSE": "南南東",
  "S": "南",
  "SSW": "南南西",
  "SW": "西南",
  "WSW": "西南西",
  "W": "西",
  "WNW": "西北西",
  "NW": "西北",
  "NNW": "北北西",
  "null": "null"
}

// 四捨五入
roundTo = function(num, decimal) {
  return Math.round((num + Number.EPSILON) * Math.pow(10, decimal)) / Math.pow(10, decimal);
}

/* 建立/更新選單：TD/TY清單 */
gen_TDTY_List = function() {
  let Select_List = ""
  let YYYY = $("select#year").val()
  // 讀取該年度路徑資料、警報歷史資料
  // get_Track_data(YYYY)
  const Track_data = get_Track_data(YYYY);
  AData = Track_data.AData;
  FData = Track_data.FData;
  WData = Track_data.WData;
  Warning_History = Track_data.Warning_History;
  Warning_Estimate = Track_data.Warning_Estimate;

  if (Flag_Initial) {
    // console.log("TD/TY清單初始化");
    $("div#control").append("TD/TY：<select id='TyList'></select>&emsp;")
  };
  _.keys(AData).reverse().forEach(function(v, i) {
    let tc_num = AData[v]["cwb_tc_no"] ? AData[v]["cwb_tc_no"] : AData[v]["cwb_td_no"];
    let tc_num_name = 'TC' + YYYY + padLeft(tc_num, 2)
    let td_num = AData[v]["cwb_td_no"]
    let td_num_name = 'TD' + YYYY + padLeft(td_num, 2)
    let ty_num = AData[v]["cwb_ty_no"]
    let ty_num_name = td_num_name
    if (ty_num != null) {
      ty_num_name = `TY${YYYY}` + padLeft(ty_num, 2)
    }
    let ty_name = AData[v]["typhoon_name"]
    let ty_chname = AData[v]["cwb_typhoon_name"]

    let xName = td_num + ". " + ty_chname
    let yName = "(" + ty_name + ")"
    let zName = ty_name
    if (!isNaN(ty_name)) {
      xName = td_num + ". " + td_num_name;
      yName = "";
      zName = td_num_name
    }
    Select_List += "<option value='" + td_num_name + "' name='" + zName + "' tcnum='" + tc_num + "' tdnum='" + td_num + "' tynum='" + ty_num + "' tcnumname='" + tc_num_name + "'  tynumname='" + ty_num_name + "' tdnum='" + td_num + "' tyname='" + ty_name + "' tychname='" + ty_chname + "'>" + xName + " " + yName + " </option>"
  });
  $("select#TyList").html(Select_List)
  // $("select#TyList option[value='"+Inputs.tdname+"']").prop("selected",true)
  // Inputs = get_Inputs()
};

/* 讀取該年度颱風路徑預報時間(僅列出守視範圍內) */
get_TrackFcst_dict = function() {
  trackFcst_dict = {}
  FData.forEach(typhoon => {
    const cwbTdNo = typhoon.cwb_td_no;
    const typhoonName = typhoon.typhoon_name;
    const cwbTyphoonName = typhoon.cwb_typhoon_name;

    // 篩選 tau = 0 時，颱風中心位置在守視範圍內的 init_time
    let initTimes = typhoon.data
    .filter(data => data.tau === 0 && data.coordinate[0] >= 115 && data.coordinate[0] <= 128 && data.coordinate[1] >= 17 && data.coordinate[1] <= 29)
    .map(data => data.init_time);

    // 剔除只出現一次的時間點 (tau 無>0)
    initTimes.forEach(initTime => {
      let count = 0;
      for (let i = 0; i < typhoon.data.length; i++) {
        if (typhoon.data[i].init_time === initTime) {
          count++;
        }
      }
      // console.log(typhoonName, initTime, count)
      if (count <= 1) {
        initTimes = initTimes.filter(function(item) {
          return item !== initTime
        })
      }
    });

    trackFcst_dict[cwbTdNo] = {
      cwb_typhoon_name: cwbTyphoonName,
      typhoon_name: typhoonName,
      init_times: initTimes
    };
  });
};

/* 建立/更新選單：颱風路徑預報時間清單 */
gen_TrackFcst_list = function() {
  let td_num = $("select#TyList option:selected").attr("tdnum")
  let Select_List = ""

  // console.log(td_num);

  trackFcst_dict[td_num]['init_times'].reverse().forEach(function(init_time) {
    // console.log(init_time);
    Select_List += '<option value="' + init_time + '">' + moment(init_time).format("MM/DD_HH:mm") + '</option>'
  });

  // console.log(Select_List)

  $("select#trackFcstList").html(Select_List)
};

// 建立/更新路徑預報頁面 (表格初始化) => 讀取Input => 清空資訊 => 建立/更新路徑預報頁面
gen_TrackFcstPage = function() {
  // step 1 : 繪製 slide SVG 與 路徑資訊 Table
  if (Flag_Initial) {
    // console.log("表格初始化");
    // 表格初始化
    $("table#TrackFcst").html('<thead><tr><th id="track_info"></th></tr></thead><tbody><tr><td></td><td id="track_fcst_control"><div>投影片類型：<select id="ppt_theme_type"><option value="Full_Map_1" selected="">全版配置</option><option value="Right_Map_1">右圖左字</option></select></div><div>初始時間：<select id="trackFcstList"></select> (LST)</div><div id="slide_production_btn"><input type="button" id="slide_production" name="production_track_fcst" value="颱風路徑簡報下載"></div></td><td></td></tr><tr><td></td><td id="track"><div id="track-zoom"><div id="svgObj">' + SVG_Track + '<div id="fullscreenHint">按 ESC 可退出全螢幕</div><div id="control-panel"><div class="panel-div"><button id="btn_fullscreen" title="全螢幕"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707m4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707m0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707m-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707"></path></svg></button></div><div class="panel-div"><button id="btn_screenshot" title="截圖至剪貼簿"><svg id="icon-screenshot" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5M.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5"></path><path d="M 7.1210938 4 A 1.5 1.5 0 0 0 6.0605469 4.4394531 L 5.4394531 5.0605469 A 1.5 1.5 0 0 1 4.3789062 5.5 L 3.5 5.5 A 1.5 1.5 0 0 0 2 7 L 2 11.5 A 1.5 1.5 0 0 0 3.5 13 L 12.5 13 A 1.5 1.5 0 0 0 14 11.5 L 14 7 A 1.5 1.5 0 0 0 12.5 5.5 L 11.621094 5.5 A 1.5 1.5 0 0 1 10.560547 5.0605469 L 9.9394531 4.4394531 A 1.5 1.5 0 0 0 8.8789062 4 L 7.1210938 4 z M 7.1203125 4.75 L 8.8783203 4.75 A 0.75 0.75 0 0 1 9.4085937 4.9697266 L 10.029492 5.5908203 A 2.25 2.25 0 0 0 11.621094 6.25 L 12.5 6.25 A 0.75 0.75 0 0 1 13.25 7 L 13.25 11.5 A 0.75 0.75 0 0 1 12.5 12.25 L 3.5 12.25 A 0.75 0.75 0 0 1 2.75 11.5 L 2.75 7 A 0.75 0.75 0 0 1 3.5 6.25 L 4.3789062 6.25 A 2.25 2.25 0 0 0 5.9689453 5.5908203 L 6.5914063 4.9697266 A 0.75 0.75 0 0 1 7.1203125 4.75 z M 8 6.25 A 2.625 2.625 0 0 0 8 11.5 A 2.625 2.625 0 0 0 8 6.25 z M 3.8730469 7 A 0.375 0.375 0 0 0 3.8494141 7.0007813 A 0.375 0.375 0 0 0 3.5 7.375 A 0.375 0.375 0 0 0 4.25 7.375 A 0.375 0.375 0 0 0 3.8730469 7 z M 8 7 A 1.875 1.875 0 0 1 8 10.75 A 1.875 1.875 0 0 1 8 7 z "></path></svg></button> <button id="btn_download_png" title="儲存為PNG檔"><svg id="icon-dw-png" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2v-1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zm-3.76 8.132q.114.23.14.492h-.776a.8.8 0 0 0-.097-.249.7.7 0 0 0-.17-.19.7.7 0 0 0-.237-.126 1 1 0 0 0-.299-.044q-.427 0-.665.302-.234.301-.234.85v.498q0 .351.097.615a.9.9 0 0 0 .304.413.87.87 0 0 0 .519.146 1 1 0 0 0 .457-.096.67.67 0 0 0 .272-.264q.09-.164.091-.363v-.255H8.82v-.59h1.576v.798q0 .29-.097.55a1.3 1.3 0 0 1-.293.458 1.4 1.4 0 0 1-.495.313q-.296.111-.697.111a2 2 0 0 1-.753-.132 1.45 1.45 0 0 1-.533-.377 1.6 1.6 0 0 1-.32-.58 2.5 2.5 0 0 1-.105-.745v-.506q0-.543.2-.95.201-.406.582-.633.384-.228.926-.228.357 0 .636.1.281.1.48.275.2.176.314.407Zm-8.64-.706H0v4h.791v-1.343h.803q.43 0 .732-.172.305-.177.463-.475a1.4 1.4 0 0 0 .161-.677q0-.374-.158-.677a1.2 1.2 0 0 0-.46-.477q-.3-.18-.732-.179m.545 1.333a.8.8 0 0 1-.085.381.57.57 0 0 1-.238.24.8.8 0 0 1-.375.082H.788v-1.406h.66q.327 0 .512.182.185.181.185.521m1.964 2.666V13.25h.032l1.761 2.675h.656v-3.999h-.75v2.66h-.032l-1.752-2.66h-.662v4z"/><path d="M8 5a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5A.5.5 0 0 1 8 5"/></svg></button> <button id="btn_download_gif" title="儲存為GIF檔"><svg id="icon-dw-gif" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H9v-1h3a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zM3.278 13.124a1.4 1.4 0 0 0-.14-.492 1.3 1.3 0 0 0-.314-.407 1.5 1.5 0 0 0-.48-.275 1.9 1.9 0 0 0-.636-.1q-.542 0-.926.229a1.5 1.5 0 0 0-.583.632 2.1 2.1 0 0 0-.199.95v.506q0 .408.105.745.105.336.32.58.213.243.533.377.323.132.753.132.402 0 .697-.111a1.29 1.29 0 0 0 .788-.77q.097-.261.097-.551v-.797H1.717v.589h.823v.255q0 .199-.09.363a.67.67 0 0 1-.273.264 1 1 0 0 1-.457.096.87.87 0 0 1-.519-.146.9.9 0 0 1-.305-.413 1.8 1.8 0 0 1-.096-.615v-.499q0-.547.234-.85.237-.3.665-.301a1 1 0 0 1 .3.044q.136.044.236.126a.7.7 0 0 1 .17.19.8.8 0 0 1 .097.25zm1.353 2.801v-3.999H3.84v4h.79Zm1.493-1.59v1.59h-.791v-3.999H7.88v.653H6.124v1.117h1.605v.638z"/><path d="M8 5a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5A.5.5 0 0 1 8 5"/></svg></button> <button id="btn_download_svg" title="儲存為SVG檔"><svg id="icon-dw-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2v-1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zM0 14.841a1.13 1.13 0 0 0 .401.823q.194.162.478.252.285.091.665.091.507 0 .858-.158.355-.158.54-.44a1.17 1.17 0 0 0 .187-.656q0-.336-.135-.56a1 1 0 0 0-.375-.357 2 2 0 0 0-.565-.21l-.621-.144a1 1 0 0 1-.405-.176.37.37 0 0 1-.143-.299q0-.234.184-.384.187-.152.513-.152.214 0 .37.068a.6.6 0 0 1 .245.181.56.56 0 0 1 .12.258h.75a1.1 1.1 0 0 0-.199-.566 1.2 1.2 0 0 0-.5-.41 1.8 1.8 0 0 0-.78-.152q-.44 0-.776.15-.337.149-.528.421-.19.273-.19.639 0 .302.123.524t.351.367q.229.143.54.213l.618.144q.31.073.462.193a.39.39 0 0 1 .153.326.5.5 0 0 1-.085.29.56.56 0 0 1-.256.193q-.167.07-.413.07-.176 0-.32-.04a.8.8 0 0 1-.248-.115.58.58 0 0 1-.255-.384zm4.575 1.09h.952l1.327-3.999h-.879l-.887 3.138H5.05l-.897-3.138h-.917zm5.483-3.293q.114.228.14.492h-.776a.8.8 0 0 0-.096-.249.7.7 0 0 0-.17-.19.7.7 0 0 0-.237-.126 1 1 0 0 0-.3-.044q-.427 0-.664.302-.235.3-.235.85v.497q0 .352.097.616a.9.9 0 0 0 .305.413.87.87 0 0 0 .518.146 1 1 0 0 0 .457-.097.67.67 0 0 0 .273-.263q.09-.164.09-.364v-.254h-.823v-.59h1.576v.798q0 .29-.096.55a1.3 1.3 0 0 1-.293.457 1.4 1.4 0 0 1-.495.314q-.296.111-.698.111a2 2 0 0 1-.752-.132 1.45 1.45 0 0 1-.534-.377 1.6 1.6 0 0 1-.319-.58 2.5 2.5 0 0 1-.105-.745v-.507q0-.54.199-.949.202-.406.583-.633.383-.228.926-.228.357 0 .635.1.282.1.48.275.2.176.314.407"/><path d="M8 5a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5A.5.5 0 0 1 8 5"/></svg></button></div><div class="panel-div fullscreenHide"><button id="btn_edit" type="svg-drag-zoom" title="地圖拖曳縮放"><svg id="icon-map-domain" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"></path><path d="m 8,14 c 0,0 4.5,-4.2645 4.5,-7.5 a 4.5,4.5 0 0 0 -9,0 c 0,3.2355 4.5,7.5 4.5,7.5 m 0,-5.25 a 2.25,2.25 0 1 1 0,-4.5 2.25,2.25 0 0 1 0,4.5"></path></svg> <svg id="icon-slide-edit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"></path><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"></path></svg></button></div><div class="panel-div"><button id="btn_markLarge" title="放大標記"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M2 3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h5.5a.5.5 0 0 1 0 1H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v4a.5.5 0 0 1-1 0V4a1 1 0 0 0-1-1z"></path><path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-3.5-2a.5.5 0 0 0-.5.5v1h-1a.5.5 0 0 0 0 1h1v1a.5.5 0 0 0 1 0v-1h1a.5.5 0 0 0 0-1h-1v-1a.5.5 0 0 0-.5-.5"></path></svg></button> <button id="btn_markSmall" title="縮小標記"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M2 3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h5.5a.5.5 0 0 1 0 1H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v4a.5.5 0 0 1-1 0V4a1 1 0 0 0-1-1z"></path><path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-5.5 0a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 0-1h-3a.5.5 0 0 0-.5.5"></path></svg></button></div><div class="panel-div"><label class="switch" title="啟用/停用動畫"><input type="checkbox" id="btn_animsEnable" checked="checked"> <span class="slider"></span></label> <button id="btn_animsPlayPause" type="animsPlay" title="播放/暫停"><svg id="icon-play" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"></path></svg> <svg id="icon-pause" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"></path></svg></button> <button id="btn-back-point" style="display:none"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="m3.86 8.753 5.482 4.796c.646.566 1.658.106 1.658-.753V3.204a1 1 0 0 0-1.659-.753l-5.48 4.796a1 1 0 0 0 0 1.506z"></path></svg></button> <button id="btn-next-point" style="display:none"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"></path></svg></button></div></div><div id="tooltip"></div></div></div><div id="DomainInfo"><div id="showDomainRange"></div><div id="showLatLon"></div></div></td><td></td></tr><tr id="track-grid" style="text-align:left"><td></td><td><div id="editor-panel"><div id="point-data"><table style="width:100%;text-align:center"><thead><tr><th>時距</th><th>緯度</th><th>經度</th><th>強度</th><th>陣風</th><th>中心氣壓</th><th>7級半徑</th><th>10級半徑</th></tr><tr><th>(hrs)</th><th>(deg)</th><th>(deg)</th><th>(m/s)</th><th>(m/s)</th><th>(hPa)</th><th>(km)</th><th>(km)</th></tr></thead><tbody></tbody></table></div><div id="warning_estimate"><div><div id="warning_estimate_title" style="height:49px"><span style="font-size:1.25rem">警報時間預估(LST)</span></div></div><div id="warning_estimate_list"></div></div></div></td><td></td></tr></tbody>')

    // 指定SVG
    svg = document.getElementById("basemap");
    fObj = document.getElementById("slideObject");

    // 讀取SVG原始參數
    Map_Size = svg
      .getAttribute('map-size')
      .split(' ')
      .map((n) => parseFloat(n));

    Map_Range = svg
      .getAttribute('map-range')
      .split(' ')
      .map((n) => parseFloat(n));

    per_Lon = Map_Size[0] / (Map_Range[1] - Map_Range[0]); // 經度轉px (地圖原始大小)
    per_Lat = Map_Size[1] / (Map_Range[2] - Map_Range[3]); // 緯度轉px (地圖原始大小)
    
    // 更新預報時間選單
    gen_TrackFcst_list()
  };

  // 讀取 Inputs
  let YYYY = $("select#year").val() // 颱風年份
  let yName = $("select#TyList option:selected").attr("name") // 名稱
  let ty_name = $("select#TyList option:selected").attr("tyname") // 颱風名稱(英文)
  let ty_ch_name = $("select#TyList option:selected").attr("tychname") // 颱風名稱(中文)
  let td_num = parseInt($("select#TyList option:selected").attr("tdnum"))
  let ty_num = $("select#TyList option:selected").attr("tynum") != 'null' ? parseInt($("select#TyList option:selected").attr("tynum")) : null
  let xInitDate = $("select#trackFcstList option:selected").val() ? $("select#trackFcstList option:selected").val() : null // 路徑預報時間 (字串，UTC)
  let xInitDate_OBJ = moment(xInitDate) // 路徑預報時間 (Local Time)

  // 清空資訊
  // SVG g 清空
  $("g#pastPath").contents().remove();
  $("g#fcstPath").contents().remove();
  $("g#tc_point").contents().remove();
  $("g#tc_circle").contents().remove();
  $("g#warning_circle").contents().remove();
  $("g#warning_marks").contents().remove();
  $("div#keypoint-mark").contents().remove();

  // slide內清空
  $("#slide-title").contents().remove();
  $("#slide-description").contents().remove();
  $("#slide-production div").contents().remove();
  $("#keypoint").hide();
  $("#keypoint-content").contents().remove();

  // editor-panel 清空
  $("div#point-data tbody").contents().remove()
  $("#warning_estimate_list").contents().remove();


  // 單時間點路徑資料(PData)建立 
  PData = [] // 篩選後路徑 (Point Data)
  yPData = [] // 篩選後過去路徑
  xPData = [] // 篩選後預報路徑

  let xstr = ""

  console.log("颱風年份： " + YYYY + '\n颱風名稱： ' + ty_ch_name + '(' + yName + ')' + (xInitDate != null ? '\n預報時間： ' + moment(xInitDate_OBJ).format("MM月DD日 HH:mm") + " (LST)" : '\n!! 未進入守視範圍 !!'))
  // console.log("預報時間：" + moment(xInitDate_OBJ).format("MM/DD_HH:mm") + " (LST)")

  // 路徑預報時間非 null
  if (xInitDate != null) {
    /* 過去路徑 */

    yPData = AData[yName]["data"].filter((xitem) => moment(xitem["fix_time"]) <= xInitDate_OBJ) // 篩選該時間點颱風路徑資料
    let yPaths = [];

    yPData.forEach(item => {
      // console.log(item)

      let ax = roundTo((parseFloat(item["coordinate"][0]) - Map_Range[0]) * per_Lon, 2);
      let ay = roundTo((parseFloat(item["coordinate"][1]) - Map_Range[3]) * per_Lat, 2);
      let R15 = get_radius(item['circle_of_15ms']);
      let R25 = get_radius(item['circle_of_25ms']);

      let timeString = moment(item['fix_time']).format("yyyy-MM-DD HH:mm")
      let tauTime = Math.round((moment(item['fix_time']) - moment(xInitDate)) / 3600000);

      // path
      yPaths.push(ax + " " + ay);

      // Point Data
      if (tauTime < 0) {
        item['type'] = "past"
        item['tau'] = tauTime
        item['time'] = timeString
        item['ax'] = ax
        item['ay'] = ay
        item['R15_x'] = R15 > 0 ? roundTo(((R15 / 110 * per_Lon) / Math.cos((Math.PI / 180) * item["coordinate"][1])), 3) : 0
        item['R15_y'] = R15 > 0 ? roundTo(((R15 / 110 * per_Lon)), 3) : 0
        item['R25_x'] = R25 > 0 ? roundTo(((R25 / 110 * per_Lon) / Math.cos((Math.PI / 180) * item["coordinate"][1])), 3) : 0
        item['R25_y'] = R25 > 0 ? roundTo(((R25 / 110 * per_Lon)), 3) : 0
        PData.push(item)
      }

      // Point Table 顯示
      if (tauTime == -3 || tauTime == -6 || tauTime == -9) {
        $("#point-data tbody").append(`<tr class="past" name="${timeString}"><td name="tau" title="${timeString}">${tauTime}</td><td name="lat">${parseFloat(item["coordinate"][1]).toFixed(1)}</td><td name="lon">${parseFloat(item["coordinate"][0]).toFixed(1)}</td><td name="max_wind_speed">${item['max_wind_speed']}</td><td name="max_gust_speed">${item['max_gust_speed']}</td><td name="pressure">${item['pressure']}</td><td name="circle_of_15ms">${R15}</td><td name="circle_of_25ms">${R25}</td></tr>`);
      }
    });

    // 設定過去路徑 (pastPath)
    if (yPaths != []) {
      $("g#pastPath").html('<path d="M ' + yPaths.join(" L ") + '"></path>');
    }

    /* 預報路徑 */
    let xTCData = _.where(FData, { cwb_td_no: td_num}) // 該颱風所有資料
    xPData = _.where(xTCData[0]["data"], { init_time: xInitDate }) // 篩選該時間點颱風路徑資料
    
    let xPaths = [];
    let xPoints = [];

    xPData.forEach((item, i) => {
      let pointType
      let ax = roundTo((parseFloat(item["coordinate"][0] - Map_Range[0])) * per_Lon, 2)
      let ay = roundTo((parseFloat(item["coordinate"][1] - Map_Range[3])) * per_Lat, 2)
      let R15 = get_radius(item['circle_of_15ms']);
      let R25 = get_radius(item['circle_of_25ms']);

      let rx
      let ry

      let timeString = moment(item['init_time']).add(item['tau'], "hours").format("yyyy-MM-DD HH:mm")

      if (item['tau'] == 0) {
        pointType = 'curr'
      } else {
        pointType = 'fcst'
      }

      // path
      xPaths.push(ax + " " + ay);

      // point
      xPoints.push(`<use href="${R15 > 0 ? '#tyPoint' : '#tdPoint'}" x="${ax}" y="${ay}" title="${timeString}"></use>`)

      // Point Data 加入
      item['type'] = pointType
      item['time'] = timeString
      item['ax'] = ax
      item['ay'] = ay
      item['R15_x'] = R15 > 0 ? roundTo(((R15 / 110 * per_Lon) / Math.cos((Math.PI / 180) * item["coordinate"][1])), 3) : 0
      item['R15_y'] = R15 > 0 ? roundTo(((R15 / 110 * per_Lon)), 3) : 0
      item['R25_x'] = R25 > 0 ? roundTo(((R25 / 110 * per_Lon) / Math.cos((Math.PI / 180) * item["coordinate"][1])), 3) : 0
      item['R25_y'] = R25 > 0 ? roundTo(((R25 / 110 * per_Lon)), 3) : 0
      PData.push(item)

      // Point Table 顯示
      $("#point-data tbody").append(`<tr class="${pointType}" name="${timeString}"><td name="tau" title="${timeString}">${item['tau']}</td><td name="lat">${parseFloat(item["coordinate"][1]).toFixed(1)}</td><td name="lon">${parseFloat(item["coordinate"][0]).toFixed(1)}</td><td name="max_wind_speed">${item['max_wind_speed']}</td><td name="max_gust_speed">${item['max_gust_speed']}</td><td name="pressure">${item['pressure']}</td><td name="circle_of_15ms">${R15}</td><td name="circle_of_25ms">${R25}</td></tr>`);
    });

    // console.log(xPaths);

    // 設定預報路徑 (fcstPath)
    if (xPaths != []) {
      $("g#fcstPath").html('<path d="M ' + xPaths.join(" L ") + '"></path>')
    };

    // 設定預報位置 (tc_point)
    if (xPaths != []) {
      $("g#tc_point").html(xPoints.join(""))
    }

    // step 2 : 繪製 slide div (標題與描述)
    setSlideDiv()

    // step 3 : 建立警報相關設定
    gen_warning();
    
    
    // step 4 : 動畫啟用設定
    setEditModel()        // 設定編輯模式
    toggleAnimEnable()    // 動畫啟用設定
  }
};


// 讀取暴風半徑 (新舊版差異)
get_radius = function(elem) {
  if (elem === null) {
    return -99
  } else if (Array.isArray(elem)) {
    return elem[0]['radius']
  } else if ('radius' in elem) {
    return elem['radius']
  } else {
    return null
  }
}

// 設定 slide div (標題與描述)
setSlideDiv = function() {
  // 讀取 Inputs
  let YYYY = $("select#year").val() // 颱風年份
  let ty_name = $("select#TyList option:selected").attr("tyname") // 颱風名稱(英文)
  let ty_ch_name = $("select#TyList option:selected").attr("tychname") // 颱風名稱(中文)
  let td_num = parseInt($("select#TyList option:selected").attr("tdnum"))
  let ty_num = $("select#TyList option:selected").attr("tynum") != 'null' ? parseInt($("select#TyList option:selected").attr("tynum")) : null
  let xInitDate = $("select#trackFcstList option:selected").val() ? $("select#trackFcstList option:selected").val() : null // 路徑預報時間 (字串，UTC)
  let ppt_theme_type = $("select#ppt_theme_type option:selected").val() // 投影片樣式

  if (xInitDate != null) {

    // 變更 #slide ppt_theme_type

    $("#svgObj").attr('ppt_theme_type', ppt_theme_type)
    $("#slide").attr('ppt_theme_type', ppt_theme_type)

    // 有預報資訊才繪製 slide div
    if (xPData.length > 0) {

      let TcTitle = "";
      let strr = "";

      // 篩選該時間點颱風警報單資料
      xWData = WData.filter(item => {
        return (item.tcs.some(tc => tc.fix_time === moment(xInitDate).format("yyyy-MM-DDTHH:mm+08:00")) && item.tcs.some(tc => tc.cwb_ty_no === ty_num));
      });

      let position = "";
      let movement = "";

      if (xWData.length > 0) { // 該時間點有警報單 => 使用警報單內容
        var warning_info = xWData[0]['info']

        // 相對位置
        position = warning_info.find(item => item.name === "命名與位置")?.content.replaceAll("\n", "").replaceAll("​", "")
        position = '，' + position.slice(position.indexOf('即在'))

        // 移速移向
        movement = warning_info.find(item => item.name === "移速與預測")?.content.replaceAll("\n", "").replaceAll("​", "")
        movement = movement.substr(0, movement.indexOf('，預測'))

      } else { // 該時間點無警報單 => 使用預報資料編寫
        // 相對位置
        position = "，即在■■的■■■方約 ●●● 公里。"

        // 移速移向
        movement = '以每小時●●公里速度，向■■■進行';
        // if (xPData.length >= 3) {
        // const speed1 = xPData[1]["moving_speed"];
        // const speed2 = xPData[2]["moving_speed"];
        // const direction1 = Directions[xPData[1]["moving_direction"]];
        // const direction2 = Directions[xPData[2]["moving_direction"]];

        // const speedChange = speed1 !== speed2 ? "轉" + speed2 : "";
        // const directionChange = direction1 !== direction2 ? "轉" + direction2 : "";

        // movement = '以每小時' + speed1 + speedChange +'公里速度，向' + direction1 + directionChange +'進行';
        // } else if (xPData.length == 2) {
        // const speed1 = xPData[1]["moving_speed"];
        // const direction1 = Directions[xPData[1]["moving_direction"]];
        // movement = '以每小時' + speed1 + '公里速度，向' + direction1 + '進行';
        // }
      }

      // Tc目前強度判斷
      let TcIntensity = "";
      if (xPData[0]['max_wind_speed'] >= 51) {
        TcIntensity = "強烈颱風";
      } else if (xPData[0]['max_wind_speed'] >= 32.7) {
        TcIntensity = "中度颱風";
      } else if (xPData[0]['max_wind_speed'] >= 17.2) {
        TcIntensity = "輕度颱風";
      } else {
        TcIntensity = "熱帶性低氣壓";
      }

      strr = ''

      // 讀取現在時間暴風半徑
      R15 = get_radius(xPData[0]['circle_of_15ms']).toString().replace("-99", "--");
      R25 = get_radius(xPData[0]['circle_of_25ms']).toString().replace("-99", "--");

      // 依投影片類型處理資訊
      if (ppt_theme_type === "Full_Map_1") {
        if (TcIntensity === "熱帶性低氣壓") {
          if (ty_ch_name !== 'null') {
            const past_R15_Max = Math.max(..._.map(yPData, item => get_radius(item['circle_of_15ms'])));
            const fcst_R15_Max = Math.max(..._.map(xPData, item => get_radius(item['circle_of_15ms'])));

            if (past_R15_Max > 0) {
              strr = '(原' + ty_ch_name + '颱風)';
            } else if (fcst_R15_Max > 0) {
              strr = '(準' + ty_ch_name + '颱風)';
            }
          }
          TcTitle = YYYY + '年第' + td_num + '號' + '熱帶性低氣壓' + strr;
          strr = TcIntensity + '( 編號第' + td_num + '號';
        } else {
          TcTitle = YYYY + '年第' + ty_num + '號' + ty_ch_name + '(' + ty_name + ')颱風';
          strr = TcIntensity + '' + ty_ch_name + ' (編號第' + ty_num + '號，國際命名' + ty_name + ')';
        }

        strr += "，" + moment(xPData[0]['init_time']).format('DD日HH時mm分').replace("00分", "") +
          "的中心位置在北緯 " + xPData[0]['coordinate'][1].toFixed(1) + " 度，東經 " + xPData[0]['coordinate'][0].toFixed(1) + " 度" +
          position + movement +
          "。中心氣壓 " + xPData[0]['pressure'] + " 百帕" +
          "，近中心最大風速每秒 " + xPData[0]['max_wind_speed'] + " 公尺，瞬間最大陣風每秒 " + xPData[0]['max_gust_speed'] + " 公尺" +
          "，七級風暴風半徑 " + R15 + " 公里" + "，十級風暴風半徑 " + R25 + " 公里。";


        $("#slide-title").html(TcTitle);
        $("#slide-description").html(strr);

        $("#slide-production div").html("製作時間：" + (new Date().getYear() - 11) + "年" + moment(new Date()).format("MM月DD日HH時") + "，本資料視颱風路徑變化而有調整，實際發生時間以中央氣象署發佈為準。");
      } else if (ppt_theme_type === "Right_Map_1") {

        if (TcIntensity === "熱帶性低氣壓") {
          if (ty_ch_name !== 'null') {
            const past_R15_Max = Math.max(..._.map(yPData, item => get_radius(item['circle_of_15ms'])));
            const fcst_R15_Max = Math.max(..._.map(xPData, item => get_radius(item['circle_of_15ms'])));

            if (past_R15_Max > 0) {
              strr = '(原' + ty_ch_name + '颱風)';
            } else if (fcst_R15_Max > 0) {
              strr = '(準' + ty_ch_name + '颱風)';
            }
          }
          TcTitle = '<p>' + YYYY + '年第' + td_num + '號' + '</p><p>' + '熱帶性低氣壓' + strr + '</p>';
        } else {
          TcTitle = '<p>' + YYYY + '年第' + ty_num + '號' + '</p><p>' + ty_ch_name + '(' + ty_name + ')颱風' + '</p><p>路徑預測示意圖</p>';
        }


        $("#slide-title").html(TcTitle);
        $("#slide-description").html('<div id="slide-description-img"><img src="' + slide_description_icon_img + '"></div><table id="slide-description-table"><tbody><tr><td style="width:30px"></td><td name="curr_time" style="height:28px;font-size:14px" colspan="10">00日 00時</td></tr><tr><td></td><td name="curr_coordinate" style="height:18px;font-size:12px" colspan="10">北緯 00.0 度，東經 000.0 度</td></tr><tr><td></td><td name="curr_position" style="height:18px;font-size:12px" colspan="10">■■的■■■方約 ●●● 公里</td></tr><tr><td></td><td name="curr_movement" style="height:18px;font-size:12px" colspan="10">以每小時●●公里速度，向■■■進行</td></tr><tr style="font-size:9px;text-align:center;height:18px"><td></td><td colspan="2">中心氣壓</td><td></td><td style="text-align:right">近中心</td><td name="curr_max_wind" style="font-size:14px;text-align:right">00</td><td>m/s</td><td></td><td>七級風</td><td name="curr_R15" style="font-size:14px;text-align:right">000</td><td>km</td></tr><tr style="font-size:9px;text-align:center;height:18px"><td style="width:28px"></td><td name="curr_pressure" style="font-size:14px;text-align:right;width:37px">000</td><td style="width:23px">hPa</td><td style="width:28px"></td><td style="text-align:right;width:48px">最大陣風</td><td name="curr_max_gust" style="font-size:14px;text-align:right;width:23px">00</td><td style="width:23px">m/s</td><td style="width:28px"></td><td style="width:40px">十級風</td><td name="curr_R25" style="font-size:14px;text-align:right;width:28px">000</td><td style="width:18px">km</td></tr></tbody></table>');

        $('#slide-description-table td[name="curr_time"]').html(moment(xPData[0]['init_time']).format('DD日HH時mm分').replace("00分", ""));
        $('#slide-description-table td[name="curr_coordinate"]').html("北緯 " + xPData[0]['coordinate'][1].toFixed(1) + " 度，東經 " + xPData[0]['coordinate'][0].toFixed(1) + " 度");
        $('#slide-description-table td[name="curr_position"]').html(position.replace("，即在", "即在").replace("之處", "").replace("。", ""));
        $('#slide-description-table td[name="curr_movement"]').html(movement);
        $('#slide-description-table td[name="curr_pressure"]').html(xPData[0]['pressure']);
        $('#slide-description-table td[name="curr_max_wind"]').html(xPData[0]['max_wind_speed']);
        $('#slide-description-table td[name="curr_max_gust"]').html(xPData[0]['max_gust_speed']);
        $('#slide-description-table td[name="curr_R15"]').html(R15);
        $('#slide-description-table td[name="curr_R25"]').html(R25);


        $("#slide-production div").html("製作時間：" + (new Date().getYear() - 11) + "年" + moment(new Date()).format("MM月DD日HH時") + "，本資料視颱風路徑變化而有調整，實際發生時間以中央氣象署發佈為準。");
      }
    } else {
      $("#slide-title").html('');
      $("#slide-description").html('');

      $("#slide-production div").html("製作時間：000年00月00日00時，本資料視颱風路徑變化而有調整，實際發生時間以中央氣象署發布為準。");
    }
  }
}



// 調整SVG ViewBox (警報時間標記建立/變更、投影片類型變更時啟動)
change_SVG_Size = function() {
  let ppt_theme_type = $("select#ppt_theme_type option:selected").val() // 投影片樣式
  const mbox = $("g#warning_marks")[0].getBBox(); // marks範圍 {x, y, width, height}
  const taiwanBBoxes = [405, 340, 56, 65]; // 臺灣範圍  [x, y, width, height]

  let contentSpace // 內容區域
  let whiteSpace // 留白區域 
  let newScale

  // 內容區域 = marks + 臺灣範圍
  if ($("g#warning_marks g").length > 0) {
    xs = Math.min(mbox.x, taiwanBBoxes[0])
    ys = Math.min(mbox.y, taiwanBBoxes[1])
    xe = Math.max(mbox.x + mbox.width, taiwanBBoxes[0] + taiwanBBoxes[2])
    ye = Math.max(mbox.y + mbox.height, taiwanBBoxes[1] + taiwanBBoxes[3])
    contentSpace = [xs, ys, xe - xs, ye - ys]
    // contentSpace = [Math.min(mbox.x,taiwanBBoxes[0]),Math.min(mbox.y,taiwanBBoxes[1]),Math.max(mbox.width,taiwanBBoxes[2]),Math.max(mbox.height,taiwanBBoxes[3])]
  } else {
    contentSpace = taiwanBBoxes // [x, y, width, height]
  }

  if (ppt_theme_type === "Full_Map_1") {
    whiteSpace = [220, 60, 480, 260] // [x, y, width, height]
  } else if (ppt_theme_type === "Right_Map_1") {
    whiteSpace = [370, 10, 340, 385] // [x, y, width, height]
  }

  // console.log(whiteSpace,contentSpace)

  // 內容區域 + 留白區域 => 可決定SVG Size (內容放入留白區域並置中)
  newScale = Math.max((contentSpace[2]) / whiteSpace[2], (contentSpace[3]) / whiteSpace[3]) // 縮放尺寸
  newViewBox = [(contentSpace[0] + contentSpace[2] / 2) - (whiteSpace[0] + whiteSpace[2] / 2) * newScale,
                (contentSpace[1] + contentSpace[3] / 2) - (whiteSpace[1] + whiteSpace[3] / 2) * newScale,
                720 * newScale,
                405 * newScale
               ]
  // console.log(newScale,newViewBox)

  svg.setAttribute('viewBox', `${newViewBox[0]} ${newViewBox[1]} ${newViewBox[2]} ${newViewBox[3]}`);
  fObj.style.transform = `translate(${newViewBox[0]}px, ${newViewBox[1]}px) scale(${newScale})`

  // 更新 經緯度範圍 資訊
  showViewBox()
}

