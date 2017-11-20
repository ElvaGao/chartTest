/*
 * 分时线用到的方法
 */
// 获取X轴的数值
function getxAxis(todayDateStr,$this){
    var beginTime,finishTime,beginTime1,finishTime1;
    //2、判断是开始时间是否大于结束时间，大于的话就要取前一天，小于的话按照正常的来 
    var b_time1,b_time2;  // 停盘时间
    if(sub > -1){ //未跨天的时间计算  1-中间有断开  2-中间未断开
        // todayDate = formatDate(data[0].Date + sub);
        todayDate = formatDate(todayDateStr);
        if($this.nowDateTime.length > 1){
            beginTime = todayDate + " " + $this.nowDateTime[0].startTime;
            finishTime = todayDate + " " + $this.nowDateTime[0].endTime;
            beginTime1 = todayDate + " " + $this.nowDateTime[1].startTime1;
            finishTime1 = todayDate + " " + $this.nowDateTime[1].endTime1;
            
            b_time1 = moment(finishTime).utc().valueOf();
            b_time2 = moment(beginTime1).utc().valueOf();
        }else{
            beginTime = todayDate + " " + $this.nowDateTime[0].startTime;
            finishTime = todayDate + " " + $this.nowDateTime[0].endTime;
        }
    }else{  //跨天的时间计算  1-中间有断开
        // todayDate = formatDate(data[0].Date + sub);
        todayDate = formatDate(todayDateStr);
        if($this.nowDateTime.length > 1){
            beginTime = todayDate + " " + $this.nowDateTime[0].startTime;
            finishTime = todayDate + " " + $this.nowDateTime[0].endTime;
            beginTime1 = todayDate + " " + $this.nowDateTime[1].startTime1;
            finishTime1 = todayDate + " " + $this.nowDateTime[1].endTime1;

            // 前半段时间的起始时间和结束时间比较
            if(moment(beginTime).utc().valueOf() < moment(finishTime).utc().valueOf()){
                //都是当天时间 
                // 判断后半段时间：前半段的结束时间和后半段的结束时间作比较   如果大于，则跨天；否则没有
                if(moment(finishTime).utc().valueOf() < moment(beginTime1).utc().valueOf()){
                    // 判断后半段时间是否跨天 如果大于，则跨天；否则没有
                    if(moment(beginTime1).utc().valueOf() < moment(finishTime1).utc().valueOf()){

                    }else{
                        //跨天
                        finishTime1 = formatDate(todayDateStr+1) + " " + $this.nowDateTime[1].endTime1;
                    }
                }else{
                    beginTime1 = formatDate(todayDateStr+1) + " " + $this.nowDateTime[1].startTime1;
                    finishTime1 = formatDate(todayDateStr+1) + " " + $this.nowDateTime[1].endTime1;
                }
            }else{
                //结束时间为第二天   跨天了
                finishTime = formatDate(todayDateStr+1) + " " + $this.nowDateTime[0].endTime;
                beginTime1 = formatDate(todayDateStr+1) + " " + $this.nowDateTime[1].startTime1;
                finishTime1 = formatDate(todayDateStr+1) + " " + $this.nowDateTime[1].endTime1;
            }

            b_time1 = moment(finishTime).utc().valueOf();
            b_time2 = moment(beginTime1).utc().valueOf();
        }else{  // 2- 中间未断开
            beginTime = todayDate + " " + $this.nowDateTime[0].startTime;
            finishTime = formatDate(todayDateStr+1) + " " + $this.nowDateTime[0].endTime;
        }
    }
    beginTime = moment(beginTime).utc().valueOf(); //开盘时间
    if(finishTime1){
        endDateTime = finishTime1;
        finishTime = moment(finishTime1).utc().valueOf();
    }else{
        endDateTime = finishTime;                        
        finishTime = moment(finishTime).utc().valueOf(); //清盘时间
    }
    var timeAdd = beginTime;
    var i = 0;
    while (moment(timeAdd).isBefore(moment(finishTime))) {
        if (i == 0) {
            $this.c_data.push(beginTime);
        } else {
            timeAdd = moment(timeAdd).add(1, 'm').utc().valueOf();
            if(b_time1 && b_time2){
                if (moment(timeAdd).isAfter(moment(b_time1)) && moment(timeAdd).isBefore(moment(b_time2))) {
                    continue;
                } else {
                    $this.c_data.push(timeAdd);
                }
            }else{
                $this.c_data.push(timeAdd);
            }
        }
        i++;
    }
    for(var k = 0;k < $this.c_data.length;k++){
        $this.v_data.push(formatDate($this.c_data[k],"1"));
    }
    return $this.v_data;
}
// 将"2017-01-01 02:03" 转换为时间戳 1483207380(整数)
// function dateToStamp(date){
//     if(date.indexOf("-")>-1){
//         date = date.replace(/-/g,'/');
//     }
//     return Date.parse(new Date(date));
// }
// //日期YYYYMMDD转为YYYY-MM-DD 或者 时间戳转为年-月-日  星期 时间   dateTime为时间或时间戳 type为转换类型,如果不传默认是第一种转换
// function formatDate(dateTime,type){
//     if(!dateTime) return;
//     var dateStr;
//     if(!type){
//         dateTime = dateTime.toString();
//         var year = dateTime.substr(0,4);
//         var month = dateTime.substr(4,2);
//         var day = dateTime.substr(6,2);
//         dateStr = year + "-" + month +"-"+ day;
//     }else{
//         var d = new Date(parseFloat(dateTime));
//         var year = d.getFullYear();     
//         var month = d.getMonth()+1;     
//         var date = d.getDate();     
//         var hour = d.getHours();     
//         var minute = d.getMinutes();     
//         var second = d.getSeconds();
//         if(hour < 10){
//             hour = "0" + hour;
//         }
//         if(minute < 10){
//             minute = "0" + minute;
//         }
//         var day = d.getDay();
        
//         var dayStr;
//         switch(day){
//             case 0:
//             dayStr = "日";
//             break;
//             case 1:
//             dayStr = "一";
//             break;
//             case 2:
//             dayStr = "二";
//             break;
//             case 3:
//             dayStr = "三";
//             break;
//             case 4:
//             dayStr = "四";
//             break;
//             case 5:
//             dayStr = "五";
//             break;
//             case 6:
//             dayStr = "六";
//             break;
//             default:
//             break;
//         }
//         dateStr = year + "-" + month + "-" + date + "  " + dayStr + " " + hour + ":" + minute;
//     }
//     return dateStr;
// }
/*
 * K线用到的方法
 */

/*
 * 都用到的方法
 */
//093000 -> 09:30
// function formatTime(time) {
//     time = time.toString();
//     //TODO 后台返回的数据时间没有补0
//     if (time.length !== 6) {
//         var diff = 6 - (time.length);
//         var zero = "";
//         for (var i = 0; i < diff; i++) {
//             zero += "0";
//         }
//         time = zero + time;
//     }
//     var H = time.substring(0, 2);
//     var m = time.substring(2, 4);
//     time = H + ":" + m;
//     return time;
// };