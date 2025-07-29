let LandArea = ["本島", "澎湖", "金門", "馬祖"] // 警報估計時間陸上區域限定

// 陸上區域替代名詞
let LandAreaName = {
  "本島": "臺灣",
  "澎湖": "澎湖",
  "金門": "金門",
  "馬祖": "連江",
}

// let LandWarningType = ['warning_contact_land', '', '', '', 'warning_center_contact', 'warning_center_out', 'warning_in_land', 'warning_out_land']
// let SeaWarningType = ['warning_contact_sea', '', '', '', '', '', 'warning_in_sea', 'warning_out_sea']

let WarningText = {
  'warning_in_sea': '海上警報發佈',
  'warning_in_land': '陸上警報發佈',
  'warning_contact_sea': '接觸臺灣近海',
  'warning_contact_land': '接觸[area]陸地',
  'warning_center_contact': '中心登陸[area]',
  'warning_center_out': '颱風中心出海',
  'warning_out_land': '脫離[area]陸地', //解除陸上警報
  'warning_out_sea': '解除海上警報'
};

let wEData_land
let wEData_sea

// onTheHour = moment('2021-09-11 09:00')
const onTheHour = moment(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), new Date().getHours(), 0, 0, 0)); // 現在時間(整點) 時間格式
const onTheHourStr = moment(onTheHour).format('yyyy-MM-DD HH:mm'); // 現在時間(整點) 字串格式

// 計算象限角
get_Azimuth = function(coord1, coord2) {
  var x1 = coord1[0],
      y1 = coord1[1]; // coord1 的經度和緯度
  var x2 = coord2[0],
      y2 = coord2[1]; // coord2 的經度和緯度

  // 計算 x 軸和 coord1 到 coord2 的連線之間的夾角（單位：弧度）
  var angleRad = Math.atan2(y2 - y1, x2 - x1);

  // 將弧度轉換為角度
  var angleDeg = angleRad * (180 / Math.PI);

  // 將角度限制在 0 到 360 度之間
  angleDeg = (angleDeg + 360) % 360;

  // 返回象限角
  return angleDeg;
}


// 讀取第一個接觸/最後一個脫離地區與時間
get_warning_estimate = function(wEData_select, index, warningType) { // wEData_挑選, 在wEData中的索引, 警報時間類型
  var xTime = null;
  var xKey = null;

  if (warningType.includes('center')) { // 中心 => 僅計算本島
    const time = wEData_select['本島'][index];
    if (time && (!xTime || time > xTime)) {
      xTime = time;
      xKey = '本島';
    }
  } else if (warningType.includes('out')) { // 脫離 => 取最大值
    for (const key in wEData_select) {
      const time = wEData_select[key][index];
      if (time && (!xTime || time > xTime)) {
        xTime = time;
        xKey = key;
      }
    }
  } else { // 發布、接觸 => 取最小值
    for (const key in wEData_select) {
      const time = wEData_select[key][index];
      if (time && (!xTime || time < xTime)) {
        xTime = time;
        xKey = key;
      }
    }
  }

  // console.log( xKey + '\t' + xTime)
  // console.log( warningType + '\t' +WarningText[warningType] + '\t' + LandAreaName[xKey])

  if (xKey != null) {
    return {
      'type': warningType,
      'time': moment(xTime).format("yyyy-MM-DD HH:mm"),
      'text': WarningText[warningType].replace('[area]', LandAreaName[xKey]),
      'area': xKey,
      'source': 'TAFIS_Warning_Estimate'
    }
  } else {
    // 使用者自定 
    return {
      'type': warningType,
      'time': '',
      'text': WarningText[warningType].replace('[area]', '臺灣'),
      'area': xKey,
      'source': 'No_Source'
    }
  }
}

// 讀取、計算警報資訊
get_warning_data = function() {
  let yName = $("select#TyList option:selected").attr("name")
  let ty_num = $("select#TyList option:selected").attr("tynum") * 1
  let xInitDate = $("select#trackFcstList option:selected").val() ? $("select#trackFcstList option:selected").val() : null // 預報時間 (字串，UTC，格式:"yyyy-MM-DDTHH:mm+00:00")
  let xInitDate_OBJ = moment(xInitDate) // 預報時間 (Local Time)
  let xInitDate_UTC = xInitDate_OBJ.utc().format("yyyyMMDDHHmm") // 預報時間 (字串，UTC，格式:"yyyyMMDDHHmm")

  warning_data = []

  // ## Step 1: 處理已發布警報時間 (讀取TAFIS API 警報類型變更歷史記錄)

  // 篩選早於預報時間前的警報歷史資料
  wHData = Warning_History.filter(item => item.cwb_ty_no === ty_num && moment(item.issue) <= xInitDate_OBJ.add(30, "minutes"));

  // wHData = [{'issue': '2012-08-21T14:30+08:00', 'typhoon_name': 'TEMBIN', 'cwb_typhoon_name': '天秤', 'cwb_ty_no': 14, 'report_no': '1', 'type': 'SEA'}, {'issue': '2012-08-22T05:30+08:00', 'typhoon_name': 'TEMBIN', 'cwb_typhoon_name': '天秤', 'cwb_ty_no': 14, 'report_no': '6', 'type': 'LAND'}, {'issue': '2012-08-25T08:30+08:00', 'typhoon_name': 'TEMBIN', 'cwb_typhoon_name': '天秤', 'cwb_ty_no': 14, 'report_no': '31', 'type': 'SEA'}, {'issue': '2012-08-25T14:30+08:00', 'typhoon_name': 'TEMBIN', 'cwb_typhoon_name': '天秤', 'cwb_ty_no': 14, 'report_no': '33', 'type': 'END'}, {'issue': '2012-08-26T11:30+08:00', 'typhoon_name': 'TEMBIN', 'cwb_typhoon_name': '天秤', 'cwb_ty_no': 14, 'report_no': '34', 'type': 'SEA'}, {'issue': '2012-08-27T02:30+08:00', 'typhoon_name': 'TEMBIN', 'cwb_typhoon_name': '天秤', 'cwb_ty_no': 14, 'report_no': '39', 'type': 'LAND'}, {'issue': '2012-08-28T20:30+08:00', 'typhoon_name': 'TEMBIN', 'cwb_typhoon_name': '天秤', 'cwb_ty_no': 14, 'report_no': '53', 'type': 'SEA'}, {'issue': '2012-08-28T23:30+08:00', 'typhoon_name': 'TEMBIN', 'cwb_typhoon_name': '天秤', 'cwb_ty_no': 14, 'report_no': '54', 'type': 'END'}, {'issue': '2012-08-26T11:30+08:00', 'typhoon_name': 'TEMBIN', 'cwb_typhoon_name': '天秤', 'cwb_ty_no': 14, 'report_no': '34', 'type': 'SEA'}, {'issue': '2012-08-27T02:30+08:00', 'typhoon_name': 'TEMBIN', 'cwb_typhoon_name': '天秤', 'cwb_ty_no': 14, 'report_no': '39', 'type': 'LAND'}, {'issue': '2012-08-28T20:30+08:00', 'typhoon_name': 'TEMBIN', 'cwb_typhoon_name': '天秤', 'cwb_ty_no': 14, 'report_no': '53', 'type': 'SEA'}];
  // wHData = [{'issue': '2017-07-30T11:30+08:00', 'typhoon_name': 'HAITANG', 'cwb_typhoon_name': '海棠', 'cwb_ty_no': 10, 'report_no': '7', 'type': 'LAND'}, {'issue': '2017-07-31T08:30+08:00', 'typhoon_name': 'HAITANG', 'cwb_typhoon_name': '海棠', 'cwb_ty_no': 10, 'report_no': '14', 'type': 'END'}]

  // console.log(wHData);

  if (wHData.length != 0) {
    // if 多次侵臺 => 移除前次警報歷史資訊
    do {
      // 計算解除警報次數
      endCount = wHData.filter(item => item.type === "END").length;
      // 計算最後一次解除警報 index
      lastEndIndex = wHData.map(item => item.type).lastIndexOf("END");

      // 過去未曾解除警報 或 最後一項為解除警報
      if (lastEndIndex === -1 || lastEndIndex === wHData.length - 1) {
        break;
      } else {
        i = wHData.findIndex(item => item.type === "END");
        wHData = wHData.slice(i + 1) // 擷取 type === "END" 之後的的警報歷史
      }
    } while (true);

    // 海警發佈(第一個type = 'SEA')
    // i = wHData.findIndex(item => item.type === "SEA");
    i = 0
    if (i >= 0 && i < wHData.length) {
      warning_data.push({
        'type': 'warning_in_sea',
        'time': moment(wHData[i]['issue']).format("yyyy-MM-DD HH:mm"),
        'text': WarningText['warning_in_sea'],
        'source': 'TAFIS_Warning_History'
      });
    }

    // 陸警發佈(第一個type = 'LAND')
    i = wHData.findIndex(item => item.type === "LAND");
    if (i >= 0 && i < wHData.length) {
      warning_data.push({
        'type': 'warning_in_land',
        'time': moment(wHData[i]['issue']).format("yyyy-MM-DD HH:mm"),
        'text': WarningText['warning_in_land'],
        'source': 'TAFIS_Warning_History'
      });
    }

    // 陸警解除(最後一個type = 'LAND'後一個)
    i = wHData.map(item => item.type).lastIndexOf("LAND");
    if (i >= 0) {
      i += 1
    }
    if (i >= 0 && i < wHData.length) {
      warning_data.push({
        'type': 'warning_out_land',
        'time': moment(wHData[i]['issue']).format("yyyy-MM-DD HH:mm"),
        'text': '解除陸上警報',
        'source': 'TAFIS_Warning_History'
      });
    }

    // 海警解除(最後一個type = 'END')
    i = wHData.map(item => item.type).lastIndexOf("END")
    if (i >= 0 && i < wHData.length) {
      warning_data.push({
        'type': 'warning_out_sea',
        'time': moment(wHData[i]['issue']).format("yyyy-MM-DD HH:mm"),
        'text': WarningText['warning_out_sea'],
        'source': 'TAFIS_Warning_History'
      });
    }
  } else {
    console.log(yName + ' 未篩選到早於 ' + xInitDate + ' 前的警報歷史資料')
  }

  // ## Step2: 處理警報預估時間 (讀取 iTYPHOON 警報估計時間)
  // 此颱風該時間點有警報估計
  if (yName in Warning_Estimate) {
    // 2.1 篩選該颱風警報估計資料
    wEData = {}
    if (Warning_Estimate[yName]['files'].includes(xInitDate_UTC)) {
      // 篩選預報時間點警報估計資料
      wEData = Warning_Estimate[yName]['data'][moment($("select#trackFcstList option:selected").val()).utc().format("yyyyMMDDHHmm")]['data']
      // console.log(wEData)

    } else {
      console.log(yName + ' 未篩選到發布於 ' + xInitDate_UTC + ' (UTC)的警報估計時間')

      // 篩選最後一筆警報估計資料
      if (Warning_Estimate[yName]['files'].length > 0) {
        wEData_lastFile = Warning_Estimate[yName]['files'][Warning_Estimate[yName]['files'].length - 1]
        wEData = Warning_Estimate[yName]['data'][wEData_lastFile]['data']

        alert(yName + ' 未篩選到發布於 ' + xInitDate_UTC + ' (UTC)的警報估計時間，改使用 ' + wEData_lastFile + ' 時間資料')
      }
    }

    // 2.2處理陸警預估時間
    if (wEData !== {}) {
      wEData_land = LandArea.reduce((obj, area) => (wEData[area] ? (obj[area] = wEData[area], obj) : obj), {});

      // 警報時間發布
      if (warning_data.some(item => item.type === 'warning_in_land') === false) {
        warning_data.push(get_warning_estimate(wEData_land, 6, 'warning_in_land'))
      }

      // 7級風接觸
      warning_data.push(get_warning_estimate(wEData_land, 0, 'warning_contact_land'))

      // 颱風中心接觸
      warning_data.push(get_warning_estimate(wEData_land, 4, 'warning_center_contact'))

      // 颱風中心離開
      warning_data.push(get_warning_estimate(wEData_land, 5, 'warning_center_out'))

      // 警報時間解除
      if (warning_data.some(item => item.type === 'warning_out_land') === false) {
        warning_data.push(get_warning_estimate(wEData_land, 7, 'warning_out_land'))
      }

      // 2.2處理海警預估時間
      wEData_sea = {}
      wEData_sea['海警'] = wEData['海警'] ? wEData['海警'] : {};

      // 警報時間發布
      if (warning_data.some(item => item.type === 'warning_in_sea') === false) {
        warning_data.push(get_warning_estimate(wEData_sea, 6, 'warning_in_sea'))
      }

      // 7級風接觸
      warning_data.push(get_warning_estimate(wEData_sea, 0, 'warning_contact_sea'))

      // 警報時間解除
      if (warning_data.some(item => item.type === 'warning_out_sea') === false) {
        warning_data.push(get_warning_estimate(wEData_sea, 7, 'warning_out_sea'))
      }
    }
  }

  // 將 warning_data 內的空物件移除
  warning_data = warning_data.filter(item => Object.keys(item).length > 0);

  // 將 warning_data 依時間先後順序重新排序(空白排後)	
  warning_data.sort((a, b) => {
    // Handle empty time strings by converting them to the earliest possible date
    const timeA = a.time ? moment(a.time) : moment('9999-12-31T23:59:59Z'); // Earliest possible moment
    const timeB = b.time ? moment(b.time) : moment('9999-12-31T23:59:59Z'); // Earliest possible moment

    // Perform the comparison
    return timeA - timeB;
  });

  return warning_data
}


// 設定重要時間點keypoint-content
setKeypointContent = function() {
  $("#keypoint-content").contents().remove();

  let ppt_theme_type = $("select#ppt_theme_type option:selected").val() // 投影片樣式
  let FcstTime = moment($("select#trackFcstList option:selected").val()) // 預報時間

  // 計算時間軸起訖時間
  let timeLine_startTime = FcstTime // 時間軸起始預設為現在時間
  let timeLine_endTime
  $.each(Warning_Data, function(index, obj) {
    if ($(".warning-group[name='" + obj['type'] + "'] .warning-check").prop('checked') && obj['time'] !== '') {
      timeLine_startTime = Math.min(timeLine_startTime, moment(obj['time']))
      if (isNaN(timeLine_endTime)) {
        timeLine_endTime = moment(obj['time'])
      } else {
        timeLine_endTime = Math.max(timeLine_endTime, moment(obj['time']))
      }
    }
  });

  // console.log(timeLine_startTime, timeLine_endTime);

  // 時間軸長度(小時)
  // let timeLine_Hours = (moment(timeLine_endTime) - moment(timeLine_startTime)) / 3600000

  // 建立重要時間軸(timeline) 新版簡報適用
  if (ppt_theme_type === "Right_Map_1") {
    if ((moment(FcstTime) - moment(timeLine_startTime)) > 0) {
      let width = roundTo(Math.min(1, (moment(FcstTime) - moment(timeLine_startTime)) / (moment(timeLine_endTime) - moment(timeLine_startTime))) * 270, 2);
      $("#keypoint-content").append('<hr class="timeline-History" width="' + width + 'px" style="top: 28.5px; left: 35px; position: absolute;">')
    }
    if ((moment(timeLine_endTime) - moment(FcstTime)) > 0) {
      let width = roundTo(Math.min(1, (moment(timeLine_endTime) - moment(FcstTime)) / (moment(timeLine_endTime) - moment(timeLine_startTime))) * 270, 2);
      let left = roundTo(270 - width + 35, 2);
      $("#keypoint-content").append('<hr class="timeline-Estimate" width="' + width + 'px" style="top: 28.5px; left: ' + left + 'px; position: absolute;">')
      
      $("#keypoint-currBlock").css('left',left + 'px').css('width','calc(100% - ' + left + 'px)')
    }
  }

  // 設定每個重要時間點 keypoint-text
  let textClass = ""
  $.each(Warning_Data, function(index, obj) {
    if ($(".warning-group[name='" + obj['type'] + "'] .warning-check").prop('checked') && obj['time'] !== '') { // 有時間且勾選 --> 設定時間點位置
      let dt = (moment(obj['time']) - moment(timeLine_startTime)) / (moment(timeLine_endTime) - moment(timeLine_startTime));

      let left = 270 * dt + 10;

      if ((moment(obj['time']) - moment(FcstTime)) > 0) {
        textClass = "warning-text-Estimate";
      } else {
        textClass = "warning-text-History";
      }
      
      if ($.inArray(obj['type'], ["warning_center_contact","warning_contact_sea","warning_in_sea","warning_out_sea"]) >=0) {
        textClass += " warning-text-upper";
      } else {
        textClass += " warning-text-lower";
      }
      
      

      $("#keypoint-content").append('<div class="warning-text ' + textClass + '" name="' + obj['type'] + '" style="left: ' + left + 'px;"><span class="dot"></span><span>' + moment(obj['time']).format('DD日 HH:mm') + '</span><span class="dashedline"> --- </span><span>' + obj['text'] + '</span></div>');
    } else { // 無時間 --> 隱藏keypoint-content
      $("#keypoint-content").append('<div class="warning-text ' + textClass + '" name="' + obj['type'] + '" style="display: none;"><span class="dot"></span><span>' + moment(obj['time']).format('DD日 HH:mm') + '</span><span class="dashedline"> --- </span><span>' + obj['text'] + '</span></div>');
    }
  });


}



// 繪製 警報半徑 warning_circle (計算警報位置與半徑像素)
setWarningCircle = function() {
  // ---------- 清空既有圖層 ----------
  $("g#warning_circle").empty();

  const iconSize = 16; // 暴風中心ICON大小

  let xRadius = "";
  let xMarks = "";

  let Azimuth = 135; // 預設移向為西北
  

  /* --------------------------------------------------
     * Step 1 先畫出暴風半徑 (ellipse)，並計算 Warning_Data
     * --------------------------------------------------*/
  for (let i = 1; i < PData.length; i++) {
    const Pre = PData[i - 1];
    const This = PData[i];
    
    const PreR15 = Math.max(get_radius(Pre.circle_of_15ms), 0);
    const ThisR15 = Math.max(get_radius(This.circle_of_15ms), 0);

    const PreR25 = Math.max(get_radius(Pre.circle_of_25ms), 0);
    const ThisR25 = Math.max(get_radius(This.circle_of_25ms), 0);

    // 計算 Azimuth (行徑方位角)
    if (Pre.coordinate[0] !== This.coordinate[0] || Pre.coordinate[1] !== This.coordinate[1]) {
      Azimuth = get_Azimuth(Pre.coordinate, This.coordinate);
    }

    /* ----- 掃描 Warning_Data 介於 Pre.time & This.time 之間的點 -----*/
    Warning_Data.forEach(warning => {
      const checked = $(`.warning-group[name='${warning.type}'] .warning-check`).prop("checked");
      if (!checked || !warning.time) return;

      const wTime = warning.time;
      // 介於兩個 keypoint 時間內、或 (i===1 && wTime===Pre.time)
      if (!((wTime <= This.time && wTime > Pre.time) || (i === 1 && wTime === Pre.time))) return;

      // 時間內插比例 (0~1)
      const delta = (moment(wTime) - moment(Pre.time)) / (moment(This.time) - moment(Pre.time));

      // 內插 Lon / Lat
      const Lon = Pre.coordinate[0] + (This.coordinate[0] - Pre.coordinate[0]) * delta;
      const Lat = Pre.coordinate[1] + (This.coordinate[1] - Pre.coordinate[1]) * delta;
      
      // 內插 tau
      const tauTime = Pre.tau + (This.tau - Pre.tau) * delta;

      // 內插 R15 / R25
      const R15 = (ThisR15 !== PreR15) ? (ThisR15 <= 0 ? PreR15 : PreR15 + (ThisR15 - PreR15) * delta) : PreR15;
      const R25 = (ThisR25 !== PreR25) ? (PreR25 + (ThisR25 - PreR25) * delta) : PreR25;

      // 麥卡托投影
      const ax = roundTo((Lon - Map_Range[0]) * per_Lon, 2);
      const ay = roundTo((Lat - Map_Range[3]) * per_Lat, 2);
      const R15_x = roundTo(((R15 / 110 * per_Lon) / Math.cos((Lat * Math.PI) / 180)), 3);
      const R15_y = roundTo(((R15 / 110) * per_Lon), 3);
      const R25_x = roundTo(((R25 / 110 * per_Lon) / Math.cos((Lat * Math.PI) / 180)), 3);
      const R25_y = roundTo(((R25 / 110) * per_Lon), 3);

      // 將 ellipse 加入序列化字串 (之後一次寫入 DOM)
      xRadius += `
      <g class="${warning.time <= xPData[0].time ? "mark-past" : "mark-fcst"}" name="${warning.type}">
        <ellipse cx="${ax}" cy="${ay}" rx="${R15_x}" ry="${R15_y}"/>
        <use x="${ax}" y="${ay}" width="${iconSize}" height="${iconSize}" href="${warning.time <= xPData[0].time ? '#tyIcon_past_light' : '#tyIcon_fcst_light'}"></use>
      </g>`;

      // 對 Warning_Data 寫回計算結果
      Object.assign(warning, {
        lon: roundTo(Lon, 2),
        lat: roundTo(Lat, 2),
        tau:tauTime,
        ax,
        ay,
        R15,
        R25,
        R15_x,
        R15_y,
        R25_x,
        R25_y,
        Azimuth: Math.round(Azimuth)
      });
    });
  }

  // 批次寫入 ellipse
  $("g#warning_circle").html(xRadius);
}

// 建立警報時間標記 warning_marks
setWarningMarks = function() {
  $("g#warning_marks").empty();
  $("div#keypoint-mark").empty();

  let gMarks = "";
  let dMarks = "";

  const Azimuths = Warning_Data.filter(w => w.Azimuth !== undefined).map(w => w.Azimuth);
  const avgAzimuth = getAverageAzimuth(Azimuths);
  const fontSize = 9;
  const spacing = 5; // mark間距
  const ConnectorItem = [
    [-0.5, 0], // 上
    [0, -0.5], // 左
    [-0.5, -1], // 下
    [-1, -0.5] // 右
  ];
  const tryAngles = [90, 95, 85, 100, 80, 105, 75, 110, 70, 115, 65, 120, 60,
                     -90, -95, -85, -100, -80, -105, -75, -110, -70, -115, -65, -120, -60,
                     125, 55, 130, 50, 135, 45, 140, 40, 145, 35, 150, 30,
                     -125, -55, -130, -50, -135, -45, -140, -40, -145, -35, -150, -30
                    ];
  const tryDistances = [1.25, 1.375, 1.5, 1.625, 1.75, 1.875, 2, 1.125];

  // -- 碰撞檢查物件參數
  const taiwanBBoxes = [405, 340, 56, 65]; // Taiwan [x,y,w,h]
  let circleBBoxes = {} // circle {[cx,cy,rx]}
  let placedlabels = {}; // rect {[x,y,w,h]}
  let placedLines = {}; // line {[x1,y1,x2,y2]}

  // 暴風半徑 (預報+警報)
  xPData.forEach((item, i) => {
    const cx = roundTo((item.coordinate[0] - Map_Range[0]) * per_Lon, 2);
    const cy = roundTo((item.coordinate[1] - Map_Range[3]) * per_Lat, 2);
    const cr = roundTo((Math.max(get_radius(item.circle_of_15ms), 100) / 110 * per_Lon) / Math.cos((item.coordinate[1] * Math.PI) / 180), 3);
    const key = item.type + (item.type !== "curr" ? "-" + item.tau : "");
    if (i > 0) {
      if ((xPData[i].tau - xPData[i - 1].tau) > 6) { // 時間間隔大於12 => 分隔內插暴風半徑
        // console.log(i);
        const Pre_item = xPData[i - 1] // 前一段
        const Pre_cx = roundTo((Pre_item.coordinate[0] - Map_Range[0]) * per_Lon, 2);
        const Pre_cy = roundTo((Pre_item.coordinate[1] - Map_Range[3]) * per_Lat, 2);
        const Pre_cr = roundTo((Math.max(get_radius(Pre_item.circle_of_15ms), 100) / 110 * per_Lon) / Math.cos((Pre_item.coordinate[1] * Math.PI) / 180), 3);

        const dt = 6; // 每段間隔時間
        const ds = Math.floor((xPData[i].tau - xPData[i - 1].tau) / dt) // 分割成幾份
        const dx = roundTo((cx - Pre_cx) / ds, 2);
        const dy = roundTo((cy - Pre_cy) / ds, 2);
        const dr = roundTo((cr - Pre_cr) / ds, 3);
        for (var s = 1; s < ds; s++) {
          const s_key = item.type + (item.type !== "curr" ? "-" + (Pre_item.tau + dt * s) : "");
          circleBBoxes[s_key] = [roundTo(Pre_cx + dx * s, 2), roundTo(Pre_cy + dy * s, 2), roundTo(Pre_cr + dr * s, 3)];
        }
      }
    }
    circleBBoxes[key] = [cx, cy, cr];
  });
  Warning_Data.forEach((warning, w) => {
    circleBBoxes[warning.type] = [warning.ax, warning.ay, warning.rx]
  });

  // console.log(circleBBoxes);

  let bestPlacement = {};
  let Offset = -1; // 初始左右交錯

  Warning_Data.forEach((warning, w) => {
    const checked = $(`.warning-group[name='${warning.type}'] .warning-check`).prop("checked");
    if (!checked || !warning.time) return;

    const {
      ax,
      ay,
      rx,
      ry
    } = warning;
    let bestScore = -999;

    // console.log(warning.type);
    outerLoop:
    for (const angleOffset of tryAngles) {
      for (const dist of tryDistances) {
        let Ang = roundTo((getAverageAzimuth([avgAzimuth, avgAzimuth, avgAzimuth, warning.Azimuth]) + Offset * angleOffset) % 360, 0);
        const dR = dist;

        if (angleOffset == 90) {
          Ang += Offset * (30 - w * 7.5)
        }

        const ConnX = roundTo(ax + (rx > 30 ? rx : 30) * Math.cos((Ang * Math.PI) / 180) * dR, 2);
        const ConnY = roundTo(ay - (ry > 30 ? ry : 30) * Math.sin((Ang * Math.PI) / 180) * dR, 2);

        let ConnectorType = 1; // 上
        if (Ang < 60 || Ang > 300) ConnectorType = 2; // 左
        else if (Ang >= 60 && Ang <= 120) ConnectorType = 3; // 下
        else if (Ang > 120 && Ang < 240) ConnectorType = 4; // 右
        
        const labelWidth = fontSize * 8;
        const labelHeight = fontSize * 3;

        const labelX = roundTo(ConnX + labelWidth * ConnectorItem[ConnectorType - 1][0], 2);
        const labelY = roundTo(ConnY + labelHeight * ConnectorItem[ConnectorType - 1][1], 2);

        // const box = { x: labelX - spacing, y: labelY - spacing, width: labelWidth + spacing * 2, height: labelHeight + spacing * 2 };
        const box = [labelX - spacing, labelY - spacing, labelWidth + spacing * 2, labelHeight + spacing * 2];
        const connect = [ConnX, ConnY, ax, ay];

        // ---------- 進行碰撞檢查與評分 ----------
        let score = 100;
        const labelArea = labelWidth * labelHeight;

        // 標記碰到台灣
        const overlapTaiwan = getRectOverlapArea(box, taiwanBBoxes);
        if (overlapTaiwan > 0) {
          score -= roundTo(((overlapTaiwan / labelArea) * 100), 2);
          // console.log('標記碰到 "台灣範圍"\t score= ' + score);
          if (score < bestScore) continue; // 直接跳到下一個候選角度
        }

        // 標記碰到暴風圈
        for (let type in circleBBoxes) {
          const circle = circleBBoxes[type]; // 取得對應的 value
          const overlap = getRectCircleOverlapArea(box, circle);
          if (overlap > 0) {
            score -= roundTo(((overlap / labelArea) * 30), 2);
            // console.log('標記碰到 "'+type+'"暴風圈\t score= ' + score, overlap , labelArea);
            if (score < bestScore) break; // 不必再算，這角度就淘汰了 
          }
        }

        // 標記碰到其他標記
        for (let type in placedlabels) {
          const rect = placedlabels[type]; // 取得對應的 value
          const overlap = getRectOverlapArea(box, rect);
          if (overlap > 0) {
            score -= roundTo(((overlap / labelArea) * 50), 2);
            // console.log('標記碰到 "'+type+'" 標記\t score= ' + score);
            if (score < bestScore) break;
          }
        }

        // 標記碰到其他連接線
        for (let type in placedLines) {
          const line = placedLines[type]; // 取得對應的 value
          if (isRectIntersectLine(box, line)) {
            score -= 5;
            // console.log('標記碰到 "'+type+'" 連接線\t score= ' + score);
            if (score < bestScore) break;
          }
        }

        // 連接線碰到其他標記
        for (let type in placedlabels) {
          const rect = placedlabels[type]; // 取得對應的 value
          if (isRectIntersectLine(rect, connect)) {
            score -= 10;
            // console.log('連接線碰到 "'+type+'" 連接線\t score= ' + score);
            if (score < bestScore) break;
          }
        }

        // 連接線碰到其他連接線
        for (let type in placedLines) {
          const line = placedLines[type]; // 取得對應的 value
          if (isLineIntersect(connect, line)) {
            score -= 5;
            // console.log('連接線碰到 "'+type+'" 連接線\t score= ' + score);
            if (score < bestScore) break;
          }
        }

        // 透過 DOM 查已經存在的舊標記 label
        // const oldRects = $("g#warning_marks g rect").map((i, el) => el.getBBox()).get();
        // if (isBBoxIntersectAny(box, oldRects)) score -= 20;

        // console.log(score,angleOffset,dR);

        // 紀錄最佳得分位置參數
        if (score > bestScore) {
          // console.log(score,angleOffset,dR);
          bestScore = score;
          bestPlacement[warning.type] = {
            ConnX,
            ConnY,
            labelX,
            labelY,
            labelWidth,
            labelHeight,
            ConnectorType,
            angleOffset,
            Ang,
            dR,
            score
          };
          if (score === 100) {
            break outerLoop; // 雙層 break
          }
        }
      }
    }


    // 使用最佳得分位置參數
    const {
      ConnX,
      ConnY,
      labelX,
      labelY,
      labelWidth,
      labelHeight,
      ConnectorType,
      angleOffset,
      Ang,
      dR,
      score
    } = bestPlacement[warning.type];
    // console.log(warning.type, score, Ang, dR);

    // placedlabels.push({ x: labelX - spacing, y: labelY - spacing, width: labelWidth + spacing * 2, height: labelHeight + spacing * 2 });
    placedlabels[warning.type + "_mark"] = [labelX - spacing, labelY - spacing, labelWidth + spacing * 2, labelHeight + spacing * 2];
    placedLines[warning.type + "_ConnectLine"] = [ConnX, ConnY, ax, ay];

    // ---------- 時間文字 ----------
    const date = new Date(warning.time);
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const timeStr = minute === "00" ? `${day}日${hour}時` : `${day}日${hour}時${minute}分`;

    bestPlacement[warning.type]['text'] = [timeStr, warning.text]

    // ---------- 組裝 g#warning-marks 片段 ----------
    const lineHeight = roundTo(fontSize * 1.2,2);
    const lines = 2;
    const textHeight = lineHeight * lines;
    const textStartY = roundTo(labelY + (labelHeight - textHeight) / 2 + fontSize,2); // 修正基線位置
    gMarks += `
      <g class="${warning.time <= xPData[0].time ? "mark-past" : "mark-fcst"}" name="${warning.type}">
        <line x1="${ConnX}" y1="${ConnY}" x2="${ax}" y2="${ay}" ConnectorType="${ConnectorType}"></line>
        <rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="${labelHeight}" rx="0" fill="#eee" />
        <text x="${labelX + labelWidth / 2}" y="${textStartY}" text-anchor="middle">
          <tspan x="${labelX + labelWidth / 2}" dy="0">${timeStr}</tspan>
          <tspan x="${labelX + labelWidth / 2}" dy="${lineHeight}">${warning.text}</tspan>
        </text>
      </g>`;

    if (angleOffset > 0) {
      Offset *= -1;
    } // 下一個標記左右交替
  });

  // console.log(placedlabels);
  // console.log(placedLines);

  // 批次寫入 g#warning_marks
  $("g#warning_marks").html(gMarks);
  $("g#warning_marks").css("font-size",fontSize)


  // console.log(bestPlacement);

  // 設定 SVG 大小位置
  change_SVG_Size()
  
  
  // ---------- 組裝 div#warning-marks 片段 ----------
  // const $slide = document.querySelector("div#slide");
  
  // $("#warning_marks g").each(function () {
    // const g = $(this);
    // const gName = g.attr("name");
    // const gClass = g.attr("class");
    // const rectEl = g.find("rect")[0];

    // if (rectEl && $slide) {
      // const rectBox = rectEl.getBoundingClientRect();
      // const containerBox = $slide.getBoundingClientRect();

      // const relativeX = rectBox.left - 1 - containerBox.left;
      // const relativeY = rectBox.top - 1 - containerBox.top;
      // const width = rectBox.width;
      // const height = rectBox.height;
      
       // dMarks += `<div class="${gClass}" name="${gName}" style="left:${relativeX}px;top:${relativeY}px;width:${width}px;height:${height}px;">`
      
      // bestPlacement[gName]["text"].forEach(str => {
        // dMarks += `<span>${str}</span>`
      // });
      
      // dMarks += `</div>`;

      // console.log(`g[name="${gName}"] 相對位置與大小：`, {
        // x: relativeX,
        // y: relativeY,
        // width,
        // height
      // });
    // }
  // });

  // $("div#keypoint-mark").html(dMarks);

  /* --------------------------------------------------
     * 工具函式區
     * --------------------------------------------------*/

  // 計算平均方向角 (0~360)
  function getAverageAzimuth(angles) {
    const rad = angles.map(a => (a * Math.PI) / 180);
    const sumX = rad.reduce((acc, r) => acc + Math.cos(r), 0);
    const sumY = rad.reduce((acc, r) => acc + Math.sin(r), 0);
    return (Math.atan2(sumY, sumX) * 180) / Math.PI < 0 ? (Math.atan2(sumY, sumX) * 180) / Math.PI + 360 : (Math.atan2(sumY, sumX) * 180) / Math.PI;
  }

  // 兩個 bbox 是否相交 (含邊界算相交)
  function isBBoxOverlap(b1, b2) {
    return !(b1.x + b1.width < b2.x ||
             b1.x > b2.x + b2.width ||
             b1.y + b1.height < b2.y ||
             b1.y > b2.y + b2.height);
  }

  // newBox 是否與陣列中任何 bbox 相交
  // function isBBoxIntersectAny(newBox, boxes) {
    // return boxes.some(b => isBBoxOverlap(newBox, b));
  // }

  // -- 計算重疊面積(兩矩形)
  function getRectOverlapArea(box1, box2) {
    const [x1, y1, w1, h1] = box1;
    const [x2, y2, w2, h2] = box2;
    const left = Math.max(x1, x2);
    const top = Math.max(y1, y2);
    const right = Math.min(x1 + w1, x2 + w2);
    const bottom = Math.min(y1 + h1, y2 + h2);
    if (right <= left || bottom <= top) return 0;
    return (right - left) * (bottom - top);
  }

  // -- 計算重疊面積(矩形與圓形)
  function getRectCircleOverlapArea(rect, circle, samples = 10) {
    // console.log(rect, circle);
    const [rx, ry, rw, rh] = rect;
    const [cx, cy, cr] = circle;

    if (((rx + rw / 2) - cx) ** 2 + ((ry + rh / 2) - cy) ** 2 < ((Math.sqrt((rw / 2) ** 2 + (rh / 2) ** 2) + cr) ** 2)) { // 矩形中心與圓形中心距離 < 矩形對角線半長+圓半徑
      let area = 0;
      const stepX = rw / samples;
      const stepY = rh / samples;
      const total = samples * samples;
      for (let i = 0; i < samples; i++) {
        for (let j = 0; j < samples; j++) {
          const x = rx + i * stepX + stepX / 2;
          const y = ry + j * stepY + stepY / 2;
          if ((x - cx) ** 2 + (y - cy) ** 2 <= cr ** 2) area++;
        }
      }
      return (area / total) * rw * rh;
    } else {
      return 0;
    }
  }

  // -- 判斷矩形與線段是否相交
  function isRectIntersectLine(rect, line) {
    const [x, y, w, h] = rect;
    const [x1, y1, x2, y2] = line;
    const lines = [
      [x, y, x + w, y],
      [x + w, y, x + w, y + h],
      [x + w, y + h, x, y + h],
      [x, y + h, x, y]
    ];
    return lines.some(([lx1, ly1, lx2, ly2]) => isLineIntersect([x1, y1, x2, y2], [lx1, ly1, lx2, ly2])) ||
      (x1 >= x && x1 <= x + w && y1 >= y && y1 <= y + h) ||
      (x2 >= x && x2 <= x + w && y2 >= y && y2 <= y + h);
  }

  // -- 判斷兩線段是否相交
  function isLineIntersect(line1, line2) {
    const [x1, y1, x2, y2] = line1;
    const [x3, y3, x4, y4] = line2;

    function ccw(ax, ay, bx, by, cx, cy) {
      return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
    }
    return ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
      ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4);
  }
}

// 調整警報時間標記 warning_marks 大小
setWarningMarksSize = function(fontSize = 9) {
  $("#warning_marks > g").each(function() {
    const connectLine = $(this).find("line");

    // 讀取 line 的起點、ConnectorType
    const ConnX = parseFloat(connectLine.attr("x1"));
    const ConnY = parseFloat(connectLine.attr("y1"));
    const ConnectorType= parseFloat(connectLine.attr("connectortype"));

    const ConnectorItem = [
      [-0.5, 0], // 上
      [0, -0.5], // 左
      [-0.5, -1], // 下
      [-1, -0.5] // 右
    ];

    // 計算寬高
    const lines = $(this).find("text").find("tspan").length;
    const labelWidth = fontSize * 8;
    const labelHeight = fontSize * (lines+1);
    const lineHeight = roundTo(fontSize * 1.2,2);


    // 計算 label 的左上角位置
    const labelX = roundTo(ConnX + labelWidth * ConnectorItem[ConnectorType - 1][0], 2);
    const labelY = roundTo(ConnY + labelHeight * ConnectorItem[ConnectorType - 1][1], 2);

    // console.log($(this).attr("name"),ConnX,ConnY,ConnectorItem[ConnectorType - 1],labelX,labelY);

    // 文字垂直置中起點
    const textHeight = lineHeight * lines;
    const textStartY = roundTo(labelY + (labelHeight - textHeight) / 2 + fontSize,2); // 修正基線位置

    $(this).find("rect").attr("x",labelX).attr("y",labelY).attr("width",labelWidth).attr("height",labelHeight)
    $(this).find("text").attr("x",labelX + labelWidth / 2).attr("y",textStartY)
    $(this).find("text").find("tspan").attr("x",labelX + labelWidth / 2)
    // $(this).find("text").find("tspan").last().attr("dy",lineHeight)
    $(this).find("text").find("tspan").not($(this).find("text").find("tspan").first()).attr("dy",lineHeight) // 設定非第一個<tspan> dy

    $("g#warning_marks").css("font-size",fontSize)
    $("g#warning_marks").css("stroke-width",fontSize/10)
    $("#g_tc_timestr text").css("font-size",parseFloat(fontSize*0.75,2))
  });
  
  // 設定 SVG 大小位置
  change_SVG_Size()
}


// 建立暴風半徑動畫
function setTcAnimate (aniType="all") {
  $("g#tc_circle").contents().remove();
  let xRadius = ""
  
  if ($("#btn_animsEnable").prop("checked")) { // 動畫模式
    // console.log("動畫模式")
    let aniStartTau = 0
    let aniEndTau = xPData[xPData.length-1]['tau']
    
    // console.log(aniType)
    
    if (aniType == "all") {  // 全預報時段動畫
      $("#warning_marks .mark-fcst").show() // 預報時段標記全顯示
      $("#keypoint .warning-text").removeClass("active")
    } else {                 // 區段動畫
      // aniStartTau = Math.max(warning_data.find(item => item.type === aniType).tau,0)
      aniStartTau = warning_data.find(item => item.type === aniType).tau 
      // 只顯示該時間點預報標記
      $("#warning_marks .mark-fcst").hide()
      $(`#warning_marks .mark-fcst[name='${aniType}']`).show()
      $("#keypoint .warning-text").removeClass("active")
      $(`#keypoint .warning-text[name='${aniType}']`).addClass("active")
    }
    
    // console.log(aniType,aniStartTau);
    
    // let t=0
    
    aniDatas = [...xPData, ...warning_data]
      .filter(item => item.tau >= aniStartTau && item.tau <= aniEndTau)
      .sort((a, b) => a.tau - b.tau)
      .map(item => ({
        type: (item.type === "fcst" || item.type === "curr") ? `${item.type}_${item.tau}` : item.type,
        time: moment(item.time).format('DD日HH時mm分').replace("00分", ""),
        tau: item.tau,
        ax: item.ax,
        ay: item.ay,
        R15_x: item.R15_x,
        R15_y: item.R15_y,
        R25_x: item.R25_x,
        R25_y: item.R25_y
      }));
      
    // 計算dt
    aniDatas.forEach((item, i) => {
      item.dt = i > 0 ? (item.tau - aniDatas[i - 1].tau) / perHr : 0;
    });

    // console.log("aniDatas:", aniDatas);
    
    aniParas = {
      "time" : aniDatas.map(item => item.time),
      "tau" : aniDatas.map(item => item.tau),
      "ax" : aniDatas.map(item => item.ax),
      "ay" : aniDatas.map(item => item.ay),
      "R15_x" : aniDatas.map(item => item.R15_x),
      "R15_y" : aniDatas.map(item => item.R15_y),
      "R25_x" : aniDatas.map(item => item.R25_x),
      "R25_y" : aniDatas.map(item => item.R25_y)
    }
    
    // 總時間（不含第 0 點 dt = 0）
    const dur = aniDatas.reduce((sum, item) => sum + item.dt, 0);

    // 計算累積時間（keyTimes 累積）
    let cumulative = [];
    aniDatas.reduce((acc, item) => {
      const sum = acc + item.dt;
      cumulative.push(sum);
      return sum;
    }, 0);
    
    // 新增 keyTimes、dur、perHr參數
    aniParas.keyTimes = cumulative.map(x => (x / dur).toFixed(3));
    aniParas.dur = dur;
    aniParas.perHr = perHr;
    
    // console.log("aniParas:", aniParas);
    
    let keyTimes = aniParas.keyTimes.join(";")
    let keyTimes_color = `0;${roundTo((0-aniStartTau)/(aniEndTau-aniStartTau),3)};${roundTo((0-aniStartTau)/(aniEndTau-aniStartTau),3)};1`
    let aniAttr = `repeatCount=${aniType!="all" ? "indefinite" : "indefinite"}`
    
    xRadius = `
      <g id="g_tc_R15"> <!-- R15暴風圈 -->  
        <ellipse id="tc_R15" cx="${aniParas.ax[0]}" cy="${aniParas.ay[0]}" rx="${aniParas.R15_x[0]}" ry="${aniParas.R15_y[0]}" stroke="#F00" fill="#FFC9C9B3" stroke-width="1.0">
          <animate attributeName="cx" dur="${dur}" ${aniAttr} values="${aniParas.ax.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="cy" dur="${dur}" ${aniAttr} values="${aniParas.ay.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="rx" dur="${dur}" ${aniAttr} values="${aniParas.R15_x.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="ry" dur="${dur}" ${aniAttr} values="${aniParas.R15_y.join(";")}" keyTimes="${keyTimes}" />
          ${aniStartTau<0 ? `<animate attributeName="stroke" dur="${dur}" ${aniAttr} values="#808080;#808080;#F00;#F00" keyTimes="${keyTimes_color}" />` : ''}
          ${aniStartTau<0 ? `<animate attributeName="fill" dur="${dur}" ${aniAttr} values="#FFFCE7B3;#FFFCE7B3;#FFC9C9B3;#FFC9C9B3" keyTimes="${keyTimes_color}" />` : ''}
        </ellipse>
      </g>
      <g id="g_tc_R25"> <!-- R25暴風圈 -->  
        <ellipse id="tc_R25" cx="${aniParas.ax[0]}" cy="${aniParas.ay[0]}" rx="${aniParas.R25_x[0]}" ry="${aniParas.R25_y[0]}" fill="#FF717180" stroke-width="0">
          <animate attributeName="cx" dur="${dur}" ${aniAttr} values="${aniParas.ax.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="cy" dur="${dur}" ${aniAttr} values="${aniParas.ay.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="rx" dur="${dur}" ${aniAttr} values="${aniParas.R25_x.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="ry" dur="${dur}" ${aniAttr} values="${aniParas.R25_y.join(";")}" keyTimes="${keyTimes}" />
          ${aniStartTau<0 ? `<animate attributeName="fill" dur="${dur}" ${aniAttr} values="#f0e22480;#f0e22480;#FF717180;#FF717180" keyTimes="${keyTimes_color}" />` : ''}
        </ellipse>
      </g>
      <g id="g_tc_center"> <!-- 中心 -->  
        <use id="tc_center" x="${aniParas.ax[0]}" y="${aniParas.ay[0]}" href="${aniStartTau < 0 ? '#tyIcon_past' : '#tyIcon_fcst'}">
          <animate attributeName="x" dur="${dur}" ${aniAttr} values="${aniParas.ax.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="y" dur="${dur}" ${aniAttr} values="${aniParas.ay.join(";")}" keyTimes="${keyTimes}" />
          ${aniStartTau < 0 ? `<animate attributeName="href" dur="${dur}" ${aniAttr} values="#tyIcon_past;#tyIcon_past;#tyIcon_fcst;##tyIcon_fcst" keyTimes="${keyTimes_color}" />` : ''}
        </use>
      </g>`
  } else {  // 靜態模式
    // console.log("靜態模式")
    let tauTime = parseFloat($("g#tc_circle").attr("tau") || 0);

    let time, ax, ay, R15_x, R15_y, R25_x, R25_y;  // 👈 提前宣告

    if (aniType === "all") {
      // console.log("全預報時段動畫");
      tauTime = xPData[0].tau;
      ({ time, ax, ay, R15_x, R15_y, R25_x, R25_y } = xPData[0]);
      $("#warning_marks .mark-fcst").show() // 預報時段標記全顯示
      $("#keypoint .warning-text").removeClass("active")
    } else if (aniType === "go-back-point" || aniType === "go-next-point") {
      tauRange = aniType === "go-back-point"
        ? [Math.max(Math.ceil(tauTime - 1),PData[0].tau), tauTime]
        : [tauTime, Math.min(Math.floor(tauTime + 1),PData[PData.length-1].tau)]
        
      tauTime = aniType === "go-back-point"
        ? Math.max(Math.ceil(tauTime - 1),PData[0].tau)
        : Math.min(Math.floor(tauTime + 1),PData[PData.length-1].tau);
        
      // 如果有 Warning 介於預計前後兩時間點之間，則改為該重要時間點
      Warning_Data.forEach(item => {
        if (item.tau > tauRange[0] && item.tau < tauRange[1] && $(`#warning_estimate_list .warning-group[name='${item.type}'] .warning-check`).prop("checked")) {
          tauTime = item.tau // 修改tauTime為 重要時間點
        }
      });
        
      for (let i = 1; i < PData.length; i++) {
        const Pre = PData[i - 1];
        const This = PData[i];

        if (!((tauTime <= This.tau && tauTime > Pre.tau) || (i === 1 && tauTime === Pre.tau))) continue;
        const delta = (tauTime - Pre.tau) / (This.tau - Pre.tau);
        
        time = moment(Pre.time) + (moment(This.time) - moment(Pre.time)) * delta
        ax = roundTo(Pre.ax + (This.ax - Pre.ax) * delta, 2);
        ay = roundTo(Pre.ay + (This.ay - Pre.ay) * delta, 2);
        R15_x = roundTo(Pre.R15_x + (This.R15_x - Pre.R15_x) * delta, 3);
        R15_y = roundTo(Pre.R15_y + (This.R15_y - Pre.R15_y) * delta, 3);
        R25_x = roundTo(Pre.R25_x + (This.R25_x - Pre.R25_x) * delta, 3);
        R25_y = roundTo(Pre.R25_y + (This.R25_y - Pre.R25_y) * delta, 3);
        break; // ✅ 找到後就跳出
      }
      
      $("#warning_marks .mark-fcst").hide()
      $("#keypoint .warning-text").removeClass("active")
      Warning_Data.forEach(item => {
        if (item.tau == tauTime && $(`#warning_estimate_list .warning-group[name='${item.type}'] .warning-check`).prop("checked")) {
          $(`#warning_marks .mark-fcst[name='${item.type}']`).show()
          $(`#keypoint .warning-text[name='${item.type}']`).addClass("active")
        }
      });
    } else {
      const warning = warning_data.find(item => item.type === aniType);
      if (warning) {
        tauTime = warning.tau;
        ({ time, ax, ay, R15_x, R15_y, R25_x, R25_y } = warning);
      }
      
      // 只顯示該時間點預報標記
      $("#warning_marks .mark-fcst").hide()
      $(`#warning_marks .mark-fcst[name='${aniType}']`).show()
      $("#keypoint .warning-text").removeClass("active")
      $(`#keypoint .warning-text[name='${aniType}']`).addClass("active")
    }

    $("g#tc_circle").attr("tau", tauTime);
    xRadius = `
      <g id="g_tc_R15">
        <ellipse id="tc_R15" cx="${ax}" cy="${ay}" rx="${R15_x}" ry="${R15_y}" ${tauTime>=0 ? 'stroke="#F00" fill="#FFC9C9B3"' : 'stroke="#808080" fill="#FFFCE7B3"'} stroke-width="1.0"></ellipse>
      </g>
      <g id="g_tc_R25">
        <ellipse id="tc_R25" cx="${ax}" cy="${ay}" rx="${R25_x}" ry="${R25_y}" ${tauTime>=0 ? 'fill="#FF717180"' : 'fill="#f0e22480"'} stroke-width="0"></ellipse>
      </g>
      <g id="g_tc_center">
        <use id="tc_center" x="${ax}" y="${ay}" href="${tauTime<0 ? '#tyIcon_past' : '#tyIcon_fcst'}"></use>
      </g>
      <g id="g_tc_timestr" style="transform: translate(${R15_x*0.25}px, ${R15_y*0.25}px);">
        <text x="${ax}" y="${ay}" style="font-size: ${parseFloat(parseInt($("#warning_marks").css("font-size"))*0.75,2)}px;"><tspan>${moment(time).format('DD日HH時mm分').replace("00分", "")}</tspan></text>
      </g>`;
  }
  
  $("g#tc_circle").html(xRadius)
}


setTcCircle = function(tauTime=0 ,$svg=$("svg#basemap")) {
  $svg.find("g#tc_circle").contents().remove();
  let xRadius = ""
  
  for (let i = 1; i < PData.length; i++) {
    const Pre = PData[i - 1];
    const This = PData[i];

    if (!((tauTime <= This.tau && tauTime > Pre.tau) || (i === 1 && tauTime === Pre.tau))) continue;
    const delta = (tauTime - Pre.tau) / (This.tau - Pre.tau);
    
    time = moment(Pre.time) + (moment(This.time) - moment(Pre.time)) * delta
    ax = roundTo(Pre.ax + (This.ax - Pre.ax) * delta, 2);
    ay = roundTo(Pre.ay + (This.ay - Pre.ay) * delta, 2);
    R15_x = roundTo(Pre.R15_x + (This.R15_x - Pre.R15_x) * delta, 3);
    R15_y = roundTo(Pre.R15_y + (This.R15_y - Pre.R15_y) * delta, 3);
    R25_x = roundTo(Pre.R25_x + (This.R25_x - Pre.R25_x) * delta, 3);
    R25_y = roundTo(Pre.R25_y + (This.R25_y - Pre.R25_y) * delta, 3);
    break; // ✅ 找到後就跳出
  }
  
  $svg.find("#warning_marks .mark-fcst").hide()
  $svg.find("#keypoint .warning-text").removeClass("active")
  Warning_Data.forEach(item => {
    if (item.tau <= tauTime && $(`#warning_estimate_list .warning-group[name='${item.type}'] .warning-check`).prop("checked")) {
      $svg.find(`#warning_marks .mark-fcst[name='${item.type}']`).show()
    }
  });
  
  xRadius = `
    <g id="g_tc_R15">
      <ellipse id="tc_R15" cx="${ax}" cy="${ay}" rx="${R15_x}" ry="${R15_y}" ${tauTime>=0 ? 'stroke="#F00" fill="#FFC9C9B3"' : 'stroke="#808080" fill="#FFFCE7B3"'} stroke-width="1.0"></ellipse>
    </g>
    <g id="g_tc_R25">
      <ellipse id="tc_R25" cx="${ax}" cy="${ay}" rx="${R25_x}" ry="${R25_y}" ${tauTime>=0 ? 'fill="#FF717180"' : 'fill="#f0e22480"'} stroke-width="0"></ellipse>
    </g>
    <g id="g_tc_center">
      <use id="tc_center" x="${ax}" y="${ay}" href="${tauTime<0 ? '#tyIcon_past' : '#tyIcon_fcst'}"></use>
    </g>`;
    
  $svg.find("g#tc_circle").html(xRadius)
}


// 修改重要時間點內容 (warning-time 修改時觸發)
changeWarningTime = function(inputElement) {
  var parentElement = inputElement.closest(".warning-group");
  if (parentElement) {
    var nameAttributeValue = parentElement.getAttribute("name");
    var warningTimeValue = moment(inputElement.value);
    // var warningTypeText = $(parentElement).find(".warning-text").text().replace("：", "");

    // console.log(!isNaN(warningTimeValue.valueOf()))

    if (inputElement.value === '') {
      console.log(warningTimeValue, '時間清空')

      // 警報時間預估(LST)設定
      inputElement.setAttribute('value', '');
      inputElement.value = '';

      // 取消勾選警報時間預估(LST)核取方塊
      $(".warning-group[name='" + nameAttributeValue + "'] .warning-check").prop('checked', false)

      // 更新Warning_Data (找到 Warning_Data 內 type 為 nameAttributeValue 的物件並修改其 time 值)
      Warning_Data.forEach(item => {
        if (item.type === nameAttributeValue) {
          item.time = '';
        }
      });
    } else if (!isNaN(warningTimeValue.valueOf())) {
      // console.log('時間格式正常')
      var warningTime = moment(warningTimeValue).format('yyyy-MM-DD HH:mm')
      var startTime = moment(PData[0].time).format('yyyy-MM-DD HH:mm')
      var endTime = moment(PData[PData.length-1].time).format('yyyy-MM-DD HH:mm')
      
      if (warningTime > endTime) {
        console.log('時間晚於最後時間點')
        inputElement.value = PData[PData.length-1].time
        warningTime = endTime
      } else if (warningTime < startTime) {
        console.log('時間早於最初時間點')
        inputElement.value = PData[0].time
        warningTime = startTime
      }
      
      // 警報時間預估(LST)設定
      inputElement.setAttribute('value', warningTime);
      inputElement.value = warningTime;

      // 勾選警報時間預估(LST)核取方塊
      $(".warning-group[name='" + nameAttributeValue + "'] .warning-check").prop('checked', true)

      // 設定span元素的文字內容並顯示
      // $("#keypoint-content span[name='" + nameAttributeValue + "']").text(`${moment(warningTimeValue).format('DD日 HH:mm')} --- ${warningTypeText} `);

      // 更新Warning_Data (找到 Warning_Data 內 type 為 nameAttributeValue 的物件並修改其 time 值)
      Warning_Data.forEach(item => {
        if (item.type === nameAttributeValue) {
          item.time = warningTime;
          item.source = "No_Source";
          $(".warning-group[name='" + item.type + "']").attr('source', "No_Source");
        }
      });

      // 將 Warning_Data 依時間先後順序重新排序(空白排後)	
      Warning_Data.sort((a, b) => {
        // Handle empty time strings by converting them to the earliest possible date
        const timeA = a.time ? moment(a.time) : moment('9999-12-31T23:59:59Z'); // Earliest possible moment
        const timeB = b.time ? moment(b.time) : moment('9999-12-31T23:59:59Z'); // Earliest possible moment

        // Perform the comparison
        return timeA - timeB;
      });

      // 設定重要時間點keypoint-content
      setKeypointContent()

      // 繪製 警報半徑 warning_circle
      setWarningCircle()
      setWarningMarks()
      
      // 暴風半徑動畫
      setTcAnimate()
      
      // 重設編輯模式
      setEditModel()
    } else {
      console.log(warningTimeValue, '時間格式異常')
      inputElement.value = inputElement.getAttribute('value')
    }
  }
}

// 重要時間點顯示/隱藏
showHideKeypoint = function(checkElement) {
  var isChecked = checkElement.checked;
  var parentElement = checkElement.closest(".warning-group");
  if (parentElement) {
    var nameAttributeValue = parentElement.getAttribute("name");
    if (isChecked == true) {
      $("#keypoint-content div[name='" + nameAttributeValue + "']").show();
      $("#keypoint").show();
    } else {
      $("#keypoint-content div[name='" + nameAttributeValue + "']").hide();

      // 檢查 warning-check 是否皆為未勾選
      var allUnchecked = true; // 預設皆為未勾選
      $(".warning-check").each(function() {
        if (this.checked) {
          allUnchecked = false;
          return false; // 终止 each 循环
        }
      });
      if (allUnchecked) { // 所有 warning-check 皆未勾選
        $("#keypoint").hide();
      } else {
        $("#keypoint").show();
      }
    }

    // 設定重要時間點keypoint-content
    setKeypointContent()

    // 繪製 警報半徑 warning_circle
    setWarningCircle()
    setWarningMarks()
    
    // 暴風半徑動畫
    setTcAnimate()
    
    // 重設編輯模式
    setEditModel()
  }
}

// warning-time 增加1小時
incrementHour = function(buttonElement) {
  var parentElement = buttonElement.parentElement.parentElement;
  var inputElement = parentElement.querySelector(".warning-time");

  var dateStr = inputElement.value !== "" ? inputElement.value : onTheHourStr;

  inputElement.value = moment(dateStr).add(1, 'hours').format('yyyy-MM-DD HH:mm');

  // $("#keypoint-content span[name='" + parentElement.getAttribute("name") + "']").text(`${moment(inputElement.value).format('DD日 HH:mm')} --- ${$(parentElement).find(".warning-text").text()}`);
  changeWarningTime(inputElement)
}

// warning-time 減少1小時
decrementHour = function(buttonElement) {
  var parentElement = buttonElement.parentElement.parentElement;
  var inputElement = parentElement.querySelector(".warning-time");

  var dateStr = inputElement.value !== "" ? inputElement.value : onTheHourStr;

  inputElement.value = moment(dateStr).add(-1, 'hours').format('yyyy-MM-DD HH:mm');
  // $("#keypoint-content span[name='" + parentElement.getAttribute("name") + "']").text(`${moment(inputElement.value).format('DD日 HH:mm')} --- ${$(parentElement).find(".warning-text").text()}`);
  changeWarningTime(inputElement)
}

// 建立警報相關設定 (Warning_Data)
gen_warning = function() {
  $("#warning_estimate_list").contents().remove();
  $("#keypoint-content").contents().remove();
  $("#keypoint").removeAttr("style");
  $("#keypoint").attr("style", "left:18px;");

  Warning_Data = get_warning_data();

  // console.log(Warning_Data);

  if (Warning_Data.length === 0) {
    $("#warning_estimate_list").html('<div><span style="color:#f44336;">未接觸臺灣近海</span></div>');
    $("#keypoint").hide();
  } else {
    // 設定警報時間預估(LST)選單
    $.each(WarningText, function(key, value) {
      // console.log(key, value);
      var obj = Warning_Data.find(function(item) {
        return item.type === key;
      });
      if (obj !== undefined) {
        if (obj['source'] === 'TAFIS_Warning_History' || moment(obj['time']) < moment($("select#trackFcstList option:selected").val())) { // 已發布 --> 鎖定編輯
          $("#warning_estimate_list").append(`<div class="warning-group" name="${obj["type"]}" source="${obj["source"]}"><input class="warning-check" type="checkbox" onclick="showHideKeypoint(this)" value="" checked><div class="warning-text" name="${obj["text"]}" >${obj["text"]}：</div><input class="warning-time" value="${obj["time"]}" onchange="changeWarningTime(this)" disabled><div class="warning-adjust-btn"><button onclick="incrementHour(this)" disabled>▲</button><button onclick="decrementHour(this)" disabled>▼</button></div></div>`);
        } else if (obj['time'] === '') { // 無時間 --> 取消勾選
          $("#warning_estimate_list").append(`<div class="warning-group" name="${obj["type"]}" source="${obj["source"]}"><input class="warning-check" type="checkbox" onclick="showHideKeypoint(this)" value=""><div class="warning-text" name="${obj["text"]}">${obj["text"]}：</div><input class="warning-time" value="${obj["time"]}" onchange="changeWarningTime(this)"><div class="warning-adjust-btn"><button onclick="incrementHour(this)">▲</button><button onclick="decrementHour(this)">▼</button></div></div>`);
        } else {
          $("#warning_estimate_list").append(`<div class="warning-group" name="${obj["type"]}" source="${obj["source"]}"><input class="warning-check" type="checkbox" onclick="showHideKeypoint(this)" value="" checked><div class="warning-text" name="${obj["text"]}">${obj["text"]}：</div><input class="warning-time" value="${obj["time"]}" onchange="changeWarningTime(this)"><div class="warning-adjust-btn"><button onclick="incrementHour(this)">▲</button><button onclick="decrementHour(this)">▼</button></div></div>`);
        }
      }
    });

    // 設定重要時間點keypoint-content
    setKeypointContent()

    // 繪製 警報半徑 warning_circle
    setWarningCircle()
    setWarningMarks()
    
    // 暴風半徑動畫
    setTcAnimate()
    
    // 重設編輯模式
    setEditModel()

    // 設定 keypoint 拖動
    // const enable = $("#slide").hasClass("editable")
    // console.log(enable)
    // setEditModel(enable)

    $("#keypoint").show();
  }
};

