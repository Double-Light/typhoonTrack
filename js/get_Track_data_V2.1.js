/**
 * [非同步函式] 根據指定年份，從伺服器讀取颱風路徑與警報相關的 JSON 資料。
 * @param {string | number} [input_YYYY=""] - 要查詢的年份。如果為空，則使用當前年份。
 * @returns {Promise<object|null>} - 回傳一個包含所有資料的物件 Promise。若發生錯誤則解析為 null。
 */
const get_Track_data = async function(input_YYYY = "") {
  // --- 基本路徑設定 ---
  const base_dir = "https://iwfc.cwa.gov.tw/static/data/Typhoons/"; // 注意：此為相對路徑，需確保伺服器能正確存取

  // --- 決定年份 ---
  let spec_YYYY = input_YYYY ? String(input_YYYY) : moment().format("YYYY");
  console.log(`[LOAD_TAFIS_DATA] 開始獲取年份 ${spec_YYYY} 的資料`);

  // --- 定義所有需要讀取的檔案路徑 ---
  const filePaths = {
    AData: `${base_dir}Typhoon_Analysis_Data_Refrom_V2_${spec_YYYY}.json`,
    FData: `${base_dir}Typhoon_Forecast_Data_V2_${spec_YYYY}.json`,
    WData: `${base_dir}WarningText_${spec_YYYY}.json`,
    Warning_History: `${base_dir}WarningTypeChangingHistory_${spec_YYYY}.json`,
    Warning_Estimate: `${base_dir}typhoon_landalert_${spec_YYYY}.json`
  };

console.log(filePaths)

  try {
    // --- 使用 fetch 讀取單一檔案的輔助函式 ---
    const fetchJson = async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        // 如果檔案不存在 (404) 或其他伺服器錯誤，就拋出錯誤
        throw new Error(`無法讀取檔案: ${url}, 狀態: ${response.status}`);
      }
      return response.json(); // 解析回應為 JSON
    };

    // --- 使用 Promise.all 平行處理所有檔案的讀取請求，以提升效率 ---
    const [
      AData,
      FData,
      WData,
      Warning_History,
      Warning_Estimate
    ] = await Promise.all([
      fetchJson(filePaths.AData),
      fetchJson(filePaths.FData),
      fetchJson(filePaths.WData),
      fetchJson(filePaths.Warning_History),
      fetchJson(filePaths.Warning_Estimate)
    ]);

    console.log(`[LOAD_TAFIS_DATA] 年份 ${spec_YYYY} 的所有資料成功載入。`);

    // --- 將所有讀取到的資料組合成物件並回傳 ---
    return {
      AData,
      FData,
      WData,
      Warning_History,
      Warning_Estimate
    };

  } catch (error) {
    // --- 統一處理任何讀取或解析過程中發生的錯誤 ---
    console.error('[LOAD_TAFIS_DATA] 讀取資料時發生嚴重錯誤:', error);
    // 可以在這裡觸發一個 UI 提示，告知使用者資料載入失敗
    // alert(`讀取 ${spec_YYYY} 年的資料失敗，部分功能可能無法使用。`);
    return null; // 回傳 null 表示操作失敗
  }
};

