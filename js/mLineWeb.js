var yc=0,xml,decimal=2,tFlag=false;
var stockType = '';
var todayDate;//通过xml查询得到的当前日期
var MarketStatus;//市场状态
// 十大流通股 公司详情请求地址
// var DKServiceUrl = "https://117.78.45.83:8443/";//正式环境 
var DKServiceUrl = "https://fd.cnfic.com.cn:8443/";//正式环境 修改为 fd.cnfic.com.cn
//var DKServiceUrl = "http://172.17.20.178:8080/" 内网环境

;(function($,undefined){
    var socket = null;
    var myChart = null;
    var mouseHoverPoint = 0;
    var isHoverGraph = false;
    var sub = 0;
    var colorList = ['#e22f2a','#3bc25b','#555','#999','#e5e5e5'];//红色,绿色,555,999
    var start = 0,zoom = 10;//左右键时应用
    var stopTime = [];
    var WebSocketConnect = function(opt) {
        this.ws = null;
        this.defaults = {
            wsUrl : opt.wsUrl,//"ws://172.17.20.203:7681",  //开发
            lockReconnect : false,//避免重复连接 连接锁如果有正在连接的则锁住
            timeout : 60000,//60秒
            timeoutObj : null,
            serverTimeoutObj : null,
        };
        // 心跳包请求参数
        this.XTB = {
            "MsgType":"Q8050",
            "ExchangeID":opt.exchangeID,
            "InstrumentID":opt.id
        },
        this.options = $.extend({},this.defaults,opt);
    };
    //建立socket连接
    WebSocketConnect.prototype.createWebSocket = function(){
        try {
            this.ws = new WebSocket(this.options.wsUrl);
            return this.ws;
        } catch (e) {
            this.reconnect(this.options.wsUrl); //如果失败重连
        }
    };
    //socket重连
    WebSocketConnect.prototype.reconnect = function () {
        var $this = this;
        var _this = this.options;
        if (_this.lockReconnect) return;
        _this.lockReconnect = true;

        //没连接上会一直重连，设置延迟避免请求过多
        setTimeout(function () {
            console.log("重连咯~~~~");
            // myChart.dispose();
            var ws = $this.createWebSocket(_this.wsUrl);
            var initXML = new InitXMLIChart(_this);
            yc = 0;
            initEvent(ws,initXML);
            _this.lockReconnect = false;
        }, 2000);
    };
    //发送请求
    WebSocketConnect.prototype.request = function (data) {
        this.ws.send(JSON.stringify(data));
    };
    //重置心跳包
    WebSocketConnect.prototype.reset = function () {
        clearTimeout(this.options.timeoutObj);
        clearTimeout(this.options.serverTimeoutObj);
        return this;
    };
    //开始心跳包
    WebSocketConnect.prototype.start = function () {
        var self = this.options;
        var _this = this;
        self.timeoutObj = setTimeout(function () {
            //onmessage拿到返回数据就说明连接正常
            _this.request(_this.XTB);
            self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
                _this.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
            }, self.timeout);
        }, self.timeout);
    };
    
    // 初始化代码表
    var InitXMLIChart = function(opt){
        this.defaults = {
            // 请求代码表地址
            stockXMlUrl:opt.stockXMlUrl,
            decimal : 2,
            typeIndex:'',
            nowDateTime:[],
            id:opt.id,//指数ID
            exchangeID:opt.exchangeID,//交易所ID
            c_data : [],
            v_data : [],
            interval : 0,
            history_data:[],//价格历史数据
            z_history_data:[],//涨跌幅历史数据
            a_history_data:[],//成交量
            flag_data : [], //成交量颜色记录 1为红 -1为绿
            stockType:'',//指数或者个股
            HistoryDataZBCJ:{
                time: null,
                price: null,
                volumn: null,
                dir: null
            },//逐笔最后一条时间、成交量、成交价格、买卖方向，
            //订阅快照请求
            HQAll : {
                "MsgType":"S1010",
                "ExchangeID":opt.exchangeID,
                "InstrumentID":opt.id,
                "Instrumenttype":"1"
            },
            // 获取历史数据
            historyData : {
                "MsgType": "Q3011",
                "ExchangeID": opt.exchangeID,
                "InstrumentID": opt.id,
                "StartIndex": "0",
                "StartDate": "-1",
                "StartTime": "0", 
                "Count": "0"
            },
            // 实时推送数据
            RTDATA : {
                "MsgType":"S1010",
                "ExchangeID":opt.exchangeID,
                "InstrumentID":opt.id,
                "Instrumenttype":"11"
            },
            // 清盘
            QPDATA : {
                "MsgType":"Q8002",
                "ExchangeID":opt.exchangeID,
                "InstrumentID":opt.id,
                "PructType":"0"
            },
            // 快照、盘口、扩展盘口、逐笔
            KWatchKZ_PK_KZPK_ZB:{              
                InstrumentID: opt.id,
                ExchangeID: opt.exchangeID,
                MsgType:"S1010",
                Instrumenttype:"1,2,3,32"
            },
            // 快照、扩展盘口、逐笔
            KWatchKZ_KZPK_ZB:{              
                InstrumentID: opt.id,
                ExchangeID: opt.exchangeID,
                MsgType:"S1010",
                Instrumenttype:"1,3,32"
            },
            // 盘口
            watchPK : {
                InstrumentID: opt.id,
                ExchangeID: opt.exchangeID,
                MsgType: "S1010",
                Instrumenttype: "2"
            },
            // 扩展盘口----个股
            watchPKExt: {
                InstrumentID: opt.id,
                ExchangeID: opt.exchangeID,
                MsgType: "S1010",
                Instrumenttype: "3"
            },
            // 扩展盘口---指数
            watchPKExtZS: {
                InstrumentID: opt.id,
                ExchangeID: opt.exchangeID,
                MsgType: "S1010",
                Instrumenttype: "3"
            },
            // 逐笔成交
            watchZBCJ : {
                InstrumentID: opt.id,
                ExchangeID: opt.exchangeID,
                MsgType: "S1010",
                Instrumenttype: "32"
            },
        };
        this.options = $.extend({},this.defaults,opt);
    };
    InitXMLIChart.prototype.initXML = function(){
        var _options = this.options;
        var _this = this;
        //第一次打开终端,初始化代码表第一次默认请求
        var date = new Date();
        $.ajax({
            url:  _options.stockXMlUrl,
            type: 'GET',
            dataType: 'json',
            async:false,
            cache:false,
            timeout:60000,
            error: function(xml){
                console.log("请求代码表出错");
            },
            success: function(data){
                if(data.ReturnCode == 0){
                    data = data.CodeInfo[0];
                    // 从代码表中获取昨收值
                    setStockInfo(data);
                    yc = data.PreClose?parseFloat(data.PreClose):0;
                    compareTime(data,_options);
                    socket = new WebSocketConnect(_options);
                    var ws = socket.createWebSocket();
                    initEvent(ws,_this);
                }else{
                    console.log("请求码表出错");
                }
            }
        });
    };
    function setStockInfo(_codeList){
        //指数[0~8],股票[16~31]
        if(_codeList.ProductType>=0&&_codeList.ProductType<=8){
            stockType = "Field";
        }
        if(_codeList.ProductType>=16&&_codeList.ProductType<=31){
            stockType = "Stock";
        }
    }
    
    //1、用id判断出是哪个指数，获取其开始时间和结束时间、保留小数位
    function compareTime(data,_options){
        var startTime,endTime,startTime1,endTime1;
        if(data.time.indexOf(";")>-1){//分段时间
            startTime = (data.time.split(";")[0]).split("-")[0];
            endTime = (data.time.split(";")[0]).split("-")[1];
            startTime1 = (data.time.split(";")[1]).split("-")[0];
            endTime1 = formatTimeMin((data.time.split(";")[1]).split("-")[1]);
            startTime1  = startTime1.split(":")[0] +":"+ parseInt(startTime1.split(":")[1])+1;
        }else{//无分段时间
            startTime = data.time.split("-")[0];
            endTime = data.time.split("-")[1];
            startTime1 = endTime1 = "";
        }
        decimal = _options.decimal = parseInt(data.PriceDecimal);//保留小数位数
        _options.typeIndex = data.ProductType;//指数类型
        //指数[0~8],股票[16~31]
        if(data.ProductType>=0&&data.ProductType<=8){
            _options.stockType = "Field";
        }
        if(data.ProductType>=16&&data.ProductType<=31){
            _options.stockType = "Stock";
        }
        // 股票代码
        $(".tb-fn-title").text(data.InstrumentName+"("+data.InstrumentCode+")");
        _options.stockName = data.InstrumentName;
        var startT = parseInt(startTime.split(":")[0]);
        var endT = parseInt(endTime.split(":")[0]);
        if(endTime1){
            endT = parseInt(endTime1.split(":")[0]);
        }
        var json,json1;
        if(startT > endT){//国际时间，跨天了，需要将当前时间减一
            sub = -1;
            json = {
                startTime:startTime,
                endTime:endTime1
            };
            _options.nowDateTime.push(json);
        }else{//未跨天
            sub = 0;
            json = {
                startTime:startTime,
                endTime:endTime
            };
            _options.nowDateTime.push(json);
            if(startTime1){
                json1 = {
                    startTime1:startTime1,
                    endTime1:endTime1
                };
                _options.nowDateTime.push(json1);
            }
        }
    }
    function initEvent(ws,_this){
        var $this = _this;
        ws.onclose = function () {
            socket.reconnect(); //终端重连
        };
        ws.onerror = function () {
            socket.reconnect(); //报错重连
        };
        ws.onopen = function () {
            //心跳检测重置
            socket.reset().start(); //都第一次建立连接则启动心跳包
            $this.take_HQ(); //订阅行情 获取昨收
            // 获取历史数据
            $this.getHistoryData();
            //获取今日数据推送
            $this.getRealTimePush();
            // 清盘
            $this.getQP();
            //请求盘口-买卖盘
            //指数[0~8],股票[16~31]
            switch(stockType){
                case "Field": 
                    //请求盘口扩展-内外盘-委比委差等
                    $this.getKWatchKZ_KZPK_ZB();
                break;
                case "Stock": 
                    //请求盘口扩展-内外盘-委比委差等
                    $this.getKWatchKZ_PK_KZPK_ZB();
                break;
                default:;
            }
            //初始化报价图;
            // if(!$(".shibors").find("#mytable").length>0){
            //     $(".shibors").marketTable("init");
            // }
        };
        ws.onmessage = function (evt) {
            var data  = evt.data.split("|")[0];  //每个json包结束都带有一个| 所以分割最后一个为空
            data = eval( "(" + data + ")" );
            data = data || data[0];
            var MsgType =  data["MsgType"] || data[0]["MsgType"]; //暂时用他来区分推送还是历史数据 如果存在是历史数据,否则推送行情
            var beginTime,finishTime,beginTime1,finishTime1;
            //1、第一次进来要通过订阅来获取昨收
            // 2.1、通过昨收来绘制历史数据
            // 2.2、动态添加今日的数据 
            switch(MsgType)
            {
                case "R3011"://订阅历史数据
                    if(data.ErrorCode=="9999" || data.ExchangeID != $this.options.exchangeID || data.InstrumentID != $this.options.id){
                        return;
                    }
                    initCharts(data,'',$this);
                    break;
                case "P0001"://订阅快照
                    if(data.ErrorCode=="9999"){
                        $("#main1").html("暂无数据");
                        return;
                    }
                    if(data.ExchangeID != $this.options.exchangeID || data.InstrumentID != $this.options.id){
                        return;
                    }
                    setFieldInfo(data);
                    if(!yc){
                        yc = parseFloat(data.PreClose).toFixed($this.options.decimal); //获取昨收值
                        var dateT = data.Date;
                        $this.v_data = getxAxis(dateT,$this.options);
                        initYCCharts(yc,$this);
                        todayDate = -1;
                        // if(parseFloat(data.Time) > 93015){
                        //     tFlag = true;
                        // }
                        // if(tFlag){
                        //     todayDate = -1;
                        // }else{
                        //     todayDate = parseInt(data.Date)-1;
                        // }
                        var tradingHistoryData={
                            "MsgType":"Q3032",
                            "ExchangeID":$this.options.exchangeID,
                            "InstrumentID":$this.options.id,
                            "PructType":$this.options.typeIndex.toString(),
                            "StartIndex":"-1",
                            "StartDate":todayDate.toString(),
                            "Count":(stockType == "Field"?"14":"5")
                        };
                        socket.request(tradingHistoryData);
                        return;
                    }
                     // 历史成交记录
                break;
                case "P0011"://订阅分钟线
                    if(data.ErrorCode=="9999"){
                        return;
                    }
                    if(data.ExchangeID != $this.options.exchangeID || data.InstrumentID != $this.options.id){
                        return;
                    }
                    if(myChart != undefined){
                        initCharts(data,"add",$this);
                    }
                break;
                case "R8002"://清盘
                    if(data.ErrorCode=="9999"){
                        return;
                    }
                    if(data.ExchangeID != $this.options.exchangeID || data.InstrumentID != $this.options.id){
                        return;
                    }
                    MarketStatus = data["MarketStatus"] || data[0]["MarketStatus"];
                    if(MarketStatus == 1){//收到清盘指令  操作图表
                        redrawChart(data,$this);
                    }
                    if(MarketStatus == 7 || MarketStatus == 1){

                    }
                break;
                case "P0002":    //五档盘口
                    if(data.ErrorCode=="9999"){
                        return;
                    }
                    if(data.ExchangeID != $this.options.exchangeID || data.InstrumentID != $this.options.id){
                        return;
                    }
                    // if(!data || data.) return
                    setfillPK(data);
                    break;
                case "P0003":    //五档盘口扩展-内外盘-委比委差等
                    if(data.ErrorCode=="9999"){
                        return;
                    }
                    if(data.ExchangeID != $this.options.exchangeID || data.InstrumentID != $this.options.id){
                        return;
                    }
                    switch(stockType){
                        case "Field":
                            setfillPKExtZS(data);
                            break;
                        case "Stock":
                            setfillPKExt(data);
                            break;
                        default:;
                    }
                    break;
                case "P0032":    //逐笔成交
                    if(data.ErrorCode=="9999"){
                        return;
                    }
                    if(data.ExchangeID != $this.options.exchangeID || data.InstrumentID != $this.options.id){
                        return;
                    }
                    tFlag = true;
                    setfillZBCJ(data,$this);
                    break;
                    case "R3032"://逐笔成交历史记录
                    if(data.ErrorCode=="9999"){
                        return;
                    }
                    if(data.ExchangeID != $this.options.exchangeID || data.InstrumentID != $this.options.id){
                        return;
                    }
                    if(!data.TradeRecordInfo || data.TradeRecordInfo.length<=0) return;
                    fillTrading(data.TradeRecordInfo,$this);
                    break;
                    case "R8050":  //心跳包
                    console.log(data)
                    // console.log(data);
                default:
            }
            socket.reset().start();
        };
    }
    //请求订阅 获取昨收
    InitXMLIChart.prototype.take_HQ = function(){
        socket.request(this.options.HQAll);
    },
    //获取历史指数数据
    InitXMLIChart.prototype.getHistoryData = function(){
        socket.request(this.options.historyData);
    },
    // 获取实时分钟推送
    InitXMLIChart.prototype.getRealTimePush = function(){
        socket.request(this.options.RTDATA);
    },
    // 清盘
    InitXMLIChart.prototype.getQP = function(){
        socket.request(this.options.QPDATA);
    };
    // 快照、盘口、扩展盘口、逐笔成交   个股
    InitXMLIChart.prototype.getKWatchKZ_PK_KZPK_ZB = function(){
        socket.request(this.options.KWatchKZ_PK_KZPK_ZB);
    };
    //快照、扩展盘口、逐笔成交   指数
    InitXMLIChart.prototype.getKWatchKZ_KZPK_ZB = function(){
        socket.request(this.options.KWatchKZ_KZPK_ZB);
    }; 
    // 盘口
    InitXMLIChart.prototype.getWatchPK = function(){
        socket.request(this.options.watchPK);
    };
    // 盘口扩展
    InitXMLIChart.prototype.getWatchPKExt = function(){
        socket.request(this.options.watchPKExt);
    };
    // 指数扩展盘口
    InitXMLIChart.prototype.getWatchPKExtZS = function(){
        socket.request(this.options.watchPKExtZS);
    };
    // 逐笔成交
    InitXMLIChart.prototype.getWatchZBCJ = function(){
        socket.request(this.options.watchZBCJ);
    };    
    // 查询历史信息
    function fillTrading(data,$this){
        var strHtml = '';
        data.forEach(function (item){
            var abside = "";
            if(stockType != "Field"){
                abside = (item.ABSide==83)?("<span class='green'>卖出</span>"):((item.ABSide==66)?("<span class='red'>买入</span>"):(item.ABSide==0)?("<span>平盘</span>"):"");
            }
            strHtml += '<li><span>'+formatTimeSec(item.Time)+'</span><span>'+parseFloat(item.RecorePrice).toFixed(2)+'</span><span>'+item.Volume+'</span>'+abside +'</li>';
        });
        $(".cb-cj ul").html(strHtml);
    }
    // 设置顶部信息  当前指数/个股 请求快照数据
    function setFieldInfo(data){
        var high,low,open,zf,price,zd,zdf,dealVal,dealVol,preClose;
        if(data){
            high = data.High;
            low = data.Low;
            open = data.Open;
            dealVal = data.Value;
            dealVol = data.Volume;
            price = data.Last;
            preClose = data.PreClose;
            // 未开盘时，昨收为0，计算涨跌幅和振幅会出现NAN，于是进行区分，为0%
            zf = preClose==0?floatFixedTwo(0):floatFixedTwo((high - low)/preClose*100);
            zd = price - preClose;
            zdf = preClose==0?floatFixedTwo(0):floatFixedTwo((zd/preClose)*100);
            if(price==0){
                zd = 0;
                zdf = floatFixedTwo(0.00);
            }

            var html = "";
            //指数[0~8],股票[16~31]
            if(stockType=="Field"){
                html = "<li><p>最高：</p><span class="+getColorName(high,preClose)+">"+floatFixedDecimal(high)+"</span></li>"
                        +"<li><p>最低：</p><span class="+getColorName(low,preClose)+">"+floatFixedDecimal(low)+"</span></li>"
                        +"<li><p>成交额：</p><span>"+setUnit(floatFixedDecimal(dealVal),true)+"元</span></li>"
                        +"<li><p>成交量：</p><span>"+(dealVol>=100?setUnit(dealVol/100,true)+"手":dealVol+"股")+"</span></li>"
                        +"<li><p>今开：</p><span class="+getColorName(open,preClose)+">"+floatFixedDecimal(open)+"</span></li>"
                        +"<li><p>昨收：</p><span>"+floatFixedDecimal(preClose)+"</span></li>"

                        +"<li><p>振&nbsp;&nbsp;&nbsp;&nbsp;幅：</p><span>"+zf+"%</span></li>";
                $(".tb-fielList").addClass("tb-fielList-field");
            }else{
                html = "<li><p>最高：</p><span class="+getColorName(high,preClose)+">"+floatFixedDecimal(high)+"</span></li>"
                        +"<li><p>今开：</p><span class="+getColorName(open,preClose)+">"+floatFixedDecimal(open)+"</span></li>"
                        +"<li><p>成交额：</p><span>"+setUnit(floatFixedDecimal(dealVal))+"元</span></li>"
                        +"<li><p>市盈率：</p><span>-</span></li>"
                        +"<li><p>换手率：</p><span>-</span></li>"
                        +"<li><p>最低：</p><span class="+getColorName(low,preClose)+">"+floatFixedDecimal(low)+"</span></li>"
                        +"<li><p>昨收：</p><span>"+floatFixedDecimal(preClose)+"</span></li>"
                        +"<li><p>成交量：</p><span>"+(dealVol>=100?setUnit(dealVol/100,true)+"手":dealVol+"股")+"</span></li>"
                        +"<li><p>市&nbsp;&nbsp;&nbsp;&nbsp;值：</p><span>-</span></li>"
                        +"<li><p>振&nbsp;&nbsp;&nbsp;&nbsp;幅：</p><span>"+zf+"%</span></li>";
            }

            

            var html2 = "<span class="+(price==0?"black":getColorName(price,preClose))+">"+(price==0?"-":floatFixedDecimal(price))+"</span>"
                        +"<span class="+getColorName(zd,"0")+">"+floatFixedDecimal(zd)+"</span>"
                        +"<span class="+getColorName(zdf,"0")+">"+zdf+"%</span>";
            $(".tb-fn-num").html(html2);
            $(".tb-fielList").html(html);
        }
    }
    // 五档盘口-五档盘口数据，没有委比委差
    function setfillPK(data){
        if($(".cb-pk h2").length==0){
            var html =  "<h2>五档盘口</h2>\
                        <div class=\"cb-title\">\
                            <p>委比：<span class=\"cbt-wb \"></span></p>\
                            <p>委差：<span class=\"cbt-wc \"></span></p>\
                        </div>\
                        <ul class=\"cb-txtOffer\"></ul>\
                        <ul class=\"cb-txtBids\"></ul>\
                        <div class=\"cb-title cb-title-sub\">\
                            <p>外盘：<span class=\"red cbt-wp\"></span></p>\
                            <p>内盘：<span class=\"green cbt-np\"></span></p>\
                        </div>";

            $(".cb-pk").html(html);
        }
        var bids = data.Bids,       // 买
            offer = data.Asks,     // 卖
            // obj_titalB = setUnit(data.TotalBidVolume/100,true,false,true).value,      // 买盘(外盘)总量
            // obj_titalO = setUnit(data.TotalOfferVolume/100,true,false,true).value,    // 卖盘(内盘)总量
            txtOffer = "",
            txtBids = "", 
            upperCase = ["一","二","三","四","五"];
        $.each(upperCase,function(i,obj){
            // 拼接盘口和逐笔成交的拼接字符串
            txtOffer = setPKHtml(obj,"卖",offer[i]) + txtOffer;
            txtBids += setPKHtml(obj,"买",bids[i]);
        });

        $(".cb-txtOffer").html(txtOffer);
        $(".cb-txtBids").html(txtBids);
    }
    // 五档扩展接口的委比委差-个股信息-存在五笔盘口信息
    function setfillPKExt(data){
        var wb = data.Entrustment/10000;
        var wc = data.EntrustmentSub;
        $(".cbt-wb").attr("class","cbt-wb "+getColorName(wb,0)).html( floatFixedTwo(wb)+"%" );
        $(".cbt-wc").attr("class","cbt-wc "+getColorName(wc,0)).html( floatFixedZero(wc/100) );

        $(".cbt-np").html( setUnit(data.InnerVolume/100,true,false)+"手" );
        $(".cbt-wp").html( setUnit(data.OuterVolume/100,true,false)+"手" );
    }
    // 五档扩展接口-指数接口-没有五笔盘口数据信息
    function setfillPKExtZS(data){
        if($(".cb-pk h2").length==0){
            var html = "<ul class=\"cb-zs-pk\">\
                            <li><span>上涨数</span><span class=\"cb-zspk-szs\"></span></li>\
                            <li><span>平盘数</span><span class=\"cb-zspk-pps\"></span></li>\
                            <li><span>下跌数</span><span class=\"cb-zspk-xds\"></span></li>\
                        </ul>";
            $(".cb-pk").html(html);
        }
        // $(".cb-zspk-szs").text(data.Ups!=undefined?(yc!=undefined?floatFixedDecimal(data.Ups):floatFixedTwo(data.Ups)):"");
        // $(".cb-zspk-pps").text(data.HoldLines!=undefined?(yc!=undefined?floatFixedDecimal(data.HoldLines):floatFixedTwo(data.HoldLines)):"");
        // $(".cb-zspk-xds").text(data.Downs!=undefined?(yc!=undefined?floatFixedDecimal(data.Downs):floatFixedTwo(data.Downs)):"");
        $(".cb-zspk-szs").text(data.Ups!=undefined?(yc!=undefined?data.Ups:data.Ups):"");
        $(".cb-zspk-pps").text(data.HoldLines!=undefined?(yc!=undefined?data.HoldLines:data.HoldLines):"");
        $(".cb-zspk-xds").text(data.Downs!=undefined?(yc!=undefined?data.Downs:data.Downs):"");
    }
    // 五档盘口的统一拼接整个模块
    function setPKHtml(obj, status, data){
        var price,volume;
        if(data){
            if(data.Price==0){
                price = "--"
            }else{
                price = yc!=undefined?floatFixedDecimal(data.Price):floatFixedTwo(data.Price);
            }
            if(data.Volume==0){
                volume = "--"
            }else{
                volume = Math.round(data.Volume/100);
            }
            var txtData = "<span class="+getColorName(data.Price,yc)+">"+price+"</span>\
                        <span>"+volume+"</span>";
        }else{
            var txtData = "<span></span><span></span>";
        }
        
        var text = "<li><span>"+status+obj+"</span>"+txtData+"</li>";
        return text;
    };
    // 逐笔成交拼接
    function setfillZBCJ(data,$this){
        // 停盘后，数据日期返回0
        if(data.Date=="0"||data.Date==undefined){
            return
        }
        // 数据处理
        var absideStr = abside = "";
        if(stockType != "Field"){
            absideStr = (data.ABSide==83)?("卖出"):((data.ABSide==66)?("买入"):(data.ABSide==0)?("平盘"):"");
            abside = (data.ABSide==83)?("<span class='green'>卖出</span>"):((data.ABSide==66)?("<span class='red'>买入</span>"):(data.ABSide==0)?("<span>平盘</span>"):"");
        }
        
        var timeIsAlready = $this.options.time==formatTimeSec(data.Time),
            priceIsAlready = $this.options.price==(yc!=undefined?floatFixedDecimal(data.RecorePrice):floatFixedTwo(data.RecorePrice)),
            volumnIsAlready = $this.options.volumn==Math.round(data.Volume/100),
            dirIsAlready = $this.options.dir==absideStr;
        // 断网重连处理-存入数据，将新数据和存储的数据进行对比
        $this.options.time = formatTimeSec(data.Time);
        $this.options.price = (yc!=undefined?floatFixedDecimal(data.RecorePrice):floatFixedTwo(data.RecorePrice));
        $this.options.volumn = Math.round(data.Volume/100);
        $this.options.dir = absideStr;

        if(timeIsAlready&&priceIsAlready&&volumnIsAlready&&dirIsAlready){
            return;
        }

        if($(".cb-cj ul").length==0){
            $(".cb-cj").html("<h2>逐笔成交</h2><ul></ul>");
        }
        // 创建新的li-内容是字符串的拼接
        var liHtml = "<li><span>"+formatTimeSec(data.Time)+"</span><span>"+(yc!=undefined?floatFixedDecimal(data.RecorePrice):floatFixedTwo(data.RecorePrice))+"</span><span>"+Math.round(data.Volume/100)+"</span>"+abside+"</li>";
        var html = $(".cb-cj ul").html();
        html += liHtml;
        $(".cb-cj ul").html(html);

        // 列表中保留最多能显示的几条，移除多余的-从下而上为更新顺序
        var minHeight = $(".cb-right")[0].offsetHeight-$(".cb-pk")[0].offsetHeight-40*3-16;
        var length = Math.floor(minHeight/30);

        if($(".cb-cj li").length>length){
            $(".cb-cj li:lt("+ ( $(".cb-cj li").length-length ) +")").remove();
        }
    }
    //初始化分时图 
    function initCharts(data,type,$this){
        $this.options.v_data=$this.v_data;
        $this = $this.options;
        if (data) {
            $(".vol").show();
            yc = parseFloat(yc);
            var limitUp = parseFloat((yc + yc*0.1).toFixed($this.decimal));
            var limitDown = parseFloat((yc - yc*0.1).toFixed($this.decimal));
            var minY,middleY,maxY,minY1,maxY1;
            if(type == "add"){
                if(myChart != undefined){
                    var a_lastData = data;
                    var last_dataTime = formatTime(a_lastData.Time);//行情最新时间
                    var last_date = dateToStamp(formatDate(a_lastData.Date) +" " + last_dataTime);//最新时间时间戳
                    var zVale = parseFloat(((parseFloat(a_lastData.Price) - parseFloat(yc)) / parseFloat(yc) * 100).toFixed(2)); //行情最新涨跌幅
                    var aValue = parseFloat(a_lastData.Volume); //最新成交量
                    var flag = parseFloat(a_lastData.Price) - parseFloat(a_lastData.Open) >= 0 ? 1:-1;//成交量最新颜色标识

                    if((parseFloat(a_lastData.Price)) >= limitUp){
                        a_lastData.Price = limitUp;
                    }else if((parseFloat(a_lastData.Price)) <= limitDown){
                        a_lastData.Price = limitDown;
                    }
                    // $this.c_data.length : 时间轴长度
                    // last_date当前的时间
                    // i 当前时间轴索引
                    // $this.history_data.length历史数据长度
                    for(var i=0;i<$this.c_data.length;i++){
                        if(last_date == $this.c_data[i]){
                            $this.history_data[i] = parseFloat(a_lastData.Price);
                            $this.z_history_data[i] = parseFloat(zVale);
                            $this.a_history_data[i] = parseFloat(aValue);
                            $this.flag_data[i] = flag;
                            // 中间有断开
                            if(i > ($this.history_data.length-1) ){
                                for(var j=$this.history_data.length-1;j<=i;j++){
                                    $this.history_data[j].push(null);
                                    $this.z_history_data[j].push(null);
                                    $this.a_history_data[j].push(null);
                                    $this.flag_data[j].push(null);
                                    if(j == i){
                                        $this.history_data[j] = parseFloat(a_lastData.Price);
                                        $this.z_history_data[j] = parseFloat(zVale);
                                        $this.a_history_data[j] = parseFloat(aValue);
                                        $this.flag_data[j] = flag;
                                    }
                                }
                            }
                        }
                    }
                    
                    var marktToolData = [
                        $this.history_data[$this.history_data.length - 1],
                        $this.z_history_data[$this.z_history_data.length - 1],
                        $this.a_history_data[$this.a_history_data.length - 1],
                        formatDate(parseFloat($this.c_data[$this.history_data.length - 1]),"0")
                    ];
                    set_marketTool(marktToolData,$this); //设置动态行情条
                    var fvalue, r1;
                    fvalue = parseFloat(a_lastData.Price);
                    r1 = Math.abs(fvalue - yc);
                    // console.log(r1);
                    // debugger;
                    if (r1 >= $this.interval) {
                        $this.interval = r1 + r1*0.1;
                        minY = (yc - $this.interval).toFixed($this.decimal);
                        middleY = yc.toFixed($this.decimal);
                        maxY = (yc + $this.interval).toFixed($this.decimal);
                        if(minY <= limitDown){
                            minY = limitDown;
                        }
                        if(maxY >= limitUp){
                            maxY = limitUp;
                        }
                        minY1 = ((parseFloat(minY)-yc) / yc).toFixed(4);
                        maxY1 = ((parseFloat(maxY)-yc) / yc).toFixed(4);
                        split = parseFloat(((maxY - minY) / 6).toFixed($this.decimal));
                        split1 = parseFloat(((maxY1 - minY1) / 6).toFixed(6));

                        myChart.setOption({
                            yAxis: [{
                                min: minY,
                                max: maxY,
                                interval: split,
                                boundaryGap: [0, '100%'],
                                axisTick: {
                                    show: false
                                },
                                type: "value",
                                axisLabel: {
                                    formatter: function (value, index) {
                                        if (index == 3) {
                                            return ""
                                        } else {
                                            return parseFloat(value).toFixed($this.decimal);
                                        }
                                    }
                                }
                            },{
                                min: minY1,
                                max: maxY1,
                                interval: split1,
                                boundaryGap: [0, '100%'],
                                axisTick: {
                                    show: false
                                },
                                type: "value",
                                axisLabel: {
                                    formatter: function (value, index) {
                                        if (index == 3) {
                                            return ""
                                        } else {
                                            return parseFloat(value).toFixed($this.decimal)+ "%";
                                        }
                                    }
                                }
                            }],
                            series: 
                            [{
                                markLine: {
                                    data: [
                                        {
                                            name: 'Y 轴值为 100 的水平线',
                                            yAxis: middleY
                                        }
                                    ]
                                }
                            },
                            {
                                name:'limit',
                                type: 'line',
                                markLine: {
                                    lineStyle: {
                                        normal: {
                                            type: 'dashed',
                                            color: colorList[2],
                                            width:0
                                        }
                                    },
                                    // label: {
                                    //     normal: {
                                    //         position: "end",
                                    //         formatter: function (params) {
                                    //             return " " + params.value + ".00%";
            
                                    //         }
                                    //     }
                                    // },
                                    data: [
                                        {
                                            name: 'Y 轴值为 100 的水平线',
                                            yAxis: 0.00
                                        }
                                    ],
                                    symbol: ['none', 'none']
                                },
                                yAxisIndex: 1
                            },
                        ]
                        });
                    }
                    if (mouseHoverPoint == $this.history_data.length - 1) {
                        myChart.dispatchAction({
                            type: 'showTip',
                            seriesIndex: 0,
                            dataIndex: mouseHoverPoint,
                            name: "Mline",
                            position: function (pos, params, el, elRect, size) {
                                var obj = {top: 10};
                                obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
                                return obj;
                            }
                        });
                    }
                    myChart.setOption({
                        xAxis:[{
                            data:$this.v_data
                        },
                        {
                            data:$this.v_data
                        }],
                        series: [
                            {
                                data: $this.history_data,
                            },
                            {
                                data: $this.z_history_data
                            },
                            {
                                data: $this.a_history_data,
                                itemStyle:{
                                    normal:{
                                        color:function(params){
                                            if($this.flag_data[params.dataIndex] > 0){
                                                return colorList[0];
                                            }else{
                                                return colorList[1];
                                            }
                                        }
                                    }
                                }
                            },
                            // {
                            //     data: a_history_data
                            // }
                        ]
                    });
                }else{
                    $(".vol").hide();
                    console.log("初始化图表失败");
                    $("#MLine").hide();
                }
            }else{
                if(data.KLineSeriesInfo && data.KLineSeriesInfo.length>0){
                    data = data.KLineSeriesInfo;
                    if(!yc){
                        yc =  parseFloat(data[data.length-1].Open);
                    }
                    var price = [];//价格
                    var volume = [];//成交量
                    var zdfData = [];//涨跌幅
                    var flagColor = [];//现价-开盘价 值为1和-1
                    var lastDate = dateToStamp(formatDate(data[data.length-1].Date) +" "+formatTime(data[data.length-1].Time));
                    var unit="";
                    for(var i=0;i<$this.c_data.length;i++){
                        if(lastDate < $this.c_data[i]){
                            break;
                        }
                        for(var j=0;j<data.length;j++){
                            var dateStamp = dateToStamp(formatDate(data[j].Date) +" "+formatTime(data[j].Time));
                            if($this.c_data[i] == dateStamp){
                                var fvalue = parseFloat(data[j].Price);//价格
                                if(fvalue >= limitUp){
                                    price[i] = limitUp;
                                    zdfData[i] = 0.10;
                                }else if(fvalue <= limitDown){
                                    price[i] = limitDown;
                                    zdfData[i] = 0.10;
                                }else{
                                    price[i] = data[j].Price;
                                    zdfData[i] = (((fvalue-yc)/yc)* 100).toFixed(2);
                                }
                                
                                volume[i] = data[j].Volume;
                                
                                flagColor[i] = (parseFloat(data[j].Price)-parseFloat(data[j].Open)) >= 0 ? 1 : -1;
                                
                                if(fvalue > 0){
                                    r1 = Math.abs(fvalue - yc);
                                    if (r1 > $this.interval) {
                                        $this.interval = r1;
                                    }
                                }
                                break;
                            }else{
                                price[i] = null;
                                volume[i] = null;
                                zdfData[i] = null;
                                flagColor[i] = null;
                            }
                        }
                    }
                        
                    $this.history_data = price;//价格历史数据
                    $this.z_history_data = zdfData;//涨跌幅历史数据
                    $this.a_history_data = volume;//成交量历史数据
                    $this.flag_data = flagColor;//成交量颜色标识
                    //取绝对值  差值 
                    $this.interval = $this.interval + $this.interval*0.1;
                    middleY = yc.toFixed($this.decimal);
                    // 左1轴
                    var minY = Number((yc - $this.interval).toFixed($this.decimal));//(minPrice - r1).toFixed($this.decimal);//(yc - $this.interval).toFixed($this.decimal);
                    var maxY = Number((yc + $this.interval).toFixed($this.decimal));//(maxPrice + r1).toFixed($this.decimal);//(yc + $this.interval).toFixed($this.decimal);
                    if(minY < limitDown){
                        minY = limitDown;
                    }
                    if(maxY > limitUp){
                        maxY = limitUp;
                    }
                    // 右边y1轴
                    var dd = ((parseFloat(minY) - (yc)) / (yc) );
                    if(Math.abs(dd) > 1){
                        minY1 = ((parseFloat(minY) - (yc)) / (yc)).toFixed(2);
                        maxY1 = ((parseFloat(maxY) - (yc)) / (yc)).toFixed(2);
                    }else{
                        minY1 = ((parseFloat(minY) - (yc)) / (yc) * 100).toFixed(2);
                        maxY1 = ((parseFloat(maxY) - (yc)) / (yc) * 100).toFixed(2);
                    }
                    var split = parseFloat(((maxY - minY) / 6).toFixed($this.decimal));
                    var split1= parseFloat((split / yc))*100;
                    // var split1 = parseFloat(((maxY1 - minY1) / 6).toFixed($this.decimal));
                    var option = {
                        animation: false,
                        axisPointer: {
                            link: {xAxisIndex: 'all'},
                            label: {
                                backgroundColor: colorList[2]
                            },
                            lineStyle:{
                                color:colorList[2],
                                type:"dotted",
                                width:1
                            },
                            type:'line',
                            show:true,
                            triggerTooltip:false
                        },
                        tooltip: {
                            trigger: 'axis',
                            showContent:false
                        },
                        // dataZoom: [
                        //     // {
                        //     //     type: 'inside',
                        //     //     xAxisIndex: [0, 1],
                        //     //     start: 0,
                        //     //     end: 100
                        //     // },
                        //     // {
                        //     //     show: true,
                        //     //     xAxisIndex: [0, 1],
                        //     //     type: 'slider',
                        //     //     bottom:'0',
                        //     //     height:"40px",
                        //     //     start: 0,
                        //     //     end: 100,
                        //     //     backgroundColor:"#fff",
                        //     //     fillerColor:"rgba(0,0,0,0.2)",
                        //     //     borderColor:"transparent",
                        //     //     handleIcon:'path://M 100 100 L 300 100 L 300 700 L 100 700 z',
                        //     //     handleStyle:{
                        //     //         color:"#f2f2f2",
                        //     //         borderColor:"#b4b4b4",
                        //     //         borderWidth:1
                        //     //     },
                        //     //     textStyle:{
                        //     //         color:colorList[3],
                        //     //         fontSize:14
                        //     //     },
                        //     //     labelFormatter: function (value) {
                        //     //         if(!value) return;
                        //     //         return $this.v_data[value].split(" ")[3];
                        //     //     }
                        //     // }
                        // ],
                        xAxis: [
                            {
                                type:"category",
                                // axisTick: {
                                //     show:false
                                // },
                                // axisLabel: {
                                //     interval: function (number, string) {
                                //         if(number == 0 || number == $this.v_data.length-1){
                                //             return true;
                                //         }
                                //         if(stopTime){
                                //             if(string.indexOf(stopTime[0].split(" ")[1])>-1){
                                //                 return true
                                //             }
                                //         }
                                //         if(string.indexOf("00")>-1){
                                //             return true
                                //         }

                                //     },
                                //     formatter: function (value, number) {
                                //         var tVal = value.split(" ")[2];
                                //         return tVal;
                                //     },
                                //     textStyle: {
                                //         color: colorList[3]
                                //     }
                                // },
                                // axisLine: {
                                //     lineStyle:{
                                //         color:colorList[4]
                                //     }
                                // },
                                data: $this.v_data,
                                // splitLine: {
                                //     show: true
                                // },
                                // axisPointer: {
                                //     show:true,
                                //     label: {
                                //         formatter: function (params, value, s) {
                                //             return (params.value);
                                //             // return moment(parseFloat(params.value)).format("YYYY-MM-DD HH:mm");
                                //         },
                                //         padding:[3,5,5,5],
                                //         show:true
                                //     }
                                // },
                                // boundaryGap:false
                            },
                            {
                                type:"category",
                                name:unit,
                                nameLocation:'start',
                                nameTextStyle:{
                                    color:colorList[2]
                                },
                                axisTick: {
                                    interval: function (number, string) {
                                        if($this.typeIndex == "128" || $this.typeIndex == "224"){
                                            if (number % 180 == 0) {
                                                return true;
                                            } else {
                                                return false;
                                            }
                                        }else{
                                            if (number % 30 == 0) {
                                                return true;
                                            } else {
                                                return false;
                                            }
                                        }
                                    },
                                    show:false
                                },
                                axisLabel: {
                                    show:false,
                                    interval: function (number, string) {
                                        if($this.typeIndex == "128" || $this.typeIndex == "224"){
                                            if (number % 180 == 0) {
                                                return true;
                                            } else {
                                                return false;
                                            }
                                        }else{
                                            if (number % 30 == 0) {
                                                return true;
                                            } else {
                                                return false;
                                            }
                                        }
                                    },
                                    formatter: function (value, number) {
                                        return value.split(" ")[3];
                                    },
                                    textStyle: {
                                        color: colorList[3]
                                    }
                                },
                                axisLine: {
                                    lineStyle:{
                                        color:colorList[4]
                                    }
                                },
                                data: $this.v_data,
                                splitLine: {
                                    show: false
                                },
                                gridIndex: 1,
                                boundaryGap:false
                            },
                            // {
                            //     type:"category",
                            //     data: v_data,
                            //     name:'万',
                            //     nameLocation:'start',
                            //     nameTextStyle:{
                            //         color:colorList[2]
                            //     },
                            //     splitLine: {
                            //         show: false
                            //     },
                            //     gridIndex: 2,
                            //     axisLine:{
                            //         show:false
                            //     },
                            //     axisTick:{
                            //         show:false
                            //     },
                            //     axisLabel:{
                            //         show:false
                            //     },
                            //     splitLine:{
                            //         show:false
                            //     }
                            // }
                        ],
                        yAxis: [
                            {
                                min: minY,
                                max: maxY,
                                interval: split,
                                // name:"价格",
                                boundaryGap: [0, '100%'],
                                axisTick: {
                                    show: false
                                },
                                type: "value",
                                splitLine:{
                                    lineStyle:{
                                        color:"transparent"
                                    }
                                },
                                axisLine:{
                                    lineStyle:{
                                        color:colorList[4]
                                    }
                                },
                                axisLabel: {
                                    formatter: function (value, index) {
                                        if (index == 3) {
                                            return "";
                                        } else {
                                            return parseFloat(value).toFixed($this.decimal);
                                        }
                                    },
                                    textStyle: {
                                        color: function (value, index) {
                                            if (parseFloat(value) > parseFloat(yc)) {
                                                return colorList[0];
                                            } else {
                                                return colorList[1];
                                            }
                                        }
                                    }
                                },
                                axisPointer: {
                                    label: {
                                        formatter: function (params, value, s) {
                                            return parseFloat(params.value).toFixed($this.decimal);
                                        }
                                    }
                                }
                            },
                            {
                                min: minY1,
                                max: maxY1,
                                interval: split1,
                                // name:"涨跌幅",
                                boundaryGap: [0, '100%'],
                                axisTick: {
                                    show: false
                                },
                                type: "value",
                                splitLine:{
                                    lineStyle:{
                                        color:"transparent"
                                    }
                                },
                                axisLine:{
                                    lineStyle:{
                                        color:colorList[4]
                                    }
                                },
                                axisLabel: {
                                    formatter: function (value, index) {
                                        if (index == 3) {
                                            return "";
                                        } else {
                                            return parseFloat(value).toFixed(2) + "%";
                                        }
                                    },
                                    textStyle: {
                                        color: function (value, index) {
                                            if (parseFloat(value) > 0) {
                                                return colorList[0];
                                            } else {
                                                return colorList[1];
                                            }
                                        }
                                    }
                                },
                                axisPointer: {
                                    label: {
                                        formatter: function (params, value, s) {
                                            return parseFloat(params.value).toFixed(2) + "%";
                                        }
                                    }
                                }
                            },
                            {
                                type:'value',
                                name:'成交',
                                nameLocation:'end',
                                nameTextStyle:{
                                    color:colorList[2],
                                    fontSize:14
                                },
                                nameGap:10,
                                scale: true,
                                splitLine:{
                                    lineStyle:{
                                        color:colorList[4]
                                    }
                                },
                                axisLine:{
                                    lineStyle:{
                                        color:colorList[4]
                                    }
                                },
                                axisLabel:{
                                    formatter:function(value,index){
                                        setyAsixName(value/100);
                                        return;
                                    },
                                    textStyle:{
                                        color:colorList[3],
                                        fontSize:14,
                                    },
                                    showMinLabel:true,
                                    showMaxLabel:true,
                                },
                                gridIndex: 1,
                                splitNumber: 2
                            }
                        ],
                        series: [
                            {
                                name: 'Mline',
                                type: 'line',
                                showSymbol: false,
                                hoverAnimation: false,
                                data: price,
                                connectNulls:true,
                                symbolSize:0,
                                markLine: {
                                    animation:false,
                                    silent:true,
                                    lineStyle: {
                                        normal: {
                                            type: 'dashed',
                                            color: colorList[2],
                                            width:1
                                        }
                                    },
                                    label: {
                                        normal: {
                                            position: "start",
                                            formatter: function (params) {
                                                return params.value + " ";
                                            }
                                        }
                                    },
                                    data: [
                                        {
                                            name: 'Y 轴值为 100 的水平线',
                                            yAxis: middleY
                                        }
                                    ],
                                    symbol: ['none', 'none']
                                },
                                lineStyle:{
                                    normal:{
                                        color:"#2b99ff",
                                        width:1
                                    }
                                },
                                areaStyle:{
                                    normal:{
                                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                            offset: 0,
                                            color: 'rgba(43, 153, 255,0.3)'
                                        }, {
                                            offset: 1,
                                            color: 'rgba(43, 153, 255,0.1)'
                                        }])
                                    }
                                }
                            },
                            {
                                name:'limit',
                                type: 'line',
                                showSymbol: false,
                                hoverAnimation: false,
                                connectNulls:true,
                                symbolSize:0,
                                markLine: {
                                    animation:false,
                                    silent:true,
                                    lineStyle: {
                                        normal: {
                                            type: 'dashed',
                                            color: colorList[2],
                                            width:0
                                        }
                                    },
                                    label: {
                                        normal: {
                                            position: "end",
                                            formatter: function (params) {
                                                return " " + params.value + ".00%";

                                            }
                                        }
                                    },
                                    data: [
                                        {
                                            name: 'Y 轴值为 100 的水平线',
                                            yAxis: 0.00
                                        }
                                    ],
                                    symbol: ['none', 'none']
                                },
                                lineStyle: {
                                    normal: {
                                        color: "#2b99ff",
                                        opacity:0
                                    }
                                },
                                data: zdfData,
                                yAxisIndex: 1
                            },
                            {
                                name: 'Vol',
                                type: 'bar',
                                xAxisIndex: 1,
                                yAxisIndex: 2,
                                data: volume,
                                itemStyle:{
                                    normal:{
                                        color:function(params){
                                            if(flagColor[params.dataIndex] > 0){
                                                return colorList[0];
                                            }else{
                                                return colorList[1];
                                            }
                                        }
                                    }
                                }
                            },
                            // {
                            //     name:'量比',
                            //     type:'line',
                            //     smooth:true,
                            //     symbol: 'none',
                            //     showSymbol: false,
                            //     hoverAnimation: false,
                            //     connectNulls:true,
                            //     symbol:'circle',
                            //     symbolSize:0,
                            //     itemStyle: {
                            //         normal: {
                            //             color: colorList[0]
                            //         }
                            //     },
                            //     data: a_history_data,
                            //     xAxisIndex: 2,
                            //     yAxisIndex: 3
                            // }
                        ]
                    };
                    // myChart = echarts.init(document.getElementById('main1'));
                    myChart.setOption(option);
                    count = myChart.getOption().series[0].data.length;
                    
                    var marktToolData = [
                        $this.history_data[count - 1], 
                        $this.z_history_data[count - 1], 
                        $this.a_history_data[count - 1], 
                        formatDate(parseFloat($this.c_data[count - 1]),"0")//moment(parseFloat($this.c_data[count - 1])).format("YYYY-MM-DD HH:mm")
                    ];
                    set_marketTool(marktToolData,$this); //设置动态行情条

                    myChart.on('showTip', function (params) {
                        mouseHoverPoint = params.dataIndex;
                        setMlineToolInfo($this,true,mouseHoverPoint);
                    });
                    // 设置成交量的单位变化状况
                    function setyAsixName(value) {
                        var data = setUnit(value,null,true);
                        var maximun = (data=="0"?"0":floatFixedZero(data.value))
                        var yAxisName = (data=="0"?"量":data.unit);
                        $(".volumn .volumeMax").text(maximun);
                        $(".volumn .vol-unit").text(yAxisName);
                    };

                    $("#main1").on("mouseenter", function (event) {
                        toolContentPosition(event);
                        $("#toolContent").show();

                         _this = $("#MLine");
                    });

                    $("#main1").on("mousemove", function (event) {
                        isHoverGraph = true;
                        toolContentPosition(event);
                        $("#toolContent").show();
                         _this = $("#MLine");
                    });

                    $("#main1").bind("mouseout", function (event) {
                        isHoverGraph = false;
                        $("#toolContent").hide();
                        mouseHoverPoint = 0;
                        setMlineToolInfo($this);
                        $(_this).children(".charts-focus").blur();
                        _this = window;
                    });
                    
                    // console.log($(document).scrollTop())
                    $(document).scrollTop($(document).scrollTop()+100)

                    function toolContentPosition(event) {
                        var offsetX = event.offsetX;
                        var continerWidth = $("#main1").width(), toolContent = $("#toolContent").width();
                        var centerX = continerWidth / 2;
                        if (offsetX > centerX) {
                            $("#toolContent").css("left", 85);
                        } else {
                            $("#toolContent").css("left", continerWidth - toolContent - 85);
                        }
                    }
                }else{
                    $(".vol").hide();
                    console.log("初始化图表失败");
                    $("#MLine").hide();    
                }
            }
        }else{
            // $("#noData").show();
            // $("#toolContent_M").hide();
            $(".vol").hide();
            // $(".chartsTab").hide();
            console.log("初始化图表失败");
            $("#MLine").hide();
        }

        function set_marketTool(data,$this) {
            if (!isHoverGraph || isHoverGraph && !$this.history_data[mouseHoverPoint] && data) {
                $(".vol i").text(parseFloat(data[2]).toFixed(2));
                $("#quantityRatio").text(data[2]);
                setMlineToolInfo($this);
            }
        }

    }
    function setMlineToolInfo($this,showTip,mouseHoverPoint){
        var point;
        $(".vol i").text("-");
        $("#quantityRatio").text("-");
        $(".dataPrice").text("-");
        $(".change").text("-");
        $(".volume").text("-");
        if($this.c_data.length>0){
            if(showTip){
                point = mouseHoverPoint;
            }else{
                point = $this.a_history_data.length-1;
            }
            $("#toolContent .dataTime").text(formatDate($this.c_data[point],"1"));
            if ($this.history_data[point]) {
                if($this.history_data[point] >= yc){
                    // 浮窗数据
                    $(".dataPrice").text($this.history_data[point]).css("color",colorList[0]);
                    $(".change").text($this.z_history_data[point]+"%").css("color",colorList[0]);
                }else{
                    // 浮窗数据
                    $(".dataPrice").text($this.history_data[point]).css("color",colorList[1]);
                    $(".change").text($this.z_history_data[point]+"%").css("color",colorList[1]);
                }
                $(".vol i").text($this.a_history_data[point]);
                $("#quantityRatio").text($this.a_history_data[point]);
                // 浮层中的销量
                var volFix = parseFloat($this.a_history_data[point])/100;
                $(".volume").text(setUnit(volFix,true) +"手"); 
                
            }
        }
        
        
    }
    //初始化图表-空图表
    function initYCCharts(yc,$this){
        var maxY = parseFloat((parseFloat(yc)*0.01+parseFloat(yc)).toFixed($this.options.decimal));
        var minY = parseFloat((parseFloat(yc)-parseFloat(yc)*0.01).toFixed($this.options.decimal));
        var maxY1 = parseFloat(((maxY-yc)/yc).toFixed(2));
        var minY1 = -parseFloat(((maxY-yc)/yc).toFixed(2));
        var split = parseFloat(((maxY - yc)/3).toFixed($this.options.decimal));
        var split1= parseFloat((split / yc))*100;
        var option = {
            backgroundColor: "#fff",
            animation: false,
            grid: [
                {
                    top: "5%",
                    height: '70%',
                    show:true
                },
                {
                    show:true,
                    top: '85%',
                    height: '13%',
                },
                // {
                //     bottom:'-100%',
                //     height:'10%',
                // }
            ],
            title: {
                show: false
            },
            axisPointer: {
                link: {xAxisIndex: 'all'},
                label: {
                    backgroundColor: colorList[2]
                },
                lineStyle:{
                    color:colorList[2],
                    type:"dotted",
                    width:1
                },
                type:'line',
                show:true,
                triggerTooltip:false
            },
            tooltip: {
                trigger: 'axis',
                showContent:false
            },
            xAxis: [
                {
                    type:"category",
                    axisTick: {
                        show:false
                    },
                    axisLabel: {
                        show:true,
                        interval: function (number, string) {
                            // if(number == 0 || number == $this.v_data.length-1){
                            //     return true;
                            // }
                            // if(stopTime){
                            //     if(string.indexOf(stopTime[0].split(" ")[1])>-1){
                            //         return true;
                            //     }
                            // }
                            // if(string.indexOf("00")>-1){
                            //     return true;
                            // }
                            if(number % 60 == 0){
                                return true;
                            }else{
                                return false;
                            }
                        },
                        formatter: function (value, number) {
                            var tVal = value.split(" ")[2];
                            return tVal;
                        },
                        textStyle: {
                            color: colorList[3]
                        }
                    },
                    axisLine: {
                        lineStyle:{
                            color:colorList[4]
                        }
                    },
                    data: $this.v_data,
                    splitLine: {
                        interval:function(index,value){
                            if(index % 60 == 0){
                                return true;
                            }else{
                                return false;
                            }
                        },
                        show: true
                    },
                    axisPointer: {
                        show:true,
                        label: {
                            formatter: function (params, value, s) {
                                return (params.value);
                                // return moment(parseFloat(params.value)).format("YYYY-MM-DD HH:mm");
                            },
                            padding:[3,5,5,5],
                            show:true
                        }
                    },
                    boundaryGap:false
                },
                {
                    type:"category",
                    name:"万",
                    nameLocation:'start',
                    nameTextStyle:{
                        color:colorList[2]
                    },
                    axisTick: {
                        interval: function (number, string) {
                            if($this.typeIndex == "128" || $this.typeIndex == "224"){
                                if (number % 180 == 0) {
                                    return true;
                                } else {
                                    return false;
                                }
                            }else{
                                if (number % 30 == 0) {
                                    return true;
                                } else {
                                    return false;
                                }
                            }
                        },
                        show:false
                    },
                    axisLabel: {
                        show:false,
                        interval: function (number, string) {
                            if($this.typeIndex == "128" || $this.typeIndex == "224"){
                                if (number % 180 == 0) {
                                    return true;
                                } else {
                                    return false;
                                }
                            }else{
                                if (number % 30 == 0) {
                                    return true;
                                } else {
                                    return false;
                                }
                            }
                        },
                        formatter: function (value, number) {
                            return value.split(" ")[3];
                        },
                        textStyle: {
                            color: colorList[3]
                        }
                    },
                    axisLine: {
                        lineStyle:{
                            color:colorList[4]
                        }
                    },
                    data: $this.v_data,
                    splitLine: {
                        show: false
                    },
                    gridIndex: 1,
                    boundaryGap:false
                },
            ],
            yAxis: [
                {
                    min: minY,
                    max: maxY,
                    interval: split,
                    boundaryGap: [0, '100%'],
                    axisTick: {
                        show: false
                    },
                    type: "value",
                    splitLine:{
                        lineStyle:{
                            color:"transparent"
                        }
                    },
                    axisLine:{
                        lineStyle:{
                            color:colorList[4]
                        }
                    },
                    axisLabel: {
                        formatter: function (value, index) {
                            if (index == 3) {
                                return "";
                            } else {
                                return parseFloat(value).toFixed($this.options.decimal);
                            }
                        },
                        textStyle: {
                            color: function (value, index) {
                                if (parseFloat(value) > parseFloat(yc)) {
                                    return colorList[0];
                                } else {
                                    return colorList[1];
                                }
                            }
                        }
                    },
                    axisPointer: {
                        label: {
                            formatter: function (params, value, s) {
                                return parseFloat(params.value).toFixed($this.options.decimal);
                            }
                        }
                    }
                },
                {
                    min: minY1,
                    max: maxY1,
                    interval: split1,
                    // name:"涨跌幅",
                    boundaryGap: [0, '100%'],
                    axisTick: {
                        show: false
                    },
                    type: "value",
                    splitLine:{
                        lineStyle:{
                            color:"transparent"
                        }
                    },
                    axisLine:{
                        lineStyle:{
                            color:colorList[4]
                        }
                    },
                    axisLabel: {
                        formatter: function (value, index) {
                            if (index == 3) {
                                return "";
                            } else {
                                return parseFloat(value).toFixed(2) + "%";
                            }
                        },
                        textStyle: {
                            color: function (value, index) {
                                if (parseFloat(value) > 0) {
                                    return colorList[0];
                                } else {
                                    return colorList[1];
                                }
                            }
                        }
                    },
                    axisPointer: {
                        label: {
                            formatter: function (params, value, s) {
                                return parseFloat(params.value).toFixed(2) + "%";
                            }
                        }
                    }
                },
                {
                    type:'value',
                    name:'成交',
                    nameLocation:'end',
                    nameTextStyle:{
                        color:colorList[2],
                        fontSize:14
                    },
                    nameGap:10,
                    scale: true,
                    splitLine:{
                        lineStyle:{
                            color:colorList[4]
                        }
                    },
                    axisLine:{
                        lineStyle:{
                            color:colorList[4]
                        }
                    },
                    axisLabel:{
                        formatter:function(value,index){
                            var data = setUnit(value,null,true,true);
                            $(".volumeMax").text(floatFixedZero(data.value/100));
                            $(".vol-unit").text(data.unit);
                            return;
                        },
                        textStyle:{
                            color:colorList[3],
                            fontSize:14,
                        },
                        showMinLabel:true,
                        showMaxLabel:true,
                    },
                    axisTick:{
                        show:false
                    },
                    gridIndex: 1,
                    splitNumber: 2
                }
            ],
            series: [
                {
                    name: 'Mline',
                    type: 'line',
                    showSymbol: false,
                    hoverAnimation: false,
                    data: "",
                    connectNulls:true,
                    symbolSize:0,
                    markLine: {
                        animation:false,
                        silent:true,
                        lineStyle: {
                            normal: {
                                type: 'dashed',
                                color: colorList[2],
                                width:1
                            }
                        },
                        label: {
                            normal: {
                                position: "start",
                                formatter: function (params) {
                                    return params.value + " ";
                                }
                            }
                        },
                        data: [
                            {
                                name: 'Y 轴值为 100 的水平线',
                                yAxis: yc
                            }
                        ],
                        symbol: ['none', 'none']
                    },
                    lineStyle:{
                        normal:{
                            color:"#2b99ff",
                            width:1
                        }
                    },
                    areaStyle:{
                        normal:{
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                                offset: 0,
                                color: 'rgba(43, 153, 255,0.3)'
                            }, {
                                offset: 1,
                                color: 'rgba(43, 153, 255,0.1)'
                            }])
                        }
                    }
                },
                {
                    name:'limit',
                    type: 'line',
                    showSymbol: false,
                    hoverAnimation: false,
                    connectNulls:true,
                    symbolSize:0,
                    markLine: {
                        animation:false,
                        silent:true,
                        lineStyle: {
                            normal: {
                                type: 'dashed',
                                color: colorList[2],
                                width:0
                            }
                        },
                        label: {
                            normal: {
                                position: "end",
                                formatter: function (params) {
                                    return " " + params.value + ".00%";

                                }
                            }
                        },
                        data: [
                            {
                                name: 'Y 轴值为 100 的水平线',
                                yAxis: 0.00
                            }
                        ],
                        symbol: ['none', 'none']
                    },
                    lineStyle: {
                        normal: {
                            color: "#2b99ff",
                            opacity:0
                        }
                    },
                    data: "",
                    yAxisIndex: 1
                },
                {
                    name: 'Vol',
                    type: 'bar',
                    xAxisIndex: 1,
                    yAxisIndex: 2,
                    data: "",
                    itemStyle:{
                        normal:{
                            color:function(params){
                                if(flag[params.dataIndex] > 0){
                                    return colorList[0];
                                }else{
                                    return colorList[1];
                                }
                            }
                        }
                    }
                },
                // {
                //     name:'量比',
                //     type:'line',
                //     smooth:true,
                //     symbol: 'none',
                //     showSymbol: false,
                //     hoverAnimation: false,
                //     connectNulls:true,
                //     symbol:'circle',
                //     symbolSize:0,
                //     itemStyle: {
                //         normal: {
                //             color: colorList[0]
                //         }
                //     },
                //     data: a_history_data,
                //     xAxisIndex: 2,
                //     yAxisIndex: 3
                // }
            ]
        };
        myChart = echarts.init(document.getElementById('main1'));
        myChart.setOption(option);
    }
    $("#MLine,#kline").keyup(function (e) {
        var keyCode = e.keyCode;
        switch (keyCode) {
            case 37:
                move(-1, true);
                break; //左
            case 38:
                move(1);
                break;  //上
            case 39:
                move(1, true);
                break; //右
            case 40:
                move(-1);
                break; //下
            default:
                break;
        }
    });
    // 按键对应的move函数
    function move(index, type) {
        if(KLineSocket.option.lineType!="mline") {
            // 获取dataZoom起始位置和结束位置，比较他的信息，设置他的位置
            var KStart = KLineSocket.KChart.getOption().dataZoom[0].start,
                KEnd = KLineSocket.KChart.getOption().dataZoom[0].end,
                KCenter = (KEnd-KStart)/2+KStart,
                KLength = KLineSocket.HistoryData.hCategoryList.length,
                KContinerWidth = $("#kline_charts").width();

            var count = KLineSocket.KChart?KLineSocket.KChart.getOption().series[0].data.length:0;
            if (type) {
                // if (KLineSocket.KLineSet.mouseHoverPoint == 0 && index == -1) {
                //     KLineSocket.KLineSet.mouseHoverPoint = KLineSocket.KChart.getOption().series[0].data.length;
                // }
                // if (KLineSocket.KLineSet.mouseHoverPoint + index > KLineSocket.KChart.getOption().series[0].data.length - 1 && index == 1) {
                //     KLineSocket.KLineSet.mouseHoverPoint = 0;
                //     index = 0;
                // }
                var max = KLineSocket.KLineSet.mouseHoverPoint>=Math.round(KEnd*KLength/100)-1;
                var min = KLineSocket.KLineSet.mouseHoverPoint<Math.round(KStart*KLength/100); 
                if((index==-1&&min)||(index==1&&max)){
                    return;
                }
                // 信息框位置
                if ((KLineSocket.KLineSet.mouseHoverPoint+1)/KLength > KCenter/100) {
                    $("#kline_tooltip").css("left", 83/830*KContinerWidth);
                } else {
                    $("#kline_tooltip").css({"left":"auto","right":83/830*KContinerWidth});
                }
                $("#kline_tooltip").show();
                var name = KLineSocket.KChart.getOption().series[0].name;
                KLineSocket.KChart.dispatchAction({
                    type: 'showTip',
                    seriesIndex: 0,
                    dataIndex: KLineSocket.KLineSet.mouseHoverPoint + index,
                    name: name,
                    position: ['50%', '50%']
                });

            } else {
                if (index == 1) {
                    KLineSocket.KLineSet.start += 10;
                    if (KLineSocket.KLineSet.start > 90) {
                        KLineSocket.KLineSet.start = 90;
                        return;
                    } else {
                        KLineSocket.KLineSet.mouseHoverPoint = KLineSocket.KLineSet.mouseHoverPoint + (count * KLineSocket.KLineSet.zoom / 100);
                    }
                } else {
                    KLineSocket.KLineSet.start -= 10;
                    if (KLineSocket.KLineSet.start < 0) {
                        KLineSocket.KLineSet.start = 0;
                        return;
                    } else {
                        KLineSocket.KLineSet.mouseHoverPoint = KLineSocket.KLineSet.mouseHoverPoint - (count * KLineSocket.KLineSet.zoom / 100);
                    }
                }
                KLineSocket.KChart.dispatchAction({
                    type: 'dataZoom',
                    // 可选，dataZoom 组件的 index，多个 dataZoom 组件时有用，默认为 0
                    dataZoomIndex: 0,
                    // 开始位置的百分比，0 - 100
                    start: KLineSocket.KLineSet.start,
                    // 结束位置的百分比，0 - 100
                    end: 100
                });
                
            }
        }else {
            var chart = myChart;
            if (type) {
                if (mouseHoverPoint == 0 && index == -1) {
                    mouseHoverPoint = chart.getOption().series[0].data.length;
                }
                if (mouseHoverPoint == 0 && index == 1) {
                    // index = 0;
                }
                if (mouseHoverPoint + index > chart.getOption().series[0].data.length - 1 && index == 1) {
                    mouseHoverPoint = 0;
                    index = 0;
                }
                var name = chart.getOption().series[0].name;
                chart.dispatchAction({
                    type: 'showTip',
                    seriesIndex: 0,
                    dataIndex: mouseHoverPoint + index,
                    name: name,
                    position: ['50%', '50%']
                });
            } else {
                if (index == 1) {
                    start += 10;
                    if (start > 100) {
                        start = 100;
                        return;
                    } else {
                        mouseHoverPoint = mouseHoverPoint + (count * zoom / 100);
                    }
                } else {
                    start -= 10;
                    if (start < 0) {
                        start = 0;
                        return;
                    } else {
                        mouseHoverPoint = mouseHoverPoint - (count * zoom / 100);
                    }
        
                }
                chart.dispatchAction({
                    type: 'dataZoom',
                    // 可选，dataZoom 组件的 index，多个 dataZoom 组件时有用，默认为 0
                    dataZoomIndex: 0,
                    // 开始位置的百分比，0 - 100
                    start: start,
                    // // 结束位置的百分比，0 - 100
                    end: 100
                });    
            }


        }
    };

    // 接收到清盘指令重绘图表
    function redrawChart(data,$this){
        $this = $this.options;
        $this.history_data = []; //价格历史记录
        $this.z_history_data = []; //涨跌幅历史记录
        $this.a_history_data = []; //成交量记录
        $this.flag_data = []; //成交量颜色记录 1为绿 -1为红
        var decimal = $this.decimal;
        if(data){
            if(myChart == undefined || !myChart) return;
            yc = parseFloat(yc);
            if (yc) {
                var minY = (yc - yc*0.1).toFixed(decimal);
                var middleY = yc.toFixed(decimal);
                var maxY = (yc + yc*0.1).toFixed(decimal);
                var dd = ((parseFloat(minY) - parseFloat(yc)) / parseFloat(yc));

                if(Math.abs(dd) > 1){
                    var minY1 = ((parseFloat(minY) - (yc)) / (yc)).toFixed(2);
                    var maxY1 = ((parseFloat(maxY) - (yc)) / (yc)).toFixed(2);
                }else{
                    var minY1 = ((parseFloat(minY) - parseFloat(yc)) / parseFloat(yc) * 100).toFixed(2);
                    var maxY1 = ((parseFloat(maxY) - parseFloat(yc)) / parseFloat(yc) * 100).toFixed(2);
                }
            } else {
                var minY = 0;
                var middleY = 1;
                var maxY = 2;
            }
            var split = parseFloat(((maxY - minY) / 6).toFixed(decimal));
            var split1 = parseFloat(((maxY1 - minY1) / 6).toFixed(decimal));

            v_data =  getxAxis((data.Date?data.Date:data[0].Date),$this);
            var option ={
                yAxis: [
                    {
                        min: minY,
                        max: maxY,
                        interval: split
                    },{
                        min: minY1,
                        max: maxY1,
                        interval: split1,
                        axisLabel: {
                            formatter: function (value, index) {
                                if (index == 3) {
                                    return "";
                                } else {
                                    return parseFloat(value).toFixed(2) + "%";
                                }
                            },
                            textStyle: {
                                color: function (value, index) {
                                    var status = 0;
                                    // if(MarketStatus == 1){
                                    //     status = 1;
                                    // }
                                    if (parseFloat(value) > status) {
                                        return colorList[0];
                                    } else {
                                        return colorList[1];
                                    }
                                }
                            }
                        },
                        axisPointer: {
                            label: {
                                formatter: function (params, value, s) {
                                    return parseFloat(params.value).toFixed(2) + "%";
                                }
                            }
                        }
                    }
                ],
                // xAxis:[{
                //     data:v_data
                // },{
                //     data:v_data
                // }],
                series: [
                    {
                        data: [],
                        markLine: {
                            data: [
                                {
                                    name: 'Y 轴值为 100 的水平线',
                                    yAxis: middleY
                                }
                            ],
                            symbol: ['none', 'none']
                        }
                    },
                    {
                        data: []
                    },
                    {
                        data: []
                    }
                ]
            };
            myChart.setOption(option);
            $('.tb-fn-num').html('<span class="">-</span><span class="">0.00</span><span class="">0.00%</span>');
            var strHtml = '';
            if(stockType == "Field"){
                strHtml +='<ul class=\"cb-zs-pk\">\
                <li><span>上涨数</span><span class=\"cb-zspk-szs\">--</span></li>\
                <li><span>平盘数</span><span class=\"cb-zspk-pps\">--</span></li>\
                <li><span>下跌数</span><span class=\"cb-zspk-xds\">--</span></li>\
                </ul>';
            }else{
                strHtml = '<div class="cb-pk"><h2>五档盘口</h2><div class="cb-title">'+
                '<p>委比：<span class="cbt-wb">-</span></p>'+
                '<p>委差：<span class="cbt-wc">-</span></p></div>'+
                '<ul class="cb-txtOffer"><li><span>卖五</span><span>-</span>'+
                '<span>-</span></li><li><span>卖四</span><span>-</span>'+
                '<span>-</span></li><li><span>卖三</span><span>-</span>'+
                '<span>-</span></li><li><span>卖二</span><span>-</span>'+
                '<span>-</span></li><li><span>卖一</span><span>-</span>'+
                '<span>-</span></li></ul><ul class="cb-txtBids"><li><span>买一</span>'+
                '<span>-</span><span>-</span></li><li><span>买二</span>'+
                '<span>-</span><span>-</span></li><li><span>买三</span>'+
                '<span>-</span><span>-</span></li><li><span>买四</span>'+
                '<span>-</span><span>-</span></li><li><span>买五</span>'+
                '<span>-</span><span>-</span></li></ul>'+
                '<div class="cb-title cb-title-sub"><p>外盘：<span class="red cbt-wp">-</span></p>'+
                '<p>内盘：<span class="cbt-np">-</span></p></div></div>';
            }
            $(".cb-pk").html(strHtml);
            $(".cb-cj>ul").html('<li><span>-</span><span>-</span><span>-</span><span>-</span></li>');
        }else{
            console.log("清盘有误");
        }
    }

    // 获取X轴的数值
    function getxAxis(todayDateStr,$this){
        var beginTime,finishTime,beginTime1,finishTime1;
        //2、判断是开始时间是否大于结束时间，大于的话就要取前一天，小于的话按照正常的来 
        var b_time1,b_time2;  // 停盘时间
        var todayDate = formatDate(todayDateStr);
        var dateArr = new Array();
        var dateArrStamp = new Array();
        if(sub > -1){ //未跨天的时间计算  1-中间有断开  2-中间未断开
            if($this.nowDateTime.length > 1){
                beginTime = todayDate + " " + $this.nowDateTime[0].startTime;
                finishTime = todayDate + " " + $this.nowDateTime[0].endTime;
                beginTime1 = todayDate + " " + $this.nowDateTime[1].startTime1;
                finishTime1 = todayDate + " " + $this.nowDateTime[1].endTime1;
                
                b_time1 = moment(finishTime).utc().valueOf();
                b_time2 = moment(beginTime1).utc().valueOf();
                stopTime = [finishTime,beginTime1];
            }else{
                beginTime = todayDate + " " + $this.nowDateTime[0].startTime;
                finishTime = todayDate + " " + $this.nowDateTime[0].endTime;
            }
        }else{  //跨天的时间计算  1-中间有断开
            if($this.nowDateTime.length > 1){
                beginTime = todayDate + " " + $this.nowDateTime[0].startTime;
                finishTime = todayDate + " " + $this.nowDateTime[0].endTime;
                beginTime1 = todayDate + " " + $this.nowDateTime[1].startTime1;
                finishTime1 = todayDate + " " + $this.nowDateTime[1].endTime1;
                
                stopTime = [finishTime,beginTime1];
                
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
                dateArrStamp.push(beginTime);
            } else {
                timeAdd = moment(timeAdd).add(1, 'm').utc().valueOf();
                if(b_time1 && b_time2){
                    if (moment(timeAdd).isAfter(moment(b_time1)) && moment(timeAdd).isBefore(moment(b_time2))) {
                        continue;
                    } else {
                        dateArrStamp.push(timeAdd);
                    }
                }else{
                    dateArrStamp.push(timeAdd);
                }
            }
            i++;
        }
        for(var k = 0;k < dateArrStamp.length;k++){
            dateArr.push(formatDate(dateArrStamp[k],"1"));
        }
        $this.c_data = dateArrStamp;
        return dateArr;
    }

    $.fn.initMline = function(options,params){
        options = $.extend({},$.fn.initMline.defaults,options || {});
        var $this = $(this);
        // 初始化代码表
        xml = new InitXMLIChart(options);
        return xml.initXML();
    };
})(jQuery);
/*
* 详情页面 指数/个股 信息相关函数
*/
// 查询十大流通股和公司信息
function requireCom(reqComOpt,code){
    var date = new Date();
    // var reqUrl = DKServiceUrl + "DKService/GetService?time="+date.getMinutes()+date.getSeconds()+"&Service=DataSourceService.Gets&ReturnType=JSON&OBJID=";
    var reqUrl = DKServiceUrl + "DKService/GetService?time="+date.getMinutes()+date.getSeconds()+"&Service=DataSourceService.Gets&ReturnType=JSON&OBJID=";
    
    // 1=》000001
    if(code.length<6){
        code = new Array(6-code.length+1).join("0") + code;
    }
    $.each(reqComOpt, function(i,reqComObj){
        $.ajax({
            url:  reqUrl+reqComObj+"&P_NODE_CODE="+code,
            type: 'GET',
            dataType: 'json',
            async:true,
            cache:false,
            error: function(data){
                console.log("请求公司信息出错");
            },
            // complete:function(xhr){
            //     console.log(xhr)
            // },
            success: function(data){
                if(data.response.data){
                    var responseInfo = data.response.data;
                    switch(reqComObj){
                        case "23000188":
                            getSDLTG(responseInfo);
                            break;
                        case "23000171":
                        case "23000138":
                        case "23000164":
                            getCompanyInfo(responseInfo[0]);
                            break;
                        default:;
                    }
                } 
            }
        });
    }); 
};
// 获取公司信息数据
function getCompanyInfo(responseInfo){
    if(responseInfo.TEL){
        // 主营产品 23000138
        $("#com_main_pro").text(responseInfo.MAIN_PROD);
        // 董秘电话 
        $("#com_tel").text(responseInfo.TEL);
    }else{
        if(responseInfo.TTL_SHR_LF){

            responseInfo.TTL_SHR = responseInfo.TTL_SHR.replace(/,/g,"");
            responseInfo.TTL_SHR_LF = responseInfo.TTL_SHR_LF.replace(/,/g,"");

            var com_Ltg = setUnit(responseInfo.TTL_SHR);
            var com_Fltg = setUnit(responseInfo.TTL_SHR_LF);
            // 流通股（非限售） 23000164
            $("#com_ttl_shrl").text(com_Ltg+"股");
            // 总股本 
            $("#com_ttl_shr").text(com_Fltg+"股");

        }else{
            // 注册资本 23000171
            responseInfo.REG_CPTL = responseInfo.REG_CPTL.replace(/,/g,"");
            var com_Zczb = setUnit(responseInfo.REG_CPTL);
            
            // 公司名称
            $("#com_name").text(responseInfo.COM_NAME);
            // 董事长
            $("#com_psn").text(responseInfo.PSN_NAME);
            // 总经理
            $("#com_gm").text(responseInfo.GM);
            // 办公地址
            $("#com_addr").text(responseInfo.OFS_ADDR);
            // 办公网址
            $("#com_website").text(responseInfo.WEB_SITE);
            // 注册资本
            $("#com_zc").text(com_Zczb);
            // 上市日期
            $("#com_ss").text((responseInfo.LST_DT).split(" ")[0]);

            $("#withoutComData").hide().siblings().show();
        }

    }
};
// 获取十大流通股数据
function getSDLTG(responseInfo){
    $("#withoutStcData").hide().siblings().show();
    // 获取最新的报告期
    var endDate = getEndDate(responseInfo);
    // 找到最新报告期的十大流通股东
    var comList = getComList(responseInfo,endDate);
    comList.sort(compareTop("SH_SN"));
    // 取前十
    var comList = comList.slice(0,10);
    // 拼接字符串
    setSDLTGInfo(comList);
};
// 对象组成的数组，按照 prop 从小到大排序
function compareTop(prop){
    return function(obj1, obj2){
        var val1 = obj1[prop];
        var val2 = obj2[prop];

        if (!isNaN(Number(val1)) && !isNaN(Number(val2))) {
            val1 = Number(val1);
            val2 = Number(val2);
        }
    
        if(val1 < val2){
            return -1;
        }else if(val1 > val2){
            return 1;
        }else{
            return 0;
        }

    }
};
// 获取最新报告期
function getEndDate(data){
    var g_endDate = "0000-00-00";
    $.each(data,function(i,obj){
        if(obj.END_DT.split(" ")[0]>g_endDate.split(" ")[0]){
            g_endDate = obj.END_DT;
        }
    });
    return g_endDate;
};
// 获取最新报告期的流通股
function getComList(data,endDate){
    var comList = [];
    $.each(data,function(i,obj){
        if(obj.END_DT==endDate){
            comList.push(obj);
        }
    });
    return comList;
};
// 十大流通拼接整个模块
function setSDLTGInfo(list){
    var txt =  $(".bb-info ul").html();
    $.each(list,function(i,obj){
        var s_hld_shr = setUnit(obj.HLD_SHR.replace(/,/g,"").trim());
        if(obj.DIRECT==0){
            obj.DIRECT = "不变";
        }
        var className = obj.DIRECT=="减持"?"green":(obj.DIRECT=="增持"?"red":null);
        var s_hld_shr_chg = parseInt(obj.HLD_SHR_CHG_LST)!=0?setUnit(obj.HLD_SHR_CHG_LST.replace(/,/g,"").trim()):"";
        txt += "<li>\
                    <span title="+obj.SH_NAME+">"+obj.SH_NAME+"</span>\
                    <span>"+floatFixedTwo(obj.TTL_CPTL_RAT)+"%</span>\
                    <span>"+s_hld_shr+"</span>\
                    <span class="+className+">"+obj.DIRECT+s_hld_shr_chg+"</span>\
                </li>";
        
    })
    $(".bb-info ul").html(txt)
}
