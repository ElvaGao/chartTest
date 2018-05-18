/*
 * websocket对象
 * 包含websocket连接的方法和各项参数和心跳包
 */
var KChart;
function resetData(option){
    // 初始化分时图参数
    initM(option);
    // 初始化K线参数
    initK(option);
}
// 清盘指令后，进行页面数据清理
function clearData(){
    // 更新MarketStatus状态后，重新查询数据
    // $("#"+Charts.type).click();
    //订阅快照 获取昨收 填写信息
    StockInfo.getWatchKZ(); 
    // 全部重新初始化数据
    resetData(option);
    
    // 图形对象
    Charts.isLoaded = false;
    Charts.preType = null;
    Charts.LatestVolume = 0;
    Charts.thisChartFocus = null;
    // 股票信息
    StockInfo.hasKZ = false;
    StockInfo.PreClose = null;
    StockInfo.HistoryDataZBCJ.time = null;
    StockInfo.HistoryDataZBCJ.price = null;
    StockInfo.HistoryDataZBCJ.volumn = null;
    StockInfo.HistoryDataZBCJ.dir = null;
    // 逐笔成交清空
    $(".cb-cj").empty();
    // 盘口清空
    if(StockInfo.stockType=="Field"){
        var newDataPKExt = {"Downs":0,"HoldLines":0,"Ups":0}
        setfillPKExtZS(newDataPKExt);
    }else{
        var newDataPK = {
            Asks:[{"Price":"0","Volume":0},{"Price":"0","Volume":0},{"Price":"0","Volume":0},{"Price":"0","Volume":0},{"Price":"0","Volume":0}],
            Bids:[{"Price":"0","Volume":0},{"Price":"0","Volume":0},{"Price":"0","Volume":0},{"Price":"0","Volume":0},{"Price":"0","Volume":0}],
        };
        setfillPK(newDataPK);
        var newDataPKExt = {"Entrustment":0,"EntrustmentSub":"0","InnerVolume":"0","OuterVolume":"0"};
        setfillPKExt(newDataPKExt);
    }
}
var option = null;
;(function($){
    // socket通道-查询K线
    $.WS = function(option) {
        option = option;
        KChart = echarts.init(document.getElementById('kline_charts'));
        KChart.on('dataZoom', function (params) {
            clearTimeout(Charts.dataZoomTimer);
            // 放大缩小后的图表中的数目
            var paramsZoom = params.batch?params.batch[0]:params;
            var length = Math.round(( paramsZoom.end - paramsZoom.start )/100 * KLine.HistoryData.hCategoryList.length);

            Charts.dataZoomTimer = setTimeout(function(){

                if(Charts.paitChartsNow){
                    return;
                }
                Charts.paitChartsNow = true;
                KChart.setOption({
                    xAxis: [
                        {
                            type: 'category',
                            splitLine: {
                                show: true,
                                interval: function(index,value){
                                    var myval = setXAxisInterval(index,value,length);
                                    return myval; 
                                },
                                lineStyle: {
                                    color: '#efefef'
                                }
                            },
                            axisLabel: {
                                show: true,
                                color: '#666',
                                fontSize: 12,
                                showMaxLabel: true,
                                showMinLabel: true,
                                interval: function(index,value){
                                    var myval = setXAxisInterval(index,value,length);
                                    return myval; 
                                },
                                formatter : function(value, index){
                                    // 年-周-月-日 都是日期格式
                                    var valueList = KLine.HistoryData.hCategoryList;
                                    var year,month,day,time;
                                    var startTime = StockInfo.nowDateTime[0].startTime;
                                    try{
                                        switch(Charts.type){
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
                                    }catch(e){
                                        console.log(e)
                                    }
                                    
                                }
                            }

                        },
                        {
                            type: 'category',
                            data: KLine.HistoryData.hCategoryList,
                        },
                        {
                            type: 'category',
                            data: KLine.HistoryData.hCategoryList,
                        }
                    ],
                    series: [
                        {
                            name: 'Kline',
                            type: 'candlestick',
                            data: KLine.HistoryData.hValuesList
                        },
                        {
                            name: 'MA5',
                            type: 'line',
                            data: KLine.TechIndexHistoryData.MA.data[0], // MA5
                        },
                        {
                            name: 'MA10',
                            type: 'line',
                            data: KLine.TechIndexHistoryData.MA.data[1], // MA10
                        },
                        {
                            name: 'MA20',
                            type: 'line',
                            data: KLine.TechIndexHistoryData.MA.data[2], // MA20
                        },
                        {
                            name: 'Volume',
                            type: 'bar',
                            data: KLine.HistoryData.hVolumesList
                        },
                        {
                            name: 'MAVOL5',
                            type: 'line',
                            data: KLine.TechIndexHistoryData.MAVOL.data[0], // MAVOL5
                        },
                        {
                            name: 'MAVOL10',
                            type: 'line',
                            data: KLine.TechIndexHistoryData.MAVOL.data[1], // MAVOL10
                        },
                        {
                            name: 'MAVOL20',
                            type: 'line',
                            data: KLine.TechIndexHistoryData.MAVOL.data[2], // MAVOL20
                        },
                        {
                            name: Names[KLine.TechIndexHistoryData.Others.name]&&Names[KLine.TechIndexHistoryData.Others.name][0]?Names[KLine.TechIndexHistoryData.Others.name][0]:"", // Others0
                            type: chartTypes[KLine.TechIndexHistoryData.Others.name]&&chartTypes[KLine.TechIndexHistoryData.Others.name][0]?chartTypes[KLine.TechIndexHistoryData.Others.name][0]:'line',
                            data: KLine.TechIndexHistoryData.Others.data[0]&&KLine.TechIndexHistoryData.Others.data[0].length>0?KLine.TechIndexHistoryData.Others.data[0]:null,
                        },
                        {
                            name: Names[KLine.TechIndexHistoryData.Others.name]&&Names[KLine.TechIndexHistoryData.Others.name][1]?Names[KLine.TechIndexHistoryData.Others.name][1]:"", // Others1
                            type: chartTypes[KLine.TechIndexHistoryData.Others.name]&&chartTypes[KLine.TechIndexHistoryData.Others.name][1]?chartTypes[KLine.TechIndexHistoryData.Others.name][1]:'line',
                            data: KLine.TechIndexHistoryData.Others.data[1]&&KLine.TechIndexHistoryData.Others.data[1].length>0?KLine.TechIndexHistoryData.Others.data[1]:null,
                        },
                        {
                            name: Names[KLine.TechIndexHistoryData.Others.name]&&Names[KLine.TechIndexHistoryData.Others.name][2]?Names[KLine.TechIndexHistoryData.Others.name][2]:"", // Others2
                            type: chartTypes[KLine.TechIndexHistoryData.Others.name]&&chartTypes[KLine.TechIndexHistoryData.Others.name][2]?chartTypes[KLine.TechIndexHistoryData.Others.name][2]:'line',
                            data: KLine.TechIndexHistoryData.Others.data[2]&&KLine.TechIndexHistoryData.Others.data[1].length>0?KLine.TechIndexHistoryData.Others.data[2]:null,
                        }
                    ]
                });
                Charts.paitChartsNow = false;
            },300);
        });
        // 建立websocket
        socket = new WSConnect(option);
        socket.createWS();
        // 数据处理的方法挂载到socket上
        initSocketEvent();
        // 初始化需股票信息各项参数并请求代码表
        initStock(option);
        
        // 初始化数据
        resetData(option);
    
        // 点击查询周期K线
        $("#tab li").on("click",function(){
            var _this = this;
            $("#withoutDataK").html("<img src='../img/loading.gif' class='loading'/>");

            // 点击的K线类型
            Charts.type = $(_this).attr("id");

            // 判断当前查询的是否是上一次查询的类型
            if(Charts.preType == Charts.type){
                return;
            }
            // 初始化K线参数
            initK(option);

            // 显示没有数据
            $("#withoutDataK,#withoutDataM").show().siblings().hide();
            
            clearTimeout(Charts.clickTimer);
            clearTimeout(Charts.dataZoomTimer);

            Charts.clickTimer = setTimeout(function(){
                // 清空K线图
                if(KChart.getOption()&&KChart.getOption().series.length!=0){
                    if(Charts.preType=="mline"){
                        MChart.clear();
                    }else{
                        KChart.clear();
                    }  
                }

                // 如果不是第一次点击查询，也就是说并不是刚进入页面显示的图，需要把各项数据清空
                if(Charts.preType){

                    // 取消K线订阅的内容
                    // 因为分时线订阅的也是分钟K线，所以直接通过K线取消订阅操作即可，参数再K线里面添加
                    // 日周日K线，订阅的是快照，而快照再页面里是时刻存在的，所以切换到其他地方时，不进行取消
                    if(!(Charts.preType=="day"||Charts.preType=="week"||Charts.preType=="month"||Charts.preType=="year")){
                        KLine.getKWatchCC();
                    }
                    
                    // 更新技术指标参数
                    if(Charts.preType!="mline"){
                        // 分时图没有技术指标，分时线不用取消技术指标
                        KLine.getKWatchCCIndexMA_VOL();
                    }
                    // 清空历史数据
                    resetData({
                        ExchangeID : StockInfo.ExchangeID,
                        InstrumentID : StockInfo.InstrumentID
                    });
                    // 更新技术指标参数
                    if(Charts.preType!="mline"){
                        // 如果前一个是K线，且查询了技术指标，那么新点击的是K线，更新技术指标参数
                        if(Charts.oldIndexNameOthers&&Charts.oldIndexNameOthers!=""){
                            var indexOthersOptions = getQueryTechIndexMsg(Charts.preType,Charts.oldIndexNameOthers);
                            KLine.option.KWatchCCIndexOthers = $.extend({}, KLine.option.KWatchCCIndexOthers, { Instrumenttype: "51-"+indexOthersOptions.Period+"-"+indexOthersOptions.IndexID });
                            KLine.getKWatchCCIndexOthers();
                        }
                    }
                }

                /*
                 * 技术指标的参数重置
                 */
                // 分时图不存在技术指标，故而技术指标的参数重置
                if(Charts.type=="mline"){
                    Charts.myTechIndexNumber = 0;
                    Charts.myIndexClick = 0;
                    
                }

                Charts.oldIndexNameOthers = "";
                /*
                 * 个股/指数 实时数据，通过快照接口
                 * 其他数据，处理方式不同
                 */
                switch(Charts.type){
                    case "mline":
                        // 分时图x轴
                        MLine.HistoryData.hCategoryData = getxAxis(StockInfo.Date);
                        // 初始化空分时图
                        initEmptyCharts(StockInfo.PreClose);
                        if(StockInfo.MarketStatus == 1){ 
                            // 接收到清盘指令重绘图表
                            if(StockInfo.Date){
                                redrawChart();
                            }else{
                                console.log("清盘有误");
                            }
                            
                        }else{
                            // 获取历史数据
                            MLine.getHistoryData();
                            //获取今日数据推送
                            MLine.getRealTimePush();
                        }
                        break;
                    case "day":
                    case "week":
                    case "month":
                    case "year":
                        KLine.getHistoryKQFirstDayPrev();
                        break;
                    case "minute":
                    case "fivem":
                    case "tenm":
                    case "fifm":
                    case "thim":
                    case "hour":
                        KLine.getHistoryKQAllMinToday();
                        break;
                    default:;
                };

                // 当前走势图的名称 存储为旧线的名称
                Charts.preType = Charts.type;     

                // K线前一根柱子的收盘价归0
                KLine.option.lastClose = 0; 
            },300);
            
                
        });
    };
})(jQuery);
// socket实例化相关参数以及数据存储参数
var WSConnect = function(options){
    this.wsUrl = options.wsUrl;
    this.lockReconnect = false;
    this.timeout = 60000;       //60秒
    this.timeoutObj = null;
    this.serverTimeoutObj = null;
    this.ws = null;
    this.reconnectWS = false;
    // 心跳包
    this.HeartSend = {          
        InstrumentID: options.InstrumentID,
        ExchangeID: options.ExchangeID,
        MsgType: "Q8050"
    };
    
};
WSConnect.prototype = {
    createWS:    function () {
                            try {
                                socket.ws = new WebSocket(this.wsUrl);
                            } catch (e) {
                                this.reconnect(); //如果失败重连
                            }
                        },
    reconnect:  function () {
                    var _target = this;
                    if (_target.lockReconnect) return;
                    _target.lockReconnect = true;
                    
                    socket.reconnectWS = true;
                    // 重连后，重新设置查询条件
                    if(Charts.type!="mline"){
                        KLine.HistoryData.queryTimes = 0;
                        KLine.option.HistoryKQAllDayPrev = $.extend({},KLine.option.HistoryKQAllDayPrev,{Count: "200"});
                        KLine.option.HistoryKQAllMinPrev = $.extend({},KLine.option.HistoryKQAllMinPrev,{Count: "200"});
                    }
                    // StockInfo.PreClose = parseFloat($(".tb-fielList li:eq(6) span").text());
                    
                    //没连接上会一直重连，设置延迟避免请求过多
                    setTimeout(function () {
                        _target.createWS(_target.wsUrl);

                        initSocketEvent(_target);

                        _target.lockReconnect = false;
                        console.log("重连中……");
                    }, 2000);
                },
    //发送请求
    request:    function (data) {
                    socket.ws.send(JSON.stringify(data));
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
                            socket.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
                        }, self.timeout)
                    }, self.timeout)
                },
    getHeartSend:   function(){
                        socket.request(this.HeartSend);
                    }
};
// socket请求
var initSocketEvent = function(){

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
                            //心跳检测重置，第一次建立连接则启动心跳包
                            socket.reset().start();  //都第一次建立连接则启动心跳包

                            // 查询市场状态
                            StockInfo.getMarketStatus();
                            //订阅快照 获取昨收
                            // StockInfo.getWatchKZ();
                            if(Charts.isLoaded){
                                // 更新MarketStatus状态后，重新查询数据
                                
                                $("#"+Charts.type).click();
                            }
                            

                        };
    socket.ws.onmessage = function (evt) {

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
                                    
                                    // 通过匹配InstrumentID和ExchangeID，对不是当前查询的股票的信息，进行截流
                                    // 市场状态没有InstrumentID
                                    if(data["InstrumentID"] || data[0]&&data[0]["InstrumentID"]){
                                        // 通过匹配InstrumentID和ExchangeID，对不是当前查询的股票的信息，进行截流
                                        var MsgInstrumentID = data["InstrumentID"] || data[0]["InstrumentID"];
                                        var instrumentID = Number(StockInfo.InstrumentID);
                                        if(!(instrumentID==MsgInstrumentID)){
                                            return;
                                        }
                                    }
                                    var MsgExchangeID = data["ExchangeID"] || data[0]["ExchangeID"];
                                    var exchangeID = Number(StockInfo.ExchangeID);
                                    if(!(exchangeID==MsgExchangeID)){
                                        return;
                                    }
                                    
                                    // 解析数据串中的ErrorCode，数据列KLineSeriesInfo，MsgType
                                    var ErrorCode = data["ErrorCode"]?data["ErrorCode"]:null;
                                    var dataList = data.KLineSeriesInfo?data.KLineSeriesInfo:new Array(data);
                                    var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
                                    
                                    var beginTime,finishTime,beginTime1,finishTime1;
                                    /*
                                     * 个股/指数 实时数据，通过快照接口
                                     * 其他数据，处理方式不同
                                     */
                                    // Charts.type-区分查询历史数据和指数/个股信息
                                    switch(MsgType){
                                        case 'P8002':
                                        case 'R8002':
                                            if(data.ErrorCode=="9999"){
                                                return;
                                            }
                                            
                                            if(StockInfo.MarketStatus!=data.MarketStatus){
                                                StockInfo.Date = data.Date?data.Date:data[0].Date;
                                                StockInfo.todayDate = -1;
                                                StockInfo.MarketStatus = data.MarketStatus;
                                            }
                                            if(!Charts.isLoaded&&!StockInfo.PreClose){
                                                //订阅快照 获取昨收
                                                StockInfo.getWatchKZ(); 
                                                return;
                                            }
                                            if(StockInfo.MarketStatus==1){
                                                // 清盘指令后，进行页面数据清理
                                                clearData();
                                            }
                                            //订阅快照 获取昨收
                                            StockInfo.getWatchKZ();
                                            break;
                                        case "P0001":       // 订阅日K线
                                            if(data.ErrorCode=="9999"){
                                                return;
                                            }
                                            if(!StockInfo.MarketStatus){
                                                // 查询市场状态
                                                StockInfo.getMarketStatus();
                                                return;
                                            }
                                            if(Charts.isLoaded&&data.PreClose&&(StockInfo.PreClose != data.PreClose)){
                                                StockInfo.PreClose = data.PreClose;
                                            }
                                            // 通过昨收是否存在，判断页面是否是第一次加载
                                            if(!StockInfo.PreClose&&data.PreClose){
                                                // StockInfo.PreClose = data.PreClose;
                                                // 存储昨收
                                                StockInfo.PreClose = data.PreClose?parseFloat(data.PreClose):null;

                                                //请求盘口-买卖盘
                                                if(StockInfo.stockType=="Field"){
                                                    //请求盘口扩展-内外盘-委比委差等
                                                    StockInfo.getKWatchKZ_KZPK_ZB();
                                                }else{
                                                    //请求盘口扩展-内外盘-委比委差等
                                                    StockInfo.getKWatchKZ_PK_KZPK_ZB();
                                                }
                                                // 成交记录
                                                var tradingHistoryData={
                                                    "MsgType":"Q3032",
                                                    "ExchangeID":StockInfo.ExchangeID,
                                                    "InstrumentID":StockInfo.InstrumentID,
                                                    "PructType":StockInfo.typeIndex.toString(),
                                                    "StartIndex":"-1",
                                                    "StartDate":StockInfo.todayDate.toString(),
                                                    "Count":(StockInfo.stockType == "Field"?"14":"5")
                                                };
                                                socket.request(tradingHistoryData);
                                                // 刚打开页面之后，查询分时图
                                                if(!Charts.isLoaded){
                                                    // 查询分时图
                                                    $("#"+Charts.type).click();
                                                    // 页面打开后，第一次查询的数据加载完毕
                                                    Charts.isLoaded = true;
                                                }
                                            }
                                            setFieldInfo(data);
                                            // K线接口-匹配当前查询的股票或者指数
                                            var msgTypeNow = getQueryType(Charts.type);
                                            if( !msgTypeNow.MsgTypeWatch||MsgType != msgTypeNow.MsgTypeWatch||dataList[0].Date==0){
                                                return;
                                            }
                                            // 当数据已经查询结束了，并且
                                            // 日周日K线订阅时，为避免存储错误，在第二次查询以后对返回数据后进行实时更新
                                            if(KLine.HistoryData.queryTimes>0&&(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year")){
                                                KCharts(dataList);
                                            }
                                            break;
                                        case "P0011":        // 1分钟K线订阅分钟线应答
                                            if(Charts.type=="mline"){
                                                if(MChart != undefined){
                                                    // 绘制分时图
                                                    paintMCharts(data,"add");
                                                }
                                                return;
                                            }
                                        case "P0012":        // 5分钟K线订阅分钟线应答
                                        case "P0013":        // 10分钟K线订阅分钟线应答
                                        case "P0014":        // 15分钟K线订阅分钟线应答
                                        case "P0015":        // 30分钟K线订阅分钟线应答
                                        case "P0016":        // 60分钟K线订阅分钟线应答
                                            var msgTypeNow = getQueryType(Charts.type);
                                            if( msgTypeNow.MsgTypeWatch != MsgType||dataList[0].Date==0){
                                                return;
                                            }
                                            if(dataList[0].Date==0){
                                                return;
                                            }
                                            if(KLine.HistoryData.queryTimes!=0){
                                                KCharts(dataList);
                                            }
                                            break;
                                        case "R3011":        // 1分钟K线历史数据查询
                                        case "R3012":        // 5分钟K线历史数据查询
                                        case "R3013":        // 10分钟K线历史数据查询
                                        case "R3014":        // 15分钟K线历史数据查询
                                        case "R3015":        // 30分钟K线历史数据查询
                                        case "R3016":        // 60分钟K线历史数据查询
                                            // 周期K线查询和结果中只是对应的标识不一样 P和R开头
                                            var msgTypeNow = getQueryType(Charts.type);
                                            if( msgTypeNow.MsgType&&(MsgType.slice(1) != msgTypeNow.MsgType.slice(1))){
                                                return;
                                            }
                                            // 断网重连，查到新的历史数据后，原数据会被清空
                                            if(socket.reconnectWS){
                                                // 清空历史数据
                                                resetData({
                                                    ExchangeID : StockInfo.ExchangeID,
                                                    InstrumentID : StockInfo.InstrumentID
                                                });
                                                socket.reconnectWS = false;
                                                Charts.preType = null;
                                            }
                                            if(Charts.type=="mline"){
                                                if(ErrorCode){
                                                    return;
                                                }
                                                // 绘制分时图
                                                paintMCharts(data);
                                                return;
                                            }
                                            /**
                                             * ErrorCode为返回的错误数据
                                             * 存在特殊情况为：
                                             * 分钟周期K线三种情况:
                                             * 1.如果查询的是当天的数据，返回了ErrorCode，那么当天数据为空，立即开始查询历史数据
                                             * 2.如果前一天数据为空，则只画出当天的数据
                                             * 3.如果派出了1、2两种情况后，返回数据依然为空，不绘制图形
                                             */
                                            if(ErrorCode){
                                                if(KLine.HistoryData.queryTimes==0){
                                                    // 小时为单位的K线记录下当天这天有几根柱子
                                                    if(Charts.type=="hour"&&KLine.HistoryData.hCategoryList.length!=0){
                                                        var str = KLine.HistoryData.hCategoryList[0].split(" ")[0];
                                                        var arr = KLine.HistoryData.hCategoryList.slice(0,4);
                                                        
                                                        $.each(arr,function(i,o){
                                                            if(o.split(" ")[0]==str){
                                                                KLine.HistoryData.CountNum++;
                                                            }
                                                        })
                                                    }
                                                    console.info("今天还没有开盘。");
                                                    KLine.HistoryData.queryTimes++;
                                                    KLine.getHistoryKQFirstMinPrev();
                                                    return;
                                                }
                                                // 如果上交易日
                                                if(KLine.HistoryData.queryTimes==1&&KLine.HistoryData.dataLengthToday!=0){
                                                    console.info("没有前一个交易日的信息。");
                                                    chartPaint("history");
                                                    return;
                                                }
                                                console.info(data["Content"]);
                                                $("#withoutDataK").html("抱歉，暂时没有数据，请稍后再试……");
                                                return;
                                            }
                                            // 如果当天数据为空并要进行第二次查询，或者是要进行第一次查询时，清空数据
                                            if(KLine.HistoryData.dataLengthToday==0&&KLine.HistoryData.queryTimes==1||KLine.HistoryData.queryTimes==0){
                                                $.each(KLine.HistoryData,function(i,obj){
                                                    if(obj instanceof Array){

                                                        KLine.HistoryData.dataLength = data.KLineCount>=720?720:data.KLineCount;
                                                        KLine.HistoryData[i] = new Array(KLine.HistoryData.dataLength);
                                                        
                                                        if(i == "hCategoryList"){
                                                            $.each(KLine.HistoryData.hCategoryList,function(i,o){
                                                                KLine.HistoryData.hCategoryList[i] = "1997-1-1 一 9:30";          // 横轴
                                                            });
                                                        }
                                                        if(i == "hValuesList"){
                                                            $.each(KLine.HistoryData.hCategoryList,function(i,o){
                                                                KLine.HistoryData.hValuesList[i] = [null,null,null,null];           // 值-开收低高
                                                            });
                                                        }
                                                        if(i == "hVolumesList"){
                                                            $.each(KLine.HistoryData.hCategoryList,function(i,o){
                                                                KLine.HistoryData.hVolumesList[i] = [i,0,1];           // 值-开收低高
                                                            });
                                                        }
                                                    }
                                                });
                                                $.each(KLine.TechIndexHistoryData,function(index,object){
                                                    object.queryTimes = 0;
                                                    if(object.data instanceof Array){
                                                        KLine.TechIndexHistoryData[index].data = [];
                                                    }
                                                });

                                                KLine.getKWatch();      // 订阅分钟K线
                                                
                                            }
                                            KCharts(dataList, "history");
                                            break;
                                        case "R3021":        // 日K线历史数据查询
                                        case "R3022":        // 周K线历史数据查询
                                        case "R3023":        // 月K线历史数据查询
                                        case "R3025":        // 年K线历史数据查询
                                            if(ErrorCode){
                                                return;
                                            }
                                            // 周期K线查询和结果中只是对应的标识不一样 P和R开头
                                            var msgTypeNow = getQueryType(Charts.type);
                                            if( msgTypeNow.MsgType&&(MsgType.slice(1) != msgTypeNow.MsgType.slice(1))){
                                                return;
                                            }
                                            // 断网重连，查到新的历史数据后，原数据会被清空
                                            if(socket.reconnectWS){
                                                // 清空历史数据
                                                resetData({
                                                    ExchangeID : StockInfo.ExchangeID,
                                                    InstrumentID : StockInfo.InstrumentID
                                                });
                                                socket.reconnectWS = false;
                                            }
                                            // 如果当天数据为空并要进行第二次查询，或者是要进行第一次查询时，清空数据
                                            if(KLine.HistoryData.queryTimes==0){
                                                $.each(KLine.HistoryData,function(i,obj){
                                                    if(obj instanceof Array){

                                                        KLine.HistoryData.dataLength = data.KLineCount>=720?720:data.KLineCount;
                                                        KLine.HistoryData[i] = new Array(KLine.HistoryData.dataLength);
                                                        
                                                        if(i == "hCategoryList"){
                                                            $.each(KLine.HistoryData.hCategoryList,function(i,o){
                                                                KLine.HistoryData.hCategoryList[i] = "1997-1-1 一 9:30";          // 横轴
                                                            });
                                                        }
                                                        if(i == "hValuesList"){
                                                            $.each(KLine.HistoryData.hCategoryList,function(i,o){
                                                                KLine.HistoryData.hValuesList[i] = [null,null,null,null];           // 值-开收低高
                                                            });
                                                        }
                                                        if(i == "hVolumesList"){
                                                            $.each(KLine.HistoryData.hCategoryList,function(i,o){
                                                                KLine.HistoryData.hVolumesList[i] = [i,0,1];           // 值-开收低高
                                                            });
                                                        }
                                                    }
                                                });
                                                $.each(KLine.TechIndexHistoryData,function(index,object){
                                                    object.queryTimes = 0;
                                                    if(object.data instanceof Array){
                                                        KLine.TechIndexHistoryData[index].data = [];
                                                    }
                                                });

                                                // 日K线不用进行订阅，页面中一直存在日K线的订阅
                                                // KLine.getKWatch();
                                                
                                            }
                                            KCharts(dataList, "history");
                                            break;   
                                        case 'R3051': // 技术指标
                                            if(ErrorCode){
                                                return;
                                            }
                                            if(KLine.TechIndexHistoryData.Others.queryTimes==0){
                                                KLine.TechIndexHistoryData.Others.data = [];
                                            }
                                            TechIndexLines(dataList, "history");
                                            break;
                                        case 'P0051': // 技术指标订阅
                                            if(ErrorCode){
                                                return;
                                            }
                                            TechIndexLines(dataList);//处理技术指标
                                            break;
                                        case "R8050":  //心跳包
                                            // console.log(data);
                                            break;
                                        case "P0002":    //五档盘口
                                            if(data.ErrorCode=="9999"){
                                                return;
                                            }
                                            if(data.ExchangeID != StockInfo.ExchangeID || data.InstrumentID != StockInfo.InstrumentID){
                                                return;
                                            }
                                            setfillPK(data);
                                            break;
                                        case "P0003":    //五档盘口扩展-内外盘-委比委差等
                                            if(data.ErrorCode=="9999"){
                                                return;
                                            }
                                            if(data.ExchangeID != StockInfo.ExchangeID || data.InstrumentID != StockInfo.InstrumentID){
                                                return;
                                            }
                                            if(StockInfo.stockType=="Field"){
                                                setfillPKExtZS(data);
                                            }else{
                                                setfillPKExt(data);
                                            }
                                            break;
                                        case "P0032":    //逐笔成交
                                            if(data.ErrorCode=="9999"){
                                                return;
                                            }
                                            tFlag = true;
                                            setfillZBCJ(data);
                                            break;
                                        case "R3032"://逐笔成交历史记录
                                            if(data.ErrorCode=="9999"){
                                                return;
                                            }
                                            if(!data.TradeRecordInfo || data.TradeRecordInfo.length<=0) return;
                                            fillTrading(data.TradeRecordInfo);
                                            break;
                                        default:
                                    }
                                    

                                    //如果获取到消息，心跳检测重置
                                    //拿到任何消息都说明当前连接是正常的
                                    socket.reset().start();
                        
                                }
                            });
                        }
};



