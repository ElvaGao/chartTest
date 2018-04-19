var KLineSocket;
var _this;
var clickTimer = null;
var myVolume = 0;
var KColorList = {
    MA:['#97bdde','#c4a926','#d182aa'],
    MAVOL:['#97bdde','#c4a926','#d182aa'],
    MACD:['#6c88bb','#c4a926','#e1322f','#5acf5e'],
    MTM:['#6c88bb','#c4a926','#e1322f'],
    RSI:['#6c88bb','#c4a926','#d182aa'],
    KDJ:['#6c88bb','#c4a926','#d182aa']
}
var chartTypes = {
    MA:['line','line','line'],
    MAVOL:['line','line','line'],
    MACD:['line','line','bar'],
    MTM:['line','line','line'],
    RSI:['line','line','line'],
    KDJ:['line','line','line']
}
var Names = {
    MACD: ['DIFF','DEA','MACD'],
    MTM:['MTM','MAMTM'],
    RSI:['RSI$1','RSI$2','RSI$3'],
    KDJ:['K','D','J']
}
// 技术指标 下面点击的地方的小数位数
var fixedIndex = {
    MACD: [2,2,3],
    MTM:[2,2,2],
    RSI:[2,2,2],
    KDJ:[2,2,2]
}
var VMmin,VMmax;
var oldIndexNameOthers = "";
$(document).keydown(function(e){
    if(_this!=undefined&&($(_this).attr("id")=="MLine"||$(_this).attr("id")=="kline")){
        $(_this).children(".charts-focus").focus();
        return;
    }
});

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
            KLineSocket.getTechIndexFuncs();
            // 显示没有数据
            $("#withoutData").show().siblings().hide();
            
            clearTimeout(clickTimer);
            clickTimer = setTimeout(function(){
                // 清空K线图
                if(KLineSocket.KChart.getOption()&&KLineSocket.KChart.getOption().series.length!=0){
                    KLineSocket.KChart.dispose();
                    KLineSocket.KChart = echarts.init(document.getElementById('kline_charts'));
                }

                // 取消之前的订阅,同时清空历史数据数组
                if(KLineSocket.HistoryData.preLineType!=undefined&&KLineSocket.HistoryData.preLineType!=""){
                    KLineSocket.getKWatchCC();
                    KLineSocket.getKWatchCCIndexMA_VOL();
                    if(KLineSocket.HistoryData.preLineType&&KLineSocket.HistoryData.preLineType!="mline"&&oldIndexNameOthers&&oldIndexNameOthers!=""){
                        //更新订阅的参数
                        var indexOthersOptions = getQueryTechIndexMsg(KLineSocket.HistoryData.preLineType,oldIndexNameOthers);
                        KLineSocket.option.KWatchCCIndexOthers = $.extend({}, KLineSocket.option.KWatchCCIndexOthers, { Instrumenttype: "51-"+indexOthersOptions.Period+"-"+indexOthersOptions.IndexID });
                        KLineSocket.getKWatchCCIndexOthers();
                    }

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

                // 点击分时图，不进行提交
                if(klineType=="mline"){
                    return;
                } 

                KLineSocket.HistoryData.queryTimes = 0;
                $.each(KLineSocket.TechIndexHistoryData,function(i,o){
                    o.queryTimes = 0;
                });

                // 查询市场状态
                KLineSocket.getKMarketStatus();


                // /*
                // * 个股/指数 实时数据，通过快照接口
                // * 其他数据，处理方式不同
                // */
                // switch(KLineSocket.option.lineType){
                //     case "day":
                //     case "week":
                //     case "month":
                //     case "year":
                //         KLineSocket.getHistoryKQFirstDayPrev();
                //         // 指标
                //         // 查询当天数据
                //         KLineSocket.getTechIndexKQFirstDayPrevMA();
                //         // 查询历史数据
                //         setTimeout(function(){
                //             // 查询MA MAVOL
                //             KLineSocket.getTechIndexKQFirstDayPrevMAVOL();
                //         },500)
                //         break;
                //     case "minute":
                //     case "fivem":
                //     case "tenm":
                //     case "fifm":
                //     case "thim":
                //     case "hour":
                //         // if(MarketStatus==2||MarketStatus==4){
                //             KLineSocket.getHistoryKQAllMinToday();
                //             // 指标
                //             // 查询当天数据
                //             KLineSocket.getTechIndexKQAllMinTodayMA();
                //             // 查询历史数据
                //             setTimeout(function(){
                //                 // 查询MAVOL
                //                 KLineSocket.getTechIndexKQAllMinTodayMAVOL();
                //             },500);
                //         // }else{
                //         //     KLineSocket.getHistoryKQFirstMinPrev();
                //         //     KLineSocket.HistoryData.queryTimes = 1;
                //         //     // 指标
                //         //     // 查询当天数据
                //         //     KLineSocket.getTechIndexKQFirstMinPrevMA();
                //         //     KLineSocket.TechIndexHistoryData.MA.queryTimes = 1;
                //         //     // 查询历史数据
                //         //     setTimeout(function(){
                //         //         // 查询MAVOL
                //         //         KLineSocket.getTechIndexKQFirstMinPrevMAVOL();
                //         //         KLineSocket.TechIndexHistoryData.MAVOL.queryTimes = 1;
                //         //     },500);
                //         // }
                        
                //         break;
                //     default:;
                // }

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
        // 订阅指标
        KWatchIndexMA_VOL: {                
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            MsgType:"S1010",
            Instrumenttype:""
        },
        // 取消订阅指标
        KWatchCCIndexMA_VOL: {                
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            MsgType:"N1010",
            Instrumenttype:"51"
        },
        //KWatchIndexOthers
        KWatchIndexOthers: {                
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            MsgType:"S1010",
            Instrumenttype:""
        },
        // 取消订阅指标
        KWatchCCIndexOthers: {                
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
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
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
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
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
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
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
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
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
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            StartIndex: "", 
            StartDate: "0", 
            StartTime: "0",
            Count: "200"
        },
        TechIndexOption:{}
    };

    var objKWatch = getQueryType(klineType);
    // 确定订阅类型
    this.options.KWatch = $.extend({}, this.options.KWatch, { Instrumenttype: objKWatch.Instrumenttype });

    var objIndexWatch = getQueryTechIndexMsg(klineType,"MA");
    this.options.KWatchIndexMA_VOL = $.extend({}, this.options.KWatchIndexMA_VOL, { Instrumenttype: "51-"+objIndexWatch.Period+"-3,51-"+objIndexWatch.Period+"-4"});

    // 更新查询历史数据参数-日周月年
    this.options.HistoryKQFirstDayPrev = $.extend({}, this.options.HistoryKQFirstDayPrev, { MsgType: objKWatch.MsgType});
    this.options.HistoryKQAllDayPrev = $.extend({}, this.options.HistoryKQAllDayPrev, { MsgType: objKWatch.MsgType});
        
    // 更新查询历史数据参数-分钟
    this.options.HistoryKQAllMinToday = $.extend({}, this.options.HistoryKQAllMinToday, { MsgType: objKWatch.MsgType }); 
    this.options.HistoryKQFirstMinPrev = $.extend({}, this.options.HistoryKQFirstMinPrev, { MsgType: objKWatch.MsgType }); 
    this.options.HistoryKQAllMinPrev = $.extend({}, this.options.HistoryKQAllMinPrev, { MsgType: objKWatch.MsgType});

    // 更新技术指标参数
    // IndexID    MA-3;MAVOL-4;MACD-5;MTM-6;RSI-10;KDJ-11
    var arrLines = ["MA","MAVOL","MACD","MTM","RSI","KDJ"];
    for(var i=0;i<arrLines.length;i++){
        this.options.TechIndexOption["TechIndexKQFirstDayPrev"+arrLines[i]] = $.extend({}, this.options.TechIndexKQFirstDayPrev, getQueryTechIndexMsg(klineType,arrLines[i])); 
        this.options.TechIndexOption["TechIndexKQAllDayPrev"+arrLines[i]] = $.extend({}, this.options.TechIndexKQAllDayPrev, getQueryTechIndexMsg(klineType,arrLines[i]));
        this.options.TechIndexOption["TechIndexKQAllMinToday"+arrLines[i]] = $.extend({}, this.options.TechIndexKQAllMinToday, getQueryTechIndexMsg(klineType,arrLines[i])); 
        this.options.TechIndexOption["TechIndexKQFirstMinPrev"+arrLines[i]] = $.extend({}, this.options.TechIndexKQFirstMinPrev, getQueryTechIndexMsg(klineType,arrLines[i])); 
        this.options.TechIndexOption["TechIndexKQAllMinPrev"+arrLines[i]] = $.extend({}, this.options.TechIndexKQAllMinPrev, getQueryTechIndexMsg(klineType,arrLines[i])); 
    }
    // 上一次查询的K线类型-用于取消订阅
    if(KLineSocket.HistoryData.preLineType!=undefined){
        var objKWatchCC = getQueryType(KLineSocket.HistoryData.preLineType);
        this.options.KWatchCC = $.extend({}, this.options.KWatchCC, { Instrumenttype: objKWatchCC.Instrumenttype });
        var objIndexWatchCC = getQueryTechIndexMsg(KLineSocket.HistoryData.preLineType,"MA")
        this.options.KWatchCCIndexMA_VOL = $.extend({}, this.options.KWatchCCIndexMA_VOL, { Instrumenttype: "51-"+objIndexWatchCC.Period+"-3,51-"+objIndexWatchCC.Period+"-4" });
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
// 技术指标请求参数查询-根据名字得到对应数值Period\IndexID
function getQueryTechIndexMsg(klineType,lineName){
    var LineMsg = {
        Period: null,
        IndexID:null
    };
    LineMsg.Period = getQueryType(klineType).Period;
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
var WebSocketConnect = function(options){
    this.wsUrl = options.wsUrl?options.wsUrl:"ws://103.66.33.67:80";
    this.stockXMlUrl = options.stockXMlUrl?options.stockXMlUrl:"http://103.66.33.58:443/GetCalcData?ExchangeID=2&Codes=1";
    this.ws = null;
    this.lockReconnect = false;
    this.timeout = 60000;       //60秒
    this.timeoutObj = null;
    this.serverTimeoutObj = null;
    this.KChart = echarts.init(document.getElementById('kline_charts'));
    // this.option = options;      // 将请求参数等，存储在socket中
    // this.HistoryData = options.HistoryData?options.HistoryData:null;        // 历史数据存储，为了添加新数据时，能够准确记录所有数据
    // 心跳包
    this.HeartSend = {          
        InstrumentID: options.InstrumentID,
        ExchangeID: options.ExchangeID,
        MsgType: "Q8050"
    };
    this.HistoryData = {
        // hDate: [],                  // 日期
        // hDay: [],                   // 星期
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
            watchDataCount:0,
        },
        // MACD:{
        //     queryTimes:0,
        //     data:[],
        //     dataLengthToday:0,
        //     stopQuery: null,            // 是否已经停止查询历史数据
        //     watchDataCount:0,
        // },
        // MTM:{
        //     queryTimes:0,
        //     data:[],
        //     dataLengthToday:0,
        //     stopQuery: null,            // 是否已经停止查询历史数据
        //     watchDataCount:0,
        // },
        // RSI:{
        //     queryTimes:0,
        //     data:[],
        //     dataLengthToday:0,
        //     stopQuery: null,            // 是否已经停止查询历史数据
        //     watchDataCount:0,
        // },
        // KDJ:{
        //     queryTimes:0,
        //     data:[],
        //     dataLengthToday:0,
        //     stopQuery: null,            // 是否已经停止查询历史数据
        //     watchDataCount:0,
        // }
    }

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
        lineType: null
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
                    $.each(KLineSocket.TechIndexHistoryData,function(index,object){
                        object.queryTimes = 0;
                        if(object instanceof Array){
                            KLineSocket.TechIndexHistoryData[index].data = [];
                        }
                    });
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
                        
    // 订阅指标
    getKWatchIndexMA_VOL: function(){
                            this.request(this.option.KWatchIndexMA_VOL);
                        },
    // 取消订阅指标
    getKWatchCCIndexMA_VOL: function(){
                                this.request(this.option.KWatchCCIndexMA_VOL);
                            },
    // 订阅指标getKWatchIndexOthers
    getKWatchIndexOthers: function(){
                                this.request(this.option.KWatchIndexOthers);
                            },
    // 取消订阅指标getKWatchIndexOthers
    getKWatchCCIndexOthers: function(){
                                this.request(this.option.KWatchCCIndexOthers);
                            },
    getHeartSend:       function(){
                            this.request(this.HeartSend);
                        },
    // 请求指标的参数历史数据查询
    getTechIndexFuncs:      function(){
                            for(var TechIndexName in this.option.TechIndexOption){
                                (function(TechIndexName){
                                    // 分钟周期K线，当前这一天的指标查询
                                    var funcName = "get"+TechIndexName;
                                    WebSocketConnect.prototype.__proto__[funcName] = function(){
                                        this.request(this.option.TechIndexOption[TechIndexName]);
                                    };
                                })(TechIndexName);
                            }
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
                                return;
                            }
                            if(!KLineSocket.option.KWatch){
                                return
                            }
                            var dataList = data.KLineSeriesInfo?data.KLineSeriesInfo:new Array(data);
                            var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
                            var MsgInstrumentID = data["InstrumentID"] || data[0]["InstrumentID"];
                            var MsgExchangeID = data["ExchangeID"] || data[0]["ExchangeID"];
                            var ErrorCode = data["ErrorCode"]?data["ErrorCode"]:null;
                            
                            var exchangeID = Number(KLineSocket.option.KWatch.ExchangeID);
                            var instrumentID = Number(KLineSocket.option.KWatch.InstrumentID);
                            if(!(exchangeID==MsgExchangeID&&instrumentID==MsgInstrumentID)){
                                return;
                            }

                             // 开始查询历史数据
                            if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
                                if(ErrorCode){
                                    console.info(data["Content"]);
                                    $("#withoutData").html("抱歉，暂时没有数据，请稍后再试……")
                                    return;
                                }
                            }else{
                                
                                
                                if(ErrorCode){
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
                                        chartPaint(isHistory);
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
                                        $.each(KLineSocket.TechIndexHistoryData,function(index,object){
                                            object.queryTimes = 0;
                                            if(object.data instanceof Array){
                                                KLineSocket.TechIndexHistoryData[index].data = [];
                                            }
                                        });

                                        // if(!(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year")){
                                            socket.getKWatch();      // 订阅当前日期K线+分钟K线
                                            // var indexObj = getQueryType(KLineSocket.option.lineType);
                                            if(!(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year")){
                                                socket.getKWatchIndexMA_VOL();
                                            }
                                            // console.log(getQueryType);
                                            // socket.getKWatch();      // 订阅当前指标
                                        // }
                                        
                                    }
                                    
                                    KCharts(dataList, "history");
                                    break;    
                                case "R8050":  //心跳包
                                    // console.log(data);
                                    break;
                                case 'R3051': // 技术指标
                                    if(KLineSocket.TechIndexHistoryData.Others.queryTimes==0){
                                        KLineSocket.TechIndexHistoryData.Others.data = [];
                                    }
                                    TechIndexLines(dataList, "history");
                                    break;
                                case 'P0051': // 技术指标订阅
                                    TechIndexLines(dataList);//处理技术指标
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
                                                // 日周月年指标不可用
                                                // // 指标
                                                // // 查询当天数据
                                                // KLineSocket.getTechIndexKQFirstDayPrevMA();
                                                // // 查询历史数据
                                                // setTimeout(function(){
                                                //     // 查询MA MAVOL
                                                //     KLineSocket.getTechIndexKQFirstDayPrevMAVOL();
                                                // },500)
                                                break;
                                            case "minute":
                                            case "fivem":
                                            case "tenm":
                                            case "fifm":
                                            case "thim":
                                            case "hour":
                                                // if(MarketStatus==2||MarketStatus==4){
                                                    KLineSocket.getHistoryKQAllMinToday();
                                                    // 指标
                                                    // 查询当天数据
                                                    KLineSocket.getTechIndexKQAllMinTodayMA();
                                                    // 查询历史数据
                                                    setTimeout(function(){
                                                        // 查询MAVOL
                                                        KLineSocket.getTechIndexKQAllMinTodayMAVOL();
                                                    },500);
                                                // }else{
                                                //     KLineSocket.getHistoryKQFirstMinPrev();
                                                //     KLineSocket.HistoryData.queryTimes = 1;
                                                //     // 指标
                                                //     // 查询当天数据
                                                //     KLineSocket.getTechIndexKQFirstMinPrevMA();
                                                //     KLineSocket.TechIndexHistoryData.MA.queryTimes = 1;
                                                //     // 查询历史数据
                                                //     setTimeout(function(){
                                                //         // 查询MAVOL
                                                //         KLineSocket.getTechIndexKQFirstMinPrevMAVOL();
                                                //         KLineSocket.TechIndexHistoryData.MAVOL.queryTimes = 1;
                                                //     },500);
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
        // 初始化并显示数据栏和数据信息框的信息
        initMarketTool();
        // 画图
        chartPaint(isHistory);
        

        /*
         * K线图事件绑定
         */
        // ecahrts显示tooltip
        KLineSocket.KChart.on('showTip', function (params) {
            KLineSocket.KLineSet.mouseHoverPoint = params.dataIndex;
            var length = KLineSocket.HistoryData.hCategoryList.length;
            setToolInfo(length, 'showTip');
        });
        
        // 鼠标滑过，出现信息框
        $("#kline_charts").bind("mouseenter", function (event) {
            toolContentPosition(event);
            $("#kline_tooltip").show();

            _this = $("#kline");
        });
        $("#kline_charts").bind("mousemove", function (event) {
            KLineSocket.KLineSet.isHoverGraph = true;
            $("#kline_tooltip").show();
            toolContentPosition(event);

            _this = $("#kline");
        });
        $("#kline_charts").bind("mouseout", function (event) {
            KLineSocket.KLineSet.isHoverGraph = false;
            $("#kline_tooltip").hide();
            KLineSocket.KLineSet.mouseHoverPoint = 0;
            initMarketTool();// 显示信息

            $(_this).children(".charts-focus").blur();
            _this = window;
        });
        
        // $(".kline-buttons span").click();
        
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
        }else{
            var e_open = (object.Open),          // 开
                e_highest = (object.High),       // 高
                e_lowest = (object.Low),         // 低
                e_price = ((KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year")&&(!isHistory))?(object.Last):(object.Price),           // 收盘价
                e_volumnData = object.Volume/100;                              // 成交量---单位：手  
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
        console.log(n_values)
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
            KLineSocket.KChart.setOption({
                // backgroundColor: "#fff",
                animation: false,
                tooltip: {
                    trigger: 'axis',
                    showContent: false
                },
                hoverLayerThreshold:10,
                axisPointer: {
                    link: {xAxisIndex: 'all'},
                    label: {
                        backgroundColor: '#555' 
                    },
                    type: 'line',
                    lineStyle:{
                        type: 'dotted',
                        color: '#000'
                    },
                    show:true,
                    triggerTooltip:false
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
                        xAxisIndex: [0, 1, 2],
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
                            if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
                                var valueList = KLineSocket.HistoryData.hCategoryList[valueStr].split(" ");
                                return valueList[0];
                            }else{
                                var valueList = KLineSocket.HistoryData.hCategoryList[valueStr].split(" ");
                                return valueList[valueList.length-1];
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
                        data: KLineSocket.HistoryData.hCategoryList,
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
                        data: KLineSocket.HistoryData.hCategoryList,
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
                        data: KLineSocket.HistoryData.hCategoryList,
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
                                return (value).toFixed(xml.options.decimal);
                            }
                        },
                        axisPointer: {
                            show:true,
                            label: {
                                show:true,
                                formatter: function(params){
                                    return params.value.toFixed(xml.options.decimal);
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
                                $(".volumeMax").text(floatFixedZero(data.value));
                                $(".vol-unit").text(data.unit);
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
                                

                                if(KLineSocket.TechIndexHistoryData.Others.name=="MACD"){
                                    var min = value.min-Math.abs(value.min);
                                    var max = value.max+Math.abs(value.max);
                                    if(Math.abs(max)>=Math.abs(min)){
                                        min = -max;
                                    }else{
                                        max = -min;
                                    }
                                }else{
                                    min = value.min;
                                    max = value.max;
                                }
                                console.log(VMmax,VMmin,"111")
                                VMmax = max;
                                VMmin = min;
                                $(".vmMin").html(floatFixedDecimal(min));
                                $(".vmMax").html(floatFixedDecimal(max));
                                return VMmin;
                            }
                        },
                        max: function(value) {
                            // if(value.max!=-Infinity){
                                // var min = value.min-Math.abs(value.min)*2;
                                // var max = value.max+Math.abs(value.max)*2;
                                // if(Math.abs(max)>=Math.abs(min)){
                                //     min = -max;
                                // }else{
                                //     max = -min;
                                // }
                                // $(".vmMin").html(floatFixedDecimal(min));
                                // $(".vmMax").html(floatFixedDecimal(max));
                                console.log(VMmax,VMmin,"222")
                                return VMmax;
                            // }
                        },
                        splitLine: { show: false },
                        
                    }
                ],
                series: [
                    {
                        name: 'K',
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
                        data: KLineSocket.HistoryData.hValuesList,
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
                        data: KLineSocket.TechIndexHistoryData.MA.data[0], 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList.MA[0]
                            }
                        },
                        symbol: 'none',
                        z:2,
                        connectNulls: false,
                    },
                    {
                        name: 'MA10', // MA10
                        type: 'line',
                        data: KLineSocket.TechIndexHistoryData.MA.data[1], 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList.MA[1]
                            }
                        },
                        symbol: 'none',
                        z:2,
                        connectNulls: false,
                    },
                    {
                        name: 'MA20', // MA20
                        type: 'line',
                        data: KLineSocket.TechIndexHistoryData.MA.data[2], 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList.MA[2]
                            }
                        },
                        symbol: 'none',
                        z:2,
                        connectNulls: false,
                    },
                    {
                        name: 'Volume',
                        type: 'bar',
                        xAxisIndex: 1,
                        yAxisIndex: 1,
                        data: KLineSocket.HistoryData.hVolumesList,
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
                        data: KLineSocket.TechIndexHistoryData.MAVOL.data[0], 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList.MAVOL[0]
                            }
                        },
                        symbol: 'none',
                        z:2,
                        connectNulls: false,
                    },
                    {
                        name: 'MAVOL10', // MAVOL10
                        type: 'line',
                        xAxisIndex: 1,
                        yAxisIndex: 1,
                        data: KLineSocket.TechIndexHistoryData.MAVOL.data[1], 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList.MAVOL[1]
                            }
                        },
                        symbol: 'none',
                        z:2,
                        connectNulls: false,
                    },
                    {
                        name: 'MAVOL20', // MAVOL20
                        type: 'line',
                        xAxisIndex: 1,
                        yAxisIndex: 1,
                        data: KLineSocket.TechIndexHistoryData.MAVOL.data[2], 
                        smooth: false,
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList.MAVOL[2]
                            }
                        },
                        symbol: 'none',
                        z:2,
                        connectNulls: false,
                    },
                    {
                        name: 'Others0', // Others0
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
                        connectNulls: false,
                    },
                    {
                        name: 'Others1', // Others1
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
                        connectNulls: false,
                    },
                    {
                        name: 'Others2', // Others2
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
                        connectNulls: false,
                    }
                ]
            });
            // 量比等指标的点击
            $(".kline-buttons").on('click','span',function(){
                if(oldIndexNameOthers&&oldIndexNameOthers!=""){
                    //更新订阅的参数
                    var indexOthersOptions = getQueryTechIndexMsg(KLineSocket.option.lineType,oldIndexNameOthers);
                    KLineSocket.option.KWatchCCIndexOthers = $.extend({}, KLineSocket.option.KWatchCCIndexOthers, { Instrumenttype: "51-"+indexOthersOptions.Period+"-"+indexOthersOptions.IndexID });
                    KLineSocket.getKWatchCCIndexOthers();
                }
                KLineSocket.TechIndexHistoryData.Others.name = $(this).text();
                KLineSocket.TechIndexHistoryData.Others.queryTimes = 0;
                KLineSocket.TechIndexHistoryData.Others.data = [];
                $(".vmMax").html("");
                $(".vmMin").html("");
                // 高亮按钮
                $(this).addClass("active").end();
                $(this).siblings().removeClass("active");
                //无-按钮
                if($(this).index()==0){
                    // 绘制K线图
                    KLineSocket.KChart.setOption({
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
                                data: KLineSocket.HistoryData.hValuesList,
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.MA.data[0], // MA5
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.MA.data[1], // MA10
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.MA.data[2], // MA20
                            },
                            {
                                data: KLineSocket.HistoryData.hVolumesList,
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.MAVOL.data[0], // MAVOL5
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.MAVOL.data[1], // MAVOL10
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.MAVOL.data[2], // MAVOL20
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.Others.data[0]?KLineSocket.TechIndexHistoryData.Others.data[0]:null,
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.Others.data[1]?KLineSocket.TechIndexHistoryData.Others.data[1]:null,
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.Others.data[2]?KLineSocket.TechIndexHistoryData.Others.data[2]:null,
                            }
                        ]
                    });
                    $(".techIndex,.volMacd").hide();
                    $(".deal").css("top","72%");
                    $(".volumnKline").css("top","76%");
                }else{
                    var Name = $(this).text();
                    $(".techIndex-name").html(Name);
                    if(Names[Name]){
                        $(".techIndex_0").html(Names[Name][0]?Names[Name][0]+": --":"");
                        $(".techIndex_1").html(Names[Name][1]?Names[Name][1]+": --":"");
                        $(".techIndex_2").html(Names[Name][2]?Names[Name][2]+": --":"");
                    }
                    
                    try{
                        KLineSocket['getTechIndexKQAllMinToday'+Name]();
                        //更新订阅的参数
                        var indexOptions = getQueryTechIndexMsg(KLineSocket.option.lineType,Name);
                        KLineSocket.option.KWatchIndexOthers = $.extend({}, KLineSocket.option.KWatchIndexOthers, { Instrumenttype: "51-"+indexOptions.Period+"-"+indexOptions.IndexID });
                        if(!(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year")){
                            KLineSocket.getKWatchIndexOthers();
                        }
                        oldIndexNameOthers = Name;
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
                            {
                                // type: 'category',
                                // gridIndex: 1,
                                data: KLineSocket.HistoryData.hCategoryList,
                            },
                            {
                                data: KLineSocket.HistoryData.hCategoryList,
                            }
                        ],
                        yAxis:[
                            {},
                            {},
                            // {
                            //     min:techMin,
                            //     max:techMax,
                            // }
                        ],
                        series: [
                            {
                                data: KLineSocket.HistoryData.hValuesList
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.MA.data[0], // MA5
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.MA.data[1], // MA10
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.MA.data[2], // MA20
                            },
                            {
                                data: KLineSocket.HistoryData.hVolumesList
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.MAVOL.data[0], // MAVOL5
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.MAVOL.data[1], // MAVOL10
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.MAVOL.data[2], // MAVOL20
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.Others.data[0]?KLineSocket.TechIndexHistoryData.Others.data[0]:null,
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.Others.data[1]?KLineSocket.TechIndexHistoryData.Others.data[1]:null,
                            },
                            {
                                data: KLineSocket.TechIndexHistoryData.Others.data[2]?KLineSocket.TechIndexHistoryData.Others.data[2]:null,
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
            $(".kline-buttons span:eq(0)").click();
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
// 技术指标
function TechIndexLines(dataList, isHistory){
    if(dataList){
        // 解析并存储数据
        var msgInfoObj = saveTechIndex(dataList, isHistory); 
        // 继续下一步查询指标
        if(isHistory){
            getTechIndexMore(msgInfoObj.msgName,msgInfoObj.dataName);
        }
        
        if(msgInfoObj.dataName=="Others"){
            KLineSocket.KChart.setOption({
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
                        data: KLineSocket.HistoryData.hValuesList,
                    },
                    {
                        data: KLineSocket.TechIndexHistoryData.MA.data[0], // MA5
                    },
                    {
                        data: KLineSocket.TechIndexHistoryData.MA.data[1], // MA10
                    },
                    {
                        data: KLineSocket.TechIndexHistoryData.MA.data[2], // MA20
                    },
                    {
                        data: KLineSocket.HistoryData.hVolumesList,
                    },
                    {
                        data: KLineSocket.TechIndexHistoryData.MAVOL.data[0]?KLineSocket.TechIndexHistoryData.MAVOL.data[0]:null, // MAVOL5
                    },
                    {
                        data: KLineSocket.TechIndexHistoryData.MAVOL.data[1]?KLineSocket.TechIndexHistoryData.MAVOL.data[1]:null, // MAVOL10
                    },
                    {
                        data: KLineSocket.TechIndexHistoryData.MAVOL.data[2]?KLineSocket.TechIndexHistoryData.MAVOL.data[2]:null, // MAVOL20
                    },
                    {
                        name: 'Others0', // Others0
                        type: chartTypes[KLineSocket.TechIndexHistoryData.Others.name][0],
                        xAxisIndex: 2,
                        yAxisIndex: 2,
                        data: KLineSocket.TechIndexHistoryData.Others.data[0], // Others0
                        lineStyle: {
                            normal:{
                                width:'1.5',
                                color: KColorList[KLineSocket.TechIndexHistoryData.Others.name][0],
                            }
                        },
                        smooth: false,
                        symbol: 'none',
                        connectNulls: false,
                    },
                    {
                        name: 'Others1', // Others1
                        type: chartTypes[KLineSocket.TechIndexHistoryData.Others.name][1],
                        xAxisIndex: 2,
                        yAxisIndex: 2,
                        data: KLineSocket.TechIndexHistoryData.Others.data[1], // Others1
                        lineStyle: {
                            normal:{
                                color: KColorList[KLineSocket.TechIndexHistoryData.Others.name][1],
                            }
                        },
                        smooth: false,
                        symbol: 'none',
                        connectNulls: false,
                    },
                    {
                        name: 'Others2', // Others2
                        type: chartTypes[KLineSocket.TechIndexHistoryData.Others.name][2]?chartTypes[KLineSocket.TechIndexHistoryData.Others.name][2]:'line',
                        xAxisIndex: 2,
                        yAxisIndex: 2,
                        data: KLineSocket.TechIndexHistoryData.Others.data[2]?KLineSocket.TechIndexHistoryData.Others.data[2]:null, // Others2
                        lineStyle: {
                            normal:{
                                color: KColorList[KLineSocket.TechIndexHistoryData.Others.name][2]?KColorList[KLineSocket.TechIndexHistoryData.Others.name][2]:'',
                            }
                        },
                        smooth: false,
                        symbol: 'none',
                        connectNulls: false,
                        itemStyle: {
                            normal: {
                                borderWidth: 0,
                                color:  function(param){
                                            if(KLineSocket.TechIndexHistoryData.Others.name=="无"){
                                                return false;
                                            }
                                            if(param.data[1]>=0){
                                                return KColorList[KLineSocket.TechIndexHistoryData.Others.name][2]
                                            }else{
                                                return KColorList[KLineSocket.TechIndexHistoryData.Others.name][3]
                                            }
                                        }
                            },
                        },
                        barMaxWidth: 1.5,
                    }
                ]
            });
            $(".deal").css("top","57.1%");
            $(".volumnKline").css("top","60.5%");
            $(".techIndex,.volMacd").show();
        }
    }
}
// 解析并存储-指标数据
function saveTechIndex(dataList, isHistory) {
    var msgInfo = {
        msgName:null,
        dataName: null
    }
    let msgName = ""; 
    var week = ["日","一","二","三","四","五","六"];
    // 遍历json，将它们push进不同的数组
    $.each(dataList,function(index,object){
        msgInfo.msgName = getQueryTechIndexName(object.IndexID+"").msgName;
        msgInfo.dataName = getQueryTechIndexName(object.IndexID+"").dataName;

        if(!KLineSocket.TechIndexHistoryData[msgInfo.dataName]) return;

        if(!KLineSocket.TechIndexHistoryData[msgInfo.dataName].data[0]){
        //  if(KLineSocket.TechIndexHistoryData[msgInfo.dataName].queryTimes==0){
            for(var i=0;i<object.OutCount;i++){
                KLineSocket.TechIndexHistoryData[msgInfo.dataName].data.push([]);
            }
        }
        if(isHistory){ // 数据长度不为0
            if(object.RecordCount&&object.RecordCount!=0){
                $.each(object.TechIndexInfo,function(i,o){
                    
                    if(o.Date==-1) return;
                    $.each(o.DATA,function(dataIndex,data){
                        // 按照坐标轴的顺序写进去
                        if(data.ITEM){
                            let tn_date = formatDateSplit(o.Date),                 // 当天日期
                                tn_day = week[(new Date(tn_date)).getDay()],        // 计算星期
                                tn_time;  

                            if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
                                KLineSocket.HistoryData.hTime = formatTime((o.Time/100000>=1)?o.Time:("0"+o.Time));
                                tn_time = tn_date + " " + tn_day;
                            }else{
                                tn_time = tn_date + " " + tn_day + " " + formatTime((o.Time/100000>=1)?o.Time:("0"+o.Time));
                            } 
                            var index = KLineSocket.HistoryData.hCategoryList.indexOf(tn_time);
                            if(index<0) return;
                            KLineSocket.TechIndexHistoryData[msgInfo.dataName].data[dataIndex][index] = [tn_time,data.ITEM];
                        }
                        
                    });
                    
                });
            }
        }else{ // 数据长度不为0
            $.each(object.TechIndex,function(dataIndex,data){
                // 按照坐标轴的顺序写进去
                if(data.ITEM){
                    let tn_date = formatDateSplit(object.Date),                 // 当天日期
                        tn_day = week[(new Date(tn_date)).getDay()],        // 计算星期
                        tn_time;  

                    if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
                        KLineSocket.HistoryData.hTime = formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
                        tn_time = tn_date + " " + tn_day;
                    }else{
                        tn_time = tn_date + " " + tn_day + " " + formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
                    } 
                    // 订阅的最后一条
                    var dataListIndex = KLineSocket.TechIndexHistoryData[msgInfo.dataName].data[dataIndex];
                    console.log(dataListIndex[dataListIndex.length-1],msgInfo.dataName);
                    if(dataListIndex.length>0){
                        
                        if(dataListIndex[dataListIndex.length-1]){
                            if(tn_time==dataListIndex[dataListIndex.length-1][0]){
                                dataListIndex[dataListIndex.length-1] = [tn_time,data.ITEM];
                            }else{
                                KLineSocket.TechIndexHistoryData[msgInfo.dataName].data[dataIndex].push([tn_time,data.ITEM]);
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

    if(!KLineSocket.TechIndexHistoryData[dataName]) return false;

    // 第一次请求时，非分钟周期K线不进行绘制，第二次请求才开始绘制
    var dayFirstTime = KLineSocket.TechIndexHistoryData[dataName].queryTimes==0&&(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year");
    var daySecondTime = KLineSocket.TechIndexHistoryData[dataName].queryTimes==1&&(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year");
    
    var minutFirstTime = KLineSocket.TechIndexHistoryData[dataName].queryTimes==0&&!(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year");
    var minutSecondTime = KLineSocket.TechIndexHistoryData[dataName].queryTimes==1&&!(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year");
    
    if(minutFirstTime){  // 第一次查询分钟周期K线时，不绘制图形，而是继续历史数据查询，因为数据较少，避免闪屏
        KLineSocket.TechIndexHistoryData[dataName].queryTimes++;
        var funcName = "getTechIndexKQFirstMinPrev"+msgName;
        KLineSocket[funcName]();
        if(KLineSocket.TechIndexHistoryData[dataName].dataLengthToday!=0){
            return;
        }
        
    }else if(dayFirstTime||minutSecondTime){  // 如果是分钟周期K线第二次请求，和日期周期K线第一次请求后，便开始绘制图表
        /* 
         * 日期周期K线在进行查询时就已经是查询历史数据了，所以对应正常的查询次数queryTimes，queryTimes自增后更新            
         * 分钟周期K线的查询，第一次是当天的数据，而历史数据是从前一个交易日开始算的，在queryTimes查询数据次数更新前更新查询参数
         */
        // 更新分钟周期K线指标请求参数
        KLineSocket.option.TechIndexOption['TechIndexKQAllMinPrev'+msgName] = $.extend({},KLineSocket.option.TechIndexOption['TechIndexKQAllMinPrev'+msgName],{StartIndex:"-"+KLineSocket.TechIndexHistoryData[dataName].queryTimes*200});
        // 查询次数增加
        KLineSocket.TechIndexHistoryData[dataName].queryTimes++;
        // 更新日期周期K线请求参数
        KLineSocket.option.TechIndexOption['TechIndexKQAllDayPrev'+msgName] = $.extend({},KLineSocket.option.TechIndexOption['TechIndexKQAllDayPrev'+msgName],{StartIndex:"-"+KLineSocket.TechIndexHistoryData[dataName].queryTimes*200});
        
        // 开始查询历史数据
        if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
            var funcName = "getTechIndexKQAllDayPrev"+msgName;
            KLineSocket[funcName]();
        }else{
            var funcName = "getTechIndexKQAllMinPrev"+msgName;
            KLineSocket[funcName]();
        }
    }else{

        var isLastQuery;
        var beforeLastQuery;
        var todayData = 0;
        var nextQueryTime;
        var lastQueryTime;

        if(KLineSocket.TechIndexHistoryData[dataName].queryTimes>1&&KLineSocket.TechIndexHistoryData[dataName].data[0].length==0){
            return;
        }

        // 更新分钟周期K线数据查询参数
        KLineSocket.option.TechIndexOption['TechIndexKQAllMinPrev'+msgName] = $.extend({},KLineSocket.option.TechIndexOption['TechIndexKQAllMinPrev'+msgName],{StartIndex:"-"+KLineSocket.TechIndexHistoryData[dataName].queryTimes*200});
        // queryTimes查询数据次数更新
        KLineSocket.TechIndexHistoryData[dataName].queryTimes++;
        // 更新日、周、月、年数据查询参数
        KLineSocket.option.TechIndexOption['TechIndexKQAllDayPrev'+msgName] = $.extend({},KLineSocket.option.TechIndexOption['TechIndexKQAllDayPrev'+msgName],{StartIndex:"-"+KLineSocket.TechIndexHistoryData[dataName].queryTimes*200});
        
        if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
            // 当前查询后蜡烛总数目是否超过规定数据，前一次查询是否小于规定数目，满足条件即为最后一次查询
            nextQueryTime = KLineSocket.TechIndexHistoryData[dataName].queryTimes+1;
            lastQueryTime = KLineSocket.TechIndexHistoryData[dataName].queryTimes;
            
            isLastQuery = todayData + nextQueryTime*200>=KLineSocket.HistoryData.dataLength;
            beforeLastQuery = todayData + lastQueryTime*200 < KLineSocket.HistoryData.dataLength;
            if(isLastQuery&&beforeLastQuery){
                var count = KLineSocket.HistoryData.dataLength + 1 - lastQueryTime*200+"";
                KLineSocket.option.TechIndexOption['TechIndexKQAllDayPrev'+msgName] = $.extend({},KLineSocket.option.TechIndexOption['TechIndexKQAllDayPrev'+msgName],{Count: count});
                if(!KLineSocket.TechIndexHistoryData[dataName].stopQuery){
                    var funcName = "getTechIndexKQAllDayPrev"+msgName;
                    KLineSocket[funcName]();
                }
                // 最后一次查询标志
                KLineSocket.TechIndexHistoryData[dataName].stopQuery = true;
            }
            if(!KLineSocket.TechIndexHistoryData[dataName].stopQuery){
                var funcName = "getTechIndexKQAllDayPrev"+msgName;
                KLineSocket[funcName]();
            }
        }else{
            // 当前查询后蜡烛总数目是否超过规定数据，前一次查询是否小于规定数目，满足条件即为最后一次查询
            todayData = KLineSocket.TechIndexHistoryData[dataName].dataLengthToday;
            nextQueryTime = KLineSocket.TechIndexHistoryData[dataName].queryTimes;
            lastQueryTime = KLineSocket.TechIndexHistoryData[dataName].queryTimes-1;

            isLastQuery = todayData + nextQueryTime*200>=KLineSocket.HistoryData.dataLength;
            beforeLastQuery = todayData + lastQueryTime*200 < KLineSocket.HistoryData.dataLength;
            if(isLastQuery&&beforeLastQuery){
                var count = KLineSocket.HistoryData.dataLength + 1 - todayData - lastQueryTime*200 + "";
                KLineSocket.option.TechIndexOption['TechIndexKQAllMinPrev'+msgName] = $.extend({},KLineSocket.option.TechIndexOption['TechIndexKQAllMinPrev'+msgName],{Count: count});
                if(!KLineSocket.TechIndexHistoryData[dataName].stopQuery){
                    var funcName = "getTechIndexKQAllMinPrev"+msgName;
                    KLineSocket[funcName]();
                }
                // 最后一次查询标志
                KLineSocket.TechIndexHistoryData[dataName].stopQuery = true;
            }
            if(!KLineSocket.TechIndexHistoryData[dataName].stopQuery){
                var funcName = "getTechIndexKQAllMinPrev"+msgName;
                KLineSocket[funcName]();
            }
        }
        
    }
}
// 更新图表数据
function setChartData(){
    KLineSocket.KChart.setOption({
        xAxis:[
            {
                data: KLineSocket.HistoryData.hCategoryList
            },
            {
                data: KLineSocket.HistoryData.hCategoryList
            },
            {
                data: KLineSocket.HistoryData.hCategoryList,
            }
        ],
        series: [
            {
                data: KLineSocket.HistoryData.hValuesList,  // 蜡烛图
            },
            {
                data: KLineSocket.TechIndexHistoryData.MA.data[0], // MA5
            },
            {
                data: KLineSocket.TechIndexHistoryData.MA.data[1], // MA10
            },
            {
                data: KLineSocket.TechIndexHistoryData.MA.data[2], // MA20
            },
            {
                data: KLineSocket.HistoryData.hVolumesList // 成交量
            },
            {
                data: KLineSocket.TechIndexHistoryData.MAVOL.data[0], // MAVOL5
            },
            {
                data: KLineSocket.TechIndexHistoryData.MAVOL.data[1], // MAVOL10
            },
            {
                data: KLineSocket.TechIndexHistoryData.MAVOL.data[2], // MAVOL20
            },
            {
                data: KLineSocket.TechIndexHistoryData.Others.data[0]?KLineSocket.TechIndexHistoryData.Others.data[0]:null,
            },
            {
                data: KLineSocket.TechIndexHistoryData.Others.data[1]?KLineSocket.TechIndexHistoryData.Others.data[1]:null,
            },
            {
                data: KLineSocket.TechIndexHistoryData.Others.data[2]?KLineSocket.TechIndexHistoryData.Others.data[2]:null,
            }
        ]
    });
    // 初始化并显示数据栏和数据信息框的信息
    initMarketTool();
}
// 设置x轴动态更换分隔
function setXAxisInterval(index,value,length){
    var valueList = KLineSocket.HistoryData.hCategoryList;
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
// 初始化设置显示信息
function initMarketTool() {
    var length = KLineSocket.HistoryData.hCategoryList.length;
    // 鼠标所在的点为最后一个点
    // 鼠标没有在图片上
    // 鼠标所在的点不存在
    // 以上三种情况，设置为最后一个点的信息。
    var lastPoint = KLineSocket.KLineSet.isHoverGraph&&KLineSocket.KLineSet.mouseHoverPoint==length-1;
    var notHover = !KLineSocket.KLineSet.isHoverGraph;
    var notPoint = KLineSocket.KLineSet.isHoverGraph && !KLineSocket.HistoryData.hCategoryList[KLineSocket.KLineSet.mouseHoverPoint];

    if ( lastPoint|| notHover || notPoint ) {
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
        if(KLineSocket.HistoryData.hCategoryList[setPoint]=="1997-1-1 一 9:30"){
            return;
        }
        $(".k-date", countent).text(KLineSocket.HistoryData.hCategoryList[setPoint].split(" ")[0].replace(/-/g,'/')); //日期
        $(".k-day", countent).text(KLineSocket.HistoryData.hCategoryList[setPoint].split(" ")[1]); //星期
        // 分钟K线每根柱子都有一条时间数据
        // 日K线，只有最后一根存在当前分钟时间数据
        if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
            KLineSocket.HistoryData.hTime = (KLineSocket.HistoryData.hTime=="00:00")?null:KLineSocket.HistoryData.hTime;
            if(showTip){
                $(".k-time", countent).text((KLineSocket.KLineSet.mouseHoverPoint==length-1)?KLineSocket.HistoryData.hTime:null); //时间
            }else{
                $(".k-time", countent).text(KLineSocket.HistoryData.hTime);
            }
        }else{
            $(".k-time", countent).text(KLineSocket.HistoryData.hCategoryList[setPoint].split(" ")[2]); //时间
        }

        $(".k-open", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][0])+"("+floatFixedTwo(KLineSocket.HistoryData.hValuesPercentList[setPoint][0])+"%)")
            .attr("class","k-open pull-right "+((setPoint==0)?"":getColorName(KLineSocket.HistoryData.hValuesPercentList[setPoint][0],0))); //开
        
        $(".k-price", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][1])+"("+floatFixedTwo(KLineSocket.HistoryData.hValuesPercentList[setPoint][1])+"%)")
            .attr("class","k-price pull-right "+getColorName(KLineSocket.HistoryData.hValuesPercentList[setPoint][1],0)); //收
        
        $(".k-lowest", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][2])+"("+floatFixedTwo(KLineSocket.HistoryData.hValuesPercentList[setPoint][2])+"%)")
            .attr("class","k-lowest pull-right "+getColorName(KLineSocket.HistoryData.hValuesPercentList[setPoint][2],0)); //低
        
        $(".k-highest", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hValuesList[setPoint][3])+"("+floatFixedTwo(KLineSocket.HistoryData.hValuesPercentList[setPoint][3])+"%)")
            .attr("class","k-highest pull-right "+getColorName(KLineSocket.HistoryData.hValuesPercentList[setPoint][3],0)); //高
        
        $(".k-z-value", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hZValuesList[setPoint])+"("+floatFixedTwo(KLineSocket.HistoryData.hZValuesListPercent[setPoint])+"%)")
            .attr("class","k-z-value pull-right "+getColorName(KLineSocket.HistoryData.hZValuesList[setPoint],0));   // 涨跌
        
        
        $(".k-amplitude", countent).text(floatFixedDecimal(KLineSocket.HistoryData.hZf[setPoint])+"("+floatFixedTwo(KLineSocket.HistoryData.hZfList[setPoint])+"%)");   // 振幅

        var volume = KLineSocket.HistoryData.hVolumesList[setPoint][1];

        $(".deal-Vol em").text(parseFloat(volume).toFixed(2));//量--单位:手

        if(volume>=100){
            //量--单位:手
            $(".k-volume", countent).text(setUnit(volume,true)+"手");
        }else{
            //量--单位:股
            $(".k-volume", countent).text(volume+"股");
        }
        // MA
        showTechIndexPoint(setPoint,"MA",[".kline-MA5 em",".kline-MA10 em",".kline-MA20 em"]);
        showTechIndexPoint(setPoint,"MAVOL",[".deal-MA5 em",".deal-MA10 em",".deal-MA20 em"]);

        // others下部点击出现的指标
        if(KLineSocket.TechIndexHistoryData.Others.name=="无") return;
        showTechIndexPointOters(setPoint);
        

    }else{
        $(".k-date", countent).text("-");
        $(".k-day", countent).text("-");
        $(".k-time", countent).text("-");
        $(".k-open", countent).text("-");
        $(".k-highest", countent).text("-");
        $(".k-price", countent).text("-");
        $(".k-lowest", countent).text("-");
        $(".k-volume", countent).text("-");
        $(".k-z-value", countent).text("-");
        $(".k-amplitude", countent).text("-");

    }
};
// MA和MAVOL指标的鼠标滑过设置
function showTechIndexPoint(setPoint,techName,classList){
    $.each(classList,function(index,object){
        var data = KLineSocket.TechIndexHistoryData[techName].data[0];
        if( data && data[setPoint] ){
            $(object).text(floatFixedTwo(KLineSocket.TechIndexHistoryData[techName].data[index][setPoint][1]));
        }else{
            $(object).text("--");
        }
    });
}
// 点击出现的指标的鼠标滑过设置
function showTechIndexPointOters(setPoint){
    
    var nameArr = Names[KLineSocket.TechIndexHistoryData.Others.name];
    if(nameArr){
        $.each(nameArr,function(index,object){
            var data = KLineSocket.TechIndexHistoryData.Others.data[0];
            if( data && data[setPoint] && KLineSocket.TechIndexHistoryData.Others.data[index][setPoint] ){
                $(".techIndex_"+[index]).html(object+": "+"<em>"+parseFloat(KLineSocket.TechIndexHistoryData.Others.data[index][setPoint][1]).toFixed(fixedIndex[KLineSocket.TechIndexHistoryData.Others.name][index])+"</em>");
            }else{
                $(".techIndex_"+[index]).html(object+": "+"<em>--</em>");
            }  
        });
    }     
};