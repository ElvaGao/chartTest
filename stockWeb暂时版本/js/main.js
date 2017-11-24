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
// 将"2017-01-01 02:03" 转换为时间戳 1483207380(整数)
function dateToStamp(date){
    if(date.indexOf("-")>-1){
        date = date.replace(/-/g,'/');
    }
    return Date.parse(new Date(date));
}
;(function($,window,document,undefined){
    // tab切换插件
    $.fn.toggleLi = function(options,params){
        options = $.extend({},$.fn.toggleLi.defaults,options || {});
        
        var $this = $(this);
        var opt = $("<ul class='clearfix' id='tab'></ul>");

        initLi(opt,options);

        $this.prepend(opt);
        var index = 0;
        $("ul li").on("click",function(event){
            $("ul li").removeClass("active");
            $(this).addClass("active");
            index = $(this).index();

            // 不同地方调用  执行的函数内容不同
            tabLi(index);
        });
    };
    function initLi($el,opt){
        var $li;
        $.each(opt.data,function(i,item){
            $li = $("<li></li>");
            $li.css({"width":opt.width,"height":opt.lineHeight,"line-height":opt.lineHeight,"border-bottom":opt.borderB,"float":"left"});
            if(i==0){
                $li.addClass("active");
            }
            var $a = $("<a></a>");
            // $a.attr({"href":item.href});
            $a.text(item.name);
            $li.append($a);
            $($el).append($li);
        });
    }
    $.fn.toggleLi.defaults = {
        data:[{name:""}],
        lineHeight:"40px",
        width:"70px",
        borderB:"0"
    };
    $.fn.showList = function(options,params){                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
        options = $.extend({},$.fn.showList.defaults,options);
        $this = $(this);
        $this.html("<h1>"+options.title+"</h1>");
        var htmlStr = '<ul class="clearfix"><li class="zdf-list-one"><ul class="clearfix zdf-list-title">';
        for(let i=0;i<options.dataTit;i++){
            htmlStr += '<li>'+options.dataTit[i].liTilt+'</li>';
        }
        htmlStr += '</ul></li>';
        htmlStr += '<li class="zdf-list-one zdf-list-detail"><ul class="clearfix">';
        for(let i=0;i<options.data;i++){
            htmlStr += '<li>'+options.data[i].list+'</li>';
        }
        htmlStr += '</ul>';
        $this.append(htmlStr);
    };
})(jQuery, window, document);