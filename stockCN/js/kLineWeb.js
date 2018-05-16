
$("#kline").click(function(e){
    if(Charts.thisChartFocus!=undefined&&($(Charts.thisChartFocus).attr("id")=="MLine"||$(Charts.thisChartFocus).attr("id")=="kline")){
        $(Charts.thisChartFocus).children(".charts-focus").focus();
        return;
    }
});
// 初始化K线默认参数 
var initK = function(option){
    // 实例化K线默认参数 
    KLine = new CreateKline(option);  
    KLine.getTechIndexFuncs();
};
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
function getQueryType(type){
    var typeObj = {
        MsgType: null,
        Instrumenttype: null,
        // 10-1分钟；11-5分钟；12-10分钟；13-15分钟；14-30分钟；15-60分钟；30-日线；31-周线；32-月线；33-季线；34-年线
        Period:null
    }
    switch(type){
        case "mline":
            typeObj = {         // 日K线：Q3021
                MsgType: "Q3011",
                Instrumenttype: "11",
                Period:"10",
                MsgTypeWatch: "P0011"
            }
            break;
        case "day":
            typeObj = {         // 日K线：Q3021
                MsgType: "Q3021",
                Instrumenttype: "1",
                Period:"30",
                MsgTypeWatch: "P0001"
            }
            break;
        case "week":
            typeObj = {         // 周K线：Q3022
                MsgType: "Q3022",
                Instrumenttype: "1",
                Period:"31",
                MsgTypeWatch: "P0001"
            }
            break;
        case "month":
            typeObj = {         // 月K线：Q3023
                MsgType: "Q3023",
                Instrumenttype: "1",
                Period:"32",
                MsgTypeWatch: "P0001"
            }
            break;
        case "year":
            typeObj = {         // 年K线：Q3025
                MsgType: "Q3025",
                Instrumenttype: "1",
                Period:"34",
                MsgTypeWatch: "P0001"
            }
            break;
        case "minute":
            typeObj = {         // 1分钟K线：Q3011
                MsgType: "Q3011",
                Instrumenttype: "11",
                Period:"10",
                MsgTypeWatch: "P0011"
            }
            break;
        case "fivem":
            typeObj = {         // 5分钟K线：Q3012
                MsgType: "Q3012",
                Instrumenttype: "12",
                Period:"11",
                MsgTypeWatch: "P0012"
            }
            break;
        case "tenm":          
            typeObj = {         // 10分钟K线：Q3013
                MsgType: "Q3013",
                Instrumenttype: "13",
                Period:"12",
                MsgTypeWatch: "P0013"
            }
            break;
        case "fifm":
            typeObj = {         // 15分钟K线：Q3014
                MsgType: "Q3014",
                Instrumenttype: "14",
                Period:"13",
                MsgTypeWatch: "P0014"
            }
            break;
        case "thim":
            typeObj = {         // 30分钟K线：Q3015
                MsgType: "Q3015",
                Instrumenttype: "15",
                Period:"14",
                MsgTypeWatch: "P0015"
            }
            break;
        case "hour":       
            typeObj = {         // 60分钟K线：Q3016
                MsgType: "Q3016",
                Instrumenttype: "16",
                Period:"15",
                MsgTypeWatch: "P0016"
            }
            break;
        default:;
    };

    return typeObj;
}
// 技术指标请求参数查询-根据名字得到对应数值Period\IndexID
function getQueryTechIndexMsg(type,lineName){
    var LineMsg = {
        Period: null,
        IndexID:null
    };
    LineMsg.Period = getQueryType(type).Period;
    // IndexID    MA-3;MAVOL-4;MACD-5;MTM-6;RSI-10;KDJ-11
    if(lineName){
        switch(lineName){
            case "MA":    
                LineMsg.IndexID = "3";  // MA
                break;
            case "MAVOL":
                LineMsg.IndexID = "4";  // MAVOL
                break;
            case "MACD":    
                LineMsg.IndexID = "5";  // MACD
                break;
            case "MTM":     
                LineMsg.IndexID = "6";  // MTM
                break;
            case "RSI":     
                LineMsg.IndexID = "10";  // RSI
                break;
            case "KDJ":
                LineMsg.IndexID = "11";  // KDJ
                break;
            default:;
        };
    }
    return LineMsg;
}
// 获取技术指标请求参数-根据数值得到名字和存储名字
function getQueryTechIndexName(lineNum){
    var LineMsg = {
        msgName:null,
        dataName:null
    };
    if(lineNum){
        switch(lineNum){
            case "3":    
                LineMsg.msgName = "MA";  // MA
                LineMsg.dataName = "MA";  // MA
                break;
            case "4":
                LineMsg.msgName = "MAVOL";  // MAVOL
                LineMsg.dataName = "MAVOL";  // MA
                break;
            case "5":    
                LineMsg.msgName = "MACD";  // MACD
                LineMsg.dataName = "Others";  // MA
                break;
            case "6":     
                LineMsg.msgName = "MTM";  // MTM
                LineMsg.dataName = "Others";  // MA
                break;
            case "10":     
                LineMsg.msgName = "RSI";  // RSI
                LineMsg.dataName = "Others";  // MA
                break;
            case "11":
                LineMsg.msgName = "KDJ";  // KDJ
                LineMsg.dataName = "Others";  // MA
                break;
            default:;
        };
    }
    return LineMsg;
}
// websocket实例化相关参数以及数据存储参数
var CreateKline = function(options){
    var msgType = null,
        instrumenttype = null;
    // 对象默认请求参数
    this.option = {
        lastClose: 0,
        // 市场状态查询

        // 查询历史数据
        // 日、周、月、年-最后199条-为了索引为整百的数据
        HistoryKQFirstDayPrev: {         
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            MsgType: "",  
            StartIndex: "-1", 
            StartDate: "0", 
            Count: "199" 
        },
        // 日、周、月、年-从第二次开始每次请求200条,StartIndex为整百，
        // 在每次查询到历史数据的时候进行扩展后再次进行查询
        HistoryKQAllDayPrev:{
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
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
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            MsgType: "",  
            StartIndex: "0", 
            StartDate: "-1", 
            StartTime: "0",
            Count: "242" 
        },
        // 分钟K线历史记录查询，从昨天开始的交易数据，
        // 第一次查询199条-为了索引为整百的数据
        HistoryKQFirstMinPrev: {         
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
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
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            MsgType: "",  
            StartIndex: "", 
            StartDate: "0", 
            StartTime: "0",
            Count: "200"
        },
        // 订阅
        KWatch: {                
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            MsgType:"S1010",
            Instrumenttype:""
        },
        // 取消订阅
        KWatchCC: {              
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            MsgType:"N1010",
            Instrumenttype:""
        },
        // 订阅指标
        KWatchIndexMA_VOL: {                
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            MsgType:"S1010",
            Instrumenttype:""
        },
        // 取消订阅指标
        KWatchCCIndexMA_VOL: {                
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            MsgType:"N1010",
            Instrumenttype:"51"
        },
        //KWatchIndexOthers
        KWatchIndexOthers: {                
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            MsgType:"S1010",
            Instrumenttype:""
        },
        // 取消订阅指标
        KWatchCCIndexOthers: {                
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            MsgType:"N1010",
            Instrumenttype:""
        },
        // 指标查询历史数据
        // IndexID    MA-3;MAVOL-4;MACD-5;MTM-6;RSI-10;KDJ-11
        // Period     10-1分钟；11-5分钟；12-10分钟；13-15分钟；14-30分钟；15-60分钟；30-日线；31-周线；32-月线；33-季线；34-年线
        // 日、周、月、年指标查询-最后199条-为了索引为整百的数据
        TechIndexKQFirstDayPrev:{
            MsgType: "Q3051", 
            IndexID:"",
            Period:"",
            info:"指标测试",
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            StartIndex: "-1", 
            StartDate: "0", 
            StartTime: "0",
            Count: "199",
            
        },
        // 日、周、月、年指标查询-从第二次开始每次请求200条,StartIndex为整百，
        TechIndexKQAllDayPrev:{
            MsgType: "Q3051", 
            IndexID:"",
            Period:"",
            info:"指标测试",
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            StartIndex: "", 
            StartDate: "0", 
            StartTime: "0",
            Count: "200",
            
        },
        // 分钟周期K线，当前这一天的指标查询
        TechIndexKQAllMinToday:{
            MsgType: "Q3051", 
            IndexID:"",
            Period:"",
            info:"指标测试",
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            StartIndex: "0", 
            StartDate: "-1", 
            StartTime: "0",
            Count: "242",
            
        },
        // 分钟周期K线，第一次指标查询199条
        TechIndexKQFirstMinPrev:{
            MsgType: "Q3051", 
            IndexID:"",
            Period:"",
            info:"指标测试",
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            StartIndex: "-1", 
            StartDate: "0", 
            StartTime: "0",
            Count: "199",
            
        },
        // 从第二次开始每次请求200条,StartIndex为整百，
        TechIndexKQAllMinPrev:{
            MsgType: "Q3051", 
            IndexID:"",
            Period:"",
            info:"指标测试",
            InstrumentID: StockInfo.InstrumentID,
            ExchangeID: StockInfo.ExchangeID,
            StartIndex: "", 
            StartDate: "0", 
            StartTime: "0",
            Count: "200"
        },
        TechIndexOption:{}
    };

    var objKWatch = getQueryType(Charts.type);
    // 确定订阅类型
    this.option.KWatch = $.extend({}, this.option.KWatch, { Instrumenttype: objKWatch.Instrumenttype });

    var objIndexWatch = getQueryTechIndexMsg(Charts.type,"MA");
    this.option.KWatchIndexMA_VOL = $.extend({}, this.option.KWatchIndexMA_VOL, { Instrumenttype: "51-"+objIndexWatch.Period+"-3,51-"+objIndexWatch.Period+"-4"});

    // 更新查询历史数据参数-日周月年
    this.option.HistoryKQFirstDayPrev = $.extend({}, this.option.HistoryKQFirstDayPrev, { MsgType: objKWatch.MsgType});
    this.option.HistoryKQAllDayPrev = $.extend({}, this.option.HistoryKQAllDayPrev, { MsgType: objKWatch.MsgType});
        
    // 更新查询历史数据参数-分钟
    this.option.HistoryKQAllMinToday = $.extend({}, this.option.HistoryKQAllMinToday, { MsgType: objKWatch.MsgType }); 
    this.option.HistoryKQFirstMinPrev = $.extend({}, this.option.HistoryKQFirstMinPrev, { MsgType: objKWatch.MsgType }); 
    this.option.HistoryKQAllMinPrev = $.extend({}, this.option.HistoryKQAllMinPrev, { MsgType: objKWatch.MsgType});

    // 更新技术指标参数
    // IndexID    MA-3;MAVOL-4;MACD-5;MTM-6;RSI-10;KDJ-11
    var arrLines = ["MA","MAVOL","MACD","MTM","RSI","KDJ"];
    for(var i=0;i<arrLines.length;i++){
        this.option.TechIndexOption["TechIndexKQFirstDayPrev"+arrLines[i]] = $.extend({}, this.option.TechIndexKQFirstDayPrev, getQueryTechIndexMsg(Charts.type,arrLines[i])); 
        this.option.TechIndexOption["TechIndexKQAllDayPrev"+arrLines[i]] = $.extend({}, this.option.TechIndexKQAllDayPrev, getQueryTechIndexMsg(Charts.type,arrLines[i]));
        this.option.TechIndexOption["TechIndexKQAllMinToday"+arrLines[i]] = $.extend({}, this.option.TechIndexKQAllMinToday, getQueryTechIndexMsg(Charts.type,arrLines[i])); 
        this.option.TechIndexOption["TechIndexKQFirstMinPrev"+arrLines[i]] = $.extend({}, this.option.TechIndexKQFirstMinPrev, getQueryTechIndexMsg(Charts.type,arrLines[i])); 
        this.option.TechIndexOption["TechIndexKQAllMinPrev"+arrLines[i]] = $.extend({}, this.option.TechIndexKQAllMinPrev, getQueryTechIndexMsg(Charts.type,arrLines[i])); 
    }
    // 上一次查询的K线类型-用于取消订阅
    if(Charts.preType!=undefined){
        var objKWatchCC = getQueryType(Charts.preType);
        this.option.KWatchCC = $.extend({}, this.option.KWatchCC, { Instrumenttype: objKWatchCC.Instrumenttype });
        var objIndexWatchCC = getQueryTechIndexMsg(Charts.preType,"MA")
        this.option.KWatchCCIndexMA_VOL = $.extend({}, this.option.KWatchCCIndexMA_VOL, { Instrumenttype: "51-"+objIndexWatchCC.Period+"-3,51-"+objIndexWatchCC.Period+"-4" });
    }
    this.HistoryData = {
        already: false,             // 是否查询完了历史数据
        hTime: 0,                   // 如果为日K线，存储最后一条时间
        hCategoryList: [],          // 横轴
        hValuesList: [],            // 值-开收低高
        hValuesPercentList: [],     // 值-对应的百分比
        hVolumesList: [],           // 成交量
        hZValuesList: [],           // 涨幅
        hZValuesListPercent: [],    // 涨幅百分比
        hZf: [],                    // 振幅
        hZfList: [],                // 振幅百分比
        queryTimes:0,               // 查询数据次数
        dataLengthToday:0,          // 分钟K线查询当天的
        dataLength: 0,              // 查询的历史数据参数            
        stopQuery: null,            // 是否已经停止查询历史数据
        watchDataCount:0,           // 目前已经累计的订阅数量
        CountNum: 0,                // hour类型需要，计算前几根相同的根数，然后通过index判断计算出坐标轴日期的间隔
        hasHistory: null,           // 是否有历史数据
    };
    this.TechIndexHistoryData = {
        dataLength:0,
        // 以下是技术指标
        MA:{
            queryTimes:0,
            data:[],
            dataLengthToday:0,
            stopQuery: null,            // 是否已经停止查询历史数据
            watchDataCount:0,
        },
        MAVOL:{
            queryTimes:0,
            data:[],
            dataLengthToday:0,
            stopQuery: null,            // 是否已经停止查询历史数据
            watchDataCount:0,
        },
        Others:{
            name: null,
            queryTimes:0,
            data:[],
            dataLengthToday:0,
            stopQuery: null,            // 是否已经停止查询历史数据
            watchDataCount:0
        }
    }
};
CreateKline.prototype = {
    // 查询历史数据
    // 日、周、月、年-最后199条-为了索引为整百的数据
    getHistoryKQFirstDayPrev: function(){
                            socket.request(this.option.HistoryKQFirstDayPrev);
                        },
    // 日、周、月、年-从第二次开始每次请求200条,StartIndex为整百，
    // 在每次查询到历史数据的时候进行扩展后再次进行查询
    getHistoryKQAllDayPrev: function(){
                            socket.request(this.option.HistoryKQAllDayPrev);
                        },
    // 分钟周期K线，当前这一天的K线查询
    getHistoryKQAllMinToday: function(){
                            socket.request(this.option.HistoryKQAllMinToday);
                        },
    // 分钟K线历史记录查询，从昨天开始的交易数据
    getHistoryKQFirstMinPrev: function(){
                            socket.request(this.option.HistoryKQFirstMinPrev);
                        },
    // 在每次查询到历史数据的时候进行扩展后再次进行查询
    getHistoryKQAllMinPrev: function(){
                            socket.request(this.option.HistoryKQAllMinPrev);
                        },
    // 订阅K线
    getKWatch:          function(){
                            socket.request(this.option.KWatch);
                        },
    // 取消订阅K线
    getKWatchCC:        function(){
                            socket.request(this.option.KWatchCC);
                        },
                        
    // 订阅指标
    getKWatchIndexMA_VOL: function(){
                            socket.request(this.option.KWatchIndexMA_VOL);
                        },
    // 取消订阅指标
    getKWatchCCIndexMA_VOL: function(){
                                socket.request(this.option.KWatchCCIndexMA_VOL);
                            },
    // 订阅指标getKWatchIndexOthers
    getKWatchIndexOthers: function(){
                                socket.request(this.option.KWatchIndexOthers);
                            },
    // 取消订阅指标getKWatchIndexOthers
    getKWatchCCIndexOthers: function(){
                                socket.request(this.option.KWatchCCIndexOthers);
                            },
    // 请求指标的参数历史数据查询
    getTechIndexFuncs:      function(){
                            for(var TechIndexName in this.option.TechIndexOption){
                                (function(TechIndexName){
                                    // 分钟周期K线，当前这一天的指标查询
                                    var funcName = "get"+TechIndexName;
                                    CreateKline.prototype[funcName] = function(){
                                        socket.request(this.option.TechIndexOption[TechIndexName]);
                                    };
                                })(TechIndexName);
                            }
                        }
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

        initTooltip();
        
    }

    // 鼠标滑过，出现信息框
    $("#kline_charts").bind("mouseenter", function (event) {
        if(event.offsetY<510){
            toolContentPosition(event);
            $("#kline_tooltip").show();
            Charts.thisChartFocus = "#kline";
            Charts.isHoverGraph = true;
        }
    });
    $("#kline_charts").bind("mousemove", function (event) {
        
        
            if(event.offsetY<510){
                clearTimeout(Charts.moveTimer);
                Charts.moveTimer = setTimeout(function(){
                    Charts.isHoverGraph = true;
                    $("#kline_tooltip").show();
                    toolContentPosition(event);
                    Charts.thisChartFocus = "#kline";
                },300)
            }else{
                clearTimeout(Charts.moveTimer);
                Charts.isHoverGraph = false;
                $("#kline_tooltip").hide();
                Charts.mouseHoverPoint = 0;
                $(Charts.thisChartFocus).children(".charts-focus").blur();
                Charts.thisChartFocus = window;
                initTooltip();
            }
        
        
    });
    $("#kline_charts").bind("mouseout", function (event) {
        clearTimeout(Charts.moveTimer);
        Charts.isHoverGraph = false;
        $("#kline_tooltip").hide();
        Charts.mouseHoverPoint = 0;
        $(Charts.thisChartFocus).children(".charts-focus").blur();
        Charts.thisChartFocus = window;
        initTooltip();
    });
};
// 解析获取到的数据
function splitData(data, isHistory) {
    var k_time = [];                        // 时间
    var k_categoryData = [];                // x轴分割线坐标数组
    var k_values = [];                      // 二维数组：开收低高-四个数值的数组-蜡烛图
    var k_valuesPercent = [];               // 二维数组：开收低高-四个百分比值-相对昨收
    var k_zValues = [];                     // 涨幅-数值
    var k_zValuesPercent = [];              // 涨幅-百分比
    var k_volumns = [];                     // 柱形图数据-成交量
    var k_amplitude = [];                   // 振幅-K线最高减去最低的值        
    var k_amplPercent = [];                 // 振幅百分比-相对昨收
    var week = ["日","一","二","三","四","五","六"];
    var data_length = 0;

    // 遍历json，将它们push进不同的数组
    $.each(data,function(i,object){
        var e_date = formatDateSplit(object.Date),                 // 当天日期
            e_day = week[(new Date(e_date)).getDay()],        // 计算星期
            e_time;  

        if(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year"){
            KLine.HistoryData.hTime = formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
            e_time = e_date + " " + e_day;
            k_categoryData.push(e_time);
        }else{
            e_time = e_date + " " + e_day + " " + formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
            k_categoryData.push(e_time);
        }  

        if(!KLine.option.lastClose){
            KLine.option.lastClose = object.Open;                          // 上一根柱子的收盘价
        }

        // 如果是最后一条数据的更新，lastClose就是前一根柱子的收盘价
        if(!isHistory){
            if(k_categoryData[0].toString() == KLine.HistoryData.hCategoryList[KLine.HistoryData.hCategoryList.length-1] && KLine.HistoryData.hValuesList.length>1){
                KLine.option.lastClose = KLine.HistoryData.hValuesList[KLine.HistoryData.hValuesList.length-2][1];
            }else{
                KLine.option.lastClose = KLine.HistoryData.hValuesList[KLine.HistoryData.hValuesList.length-1][1];
            }
        }
        
        var byDay = Charts.type=="week"||Charts.type=="month"||Charts.type=="year";
        // 月周年订阅快照，在最后一条数据进行高低收和成交量的更新
        // 高低 进行历史数据的对比
        // 收实时更新
        // 成交量在历史数据基础上累加
        if(byDay&&(k_categoryData[0].toString() == KLine.HistoryData.hCategoryList[KLine.HistoryData.hCategoryList.length-1])){
            var e_open = KLine.HistoryData.hValuesList[KLine.HistoryData.hValuesList.length-1][1],          // 开
                e_highest = (object.High)>KLine.HistoryData.hValuesList[KLine.HistoryData.hValuesList.length-1][3]?(object.High):KLine.HistoryData.hValuesList[KLine.HistoryData.hValuesList.length-1][3],       // 高
                e_lowest = (object.Low)<KLine.HistoryData.hValuesList[KLine.HistoryData.hValuesList.length-1][2]?(object.High):KLine.HistoryData.hValuesList[KLine.HistoryData.hValuesList.length-1][2],         // 低
                e_price = ((Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year")&&(!isHistory))?(object.Last):(object.Price),           // 收盘价
                e_volumnData = Charts.LatestVolume[1]+object.Volume/100;                              // 成交量---单位：手
                // e_volumnData = Charts.LatestVolume[1]+object.Volume;                              // 成交量---单位：股
        }else{
            var e_open = (object.Open),          // 开
                e_highest = (object.High),       // 高
                e_lowest = (object.Low),         // 低
                e_price = ((Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year")&&(!isHistory))?(object.Last):(object.Price),           // 收盘价
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
                ((e_open-KLine.option.lastClose)*100/KLine.option.lastClose),
                ((e_price-KLine.option.lastClose)*100/KLine.option.lastClose),
                ((e_lowest-KLine.option.lastClose)*100/KLine.option.lastClose),
                ((e_highest-KLine.option.lastClose)*100/KLine.option.lastClose)
            ],
            
            e_zValues = KLine.option.lastClose?(e_price-KLine.option.lastClose):0,               // 涨幅-相对昨收      
            e_zValuesPercent = (e_zValues*100/KLine.option.lastClose),              // 涨幅百分比
            e_amplitude = (e_highest - e_lowest),                      // 振幅
            e_amplPercent = (100*e_amplitude/KLine.option.lastClose);               // 振幅百分比
        

        if(isHistory){
            if(e_price-e_open>0){
                e_volume = [i,e_volumnData,1];
            }else if(e_price-e_open<0){
                e_volume = [i,e_volumnData,-1];
            }else{
                if(e_price>KLine.option.lastClose){
                    e_volume = [i,e_volumnData,1];
                }else if(e_price<KLine.option.lastClose){
                    e_volume = [i,e_volumnData,-1];
                }else{
                    e_volume = [i,e_volumnData,0];
                }
            }
            // e_volume = (e_price-e_open)>0?[i,e_volumnData,-1]:((e_price-e_open)==0?[i,e_volumnData,0]:[i,e_volumnData,1]);   // 成交量-数组，存储索引，值，颜色对应的值                         
        }else{
            if(e_price-e_open>0){
                e_volume = [KLine.HistoryData.hVolumesList.length,e_volumnData,1];
            }else if(e_price-e_open<0){
                e_volume = [KLine.HistoryData.hVolumesList.length,e_volumnData,-1];
            }else{
                if(e_price>KLine.option.lastClose){
                    e_volume = [KLine.HistoryData.hVolumesList.length,e_volumnData,1];
                }else if(e_price<KLine.option.lastClose){
                    e_volume = [KLine.HistoryData.hVolumesList.length,e_volumnData,-1];
                }else{
                    e_volume = [KLine.HistoryData.hVolumesList.length,e_volumnData,0];
                }
            }
            // e_volume = (e_price-e_open)>=0?[KLine.HistoryData.hVolumesList.length,e_volumnData,-1]:[KLine.HistoryData.hVolumesList.length,e_volumnData,1];  
        }

        KLine.option.lastClose = e_price;

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
        if(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year"){
            if(KLine.HistoryData.queryTimes==0){
                var index = KLine.HistoryData.hCategoryList.length - dataLength;
            }else{
                var index = KLine.HistoryData.hCategoryList.length -199 - KLine.HistoryData.watchDataCount - 200*(KLine.HistoryData.queryTimes - 1 ) - dataLength;
            }
        }else{
            // 分钟周期K线，第一次查询当日数据，直接计算长度，总长度-数据长度=第一条历史数据索引值
            // 第二次才开始查询历史数据-199条
            // 所以，在第三次以后，以后减去每次200条，和第二次的199条即可
            if(KLine.HistoryData.queryTimes==0){
                var index = KLine.HistoryData.hCategoryList.length -  dataLength;
                KLine.HistoryData.dataLengthToday = dataLength;
            }else if(KLine.HistoryData.queryTimes==1){
                var index = KLine.HistoryData.hCategoryList.length - KLine.HistoryData.dataLengthToday - dataLength - KLine.HistoryData.watchDataCount;
            }else{
                var index = KLine.HistoryData.hCategoryList.length - KLine.HistoryData.dataLengthToday -199 - KLine.HistoryData.watchDataCount - 200*(KLine.HistoryData.queryTimes - 2 ) - dataLength;
            }
        }

        
        $.each(data.volumes,function(i,o){
            o[0] = o[0]+index;
        })
        
        // 将模拟的假数据进行拼接，重新赋值给历史数组
        // KLine.HistoryData.hDate = KLine.HistoryData.hDate.slice(0,index).concat(data.date,KLine.HistoryData.hDate.slice(index+dataLength));
        // KLine.HistoryData.hDay = KLine.HistoryData.hDay.slice(0,index).concat(data.day,KLine.HistoryData.hDay.slice(index+dataLength));
        KLine.HistoryData.hCategoryList = KLine.HistoryData.hCategoryList.slice(0,index).concat(data.categoryData,KLine.HistoryData.hCategoryList.slice(index+dataLength));
        KLine.HistoryData.hValuesList = KLine.HistoryData.hValuesList.slice(0,index).concat(data.values,KLine.HistoryData.hValuesList.slice(index+dataLength));
        KLine.HistoryData.hValuesPercentList = KLine.HistoryData.hValuesPercentList.slice(0,index).concat(data.valuesPercent,KLine.HistoryData.hValuesPercentList.slice(index+dataLength));
        KLine.HistoryData.hVolumesList = KLine.HistoryData.hVolumesList.slice(0,index).concat(data.volumes,KLine.HistoryData.hVolumesList.slice(index+dataLength));
        KLine.HistoryData.hZValuesList = KLine.HistoryData.hZValuesList.slice(0,index).concat(data.zValues,KLine.HistoryData.hZValuesList.slice(index+dataLength));
        KLine.HistoryData.hZValuesListPercent = KLine.HistoryData.hZValuesListPercent.slice(0,index).concat(data.zValuePercent,KLine.HistoryData.hZValuesListPercent.slice(index+dataLength));
        KLine.HistoryData.hZf = KLine.HistoryData.hZf.slice(0,index).concat(data.amplitude,KLine.HistoryData.hZf.slice(index+dataLength));
        KLine.HistoryData.hZfList = KLine.HistoryData.hZfList.slice(0,index).concat(data.amplPercent,KLine.HistoryData.hZfList.slice(index+dataLength));
        KLine.HistoryData.hasHistory = "has data";
        Charts.LatestVolume = KLine.HistoryData.hVolumesList[KLine.HistoryData.hVolumesList.length-1];
    }else{
        var n_category = data.categoryData[0];  // 最后一分钟的时间
        var n_values = data.values[0];          // 要存储的values
        var n_zValues = data.zValues[0];        // 涨跌
        var n_zValuePercent = data.zValuePercent[0]; // 涨跌幅
        var n_volumes = data.volumes[0];            // 成交量
        var n_valuesPercent = data.valuesPercent[0];
        var n_zf = data.amplitude[0];
        var n_zfList = data.amplPercent[0];
        var lastTime = KLine.HistoryData.hCategoryList[KLine.HistoryData.hCategoryList.length-1];
        var last_open = KLine.HistoryData.hValuesList[KLine.HistoryData.hValuesList.length-1][0];
        var last_openPercent = KLine.HistoryData.hValuesPercentList[KLine.HistoryData.hValuesPercentList.length-1][0];
        
        // 停盘订阅的Price返回0，进行处理
        if(n_values[1]==0){
            return false;
        }
        // 最新一条是历史category数据中的最后一条，则更新最后一条数据,否则push到数组里面
        if(n_category.toString() == lastTime){

            n_volumes[0] = n_volumes[0]-1;

            KLine.HistoryData.hValuesList[KLine.HistoryData.hValuesList.length-1] = n_values;
            KLine.HistoryData.hValuesPercentList[KLine.HistoryData.hValuesPercentList.length-1] = n_valuesPercent;
            if(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year"){
                KLine.HistoryData.hValuesList[KLine.HistoryData.hValuesList.length-1][0] = last_open;
                KLine.HistoryData.hValuesPercentList[KLine.HistoryData.hValuesPercentList.length-1][0] = last_openPercent;
            }
            KLine.HistoryData.hVolumesList[KLine.HistoryData.hVolumesList.length-1] = n_volumes;
            KLine.HistoryData.hZValuesList[KLine.HistoryData.hZValuesList.length-1] = n_zValues;
            KLine.HistoryData.hZValuesListPercent[KLine.HistoryData.hZValuesListPercent.length-1] = n_zValuePercent;
            KLine.HistoryData.hZf[KLine.HistoryData.hZf.length-1] = n_zf;
            KLine.HistoryData.hZfList[KLine.HistoryData.hZfList.length-1] = n_zfList;
        }else if(n_category.toString() < lastTime){
            return;
        }else{
            if(!KLine.HistoryData.hasHistory){
                return;
            }
            KLine.HistoryData.watchDataCount++;
            KLine.HistoryData.hCategoryList.push(n_category);
            KLine.HistoryData.hValuesList.push(n_values);
            KLine.HistoryData.hVolumesList.push(n_volumes); 
            KLine.HistoryData.hZValuesList.push(n_zValues);
            KLine.HistoryData.hZValuesListPercent.push(n_zValuePercent);
            KLine.HistoryData.hValuesPercentList.push(n_valuesPercent);
            KLine.HistoryData.hZf.push(n_zf);
            KLine.HistoryData.hZfList.push(n_zfList);
        };
    }
};
// 绘制/画K线图
function chartPaint(isHistory){
    if(isHistory){

        // 第一次请求时，非分钟周期K线不进行绘制，第二次请求才开始绘制
        var dayFirstTime = KLine.HistoryData.queryTimes==0&&(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year");
        var daySecondTime = KLine.HistoryData.queryTimes==1&&(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year");
        
        var minutFirstTime = KLine.HistoryData.queryTimes==0&&!(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year");
        var minutSecondTime = KLine.HistoryData.queryTimes==1&&!(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year");
        
        if(minutFirstTime){  // 第一次查询分钟周期K线时，不绘制图形，而是继续历史数据查询，因为数据较少，避免闪屏
            KLine.HistoryData.queryTimes++;
            KLine.getHistoryKQFirstMinPrev();
            if(Charts.type=="hour"){
                var str = KLine.HistoryData.hCategoryList[0].split(" ")[0];
                var arr = KLine.HistoryData.hCategoryList.slice(0,4);
                
                $.each(arr,function(i,o){
                    // console.log(o.split(" ")[0])
                    if(o.split(" ")[0]==str){
                        KLine.HistoryData.CountNum++;
                    }
                })
            }
            if(KLine.HistoryData.dataLengthToday!=0){
                return;
            }
            
        }else if(dayFirstTime||minutSecondTime){  // 如果是分钟周期K线第二次请求，和日期周期K线第一次请求后，便开始绘制图表
            // 绘制图形前，隐藏动图
            $("#withoutDataK").hide().siblings().show();
            // zoom起始的位置
            if(KLine.HistoryData.hCategoryList.length<30){
                var startZoom = 0;
                var maxValueSpan=100;
                var minValueSpan=20;
            }else{
                var startZoom = (60/KLine.HistoryData.dataLength>=1)?0:Math.ceil(100-80/(KLine.HistoryData.dataLength+10)*100);
                var maxValueSpan=200;
                var minValueSpan=20;
            }
            
            // 绘制K线图
            if(Charts.paitChartsNow){
                return;
            }
            Charts.paitChartsNow = true;
            
            KChart.setOption({
                // backgroundColor: "#fff",
                animation: false,
                tooltip: {
                    trigger: 'axis',
                    formatter: function(params){
                        
                        var open = 0;
                        var close = 0;
                        var low = 0;
                        var high = 0;
                        var zvalue = 0;
                        var volume = 0;
                        var change = 0;
                        var amplitude = 0;
                        var name = "";
                        var setPoint = params[0].dataIndex;;
                        var lastvolume = 0;
     

                        $.each(params,function(index,object){
                            switch(object.seriesName){
                                case "Kline":
                                    open = floatFixedDecimal(object.value[1]);
                                    close = floatFixedDecimal(object.value[2]);
                                    low = floatFixedDecimal(object.value[3]);
                                    high = floatFixedDecimal(object.value[4]);
                                    name = object.name;
                                    break;
                                case "Volume":
                                    volume = object.value[1];
                                    if(volume*100>=100){
                                        //量--单位:手
                                        lastvolume = setUnit(volume)+"手";
                                    }else{
                                        //量--单位:股
                                        lastvolume = volume*100+"股";
                                    }
                                    $(".deal-Vol em").text(floatFixedZero(volume)); //量--单位:手
                                    break;
                                case "MA5":// MA5,MA10,MA20
                                case "MA10":
                                case "MA20":
                                    $("."+object.seriesName+" em").text(floatFixedTwo(object.value[1]));
                                    break;
                                case "MAVOL5":// MA5,MA10,MA20
                                case "MAVOL10":
                                case "MAVOL20":
                                    $("."+object.seriesName+" em").text(floatFixedZero(object.value[1]));
                                    break;
                                case "DIFF": //MACD
                                case "DEA":
                                case "MACD":
                                case "MTM": //MTM
                                case "MAMTM":
                                case "RSI$1": //RSI
                                case "RSI$2":
                                case "RSI$3":
                                case "K": //KDJ
                                case "D":
                                case "J":
                                    var indexName = $(".techIndex-name").text();
                                    if(object.seriesName=="RSI$1"||object.seriesName=="RSI$2"||object.seriesName=="RSI$3"){
                                        $("."+object.seriesName.replace(/\$/gi,"_")+" em").text(parseFloat(object.value[1]).toFixed(fixedDemicalIndex[indexName]));
                                    }else{
                                        $("."+object.seriesName+" em").text(parseFloat(object.value[1]).toFixed(fixedDemicalIndex[indexName]));
                                    }
                                    break;
                            }
                        });

                        
                        // 没有MA数据
                        if( KLine.TechIndexHistoryData.MA.data.length==0||!KLine.TechIndexHistoryData.MA.data[0][setPoint]){
                            $(".kline-MAs span em").text("--");
                        }
                        // 没有MAVOL数据
                        if( KLine.TechIndexHistoryData.MAVOL.data.length==0||!KLine.TechIndexHistoryData.MAVOL.data[0][setPoint]){
                            $(".kline-MAs span em").text("--");
                            $(".deal span:eq(2) em").text("--");
                            $(".deal span:eq(3) em").text("--");
                            $(".deal span:eq(4) em").text("--");
                        }
                        // 没有其他数据
                        if(KLine.TechIndexHistoryData.Others.data.length==0||!KLine.TechIndexHistoryData.Others.data[0][setPoint]){
                            $(".techIndex span:eq(1) em").text("--");
                            $(".techIndex span:eq(2) em").text("--");
                            $(".techIndex span:eq(3) em").text("--");
                        }

                        zvalue = floatFixedDecimal(KLine.HistoryData.hZValuesList[setPoint]);
                        change = 0;
                        amplitude = floatFixedDecimal(KLine.HistoryData.hZf[setPoint]);

                        var time = "";
                        if(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year"){
                            time = (KLine.HistoryData.hTime=="00:00")?"":KLine.HistoryData.hTime;
                        }

                        Charts.mouseHoverPoint = setPoint;
                        
                        if(name=="1997-1-1 一 9:30"){
                            return;
                        }
                        if(!KLine.HistoryData.hValuesList[setPoint]||!KLine.HistoryData.hValuesPercentList[setPoint]){
                            return;
                        }

                        $(".k-date").text(name+" "+time);
                        $(".k-open").text(open+"("+floatFixedTwo(KLine.HistoryData.hValuesPercentList[setPoint][0])+"%)")
                            .attr("class","k-open pull-right "+getColorName(KLine.HistoryData.hValuesPercentList[setPoint][0],0));
                        $(".k-high").text(high+"("+floatFixedTwo(KLine.HistoryData.hValuesPercentList[setPoint][3])+"%)")
                            .attr("class","k-high pull-right "+getColorName(KLine.HistoryData.hValuesPercentList[setPoint][3],0));
                        $(".k-low").text(low+"("+floatFixedTwo(KLine.HistoryData.hValuesPercentList[setPoint][2])+"%)")
                            .attr("class","k-low pull-right "+getColorName(KLine.HistoryData.hValuesPercentList[setPoint][2],0));
                        $(".k-price").text(close+"("+floatFixedTwo(KLine.HistoryData.hValuesPercentList[setPoint][1])+"%)")
                            .attr("class","k-price pull-right "+getColorName(KLine.HistoryData.hValuesPercentList[setPoint][1],0));
                        $(".k-z-value").text(zvalue+"("+floatFixedTwo(KLine.HistoryData.hZValuesListPercent[setPoint])+"%)")
                            .attr("class","k-z-value pull-right "+getColorName(KLine.HistoryData.hZValuesList[setPoint],0));
                        $(".k-volume").text(lastvolume);
                        $(".k-amplitude").text(amplitude+"("+floatFixedTwo(KLine.HistoryData.hZfList[setPoint])+"%)");
                    },
                    // position: function (point, params) {
                    //     var offsetX = point[0];
                    //     var continerWidth = $("#kline_charts").width();
                    //     var centerX = continerWidth / 2;
                    //     // console.log(offsetX,centerX)
                    //     if (offsetX-13 > centerX) {
                    //         $("#kline_tooltip").css("left", 83/830*continerWidth);
                    //     } else {
                    //         $("#kline_tooltip").css({"left":"auto","right":83/830*continerWidth});
                    //     }
                    //     // console.log(point, params);
                    // }
                },
                hoverLayerThreshold:10,
                axisPointer: {
                    link: {xAxisIndex: 'all'},
                    label: {
                        backgroundColor: '#555' ,
                    },
                    type: 'line',
                    lineStyle:{
                        type: 'dotted',
                        color: '#000'
                    },
                    show:true,
                    triggerTooltip:false,
                },
                grid: [
                    {
                        top: "7%",
                        height: '45.8%'
                    },
                    {
                        top: '61.7%',
                        height: '9.2%'
                    },
                    {
                        top:'75.4%',
                        height:'9.2%',
                    }
                ],
                dataZoom: [
                    {
                        show: true,
                        xAxisIndex: [0],
                        type: 'slider',
                        top: '91.5%',
                        handleIcon: 'path://M306.1,413c0,2.2-1.8,4-4,4h-59.8c-2.2,0-4-1.8-4-4V200.8c0-2.2,1.8-4,4-4h59.8c2.2,0,4,1.8,4,4V413z',
                        handleSize:'100%',
                        handleStyle:{
                            color:"#f2f2f2",
                            borderColor: "#b4b4b4"
                        },
                        dataBackground: {
                            lineStyle: {
                                color: "rgba(0,0,0,1)"
                            },
                            areaStyle: {
                                color: "rgba(0,0,0,0)"
                            }
                        },
                        maxValueSpan: maxValueSpan,
                        minValueSpan: minValueSpan,
                        labelFormatter: function (valueStr) {
                            if(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year"){
                                if(KLine.HistoryData.hCategoryList[valueStr]){
                                    var valueList = KLine.HistoryData.hCategoryList[valueStr].split(" ");
                                    return valueList[0];
                                }
                            }else{
                                if(KLine.HistoryData.hCategoryList[valueStr]){
                                    var valueList = KLine.HistoryData.hCategoryList[valueStr].split(" ");
                                    return valueList[valueList.length-1];
                                }
                            }

                        },
                        showDetail: true
                    },
                    {
                        type: 'inside',
                        xAxisIndex: [0, 1, 2],
                        maxValueSpan: maxValueSpan,
                        minValueSpan: minValueSpan
                    },
                ],
                xAxis: [
                    {
                        type: 'category',
                        data: KLine.HistoryData.hCategoryList,
                        scale: true,
                        boundaryGap: false,
                        axisTick:{ show:false },
                        axisLine: { show:false },
                        splitLine: { show: false },
                        axisLabel: { show: false },
                        axisPointer: {
                            show:true,
                            label: {
                                show:true,
                                formatter: function(params){
                                    return params.value.replace(/-/g,"/");
                                }
                            }
                        }

                    },
                    {
                        type: 'category',
                        gridIndex: 1,
                        data: KLine.HistoryData.hCategoryList,
                        scale: true,
                        axisTick: { show:false },
                        boundaryGap: false,
                        axisLine: { show: false},
                        axisLabel: { show: false },
                        splitLine: { show: false },
                        axisPointer: {
                            label: {
                                show:false
                            }
                        }
                    },
                    {
                        type: 'category',
                        gridIndex: 2,
                        data: KLine.HistoryData.hCategoryList,
                        scale: true,
                        boundaryGap: false,
                        axisTick: { show:false },
                        // boundaryGap: true,
                        axisLine: { 
                            show: true,
                            lineStyle: {
                                color: '#efefef'
                            }
                         },
                        axisLabel: { show: false },
                        splitLine: { show: false },
                        axisPointer: {
                            label: {
                                show:false
                            }
                        }
                    }
                ],
                yAxis: [
                    {
                        scale: true,
                        splitNumber: 3,
                        splitArea: { show: false },
                        axisTick:{ show:false },
                        axisLine: { show: false },
                        splitLine: {
                            show: true,
                            lineStyle: {
                                color: '#efefef'
                            }
                        },
                        axisLabel: {
                            show: true,
                            color: '#000',
                            fontSize: 12,
                            formatter: function (value, index) {
                                return (value).toFixed(StockInfo.decimal);
                            }
                        },
                        axisPointer: {
                            show:true,
                            label: {
                                show:true,
                                formatter: function(params){
                                    return params.value.toFixed(StockInfo.decimal);
                                }
                            }
                        }
                    },
                    {
                        scale: true,
                        gridIndex: 1,
                        // min: 0,
                        axisTick:{ show:false },
                        axisLabel: {
                            show: true,
                            color: '#000',
                            fontSize: 14,
                            formatter: function (value, index) {
                                var data = setUnit(value,null,true,true);
                                $(".volumeKMax").text(floatFixedZero(data.value));
                                $(".vol-Kunit").text(data.unit);
                            }
                        },
                        axisLine: { 
                            show: true,
                            inZero: true,
                            lineStyle: {
                                color: '#efefef'
                            }
                        },
                        splitNumber: 2,
                        splitLine: {
                            show: true,
                            lineStyle: {
                                color: '#efefef'
                            }
                        }
                    },
                    {
                        scale: true,
                        gridIndex: 2,
                        axisTick:{ show:false },
                        axisLabel: {
                            show: false,
                            color: '#333',
                            fontSize: 12
                        },
                        axisLine: { 
                            show: true,
                            inZero: false,
                            lineStyle: {
                                color: '#e5e5e5'
                            }
                        },
                        min: function(value) {
                            
                            if(value.max!=-Infinity){
                                

                                if(KLine.TechIndexHistoryData.Others.name=="MACD"){
                                    var min = Math.abs(value.min);
                                    var max = Math.abs(value.max);
                                    if(Math.abs(max)>=Math.abs(min)){
                                        min = -max;
                                    }else{
                                        max = -min;
                                    }
                                }else{
                                    min = value.min;
                                    max = value.max;
                                }
                                Charts.VMmax = max;
                                Charts.VMmin = min;
                                $(".vmMin").html(floatFixedDecimal(min));
                                $(".vmMax").html(floatFixedDecimal(max));
                                return Charts.VMmin;
                            }
                        },
                        max: function(value) {
                                return Charts.VMmax;
                        },
                        splitLine: { show: false },
                        
                    }
                ],
                series: [
                    {
                        name: 'Kline',
                        type: 'candlestick',
                        showSymbol: false,
                        itemStyle: {
                            normal: {
                                color: '#e22f2a',
                                color0: '#3bc25b',
                                borderColor: null,
                                borderColor0: null,
                                colorD:"#666",
                                borderColorD: null,
                            },
                            emphasis:{
                                    borderColor: null,
                                    borderColor0: null,
                                    borderWidth: 1,
                                    shadowBlur: 0,
                                    opacity:0
                            },
                        },
                        
                        barMaxWidth: 20,
                        data: KLine.HistoryData.hValuesList,
                        markPoint: {
                            symbolSize: 20,
                            data: [
                                {
                                    name: 'highest value',
                                    type: 'max',
                                    valueDim: 'highest',
                                    label: {
                                        normal: {
                                            position: 'insideBottomLeft',
                                            color: "#555",
                                            fontSize: 14,
                                            offset: [10,20]
                                        }
                                    },
                                    itemStyle: {
                                        normal:{
                                            color: "rgba(0,0,0,0)"
                                        }
                                    }
                                },
                                {
                                    name: 'lowest value',
                                    type: 'min',
                                    valueDim: 'lowest',
                                    label: {
                                        normal: {
                                            position: 'insideTopLeft',
                                            color: "#555",
                                            fontSize: 14,
                                            offset: [10,10]
                                        }
                                    },
                                    itemStyle: {
                                        normal:{
                                            color: "rgba(0,0,0,0)"
                                        }
                                    }
                                }
                            ]
                        },
                        z: 1,

                    },
                    {
                        name: 'MA5', // MA5
                        type: 'line',
                        data: KLine.TechIndexHistoryData.MA.data[0], 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList.MA[0]
                            }
                        },
                        symbol: 'none',
                        z:2,
                        connectNulls:false
                    },
                    {
                        name: 'MA10', // MA10
                        type: 'line',
                        data: KLine.TechIndexHistoryData.MA.data[1], 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList.MA[1]
                            }
                        },
                        symbol: 'none',
                        z:2,
                    },
                    {
                        name: 'MA20', // MA20
                        type: 'line',
                        data: KLine.TechIndexHistoryData.MA.data[2], 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList.MA[2]
                            }
                        },
                        symbol: 'none',
                        z:2,
                    },
                    {
                        name: 'Volume',
                        type: 'bar',
                        xAxisIndex: 1,
                        yAxisIndex: 1,
                        data: KLine.HistoryData.hVolumesList,
                        itemStyle: {
                            normal: {
                                borderWidth: 0.5,
                                color:  function(param){
                                            switch(param.data[2]){
                                                case 0:
                                                    return "#fff";
                                                    break;
                                                case 1:
                                                    return "#e22f2a";
                                                    break;
                                                case -1:
                                                    return "#3bc25b";
                                                    break;
                                                default:
                                                    break;
                                            }
                                        },
                                borderColor: "#666"
                            },
                            
                        },
                        barMaxWidth: 20,
                        z:1
                    },
                    {
                        name: 'MAVOL5', // MAVOL5
                        type: 'line',
                        xAxisIndex: 1,
                        yAxisIndex: 1,
                        data: KLine.TechIndexHistoryData.MAVOL.data[0], 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList.MAVOL[0]
                            }
                        },
                        symbol: 'none',
                        z:2,
                    },
                    {
                        name: 'MAVOL10', // MAVOL10
                        type: 'line',
                        xAxisIndex: 1,
                        yAxisIndex: 1,
                        data: KLine.TechIndexHistoryData.MAVOL.data[1], 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList.MAVOL[1]
                            }
                        },
                        symbol: 'none',
                        z:2,
                    },
                    {
                        name: 'MAVOL20', // MAVOL20
                        type: 'line',
                        xAxisIndex: 1,
                        yAxisIndex: 1,
                        data: KLine.TechIndexHistoryData.MAVOL.data[2], 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList.MAVOL[2]
                            }
                        },
                        symbol: 'none',
                        z:2,
                    },
                    {
                        name: Names[KLine.TechIndexHistoryData.Others.name]?Names[KLine.TechIndexHistoryData.Others.name][0]:"", // Others0
                        type: 'line',
                        xAxisIndex: 2,
                        yAxisIndex: 2,
                        data: null, 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                            }
                        },
                        symbol: 'none',
                    },
                    {
                        name: Names[KLine.TechIndexHistoryData.Others.name]?Names[KLine.TechIndexHistoryData.Others.name][1]:"", // Others1
                        type: 'line',
                        xAxisIndex: 2,
                        yAxisIndex: 2,
                        data: null, 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5'
                            }
                        },
                        symbol: 'none',
                    },
                    {
                        name: Names[KLine.TechIndexHistoryData.Others.name]?Names[KLine.TechIndexHistoryData.Others.name][2]:"", // Others2
                        type: 'line',
                        xAxisIndex: 2,
                        yAxisIndex: 2,
                        data: null, 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                            }
                        },
                        symbol: 'none',
                    }
                ]
            });
            
            Charts.paitChartsNow = false;
            $(".kline-buttons span").unbind("click");
            // 量比等指标的点击
            $(".kline-buttons span").on('click',function(){
                if(Charts.oldIndexNameOthers&&Charts.oldIndexNameOthers!=""){
                    //更新订阅的参数
                    var indexOthersOptions = getQueryTechIndexMsg(Charts.type,Charts.oldIndexNameOthers);
                    KLine.option.KWatchCCIndexOthers = $.extend({}, KLine.option.KWatchCCIndexOthers, { Instrumenttype: "51-"+indexOthersOptions.Period+"-"+indexOthersOptions.IndexID });
                    KLine.getKWatchCCIndexOthers();
                    // 清空技术指标数据
                    $.each(KLine.TechIndexHistoryData,function(index,object){
                        
                        if(index=="Others"){
                            object.queryTimes = 0;
                        
                            if(object.data instanceof Array){
                                KLine.TechIndexHistoryData[index].data = [];
                            }
                        }
                        
                    });
                }
                KLine.TechIndexHistoryData.Others.name = $(this).text();
                KLine.TechIndexHistoryData.Others.queryTimes = 0;
                KLine.TechIndexHistoryData.Others.data = [];
                $(".vmMax").html("");
                $(".vmMin").html("");
                // 高亮按钮
                $(this).addClass("active").end();
                $(this).siblings().removeClass("active");
                Charts.myTechIndexNumber = $(this).index();
                //无-按钮
                if($(this).index()==0){
                    Charts.myIndexClick = 0;
                    // 绘制K线图
                    if(Charts.paitChartsNow){
                        return;
                    }
                    Charts.paitChartsNow = true;
                    KChart.setOption({
                        grid: [
                            {
                                top: "7%",
                                height: '60%'
                            },
                            {
                                top: '76.7%',
                                height: '9.2%'
                            },
                            {
                                top: '200%',
                                height: '0'
                            }
                        ],
                        series: [
                            {
                                name: 'Kline',
                                type: 'candlestick',
                                data: KLine.HistoryData.hValuesList,
                            },
                            {
                                name: 'MA5',
                                type: 'line',
                                data: KLine.TechIndexHistoryData.MA.data[0], // MA5
                                connectNulls:false
                            },
                            {
                                name: 'MA10',
                                type: 'line',
                                data: KLine.TechIndexHistoryData.MA.data[1], // MA10
                                connectNulls:false
                            },
                            {
                                name: 'MA20',
                                type: 'line',
                                data: KLine.TechIndexHistoryData.MA.data[2], // MA20
                                connectNulls:false
                            },
                            {
                                name: 'Volume',
                                type: 'bar',
                                data: KLine.HistoryData.hVolumesList,
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
                    $(".techIndex,.volMacd").hide();
                    $(".deal").css("top","67%");
                    $(".volumnKline").css("top","76%");
                    KLine.TechIndexHistoryData.Others.stopQuery = false;
                }else{
                    Charts.myIndexClick++;
                    // 指标示数
                    var NameR = $(this).text();

                    if(Names[NameR]){
                        var html = "<span class='techIndex-name'>"+NameR+"</span>";
                        $.each(Names[NameR],function(index,object){
                            if(NameR=="RSI"){
                                html += "<span class='"+object.replace(/\$/gi,"_")+"'>"+object+": <em>--</em></span>";
                            }else{
                                html += "<span class='"+object+"'>"+object+": <em>--</em></span>";
                            }
                        });
                        $(".techIndex").html(html);
                    }
                    
                    try{
                        KLine.TechIndexHistoryData.Others.stopQuery = false;
                        if((Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year")){
                            KLine['getTechIndexKQFirstDayPrev'+NameR]();
                        }else{
                            KLine['getTechIndexKQAllMinToday'+NameR]();
                        }
                        
                        //更新订阅的参数
                        var indexOptions = getQueryTechIndexMsg(Charts.type,NameR);
                        KLine.option.KWatchIndexOthers = $.extend({}, KLine.option.KWatchIndexOthers, { Instrumenttype: "51-"+indexOptions.Period+"-"+indexOptions.IndexID });
                        if(!(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year")){
                            KLine.getKWatchIndexOthers();
                        }
                        Charts.oldIndexNameOthers = NameR;
                    }catch(e){
                        console.warn(e,"还没有此项数据");
                    }
                    
                }
                
            });
            /* 
             * 日期周期K线在进行查询时就已经是查询历史数据了，所以对应正常的查询次数queryTimes，queryTimes自增后更新            
             * 分钟周期K线的查询，第一次是当天的数据，而历史数据是从前一个交易日开始算的，在queryTimes查询数据次数更新前更新查询参数
             */
            // 更新分钟周期K线请求参数
            KLine.option.HistoryKQAllMinPrev = $.extend({},KLine.option.HistoryKQAllMinPrev,{StartIndex:"-"+KLine.HistoryData.queryTimes*200});
            // 查询次数增加
            KLine.HistoryData.queryTimes++;
            // 更新日期周期K线请求参数
            KLine.option.HistoryKQAllDayPrev = $.extend({},KLine.option.HistoryKQAllDayPrev,{StartIndex:"-"+KLine.HistoryData.queryTimes*200});
            
            
            // 开始查询历史数据
            if(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year"){
                KLine.getHistoryKQAllDayPrev();
                // 指标
                // 查询当天数据
                KLine.getTechIndexKQFirstDayPrevMA();
                // 查询历史数据
                // 查询MA MAVOL
                KLine.getTechIndexKQFirstDayPrevMAVOL();
            }else{
                KLine.getHistoryKQAllMinPrev();
                // 指标
                // 查询当天数据
                KLine.getTechIndexKQAllMinTodayMA();
                // 查询历史数据
                // 查询MAVOL
                KLine.getTechIndexKQAllMinTodayMAVOL();
            }

            Charts.start = startZoom;
            KChart.dispatchAction({
                type: 'dataZoom',
                // 开始位置的百分比，0 - 100
                start: startZoom,
                // 结束位置的百分比，0 - 100
                end: 100
            });
            // 一进页面，查询某一根指标线
            if(Charts.myIndexClick==0){
                $(".kline-buttons span:eq(0)").click();
            }else{
                setTimeout(function(){
                    clearTimeout(Charts.indexTimer);
                    $(".kline-buttons span:eq("+Charts.myTechIndexNumber+")").click();
                },100);
            }
            // KChart.off('dataZoom');
            
            
            
            
        }else{
            // 绘制K线图
            setChartData(); // 更新图表数据

            var isLastQuery;
            var beforeLastQuery;
            var todayData = 0;
            var nextQueryTime;
            var lastQueryTime;
            
            // 更新分钟周期K线数据查询参数
            KLine.option.HistoryKQAllMinPrev = $.extend({},KLine.option.HistoryKQAllMinPrev,{StartIndex:"-"+KLine.HistoryData.queryTimes*200});
            // queryTimes查询数据次数更新
            KLine.HistoryData.queryTimes++;
            // 更新日、周、月、年数据查询参数
            KLine.option.HistoryKQAllDayPrev = $.extend({},KLine.option.HistoryKQAllDayPrev,{StartIndex:"-"+KLine.HistoryData.queryTimes*200});
            
            if(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year"){
                // 当前查询后蜡烛总数目是否超过规定数据，前一次查询是否小于规定数目，满足条件即为最后一次查询
                nextQueryTime = KLine.HistoryData.queryTimes+1;
                lastQueryTime = KLine.HistoryData.queryTimes;
                
                isLastQuery = todayData + nextQueryTime*200>=KLine.HistoryData.dataLength;
                beforeLastQuery = todayData + lastQueryTime*200 < KLine.HistoryData.dataLength;
                if(isLastQuery&&beforeLastQuery){
                    var count = KLine.HistoryData.dataLength + 1 - lastQueryTime*200+"";
                    KLine.option.HistoryKQAllDayPrev = $.extend({},KLine.option.HistoryKQAllDayPrev,{Count: count});
                    if(!KLine.HistoryData.stopQuery){
                        KLine.getHistoryKQAllDayPrev();
                    }
                    // 最后一次查询标志
                    KLine.HistoryData.stopQuery = true;
                }
                if(!KLine.HistoryData.stopQuery){
                    KLine.getHistoryKQAllDayPrev();
                }
            }else{
                // 当前查询后蜡烛总数目是否超过规定数据，前一次查询是否小于规定数目，满足条件即为最后一次查询
                todayData = KLine.HistoryData.dataLengthToday;
                nextQueryTime = KLine.HistoryData.queryTimes;
                lastQueryTime = KLine.HistoryData.queryTimes-1;

                isLastQuery = todayData + nextQueryTime*200>=KLine.HistoryData.dataLength;
                beforeLastQuery = todayData + lastQueryTime*200 < KLine.HistoryData.dataLength;
                if(isLastQuery&&beforeLastQuery){
                    var count = KLine.HistoryData.dataLength + 1 - todayData - lastQueryTime*200 + "";
                    KLine.option.HistoryKQAllMinPrev = $.extend({},KLine.option.HistoryKQAllMinPrev,{Count: count});
                    if(!KLine.HistoryData.stopQuery){
                        KLine.getHistoryKQAllMinPrev();
                    }
                    // 最后一次查询标志
                    KLine.HistoryData.stopQuery = true;
                }
                if(!KLine.HistoryData.stopQuery){
                    KLine.getHistoryKQAllMinPrev();
                }
            }
            
        }
        // K线前一根柱子的收盘价
        KLine.option.lastClose = 0; 
    }else{
        // 初始化并显示数据栏和数据信息框的信息
        if(KChart.getOption()&&KChart.getOption().series.length!=0){
            setChartData(); // 更新图表数据
        }
         
    }
};

// 技术指标
function TechIndexLines(dataList, isHistory){
    if(dataList){
        // 解析并存储数据
        var msgInfoObj = saveTechIndex(dataList, isHistory); 
        // 继续下一步查询指标
        if(isHistory){
            getTechIndexMore(msgInfoObj.msgName,msgInfoObj.dataName);
        }
    }
}
// 解析并存储-指标数据
function saveTechIndex(dataList, isHistory) {
    var msgInfo = {
        msgName:null,
        dataName: null
    }
    var msgName = ""; 
    var week = ["日","一","二","三","四","五","六"];
    // 遍历json，将它们push进不同的数组
    $.each(dataList,function(index,object){
        msgInfo.msgName = getQueryTechIndexName(object.IndexID+"").msgName;
        msgInfo.dataName = getQueryTechIndexName(object.IndexID+"").dataName;

        if(!KLine.TechIndexHistoryData[msgInfo.dataName]) return;

        if(!KLine.TechIndexHistoryData[msgInfo.dataName].data[0]){
        //  if(KLine.TechIndexHistoryData[msgInfo.dataName].queryTimes==0){
            for(var i=0;i<object.OutCount;i++){
                KLine.TechIndexHistoryData[msgInfo.dataName].data.push([]);
            }
        }
        if(isHistory){ // 数据长度不为0
            if(object.RecordCount&&object.RecordCount!=0){
                $.each(object.TechIndexInfo,function(i,o){
                    
                    if(o.Date==-1) return;
                    $.each(o.DATA,function(dataIndex,data){
                        // 按照坐标轴的顺序写进去
                        if(data.ITEM){
                            var tn_date = formatDateSplit(o.Date),                 // 当天日期
                                tn_day = week[(new Date(tn_date)).getDay()],        // 计算星期
                                tn_time;  

                            if(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year"){
                                KLine.HistoryData.hTime = formatTime((o.Time/100000>=1)?o.Time:("0"+o.Time));
                                tn_time = tn_date + " " + tn_day;
                            }else{
                                tn_time = tn_date + " " + tn_day + " " + formatTime((o.Time/100000>=1)?o.Time:("0"+o.Time));
                            }
                            var index = KLine.HistoryData.hCategoryList.indexOf(tn_time);
                            if(index<0) return;
                            if(data.ITEM=="-999999.0") return;
                            if(msgInfo.msgName=="MAVOL"){
                                KLine.TechIndexHistoryData[msgInfo.dataName].data[dataIndex][index] = [tn_time,data.ITEM/100];
                            }else{
                                KLine.TechIndexHistoryData[msgInfo.dataName].data[dataIndex][index] = [tn_time,data.ITEM];
                            }
                            
                        }
                        
                    });
                    
                });
            }
        }else{ // 数据长度不为0
            $.each(object.TechIndex,function(dataIndex,data){
                // 按照坐标轴的顺序写进去
                if(data.ITEM){
                    var tn_date = formatDateSplit(object.Date),                 // 当天日期
                        tn_day = week[(new Date(tn_date)).getDay()],        // 计算星期
                        tn_time;  

                    if(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year"){
                        KLine.HistoryData.hTime = formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
                        tn_time = tn_date + " " + tn_day;
                    }else{
                        tn_time = tn_date + " " + tn_day + " " + formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
                    } 
                    var n_category = KLine.HistoryData.hCategoryList[KLine.HistoryData.hCategoryList.length-1];
                    if(n_category&&n_category.toString() < tn_time){
                        return;
                    }
                    // 订阅的最后一条
                    var dataListIndex = KLine.TechIndexHistoryData[msgInfo.dataName].data[dataIndex];
                    if(dataListIndex.length>0){
                        
                        if(dataListIndex[dataListIndex.length-1]){
                            if(data.ITEM=="-999999.0"){return;}
                            if(tn_time==dataListIndex[dataListIndex.length-1][0]){
                                if(msgInfo.msgName=="MAVOL"){
                                    dataListIndex[dataListIndex.length-1] = [tn_time,data.ITEM/100];
                                }else{
                                    dataListIndex[dataListIndex.length-1] = [tn_time,data.ITEM];
                                }
                            }else{
                                if(msgInfo.msgName=="MAVOL"){
                                    KLine.TechIndexHistoryData[msgInfo.dataName].data[dataIndex].push([tn_time,data.ITEM/100]);
                                }else{
                                    KLine.TechIndexHistoryData[msgInfo.dataName].data[dataIndex].push([tn_time,data.ITEM]);
                                }
                            }
                        }
                    }
                    
                }
                
            });
        }
    });
    
    // 返回指标线图所需数据对象
    return msgInfo;
};
// 进行下一次查询
function getTechIndexMore(msgName,dataName){

    if(!KLine.TechIndexHistoryData[dataName]) return false;

    // 第一次请求时，非分钟周期K线不进行绘制，第二次请求才开始绘制
    var dayFirstTime = KLine.TechIndexHistoryData[dataName].queryTimes==0&&(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year");
    var daySecondTime = KLine.TechIndexHistoryData[dataName].queryTimes==1&&(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year");
    
    var minutFirstTime = KLine.TechIndexHistoryData[dataName].queryTimes==0&&!(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year");
    var minutSecondTime = KLine.TechIndexHistoryData[dataName].queryTimes==1&&!(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year");
    
    if(minutFirstTime){  // 第一次查询分钟周期K线时，不绘制图形，而是继续历史数据查询，因为数据较少，避免闪屏
        KLine.TechIndexHistoryData[dataName].queryTimes++;
        var funcName = "getTechIndexKQFirstMinPrev"+msgName;
        KLine[funcName]();
        if(KLine.TechIndexHistoryData[dataName].dataLengthToday!=0){
            return;
        }
        if(msgName=="MA"){
            KLine.getKWatchIndexMA_VOL(); // 订阅当前日期K线+分钟K线
        }
        // Charts.myTechIndexNumber!=0 判断已经点击了指标查询
        if(Charts.myTechIndexNumber!=0 && KLine.TechIndexHistoryData.Others.name){
            if(Charts.paitChartsNow){
                return;
            }
            Charts.paitChartsNow = true;
            KChart.setOption({
                grid: [
                    {
                        top: "7%",
                        height: '45.8%'
                    },
                    {
                        top: '61.7%',
                        height: '9.2%'
                    },
                    {
                        top:'75.4%',
                        height:'9.2%',
                    }
                ],
                series: [
                    {
                        name: "Kline",
                        data: KLine.HistoryData.hValuesList,
                    },
                    {
                        name: "MA5",
                        data: KLine.TechIndexHistoryData.MA.data[0], // MA5
                        connectNulls:false
                    },
                    {
                        name: "MA10",
                        data: KLine.TechIndexHistoryData.MA.data[1], // MA10
                    },
                    {
                        name: "MA20",
                        data: KLine.TechIndexHistoryData.MA.data[2], // MA20
                    },
                    {
                        name: "Volume",
                        data: KLine.HistoryData.hVolumesList,
                    },
                    {
                        name: "MAVOL5",
                        data: KLine.TechIndexHistoryData.MAVOL.data[0]?KLine.TechIndexHistoryData.MAVOL.data[0]:null, // MAVOL5
                    },
                    {
                        name: "MAVOL10",
                        data: KLine.TechIndexHistoryData.MAVOL.data[1]?KLine.TechIndexHistoryData.MAVOL.data[1]:null, // MAVOL10
                    },
                    {
                        name: "MAVOL20",
                        data: KLine.TechIndexHistoryData.MAVOL.data[2]?KLine.TechIndexHistoryData.MAVOL.data[2]:null, // MAVOL20
                    },
                    {
                        name: Names[KLine.TechIndexHistoryData.Others.name]&&Names[KLine.TechIndexHistoryData.Others.name][0]?Names[KLine.TechIndexHistoryData.Others.name][0]:"", // Others0
                        type: chartTypes[KLine.TechIndexHistoryData.Others.name][0],
                        xAxisIndex: 2,
                        yAxisIndex: 2,
                        data: KLine.TechIndexHistoryData.Others.data[0], // Others0
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList[KLine.TechIndexHistoryData.Others.name][0],
                            }
                        },
                        smooth: false,
                        symbol: 'none',
                    },
                    {
                        name: Names[KLine.TechIndexHistoryData.Others.name]&&Names[KLine.TechIndexHistoryData.Others.name][1]?Names[KLine.TechIndexHistoryData.Others.name][1]:"", // Others1
                        type: chartTypes[KLine.TechIndexHistoryData.Others.name][1],
                        xAxisIndex: 2,
                        yAxisIndex: 2,
                        data: KLine.TechIndexHistoryData.Others.data[1], // Others1
                        lineStyle: {
                            normal:{
                                color: KColorList[KLine.TechIndexHistoryData.Others.name][1],
                            }
                        },
                        smooth: false,
                        symbol: 'none',
                    },
                    {
                        name: Names[KLine.TechIndexHistoryData.Others.name]&&Names[KLine.TechIndexHistoryData.Others.name][2]?Names[KLine.TechIndexHistoryData.Others.name][2]:"", // Others2
                        type: chartTypes[KLine.TechIndexHistoryData.Others.name][2]?chartTypes[KLine.TechIndexHistoryData.Others.name][2]:'line',
                        xAxisIndex: 2,
                        yAxisIndex: 2,
                        data: KLine.TechIndexHistoryData.Others.data[2]?KLine.TechIndexHistoryData.Others.data[2]:null, // Others2
                        lineStyle: {
                            normal:{
                                color: KColorList[KLine.TechIndexHistoryData.Others.name][2]?KColorList[KLine.TechIndexHistoryData.Others.name][2]:'',
                            }
                        },
                        smooth: false,
                        symbol: 'none',
                        itemStyle: {
                            normal: {
                                borderWidth: 0,
                                color:  function(param){
                                            if(KLine.TechIndexHistoryData.Others.name=="无"){
                                                return false;
                                            }
                                            if(param.data[1]>=0){
                                                return KColorList[KLine.TechIndexHistoryData.Others.name][2]
                                            }else{
                                                return KColorList[KLine.TechIndexHistoryData.Others.name][3]
                                            }
                                        }
                            },
                        },
                        barMaxWidth: 1.5,
                    }
                ]
            });
            Charts.paitChartsNow = false;
            $(".deal").css("top","52.1%");
            $(".volumnKline").css("top","60.5%");
            $(".techIndex,.volMacd").show();
        }
        
        
    }else if(dayFirstTime||minutSecondTime){  // 如果是分钟周期K线第二次请求，和日期周期K线第一次请求后，便开始绘制图表
        /* 
         * 日期周期K线在进行查询时就已经是查询历史数据了，所以对应正常的查询次数queryTimes，queryTimes自增后更新            
         * 分钟周期K线的查询，第一次是当天的数据，而历史数据是从前一个交易日开始算的，在queryTimes查询数据次数更新前更新查询参数
         */
        // 更新分钟周期K线指标请求参数
        KLine.option.TechIndexOption['TechIndexKQAllMinPrev'+msgName] = $.extend({},KLine.option.TechIndexOption['TechIndexKQAllMinPrev'+msgName],{StartIndex:"-"+KLine.TechIndexHistoryData[dataName].queryTimes*200});
        // 查询次数增加
        KLine.TechIndexHistoryData[dataName].queryTimes++;
        // 更新日期周期K线请求参数
        KLine.option.TechIndexOption['TechIndexKQAllDayPrev'+msgName] = $.extend({},KLine.option.TechIndexOption['TechIndexKQAllDayPrev'+msgName],{StartIndex:"-"+KLine.TechIndexHistoryData[dataName].queryTimes*200});
        
        // 开始查询历史数据
        if(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year"){
            var funcName = "getTechIndexKQAllDayPrev"+msgName;
            KLine[funcName]();
        }else{
            var funcName = "getTechIndexKQAllMinPrev"+msgName;
            KLine[funcName]();
        }
        if(dayFirstTime&&msgName=="MA"){
            KLine.getKWatchIndexMA_VOL(); // 订阅当前日期K线+分钟K线
        }
        // Charts.myTechIndexNumber!=0 判断已经点击了指标查询
        if(dayFirstTime&&Charts.myTechIndexNumber!=0 && KLine.TechIndexHistoryData.Others.name){
            if(Charts.paitChartsNow){
                return;
            }
            Charts.paitChartsNow = true;
            KChart.setOption({
                grid: [
                    {
                        top: "7%",
                        height: '45.8%'
                    },
                    {
                        top: '61.7%',
                        height: '9.2%'
                    },
                    {
                        top:'75.4%',
                        height:'9.2%',
                    }
                ],
                series: [
                    {
                        name: "Kline",
                        data: KLine.HistoryData.hValuesList,
                    },
                    {
                        name: "MA5",
                        data: KLine.TechIndexHistoryData.MA.data[0], // MA5
                        connectNulls:false
                    },
                    {
                        name: "MA10",
                        data: KLine.TechIndexHistoryData.MA.data[1], // MA10
                    },
                    {
                        name: "MA20",
                        data: KLine.TechIndexHistoryData.MA.data[2], // MA20
                    },
                    {
                        name: "Volume",
                        data: KLine.HistoryData.hVolumesList,
                    },
                    {
                        name: "MAVOL5",
                        data: KLine.TechIndexHistoryData.MAVOL.data[0]?KLine.TechIndexHistoryData.MAVOL.data[0]:null, // MAVOL5
                    },
                    {
                        name: "MAVOL10",
                        data: KLine.TechIndexHistoryData.MAVOL.data[1]?KLine.TechIndexHistoryData.MAVOL.data[1]:null, // MAVOL10
                    },
                    {
                        name: "MAVOL20",
                        data: KLine.TechIndexHistoryData.MAVOL.data[2]?KLine.TechIndexHistoryData.MAVOL.data[2]:null, // MAVOL20
                    },
                    {
                        name: Names[KLine.TechIndexHistoryData.Others.name]&&Names[KLine.TechIndexHistoryData.Others.name][0]?Names[KLine.TechIndexHistoryData.Others.name][0]:"", // Others0
                        type: chartTypes[KLine.TechIndexHistoryData.Others.name][0],
                        xAxisIndex: 2,
                        yAxisIndex: 2,
                        data: KLine.TechIndexHistoryData.Others.data[0], // Others0
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList[KLine.TechIndexHistoryData.Others.name][0],
                            }
                        },
                        smooth: false,
                        symbol: 'none',
                    },
                    {
                        name: Names[KLine.TechIndexHistoryData.Others.name]&&Names[KLine.TechIndexHistoryData.Others.name][1]?Names[KLine.TechIndexHistoryData.Others.name][1]:"", // Others1
                        type: chartTypes[KLine.TechIndexHistoryData.Others.name][1],
                        xAxisIndex: 2,
                        yAxisIndex: 2,
                        data: KLine.TechIndexHistoryData.Others.data[1], // Others1
                        lineStyle: {
                            normal:{
                                color: KColorList[KLine.TechIndexHistoryData.Others.name][1],
                            }
                        },
                        smooth: false,
                        symbol: 'none',
                    },
                    {
                        name: Names[KLine.TechIndexHistoryData.Others.name]&&Names[KLine.TechIndexHistoryData.Others.name][2]?Names[KLine.TechIndexHistoryData.Others.name][2]:"", // Others2
                        type: chartTypes[KLine.TechIndexHistoryData.Others.name][2]?chartTypes[KLine.TechIndexHistoryData.Others.name][2]:'line',
                        xAxisIndex: 2,
                        yAxisIndex: 2,
                        data: KLine.TechIndexHistoryData.Others.data[2]?KLine.TechIndexHistoryData.Others.data[2]:null, // Others2
                        lineStyle: {
                            normal:{
                                color: KColorList[KLine.TechIndexHistoryData.Others.name][2]?KColorList[KLine.TechIndexHistoryData.Others.name][2]:'',
                            }
                        },
                        smooth: false,
                        symbol: 'none',
                        itemStyle: {
                            normal: {
                                borderWidth: 0,
                                color:  function(param){
                                            if(KLine.TechIndexHistoryData.Others.name=="无"){
                                                return false;
                                            }
                                            if(param.data[1]>=0){
                                                return KColorList[KLine.TechIndexHistoryData.Others.name][2]
                                            }else{
                                                return KColorList[KLine.TechIndexHistoryData.Others.name][3]
                                            }
                                        }
                            },
                        },
                        barMaxWidth: 1.5,
                    }
                ]
            });
            Charts.paitChartsNow = false;
            $(".deal").css("top","52.1%");
            $(".volumnKline").css("top","60.5%");
            $(".techIndex,.volMacd").show();
        }
    }else{

        var isLastQuery;
        var beforeLastQuery;
        var todayData = 0;
        var nextQueryTime;
        var lastQueryTime;
        var soLarge;

        if(KLine.TechIndexHistoryData[dataName].queryTimes>1&&KLine.TechIndexHistoryData[dataName].data[0].length==0){
            return;
        }

        // 更新分钟周期K线数据查询参数
        KLine.option.TechIndexOption['TechIndexKQAllMinPrev'+msgName] = $.extend({},KLine.option.TechIndexOption['TechIndexKQAllMinPrev'+msgName],{StartIndex:"-"+KLine.TechIndexHistoryData[dataName].queryTimes*200});
        // queryTimes查询数据次数更新
        KLine.TechIndexHistoryData[dataName].queryTimes++;
        // 更新日、周、月、年数据查询参数
        KLine.option.TechIndexOption['TechIndexKQAllDayPrev'+msgName] = $.extend({},KLine.option.TechIndexOption['TechIndexKQAllDayPrev'+msgName],{StartIndex:"-"+KLine.TechIndexHistoryData[dataName].queryTimes*200});
        
        if(Charts.type=="day"||Charts.type=="week"||Charts.type=="month"||Charts.type=="year"){
            // 当前查询后蜡烛总数目是否超过规定数据，前一次查询是否小于规定数目，满足条件即为最后一次查询
            nextQueryTime = KLine.TechIndexHistoryData[dataName].queryTimes+1;
            lastQueryTime = KLine.TechIndexHistoryData[dataName].queryTimes;
            
            isLastQuery = todayData + nextQueryTime*200>=KLine.HistoryData.dataLength;
            beforeLastQuery = todayData + lastQueryTime*200 < KLine.HistoryData.dataLength;
            soLarge = todayData + lastQueryTime*200 > KLine.HistoryData.dataLength;
            if(soLarge){
                // 最后一次查询标志
                KLine.TechIndexHistoryData[dataName].stopQuery = true;
            }
            if(isLastQuery&&beforeLastQuery){
                var count = KLine.HistoryData.dataLength + 1 - lastQueryTime*200+ 10 +"";
                KLine.option.TechIndexOption['TechIndexKQAllDayPrev'+msgName] = $.extend({},KLine.option.TechIndexOption['TechIndexKQAllDayPrev'+msgName],{Count: count});
                if(!KLine.TechIndexHistoryData[dataName].stopQuery){
                    var funcName = "getTechIndexKQAllDayPrev"+msgName;
                    KLine[funcName]();
                }
                // 最后一次查到的数据后，更新图形
                Charts.indexTimer = setTimeout(function(){
                    setChartData();
                },600)
                // 最后一次查询标志
                KLine.TechIndexHistoryData[dataName].stopQuery = true;
            }
            if(!KLine.TechIndexHistoryData[dataName].stopQuery){
                var funcName = "getTechIndexKQAllDayPrev"+msgName;
                KLine[funcName]();
            }
        }else{
            // 当前查询后蜡烛总数目是否超过规定数据，前一次查询是否小于规定数目，满足条件即为最后一次查询
            todayData = KLine.TechIndexHistoryData[dataName].dataLengthToday;
            nextQueryTime = KLine.TechIndexHistoryData[dataName].queryTimes;
            lastQueryTime = KLine.TechIndexHistoryData[dataName].queryTimes-1;

            isLastQuery = todayData + nextQueryTime*200>=KLine.HistoryData.dataLength;
            beforeLastQuery = todayData + lastQueryTime*200 < KLine.HistoryData.dataLength;
            soLarge = todayData + lastQueryTime*200 > KLine.HistoryData.dataLength;
            if(soLarge){
                // 最后一次查询标志
                KLine.TechIndexHistoryData[dataName].stopQuery = true;
            }
            if(isLastQuery&&beforeLastQuery){
                var count = KLine.HistoryData.dataLength + 1 - todayData - lastQueryTime*200 + 10 + "";
                KLine.option.TechIndexOption['TechIndexKQAllMinPrev'+msgName] = $.extend({},KLine.option.TechIndexOption['TechIndexKQAllMinPrev'+msgName],{Count: count});
                if(!KLine.TechIndexHistoryData[dataName].stopQuery){
                    var funcName = "getTechIndexKQAllMinPrev"+msgName;
                    KLine[funcName]();
                }
                // 最后一次查到的数据后，更新图形
                Charts.indexTimer = setTimeout(function(){
                    setChartData();
                },600)
                // 最后一次查询标志
                KLine.TechIndexHistoryData[dataName].stopQuery = true;
            }
            if(!KLine.TechIndexHistoryData[dataName].stopQuery){
                var funcName = "getTechIndexKQAllMinPrev"+msgName;
                KLine[funcName]();
            }
        }
        
    }
}
// 更新图表数据
function setChartData(){
    if(Charts.paitChartsNow||KLine.HistoryData.queryTimes==0&&KLine.HistoryData.hCategoryList.length==0){
        return;
    }
    
    if(!KChart.getOption()||!KChart.getOption().grid||KChart.getOption().grid&&KChart.getOption().grid.length==0){
        return;
    }
    Charts.paitChartsNow = true;
    KChart.setOption({
        xAxis:[
            {
                type: 'category',
                data: KLine.HistoryData.hCategoryList
            },
            {
                type: 'category',
                data: KLine.HistoryData.hCategoryList
            },
            {
                type: 'category',
                data: KLine.HistoryData.hCategoryList,
            }
        ],
        series: [
            {
                name: "Kline",
                type: 'candlestick',
                data: KLine.HistoryData.hValuesList,  // 蜡烛图
            },
            {
                name: 'MA5', // MA5
                type: 'line',
                data: KLine.TechIndexHistoryData.MA.data[0], // MA5
                connectNulls:false
            },
            {
                name: 'MA10', // MA10
                type: 'line',
                data: KLine.TechIndexHistoryData.MA.data[1], // MA10
            },
            {
                name: 'MA20', // MA20
                type: 'line',
                data: KLine.TechIndexHistoryData.MA.data[2], // MA20
            },
            {
                name: 'Volume',
                type: 'bar',
                data: KLine.HistoryData.hVolumesList // 成交量
            },
            {
                name: 'MAVOL5', // MAVOL5
                type: 'line',
                data: KLine.TechIndexHistoryData.MAVOL.data[0], // MAVOL5
            },
            {
                name: 'MAVOL10', // MAVOL10
                type: 'line',
                data: KLine.TechIndexHistoryData.MAVOL.data[1], // MAVOL10
            },
            {
                name: 'MAVOL20', // MAVOL20
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
    if(Charts.isHoverGraph){
        KChart.dispatchAction({
            type: 'showTip',
            // 数据的 index，如果不指定也可以通过 name 属性根据名称指定数据
            dataIndex: KLine.HistoryData.mouseHoverPoint,
            position: function (point, params) {
                var offsetX = point[0];
                var continerWidth = $("#kline_charts").width();
                var centerX = continerWidth / 2;
                console.log(offsetX,centerX)
                if (offsetX-13 > centerX) {
                    $("#kline_tooltip").css("left", 83/830*continerWidth);
                } else {
                    $("#kline_tooltip").css({"left":"auto","right":83/830*continerWidth});
                }
                // console.log(point, params);
            }
        });
    }
}
// 设置x轴动态更换分隔
function setXAxisInterval(index,value,length){
    var valueList = KLine.HistoryData.hCategoryList;
    if(valueList.length<=0){
        return;
    }
    try{
        var timeCurr = valueList[index].split(" ")[2];
    }catch(e){
        console.log(e)
    }
    
    var startTime = StockInfo.nowDateTime[0].startTime;
    var endTime = StockInfo.nowDateTime[0].endTime;
    var startTime1 = StockInfo.nowDateTime[StockInfo.nowDateTime.length-1].startTime1;
    var endTime1 = StockInfo.nowDateTime[StockInfo.nowDateTime.length-1].endTime1;
    var returnValue = false;
    switch(Charts.type){
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
// 信息框的位置： 左-右
function toolContentPosition(event) {
    var offsetX = event.offsetX;
    var continerWidth = $("#kline_charts").width(), toolContent = $("#kline_tooltip").width();
    var centerX = continerWidth / 2;
    if (offsetX > centerX) {
        $("#kline_tooltip").css("left", 83/830*continerWidth);
    } else {
        $("#kline_tooltip").css({"left":"auto","right":83/830*continerWidth});
    }
};
// 填写信息框
function initTooltip(){
    if(Charts.isHoverGraph){
        KChart.dispatchAction({
            type: 'showTip',
            // 数据的 index，如果不指定也可以通过 name 属性根据名称指定数据
            dataIndex: KLine.HistoryData.mouseHoverPoint,
            position: function (point, params) {
                var offsetX = point[0];
                var continerWidth = $("#kline_charts").width();
                var centerX = continerWidth / 2;
                console.log(offsetX,centerX)
                if (offsetX-13 > centerX) {
                    $("#kline_tooltip").css("left", 83/830*continerWidth);
                } else {
                    $("#kline_tooltip").css({"left":"auto","right":83/830*continerWidth});
                }
                // console.log(point, params);
            }
        });
        return;
    }
    var setPoint = KLine.HistoryData.hCategoryList.length-1;
    var volume =  KLine.HistoryData.hVolumesList[setPoint][1];
    
    $(".deal-Vol em").text(floatFixedZero(volume)); //量--单位:手
    if(KLine.TechIndexHistoryData.MA.data[0]&&KLine.TechIndexHistoryData.MA.data[0][setPoint]){
        $(".MA5 em").text(floatFixedTwo(KLine.TechIndexHistoryData.MA.data[0][setPoint][1]));
        $(".MA10 em").text(floatFixedTwo(KLine.TechIndexHistoryData.MA.data[1][setPoint][1]));
        $(".MA20 em").text(floatFixedTwo(KLine.TechIndexHistoryData.MA.data[2][setPoint][1]));
    }else{
        $(".kline-MAs span em").text("--");
    }
    if(KLine.TechIndexHistoryData.MAVOL.data[0]&&KLine.TechIndexHistoryData.MAVOL.data[0][setPoint]){
        $(".MAVOL5 em").text(floatFixedZero(KLine.TechIndexHistoryData.MAVOL.data[0][setPoint][1]));
        $(".MAVOL10 em").text(floatFixedZero(KLine.TechIndexHistoryData.MAVOL.data[1][setPoint][1]));
        $(".MAVOL20 em").text(floatFixedZero(KLine.TechIndexHistoryData.MAVOL.data[2][setPoint][1]));
    }else{
        $(".deal span:eq(2) em").text("--");
        $(".deal span:eq(3) em").text("--");
        $(".deal span:eq(4) em").text("--");
    }
    var indexName = $(".techIndex-name").text();
    if(KLine.TechIndexHistoryData.Others.data[0]&&KLine.TechIndexHistoryData.Others.data[0][setPoint]){
        if(indexName=="RSI"){
            $.each(Names[indexName],function(i,object){
                $("."+object.replace(/\$/gi,"_")+" em").text(parseFloat(KLine.TechIndexHistoryData.Others.data[i][setPoint][1]).toFixed(fixedDemicalIndex[indexName]));
            });
        }else if(Names[indexName]&&(indexName!=""||indexName!="无")){
            $.each(Names[indexName],function(i,object){
                $("."+object+" em").text(parseFloat(KLine.TechIndexHistoryData.Others.data[i][setPoint][1]).toFixed(fixedDemicalIndex[indexName]));
            });
        } 
    }else{
        $(".techIndex span:eq(1) em").text("--");
        $(".techIndex span:eq(2) em").text("--");
        $(".techIndex span:eq(3) em").text("--");
    } 
}