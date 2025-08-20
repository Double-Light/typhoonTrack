get_Track_data = function(input_YYYY=""){
   /* 讀取年度TY/TD活動狀態 , 颱風資料(陸警), 颱風資料(分析) */
   let base_dir  = "./data/"
   let NowMoment = moment()
   let spec_YYYY = NowMoment.format("YYYY")
   input_YYYY = String(input_YYYY)
   if(spec_YYYY!=input_YYYY && input_YYYY!=""){
      spec_YYYY = input_YYYY 
      console.log(`[LOAD_TAFIS_DATA] 切換成指定年份：${spec_YYYY}`)
   }else{
      console.log(`[LOAD_TAFIS_DATA] 指定年份：${spec_YYYY}`)
   };

   let TY_StatusFile    = `${base_dir}CycloneStatus_Data_Refrom_${spec_YYYY}.json`
   let TY_CycloneActive = `${base_dir}CycloneActive_${spec_YYYY}.json`


  let AData            = `${base_dir}Typhoon_Analysis_Data_Refrom_V2_${spec_YYYY}.json`   \\ "https://iwfc.cwa.gov.tw/static/data/Typhoons/Typhoon_Analysis_Data_Refrom_V2_2025.json"
  let FData            = `${base_dir}Typhoon_Forecast_Data_V2_${spec_YYYY}.json`          \\ "https://iwfc.cwa.gov.tw/static/data/Typhoons/Typhoon_Forecast_Data_V2_2025.json"
  let WData            = `${base_dir}WarningText_${spec_YYYY}.json`                       \\ "https://iwfc.cwa.gov.tw/static/data/Typhoons/WarningText_2025.json"
  let Warning_Estimate = `${base_dir}typhoon_landalert_${spec_YYYY}.json`                 \\ "https://iwfc.cwa.gov.tw/static/data/Typhoons/typhoon_landalert_2025.json"
  let Warning_History  = get_TAFIS_API(`https://tafis2.cwa.gov.tw/tafis/api/warning/type-changing-history/?source=CWB&cwb_ty_year=${spec_YYYY}`)
}