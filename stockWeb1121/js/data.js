// 历史数据存储，为了添加新数据时，能够准确记录所有数据
var KLineData = {
	KChart: echarts.init(document.getElementById('kline_charts')),	// K线绘制对象
	lineType: "mline",			// K线类型
	hDate: [],					// 日期
	hDay: [],					// 星期
	hTime: 0,					// 如果为日K线，存储最后一条时间
	hCategoryList: [],			// 横轴
	hValuesList: [],			// 值-开收低高
	hValuesPercentList: [],		// 值-对应的百分比
	hVolumesList: [],			// 成交量
	hZValuesList: [],			// 涨幅
	hZValuesListPercent: [],	// 涨幅百分比
	hZf: [],					// 振幅
	hZfList: []					// 振幅百分比
};
var KLineSet = {
	mouseHoverPoint: 0,			// 当前现实的数据索引
	isHoverGraph: false,        // 是否正在被hover
	zoom: 10,
	start: 0
};
var Field = {
	Name: null,         // 指数名称  ---代码表查询
	Decimal: null, // 小数位数
	PrePrice: null      // 昨收   ---今日-快照 
}
