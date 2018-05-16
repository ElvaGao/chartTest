var KLineSocket;
var pixel=[];
var yAxisValueList = [];
var _this;
var clickTimer = null;
var myVolume = 0;
var reconnectWS = false;
$(document).keydown(function(e){
    if(_this!=undefined&&($(_this).attr("id")=="MLine"||$(_this).attr("id")=="kline")){
        $(_this).children(".charts-focus").focus();
        return;
    }
});
/*
 * 查询下拉框效果
 */
;(function ($) {
    /*
     * 查询下拉框效果
     */
    $.selectOption = function (option) {
        var selectOpt = new $.selectOptionEl(option);
        selectOpt.bingKeyUpEvents();
        selectOpt.bindClose();
        selectOpt.bindSubmit();
        selectOpt.bindFocus();

    };

    $.selectOptionEl = function (option) {
        this.default = {
            timer: "",
            indexLi: "",
        };

        this.options = $.extend({}, this.default, option);
    };

    // 点击其他地方，关闭菜单
    $(document).click(function () {
        $("#url_list").hide();
    });
    $("#url_list,.fs-text").click(function (event) {
        event.stopPropagation();
    });

    $.selectOptionEl.prototype = {
        bingKeyUpEvents:    function(){
                                var ele = this;
                                // 绑定键盘事件
                                $(ele.options.input).keyup(function(e){
                                    var keyCode = e.keyCode?e.keyCode:8;
                                    // 查询输入的值
                                    var value = $(this).val();
                                    
                                    switch (keyCode) {
                                        case 8:
                                            if(value==""||value==null){
                                                $(ele.options.list).hide();
                                            }
                                            break;
                                        case 13:    // 回车
                                            $(ele.options.submit).click();
                                            return
                                            break;
                                        case 38:
                                            ele.moveSelectOption(-1);
                                            return
                                            break;  //上
                                        case 40:
                                            ele.moveSelectOption(1);
                                            return
                                            break; //下
                                        default:;
                                    }
                                    // Code是不为空的数字时，进行查询
                                    if(value!=""&&value!=null){
                                        // 连续按键会清除查询
                                        clearTimeout(ele.options.timer);
                                        // 延时查询
                                        ele.options.timer = setTimeout(function(){
                                            var url = wsUrlCodes+"/GetCodes?ExchangeID=0&Codes="+value;
                                            $.ajax({
                                                url:  url,
                                                type: 'GET',
                                                dataType: 'json',
                                                async:false,
                                                cache:false,
                                                error: function(data){
                                                    console.log("请求代码表出错");
                                                },
                                                success: function(data){
                                                    indexLi = 0;
                                                    var dataArr = data.CodeInfo;
                                                    if(dataArr){
                                                        ele.setSearchUlOptions(dataArr,value);
                                                        $(ele.options.list).show();
                                                    }else{
                                                        $(ele.options.list).hide();
                                                    }
                                                }
                                            });
                                        },300);
                                    }else{
                                        // 连续按键会清除查询
                                        clearTimeout(ele.options.timer);
                                    }
                                    
                                });
                            },
        bindClose:  function () {
                        var ele = this;
                        // 点击其他地方，关闭菜单
                        $(document).click(function () {
                            $(ele.options.list).hide();
                        });
                        $(ele.options.list + "," + ele.options.input).click(function (event) {
                            event.stopPropagation();
                        });
                    },
        bindSubmit:     function () {
                            var ele = this;
                            // 点击搜索按钮
                            $(ele.options.submit).click(function () {
                                if ($(ele.options.list).children("li").length > 0) {
                                    ele.queryNew($(ele.options.list).children(".active")[0]);
                                }
                            });

                        },
        // 点击搜索框会出现
        bindFocus:      function () {
                            var ele = this;
                            $(ele.options.input).focus(function () {
                                $(ele.options.input).keyup();
                            });
                        },
        // 键盘上下键响应事件
        moveSelectOption:   function (direct) {
                                indexLi += direct;
                                if (direct == -1) {
                                    if (indexLi < 0) {
                                        indexLi = $("#url_list li").length - 1;
                                    }
                                } else {
                                    if (indexLi > $("#url_list li").length - 1) {
                                        indexLi = 0;
                                    }
                                }
                                $(this.options.list).children("li").eq(indexLi).addClass("active").
                                    siblings().removeClass("active");
                                $(this.options.list).scrollTop(46 * (indexLi > 0 ? (indexLi - 3) : 0));
                            },
        // 拼接查询到的接口数据
        setSearchUlOptions: function (data, value) {
                                var ele = this;
                                var html = "";
                                $.each(data, function (i, dataObj) {
                                    var spanName = "<span>" + dataObj.InstrumentName + "</span>",
                                        spanCode = "<span>" + dataObj.InstrumentCode + "</span>";
                                    // 是否有值，如果没有输入值，不进行匹配
                                    if (eval("/" + value + "/").test(spanName) || eval("/" + value + "/").test(spanCode)) {
                                        spanName = spanName.replace(eval("/" + value + "/"), "<i>" + value + "</i>");
                                        spanCode = spanCode.replace(eval("/" + value + "/"), "<i>" + value + "</i>");
                                    };
                                    html += "<li eId=" + dataObj.ExchangeID + ">" + spanName + spanCode + "</li>";
                                });
                                $(ele.options.list).html(html);
                                if ($(ele.options.list).children("li").length > 0) $(ele.options.list).children("li:eq(0)").addClass("active");
                                // 点击选择了某个选项后 更新输入框内容 打开新页面查询新数据
                                $(ele.options.list).children("li").click(function () {
                                    ele.queryNew(this);
                                });
                            },
        queryNew:       function (eleLi) {
                            var ele = this;
                            var exchangeID = $(eleLi).attr("eid");
                            var id = Number($(eleLi).children("span:eq(1)").text());
                            $(ele.options.input).val($(eleLi).children("span:eq(1)").text());
                            $(ele.options.list).hide();
                            // 打开新页面
                            var location = window.location.href.split("?")[0];
                            window.location.href = location + "?id=" + id + "&exchangeID=" + exchangeID;
                        }

    };
})(jQuery);

;(function($){
    // websocket通道-查询K线
    $.queryKLine = function(option) {
        
        // 实例化websocket默认参数 
        KLineSocket = new WebSocketConnect(option);
        // 建立websocket连接，命名为ws
        KLineSocket.ws = KLineSocket.createWebSocket();
        // 发起websocket请求
        initSocketEvent(KLineSocket);
                                 
        // 点击查询周期K线
        $("#tab li").on("click",function(){

            var _this = this;
            $("#withoutData").html("<img src='../img/loading.gif' class='loading'/>");

            // 点击的K线类型
            var klineType = $(_this).attr("id");

            // 判断当前查询的是否是上一次查询的类型
            if(KLineSocket.option){
                if(KLineSocket.HistoryData.preLineType == klineType){
                    return;
                }
            }

            // 创建新的查询对象参数-存储的都是实时改变的参数
            var KLrequireObj = new KLineRequire(option, klineType);
            // 把请求参数赋值给已经开启的websocket参数
            KLineSocket.option = $.extend({},KLineSocket.option,KLrequireObj.options);
            // 显示没有数据
            $("#withoutData").show().siblings().hide();
            
            clearTimeout(clickTimer);
            clickTimer = setTimeout(function(){
                // 清空K线图
                if(KLineSocket.KChart.getOption()&&KLineSocket.KChart.getOption().series.length!=0){
                    KLineSocket.KChart.dispose();
                    KLineSocket.KChart = echarts.init(document.getElementById('f_kline_charts'));
                }

                // 取消之前的订阅,同时清空历史数据数组
                if(KLineSocket.HistoryData.preLineType!=undefined&&KLineSocket.HistoryData.preLineType!=""){
                    KLineSocket.getKWatchCC();
                  

                    // 清空数据，设置假数据
                    $.each(KLineSocket.HistoryData,function(i,obj){
                        if(typeof KLineSocket.HistoryData[i] == "string"){
                            KLineSocket.HistoryData[i] = "";
                        }
                        if(obj instanceof Array){
                            KLineSocket.HistoryData[i] = [];
                        }
                        if(typeof KLineSocket.HistoryData[i] == "number"){
                            KLineSocket.HistoryData[i] = 0;
                        }
                        if(typeof KLineSocket.HistoryData[i] == "boolean"){
                            KLineSocket.HistoryData[i] = 0;
                        }
                    });
                }



                KLineSocket.HistoryData.queryTimes = 0;


                // 查询市场状态
                KLineSocket.getKMarketStatus();

                // 当前K线存储为前一根K线
                KLineSocket.HistoryData.preLineType = KLineSocket.option.lineType;     

                // K线前一根柱子的收盘价
                KLineSocket.option.lastClose = 0; 
            },300);
            
                
        });
    };

})(jQuery);
function tabLi(index){
    if(index==0){
        $("#MLine").show();
        $("#kline").hide();
    }else{
        $("#kline").show();
        $("#MLine").hide();
    }
}

/*
 * websocket
 */
// K线请求数据参数
var KLineRequire = function(option, klineType){
    var ExchangeID = option.ExchangeID?option.ExchangeID:"1",
        InstrumentID = option.InstrumentID?option.InstrumentID:"1",
        msgType = null,
        instrumenttype = null;
    // 对象默认请求参数
    this.options = {
        lineType: klineType?klineType:null,
        lastClose: 0,
        // 市场状态查询

        // 查询历史数据
        // 日、周、月、年-最后199条-为了索引为整百的数据
        HistoryKQFirstDayPrev: {         
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            MsgType: "",  
            StartIndex: "-1", 
            StartDate: "0", 
            Count: "199" 
        },
        // 日、周、月、年-从第二次开始每次请求200条,StartIndex为整百，
        // 在每次查询到历史数据的时候进行扩展后再次进行查询
        HistoryKQAllDayPrev:{
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            MsgType: "",  
            StartIndex: "", 
            StartDate: "0", 
            Count: "200"
        },
        // 分钟周期K线，当前这一天的K线查询
        // 当date<0时,不管其他查询条件是否设置,表示查询当前交易日截至查询时间所有数据
        // 当date>0时,不管其他查询条件,表示查询指定date为交易日的所有数据,可能是历史交易日数据也可能是当前交易日数据,依据date的值
        // 当date=0时,依据index与count进行查询,查询的是历史交易日数据,index<0时,表示从后向前查询,查询的位置由index决定,条数由count决定,
        // 其中-1表示倒数第一条开始,-2表示倒数第二条开始; index>=0时,表示从前向后查询,查询的位置也由index决定,
        // 条数由count决定,其中0表示正数第一条,1表示正数第二条[分钟线类查询条件变更说明]
        HistoryKQAllMinToday: {         
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            MsgType: "",  
            StartIndex: "0", 
            StartDate: "-1", 
            StartTime: "0",
            Count: "242" 
        },
        // 分钟K线历史记录查询，从昨天开始的交易数据，
        // 第一次查询199条-为了索引为整百的数据
        HistoryKQFirstMinPrev: {         
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            MsgType: "",  
            StartIndex: "-1", 
            StartDate: "0", 
            StartTime: "0",
            Count: "199" 
        },
        // 分钟K线历史记录查询，从昨天开始的交易数据，
        // 从第二次开始每次请求200条,StartIndex为整百，
        // 在每次查询到历史数据的时候进行扩展后再次进行查询
        HistoryKQAllMinPrev:{
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            MsgType: "",  
            StartIndex: "", 
            StartDate: "0", 
            StartTime: "0",
            Count: "200"
        },
        // 订阅
        KWatch: {                
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            MsgType:"S1010",
            Instrumenttype:""
        },
        // 取消订阅
        KWatchCC: {              
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            MsgType:"N1010",
            Instrumenttype:""
        },
        KMarketStatus:{
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            MsgType:"Q8002",
            PructType:"0"
        }
    };

    var objKWatch = getQueryType(klineType);
    // 确定订阅类型
    this.options.KWatch = $.extend({}, this.options.KWatch, { Instrumenttype: objKWatch.Instrumenttype });


    // 更新查询历史数据参数-日周月年
    this.options.HistoryKQFirstDayPrev = $.extend({}, this.options.HistoryKQFirstDayPrev, { MsgType: objKWatch.MsgType});
    this.options.HistoryKQAllDayPrev = $.extend({}, this.options.HistoryKQAllDayPrev, { MsgType: objKWatch.MsgType});
        
    // 更新查询历史数据参数-分钟
    this.options.HistoryKQAllMinToday = $.extend({}, this.options.HistoryKQAllMinToday, { MsgType: objKWatch.MsgType }); 
    this.options.HistoryKQFirstMinPrev = $.extend({}, this.options.HistoryKQFirstMinPrev, { MsgType: objKWatch.MsgType }); 
    this.options.HistoryKQAllMinPrev = $.extend({}, this.options.HistoryKQAllMinPrev, { MsgType: objKWatch.MsgType});

    // 上一次查询的K线类型-用于取消订阅
    if(KLineSocket.HistoryData.preLineType!=undefined){
        var objKWatchCC = getQueryType(KLineSocket.HistoryData.preLineType);
        this.options.KWatchCC = $.extend({}, this.options.KWatchCC, { Instrumenttype: objKWatchCC.Instrumenttype });
    }
};
function getQueryType(klineType){
    var typeObj = {
        MsgType: null,
        Instrumenttype: null,
        // 10-1分钟；11-5分钟；12-10分钟；13-15分钟；14-30分钟；15-60分钟；30-日线；31-周线；32-月线；33-季线；34-年线
        Period:null
    }
    switch(klineType){
        case "day":
            typeObj = {         // 日K线：Q3021
                MsgType: "Q3021",
                Instrumenttype: "1",
                Period:"30",
            }
            break;
        case "week":
            typeObj = {         // 周K线：Q3022
                MsgType: "Q3022",
                Instrumenttype: "1",
                Period:"31",
            }
            break;
        case "month":
            typeObj = {         // 月K线：Q3023
                MsgType: "Q3023",
                Instrumenttype: "1",
                Period:"32",
            }
            break;
        case "year":
            typeObj = {         // 年K线：Q3025
                MsgType: "Q3025",
                Instrumenttype: "1",
                Period:"34",
            }
            break;
        case "minute":
            typeObj = {         // 1分钟K线：Q3011
                MsgType: "Q3011",
                Instrumenttype: "11",
                Period:"10",
            }
            break;
        case "fivem":
            typeObj = {         // 5分钟K线：Q3012
                MsgType: "Q3012",
                Instrumenttype: "12",
                Period:"11",
            }
            break;
        case "tenm":          
            typeObj = {         // 10分钟K线：Q3013
                MsgType: "Q3013",
                Instrumenttype: "13",
                Period:"12",
            }
            break;
        case "fifm":
            typeObj = {         // 15分钟K线：Q3014
                MsgType: "Q3014",
                Instrumenttype: "14",
                Period:"13",
            }
            break;
        case "thim":
            typeObj = {         // 30分钟K线：Q3015
                MsgType: "Q3015",
                Instrumenttype: "15",
                Period:"14",
            }
            break;
        case "hour":       
            typeObj = {         // 60分钟K线：Q3016
                MsgType: "Q3016",
                Instrumenttype: "16",
                Period:"15",
            }
            break;
        default:;
    };

    return typeObj;
}
// websocket实例化相关参数以及数据存储参数
var WebSocketConnect = function(options){
    this.wsUrl = options.wsUrl;
    this.stockXMlUrl = options.stockXMlUrl;
    this.ws = null;
    this.lockReconnect = false;
    this.timeout = 60000;       //60秒
    this.timeoutObj = null;
    this.serverTimeoutObj = null;
    this.KChart = echarts.init(document.getElementById('f_kline_charts'));
    // 心跳包
    this.HeartSend = {          
        InstrumentID: options.InstrumentID,
        ExchangeID: options.ExchangeID,
        MsgType: "Q8050"
    };
    this.HistoryData = {
        hTime: 0,                   // 如果为日K线，存储最后一条时间
        hCategoryList: [],          // 横轴
        hValuesList: [],            // 值-开收低高
        hValuesPercentList: [],     // 值-对应的百分比
        hVolumesList: [],           // 成交量
        hZValuesList: [],           // 涨幅
        hZValuesListPercent: [],    // 涨幅百分比
        hZf: [],                    // 振幅
        hZfList: [],                // 振幅百分比
        preLineType: null,          // 前一次查询的线类型
        queryTimes:0,               // 查询数据次数
        dataLengthToday:0,          // 分钟K线查询当天的
        dataLength: 0,              // 查询的历史数据参数            
        stopQuery: null,            // 是否已经停止查询历史数据
        watchDataCount:0,           // 目前已经累计的订阅数量
        CountNum: 0,                // hour类型需要，计算前几根相同的根数，然后通过index判断计算出坐标轴日期的间隔
        hasHistory: null,           // 是否有历史数据
    };
    
    this.KLineSet = {
        mouseHoverPoint: 0,         // 当前现实的数据索引
        isHoverGraph: false,        // 是否正在被hover
        zoom: 10,
        start: 0,
        dataZoomTimer: null,
    };
    // 数据查询参数
    this.option = {
        KWatchKZ: {
            InstrumentID: options.InstrumentID,
            ExchangeID: options.ExchangeID,
            MsgType:"S1010",
            Instrumenttype:"1"
        },
        lineType: "mline"
    };
};
WebSocketConnect.prototype = {
    createWebSocket:    function () {
                            try {
                                this.ws = new WebSocket(this.wsUrl);
                                return this.ws;
                            } catch (e) {
                                this.reconnect(); //如果失败重连
                            }
                        },
    reconnect:  function () {
                    var _target = this;
                    if (_target.lockReconnect) return;
                    _target.lockReconnect = true;
                    reconnectWS = true;
                    // 重连后，重新设置查询条件
                    KLineSocket.HistoryData.queryTimes = 0;
                
                    KLineSocket.option.HistoryKQAllDayPrev = $.extend({},KLineSocket.option.HistoryKQAllDayPrev,{Count: "200"});
                    KLineSocket.option.HistoryKQAllMinPrev = $.extend({},KLineSocket.option.HistoryKQAllMinPrev,{Count: "200"});
                    //没连接上会一直重连，设置延迟避免请求过多
                    setTimeout(function () {
                        var ws = _target.createWebSocket(_target.wsUrl);
                        _target.ws = _target.createWebSocket(_target.wsUrl);

                        initSocketEvent(_target);

                        _target.lockReconnect = false;
                        console.log("重连中……");
                    }, 2000);
                },
    //发送请求
    request:    function (data) {
                    this.ws.send(JSON.stringify(data));
                },
    //重置心跳包
    reset:      function () {
                    clearTimeout(this.timeoutObj);
                    clearTimeout(this.serverTimeoutObj);
                    return this;
                },
    //开始心跳包
    start:      function () {
                    var self = this;
                    this.timeoutObj = setTimeout(function () {
                        //这里发送一个心跳，后端收到后，返回一个心跳消息，
                        // onmessage拿到返回的心跳就说明连接正常
                        self.getHeartSend();
                        self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
                            self.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
                        }, self.timeout)
                    }, self.timeout)
                }
};
WebSocketConnect.prototype.__proto__ = {
    // 查询历史数据
    // 日、周、月、年-最后199条-为了索引为整百的数据
    getHistoryKQFirstDayPrev: function(){
                            this.request(this.option.HistoryKQFirstDayPrev);
                        },
    // 日、周、月、年-从第二次开始每次请求200条,StartIndex为整百，
    // 在每次查询到历史数据的时候进行扩展后再次进行查询
    getHistoryKQAllDayPrev: function(){
                            this.request(this.option.HistoryKQAllDayPrev);
                        },
    // 分钟周期K线，当前这一天的K线查询
    getHistoryKQAllMinToday: function(){
                            this.request(this.option.HistoryKQAllMinToday);
                        },
    // 分钟K线历史记录查询，从昨天开始的交易数据
    getHistoryKQFirstMinPrev: function(){
                            this.request(this.option.HistoryKQFirstMinPrev);
                        },
    // 在每次查询到历史数据的时候进行扩展后再次进行查询
    getHistoryKQAllMinPrev: function(){
                            this.request(this.option.HistoryKQAllMinPrev);
                        },
    // 订阅K线
    getKWatch:          function(){
                            this.request(this.option.KWatch);
                        },
    // 取消订阅K线
    getKWatchCC:        function(){
                            this.request(this.option.KWatchCC);
                        },
                        
   
    getHeartSend:       function(){
                            this.request(this.HeartSend);
                        },
    
    //市场状态查询
    getKMarketStatus: function(){
                            this.request(this.option.KMarketStatus);
                        }
};
// websocket请求
var initSocketEvent = function(socket){

    socket.ws.onclose = function () {
                    console.log("终端重连……");
                    socket.reconnect(); //终端重连
                };
    socket.ws.onerror = function () {
                    console.log("报错重连……");
                    socket.reconnect(); //报错重连
                };
    socket.ws.onopen = function () {
                    console.log("open");
                    
                    //心跳检测重置
                    socket.reset().start();                 // 第一次建立连接则启动心跳包

                    // socket.option.lineType-区分查询历史数据和指数/个股信息
                    if(KLineSocket.option.lineType&&KLineSocket.option.lineType=="mline"){
                        return
                    }

                };
    socket.ws.onmessage = function (evt) {
                    
                    // console.log("打开成功");
                    var jsons  = evt.data.split("|");  //每个json包结束都带有一个| 所以分割最后一个为空
                    $.each(jsons,function (i,o) {
                        if(o!==""){
                            try{
                                var data = eval("(" + o + ")");
                            }catch(e){
                                console.warn(e,"返回数据格式错误");
                                console.log(data);
                                return;
                            }
                            if(!KLineSocket.option.KWatch){
                                return
                            }


                            var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
                            if(MsgType=="R8002"||MsgType=="P8002"){
                                if(data["InstrumentID"] || data[0]&&data[0]["InstrumentID"]){
                                    // 通过匹配InstrumentID和ExchangeID，对不是当前查询的股票的信息，进行截流
                                    var MsgInstrumentID = data["InstrumentID"] || data[0]["InstrumentID"];
                                    var instrumentID = Number(KLineSocket.option.KWatch.InstrumentID);
                                    if(!(instrumentID==MsgInstrumentID)){
                                        return;
                                    }
                                }
                                // 通过匹配InstrumentID和ExchangeID，对不是当前查询的股票的信息，进行截流
                                var MsgExchangeID = data["ExchangeID"] || data[0]["ExchangeID"];
                                var exchangeID = Number(KLineSocket.option.KWatch.ExchangeID);
                                if(!(exchangeID==MsgExchangeID)){
                                    return;
                                }
                            }else{
                                // 通过匹配InstrumentID和ExchangeID，对不是当前查询的股票的信息，进行截流
                                var MsgInstrumentID = data["InstrumentID"] || data[0]["InstrumentID"];
                                var MsgExchangeID = data["ExchangeID"] || data[0]["ExchangeID"];
                                var exchangeID = Number(KLineSocket.option.KWatch.ExchangeID);
                                var instrumentID = Number(KLineSocket.option.KWatch.InstrumentID);
                                if(!(exchangeID==MsgExchangeID&&instrumentID==MsgInstrumentID)){
                                    return;
                                }
                            }
                            var dataList = data.KLineSeriesInfo?data.KLineSeriesInfo:new Array(data);
                            // var MsgInstrumentID = data["InstrumentID"] || data[0]["InstrumentID"];
                            // var MsgExchangeID = data["ExchangeID"] || data[0]["ExchangeID"];
                            var ErrorCode = data["ErrorCode"]?data["ErrorCode"]:null;
                            
                            // var exchangeID = Number(KLineSocket.option.KWatch.ExchangeID);
                            // var instrumentID = Number(KLineSocket.option.KWatch.InstrumentID);
                            // if(!(exchangeID==MsgExchangeID&&instrumentID==MsgInstrumentID)){
                            //     return;
                            // }

                             // 开始查询历史数据
                            if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
                                if(MsgType!="R8002"&&ErrorCode){
                                    console.info(data["Content"]);
                                    $("#withoutData").html("抱歉，暂时没有数据，请稍后再试……")
                                    return;
                                }
                            }else{
                                
                                
                                if(MsgType!="R8002"&&ErrorCode){
                                    if(KLineSocket.HistoryData.queryTimes==0){
                                        
                                        if(KLineSocket.option.lineType=="hour"&&KLineSocket.HistoryData.hCategoryList.length!=0){
                                            var str = KLineSocket.HistoryData.hCategoryList[0].split(" ")[0];
                                            var arr = KLineSocket.HistoryData.hCategoryList.slice(0,4);
                                            
                                            $.each(arr,function(i,o){
                                                if(o.split(" ")[0]==str){
                                                    KLineSocket.HistoryData.CountNum++;
                                                }
                                            })
                                        }
                                        console.info("今天还没有开盘。");
                                        KLineSocket.HistoryData.queryTimes++;
                                        KLineSocket.getHistoryKQFirstMinPrev();
                                        return;
                                        
                                    }
                                    // 如果上交易日
                                    if(KLineSocket.HistoryData.queryTimes==1&&KLineSocket.HistoryData.dataLengthToday!=0){
                                        chartPaint("isHistory");
                                        return;
                                    }
                                    console.info(data["Content"]);
                                    $("#withoutData").html("抱歉，暂时没有数据，请稍后再试……");
                                    return;
                                }
                            }


                            /*
                             * 个股/指数 实时数据，通过快照接口
                             * 其他数据，处理方式不同
                             */
                            // socket.option.lineType-区分查询历史数据和指数/个股信息
                            switch(MsgType){
                                case "P0001":       // 订阅日K线
                                    // K线接口
                                    // var msgTypeNow = getQueryType(KLineSocket.option.lineType);
                                    // if( !msgTypeNow.MsgType||MsgType.slice(1) != msgTypeNow.MsgType.slice(1)||dataList[0].Date==0){
                                    //     return;
                                    // }
                                    KCharts(dataList);
                                    break;
                                case "P0011":        // 1分钟K线订阅分钟线应答
                                case "P0012":        // 5分钟K线订阅分钟线应答
                                case "P0013":        // 10分钟K线订阅分钟线应答
                                case "P0014":        // 15分钟K线订阅分钟线应答
                                case "P0015":        // 30分钟K线订阅分钟线应答
                                case "P0016":        // 60分钟K线订阅分钟线应答
                                    var msgTypeNow = getQueryType(KLineSocket.option.lineType);
                                    if( Number(msgTypeNow.Instrumenttype) != Number(MsgType.slice(1))||dataList[0].Date==0){
                                        return;
                                    }
                                    if(dataList[0].Date==0){
                                        return;
                                    }
                                    KCharts(dataList);
                                    break;
                                case "R3011":        // 1分钟K线历史数据查询
                                case "R3012":        // 5分钟K线历史数据查询
                                case "R3013":        // 10分钟K线历史数据查询
                                case "R3014":        // 15分钟K线历史数据查询
                                case "R3015":        // 30分钟K线历史数据查询
                                case "R3016":        // 60分钟K线历史数据查询
                                    // socket.getKWatch();      // 订阅当前日期K线=分钟K线
                                    // KCharts(dataList, "history");
                                    // break;
                                case "R3021":        // 日K线历史数据查询
                                case "R3022":        // 周K线历史数据查询
                                case "R3023":        // 月K线历史数据查询
                                case "R3025":        // 年K线历史数据查询
                                    if(reconnectWS){
                                        // 清空数据，设置假数据
                                        $.each(KLineSocket.HistoryData,function(i,obj){
                                            if(typeof KLineSocket.HistoryData[i] == "string"){
                                                KLineSocket.HistoryData[i] = "";
                                            }
                                            if(obj instanceof Array){
                                                KLineSocket.HistoryData[i] = [];
                                            }
                                            if(typeof KLineSocket.HistoryData[i] == "number"){
                                                KLineSocket.HistoryData[i] = 0;
                                            }
                                            if(typeof KLineSocket.HistoryData[i] == "boolean"){
                                                KLineSocket.HistoryData[i] = 0;
                                            }
                                        });
                                        reconnectWS = false;
                                    }
                                    // 周期K线查询和结果中只是对应的标识不一样 P和R开头
                                    var msgTypeNow = getQueryType(KLineSocket.option.lineType);
                                    if( msgTypeNow.MsgType&&(MsgType.slice(1) != msgTypeNow.MsgType.slice(1))){
                                        return;
                                    }
                                    var notDay = !(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year");
                                    if(notDay&&KLineSocket.HistoryData.dataLengthToday==0&&KLineSocket.HistoryData.queryTimes==1||KLineSocket.HistoryData.queryTimes==0){
                                        $.each(KLineSocket.HistoryData,function(i,obj){
                                            if(obj instanceof Array){

                                                KLineSocket.HistoryData.dataLength = data.KLineCount>=720?720:data.KLineCount;
                                                KLineSocket.HistoryData[i] = new Array(KLineSocket.HistoryData.dataLength);
                                                
                                                if(i == "hCategoryList"){
                                                    $.each(KLineSocket.HistoryData.hCategoryList,function(i,o){
                                                        KLineSocket.HistoryData.hCategoryList[i] = "1997-1-1 一 9:30";          // 横轴
                                                    });
                                                }
                                                if(i == "hValuesList"){
                                                    
                                                    $.each(KLineSocket.HistoryData.hCategoryList,function(i,o){
                                                        KLineSocket.HistoryData.hValuesList[i] = [null,null,null,null];           // 值-开收低高
                                                    });
                                                }
                                                if(i == "hVolumesList"){
                                                    
                                                    $.each(KLineSocket.HistoryData.hCategoryList,function(i,o){
                                                        KLineSocket.HistoryData.hVolumesList[i] = [i,0,1];           // 值-开收低高
                                                    });
                                                }
                                            }
                                        });

                                        // if(!(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year")){
                                            socket.getKWatch();      // 订阅当前日期K线+分钟K线
                                            // var indexObj = getQueryType(KLineSocket.option.lineType);
                                            
                                        // }
                                        
                                    }
                                    
                                    KCharts(dataList, "history");
                                    break;    
                                case "R8050":  //心跳包
                                    // console.log(data);
                                    break;
                                case 'R8002':
                                        var MarketStatus = data.MarketStatus;
                                        /*
                                         * 个股/指数 实时数据，通过快照接口
                                         * 其他数据，处理方式不同
                                         */
                                        switch(KLineSocket.option.lineType){
                                            case "day":
                                            case "week":
                                            case "month":
                                            case "year":
                                                KLineSocket.getHistoryKQFirstDayPrev();
                                                break;
                                            case "minute":
                                            case "fivem":
                                            case "tenm":
                                            case "fifm":
                                            case "thim":
                                            case "hour":
                                                // if(MarketStatus==2||MarketStatus==4){
                                                    KLineSocket.getHistoryKQAllMinToday();
                                                // }else{
                                                //     KLineSocket.getHistoryKQFirstMinPrev();
                                                //     KLineSocket.HistoryData.queryTimes = 1;
                                                // }
                                                
                                                break;
                                            default:;
                                        };
                                default:
                            }
                        }
                    });
                    //如果获取到消息，心跳检测重置
                    //拿到任何消息都说明当前连接是正常的
                    socket.reset().start();
                };
};

/*
 * 绘制KCharts图相关函数
 */
// K线图方法
function KCharts(dataList, isHistory){
    if(dataList){
        // 解析数据
        var dataJsons = splitData(dataList, isHistory); 
        // 存储数据
        saveData(dataJsons, isHistory);
        // 画图
        chartPaint(isHistory);
        // 设置单位的值
        chartResize();  
        // 初始化并显示数据栏和数据信息框的信息
        initMarketTool();
        
        /*
         * K线图事件绑定
         */
        KLineSocket.KChart.on('showTip', function (params) {
            
            KLineSocket.KLineSet.mouseHoverPoint = params.dataIndex;
            var length = KLineSocket.HistoryData.hCategoryList.length;
            setToolInfo(length, 'showTip');
        });
        $("body").mousemove();
        // // 鼠标滑过，出现信息框
        $("#f_kline_charts").bind("mouseenter", function (event) {
            toolContentPosition(event);
            $("#kline_tooltip").show();
            _this = $("#kline");
        });
        $("#f_kline_charts").bind("mousemove", function (event) {
            KLineSocket.KLineSet.isHoverGraph = true;
            $("#kline_tooltip").show();
            toolContentPosition(event);

            _this = $("#kline");
        });
        $("#f_kline_charts").bind("mouseout", function (event) {
            KLineSocket.KLineSet.isHoverGraph = false;
            $("#kline_tooltip").hide();
            KLineSocket.KLineSet.mouseHoverPoint = 0;
            initMarketTool();// 显示信息
            $(_this).children(".charts-focus").blur();
            _this = window;
        });

    }
};
// 解析获取到的数据
function splitData(data, isHistory) {
    let k_time = [],                        // 时间
        k_categoryData = [],                // x轴分割线坐标数组
        k_values = [],                      // 二维数组：开收低高-四个数值的数组-蜡烛图
        k_valuesPercent = [],               // 二维数组：开收低高-四个百分比值-相对昨收
        k_zValues = [],                     // 涨幅-数值
        k_zValuesPercent = [],              // 涨幅-百分比
        k_volumns = [],                     // 柱形图数据-成交量
        k_amplitude = [],                   // 振幅-K线最高减去最低的值        
        k_amplPercent = [],                 // 振幅百分比-相对昨收
        week = ["日","一","二","三","四","五","六"],
        data_length = 0;

    // 遍历json，将它们push进不同的数组
    $.each(data,function(i,object){
        let e_date = formatDateSplit(object.Date),                 // 当天日期
            e_day = week[(new Date(e_date)).getDay()],        // 计算星期
            e_time;  

        if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
            KLineSocket.HistoryData.hTime = formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
            e_time = e_date + " " + e_day;
            k_categoryData.push(e_time);
        }else{
            e_time = e_date + " " + e_day + " " + formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
            k_categoryData.push(e_time);
        }  

        if(!KLineSocket.option.lastClose){
            KLineSocket.option.lastClose = object.Open;                          // 上一根柱子的收盘价
        }

        // 如果是最后一条数据的更新，lastClose就是前一根柱子的收盘价
        if(!isHistory){
            if(k_categoryData[0].toString() == KLineSocket.HistoryData.hCategoryList[KLineSocket.HistoryData.hCategoryList.length-1] && KLineSocket.HistoryData.hValuesList.length>1){
                KLineSocket.option.lastClose = KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-2][1];
            }else{
                KLineSocket.option.lastClose = KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1][1];
            }
        }
        
        var byDay = KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year";
        // 月周年订阅快照，在最后一条数据进行高低收和成交量的更新
        // 高低 进行历史数据的对比
        // 收实时更新
        // 成交量在历史数据基础上累加
        if(byDay&&(k_categoryData[0].toString() == KLineSocket.HistoryData.hCategoryList[KLineSocket.HistoryData.hCategoryList.length-1])){
            var e_open = KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1][1],          // 开
                e_highest = (object.High)>KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1][3]?(object.High):KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1][3],       // 高
                e_lowest = (object.Low)<KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1][2]?(object.High):KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1][2],         // 低
                e_price = ((KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year")&&(!isHistory))?(object.Last):(object.Price),           // 收盘价
                e_volumnData = myVolume[1]+object.Volume/100;                              // 成交量---单位：手
                // e_volumnData = myVolume[1]+object.Volume;                              // 成交量---单位：股
        }else{
            var e_open = (object.Open),          // 开
                e_highest = (object.High),       // 高
                e_lowest = (object.Low),         // 低
                e_price = ((KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year")&&(!isHistory))?(object.Last):(object.Price),           // 收盘价
                e_volumnData = object.Volume/100;                              // 成交量---单位：手  
                // e_volumnData = object.Volume;                              // 成交量---单位：股  
        }

        var e_value = [                                       // 开收低高-蜡烛图数据格式
                e_open, 
                e_price, 
                e_lowest, 
                e_highest
            ],
            e_valuePercent = [                                // 开收低高-百分比-相对上一根柱子的收盘价
                ((e_open-KLineSocket.option.lastClose)*100/KLineSocket.option.lastClose),
                ((e_price-KLineSocket.option.lastClose)*100/KLineSocket.option.lastClose),
                ((e_lowest-KLineSocket.option.lastClose)*100/KLineSocket.option.lastClose),
                ((e_highest-KLineSocket.option.lastClose)*100/KLineSocket.option.lastClose)
            ],
            
            e_zValues = KLineSocket.option.lastClose?(e_price-KLineSocket.option.lastClose):0,               // 涨幅-相对昨收      
            e_zValuesPercent = (e_zValues*100/KLineSocket.option.lastClose),              // 涨幅百分比
            e_amplitude = (e_highest - e_lowest),                      // 振幅
            e_amplPercent = (100*e_amplitude/KLineSocket.option.lastClose);               // 振幅百分比
        

        if(isHistory){
            if(e_price-e_open>0){
                e_volume = [i,e_volumnData,1];
            }else if(e_price-e_open<0){
                e_volume = [i,e_volumnData,-1];
            }else{
                if(e_price>KLineSocket.option.lastClose){
                    e_volume = [i,e_volumnData,1];
                }else if(e_price<KLineSocket.option.lastClose){
                    e_volume = [i,e_volumnData,-1];
                }else{
                    e_volume = [i,e_volumnData,0];
                }
            }
            // e_volume = (e_price-e_open)>0?[i,e_volumnData,-1]:((e_price-e_open)==0?[i,e_volumnData,0]:[i,e_volumnData,1]);   // 成交量-数组，存储索引，值，颜色对应的值                         
        }else{
            if(e_price-e_open>0){
                e_volume = [KLineSocket.HistoryData.hVolumesList.length,e_volumnData,1];
            }else if(e_price-e_open<0){
                e_volume = [KLineSocket.HistoryData.hVolumesList.length,e_volumnData,-1];
            }else{
                if(e_price>KLineSocket.option.lastClose){
                    e_volume = [KLineSocket.HistoryData.hVolumesList.length,e_volumnData,1];
                }else if(e_price<KLineSocket.option.lastClose){
                    e_volume = [KLineSocket.HistoryData.hVolumesList.length,e_volumnData,-1];
                }else{
                    e_volume = [KLineSocket.HistoryData.hVolumesList.length,e_volumnData,0];
                }
            }
            // e_volume = (e_price-e_open)>=0?[KLineSocket.HistoryData.hVolumesList.length,e_volumnData,-1]:[KLineSocket.HistoryData.hVolumesList.length,e_volumnData,1];  
        }

        KLineSocket.option.lastClose = e_price;

        // 每条数据存入数组中
        // k_date.push(e_date);                
        // k_day.push(e_day);   
        k_time.push(e_time);        
            
        k_values.push(e_value);             
        k_valuesPercent.push(e_valuePercent);
        k_volumns.push(e_volume);   
        k_zValues.push(e_zValues);
        k_zValuesPercent.push(e_zValuesPercent);
        k_amplitude.push(e_amplitude);
        k_amplPercent.push(e_amplPercent);
    });

    // 返回K线图所需数据对象
    return {
        // date: k_date,                       
        // day: k_day,                        
        categoryData: k_categoryData,       
        values: k_values,     
        valuesPercent: k_valuesPercent,              
        volumes: k_volumns,                 
        zValues: k_zValues,                 
        zValuePercent: k_zValuesPercent,
        amplitude: k_amplitude,
        amplPercent: k_amplPercent
    }
};
// 保存获取的数据到相对应的数据中，存入数据对象
function saveData(data, isHistory){
    if(isHistory){
        // 查询到的数据总长度
        var dataLength = data.categoryData.length;

        // 日、周、月、年的K线
        // 第一次查询历史数据，直接计算长度，总长度-数据长度=第一条历史数据索引值
        // 第二次以后减去每次200条，和第一次的199条即可
        if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
            if(KLineSocket.HistoryData.queryTimes==0){
                var index = KLineSocket.HistoryData.hCategoryList.length - dataLength;
            }else{
                var index = KLineSocket.HistoryData.hCategoryList.length -199 - KLineSocket.HistoryData.watchDataCount - 200*(KLineSocket.HistoryData.queryTimes - 1 ) - dataLength;
            }
        }else{
            // 分钟周期K线，第一次查询当日数据，直接计算长度，总长度-数据长度=第一条历史数据索引值
            // 第二次才开始查询历史数据-199条
            // 所以，在第三次以后，以后减去每次200条，和第二次的199条即可
            if(KLineSocket.HistoryData.queryTimes==0){
                var index = KLineSocket.HistoryData.hCategoryList.length -  dataLength;
                KLineSocket.HistoryData.dataLengthToday = dataLength;
            }else if(KLineSocket.HistoryData.queryTimes==1){
                var index = KLineSocket.HistoryData.hCategoryList.length - KLineSocket.HistoryData.dataLengthToday - dataLength - KLineSocket.HistoryData.watchDataCount;
            }else{
                var index = KLineSocket.HistoryData.hCategoryList.length - KLineSocket.HistoryData.dataLengthToday -199 - KLineSocket.HistoryData.watchDataCount - 200*(KLineSocket.HistoryData.queryTimes - 2 ) - dataLength;
            }
        }

        
        $.each(data.volumes,function(i,o){
            o[0] = o[0]+index;
        })
        
        // 将模拟的假数据进行拼接，重新赋值给历史数组
        // KLineSocket.HistoryData.hDate = KLineSocket.HistoryData.hDate.slice(0,index).concat(data.date,KLineSocket.HistoryData.hDate.slice(index+dataLength));
        // KLineSocket.HistoryData.hDay = KLineSocket.HistoryData.hDay.slice(0,index).concat(data.day,KLineSocket.HistoryData.hDay.slice(index+dataLength));
        KLineSocket.HistoryData.hCategoryList = KLineSocket.HistoryData.hCategoryList.slice(0,index).concat(data.categoryData,KLineSocket.HistoryData.hCategoryList.slice(index+dataLength));
        KLineSocket.HistoryData.hValuesList = KLineSocket.HistoryData.hValuesList.slice(0,index).concat(data.values,KLineSocket.HistoryData.hValuesList.slice(index+dataLength));
        KLineSocket.HistoryData.hValuesPercentList = KLineSocket.HistoryData.hValuesPercentList.slice(0,index).concat(data.valuesPercent,KLineSocket.HistoryData.hValuesPercentList.slice(index+dataLength));
        KLineSocket.HistoryData.hVolumesList = KLineSocket.HistoryData.hVolumesList.slice(0,index).concat(data.volumes,KLineSocket.HistoryData.hVolumesList.slice(index+dataLength));
        KLineSocket.HistoryData.hZValuesList = KLineSocket.HistoryData.hZValuesList.slice(0,index).concat(data.zValues,KLineSocket.HistoryData.hZValuesList.slice(index+dataLength));
        KLineSocket.HistoryData.hZValuesListPercent = KLineSocket.HistoryData.hZValuesListPercent.slice(0,index).concat(data.zValuePercent,KLineSocket.HistoryData.hZValuesListPercent.slice(index+dataLength));
        KLineSocket.HistoryData.hZf = KLineSocket.HistoryData.hZf.slice(0,index).concat(data.amplitude,KLineSocket.HistoryData.hZf.slice(index+dataLength));
        KLineSocket.HistoryData.hZfList = KLineSocket.HistoryData.hZfList.slice(0,index).concat(data.amplPercent,KLineSocket.HistoryData.hZfList.slice(index+dataLength));
        KLineSocket.HistoryData.hasHistory = "has data";
        myVolume = KLineSocket.HistoryData.hVolumesList[KLineSocket.HistoryData.hVolumesList.length-1];
    }else{
        var n_category = data.categoryData[0];  // 最后一分钟的时间
        var n_values = data.values[0];          // 要存储的values
        var n_zValues = data.zValues[0];        // 涨跌
        var n_zValuePercent = data.zValuePercent[0]; // 涨跌幅
        var n_volumes = data.volumes[0];            // 成交量
        var n_valuesPercent = data.valuesPercent[0];
        var n_zf = data.amplitude[0];
        var n_zfList = data.amplPercent[0];
        var lastTime = KLineSocket.HistoryData.hCategoryList[KLineSocket.HistoryData.hCategoryList.length-1];
        var last_open = KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1][0];
        var last_openPercent = KLineSocket.HistoryData.hValuesPercentList[KLineSocket.HistoryData.hValuesPercentList.length-1][0];
        
        // 停盘订阅的Price返回0，进行处理
        if(n_values[1]==0){
            return false;
        }
        // 最新一条是历史category数据中的最后一条，则更新最后一条数据,否则push到数组里面
        if(n_category.toString() == lastTime){

            n_volumes[0] = n_volumes[0]-1;

            KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1] = n_values;
            KLineSocket.HistoryData.hValuesPercentList[KLineSocket.HistoryData.hValuesPercentList.length-1] = n_valuesPercent;
            if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
                KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1][0] = last_open;
                KLineSocket.HistoryData.hValuesPercentList[KLineSocket.HistoryData.hValuesPercentList.length-1][0] = last_openPercent;
            }
            KLineSocket.HistoryData.hVolumesList[KLineSocket.HistoryData.hVolumesList.length-1] = n_volumes;
            KLineSocket.HistoryData.hZValuesList[KLineSocket.HistoryData.hZValuesList.length-1] = n_zValues;
            KLineSocket.HistoryData.hZValuesListPercent[KLineSocket.HistoryData.hZValuesListPercent.length-1] = n_zValuePercent;
            KLineSocket.HistoryData.hZf[KLineSocket.HistoryData.hZf.length-1] = n_zf;
            KLineSocket.HistoryData.hZfList[KLineSocket.HistoryData.hZfList.length-1] = n_zfList;
        }else if(n_category.toString() < lastTime){
            return;
        }else{
            if(!KLineSocket.HistoryData.hasHistory){
                return;
            }
            KLineSocket.HistoryData.watchDataCount++;
            KLineSocket.HistoryData.hCategoryList.push(n_category);
            KLineSocket.HistoryData.hValuesList.push(n_values);
            KLineSocket.HistoryData.hVolumesList.push(n_volumes); 
            KLineSocket.HistoryData.hZValuesList.push(n_zValues);
            KLineSocket.HistoryData.hZValuesListPercent.push(n_zValuePercent);
            KLineSocket.HistoryData.hValuesPercentList.push(n_valuesPercent);
            KLineSocket.HistoryData.hZf.push(n_zf);
            KLineSocket.HistoryData.hZfList.push(n_zfList);
        };
    }
};

// 绘制/画K线图
function chartPaint(isHistory){
    if(isHistory){

        // 第一次请求时，非分钟周期K线不进行绘制，第二次请求才开始绘制
        var dayFirstTime = KLineSocket.HistoryData.queryTimes==0&&(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year");
        var daySecondTime = KLineSocket.HistoryData.queryTimes==1&&(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year");
        
        var minutFirstTime = KLineSocket.HistoryData.queryTimes==0&&!(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year");
        var minutSecondTime = KLineSocket.HistoryData.queryTimes==1&&!(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year");
        
        if(minutFirstTime){  // 第一次查询分钟周期K线时，不绘制图形，而是继续历史数据查询，因为数据较少，避免闪屏
            KLineSocket.HistoryData.queryTimes++;
            KLineSocket.getHistoryKQFirstMinPrev();
            if(KLineSocket.option.lineType=="hour"){
                var str = KLineSocket.HistoryData.hCategoryList[0].split(" ")[0];
                var arr = KLineSocket.HistoryData.hCategoryList.slice(0,4);
                
                $.each(arr,function(i,o){
                    // console.log(o.split(" ")[0])
                    if(o.split(" ")[0]==str){
                        KLineSocket.HistoryData.CountNum++;
                    }
                })
            }
            if(KLineSocket.HistoryData.dataLengthToday!=0){
                return;
            }
          
            
        }else if(dayFirstTime||minutSecondTime){  // 如果是分钟周期K线第二次请求，和日期周期K线第一次请求后，便开始绘制图表
            // 绘制图形前，隐藏动图
            $("#withoutData").hide().siblings().show();
            // zoom起始的位置
            if(KLineSocket.HistoryData.hCategoryList.length<30){
                var startZoom = 0;
                var maxValueSpan=100;
                var minValueSpan=20;
            }else{
                var startZoom = (60/KLineSocket.HistoryData.dataLength>=1)?0:Math.ceil(100-80/(KLineSocket.HistoryData.dataLength+10)*100);
                var maxValueSpan=200;
                var minValueSpan=20;
            }

            // 绘制K线图
            KLineSocket.KChart.setOption(option = {
                backgroundColor: "#1e2131",
                animation: false,
                tooltip: {
                    trigger: 'axis',
                    showContent: true,
                    formatter:  function(params){
                                    var index = params[0].dataIndex;
                                    var timeList = KLineSocket.HistoryData.hCategoryList[index].split(" ");
                                    return  timeList[0].replace(/-/gi,"/")
                                            +" "+(timeList[2]?timeList[2]:"")
                                            +"<br><i>"+xml.options.stockName+" "+floatFixedDecimal(KLineSocket.HistoryData.hValuesList[index][1])+"</i>";
                                
                                },
                    position: function (pos, params, dom, rect, size) {
                                    var valueHigh = KLineSocket.HistoryData.hValuesList[params[0].dataIndex][3];
                                    var pixelHigh = KLineSocket.KChart.convertToPixel({yAxisIndex:0}, valueHigh );

                                    var valueClose = KLineSocket.HistoryData.hValuesList[params[0].dataIndex][1];
                                    var pixelClose = KLineSocket.KChart.convertToPixel({yAxisIndex:0}, valueClose );

                                    var valueLast = KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1][1];
                                    var pixelLast = KLineSocket.KChart.convertToPixel({xAxisIndex: 0}, KLineSocket.HistoryData.hCategoryList[KLineSocket.HistoryData.hValuesList.length-1] );

                                    var poxelPosTop = pixelHigh;
                                    if(poxelPosTop<200){
                                        poxelPosTop = pixelClose + 100;
                                    }
                                    var posLeft = pos[0] - 125;
                                    if(posLeft<30){
                                        posLeft = pos[0] + 30;
                                    }
                                    if(posLeft>pixelLast-170){
                                        posLeft = pixelLast - 290;
                                    }
                                    
                                    return [posLeft,poxelPosTop];
                              }
                },
                axisPointer: {
                    trigger: 'axis',
                    link: {xAxisIndex: 'all'},
                    label: {
                        textStyle: {
                            fontSize: 20
                        }
                    },
                    type: 'line',
                    lineStyle:{
                        type: 'dotted',
                        color: 'rgba(255,255,255,0.5)'
                    },
                    show:true,
                    triggerTooltip:false
                },
                grid: [
                    {
                        left: '10%',
                        right: 100,
                        top: "2%",
                        height: '86.3%'
                    },
                    {
                        left: '10%',
                        right: 100,
                        bottom: '11.7%',
                        height: '8%'
                    }
                ],
                dataZoom: [
                    {
                        show: true,
                        xAxisIndex: [0, 1],
                        type: 'slider',
                        top: '95%',
                        start: 98,
                        end: 100,
                        fillerColor: "rgba(43,46,61,0.55)",
                        // handleIcon: 'path://M306.1,413c0,2.2-1.8,4-4,4h-59.8c-2.2,0-4-1.8-4-4V200.8c0-2.2,1.8-4,4-4h59.8c2.2,0,4,1.8,4,4V413z,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
                        handleSize:'100%',
                        handleStyle:{
                            color:"#62646f",
                            borderColor: "#62646f"
                        },
                        borderColor: "#2d3142",
                        dataBackground: {
                            lineStyle: {
                                color: "rgba(255,255,255,0.5)",
                                width: 1
                            },
                            areaStyle: {
                                color: "rgba(0,0,0,0)"
                            }
                        },
                        maxValueSpan: maxValueSpan,
                        minValueSpan: minValueSpan,
                        // labelFormatter: function (valueStr) {
                        //     if(KLineSocket.option.lineType!="mline"){
                        //         var valueList = KLineSocket.HistoryData.hCategoryList[valueStr].split(" ");
                        //         return valueList[valueList.length-1];
                        //     }
                        //     // return KLineSocket.HistoryData.hCategoryList[valueStr];
                        // },
                        showDetail: false
                    },
                    {
                        type: 'inside',
                        xAxisIndex: [0, 1],
                        start: 98,
                        end: 100,
                        maxValueSpan: maxValueSpan,
                        minValueSpan: minValueSpan,
                        labelFormatter: function (valueStr) {
                            if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
                                if(KLineSocket.HistoryData.hCategoryList[valueStr]){
                                    var valueList = KLineSocket.HistoryData.hCategoryList[valueStr].split(" ");
                                    return valueList[0];
                                }
                            }else{
                                if(KLineSocket.HistoryData.hCategoryList[valueStr]){
                                    var valueList = KLineSocket.HistoryData.hCategoryList[valueStr].split(" ");
                                    return valueList[valueList.length-1];
                                }
                            }

                        },
                        showDetail: true
                    }
                ],
                visualMap: {
                    show: false,
                    seriesIndex: 1,
                    dimension: 2,
                    pieces: [
                        {   value: 1, 
                            color: '#44c96e'
                        },
                        {
                            value: -1,
                            color: "#c23a39"
                        }
                    ]
                },
                xAxis: [
                    {
                        type: 'category',
                        data: KLineSocket.HistoryData.hCategoryList,
                        scale: true,
                        boundaryGap: true,
                        axisTick:{ show:false },
                        axisLine: { show:false },
                        splitLine: {show: false},
                        axisLabel: {
                            show: false
                        },
                        axisPointer: {
                            show:true,
                            label: {
                                show:true,
                                formatter: function(params){
                                    return params.value.replace(/-/g,"/");
                                }
                            }
                        },
                        splitArea: { 
                            show: true, 
                            interval: 30,
                            areaStyle:{
                                color: ["rgba(255,255,255,0.01)","none"]
                            }
                        }
                    },
                    {
                        type: 'category',
                        gridIndex: 1,
                        data: KLineSocket.HistoryData.hCategoryList,
                        scale: true,
                        axisTick: { show:false },
                        boundaryGap: true,
                        axisLine: { show: false },
                        splitLine: { show: false },
                        splitArea: { 
                            show: true, 
                            interval: 30,
                            areaStyle:{
                                color: ["#212433","#1e2131"]
                            }
                        },
                        axisLabel: {
                            show: true,
                            label: {
                                show:true,
                                formatter: function(params){
                                    return params.value.replace(/-/g,"/");
                                }
                            },
                            color: '#999',
                            fontSize: 20,
                            // showMaxLabel: true,
                            // showMinLabel: true,
                            // formatter : function(value, index){
                            //     // 年-周-月-日 都是日期格式
                            //     var year,month,day,time;
                            //     var startTime = xml.options.nowDateTime[0].startTime;
                            //     switch(KLineSocket.option.lineType){
                            //         case "day":
                            //         case "week":
                            //             month = Number(value.split("-")[1]);
                            //             day = Number(value.split("-")[2]);
                            //             return month+"/"+day;
                            //             break;
                            //         case "month":
                            //             year = value.split("-")[0];
                            //             month = Number(value.split("-")[1]);
                            //             day = Number(value.split("-")[2]);
                            //             return year+"/"+month;
                            //             break;
                            //         case "year":
                            //             year = value.split("-")[0];
                            //             return year;
                            //             break;
                            //         case "minute":
                            //         case "fivem":
                            //         case "tenm":
                            //         case "fifm":
                            //             time = value.split(" ")[2];
                            //             return Number(time.split(":")[0])+":"+time.split(":")[1];
                            //             break;
                            //         case "thim":
                            //         case "hour":
                            //             year = value.split("-")[0];
                            //             month = Number(value.split("-")[1]);
                            //             day = Number(value.split(" ")[0].split("-")[2]);
                            //             return month+"/"+day;
                            //             break;
                            //         default:;
                            //     }
                            // }
                        },
                    }
                ],
                yAxis: [
                    {
                        scale: true,
                        splitNumber: 5,
                        splitArea: { show: false },
                        axisTick:{ show:true },
                        axisLine: { show: true },
                        splitLine: {
                            show: true,
                            lineStyle: {
                                color: '#34394a'
                            }
                        },
                        position: "right",
                        axisLabel: {
                            show: true,
                            color: '#999',
                            fontSize: 20,
                            formatter: function (value, index) {
                                updatePointLabel(value,index);
                                return (value).toFixed(decimal);
                            }
                        },
                        axisPointer: {
                            show:true,
                            label: {
                                show:true,
                                formatter: function(params){
                                    return params.value.toFixed(decimal);
                                }
                            },
                            snap: true,
                        }
                    },
                    {
                        type:'value',
                        scale: true,
                        gridIndex: 1,
                        min: 0,
                        position: "right",
                        axisTick:{ show:false },
                        axisLabel: { show: false },
                        axisLine: { show:false },
                        splitNumber: 0,
                        splitLine: { show:false },
                        axisPointer:{
                            show:false,
                        }
                    }
                ],
                series: [
                    {
                        name: 'Kline',
                        type: 'candlestick',
                        showSymbol: false,
                        hoverAnimation: false,
                        itemStyle: {
                            normal: {
                                color: '#c23a39',
                                color0: '#44c96e',
                                colorD: 'rgba(255,255,255,0.5)',
                                borderColor: '#c23a39',
                                borderColor0: '#44c96e',
                                borderColorD: 'rgba(255,255,255,0.5)'
                            }
                        },
                        barWidth: 8,
                        data: KLineSocket.HistoryData.hValuesList,
                    },
                    {
                        name: 'Volume',
                        type: 'bar',
                        xAxisIndex: 1,
                        yAxisIndex: 1,
                        data: KLineSocket.HistoryData.hVolumesList,
                        itemStyle: {
                            normal: {
                                opacity: 0.8,
                                borderColor: '#1e2131',
                                shadowColor: '#fff',
                                shadowBlur: 0
                            }
                        },
                        barWidth: 3,
                        z:999
                    }
                ]
            });
            /* 
             * 日期周期K线在进行查询时就已经是查询历史数据了，所以对应正常的查询次数queryTimes，queryTimes自增后更新            
             * 分钟周期K线的查询，第一次是当天的数据，而历史数据是从前一个交易日开始算的，在queryTimes查询数据次数更新前更新查询参数
             */
            // 更新分钟周期K线请求参数
            KLineSocket.option.HistoryKQAllMinPrev = $.extend({},KLineSocket.option.HistoryKQAllMinPrev,{StartIndex:"-"+KLineSocket.HistoryData.queryTimes*200});
            // 查询次数增加
            KLineSocket.HistoryData.queryTimes++;
            // 更新日期周期K线请求参数
            KLineSocket.option.HistoryKQAllDayPrev = $.extend({},KLineSocket.option.HistoryKQAllDayPrev,{StartIndex:"-"+KLineSocket.HistoryData.queryTimes*200});
            
            // 开始查询历史数据
            if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
                KLineSocket.getHistoryKQAllDayPrev();
            }else{
                KLineSocket.getHistoryKQAllMinPrev();
            }

            KLineSocket.KChart.on('dataZoom', function (params) {
                clearTimeout(KLineSocket.KLineSet.dataZoomTimer);
                // 放大缩小后的图表中的数目
                var paramsZoom = params.batch?params.batch[0]:params;
                var length = Math.round(( paramsZoom.end - paramsZoom.start )/100 * KLineSocket.HistoryData.hCategoryList.length);
                
                KLineSocket.KLineSet.dataZoomTimer = setTimeout(function(){
                    KLineSocket.KChart.setOption({
                        xAxis: [
                            {
                                data: KLineSocket.HistoryData.hCategoryList,
                            },
                            {
                                splitLine: {
                                    show: false
                                },
                                axisLabel: {
                                    show: true,
                                    showMaxLabel: true,
                                    showMinLabel: true,
                                    interval: function(index,value){
                                        var myval = setXAxisInterval(index,value,length);
                                        return myval; 
                                    },
                                    formatter : function(value, index){
                                        // 年-周-月-日 都是日期格式
                                        var valueList = KLineSocket.HistoryData.hCategoryList;
                                        var year,month,day,time;
                                        var startTime = xml.options.nowDateTime[0].startTime;
                                        switch(KLineSocket.option.lineType){
                                            case "day":
                                                year = Number(value.split("-")[0]);
                                                month = Number(value.split("-")[1]);
                                                day = Number(value.split("-")[2].split(" ")[0]);
                                                if(length<30){
                                                    // 显示周一
                                                    return month+"/"+day;
                                                }
                                                if(length>=30&&length<300){
                                                    
                                                    // 按照月份显示
                                                    return year+"/"+month;
                                                }
                                                if(length>=300){
                                                    // 按照年显示
                                                    return year;
                                                }
                                            case "week":
                                                year = Number(value.split("-")[0]);
                                                month = Number(value.split("-")[1]);
                                                day = Number(value.split("-")[2].split(" ")[0]);
                                                if(length<30){
                                                    // 显示周一
                                                    return month+"/"+day;
                                                }
                                                if(length>=30&&length<300){
                                                    
                                                    // 按照月份显示
                                                    return year+"/"+month;
                                                }
                                                if(length>=300){
                                                    // 按照年显示
                                                    return year;
                                                }
                                                break;
                                            case "month":
                                                year = value.split("-")[0];
                                                month = Number(value.split("-")[1]);
                                                day = Number(value.split("-")[2]);
                                                if(length<30){
                                                    return year+"/"+month;
                                                }
                                                if(length>=30){
                                                    return year;
                                                }
                                                
                                                break;
                                            case "year":
                                                year = value.split("-")[0];
                                                return year;
                                                break;
                                            case "minute":
                                                year = Number(value.split("-")[0]);
                                                month = Number(value.split("-")[1]);
                                                day = Number(value.split("-")[2].split(" ")[0]);
                                                time = value.split(" ")[2];
                                                if(length<500){
                                                    if(time){
                                                        return Number(time.split(":")[0])+":"+time.split(":")[1];
                                                    }
                                                }
                                                if(length>=500){
                                                    if(time){
                                                        return month+"/"+day;
                                                    }
                                                }
                                                break;
                                            case "fivem":
                                                year = Number(value.split("-")[0]);
                                                month = Number(value.split("-")[1]);
                                                day = Number(value.split("-")[2].split(" ")[0]);
                                                time = value.split(" ")[2];
                                                if(length<500){
                                                    return Number(time.split(":")[0])+":"+time.split(":")[1];
                                                }
                                                if(length>=500){
                                                    return month+"/"+day;
                                                }
                                                break;
                                            case "tenm":
                                                year = Number(value.split("-")[0]);
                                                month = Number(value.split("-")[1]);
                                                day = Number(value.split("-")[2].split(" ")[0]);
                                                time = value.split(" ")[2];
                                                if(length<300){
                                                    return Number(time.split(":")[0])+":"+time.split(":")[1];
                                                }
                                                if(length>=300){
                                                    return month+"/"+day;
                                                }
                                                break;
                                            case "fifm":
                                                year = Number(value.split("-")[0]);
                                                month = Number(value.split("-")[1]);
                                                day = Number(value.split("-")[2].split(" ")[0]);
                                                time = value.split(" ")[2];
                                                if(length<100){
                                                    return Number(time.split(":")[0])+":"+time.split(":")[1];
                                                }
                                                if(length>=100){
                                                    return month+"/"+day;
                                                }
                                                break;
                                            case "thim":
                                                year = Number(value.split("-")[0]);
                                                month = Number(value.split("-")[1]);
                                                day = Number(value.split("-")[2].split(" ")[0]);
                                                time = value.split(" ")[2];
                                                if(length<50){
                                                    return Number(time.split(":")[0])+":"+time.split(":")[1];
                                                }
                                                if(length>=50){
                                                    return month+"/"+day;
                                                }
                                                break;
                                            case "hour":
                                                year = Number(value.split("-")[0]);
                                                month = Number(value.split("-")[1]);
                                                day = Number(value.split("-")[2].split(" ")[0]);
                                                time = value.split(" ")[2];
                                                if(length<50){
                                                    return Number(time.split(":")[0])+":"+time.split(":")[1];
                                                }
                                                if(length>=50){
                                                    return year+"/"+month+"/"+day;
                                                }
                                                break;
                                            default:;
                                        }
                                    }
                                }

                            },
                            
                        ],
                        series: [
                            {
                                name: 'Kline',
                                data: KLineSocket.HistoryData.hValuesList
                            },
                            {
                                name: 'Volume',
                                data: KLineSocket.HistoryData.hVolumesList
                            }
                        ]
                    });
                },300);
            });
            KLineSocket.KChart.dispatchAction({
                type: 'dataZoom',
                // 开始位置的百分比，0 - 100
                start: startZoom,
                // 结束位置的百分比，0 - 100
                end: 100
            });
            

        }else{
           // 绘制K线图
           setChartData(); // 更新图表数据

           var isLastQuery;
           var beforeLastQuery;
           var todayData = 0;
           var nextQueryTime;
           var lastQueryTime;
           
           // 更新分钟周期K线数据查询参数
           KLineSocket.option.HistoryKQAllMinPrev = $.extend({},KLineSocket.option.HistoryKQAllMinPrev,{StartIndex:"-"+KLineSocket.HistoryData.queryTimes*200});
           // queryTimes查询数据次数更新
           KLineSocket.HistoryData.queryTimes++;
           // 更新日、周、月、年数据查询参数
           KLineSocket.option.HistoryKQAllDayPrev = $.extend({},KLineSocket.option.HistoryKQAllDayPrev,{StartIndex:"-"+KLineSocket.HistoryData.queryTimes*200});
           
           if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
               // 当前查询后蜡烛总数目是否超过规定数据，前一次查询是否小于规定数目，满足条件即为最后一次查询
               nextQueryTime = KLineSocket.HistoryData.queryTimes+1;
               lastQueryTime = KLineSocket.HistoryData.queryTimes;
               
               isLastQuery = todayData + nextQueryTime*200>=KLineSocket.HistoryData.dataLength;
               beforeLastQuery = todayData + lastQueryTime*200 < KLineSocket.HistoryData.dataLength;
               if(isLastQuery&&beforeLastQuery){
                   var count = KLineSocket.HistoryData.dataLength + 1 - lastQueryTime*200+"";
                   KLineSocket.option.HistoryKQAllDayPrev = $.extend({},KLineSocket.option.HistoryKQAllDayPrev,{Count: count});
                   if(!KLineSocket.HistoryData.stopQuery){
                       KLineSocket.getHistoryKQAllDayPrev();
                   }
                   // 最后一次查询标志
                   KLineSocket.HistoryData.stopQuery = true;
               }
               if(!KLineSocket.HistoryData.stopQuery){
                   KLineSocket.getHistoryKQAllDayPrev();
               }
           }else{
               // 当前查询后蜡烛总数目是否超过规定数据，前一次查询是否小于规定数目，满足条件即为最后一次查询
               todayData = KLineSocket.HistoryData.dataLengthToday;
               nextQueryTime = KLineSocket.HistoryData.queryTimes;
               lastQueryTime = KLineSocket.HistoryData.queryTimes-1;

               isLastQuery = todayData + nextQueryTime*200>=KLineSocket.HistoryData.dataLength;
               beforeLastQuery = todayData + lastQueryTime*200 < KLineSocket.HistoryData.dataLength;
               if(isLastQuery&&beforeLastQuery){
                   var count = KLineSocket.HistoryData.dataLength + 1 - todayData - lastQueryTime*200 + "";
                   KLineSocket.option.HistoryKQAllMinPrev = $.extend({},KLineSocket.option.HistoryKQAllMinPrev,{Count: count});
                   if(!KLineSocket.HistoryData.stopQuery){
                       KLineSocket.getHistoryKQAllMinPrev();
                   }
                   // 最后一次查询标志
                   KLineSocket.HistoryData.stopQuery = true;
               }
               if(!KLineSocket.HistoryData.stopQuery){
                   KLineSocket.getHistoryKQAllMinPrev();
               }
           }

        }
        // K线前一根柱子的收盘价
        KLineSocket.option.lastClose = 0; 
    }else{
        // 初始化并显示数据栏和数据信息框的信息
        if(KLineSocket.KChart.getOption()&&KLineSocket.KChart.getOption().series.length!=0){
            setChartData(); // 更新图表数据
        }
    }
};
// 更新图表数据
function setChartData(){
    KLineSocket.KChart.setOption({
        xAxis:[
            {
                data: KLineSocket.HistoryData.hCategoryList
            },
            {
                data: KLineSocket.HistoryData.hCategoryList
            }
        ],
        series: [
            {
                name: "Kline",
                data: KLineSocket.HistoryData.hValuesList,  // 蜡烛图
            },
            {
                name: 'Volume',
                data: KLineSocket.HistoryData.hVolumesList // 成交量
            }
        ]
    });
    if(KLineSocket.KLineSet.isHoverGraph){
        KLineSocket.KChart.dispatchAction({
            type: 'showTip',
            // 数据的 index，如果不指定也可以通过 name 属性根据名称指定数据
            dataIndex: KLineSocket.HistoryData.mouseHoverPoint
        });
    }
}
// 设置x轴动态更换分隔
function setXAxisInterval(index,value,length){
    var valueList = KLineSocket.HistoryData.hCategoryList;
    if(valueList.length<=0){
        return;
    }
    try{
        var timeCurr = valueList[index].split(" ")[2];
    }catch(e){
        console.log(e)
    }
    
    var startTime = xml.options.nowDateTime[0].startTime;
    var endTime = xml.options.nowDateTime[0].endTime;
    var startTime1 = xml.options.nowDateTime[xml.options.nowDateTime.length-1].startTime1;
    var endTime1 = xml.options.nowDateTime[xml.options.nowDateTime.length-1].endTime1;
    var returnValue = false;
    switch(KLineSocket.option.lineType){
        case "day":
            if(!valueList[index]){
                return;
            }
            // 每周第1根显示
            if(length<30&&valueList[index].split(" ")[1]=="一"){
                returnValue = true;
            }
            if(length>=30&&length<200){
                // 每月第1根显示
                if(valueList[index-1]&&valueList[index].split("-")[1]!==valueList[index-1].split("-")[1]){
                    returnValue = true;
                }
            }
            if(length>=200&&length<300){
                // 每隔2个月第1根显示
                if(valueList[index-1]&&valueList[index].split("-")[1]!==valueList[index-1].split("-")[1]){
                    if(valueList[index].split("-")[1]%2==0) {
                        returnValue = true;
                    }
                }
            }
            if(length>=300){
                // 每年第1根显示
                if(valueList[index-1]&&valueList[index].split("-")[0]!==valueList[index-1].split("-")[0]){
                    returnValue = true;
                }
            }
            break;
        case "week":
            if(!valueList[index]){
                return;
            }
            if(length<30){
                if(valueList[index-1]&&valueList[index].split("-")[1]!==valueList[index-1].split("-")[1]){
                    // 每月第1根显示
                    returnValue = true;
                }
            }
            if(length>=30&&length<200){
                if(valueList[index-1]&&valueList[index].split("-")[1]!==valueList[index-1].split("-")[1]){
                    // 每隔4个月第1根显示
                    if(valueList[index].split("-")[1]%4==0) {
                        returnValue = true;
                    }
                }
            }
            if(length>=200&&length<300){
                if(valueList[index-1]&&valueList[index].split("-")[1]!==valueList[index-1].split("-")[1]){
                    // 每隔6个月第1根显示
                    if(valueList[index].split("-")[1]%6==0) {
                        returnValue = true;
                    }
                }
            }
            if(length>=300){
                if(valueList[index-1]&&valueList[index].split("-")[0]!==valueList[index-1].split("-")[0]){
                    // 每年第1根显示
                    returnValue = true;
                }
            }
            break;
        case "month":
            if(!valueList[index]){
                return;
            }
            if(length<30){
                // 每隔2个月显示
                if(valueList[index].split("-")[1]%2==1) {
                    returnValue = true;
                }
            }
            if(length>=30&&length<200){
                // 每隔2年显示
                if(valueList[index-1]&&valueList[index].split("-")[0]!==valueList[index-1].split("-")[0]&&valueList[index].split("-")[0]%2==0) {
                    returnValue = true;
                }
            }
            if(length>=200){
                // 每隔6年显示
                if(valueList[index-1]&&valueList[index].split("-")[0]!==valueList[index-1].split("-")[0]&&valueList[index].split("-")[0]%6==0) {
                    returnValue = true;
                }
            }
            break;
        case "year":
            if(!valueList[index]){
                return;
            }
            if(length<30){
                // 每隔2年显示
                if(valueList[index].split("-")[0]%2==1) {
                    returnValue = true;
                }
            }
            if(length>=30&&length<60){
                // 每隔4年显示
                if(valueList[index].split("-")[0]%4==0) {
                    returnValue = true;
                }
            }
            if(length>=60){
                // 每隔6年显示
                if(valueList[index].split("-")[0]%6==0) {
                    returnValue = true;
                }
            }
            break;
        case "minute":
            if(!timeCurr){
                return;
            }
            if(length<30){
                // 间隔5分钟显示
                if(timeCurr.split(":")[1]%5==0){
                    returnValue = true;
                }
            }
            if(length>=30&&length<300){
                // 整点、半点显示
                if(timeCurr.split(":")[1]=="00"||timeCurr.split(":")[1]=="30"){
                    returnValue = true;
                }
                // 每天第1根显示
                if(startTime&&timeCurr==startTime){
                    returnValue = true;
                }
                // 第二段第1根显示
                if(startTime1&&timeCurr==startTime1){
                    returnValue = true;
                }
                // 第1个时间段最后一根不显示
                if(endTime&&timeCurr==endTime){
                    returnValue = false;
                }
                // 每天最后一根不显示 
                if(endTime1&&timeCurr==endTime1){
                    returnValue = false;
                }
            }
            // if(length>200&&length<500){
            //     console.log(timeCurr)
            //     // 整点显示
            //     if(timeCurr.split(":")[1]=="00"){
            //         returnValue = true;
            //     }
            //     // 第2个时间段第1根显示
            //     if(startTime1&&timeCurr==startTime1){
            //         returnValue = true;
            //     }
            // }
            // if(length>=500){
            //     // 每天第一根显示
            //     if(valueList[index-1]&&valueList[index].split("-")[2].split(" ")[0]!==valueList[index-1].split("-")[2].split(" ")[0]){
            //         returnValue = true;
            //     }
            // }
            break;
        case "fivem":
            if(!timeCurr){
                return;
            }
            if(length<30){
                // 整点、半点显示
                if(timeCurr.split(":")[1]=="00"||timeCurr.split(":")[1]=="30"){
                    returnValue = true;
                }
            }
            if(length>=30&&length<150){
                // 整点显示
                if(timeCurr.split(":")[1]=="00"){
                    returnValue = true;
                }
                // 第1个整点不显示
                if(startTime&&timeCurr.split(":")[0]==startTime.split(":")[0]/1+1){
                    returnValue = false;
                }
            }
            if(length>=150&&length<300){
                // 第2段第一根显示
                if(startTime1&&timeCurr.split(":")[0]==startTime1.split(":")[0]&&timeCurr.split(":")[1]==startTime1.split(":")[1]-1+5){
                    returnValue = true;
                }
                // 每天最后一根显示 
                if(!endTime1&&timeCurr==endTime){
                    returnValue = true;
                }
                if(endTime1&&timeCurr==endTime1){
                    returnValue = true;
                }
            }
            if(length>=300&&length<500){
                // 每天第1根显示
                if(valueList[index-1]&&valueList[index].split("-")[2].split(" ")[0]!==valueList[index-1].split("-")[2].split(" ")[0]){
                    returnValue = true;
                }
            }
            if(length>=500){
                // 每周第1根显示
                if(valueList[index-1]&&valueList[index].split("-")[2].split(" ")[0]!==valueList[index-1].split("-")[2].split(" ")[0]){
                    if(valueList[index].split(" ")[1]=="一"){
                        returnValue = true; 
                    }
                }
                
            }
            break;
        case "tenm":
            if(!timeCurr){
                return;
            }
            if(length<100){
                // 整点显示
                if(timeCurr.split(":")[1]=="00"){
                    returnValue = true;
                }
                // 第1个整点不显示
                if(startTime&&timeCurr.split(":")[0]==startTime.split(":")[0]/1+1){
                    returnValue = false;
                }
            }
            if(length>=100&&length<200){
                // 第2段第一根显示
                if(startTime1&&timeCurr.split(":")[0]==startTime1.split(":")[0]&&timeCurr.split(":")[1]==startTime1.split(":")[1]-1+5){
                    returnValue = true;
                }
                // 每天最后一根显示 
                if(!endTime1&&timeCurr==endTime){
                    returnValue = true;
                }
                if(endTime1&&timeCurr==endTime1){
                    returnValue = true;
                }
            }
            if(length>=200&&length<300){
                // 每天第1根显示
                if(valueList[index-1]&&valueList[index].split("-")[2].split(" ")[0]!==valueList[index-1].split("-")[2].split(" ")[0]){
                    returnValue = true;
                }
            }
            if(length>=300){
                // 每周一第1根显示
                if(valueList[index-1]&&valueList[index].split("-")[2].split(" ")[0]!==valueList[index-1].split("-")[2].split(" ")[0]){
                    if(valueList[index].split(" ")[1]=="一"){
                        returnValue = true; 
                    }
                }
                
            }
            break;
        case "fifm":
            if(!timeCurr){
                return;
            }
            if(length<100){
                // 按照整点显示
                if(timeCurr.split(":")[1]=="00"){
                    returnValue = true;
                }
                // 第1个整点不显示
                if(startTime&&timeCurr.split(":")[0]==startTime.split(":")[0]/1+1){
                    returnValue = false;
                }
            }
            if(length>=100&&length<150){
                // 每天第1根显示
                if(valueList[index-1]&&valueList[index].split("-")[2].split(" ")[0]!==valueList[index-1].split("-")[2].split(" ")[0]){
                    returnValue = true;
                }
            }
            if(length>=150){
                // 每周一第1根显示
                if(valueList[index-1]&&valueList[index].split("-")[2].split(" ")[0]!==valueList[index-1].split("-")[2].split(" ")[0]){
                    if(valueList[index].split(" ")[1]=="一"){
                        returnValue = true; 
                    }
                }
                
            }
            break;
        case "thim":
            if(!timeCurr){
                return;
            }
            if(length<40){
                // 按照整点显示
                if(timeCurr.split(":")[1]=="00"){
                    returnValue = true;
                }
                // 第1个整点不显示
                if(startTime&&timeCurr.split(":")[0]==startTime.split(":")[0]/1+1){
                    returnValue = false;
                }
            }
            if(length>=40&&length<50){
                // 每天最后1根显示
                if(!endTime1&&timeCurr==endTime){
                    returnValue = true;
                }
                if(endTime1&&timeCurr==endTime1){
                    returnValue = true;
                }
            }
            if(length>=50&&length<100){
                //每天第1根显示
                if(valueList[index-1]&&valueList[index].split("-")[2].split(" ")[0]!==valueList[index-1].split("-")[2].split(" ")[0]){
                    returnValue = true; 
                }
                
            }
            if(length>=100){
                // 每周第一根显示
                if(valueList[index-1]&&valueList[index].split("-")[2].split(" ")[0]!==valueList[index-1].split("-")[2].split(" ")[0]){
                    if(valueList[index].split(" ")[1]=="一"){
                        returnValue = true; 
                    }
                }
                
            }
            break;
        case "hour": 
            if(!timeCurr){
                return;
            }
            if(length<50){
                // 每天最后一根显示 
                if(!endTime1&&timeCurr==endTime){
                    returnValue = true;
                }
                if(endTime1&&timeCurr==endTime1){
                    returnValue = true;
                }
            }
            if(length>=50&&length<100){
                // 每周第一根显示
                if(valueList[index-1]&&valueList[index].split("-")[2].split(" ")[0]!==valueList[index-1].split("-")[2].split(" ")[0]){
                    if(valueList[index].split(" ")[1]=="一"){
                        returnValue = true;
                    }
                }
            }
            if(length>=100&&length<200){
                // 每月第1根显示
                if(valueList[index-1]&&valueList[index].split("-")[1]!==valueList[index-1].split("-")[1]){
                    returnValue = true; 
                }
            }
            if(length>=200){
                // 奇数月第1根显示
                if(valueList[index-1]&&valueList[index].split("-")[1]!==valueList[index-1].split("-")[1]){
                    if(valueList[index].split("-")[1]%2==1){
                        returnValue = true; 
                    }
                    
                }
            }
            break;
    }
    return returnValue;
}
// 右侧最新价格标签
function updatePointLabel(value,index){
    
    // 最后一根柱子
    var valuePoint = KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1][1];
    // 最后一根柱子的像素值-top
    pixel = KLineSocket.KChart.convertToPixel(
        {xAxisIndex: 0,yAxisIndex:0},
        [[KLineSocket.HistoryData.hCategoryList.length-1],valuePoint]
    );
        
    // 当页面缩放，判断是否在y轴范围内
    if(index==undefined||value==undefined){
        // return false;
    }else{
        if(index==0){
            yAxisValueList = [];
        }
        yAxisValueList.push(value);   
    

        var min = yAxisValueList[0];
        var max = yAxisValueList[yAxisValueList.length-1];
        
        if(valuePoint<=min){
            // 最后一个点的像素值
            pixel[1] = KLineSocket.KChart.convertToPixel(
                {yAxisIndex:0},min
            );
        }else if(valuePoint>=max){
            // 最后一个点的像素值
            pixel[1] = KLineSocket.KChart.convertToPixel(
                {yAxisIndex:0},max
            );
        }
    }

    var openValue = KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hCategoryList.length-1][0];
    var lastValue = KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hCategoryList.length-1][1];
    var Bgcolor = lastValue>openValue?"#c23a39":(lastValue==openValue?"#62646f":"#44c96e");
    $("#markNewPoint").css({top:pixel[1]-12,marginRight: (100-$("#markNewPoint").width())/2,backgroundColor:Bgcolor})
        .text(floatFixedDecimal(lastValue));
}
// 根据窗口变化，调整柱状图单位的位置
function chartResize() {
    KLineSocket.KChart.resize({
        width: $(".kline").width()
    })
    $("#f_kline_charts,#f_kline_charts div:not(#markNewPoint),#f_kline_charts svg").width($(".kline").width())
};
// 信息框的位置： 左-右
function toolContentPosition(event) {
    var offsetX = event.offsetX;
    var continerWidth = $("#f_kline_charts").width(), 
        toolContent = $("#kline_tooltip").width();
    var centerX = continerWidth / 2;
    if (offsetX > centerX) {
        $("#kline_tooltip").css("left", 45);
    } else {
        $("#kline_tooltip").css({"left":"auto","right": 100});
    }
};
// 初始化设置显示信息
function initMarketTool() {
    var length = KLineSocket.HistoryData.hCategoryList.length;
    if (!KLineSocket.KLineSet.isHoverGraph || KLineSocket.KLineSet.isHoverGraph && !KLineSocket.HistoryData.hCategoryList[KLineSocket.KLineSet.mouseHoverPoint]) {
        setToolInfo(length, null);
    }
};
// 信息框和提示栏：区分 默认的信息 和 hover上去的信息显示
function setToolInfo(length, showTip){ 
    var setPoint;
    if(KLineSocket.KLineSet.mouseHoverPoint>0){
        if(KLineSocket.KLineSet.mouseHoverPoint>length-1){
            KLineSocket.KLineSet.mouseHoverPoint = length-1;
        }else{
            KLineSocket.KLineSet.mouseHoverPoint = Math.round(KLineSocket.KLineSet.mouseHoverPoint);
        }
    }else{
        KLineSocket.KLineSet.mouseHoverPoint = 0;
    }
    if(showTip){
        setPoint = KLineSocket.KLineSet.mouseHoverPoint;
    }else{
        setPoint = length-1;
    }
    var countent = $("#kline");
    if (length) {

        $(".open", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][0])); //开
        
        $(".price", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][1])); //收
        
        $(".lowest", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][2])); //低
        
        $(".highest", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][3])); //高
        
        $(".z-value", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hZValuesList[setPoint])+"%");   // 涨跌
        
        $(".volume", countent).text(setUnit(KLineSocket.HistoryData.hVolumesList[setPoint][1]));
        
    }else{
        $(".open", countent).text("-");
        $(".highest", countent).text("-");
        $(".price", countent).text("-");
        $(".lowest", countent).text("-");
        $(".volume", countent).text("-");
        $(".z-value", countent).text("-");

    }
};