;(function($,window,document,undefined){
    // tab切换插件
    $.fn.toggleLi = function(options,params){
        options = $.extend({},$.fn.toggleLi.defaults,options || {});
        
        var $this = $(this);
        var opt = $("<ul class='clearfix' id='tab'></ul>");

        initLi(opt,options);

        $this.prepend(opt);
        var index = 0;
        $("ul li").on("click",function(event){
            $("ul li").removeClass("active");
            $(this).addClass("active");
            index = $(this).index();

            // 不同地方调用  执行的函数内容不同
            tabLi(index);
        });
    };
    function initLi($el,opt){
        var $li;
        $.each(opt.data,function(i,item){
            $li = $("<li></li>");
            $li.css({"width":opt.width,"height":opt.lineHeight,"line-height":opt.lineHeight,"border-bottom":opt.borderB,"float":"left"});
            if(i==0){
                $li.addClass("active");
            }
            var $a = $("<a></a>");
            // $a.attr({"href":item.href});
            $a.text(item.name);
            $li.append($a);
            $($el).append($li);
        });
    }
    $.fn.toggleLi.defaults = {
        data:[{name:""}],
        lineHeight:"40px",
        width:"70px",
        borderB:"0"
    };
    $.fn.showList = function(options,params){                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
        options = $.extend({},$.fn.showList.defaults,options);
        $this = $(this);
        $this.html("<h1>"+options.title+"</h1>");
        var htmlStr = '<ul class="clearfix"><li class="zdf-list-one"><ul class="clearfix zdf-list-title">';
        for(let i=0;i<options.dataTit;i++){
            htmlStr += '<li>'+options.dataTit[i].liTilt+'</li>';
        }
        htmlStr += '</ul></li>';
        htmlStr += '<li class="zdf-list-one zdf-list-detail"><ul class="clearfix">';
        for(let i=0;i<options.data;i++){
            htmlStr += '<li>'+options.data[i].list+'</li>';
        }
        htmlStr += '</ul>';
        $this.append(htmlStr);
    };
})(jQuery, window, document);