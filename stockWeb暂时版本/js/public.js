/*
 * 时间格式化
 */
// 000000 -> 00:00:00 转为时分秒
function formatTimeSec(time) {
    time = time.toString();
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
    var s = time.substring(4, 6)
    time = H + ":" + m + ":" + s;
    return time;
};
//日期时间20170908 2017-09-08
function formatDate(date) {
    date = date.toString();
    var Y = date.substring(0, 4);
    var M = date.substring(4, 6);
    var D = date.substring(6, 8);
    return Y + "-" + M + "-" + D;
};
//093000 -> 09:30
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
};
