var KLineSocket;
var pixel=[];
var yAxisValueList = [];
var _this;
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
                                        // 延时查询
                                        ele.options.timer = setTimeout(function(){
                                            var url = "http://103.66.33.58:443/GetCodes?ExchangeID=0&Codes="+value;
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

        // 点击查询周期K线
        $("#tab li").on("click",function(){

            // 点击的K线类型
            var klineType = $(this).attr("id");

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
            // 发起websocket请求
            initSocketEvent(KLineSocket);


            // 显示没有数据
            $("#withoutData").show().siblings().hide();
            

            // 清空K线图
            if(KLineSocket.KChart.getOption()){
                KLineSocket.KChart.clear();
            }

            // 取消之前的订阅,同时清空历史数据数组
            if(KLineSocket.HistoryData.preLineType!=undefined&&KLineSocket.HistoryData.preLineType!=""){
                KLineSocket.getKWatchCC();
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
                });
            }

            // 刚进入页面就点击分时图，不进行提交
            if(klineType=="mline"){
                return;
            }

            // 请求历史数据
            KLineSocket.getHistoryKQAll();

            // 当前K线存储为前一根K线
            KLineSocket.HistoryData.preLineType = KLineSocket.option.lineType;     

            // K线前一根柱子的收盘价
            KLineSocket.option.lastClose = 0; 
                
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
    var ExchangeID = option.ExchangeID?option.ExchangeID:"101",
        InstrumentID = option.InstrumentID?option.InstrumentID:"1",
        msgType = null,
        instrumenttype = null;
    // 对象默认请求参数
    this.options = {
        lineType: klineType?klineType:null,
        lastClose: 0,
        // 查询历史数据
        HistoryKQAll: {         
            InstrumentID: InstrumentID,
            ExchangeID: ExchangeID,
            MsgType: "",  
            StartIndex: "-1", 
            StartDate: "0", 
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
        }
    };

    var objKWatch = getQueryType(klineType);

    this.options.KWatch = $.extend({}, this.options.KWatch, { Instrumenttype: objKWatch.Instrumenttype });

    if(klineType=="day"||klineType=="week"||klineType=="month"||klineType=="year"){
        // 更新查询历史数据参数
        this.options.HistoryKQAll = $.extend(
            {}, 
            this.options.HistoryKQAll, 
            { MsgType: objKWatch.MsgType}
        );
    }else{
        // 更新查询历史数据参数
        this.options.HistoryKQAll = $.extend(
            {}, 
            this.options.HistoryKQAll, 
            { MsgType: objKWatch.MsgType, StartTime: "0" }
        ); 
    } 

    if(KLineSocket.HistoryData.preLineType!=undefined){
        var objKWatchCC = getQueryType(KLineSocket.HistoryData.preLineType);
        this.options.KWatchCC = $.extend({}, this.options.KWatchCC, { Instrumenttype: objKWatchCC.Instrumenttype });
    }
};
function getQueryType(klineType){
    var typeObj = {
        MsgType: null,
        Instrumenttype: null
    }
    switch(klineType){
        case "day":
            typeObj = {         // 日K线：Q3021
                MsgType: "Q3021",
                Instrumenttype: "1"
            }
            break;
        case "week":
            typeObj = {         // 周K线：Q3022
                MsgType: "Q3022",
                // Instrumenttype: "11"
            }
            break;
        case "month":
            typeObj = {         // 月K线：Q3023
                MsgType: "Q3023",
                // Instrumenttype: "11"
            }
            break;
        case "year":
            typeObj = {         // 年K线：Q3025
                MsgType: "Q3025",
                // Instrumenttype: "11"
            }
            break;
        case "minute":
            typeObj = {         // 1分钟K线：Q3011
                MsgType: "Q3011",
                Instrumenttype: "11"
            }
            break;
        case "fivem":
            typeObj = {         // 5分钟K线：Q3012
                MsgType: "Q3012",
                Instrumenttype: "12"
            }
            break;
        case "tenm":          
            typeObj = {         // 10分钟K线：Q3013
                MsgType: "Q3013",
                Instrumenttype: "13"
            }
            break;
        case "fifm":
            typeObj = {         // 15分钟K线：Q3014
                MsgType: "Q3014",
                Instrumenttype: "14"
            }
            break;
        case "thim":
            typeObj = {         // 30分钟K线：Q3015
                MsgType: "Q3015",
                Instrumenttype: "15"
            }
            break;
        case "hour":       
            typeObj = {         // 60分钟K线：Q3016
                MsgType: "Q3016",
                Instrumenttype: "16"
            }
            break;
        default:;
    };
    return typeObj;
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
    this.KChart = echarts.init(document.getElementById('f_kline_charts'))
    // this.option = options;      // 将请求参数等，存储在socket中
    // this.HistoryData = options.HistoryData?options.HistoryData:null;        // 历史数据存储，为了添加新数据时，能够准确记录所有数据
    // 心跳包
    this.HeartSend = {          
        InstrumentID: options.InstrumentID,
        ExchangeID: options.ExchangeID,
        MsgType: "Q8050"
    };
    this.HistoryData = {
        hDate: [],                  // 日期
        hDay: [],                   // 星期
        hTime: 0,                   // 如果为日K线，存储最后一条时间
        hCategoryList: [],          // 横轴
        hValuesList: [],            // 值-开收低高
        hValuesPercentList: [],     // 值-对应的百分比
        hVolumesList: [],           // 成交量
        hZValuesList: [],           // 涨幅
        hZValuesListPercent: [],    // 涨幅百分比
        hZf: [],                    // 振幅
        hZfList: [],                // 振幅百分比
        preLineType: null             // 前一次查询的线类型
    };
    this.KLineSet = {
        mouseHoverPoint: 0,         // 当前现实的数据索引
        isHoverGraph: false,        // 是否正在被hover
        zoom: 10,
        start: 0
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
                            } catch (e) {1
                                this.reconnect(); //如果失败重连
                            }
                        },
    reconnect:  function () {
                    var _target = this;
                    if (_target.lockReconnect) return;
                    _target.lockReconnect = true;
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
    getHistoryKQAll:    function(){
                            this.request(this.option.HistoryKQAll);
                        },
    // 订阅分钟K线
    getKWatch:       function(){
                            this.request(this.option.KWatch);
                        },
    // 取消订阅分钟K线
    getKWatchCC:     function(){
                            this.request(this.option.KWatchCC);
                        },
    getHeartSend:       function(){
                            this.request(this.HeartSend);
                        },
};
// websocket请求
var initSocketEvent = function(socket){

    socket.ws.onclose = function () {
                    // console.log("终端重连……");
                    socket.reconnect(); //终端重连
                },
    socket.ws.onerror = function () {
                    // console.log("报错重连……");
                    socket.reconnect(); //报错重连
                },
    socket.ws.onopen = function () {
                    // console.log("open");
                    
                    //心跳检测重置
                    socket.reset().start();                 // 第一次建立连接则启动心跳包

                    /*
                     * 个股/指数 实时数据，通过快照接口
                     * 其他数据，处理方式不同
                     */
                    // socket.option.lineType-区分查询历史数据和指数/个股信息
                    if(socket.option.lineType&&socket.option.lineType!="mline"){
                        socket.getHistoryKQAll();
                    }
                    
                },
    socket.ws.onmessage = function (evt) {
                    // console.log("打开成功");
                    var jsons  = evt.data.split("|");  //每个json包结束都带有一个| 所以分割最后一个为空
                    $.each(jsons,function (i,o) {
                        if(o!==""){
                            var data = eval("(" + o + ")");
                            var dataList = data.KLineSeriesInfo?data.KLineSeriesInfo:new Array(data);
                            var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
                            var ErrorCode = data["ErrorCode"]?data["ErrorCode"]:null;
                            if(ErrorCode){
                                console.info(data["Content"])
                                return;
                            }
                            /*
                             * 个股/指数 实时数据，通过快照接口
                             * 其他数据，处理方式不同
                             */
                            // socket.option.lineType-区分查询历史数据和指数/个股信息
                            switch(MsgType){
                                case "P0001":       // 订阅日K线
                                    // K线接口
                                    KCharts(dataList);
                                    break;
                                case "P0011":        // 1分钟K线订阅分钟线应答
                                case "P0012":        // 5分钟K线订阅分钟线应答
                                case "P0013":        // 10分钟K线订阅分钟线应答
                                case "P0014":        // 15分钟K线订阅分钟线应答
                                case "P0015":        // 30分钟K线订阅分钟线应答
                                case "P0016":        // 60分钟K线订阅分钟线应答
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
                                    socket.getKWatch();      // 订阅当前日期K线=分钟K线
                                    KCharts(dataList, "history");
                                    break;    
                                case "R8050":  //心跳包
                                    // console.log(data);
                                default:
                            }
                        }
                    });
                    //如果获取到消息，心跳检测重置
                    //拿到任何消息都说明当前连接是正常的
                    socket.reset().start();
                }
};


/*
 * 绘制KCharts图相关函数
 */
// K线图方法
function KCharts(dataList, isHistory){
    if(dataList.length>0){
        $("#withoutData").hide().siblings().show();

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
        $("body").bind("mousemove", function (event) {

            if($("#f_kline_charts div:eq(1)").css("display")=="block"&&$("#f_kline_charts div:eq(1)").css("top")!="auto"){
                $("#kline_tooltip").show();
            }else{
                $("#kline_tooltip").hide();
            }
            // toolContentPosition(event);
            // $("#kline_tooltip").show();
        });
        $("body").mousemove();
        // // 鼠标滑过，出现信息框
        $("#f_kline_charts").bind("mouseenter", function (event) {
            toolContentPosition(event);
            // $("#kline_tooltip").show();
            _this = $("#kline");
        });
        $("#f_kline_charts").bind("mousemove", function (event) {
            KLineSocket.KLineSet.isHoverGraph = true;
            // $("#kline_tooltip").show();
            toolContentPosition(event);

            _this = $("#kline");
        });
        $("#f_kline_charts").bind("mouseout", function (event) {
            KLineSocket.KLineSet.isHoverGraph = false;
            // $("#kline_tooltip").hide();
            KLineSocket.KLineSet.mouseHoverPoint = 0;
            initMarketTool();// 显示信息
            $(_this).children(".charts-focus").blur();
            _this = window;
        });


        // 右侧最新价格标签
        updatePointLabel();

    }
};
// 解析获取到的数据
function splitData(data, isHistory) {
    let k_date = [],                        // 日期
        k_day = [],                         // 星期
        k_time = [],                        // 时间
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
            k_categoryData.push(e_date);
        }else{
            e_time = e_date + " " + e_day + " " + formatTime((object.Time/100000>=1)?object.Time:("0"+object.Time));
            k_categoryData.push(e_time);
        }  

        if(!KLineSocket.option.lastClose){
            KLineSocket.option.lastClose = object.Open;                          // 上一根柱子的收盘价
        }

        // 如果是最后一条数据的更新，lastClose就是前一根柱子的收盘价
        if(k_categoryData[0].toString() == KLineSocket.HistoryData.hCategoryList[KLineSocket.HistoryData.hCategoryList.length-1]){
            KLineSocket.option.lastClose = KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-2][1];
        }

        let e_open = (object.Open),          // 开
            e_highest = (object.High),       // 高
            e_lowest = (object.Low),         // 低
            e_price = ((KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year")&&(!isHistory))?(object.Last):(object.Price),           // 收盘价
            e_value = [                                       // 开收低高-蜡烛图数据格式
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
            e_volumnData = object.Volume,                              // 成交量---单位：股
            e_zValues = KLineSocket.option.lastClose?(e_price-KLineSocket.option.lastClose):0,               // 涨幅-相对昨收      
            e_zValuesPercent = (e_zValues*100/KLineSocket.option.lastClose),              // 涨幅百分比
            e_amplitude = (e_highest - e_lowest),                      // 振幅
            e_amplPercent = (100*e_amplitude/KLineSocket.option.lastClose);               // 振幅百分比

        if(isHistory){
            e_volume = (e_price-e_open)>=0?[i,e_volumnData,-1]:[i,e_volumnData,1];   // 成交量-数组，存储索引，值，颜色对应的值                         
        }else{
            e_volume = (e_price-e_open)>=0?[KLineSocket.HistoryData.hVolumesList.length,e_volumnData,-1]:[KLineSocket.HistoryData.hVolumesList.length,e_volumnData,1];  
        }

        KLineSocket.option.lastClose = e_price;

        // 每条数据存入数组中
        k_date.push(e_date);                
        k_day.push(e_day);   
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
        date: k_date,                       
        day: k_day,                        
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
        KLineSocket.HistoryData.hDate = data.date;
        KLineSocket.HistoryData.hDay = data.day;
        KLineSocket.HistoryData.hCategoryList = data.categoryData;    
        KLineSocket.HistoryData.hValuesList = data.values;
        KLineSocket.HistoryData.hValuesPercentList = data.valuesPercent;
        KLineSocket.HistoryData.hVolumesList = data.volumes;
        KLineSocket.HistoryData.hZValuesList = data.zValues;
        KLineSocket.HistoryData.hZValuesListPercent = data.zValuePercent;
        KLineSocket.HistoryData.hZf = data.amplitude;
        KLineSocket.HistoryData.hZfList = data.amplPercent;
    }else{
        var n_date = data.date[0];
        var n_day = data.day[0];
        var n_category = data.categoryData[0];  // 最后一分钟的时间
        var n_values = data.values[0];          // 要存储的values
        var n_zValues = data.zValues[0];        // 涨跌
        var n_zValuePercent = data.zValuePercent[0]; // 涨跌幅
        var n_volumes = data.volumes[0];            // 成交量
        var n_valuesPercent = data.valuesPercent[0];
        var n_zf = data.amplitude[0];
        var n_zfList = data.amplPercent[0];
        var lastTime = KLineSocket.HistoryData.hCategoryList[KLineSocket.HistoryData.hCategoryList.length-1];

        // 最新一条是历史category数据中的最后一条，则更新最后一条数据,否则push到数组里面
        if(n_category.toString() == lastTime){

            n_volumes[0] = n_volumes[0]-1;

            KLineSocket.HistoryData.hValuesList[KLineSocket.HistoryData.hValuesList.length-1] = n_values;
            KLineSocket.HistoryData.hVolumesList[KLineSocket.HistoryData.hVolumesList.length-1] = n_volumes;
            KLineSocket.HistoryData.hZValuesList[KLineSocket.HistoryData.hZValuesList.length-1] = n_zValues;
            KLineSocket.HistoryData.hZValuesListPercent[KLineSocket.HistoryData.hZValuesListPercent.length-1] = n_zValuePercent;
            KLineSocket.HistoryData.hValuesPercentList[KLineSocket.HistoryData.hValuesPercentList.length-1] = n_valuesPercent;
            KLineSocket.HistoryData.hZf[KLineSocket.HistoryData.hZf.length-1] = n_zf;
            KLineSocket.HistoryData.hZfList[KLineSocket.HistoryData.hZfList.length-1] = n_zfList;
        }else{
            KLineSocket.HistoryData.hDate.push(n_date);
            KLineSocket.HistoryData.hDay.push(n_day);
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
                    left: "5%",
                    right: 100,
                    top: "2%",
                    height: '86.3%'
                },
                {
                    left: "5%",
                    right: 100,
                    bottom: '11.7%',
                    height: '8%'
                }
            ],
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: [0, 1],
                    start: 0,
                    end: 100
                },
                {
                    show: true,
                    xAxisIndex: [0, 1],
                    type: 'slider',
                    top: '95%',
                    start: 0,
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
                    labelFormatter: function (valueStr) {
                        if(KLineSocket.option.lineType!="mline"){
                            var valueList = KLineSocket.HistoryData.hCategoryList[valueStr].split(" ");
                            return valueList[valueList.length-1];
                        }
                        // return KLineSocket.HistoryData.hCategoryList[valueStr];
                    },
                    showDetail: false
                },
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
                    axisLabel: { show: false },
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
                        color: '#999',
                        fontSize: 20,
                        formatter : function(value, index){
                            if(KLineSocket.option.lineType=="day"||KLineSocket.option.lineType=="week"||KLineSocket.option.lineType=="month"||KLineSocket.option.lineType=="year"){
                                    return value;
                                }else{
                                    return value.split(" ")[2];
                                    
                                }
                        }
                    }
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
                    name: 'K',
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
    }else{
        // 初始化并显示数据栏和数据信息框的信息
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
                    data: KLineSocket.HistoryData.hValuesList,
                },
                {
                    data: KLineSocket.HistoryData.hVolumesList
                }
            ]
        }); 
    }
};

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
    var continerWidth = $("#f_kline_charts").width(), toolContent = $("#kline_tooltip").width();
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
        
        $(".volume", countent).text(setUnit(KLineSocket.HistoryData.hVolumesList[setPoint][1],null,"En"));
        
    }else{
        $(".open", countent).text("-");
        $(".highest", countent).text("-");
        $(".price", countent).text("-");
        $(".lowest", countent).text("-");
        $(".volume", countent).text("-");
        $(".z-value", countent).text("-");

    }
};