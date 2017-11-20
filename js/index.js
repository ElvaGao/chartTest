var myChart = echarts.init(document.getElementById("main1"));
var barData = [0,-0.5,-0.6,-0.2,0,0.5,0.6,0.9,1,1.5,0.6,0.2,0,-0.5,-0.9,-1,-1.5,-0.5,-0.1,0,0.5,0.6,1,2,0.3,0.3]
function splitData(rawData){
    var cataData = [];
    var values = [];
    var volume = [];
    for(let i=0;i<rawData.length;i++){
        cataData.push(rawData[i].splice(0,1)[0]);
        values.push(rawData[i]);
        volume.push(rawData[i][4]);
    }
    return {
        cataData:cataData,values:values,volume:volume
    }
}
function calculateMA(dayCount, data) {
    var result = [];
    for (var i = 0, len = data.values.length; i < len; i++) {
        if (i < dayCount) {
            result.push('-');
            continue;
        }
        var sum = 0;
        for (var j = 0; j < dayCount; j++) {
            sum += data.values[i - j][1];
        }
        result.push(+(sum / dayCount).toFixed(3));
    }
    return result;
}
$.get("./json/data.json",function(rawData){
    var data = splitData(eval(rawData));
    var option = {
        title:{
            text :'ECharts',
            link:"http://baidu.com",
            target:'blank',
            textStyle:{
                color:"red",
                align:"left",
                verticalAlign:"bottom",
                lineHeight:"80",
                textShadowColor:"#000",
                textShadowBlur:"2",
                textShadowOffsetX:"10",
                zlevel:"2"
            }
        },
        tooltip:{
            trigger:'axis',
            axisPointer:{
                type:'cross'
            },
            triggerOn:"mousemove",
            backgroundColor:'rgba(250,250,250,0.8)',
            borderWidth: 1,
            borderColor: '#ccc',
            padding:10,
            textStyle:{
                color:'#333'
            },
            extraCssText:'box-shadow: 0 0 3px rgba(0, 0, 0, 1);width: 170px;',
            position: function (pos, params, el, elRect, size) {
                var obj = {top: 10};
                obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
                return obj;
            }
        },
        axisPointer:{
            label:{
                backgroundColor:'#777',
                borderColor:"#000",
                borderWidth:1
            },
            link:{
                xAxisIndex:'all'
            }
        },
        // legend:{
        //     data:['Dow-Jones index', 'MA5', 'MA10', 'MA20', 'MA30','macd'],
        //     top:10,
        //     left:'center'
        // },
        grid:[{
            show:true,
            left:'10%',
            right:'10%',
            height:'40%'
        },{
            left:'10%',
            top:'50%',
            right:'10%',
            height:'10%',
            bottom:'30%'
        },{
            left:'10%',
            top:'70%',
            right:'10%',
            height:'10%',
            bottom:'5%'
        }
    ],
        xAxis:[{
            data:data.cataData,
            type:"category",
            axisLine: {onZero: false},
            splitLine: {show: false},
            splitNumber: 2,
            min: 'dataMin',
            max: 'dataMax',
            boundaryGap : false,
            axisPointer: {
                z: 100
            }
        },{
            gridIndex:1,
            data:data.cataData,
            type:"category",
            boundaryGap : false,
            axisLine: {onZero: false},
            axisTick: {show: false},
            splitLine: {show: false},
            axisLabel: {show: false},
            splitNumber: 20,
            min: 'dataMin',
            max: 'dataMax',
            axisPointer: {
                label: {
                    formatter: function (params) {
                        var seriesValue = (params.seriesData[0] || {}).value;
                        return params.value
                        + (seriesValue != null
                            ? '\n' + echarts.format.addCommas(seriesValue)
                            : ''
                        );
                    }
                }
            }
        },{
            gridIndex:2,
            data:data.cataData,
            type:"category",
            axisLabel: {show: false}
        }],
        yAxis:[
            {
                scale: true,
                splitArea: {
                    show: true
                }
            },{
                gridIndex:1,
                scale: true,
                splitNumber: 0,
                axisLabel: {show: false},
                axisLine: {show: false},
                axisTick: {show: false},
                splitLine: {show: false}
            },{
                gridIndex:2,
                scale: true,
                splitNumber: 4,
                axisLine: {onZero: false},
                axisTick: {show: false},
                splitLine: {show: false},
                axisLabel: {show: true}
            }
        ],
        dataZoom: [
            {
                type: 'inside',
                xAxisIndex: [0, 1],
                start: 58,
                end: 100
            },{
                show: true,
                xAxisIndex: [0, 1],
                type: 'slider',
                top: '85%',
                start: 98,
                end: 100
            
            },{
                show: false,
                xAxisIndex: [0, 2],
                type: 'slider',
                start: 20,
                end: 100
            }
        ],
        series:[
            {
                name:"Dow-Jones index",
                type:"candlestick",
                data:data.values,
                itemStyle: {
                    normal: {
                        color: '#06B800',
                        color0: '#FA0000',
                        borderColor: null,
                        borderColor0: null
                    }
                },
                tooltip: {
                    formatter: function (param) {
                        param = param[0];
                        return [
                            'Date: ' + param.name + '<hr size=1 style="margin: 3px 0">',
                            'Open: ' + param.data[0] + '<br/>',
                            'Close: ' + param.data[1] + '<br/>',
                            'Lowest: ' + param.data[2] + '<br/>',
                            'Highest: ' + param.data[3] + '<br/>'
                        ].join('');
                    }
                }
            },    
            {
                name:"MA20",  
                type:"line",
                smooth: true,
                data:calculateMA(5, data),
                lineStyle: {
                    normal: {opacity: 0.5}
                },
                markLine:{
                    label:{
                        normal:{
                            position:'middel',
                            formatter:function(params){
                                // console.log(params);
                            }
                        }
                    },
                    lineStyle:{
                        normal:{
                            color:"blue",
                            type:"dashed",
                            curveness:20
                        }
                    },
                    data:[{
                        type:'average',
                        symbol:"none"
                    },{
                        type:'average',
                        symbol:"none"
                    }],
                    symbol: ['none', 'none']
                }
            },{
                name:"MA10",
                type:"line",
                smooth: true,
                data:calculateMA(10, data),
                lineStyle: {
                    normal: {opacity: 0.5}
                }
            },{
                name:"MA5",
                type:"line",
                smooth: true,
                data:calculateMA(15, data),
                lineStyle: {
                    normal: {opacity: 0.5}
                }
            },{
                name:"MA30",
                type:"line",
                smooth: true,
                data:calculateMA(1, data),
                lineStyle: {
                    normal: {opacity: 0.5}
                }
            },{
                type:"bar",
                name:"Volumn",
                xAxisIndex:1,
                yAxisIndex:1,
                data:data.volume,
                markLine:{
                    label:{
                        normal:{
                            position:'middel',
                            formatter:function(params){
                                // console.log(params)
                            }
                        }
                    },
                    lineStyle:{
                        normal:{
                            color:"blue",
                            type:"dashed",
                            curveness:0.5
                        }
                    },
                    data:[{
                        type:'average',
                        symbol:"circle"
                    },{
                        type:'average',
                        symbol:"circle"
                    }],
                    symbol: ['circle', 'circle']
                }
            },{
                type:"bar",
                name:"macd",
                xAxisIndex:2,
                yAxisIndex:2,
                data:barData,
                barWidth:1,
                itemStyle: {
                    normal: {
                        color: function(params) {
                            var colorList;
                            if (params.data >= 0) {
                                colorList = '#ef232a';
                            } else {
                                colorList = '#14b143';
                            }
                            return colorList;
                        },
                    }
                }
                // markLine:{
                //     label:{
                //         normal:{
                //             position:'middel',
                //             formatter:function(params){
                //                 // console.log(params)
                //             }
                //         }
                //     },
                //     lineStyle:{
                //         normal:{
                //             color:"blue",
                //             type:"dashed",
                //             curveness:0.5
                //         }
                //     },
                //     data:[{
                //         type:'average',
                //         symbol:"none"
                //     },{
                //         type:'average',
                //         symbol:"none"
                //     }]
                // }
            }
        ]
    };
    myChart.setOption(option);
});