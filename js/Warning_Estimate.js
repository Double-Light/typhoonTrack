const fontSize = 9;           // 預設字體大小
const lineHeightScale = 1.2;  // 行高比例
const markSpacing = 5;        // mark間距


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
      'source': 'Self_Editing'
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

// 讀取內差點位
function getInterpolatePoint(tauTime, thisData = PData, dataKeys = Object.keys(thisData[0])) {  //  tauTime: time/tau； thisData: [{...}{...}...]； dataKeys: [key1,key2,...]
  // tauTime可以為 tau(整數) 或 time(日期時間字串)；thisData須為字典陣列形式的 Point Data，且至少有time或tau其中一個參數；dataKeys可制定回傳參數，預設為全部
  let result = null;
  const isNumberInput = typeof tauTime === "number" && !isNaN(tauTime);

  for (let i = 1; i < thisData.length; i++) {
    const Pre = thisData[i - 1];
    const This = thisData[i];

    let inRange = false;
    let delta = 0;

    if (isNumberInput) {
      // 用 tau 判斷
      inRange =
        (tauTime <= This.tau && tauTime > Pre.tau) ||
        (i === 1 && tauTime === Pre.tau);
      if (inRange) {
        delta = (tauTime - Pre.tau) / (This.tau - Pre.tau);
      }
    } else {
      // 嘗試解析時間字串
      const tauMoment = moment(tauTime);
      if (!tauMoment.isValid()) return null;

      const preMoment = moment(Pre.time);
      const thisMoment = moment(This.time);

      inRange =
        (tauMoment.isSameOrBefore(thisMoment) &&
         tauMoment.isAfter(preMoment)) ||
        (i === 1 && tauMoment.isSame(preMoment));

      if (inRange) {
        delta = (tauMoment - preMoment) / (thisMoment - preMoment);
      }
    }

    if (!inRange) continue;

    result = {};
    dataKeys.forEach(key => {
      if (Pre[key] !== undefined && This[key] !== undefined) {
        if (key === "time") {
          // 時間用毫秒差內插
          const preMoment = moment(Pre.time);
          const thisMoment = moment(This.time);
          const interpMoment = preMoment.clone().add((thisMoment - preMoment) * delta, "ms");
          result[key] = interpMoment.format("YYYY-MM-DD HH:mm");
        } else if (key == "Azimuth") {
          result[key] = (Pre.coordinate[0] !== This.coordinate[0] || Pre.coordinate[1] !== This.coordinate[1]) ? Math.round(get_Azimuth(Pre.coordinate, This.coordinate)) : 135
        } else if (key == "lon" || key == "lat") {
          let i = (key == "lon") ? 0 : 1
          result[key] = roundTo(Pre.coordinate[i] + (This.coordinate[i] - Pre.coordinate[i]) * delta,2)
        } else if (typeof Pre[key] === "number" && typeof This[key] === "number") {
          // 數值欄位內插
          const precision = key.startsWith("R15") || key.startsWith("R25") ? 3 : 2;
          result[key] = roundTo(Pre[key] + (This[key] - Pre[key]) * delta, precision);
        } else {
          // result[key] = delta < 0.5 ? Pre[key] : This[key];  // 非數值直接取較接近的一端
          result[key] = This[key] // 非數值直接取下一個值
        }
      }
    });
    break;
  }
  return result;
}


// 繪製 警報半徑 warning_circle (計算警報位置與半徑像素)
setWarningCircle = function() {
  // ---------- 清空既有圖層 ----------
  $("g#warning_circle").empty();

  // const iconSize = 16; // 暴風中心ICON大小

  let xRadius = "";
  let xMarks = "";

  let Azimuth = 135; // 預設移向為西北
  
  Warning_Data.forEach(warning => {
    if (warning.time) { // 有效時間格式再繪製
      const {time,tau, lon, lat, ax, ay, R15_x, R15_y, R25_x, R25_y} = getInterpolatePoint(warning.time, PData,["time", "tau", "lon", "lat", "ax", "ay", "R15_x", "R15_y", "R25_x", "R25_y"])
      
      // 將 ellipse 加入序列化字串 (之後一次寫入 DOM)
      xRadius += `
      <g class="${warning.time < xPData[0].time ? "mark-past" : "mark-fcst"}" name="${warning.type}">
        <ellipse cx="${ax}" cy="${ay}" rx="${R15_x}" ry="${R15_y}" ${warning.time < xPData[0].time ? 'style="stroke: #CACACA;"' : 'style="stroke: #FFCACA;"'}/>
        <use x="${ax}" y="${ay}" href="${warning.time < xPData[0].time ? '#tyIcon_past_light' : '#tyIcon_fcst_light'}"></use>
      </g>`;

      // 對 Warning_Data 寫回計算結果
      Object.assign(warning, {
        lon: roundTo(lon, 2),
        lat: roundTo(lat, 2),
        tau:tau,
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
    }
  });

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
    
    // ---------- 時間文字 ----------
    const date = new Date(warning.time);
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const timeStr = minute === "00" ? `${day}日${hour}時` : `${day}日${hour}時${minute}分`;
    
    // 建立描述文字字串 (用於決定 label寬度與高度)
    let tspans = [timeStr, warning.text]
    let textMaxLen = 0; tspans.forEach(t => { let l=0; for (let c of t) l += /[\u0000-\u00ff]/.test(c) ? 0.5 : 1; if (l > textMaxLen) textMaxLen = l; });  // 計算字數(用於決定 label寬度)
    // console.log("最大加權字數：", textMaxLen);

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

        // 計算寬高
        const labelWidth = fontSize * (textMaxLen+2);
        const labelHeight = fontSize * (tspans.length+1);
        const lineHeight = roundTo(fontSize * lineHeightScale,2);  // 行高

        const labelX = roundTo(ConnX + labelWidth * ConnectorItem[ConnectorType - 1][0], 2);
        const labelY = roundTo(ConnY + labelHeight * ConnectorItem[ConnectorType - 1][1], 2);

        // const box = { x: labelX - markSpacing, y: labelY - markSpacing, width: labelWidth + markSpacing * 2, height: labelHeight + markSpacing * 2 };
        const box = [labelX - markSpacing, labelY - markSpacing, labelWidth + markSpacing * 2, labelHeight + markSpacing * 2];
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

    // placedlabels.push({ x: labelX - markSpacing, y: labelY - markSpacing, width: labelWidth + markSpacing * 2, height: labelHeight + markSpacing * 2 });
    placedlabels[warning.type + "_mark"] = [labelX - markSpacing, labelY - markSpacing, labelWidth + markSpacing * 2, labelHeight + markSpacing * 2];
    placedLines[warning.type + "_ConnectLine"] = [ConnX, ConnY, ax, ay];
    bestPlacement[warning.type]['text'] = [timeStr, warning.text]

    // ---------- 組裝 g#warning-marks 片段 ----------
    const lineHeight = roundTo(fontSize * lineHeightScale,2);  // 行高
    const lines = 2;
    const textHeight = lineHeight * lines;
    const textStartY = roundTo(labelY + (labelHeight - textHeight) / 2 + fontSize,2); // 修正基線位置
    gMarks += `
      <g class="${warning.time <= xPData[0].time ? "mark-past" : "mark-fcst"}" name="${warning.type}">
        <line x1="${ConnX}" y1="${ConnY}" x2="${ax}" y2="${ay}" ConnectorType="${ConnectorType}" ${warning.time <= xPData[0].time ? 'style="stroke:#808080;"' : 'style="stroke:#c00000;"'}></line>
        <rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="${labelHeight}" rx="0" ${warning.time <= xPData[0].time ? 'style="stroke:#808080;fill:#fffce7;"' : 'style="stroke:#c00000;fill:#ff2f2f;"'}/>
        <text x="${labelX + labelWidth / 2}" y="${textStartY}" text-anchor="middle"  ${warning.time <= xPData[0].time ? 'style="fill: #000;"' : 'style="fill: #FFF;"'}>
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
setWarningMarksSize = function(fontSize = 9, markName = "") {
  $(`#warning_marks > g${markName ==="" ? "" : "[name='"+markName+"']"}`).each(function() {
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
    
    // 建立描述文字字串 (用於決定 label寬度與高度)
    let tspans = $("g#warning_marks g[name='warning_center_contact'] text tspan").map((_,el)=>$(el).text()).get()
    let textMaxLen = Math.max(...tspans.map(t=>[...t].reduce((len,ch)=>len+(/[\u0000-\u00ff]/.test(ch)?0.5:1),0)));

    // console.log("最大加權字數：", textMaxLen);
    const lines = $(this).find("text").find("tspan").length;

    // 計算寬高
    const labelWidth = fontSize * (textMaxLen+2);
    const labelHeight = fontSize * (tspans.length+1);
    const lineHeight = roundTo(fontSize * lineHeightScale,2);  // 行高


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

    $("g#warning_marks")
      .css("font-size", fontSize)
      .css("stroke-width", fontSize / 10);

    $("#g_tc_timestr text")
      .css("font-size", (fontSize * 0.75).toFixed(2));
  });
  
  // 設定 SVG 大小位置
  change_SVG_Size()
}

// 建立動畫參數
function getTcAniDatas (aniStartTau = 0,aniEndTau = xPData[xPData.length-1]['tau']) {
  let AD = [];  // 先清空陣列

  // 起始位置 "start"
  AD.push((() => {
    const p = getInterpolatePoint(aniStartTau, PData, ["time", "tau", "ax", "ay", "R15_x", "R15_y", "R25_x", "R25_y"]);
    const { time, ...rest } = p;
    return {type: "start", time: moment(p.time).format('DD日HH時mm分').replace("00分", ""), ...rest };
  })());

  // 先篩選排序好，再用 forEach push
  [...PData, ...warning_data]
    .filter(item => item.tau > aniStartTau && item.tau <= aniEndTau)
    .sort((a, b) => a.tau - b.tau)
    .forEach(item => {
      let Obj = AD.find(d => d.tau === item.tau); // 找 tau 一樣的
      if (Obj) {
        // 已存在 → 更新 type
        if (Obj.type != "fcst" && Obj.type != "curr" && Obj.type != "past") {Obj.type =  item.type;}
      } else {
        // 不存在 → 新增
        AD.push({
          type: (item.type === "fcst" || item.type === "curr" || item.type === "past")
            ? `${item.type}_${Math.abs(item.tau)}`
            : item.type,
          time: moment(item.time).format('DD日HH時mm分').replace("00分", ""),
          tau: item.tau,
          ax: item.ax,
          ay: item.ay,
          R15_x: item.R15_x,
          R15_y: item.R15_y,
          R25_x: item.R25_x,
          R25_y: item.R25_y
        });
      }
    });
    
    
  // 計算dt
  AD.forEach((item, i) => {
    item.dt = i > 0 ? (item.tau - AD[i - 1].tau) / perHr : (item.tau - aniStartTau) / perHr;
  });
  
  return AD
  // console.log("AniDatas:", AD);
}


// 建立暴風半徑動畫
function setTcAnimate (aniType="all") {
  $("g#tc_circle").contents().remove();
  $("#warning_marks >g animate").remove();            // 移除所有標記顯示/隱藏動畫
  $("#warning_marks .mark-fcst").css("opacity", "");  // 預報時段標記全顯示

  let xRadius = ""

  if ($("#btn_animsEnable").prop("checked")) { // 動畫模式
    // console.log("動畫模式")
    
    // 預設起訖時間
    let aniStartTau = 0
    let aniEndTau = xPData[xPData.length-1]['tau']

    // console.log(aniType)
    
    if (aniType == "all") {  // 全預報時段動畫
      // $("#warning_marks .mark-fcst").show() // 預報時段標記全顯示
      $("#keypoint .warning-text").removeClass("active")
    } else {                 // 區段動畫
      // aniStartTau = Math.max(warning_data.find(item => item.type === aniType).tau,0)
      // aniStartTau = warning_data.find(item => item.type === aniType).tau 
      // aniStartTau = Math.max(warning_data.find(item => item.type === aniType).tau - 12 ,0)

      aniEndTau = warning_data.find(item => item.type === aniType).tau 
      
      for (i = warning_data.length-1; i >=0; i--) {
        // console.log(i,warning_data[i]["tau"])
        if (warning_data[i]["tau"]<aniEndTau && $(`#warning_estimate_list .warning-group[name='${warning_data[i].type}'] .warning-check`).prop("checked")){
          aniStartTau = warning_data[i]["tau"]
          break;
        }
        if (i === 0){
          aniStartTau = Math.max(aniEndTau-12, PData[0].tau);
        }
      }
      
      // 只顯示該時間點預報標記
      // $("#warning_marks .mark-fcst").hide()
      // $(`#warning_marks .mark-fcst[name='${aniType}']`).show()
      $("#warning_marks .mark-fcst").css("opacity", "0");  // 預報時段標記全隱藏
      $("#keypoint .warning-text").removeClass("active")
      $(`#keypoint .warning-text[name='${aniType}']`).addClass("active")
    }
    
    // console.log(aniType,aniStartTau,aniEndTau);
    
    // 建立動畫參數 aniDatas、aniParas (全域變數)
    aniDatas = getTcAniDatas (aniStartTau,aniEndTau) // 建立動畫參數 aniDatas (不含結尾暫停)
    
    let AD = JSON.parse(JSON.stringify(aniDatas)) // 複製 aniDatas

    // 新贈結尾暫停
    if (pauseSec > 0){
      AD.push(
        Object.assign({}, AD[AD.length - 1], {
          type: "end_stop",
          tau: AD[AD.length - 1].tau,
          dt:pauseSec
        })
      );
    }

    aniParas = {
      "time" : AD.map(item => item.time),
      "tau" : AD.map(item => item.tau),
      "ax" : AD.map(item => item.ax),
      "ay" : AD.map(item => item.ay),
      "R15_x" : AD.map(item => item.R15_x),
      "R15_y" : AD.map(item => item.R15_y),
      "R25_x" : AD.map(item => item.R25_x),
      "R25_y" : AD.map(item => item.R25_y)
    }
    
    // 總時間（含結尾動畫暫停）
    const dur = AD.reduce((sum, item) => sum + item.dt, 0);

    // 計算累積時間（keyTimes 累積）
    let cumulative = [];
    AD.reduce((acc, item) => {
      const sum = acc + item.dt;
      cumulative.push(sum);
      return sum;
    }, 0);
    
    // 新增 keyTimes、dur、perHr參數
    aniParas.keyTimes = cumulative.map(x => (x / dur).toFixed(3));
    aniParas.dur = dur;
    aniParas.pauseSec = pauseSec || 0;
    aniParas.tauRange=[aniStartTau,aniEndTau];
    aniParas.aniType = aniType;
    aniParas.perHr = perHr;
    
    // console.log("aniParas:", aniParas);
    
    let keyTimes = aniParas.keyTimes.join(";")
    let aniAttr = aniType!="all" ? 'repeatCount="indefinite"' : 'repeatCount="indefinite"'
    
    let keyTimes_color = "0;1;1;1"
    if (aniStartTau <= 0 && aniEndTau >= 0) {
      keyTimes_color = `0;${roundTo((0-aniStartTau)/dur/perHr,3)};${roundTo((0-aniStartTau)/dur/perHr,3)};1`
    }
    
    xRadius = `
      <g id="g_tc_R15"> <!-- R15暴風圈 -->  
        <ellipse id="tc_R15" cx="${aniParas.ax[0]}" cy="${aniParas.ay[0]}" rx="${aniParas.R15_x[0]}" ry="${aniParas.R15_y[0]}" ${aniStartTau>=0 ? 'stroke="#F00" fill="#FFC9C9B3"' : 'stroke="#808080" fill="#FFFCE7B3"'} stroke-width="1.0">
          <animate attributeName="cx" dur="${dur}" ${aniAttr} values="${aniParas.ax.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="cy" dur="${dur}" ${aniAttr} values="${aniParas.ay.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="rx" dur="${dur}" ${aniAttr} values="${aniParas.R15_x.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="ry" dur="${dur}" ${aniAttr} values="${aniParas.R15_y.join(";")}" keyTimes="${keyTimes}" />
          ${aniStartTau <= 0 && aniEndTau >= 0 ? `<animate attributeName="stroke" dur="${dur}" ${aniAttr} values="#808080;#808080;#F00;#F00" keyTimes="${keyTimes_color}" />` : ''}
          ${aniStartTau <= 0 && aniEndTau >= 0 ? `<animate attributeName="fill" dur="${dur}" ${aniAttr} values="#FFFCE7B3;#FFFCE7B3;#FFC9C9B3;#FFC9C9B3" keyTimes="${keyTimes_color}" />` : ''}
        </ellipse>
      </g>
      <g id="g_tc_R25"> <!-- R25暴風圈 -->  
        <ellipse id="tc_R25" cx="${aniParas.ax[0]}" cy="${aniParas.ay[0]}" rx="${aniParas.R25_x[0]}" ry="${aniParas.R25_y[0]}" ${aniStartTau>=0 ? 'fill="#FF717180"' : 'fill="#f0e22480"'}>
          <animate attributeName="cx" dur="${dur}" ${aniAttr} values="${aniParas.ax.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="cy" dur="${dur}" ${aniAttr} values="${aniParas.ay.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="rx" dur="${dur}" ${aniAttr} values="${aniParas.R25_x.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="ry" dur="${dur}" ${aniAttr} values="${aniParas.R25_y.join(";")}" keyTimes="${keyTimes}" />
          ${aniStartTau <= 0 && aniEndTau >= 0 ? `<animate attributeName="fill" dur="${dur}" ${aniAttr} values="#f0e22480;#f0e22480;#FF717180;#FF717180" keyTimes="${keyTimes_color}" />` : ''}
        </ellipse>
      </g>
      <g id="g_tc_center"> <!-- 中心 -->  
        <use id="tc_center" x="${aniParas.ax[0]}" y="${aniParas.ay[0]}" href="${aniStartTau>=0 ? '#tyIcon_fcst' : '#tyIcon_past'}">
          <animate attributeName="x" dur="${dur}" ${aniAttr} values="${aniParas.ax.join(";")}" keyTimes="${keyTimes}" />
          <animate attributeName="y" dur="${dur}" ${aniAttr} values="${aniParas.ay.join(";")}" keyTimes="${keyTimes}" />
          ${aniStartTau <= 0 && aniEndTau >= 0 ? `<animate attributeName="href" dur="${dur}" ${aniAttr} values="#tyIcon_past;#tyIcon_past;#tyIcon_fcst;##tyIcon_fcst" keyTimes="${keyTimes_color}" />` : ''}
        </use>
      </g>`
      
    // console.log(xRadius)
    
    // 建立標記動畫
    Warning_Data.forEach(item => {
      if (item.tau >= 0 && item.tau > aniStartTau && item.tau <= aniEndTau && $(`#warning_estimate_list .warning-group[name='${item.type}'] .warning-check`).prop("checked")) {
        const $target = $(`#warning_marks g.mark-fcst[name='${item.type}']`);
        
        if ($target.length > 0) {
          // 建立 SVG animate 元素
          const SVG_NS = "http://www.w3.org/2000/svg";
          const animate = document.createElementNS(SVG_NS, "animate");

          animate.setAttribute("attributeName", "opacity");
          animate.setAttribute("dur", dur);
          animate.setAttribute("repeatCount", "indefinite");
          animate.setAttribute("values", "0;0;1;1;0");

          const t = roundTo((item.tau - aniStartTau) / dur / perHr, 3);
          // console.log(item.type, t, `0;${t};${t};${roundTo((dur-0.25)/dur, 3)>t ? roundTo((dur-0.25)/dur, 3) : t};1`)
          animate.setAttribute("keyTimes", `0;${t};${t};${(roundTo((dur-0.25)/dur, 3)>t ) ? roundTo((dur-0.25)/dur, 3) : t};1`);

          animate.setAttribute("fill", "freeze");
          
          // console.log(animate)

          // 插入 animate 元素
          $target[0].appendChild(animate);
        }
      }
    });
    
  } else {  // 靜態模式
    // console.log("靜態模式")
    let tauTime = parseFloat($("g#tc_circle").attr("tau") || 0);

    let time, ax, ay, R15_x, R15_y, R25_x, R25_y;  // 👈 提前宣告

    if (aniType === "all") {
      // console.log("全預報時段動畫");
      tauTime = xPData[0].tau;
      ({ time, ax, ay, R15_x, R15_y, R25_x, R25_y } = xPData[0]);
      // $("#warning_marks .mark-fcst").show() // 預報時段標記全顯示
      $("#warning_marks .mark-fcst").css("opacity", "");  // 預報時段標記全顯示
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

      ({time, ax, ay, R15_x, R15_y, R25_x, R25_y} = getInterpolatePoint(tauTime, PData,["time", "ax", "ay", "R15_x", "R15_y", "R25_x", "R25_y"]))
      
      // $("#warning_marks .mark-fcst").hide()
      $("#warning_marks .mark-fcst").css("opacity", "0")
      $("#keypoint .warning-text").removeClass("active")
      Warning_Data.forEach(item => {
        if (item.tau == tauTime && $(`#warning_estimate_list .warning-group[name='${item.type}'] .warning-check`).prop("checked")) {
          // $(`#warning_marks .mark-fcst[name='${item.type}']`).show()
          $(`#warning_marks .mark-fcst[name='${item.type}']`).css("opacity", "")
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
      // $("#warning_marks .mark-fcst").hide()
      // $(`#warning_marks .mark-fcst[name='${aniType}']`).show()
      $("#warning_marks .mark-fcst").css("opacity", "0");  // 預報時段標記全隱藏
      $(`#warning_marks .mark-fcst[name='${aniType}']`).css("opacity", "")
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
        <use id="tc_center" x="${ax}" y="${ay}" href="${tauTime>=0 ? '#tyIcon_fcst' : '#tyIcon_past'}"></use>
      </g>
      <g id="g_tc_timestr" style="transform: translate(${R15_x*0.25}px, ${R15_y*0.25}px);">
        <text x="${ax}" y="${ay}" style="font-size: ${parseFloat(parseInt($("#warning_marks").css("font-size"))*0.75,2)}px;"><tspan>${moment(time).format('DD日HH時mm分').replace("00分", "")}</tspan></text>
      </g>`;
  }
  $("g#tc_circle").html(xRadius)
}

// 繪製TcCircle
function setTcCircle(tauTime=0 ,$svg=$("svg#basemap"), showAllMarks = false, highlight = false) {
  $("g#tc_circle").contents().remove();
  $("#warning_marks >g animate").remove();            // 移除所有標記顯示/隱藏動畫
  $("#warning_marks .mark-fcst").css("opacity", "");  // 預報時段標記全顯示
  
  $svg.find("g#tc_circle").contents().remove();
  let xRadius = ""
  
  // console.log(tauTime);
  
  const {time, ax, ay, R15_x, R15_y, R25_x, R25_y} = getInterpolatePoint(tauTime, PData,["time", "ax", "ay", "R15_x", "R15_y", "R25_x", "R25_y"])
  
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
  
  // 標記顯示/隱藏
  if (showAllMarks) { // 標記全顯示
    $svg.find("#warning_marks g").show()
  } else { // 只顯示 Warning tau < tauTime
    $svg.find("#warning_marks .mark-fcst").hide()
    $svg.parent().find("#keypoint .warning-text").removeClass("active")
    Warning_Data.forEach(item => {
      if (item.tau <= tauTime && $(`#warning_estimate_list .warning-group[name='${item.type}'] .warning-check`).prop("checked")) {
        $svg.find(`#warning_marks g[name='${item.type}']`).show()
        if (item.tau === tauTime && highlight) {
          $svg.parent().find(`#keypoint .warning-text[name='${item.type}']`).addClass("active")
          // $svg.parent().find(`#keypoint .warning-text[name='${item.type}']`).css("background","#FFC9C9B3")
          // console.log(item.type, "highlight")
        }
      }
    });
  }

}


// 顯示/隱藏重要時間點
function showHideKeypoint(checkElement) {
  var isChecked = $(checkElement).prop('checked');
  var $parentElement = $(checkElement).closest(".warning-group");

  if ($parentElement.length) {
    var warnType = $parentElement.attr("name");

    if (isChecked) {
      $("#keypoint-content div[name='" + warnType + "']").show();
      $("#keypoint").show();
    } else {
      $("#keypoint-content div[name='" + warnType + "']").hide();

      // 檢查是否所有 warning-check 都未勾選
      var allUnchecked = $(".warning-check").toArray().every(function(el) {
        return !el.checked;
      });
      if (allUnchecked) {
        $("#keypoint").hide();
      } else {
        $("#keypoint").show();
      }
    }

    setKeypointContent();
    setWarningCircle();
    setWarningMarks();
    setTcAnimate();
    setEditModel();
  }
}

// 更新警報
function changeWarning($warnGroup, changeType) {
  // console.log("呼叫 changeWarning")
  var warnType = $warnGroup.attr("name");
  
  // 停用動畫
  $("#btn_animsEnable").prop("checked",false)
  setTcAnimate()

  if (changeType === "changeTime") {
    var $inputElement = $warnGroup.find(".warning-time");
    var warningTimeValue = moment($inputElement.val());

    if ($inputElement.val() === '') {
      // 時間清空
      $inputElement.attr('value', '').val('');
      $warnGroup.find(".warning-check").prop('checked', false);

      Warning_Data.forEach(item => {
        if (item.type === warnType) {
          item.time = '';
        }
      });
    } else if (!isNaN(warningTimeValue.valueOf())) {
      var warningTime = moment(warningTimeValue).format('YYYY-MM-DD HH:mm');
      var startTime = moment(PData[0].time).format('YYYY-MM-DD HH:mm');
      var endTime = moment(PData[PData.length - 1].time).format('YYYY-MM-DD HH:mm');

      if (warningTime > endTime) {
        $inputElement.val(PData[PData.length - 1].time);
        warningTime = endTime;
      } else if (warningTime < startTime) {
        $inputElement.val(PData[0].time);
        warningTime = startTime;
      }

      $inputElement.attr('value', warningTime).val(warningTime); // 更新時間
      $warnGroup.find(".warning-check").prop('checked', true);

      Warning_Data.forEach(item => {
        if (item.type === warnType) {
          item.time = warningTime;
          item.source = "Self_Editing";
          $warnGroup.attr('source', "Self_Editing");
        }
      });

      Warning_Data.sort((a, b) => {
        const timeA = a.time ? moment(a.time) : moment('9999-12-31 23:59');
        const timeB = b.time ? moment(b.time) : moment('9999-12-31 23:59');
        return timeA - timeB;
      });
    } else {
      $inputElement.val($inputElement.attr('value'));
    }

    setKeypointContent();
    setWarningCircle();
    setWarningMarks();
    setTcAnimate();
    setEditModel();
  } else if (changeType === "changeText") {
    var $inputElement = $warnGroup.find(".warning-text");
    
    // TODO: 依據 warning-text 的內容更新 Warning_Data
    var newText = $warnGroup.find(".warning-text").val();
    
    console.log("更新文字：", newText);
    
    $inputElement.attr('value', newText).val(newText);  // 更新文字
    
    let obj = Warning_Data.find(function(item) {
      return item.type === warnType;
    });
    console.log(warnType, obj);

    if (obj !== undefined) {
      obj.text = newText;
      // obj.source = "Self_Editing";
      
      // $warnGroup.attr('source', "Self_Editing");
    }
    // 更新重要時間點 keypoint-content 與 warning_marks
    [`#keypoint-content .warning-text[name='${warnType}'] span:eq(3)`,
      `#warning_marks g[name='${warnType}'] text tspan:eq(1)`
    ].forEach(sel => {
      const $el = $(sel);
      if ($el.length) $el.html(newText);
    });
    
    // 調整該標記大小
    let fontSize = parseFloat($("g#warning_marks").css("font-size"))
    setWarningMarksSize(fontSize,warnType)
    
    // 重設 warning-text 寬度
    $(".warning-group .warning-text").css("width",(Math.max(...warning_data.map(item => item.text.replace(" ","").length)))*parseFloat($(".warning-group .warning-text").css("font-size")))
  }
}

// 增加/減少 1 小時
function incrementHour(button) { // 參數改成 button
  var $warnGroup = $(button).closest(".warning-group"); // 轉成 jQuery
  var $inputElement = $warnGroup.find(".warning-time");
  var dateStr = $inputElement.val() || onTheHourStr;

  $inputElement.val(moment(dateStr).add(1, 'hours').format('YYYY-MM-DD HH:mm'));
  changeWarning($warnGroup, 'changeTime');
}

function decrementHour(button) {
  var $warnGroup = $(button).closest(".warning-group");
  var $inputElement = $warnGroup.find(".warning-time");
  var dateStr = $inputElement.val() || onTheHourStr;

  $inputElement.val(moment(dateStr).add(-1, 'hours').format('YYYY-MM-DD HH:mm'));
  changeWarning($warnGroup, 'changeTime');
}

// 新增警報重要時間點
$(function () {
  $("#btn_warningAdd").on("click", function () {
    let i = 1;
    while (i <= warning_data.length) {
      let selfType = `self_editing_${i}`;
      let obj = Warning_Data.find(function(item) {
        return item.type === selfType;
      });
      // console.log(selfType, obj);

      if (obj == undefined) {
        let item = {
          'type': selfType,
          'time': '',
          'text': `重要時間點 ${i}`,
          'source': 'Self_Editing'
        }
        
        Warning_Data.push(item);
        $("#warning_estimate_list").append(`<div class="warning-group" name="${item["type"]}" source="${item["source"]}"><input class="warning-check" type="checkbox" onclick="showHideKeypoint(this)" value=""><input class="warning-text" value="${item["text"]}" onchange="changeWarning($(this).closest('.warning-group'), 'changeText')"><span>：</span><input class="warning-time" value="${item["time"]}" onchange="changeWarning($(this).closest('.warning-group'), 'changeTime')"><div class="warning-adjust-btn"><button onclick="incrementHour(this)">▲</button><button onclick="decrementHour(this)">▼</button></div></div>`);
        
        // 設定 warning-text 寬度
        $(".warning-group .warning-text").css("width",(Math.max(...warning_data.map(item => item.text.replace(" ","").length)))*parseFloat($(".warning-group .warning-text").css("font-size")))
        
        break;
      }
      i++;
    }
  });
});


// 建立警報相關設定 (Warning_Data)
gen_warning = function() {
  $("#warning_estimate_list").contents().remove();
  $("#keypoint-content").contents().remove();
  $("#keypoint").removeAttr("style");
  $("#keypoint").attr("style", "left:18px;");
  
  let FcstTime = moment($("select#trackFcstList option:selected").val()) // 預報時間

  Warning_Data = get_warning_data();

  if (Warning_Data.filter(data => data.time != "").length === 0) {
    $("#warning_estimate_list").html('<div><span style="color:#f44336;">未接觸臺灣近海</span></div>');
    $("#keypoint").hide();
    change_SVG_Size()
  } else {
    // 設定警報時間預估(LST)選單
    Warning_Data.forEach(item => {
      if (item['source'] === 'TAFIS_Warning_History' || (moment(item['time']) < FcstTime && item['source'] != 'Self_Editing')) { // 已發布 --> 鎖定編輯
        $("#warning_estimate_list").append(`<div class="warning-group" name="${item["type"]}" source="${item["source"]}"><input class="warning-check" type="checkbox" onclick="showHideKeypoint(this)" value="" checked><input class="warning-text" value="${item["text"]}" onchange="changeWarning($(this).closest('.warning-group'), 'changeText')"><span>：</span><input class="warning-time" value="${item["time"]}" onchange="changeWarning($(this).closest('.warning-group'), 'changeTime')" disabled><div class="warning-adjust-btn"><button onclick="incrementHour(this)" disabled>▲</button><button onclick="decrementHour(this)" disabled>▼</button></div></div>`);
      } else if (item['time'] === '') { // 無時間 --> 取消勾選
        $("#warning_estimate_list").append(`<div class="warning-group" name="${item["type"]}" source="${item["source"]}"><input class="warning-check" type="checkbox" onclick="showHideKeypoint(this)" value=""><input class="warning-text" value="${item["text"]}" onchange="changeWarning($(this).closest('.warning-group'), 'changeText')"><span>：</span><input class="warning-time" value="${item["time"]}" onchange="changeWarning($(this).closest('.warning-group'), 'changeTime')"><div class="warning-adjust-btn"><button onclick="incrementHour(this)">▲</button><button onclick="decrementHour(this)">▼</button></div></div>`);
      } else {
        $("#warning_estimate_list").append(`<div class="warning-group" name="${item["type"]}" source="${item["source"]}"><input class="warning-check" type="checkbox" onclick="showHideKeypoint(this)" value="" checked><input class="warning-text" value="${item["text"]}" onchange="changeWarning($(this).closest('.warning-group'), 'changeText')"><span>：</span><input class="warning-time" value="${item["time"]}" onchange="changeWarning($(this).closest('.warning-group'), 'changeTime')"><div class="warning-adjust-btn"><button onclick="incrementHour(this)">▲</button><button onclick="decrementHour(this)">▼</button></div></div>`);
      }
    });
    
    // 設定 warning-text 寬度
    $(".warning-group .warning-text").css("width",(Math.max(...warning_data.map(item => item.text.length)))*parseFloat($(".warning-group .warning-text").css("font-size")))

    // 設定重要時間點keypoint-content
    setKeypointContent()

    // 繪製 警報半徑 warning_circle
    setWarningCircle()
    setWarningMarks()

    // 設定 keypoint 拖動
    // const enable = $("#slide").hasClass("editable")
    // console.log(enable)
    // setEditModel(enable)

    $("#keypoint").show();
  }
  
  // 暴風半徑動畫
  setTcAnimate()
  
  // 重設編輯模式
  setEditModel()
};

