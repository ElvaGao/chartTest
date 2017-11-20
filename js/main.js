// 通过地址获取参数
function getQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) return decodeURIComponent(r[2]); return null;
}
//日期YYYYMMDD转为YYYY-MM-DD 或者 时间戳转为年-月-日  星期 时间   dateTime为时间或时间戳 type为转换类型,如果不传默认是第一种转换
function formatDate(dateTime,type){
    if(!dateTime) return;
    var dateStr;
    if(!type){
        dateTime = dateTime.toString();
        var year = dateTime.substr(0,4);
        var month = dateTime.substr(4,2);
        var day = dateTime.substr(6,2);
        dateStr = year + "-" + month +"-"+ day;
    }else{
        var d = new Date(parseFloat(dateTime));
        var year = d.getFullYear();     
        var month = d.getMonth()+1;     
        var date = d.getDate();
        var hour = d.getHours();
        var minute = d.getMinutes();
        var second = d.getSeconds();
        if(hour < 10){
            hour = "0" + hour;
        }
        if(minute < 10){
            minute = "0" + minute;
        }
        var day = d.getDay();
        
        var dayStr;
        switch(day){
            case 0:
            dayStr = "日";
            break;
            case 1:
            dayStr = "一";
            break;
            case 2:
            dayStr = "二";
            break;
            case 3:
            dayStr = "三";
            break;
            case 4:
            dayStr = "四";
            break;
            case 5:
            dayStr = "五";
            break;
            case 6:
            dayStr = "六";
            break;
            default:
            break;
        }
        dateStr = year + "-" + month + "-" + date + "  " + dayStr + " " + hour + ":" + minute;
    }
    return dateStr;
}
//转换时间 093000 -> 09:30
function formatTime(time) {
    time = time.toString();
    //TODO 后台返回的数据时间没有补0
    if (time.length !== 6) {
        var diff = 6 - (time.length);
        var zero = "";
        for (var i = 0; i < diff; i++) {
            zero += "0";
        }
        time = zero + time;
    }
    var H = time.substring(0, 2);
    var m = time.substring(2, 4);
    time = H + ":" + m;
    return time;
}

// 将"2017-01-01 02:03" 转换为时间戳 1483207380(整数)
function dateToStamp(date){
    if(date.indexOf("-")>-1){
        date = date.replace(/-/g,'/');
    }
    return Date.parse(new Date(date));
}