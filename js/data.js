// websocket连接对象-websocket连接对象的查询参数和数据存储
var socket;         
// 股票的相关信息对象-用于页面展示等信息的查询参数和数据存储
var StockInfo;      
// 分时对象-分时图查询参数以及数据存储
var MLine;          

//分时图用到的颜色：红色,绿色,555,999
var colorList = ['#e22f2a','#3bc25b','#555','#999','#e5e5e5'];  

// K线对象-K线图查询参数以及数据存储
var KLine;          

// 通用的图形对象-存储图像切换等信息
var Charts = {          
    type: "mline",      // 当前点击的查询的图像类型，分时，日K线，周K线等等
    isLoaded: false,    // 页面打开后，第一次查询的数据是否加载完毕-- true:加载完毕，false，未加载完毕。用于处理页面中断网时用到
    preType: null,      // 上一次
    clickTimer: null,   // 点击查询每一种图形的防抖设置，settimeout避免过快点击
    VMmin: null,        // K线下面的成交量的最大最小值
    VMmax: null,        // K线下面的成交量的最大最小值
    LatestVolume:0,     // 最新一笔成交量的值   

    // 需要点击查询的指标相关 记录
    myIndexClick: 0,        // 记录 当前查询的指标 的 索引，分时图没有指标线，所以点击分时图时，参数归零，之后再点击其他线不自动查询。 
    myTechIndexNumber: 0,   // 记录 查询次数 ，分时图没有指标线，所以点击分时图时，参数归零，之后再点击其他线不自动查询。 
    oldIndexNameOthers: null, // 记录 上一次点击查询的 指标的 名称
    mouseHoverPoint: 0,         // 当前现实的数据索引
    paitChartsNow: false,          // 更新图表的锁
    moveTimer : null,           // kline的mousemove的timer,防抖函数
    indexTimer: null,           // 指标更新的timer，防止重复绘图
    
    // 鼠标的交互点击滑动等操作
    isHoverGraph: false,        // 是否正在被hover
    zoom: 10,                   // 放大时候的zoom
    start: 0,                   // 起始位置
    dataZoomTimer: null,        // 放大缩小时候的防抖函数
    thisChartFocus: null,       // 为了点击上下左右键，页面不进行滚动，定义的图像id
};

/**
 * 指标的设置
 */
// 指标线各项的颜色
var KColorList = {                  
    MA:['#97bdde','#c4a926','#d182aa'],
    MAVOL:['#97bdde','#c4a926','#d182aa'],
    MACD:['#6c88bb','#c4a926','#e1322f','#5acf5e'],
    MTM:['#6c88bb','#c4a926','#e1322f'],
    RSI:['#6c88bb','#c4a926','#d182aa'],
    KDJ:['#6c88bb','#c4a926','#d182aa']
}
// 指标线每项的线的类型
var chartTypes = {                  
    MA:['line','line','line'],
    MAVOL:['line','line','line'],
    MACD:['line','line','bar'],
    MTM:['line','line','line'],
    RSI:['line','line','line'],
    KDJ:['line','line','line']
}
// 图形下方需要点击进行查询的指标线，每一项对应的名字
var Names = {
    MACD: ['DIFF','DEA','MACD'],
    MTM:['MTM','MAMTM'],
    RSI:['RSI$1','RSI$2','RSI$3'],
    KDJ:['K','D','J']
}
// 图形下方需要点击进行查询的指标线，每一项对应的小数位数
var fixedDemicalIndex = {
    MACD: 3,
    MTM:3,
    RSI:2,
    KDJ:2
}