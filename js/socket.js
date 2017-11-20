var stockXMlUrl = "http://172.17.20.203:6789/101";//"../xml/ths.xml";//"http://172.17.20.203:6789/101";
var wsUrlDevelop = 'ws://172.17.20.203:7681';//'ws://103.66.33.31:443';//开发
var socket; 
var myChart;
var mouseHoverPoint = 0;
var isHoverGraph = false;
var todayDate,todayTime;
var id,typeIndex;
var decimal = 2;
var nowDateTime = [];
var colorList = ['#e22f2a','#3bc25b','#555','#999','#e5e5e5'];//红色,绿色,555,999
var yc;
$(function(){
        var history_data = []; //价格历史记录
        var z_history_data = []; //涨跌幅历史记录
        var a_history_data = []; //成交量历史记录
        var sub = 0; //开始时间大于结束时间更为-1
        // var startDateTime,endDateTime;//用于缩放组件数据展示
        id = "1";
        var xmlCode, _codeList;
        // 获取历史数据
        var historyData = {
            "MsgType": "C213",
            "ExchangeID": "101",
            "InstrumentID": id,
            "StartIndex": "0",
            "StartDate": "-1",
            "StartTime": "0", 
            "Count": "0"
        };
        //获取心跳包 
        var XTB = {
            "MsgType":"C646",
            "ExchangeID":"101",
            "InstrumentID":id
        };
        //订阅快照请求
        var HQAll = {
            "MsgType":"S101",
            "DesscriptionType":"3",
            "ExchangeID":"101",
            "InstrumentID":id,
            "Instrumenttype":"2"
        };
        // 实时推送数据
        var RTDATA = {
            "MsgType":"S101",
            "DesscriptionType":"3",
            "ExchangeID":"101",
            "InstrumentID":id,
            "Instrumenttype":"5"
        };
        // 清盘
        var QPDATA = {
            "MsgType":"S101",
            "DesscriptionType":"3",
            "ExchangeID":"101",
            "InstrumentID":id,
            "Instrumenttype":"4"
        };
        var c_data = [];
        var v_data = [];
        var interval = 0;
        var start = 0;
        var zoom = 10;

        socket = new WebSocketConnect();

        //第一次打开终端,初始化代码表第一次默认请求
        $.ajax({
            url: stockXMlUrl,
            type: 'GET',
            dataType: 'xml',
            async:false,
            cache:false,
            error: function(xml){
                console.log("请求代码表出错");
            },
            success: function(xml){
                var allZSCode =  $(xml).find("EXCHANGE PRODUCT SECURITY");
                xmlCode = xml;
                _codeList = allZSCode;

                var exponentDateTime = getExponentDateTime(xmlCode,_codeList);

                compareTime(exponentDateTime);

                var ws = socket.createWebSocket();
                initEvent(ws);
            }
        });
        //1、用id判断出是哪个指数，获取其开始时间和结束时间、保留小数位
        function compareTime(dateList){
            for(let i=0;i<dateList.length;i++){
                if( id == dateList[i].id ){
                    decimal = parseInt(dateList[i].decimalCount);//保留小数位数
                    typeIndex = dateList[i].type;//指数类型
                    var start = parseInt(dateList[i].startTime.split(":")[0]);
                    var end = parseInt(dateList[i].endTime.split(":")[0]);
                    if(dateList[i].endTime1){
                        end = parseInt(dateList[i].endTime1.split(":")[0]);
                    }
                    var json,json1;
                    if(start > end){//国际时间，需要将当前时间减一
                        sub = -1;
                        json = {
                            startTime:dateList[i].startTime,
                            endTime:dateList[i].endTime1
                        };
                        nowDateTime.push(json);
                    }else{
                        sub = 0;
                        json = {
                            startTime:dateList[i].startTime,
                            endTime:dateList[i].endTime
                        };
                        nowDateTime.push(json);
                        if(dateList[i].startTime1){
                            json1 = {
                                startTime1:dateList[i].startTime1,
                                endTime1:dateList[i].endTime1
                            };
                            nowDateTime.push(json1);
                        }
                    }
                }
            }
        }

    //从XML表中摘出时间，name,id，小数位,指数类型
        function getExponentDateTime(xmlCode,_codeList){
            let startTime,endTime,startTime1,endTime1,ids,names,decimalCount,type,json;
            let exponentDateTime = [];
            for(let i=0;i<_codeList.length;i++){
                if(_codeList[i].attributes["ts"]){
                    decimalCount = $($(_codeList[i]).parent("product")[0]).attr("PriceDecimal");
                    type = $($(_codeList[i]).parent("product")[0]).attr("type");
                    if(_codeList[i].attributes["ts"].value.indexOf(";")>-1){
                        var st = _codeList[i].attributes["ts"].value.split(";")[0];
                        var et = _codeList[i].attributes["ts"].value.split(";")[1];
                        startTime = st.split("-")[0];
                        endTime = st.split("-")[1];
                        startTime1 = et.split("-")[0];
                        endTime1 = et.split("-")[1];
                        ids = _codeList[i].attributes["id"].value;
                        names = _codeList[i].attributes["name"].value;
                        json = {
                            id:ids,
                            name:names,
                            startTime:startTime,
                            endTime:endTime,
                            startTime1:startTime1,
                            endTime1:endTime1,
                            decimalCount:decimalCount,
                            type:type
                        };
                        exponentDateTime.push(json);
                    }else{
                        startTime = _codeList[i].attributes["ts"].value.split("-")[0];
                        endTime = _codeList[i].attributes["ts"].value.split("-")[1];
                        startTime1 = endTime1 = "";
                        names = _codeList[i].attributes["name"].value;
                        ids = _codeList[i].attributes["id"].value;
                        json = {
                            id:ids,
                            name:names,
                            startTime:startTime,
                            endTime:endTime,
                            startTime1:startTime1,
                            endTime1:endTime1,
                            decimalCount:decimalCount,
                            type:type
                        };
                        exponentDateTime.push(json);
                    }
                }else{
                    var elValue = $($(_codeList[i]).parent("product")[0]).attr("ts");
                    decimalCount = $($(_codeList[i]).parent("product")[0]).attr("PriceDecimal");
                    type = $($(_codeList[i]).parent("product")[0]).attr("type");
                    if(elValue.indexOf(";")>-1){
                        var st = elValue.split(";")[0];
                        var et = elValue.split(";")[1];
                        startTime = st.split("-")[0];
                        endTime = st.split("-")[1];
                        startTime1 = et.split("-")[0];
                        endTime1 = et.split("-")[1];
                        ids = _codeList[i].attributes["id"].value;
                        names = _codeList[i].attributes["name"].value;
                        if($($(_codeList[i]).parent("product")[0]).attr("name") == "指数"){
                            startTime1  = startTime1.split(":")[0] +":"+ parseInt(startTime1.split(":")[1])+"1";
                        }
                        json = {
                            id:ids,
                            name:names,
                            startTime:startTime,
                            endTime:endTime,
                            startTime1:startTime1,
                            endTime1:endTime1,
                            decimalCount:decimalCount,
                            type:type              
                        };
                        exponentDateTime.push(json);
                    }else{
                        startTime = elValue.split("-")[0];
                        endTime = elValue.split("-")[1];
                        names = _codeList[i].attributes["name"].value;
                        startTime1 = endTime1 = "";
                        ids = _codeList[i].attributes["id"].value;
                        json = {
                            id:ids,
                            name:names,
                            startTime:startTime,
                            endTime:endTime,
                            startTime1:startTime1,
                            endTime1:endTime1,
                            decimalCount:decimalCount,
                            type:type
                        };
                        exponentDateTime.push(json);
                    }
                }
            }
            return exponentDateTime;
        }

        function WebSocketConnect(request) {
            this.ws = null;
            var lockReconnect = false;//避免重复连接 连接锁如果有正在连接的则锁住
            // var wsUrl = 'ws://103.66.33.37:80'; //生产
            wsUrl = wsUrlDevelop;  //开发
            // var wsUrl= 'ws://103.66.33.58:80';
            // var wsUrl = 'wss://103.66.33.37:80';
            
            var timeout = 60000,//60秒
                timeoutObj = null,
                serverTimeoutObj = null;
            var _target = this;


            //建立socket连接
            WebSocketConnect.prototype.createWebSocket = function () {
                try {
                    this.ws = new WebSocket(wsUrl);
                    return this.ws;
                } catch (e) {
                    this.reconnect(wsUrl); //如果失败重连
                }
            };

            //socket重连
            WebSocketConnect.prototype.reconnect = function () {
                if (lockReconnect) return;
                lockReconnect = true;
                //没连接上会一直重连，设置延迟避免请求过多
                setTimeout(function () {
                    var ws = _target.createWebSocket(wsUrl);
                    initEvent(ws);
                    lockReconnect = false;
                }, 2000);
            };

            //发送请求
            WebSocketConnect.prototype.request = function (data) {
                this.ws.send(JSON.stringify(data));
            };

            //重置心跳包
            WebSocketConnect.prototype.reset = function () {
                clearTimeout(this.timeoutObj);
                clearTimeout(this.serverTimeoutObj);
                return this;
            };

            //开始心跳包
            WebSocketConnect.prototype.start = function () {
                var self = this;
                this.timeoutObj = setTimeout(function () {
                    //onmessage拿到返回数据就说明连接正常
                    self.request(XTB);
                    self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
                        self.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
                    }, timeout);
                }, timeout);
            };
        }

        function initEvent(ws) {
            ws.onclose = function () {
                socket.reconnect(); //终端重连
            };
            ws.onerror = function () {
                socket.reconnect(); //报错重连
            };
            ws.onopen = function () {
                //心跳检测重置
                socket.reset().start(); //都第一次建立连接则启动心跳包
                take_HQ(); //订阅行情 获取昨收
                // 获取历史数据
                getHistoryData();
                //获取今日数据推送
                getRealTimePush();

                // 清盘
                getQP();
                
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
                    case "R213"://订阅历史数据
                        // $(document).trigger("MK_data",data);
                        initCharts(data);
                        break;
                    case "Q619"://订阅快照
                        // $(document).trigger("SBR_HQ",data);
                        if(!yc){
                            yc = data[0].PreClose; //获取昨收值
                            return;
                        }
                        // 接口变更  日期为前一天
                        todayDate = formatDate(data[0].Date + sub);
                    break;
                    case "Q213"://订阅分钟线
                        if(myChart != undefined){
                            initCharts(data,"add");
                        }
                    break;
                    case "Q640"://清盘
                        var MarketStatus = data["MarketStatus"] || data[0]["MarketStatus"];
                        if(MarketStatus == 1){//收到清盘指令  操作图表
                            redrawChart(data);
                        }
                    case "R646":  //心跳包
                        // console.log(data);
                    default:
                }
                socket.reset().start();
            };
        }
        // 清盘
        function getQP(){
            socket.request(QPDATA);
        }
        // 获取实时分钟推送
        function getRealTimePush(){
            socket.request(RTDATA);
        }
        //获取历史指数数据
        function getHistoryData(){
            socket.request(historyData);
        }
        //请求订阅 获取昨收
        function take_HQ() {
            socket.request(HQAll);
        }
        // 接收到清盘指令重绘图表
        function redrawChart(data){
            history_data = []; //价格历史记录
            z_history_data = []; //涨跌幅历史记录
            a_history_data = []; //成交量记录
            v_data = [];
            c_data = [];
            if(data){
                if(myChart == undefined) return;
                yc = parseFloat(yc);
                if (yc) {
                    var minY = (yc - yc*0.03).toFixed(decimal);
                    var middleY = yc.toFixed(decimal);
                    var maxY = (yc + yc*0.03).toFixed(decimal);

                    var dd = ((parseFloat(minY) - parseFloat(yc)) / parseFloat(yc) * 100);
                    if(Math.abs(dd) > 1){
                        var minY1 = ((parseFloat(minY) - parseFloat(yc)) / parseFloat(yc)).toFixed(2);
                        var maxY1 = ((parseFloat(maxY) - parseFloat(yc)) / parseFloat(yc)).toFixed(2);
                    }else{
                        var minY1 = ((parseFloat(minY) - parseFloat(yc)) / parseFloat(yc) * 100).toFixed(2);
                        var maxY1 = ((parseFloat(maxY) - parseFloat(yc)) / parseFloat(yc) * 100).toFixed(2);
                    }
                } else {
                    var minY = 0;
                    var middleY = 1;
                    var maxY = 2;
                }
                var split = parseFloat(((maxY - minY) / 6).toFixed(4));
                var split1 = parseFloat(((maxY1 - minY1) / 6).toFixed(4));

                v_data =  getxAxis((data[0].Date));
                var option ={
                    yAxis: [
                        {
                            min: minY,
                            max: maxY,
                            interval: split
                        },{
                            min: minY1,
                            max: maxY1,
                            interval: split1
                        }
                    ],
                    xAxis:[{
                        data:v_data
                    },{
                        data:v_data
                    }],
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
            }else{
                console.log("清盘有误");
            }
        }
        
        //初始化分时图 
        function initCharts(data,type){
            if (data) {
                if(type == "add"){
                    if(myChart != undefined){
                        yc = parseFloat(yc);
                        var a_lastData = data;
                        var last_dataTime = formatTime(a_lastData[0].Time);//moment(parseFloat(a_lastData[0].Time + "000")).format("HH:mm"); //行情最新时间
                        var last_date = dateToStamp(formatDate(a_lastData[0].Date) +" " + last_dataTime);
                        var zVale = parseFloat(((parseFloat(a_lastData[0].Price) - parseFloat(yc)) / parseFloat(yc) * 100).toFixed(2)); //行情最新涨跌幅
                        var aValue = parseFloat(a_lastData[0].Volume); //最新成交量

                        if((parseFloat(a_lastData[0].Price)) > (yc + yc*0.03).toFixed(decimal)){
                            a_lastData[0].Price = (yc + yc*0.03).toFixed(decimal);
                        }else if((parseFloat(a_lastData[0].Price)) < (yc - yc*0.03).toFixed(decimal)){
                            a_lastData[0].Price = (yc - yc*0.03).toFixed(decimal);
                        }

                        for(var i=0;i<c_data.length;i++){
                            if(last_date == c_data[i]){
                                history_data[i] = parseFloat(a_lastData[0].Price);
                                z_history_data[i] = parseFloat(zVale);
                                a_history_data[i] = parseFloat(aValue);
                                // 中间有断开
                                if(i > (history_data.length-1) ){
                                    for(var j=history_data.length-1;j<=i;j++){
                                        history_data[j].push(null);
                                        z_history_data[j].push(null);
                                        a_history_data[j].push(null);
                                        if(j == i){
                                            history_data[j] = parseFloat(a_lastData[0].Price);
                                            z_history_data[j] = parseFloat(zVale);
                                            a_history_data[j] = parseFloat(aValue);
                                        }
                                    }
                                }
                            }else{
                                
                            }
                        }
                        var marktToolData = [
                            history_data[history_data.length - 1],
                            z_history_data[z_history_data.length - 1],
                            a_history_data[a_history_data.length - 1],
                            moment(parseFloat(c_data[history_data.length - 1])).format("YYYY-MM-DD HH:mm")
                        ];
                        set_marketTool(marktToolData); //设置动态行情条

                        var fvalue, r1;
                        fvalue = parseFloat(a_lastData[0].Price);
                        r1 = Math.abs(fvalue - parseFloat(yc));
                        if (r1 > interval) {
                            interval = r1;
                            var minY = (yc - interval).toFixed(decimal);
                            var middleY = yc.toFixed(decimal);
                            var maxY = (yc + interval).toFixed(decimal);
                            var split = parseFloat(((maxY - minY) / 6).toFixed(4));
                            myChart.setOption({
                                yAxis: {
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
                                                return parseFloat(value).toFixed(decimal);
                                            }
                                        }
                                    }
                                },
                                series: 
                                {
                                    markLine: {
                                        data: [
                                            {
                                                name: 'Y 轴值为 100 的水平线',
                                                yAxis: middleY
                                            }
                                        ]
                                    }
                                }
                            });
                        }
                        if (mouseHoverPoint == history_data.length - 1) {
                            myChart.dispatchAction({
                                type: 'showTip',
                                seriesIndex: 0,
                                dataIndex: mouseHoverPoint,
                                name: "Mline",
                                position: ['50%', '50%']
                            });
                        }
                        myChart.setOption({
                            xAxis:[{
                                data:v_data
                            },{
                                data:v_data
                            }],
                            series: [
                                {
                                    data: history_data,
                                    // markLine: {
                                    //     data: [
                                    //         {
                                    //             name: 'Y 轴值为 100 的水平线',
                                    //             yAxis: middleY
                                    //         }
                                    //     ]
                                    // }
                                },
                                {
                                    data: z_history_data
                                },
                                {
                                    data: a_history_data
                                },
                                // {
                                //     data: a_history_data
                                // }
                            ]
                        });
                    }else{
                        console.log("初始化图表失败");
                    }
                }else{
                    if(data.d && data.d.length>0){
                        data = data.d;
                        var price = [];//价格
                        var volume = [];//成交量
                        var zdfData = [];//涨跌幅
                        $.each(data, function (i, o) {
                            var fvalue,f1;
                            fvalue = parseFloat(o.Price);//价格
                            price.push(o.Price);
                            volume.push(o.Volume);
                            zdfData.push((((fvalue-parseFloat(yc))/parseFloat(yc))* 100).toFixed(2));
                            if(fvalue > 0){
                                r1 = Math.abs(fvalue - parseFloat(yc));
                                if (r1 > interval) {
                                    interval = r1;
                                }
                            }
                        });

                        history_data = price;//价格历史数据
                        z_history_data = zdfData;//涨跌幅历史数据
                        a_history_data = volume;//成交量历史数据
                        
                        //取绝对值  差值 
                        interval = interval*2;
                        yc = parseFloat(yc);
                        if (yc) {
                            var minY = (yc - interval).toFixed(decimal);
                            var middleY = yc.toFixed(decimal);
                            var maxY = (yc + interval).toFixed(decimal);

                            var dd = ((parseFloat(minY) - (yc)) / (yc) );//* 100);
                            if(Math.abs(dd) > 1){
                                var minY1 = ((parseFloat(minY) - (yc)) / (yc)).toFixed(2);
                                var maxY1 = ((parseFloat(maxY) - (yc)) / (yc)).toFixed(2);
                            }else{
                                var minY1 = ((parseFloat(minY) - (yc)) / (yc) * 100).toFixed(2);
                                var maxY1 = ((parseFloat(maxY) - (yc)) / (yc) * 100).toFixed(2);
                            }
                        } else {
                            var minY = 0;
                            var middleY = 1;
                            var maxY = 2;
                        }

                        var split = parseFloat(((maxY - minY) / 6).toFixed(4));
                        var split1 = parseFloat(((maxY1 - minY1) / 6).toFixed(4));
                        // var date = moment(parseFloat(datatime)).format("YYYY-MM-DD");
                        v_data = getxAxis(data[0].Date);
                        var option = {
                            animation: false,
                            grid: [
                                {
                                    top: "5%",
                                    height: '60%',
                                },
                                {
                                    top: '75%',
                                    height: '10%',
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
                                triggerOn:"mousemove",
                                backgroundColor:'#fff',
                                borderWidth: 1,
                                borderColor: '#b4b4b4',
                                padding:[0,10],
                                textStyle:{
                                    color:colorList[2],
                                    fontSize:14
                                },
                                extraCssText:'border-radius:0px',
                                position: function (pos, params, el, elRect, size) {
                                    var obj = {top: 10};
                                    obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
                                    return obj;
                                },
                                formatter: function (params) {
                                    var paramsTime = params[0]["axisValue"];
                                    var paramsData = params[0]["data"];
                                    var paramsVolume = params[1]["data"];
                                    var tpl = "<label style='text-align:left;display:block;line-height:40px;height:40px;'>浦发银行</label>";
                                    tpl += "<label style='display:block;line-height:20px;height:20px;'>" + paramsTime + "</label>";
                                    $.each(params,function(i,items){
                                        switch (items.seriesName){
                                            case "Mline":
                                            tpl += "<label style='display:block;text-align:left;line-height:30px;'> <i style='width:30px;'>价格</i>";
                                            if(items.value >= yc){
                                                tpl += "<i style='color:#e22f2a;float:right;'>" + (items.value?items.value:"") + "</i>";
                                            }else{
                                                tpl += "<i style='color:#3bc25b;float:right;'>" + (items.value || items.value==0?items.value:"") + "</i>";
                                            }
                                            tpl += "</label>";
                                            break;
                                            case "limit":
                                            tpl += "<label style='display:block;text-align:left;line-height:30px;'> <i style='width:30px;'>涨跌幅</i>";
                                            if(items.value >= 0){
                                                tpl += "<i style='color:#e22f2a;float:right;'>" +(items.value?items.value:"") + "%</i>";
                                            }else{
                                                tpl += "<i style='color:#3bc25b;float:right;'>" + (items.value || items.value==0?items.value:"") + "%</i>";
                                            }
                                            tpl += "</label>";
                                            break;
                                            case "Vol":
                                            tpl += "<label style='display:block;text-align:left;line-height:30px;'> <i style='width:30px;'>成交量</i>";
                                            if(parseFloat(items.value) < 100){
                                                tpl += "<i style='color:#555;float:right;'>" + (parseFloat(items.value)) + "股</i>";
                                            }else{
                                                if(parseFloat(items.value) >= 10000){
                                                    tpl += "<i style='color:#555;float:right;'>" + (parseFloat(items.value)?parseFloat(items.value)/1000000:"") + "万手</i>";
                                                }else{
                                                    tpl += "<i style='color:#555;float:right;'>" + (parseFloat(items.value)||parseFloat(items.value)==0?parseFloat(items.value)/100:"") + "手</i>";
                                                }
                                            }
                                            tpl += "</label>";
                                            break;
                                            default:
                                            break;
                                        }
                                    });
                                    return tpl;
                                }
                            },
                            dataZoom: [
                                {
                                    type: 'inside',
                                    xAxisIndex: [0, 1],
                                    start: 0,
                                    end: 100,
                                },
                                {
                                    show: true,
                                    xAxisIndex: [0, 1],
                                    type: 'slider',
                                    bottom:'0',
                                    height:"40px",
                                    start: 0,
                                    end: 100,
                                    backgroundColor:"#fff",
                                    fillerColor:"rgba(0,0,0,0.2)",
                                    borderColor:"transparent",
                                    handleIcon:'path://M 100 100 L 300 100 L 300 700 L 100 700 z',
                                    handleStyle:{
                                        color:"#f2f2f2",
                                        borderColor:"#b4b4b4",
                                        borderWidth:1
                                    },
                                    textStyle:{
                                        color:colorList[3],
                                        fontSize:14
                                    }
                                }
                            ],
                            xAxis: [
                                {
                                    type:"category",
                                    axisTick: {
                                        interval: function (number, string) {
                                            if(typeIndex == "128" || typeIndex == "224"){
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
                                        interval: function (number, string) {
                                            if(typeIndex == "128" || typeIndex == "224"){
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
                                            var tVal = value.split(" ")[3];
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
                                    data: v_data,
                                    splitLine: {
                                        show: false
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
                                    }
                                },
                                {
                                    type:"category",
                                    name:'万',
                                    nameLocation:'start',
                                    nameTextStyle:{
                                        color:colorList[2]
                                    },
                                    axisTick: {
                                        interval: function (number, string) {
                                            if(typeIndex == "128" || typeIndex == "224"){
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
                                            if(typeIndex == "128" || typeIndex == "224"){
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
                                    data: v_data,
                                    splitLine: {
                                        show: false
                                    },
                                    gridIndex: 1
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
                                                return parseFloat(value).toFixed(decimal);
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
                                                return parseFloat(params.value).toFixed(decimal);
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
                                            if(value >= 10000){
                                                return  (value/10000);
                                            }else{
                                                return value;
                                            }
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
                                },
                                // {
                                //     name:'量比',
                                //     nameLocation:'end',
                                //     nameTextStyle:{
                                //         color:colorList[2],
                                //         fontSize:14
                                //     },
                                //     nameGap:0,
                                //     axisLine:{
                                //         show:false
                                //     },
                                //     axisTick:{
                                //         show:false
                                //     },
                                //     axisLabel:{
                                //         show:false
                                //     },
                                //     type:'value',
                                //     boundaryGap: [0, '100%'],
                                //     splitLine:{
                                //         show:false
                                //     },
                                //     gridIndex: 2
                                // }
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
                                    //             if(params.value > 1000000){
                                                    // return '#e22f2a';
                                    //             }else{
                                                    return colorList[1];
                                    //             }
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

                        count = myChart.getOption().series[0].data.length;
                        
                        var marktToolData = [history_data[count - 1], z_history_data[count - 1], a_history_data[count - 1], moment(parseFloat(c_data[count - 1])).format("YYYY-MM-DD HH:mm")];
                        set_marketTool(marktToolData); //设置动态行情条

                        myChart.on('showTip', function (params) {
                            mouseHoverPoint = params.dataIndex;
                            if (history_data[mouseHoverPoint]) {
                                $("#toolContent_M").children().first().text(moment(parseFloat(c_data[mouseHoverPoint])).format("YYYY-MM-DD HH:mm"));
                                if(history_data[mouseHoverPoint] >= yc){
                                    $("#toolContent_M").children().eq(1).text(history_data[mouseHoverPoint]).css("color",colorList[0]);
                                    $("#toolContent_M").children().eq(3).text(z_history_data[mouseHoverPoint]).css("color",colorList[0]);
                                }else{
                                    $("#toolContent_M").children().eq(1).text(history_data[mouseHoverPoint]).css("color",colorList[1]);
                                    $("#toolContent_M").children().eq(3).text(z_history_data[mouseHoverPoint]).css("color",colorList[1]);
                                }
                                $("#toolContent_M").children().eq(2).text(a_history_data[mouseHoverPoint]);
                                $(".vol i").text(a_history_data[mouseHoverPoint]);
                                $("#quantityRatio").text(a_history_data[mouseHoverPoint]);
                            } else {
                                $("#toolContent_M").children().first().text("-");
                                $("#toolContent_M").children().eq(1).text("-");
                                $("#toolContent_M").children().eq(2).text("-");
                                $("#toolContent_M").children().eq(3).text("-");
                                $(".vol i").text("-");
                                $("#quantityRatio").text("-");
                            }
                        });

                        $("#main1").bind("mouseenter", function (event) {
                            toolContentPosition(event);
                            $("#toolContent").show();
                        });

                        $("#main1").bind("mousemove", function (event) {
                            isHoverGraph = true;
                            toolContentPosition(event);
                        });

                        $("#main1").bind("mouseout", function (event) {
                            isHoverGraph = false;
                            $("#toolContent").hide();
                            mouseHoverPoint = 0;
                        });

                        function toolContentPosition(event) {
                            var offsetX = event.offsetX;
                            var continerWidth = $("#main1").width(), toolContent = $("#toolContent").width();
                            var centerX = continerWidth / 2;
                            if (offsetX > centerX) {
                                $("#toolContent").css("left", 55);
                            } else {
                                $("#toolContent").css("left", continerWidth - toolContent - 60);
                            }
                        }
                    }else{
                        console.log("暂时没有数据");    
                    }
                }
            }else{
                console.log("暂时没有数据");
            }

            function set_marketTool(data) {
                if (!isHoverGraph || isHoverGraph && !history_data[mouseHoverPoint] && data) {
                    $("#toolContent_M").children().first().text(data[3]);
                    $("#toolContent_M").children().eq(2).text(data[2]);
                    $(".vol i").text(data[2]);
                    $("#quantityRatio").text(data[2]);
                    if( parseFloat(data[0]) >= parseFloat(yc)){
                        $("#toolContent_M").children().eq(1).text(data[0]).css("color",colorList[0]);
                        $("#toolContent_M").children().eq(3).text(data[1]).css("color",colorList[0]);
                    }else{
                        $("#toolContent_M").children().eq(1).text(data[0]).css("color",colorList[1]);
                        $("#toolContent_M").children().eq(3).text(data[1]).css("color",colorList[1]);
                    }
                }
            }

            // 获取X轴的数值
            function getxAxis(todayDateStr){
                var beginTime,finishTime,beginTime1,finishTime1;
                //2、判断是开始时间是否大于结束时间，大于的话就要取前一天，小于的话按照正常的来 
                var b_time1,b_time2;  // 停盘时间
                if(sub > -1){ //未跨天的时间计算  1-中间有断开  2-中间未断开
                    // todayDate = formatDate(data[0].Date + sub);
                    todayDate = formatDate(todayDateStr);
                    if(nowDateTime.length > 1){
                        beginTime = todayDate + " " + nowDateTime[0].startTime;
                        finishTime = todayDate + " " + nowDateTime[0].endTime;
                        beginTime1 = todayDate + " " + nowDateTime[1].startTime1;
                        finishTime1 = todayDate + " " + nowDateTime[1].endTime1;
                        
                        b_time1 = moment(finishTime).utc().valueOf();
                        b_time2 = moment(beginTime1).utc().valueOf();
                    }else{
                        beginTime = todayDate + " " + nowDateTime[0].startTime;
                        finishTime = todayDate + " " + nowDateTime[0].endTime;
                    }
                }else{  //跨天的时间计算  1-中间有断开
                    // todayDate = formatDate(data[0].Date + sub);
                    todayDate = formatDate(todayDateStr);
                    if(nowDateTime.length > 1){
                        beginTime = todayDate + " " + nowDateTime[0].startTime;
                        finishTime = todayDate + " " + nowDateTime[0].endTime;
                        beginTime1 = todayDate + " " + nowDateTime[1].startTime1;
                        finishTime1 = todayDate + " " + nowDateTime[1].endTime1;

                        // 前半段时间的起始时间和结束时间比较
                        if(moment(beginTime).utc().valueOf() < moment(finishTime).utc().valueOf()){
                            //都是当天时间 
                            // 判断后半段时间：前半段的结束时间和后半段的结束时间作比较   如果大于，则跨天；否则没有
                            if(moment(finishTime).utc().valueOf() < moment(beginTime1).utc().valueOf()){
                                // 判断后半段时间是否跨天 如果大于，则跨天；否则没有
                                if(moment(beginTime1).utc().valueOf() < moment(finishTime1).utc().valueOf()){

                                }else{
                                    //跨天
                                    finishTime1 = formatDate(todayDateStr+1) + " " + nowDateTime[1].endTime1;
                                }
                            }else{
                                beginTime1 = formatDate(todayDateStr+1) + " " + nowDateTime[1].startTime1;
                                finishTime1 = formatDate(todayDateStr+1) + " " + nowDateTime[1].endTime1;
                            }
                        }else{
                            //结束时间为第二天   跨天了
                            finishTime = formatDate(todayDateStr+1) + " " + nowDateTime[0].endTime;
                            beginTime1 = formatDate(todayDateStr+1) + " " + nowDateTime[1].startTime1;
                            finishTime1 = formatDate(todayDateStr+1) + " " + nowDateTime[1].endTime1;
                        }

                        b_time1 = moment(finishTime).utc().valueOf();
                        b_time2 = moment(beginTime1).utc().valueOf();
                    }else{  // 2- 中间未断开
                        beginTime = todayDate + " " + nowDateTime[0].startTime;
                        finishTime = formatDate(todayDateStr+1) + " " + nowDateTime[0].endTime;
                    }
                }
                beginTime = moment(beginTime).utc().valueOf(); //开盘时间
                if(finishTime1){
                    // endDateTime = finishTime1;
                    finishTime = moment(finishTime1).utc().valueOf();
                }else{
                    // endDateTime = finishTime;                        
                    finishTime = moment(finishTime).utc().valueOf(); //清盘时间
                }
                var timeAdd = beginTime;
                var i = 0;
                while (moment(timeAdd).isBefore(moment(finishTime))) {
                    if (i == 0) {
                        c_data.push(beginTime);
                    } else {
                        timeAdd = moment(timeAdd).add(1, 'm').utc().valueOf();
                        if(b_time1 && b_time2){
                            if (moment(timeAdd).isAfter(moment(b_time1)) && moment(timeAdd).isBefore(moment(b_time2))) {
                                continue;
                            } else {
                                c_data.push(timeAdd);
                            }
                        }else{
                            c_data.push(timeAdd);
                        }
                    }
                    i++;
                }
                for(var k = 0;k < c_data.length;k++){
                    v_data.push(formatDate(c_data[k],"1"));
                }
                return v_data;
            }
        }
        $(document).keyup(function (e) {
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
        
        function move(index, type) {
            var chart;
            if($("#MLine").css("display") == "none") {
                chart = KChart;
            }else {
                chart = myChart;
            }
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
    // 点击切换量比、MACD
        // $(".chartsTab a").on("click",function(){
        //     var $this = $(this);
        //     if($this.hasClass("activeAs")){
        //         return;
        //     }else{
        //         $(".chartsTab a").removeClass("activeAs");
        //         $this.addClass("activeAs");
        //         var option = {};
        //         switch ($this.text()){
        //             case "无":
        //                 option = {
        //                     grid: [
        //                         {
        //                             top: "5%",
        //                             height: '60%',
        //                         },
        //                         {
        //                             top: '75%',
        //                         },
        //                         {
        //                             bottom:'-100%',
        //                         }
        //                     ]
        //                 };
        //                 $(".chartsTab").siblings(".vol").addClass("vol1");
        //                 $(".quantityRatio").eq(0).hide();
        //             break;
        //             case "量比":
        //                 option = {
        //                     grid: [
        //                         {
        //                             top: "5%",
        //                             height: '40%',
        //                         },
        //                         {
        //                             top: '55%',
        //                         },
        //                         {
        //                             bottom:'15%',
        //                         }
        //                     ]
        //                 };
        //                 $(".chartsTab").siblings(".vol").removeClass("vol1");
        //                 $(".quantityRatio").eq(0).show();
        //             break;
        //             case "MACD":
        //             break;
        //             default:
        //             break;
        //         }
        //         myChart.setOption(option);
        //     }
        // });
});