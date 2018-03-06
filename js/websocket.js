// // websocket实例化相关参数以及数据存储参数
// var WebSocketConnect = function(options){
//     this.wsUrl = options.wsUrl?options.wsUrl:"ws://103.66.33.67:80";
//     this.stockXMlUrl = options.stockXMlUrl?options.stockXMlUrl:"http://103.66.33.58:443/GetCalcData?ExchangeID=2&Codes=1";
//     this.ws = null;
//     this.lockReconnect = false;
//     this.timeout = 60000;       //60秒
//     this.timeoutObj = null;
//     this.serverTimeoutObj = null;
//     this.KChart = echarts.init(document.getElementById('kline_charts'));

//     this.HeartSend = {             // 心跳包        
//         InstrumentID: options.InstrumentID,
//         ExchangeID: options.ExchangeID,
//         MsgType: "Q8050"
//     };
//     this.HistoryData = {
//         hDate: [],                  // 日期
//         hDay: [],                   // 星期
//         hTime: 0,                   // 如果为日K线，存储最后一条时间
//         hCategoryList: [],          // 横轴
//         hValuesList: [],            // 值-开收低高
//         hValuesPercentList: [],     // 值-对应的百分比
//         hVolumesList: [],           // 成交量
//         hZValuesList: [],           // 涨幅
//         hZValuesListPercent: [],    // 涨幅百分比
//         hZf: [],                    // 振幅
//         hZfList: [],                // 振幅百分比
//         preLineType: null,          // 前一次查询的线类型
//         queryTimes:0,               // 查询数据次数
//         dataLengthToday:0,          // 分钟K线查询当天的
//         dataLength: 0,              // 查询的历史数据参数            
//         stopQuery: null,            // 是否已经停止查询历史数据
//         watchDataCount:0,           // 目前已经累计的订阅数量
//         CountNum: 0                 // hour类型需要，计算前几根相同的根数，然后通过index判断计算出坐标轴日期的间隔
//     };
//     this.KLineSet = {
//         mouseHoverPoint: 0,         // 当前现实的数据索引
//         isHoverGraph: false,        // 是否正在被hover
//         zoom: 10,
//         start: 0
//     };
//     this.option = {                 // 数据查询参数
//         KWatchKZ: {
//             InstrumentID: options.InstrumentID,
//             ExchangeID: options.ExchangeID,
//             MsgType:"S1010",
//             Instrumenttype:"1"
//         },
//         lineType: null
//     };
// };
// WebSocketConnect.prototype = {
//     createWebSocket:    function () {
//                             try {
//                                 this.ws = new WebSocket(this.wsUrl);
//                                 return this.ws;
//                             } catch (e) {
//                                 this.reconnect();  //如果失败重连
//                             }
//                         },
//     reconnect:  function () {
//                     var _target = this;
//                     if (_target.lockReconnect) return;
//                     _target.lockReconnect = true;
//                     KLineSocket.HistoryData.queryTimes = 0;
//                     setTimeout(function () {        //没连接上会一直重连，设置延迟避免请求过多
//                         var ws = _target.createWebSocket(_target.wsUrl);
//                         _target.ws = _target.createWebSocket(_target.wsUrl);

//                         initSocketEvent(_target);

//                         _target.lockReconnect = false;
//                         console.log("重连中……");
//                     }, 2000);
//                 },
//     request:    function (data) { //发送请求
//                     this.ws.send(JSON.stringify(data));
//                 },
//     reset:      function () { //重置心跳包
//                     clearTimeout(this.timeoutObj);
//                     clearTimeout(this.serverTimeoutObj);
//                     return this;
//                 },
//     start:      function () { //开始心跳包
//                     var self = this;
//                     this.timeoutObj = setTimeout(function () {
//                         //这里发送一个心跳，后端收到后，返回一个心跳消息，
//                         // onmessage拿到返回的心跳就说明连接正常
//                         self.getHeartSend();
//                         self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了
//                             self.ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
//                         }, self.timeout)
//                     }, self.timeout)
//                 }
// };
// WebSocketConnect.prototype.__proto__ = {

//     getHistoryKQFirstDayPrev: function(){  // 查询日为周期的历史数据, 第一次查199条，为了索引为整百的数据
//                             this.request(this.option.HistoryKQFirstDayPrev);
//                         },

//     getHistoryKQAllDayPrev: function(){   // 日为周期的历史数据扩展后再次进行查询,每次请求200条,StartIndex为整百
//                             this.request(this.option.HistoryKQAllDayPrev);
//                         },
    
//     getHistoryKQAllMinToday: function(){  // 分钟周期K线，当天的数据查询
//                             this.request(this.option.HistoryKQAllMinToday);
//                         },
//     getHistoryKQFirstMinPrev: function(){ // 分钟K线从昨天开始的交易数据查询,第一次查199条
//                             this.request(this.option.HistoryKQFirstMinPrev);
//                         },
//     getHistoryKQAllMinPrev: function(){ // 分钟K线从昨天开始的交易数据扩展后查询,每次请求200条,StartIndex为整百
//                         this.request(this.option.HistoryKQAllMinPrev);
//                     },
    
//     getKWatch:       function(){ // 订阅K线
//                             this.request(this.option.KWatch);
//                         },
    
//     getKWatchCC:     function(){ // 取消订阅K线
//                             this.request(this.option.KWatchCC);
//                         },
//     getHeartSend:       function(){
//                             this.request(this.HeartSend);
//                         },
// };