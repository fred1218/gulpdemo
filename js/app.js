alert(111);
var App = function (config, time_ruler, sdata) {
    var _app = this; //转移this上下文
    _app.inHall = null; //当前在哪个大厅上
    _app.tempData = null; //临时存储的数据
    _app.screeningData = sdata; //所有场次数据
    _app.whichType = null; //增加场次的方法.移动还是创建//move,create

    var subtract_left = $('.hall_films_list').position().left, //加1是因为有hall_name的1px边框在
        subtract_top = $('.film_arrange').position().top + $('#arrangeHeader').height();
    var time_ruler_opt = time_ruler.oriConfig;

    time_ruler.drawRuler(function (marginLeft) {
        var _startLeft = marginLeft + subtract_left - 1; //
        $('#system_time').css('left', _startLeft).show();
        setInterval(function () {
            _startLeft += time_ruler_opt.space / time_ruler_opt.per_pix;
            $('#system_time').css('left', _startLeft);
        }, 1000 * 60 * time_ruler_opt.space);
    });


    //调用事件生成器
    var ee = new EventProxy();

    var _moveFilmBoxDef = {
            trigger: '.filmRes', //触犯显示moveFilm的选择器
            $el: $('#move_film'), //moveFilm这个jq对象
            step: 1, //歩进多少[1-5]
            onFilmsResSelected: null, //当选中电影资源的时候
            funcSwitch: false,
            process_create_cc: false, //创建场次的过程
            isOpen: false, //是否已打开
            withTimeArea: true, //是否实时显示拖拽时间
            width: 0, //设置的宽度
            originPos: null, //初始位置
            currentPos: null, //当前位置
            _data: null, //move的电影的数据
        }, //移动电影设置

        _ccBlockDef = {
            trigger: '.filmInfo_area' //模块选择权
        },
        _paiqiDef = {
            container: '#container',
            editable: true, //排期控件是否可编辑
            canbeMoved: null, //根据checkData去后端查询当前场次是否可以被移动【给后端调用】
            canDrop: null, //需要置放的时间给后端校验是否可以置放
            generatePlanCode: null, //选择电影资源的时候生成planCode,确保唯一性
            afterPositionChanged: null, //位置发生变化的时候需要入库，不写这个就在最后的时候入库
            deleteSomeChangci: null, //删除某场次
            stopSaleChangci: null, //停止销售某场次
            showX: false, //显示x轴[辅助用]
            showY2: false, //显示y2轴[辅助用]
            _lcState: {
                state: false,
                whichHall: null,
                _lcData: []
            } //连场临时数据，取消连场时清空
        };

    var paiqi = $.extend(true, {}, _paiqiDef, config.paiqi);
    var _container_offset = $(paiqi.container).offset(),
        container_left = _container_offset.left,
        container_top = _container_offset.top;

    (function () {
        var posArr = [],
            $halls = $('.hall_films_list');
        for (var i = 0; i < $halls.length; i++) {
            var $hallRange = $halls.eq(i).closest('.hall_arrange');
            var hall_id = $halls.eq(i).attr('id');
            var pos = $halls.eq(i).position();
            var _obj = {};
            _obj.hall_id = hall_id;
            var _s = subtract_top + $hallRange.position().top,
                _e = _s + $halls.eq(i).height();
            _obj.hall_scope = [_s, _e];
            posArr.push(_obj);
        }
        this.HallsRelativePosArr = posArr;
    })();


    //扩展配置
    var ccBlockParam = $.extend(true, {}, _ccBlockDef, config.screening);
    var moveFilmParam = {};

    //设置一些配置的缓存变量
    initMovingSetting();
    _initOperateScreeningCache();

    $(document).on('mouseover', '.filmInfo_area ul>li', function () {
        $(this).css({
            "background-size": "100% 100%"
        })
    });
    $(document).on('mouseout', '.filmInfo_area ul>li', function () {
        $(this).css({
            "background-size": "80% 80%"
        })
    });


    $(window).on({
        'mousemove': function (ev) {
            //移动moveFilmBox
            if (moveFilmParam.funcSwitch) {
                var _tmp_left = ev.pageX - 1; //鼠标位置减去2px
                var _space = moveFilmParam.step / time_ruler_opt.per_pix;
                if (_tmp_left % _space === 0) {
                    _moveFilmBox(ev.pageX, ev.pageY);
                }
            }
        },
        "keydown": function (ev) {
            if (ev.keyCode == 17) {
                if (!paiqi._lcState.state) {
                    paiqi._lcState.state = true;
                    paiqi._lcState.whichHall = null;
                    paiqi._lcState._lcData = [];
                }
            }
        },
        "keyup": function (ev) {
            if (ev.keyCode == 17) {
                ee.trigger('cancel_set_lianchang', []);
            }
        }
    });

    /**
     *选中电影资源的操作
     */
    $('.arrangeFilmlist').on('click', moveFilmParam.trigger, function (ev) {
        ev.stopPropagation();
        var _data = null;

        function transforData(data) {
            _data = data;
        }

        if (paiqi.editable) {
            moveFilmParam.onFilmsResSelected(ev.target, transforData);

            moveFilmParam.$el.stop(true, true);
            _app.tempData = _data;
            _app.whichType = 'create';
            moveFilmParam.funcSwitch = true;
            drawMoveFilmBox([ev.pageX, ev.pageY]);
        }
    });


    /**
     * 选中电影资源时画出moveFilmBox
     * @param {Object} pos 画moveFilmBox的位置
     */
    function drawMoveFilmBox(pos) {
        var data = _app.tempData;
        var $mfbox = $('#move_film');
        var html = renderContentByTpl('tpl_move_film', data);
        $mfbox.html(html);
        var _width = data['duration'] / time_ruler_opt.per_pix;
        $mfbox.width(_width);
        //TODO 暂无用 状态改为正在创建场次
        moveFilmParam.process_create_cc = true;
        moveFilmParam.width = _width;
        _moveFilmBox(pos[0], pos[1]);
    }

    /**
     * 释放拖拽电影盒子
     */
    function hideMoveFilmBox() {
        hideCoords();
        moveFilmParam.funcSwitch = false;
        var _l = moveFilmParam.originPos[0],
            _t = moveFilmParam.originPos[1],
            _$el = moveFilmParam.$el;
        initMovingSetting();
        _$el.animate({
            left: _l,
            top: _t,
            opacity: 0.1
        }, 400, function () {
            _$el.empty();
        });
    }

    function _moveFilmBox(x, y) {
        var $mfbox = $('#move_film');
        var _width = moveFilmParam.width,
            _left = x - _width / 2 - container_left + 1, //需加1px
            _top = (y - parseInt($mfbox.height(), 10) / 2 - container_top);

        $mfbox.css({
            "left": _left,
            "top": _top,
            "opacity": 1
        });

        if (!moveFilmParam.isOpen) {
            $mfbox.show();
            moveFilmParam.originPos = [_left, _top];
            moveFilmParam.currentPos = [_left, _top];
            moveFilmParam.isOpen = true;
        } else {
            moveFilmParam.currentPos = [_left, _top];
        }

        ee.trigger('show_ycoord', moveFilmParam.currentPos, [x, y])
    }

    /**
     *单击场次模块的时候的设置和单击moveFilmBox的时候
     */
    $(paiqi.container).on({
        'mousemove': function (ev) {
            if (ccBlockParam._operate_which.$el) {
                if (ccBlockParam._operate_which.inBack) {
                    //返回中不做任何事情
                } else {
                    var _ori = ccBlockParam._operate_which._mouseOri,
                        _elOri = ccBlockParam._operate_which._elOri;

                    var $el = ccBlockParam._operate_which.$el;
                    var sub_x = ev.pageX - _ori[0],
                        sub_y = ev.pageY - _ori[1],
                        _x = _elOri[0] + sub_x,
                        _y = _elOri[1] + sub_y;

                    ee.trigger('changci_move', [_x, _y], [ev.pageX, ev.pageY]);
                }
            }
        },
        'mousedown': function (ev) {
            if (ev.which === 3) {
                if (moveFilmParam.funcSwitch) {
                    hideMoveFilmBox();
                    moveFilmParam.funcSwitch = false;
                }

            } else {
                var $t = $(ev.target),
                    $filmArea = $t.closest('.filmInfo_area');
                if ($filmArea.length > 0) {
                    if ($t.hasClass('f_handle') || $t.hasClass('f_del') || $t.hasClass('f_mod')) {
                        ev.stopPropagation();
                        var planCode = $t.closest('.filmInfo_area').attr('data-plancode');
                        if ($t.hasClass('f_mod')) {
                            //场次中的操作
                            var el = document.getElementById("changciOpDia");
                            var d = dialog({
                                width: 400,
                                title: '编辑场次' + planCode,
                                quickClose: false,
                                content: el,
                                okValue: '保存',
                                ok: function () {
                                    this.statusbar('保存' + planCode + '成功!');
                                    return false;
                                },
                                cancelValue: '关闭',
                                cancel: true, //开启弹窗的关闭功能的两个按钮
                                cancelDisplay: true, //显示默认的取消按钮
                            });
                            d.showModal();
                        } else if ($t.hasClass('f_del')) {
                            function doDeleteChangci(result) {
                                if (result) {
                                    ee.trigger('delete_changci_by_plancode', $filmArea, planCode);
                                } else {
                                    notie.alert(3, '删除失败', 2);
                                }
                            }

                            notie.confirm('是否删除场次' + planCode + '?', 'Yes', 'Cancel', function () {
                                paiqi.deleteSomeChangci(planCode, doDeleteChangci);
                            });

                        } else if ($t.hasClass('f_handle')) {
                            function doStopSaleChangci(result) {
                                if (result) {
                                    ee.trigger('sale_stop_changciby_plancode_or_screenData', $filmArea, planCode);
                                } else {
                                    notie.alert(3, '停售失败', 2);
                                }
                            }

                            notie.confirm('是否停售场次' + planCode + '?', 'Yes', 'Cancel', function () {
                                paiqi.stopSaleChangci(planCode, doStopSaleChangci);

                            });
                        }

                    } else {
                        if (paiqi._lcState.state) {
                            var $el_area_changci = $t.closest('.filmInfo_area');
                            ee.trigger('set_lianchang', $el_area_changci);
                        } else {
                            if (ccBlockParam._operate_which.$el) {
                                hideCoords();
                                ccBlockParam._operate_which.$el.stop(true, true);
                            } else {
                                var $cur_el = $t.closest('.filmInfo_area'),
                                    $hall = $cur_el.closest('.hall_films_list');

                                var _hallCode = $cur_el.attr('data-hallid'),
                                    _planCode = $cur_el.attr('data-plancode');

                                var _hsIdx = _.findIndex(_app.screeningData['changcis'], {
                                    "hallCode": _hallCode.substring(5) //hall_
                                });
                                var hall_screen_data = _app.screeningData.changcis[_hsIdx]['screening'];
                                var _scIdx = _.findIndex(hall_screen_data, {
                                    "planCode": _planCode
                                });

                                var data = hall_screen_data[_scIdx];

                                /**
                                 * 执行移动场次
                                 * @param {Object} isMovable 后端给的验证是否可以移动
                                 */
                                function initChangciBlockToMove(isMovable) {
                                    ccBlockParam._operate_which.isMovable = isMovable;
                                    if (isMovable) {
                                        _app.tempData = _.clone(data);
                                        _app.whichType = 'move';
                                        var _pos = $($cur_el).position();
                                        ccBlockParam._operate_which.$el = $cur_el;
                                        ccBlockParam._operate_which.$origiHall = $hall;
                                        ccBlockParam._operate_which.originPos = _pos;
                                        ccBlockParam._operate_which._mouseOri = [ev.pageX, ev.pageY];
                                        ccBlockParam._operate_which.originData = _.clone(data);

                                        var posLeft = _pos.left,
                                            posTop = _pos.top;

                                        var parTop = $cur_el.closest('.hall_arrange').position().top,
                                            _scrollTop = $('#layoutScroll').scrollTop(),
                                            _scrollLeft = $('#operatePanel').scrollLeft();

                                        var _yleft = posLeft + subtract_left - _scrollLeft,
                                            _ytop = posTop + subtract_top + parTop - _scrollTop;
                                        ccBlockParam._operate_which._elOri = [_yleft + 1, _ytop + 1];

                                        ee.trigger('changci_move', ccBlockParam._operate_which._elOri, [ev.pageX, ev.pageY]);
                                    }
                                }

                                paiqi.canbeMoved(initChangciBlockToMove, data);
                            }
                        }
                    }


                } else if (moveFilmParam.funcSwitch) {
                    function doDropFunc(canDrop) {
                        if (canDrop) {
                            //将数据的clone进行创建场次
                            ee.trigger('create_changci', [_.clone(_app.tempData), hallCode]);
                        } else {
                            moveToOriPos();
                        }
                    }

                    function moveToOriPos() {
                        console.debug('不能置放');
                        moveFilmParam.$el.css({
                            'box-shadow': 'red 0 0 8px',
                            'background': 'red'
                        });
                        setTimeout(function () {
                            moveFilmParam.$el.css({
                                'box-shadow': '0 0 4px #333',
                                'background': '#5FCBFA'
                            });
                        }, 200);
                    }

                    var hallCode = _app.inHall;
                    if (hallCode) {
                        var _hsIdx = _.findIndex(_app.screeningData.changcis, {
                            "hallCode": hallCode.substring(5) //hall_
                        });
                        var hall_screen_data = _app.screeningData.changcis[_hsIdx];
                        paiqi.canDrop(doDropFunc, hall_screen_data, _app.tempData);
                    } else {
                        moveToOriPos();
                    }


                }
            }
        },
        'mouseup': function (ev) {
            //只要鼠标up，并且是场次可拖拽的时候，才计算重新落地
            if (ccBlockParam._operate_which.isMovable && ccBlockParam._operate_which.$el) {
                var hallCode = _app.inHall;
                if (hallCode) {
                    var old_hall_colde = ccBlockParam._operate_which.$el.attr('data-hallid');
                    var old_planCode = ccBlockParam._operate_which.$el.attr('data-plancode');
                    var old_hsIdx = _.findIndex(_app.screeningData.changcis, {
                        "hallCode": old_hall_colde.substring(5)
                    });

                    var sIdx = _.findIndex(_app.screeningData.changcis[old_hsIdx].screening, {
                        "planCode": old_planCode
                    });
                    //先将老场次删除
                    var oldchangciData = _app.screeningData.changcis[old_hsIdx].screening.splice(sIdx, 1);

                    var _hsIdx = _.findIndex(_app.screeningData.changcis, {
                        "hallCode": hallCode.substring(5) //hall_
                    });
                    var hall_screen_data = _app.screeningData.changcis[_hsIdx];
                    paiqi.canDrop(doDropFunc, hall_screen_data, _app.tempData);
                } else {
                    backToOriPos();
                }
                hideCoords();
            }

            function backToOriPos() {
                ccBlockParam._operate_which.inBack = true; //返回中
                var _elPos = ccBlockParam._operate_which._elOri;
                var oriPos = ccBlockParam._operate_which.originPos;
                var $el = ccBlockParam._operate_which.$el,
                    $hall = ccBlockParam._operate_which.$origiHall;
                $el.animate({
                    left: _elPos[0],
                    top: _elPos[1]
                }, 200, function () {
                    $el.css(oriPos).appendTo($hall);
                    _initOperateScreeningCache();
                });
            }

            function doDropFunc(canDrop) {
                if (canDrop) {
                    ee.trigger('create_changci', [_.clone(_app.tempData), hallCode]);
                    _initOperateScreeningCache();
                } else {
                    console.log('待还原的数据：', ccBlockParam._operate_which.originData, oldchangciData[0], '两个效果一样');
                    _app.screeningData.changcis[old_hsIdx].screening.push(ccBlockParam._operate_which.originData);
                    backToOriPos();
                }
            }
        }
    });


    /**
     * 检测是否在影厅设置之上
     * @param {Object} pos 鼠标位置
     */
    function checkIfInHall(pos) {
        //		console.debug('[暂时没用到鼠标位置]检测当前鼠标的位置在：', pos);
        var _scrollTop = $('#layoutScroll').scrollTop();
        var hallsTop = subtract_top; //影厅的位置
        var x_pos = $('#x_coord').position(),
            y_pos = $('#y_coord').position(),
            y2_pos = $('#y2_coord').position(),
            x_posTop = x_pos.top + _scrollTop; //有滚轴相当于鼠标下滑

        //在这个范围之内，才可以进行放置算法
        if (x_pos.top >= hallsTop && (y_pos.left >= subtract_left && y2_pos.left <= $(time_ruler.rulerEl).width() + subtract_left)) {
            var hallsScope = this.HallsRelativePosArr;
            var _arr = _.pluck(hallsScope, 'hall_scope');
            var _hallIds = _.pluck(hallsScope, 'hall_id');
            var _tmpArr = _.flatten(_arr);
            var _idx = _.sortedIndex(_tmpArr, x_posTop);
            if (_idx % 2 !== 0) {
                var _which = (_idx + 1) / 2 - 1;
                $('.hall_films_list').removeClass('active');
                $('#' + _hallIds[_which]).addClass('active');
                _app.inHall = _hallIds[_which];
            } else {
                _app.inHall = null;
                $('.hall_films_list').removeClass('active');
            }

        } else {
            _app.inHall = null;
            $('.hall_films_list').removeClass('active');
        }
    }

    //场次移动的事件
    ee.on('changci_move', function (pos, mousePos) {
        var $el = ccBlockParam._operate_which.$el;
        //被拖拽的元素新定位
        $el.insertAfter($('#time_area')).css({
            left: pos[0],
            top: pos[1]
        });

        ee.trigger('show_ycoord', [pos[0] - 1, pos[1]], mousePos);
    });


    /**
     *隐藏坐标 时要做很多事
     */
    function hideCoords() {
        //隐藏坐标就清空在哪个厅的值
        _app.inHall = null;
        _app.tempData = null;
        _app.whichType = null;
        $('.hall_films_list').removeClass('active');
        $('#y_coord').hide();
        $('#y2_coord').hide();
        $('#x_coord').hide();
        $('#time_area').hide();
    }

    /**
     *显示Y轴,要考虑滚轴出现的情况
     * 所有的便宜除了container内部的，还要考虑到container相对document便宜的，因为鼠标就是相对于document便宜的
     */
    ee.on('show_ycoord', function (pos, mousePos) {
        var dis = pos[0];
        if (time_ruler) {
            $('#y_coord').css({
                'left': dis
            }).show();
            $('#y2_coord').css({
                'left': dis + _app.tempData['duration'] / time_ruler_opt.per_pix
            }).show();
            if (paiqi.showY2) {
                $('#y2_coord').width(1);
            }
            $('#x_coord').css({
                'top': mousePos[1] - container_top
            }).show();
            if (paiqi.showX) {
                $('#x_coord').height(1);
            }

            var _left = dis - subtract_left;
            var _inScope = false;
            if (_left < 0) {
                _inScope = false;
            } else {
                _inScope = true;
                var _scrollLeft = $('#operatePanel').scrollLeft();
                var d = time_ruler.getCurrentTime(_left + _scrollLeft);
                $('#time_area').text(d.format('YYYY-MM-DD HH:mm'));
                _app.tempData.beginTime = d.format('YYYY-MM-DD HH:mm');
                _app.tempData.endTime = d.add(_app.tempData.duration, "m").format('YYYY-MM-DD HH:mm');
            }
            if (_inScope && moveFilmParam.withTimeArea) {
                $('#time_area').css({
                    'left': dis,
                    'top': pos[1] - 20
                }).show();
            } else {
                $('#time_area').hide();
            }
            checkIfInHall(mousePos);
        }
    })

    /**
     *生成场次,TODO 注意planCode如何生成！
     */
    ee.on('create_changci', function (dataArr) {
        var scrData = dataArr[0],
            hallCode = dataArr[1];

        var type = _app.whichType;
        var _scrollLeft = $('#operatePanel').scrollLeft();
        var _left = $('#y_coord').position().left - subtract_left + _scrollLeft;
        //可放入场次的影厅在数组中的索引
        var _hsIdx = _.findIndex(_app.screeningData.changcis, {
            "hallCode": hallCode.substring(5) //hall_
        });
        var hall_screen_data = _app.screeningData.changcis[_hsIdx].screening;
        if (type == 'create') {
            scrData.hallCode = hallCode.substring(5);
            readTemplate('tpls/create_screening.html').done(function (renderFunc) {
                if (paiqi.generatePlanCode && $.isFunction(paiqi.generatePlanCode)) {
                    //防止客户端修改别的数据
                    var _tmp_data = _.clone(scrData);
                    paiqi.generatePlanCode(_tmp_data);
                    scrData.planCode = _tmp_data.planCode;
                    _tmp_data = null;
                    var html = renderFunc(scrData);
                    $(html).css('left', _left).appendTo("#" + hallCode);
                    hall_screen_data.push(scrData);
                    if (paiqi.afterPositionChanged && $.isFunction(paiqi.afterPositionChanged)) {
                        var newScreeningInfo = {
                            hallCode: hallCode.substring(5),
                            screeningData: scrData
                        };
                        paiqi.afterPositionChanged('create', newScreeningInfo);
                    }
                } else {
                    $.error('新的场次的plancode需要规则生成！');
                }

            })
        } else {
            var old_hall_colde = ccBlockParam._operate_which.$el.attr('data-hallid');
            var old_planCode = ccBlockParam._operate_which.$el.attr('data-plancode');
            var old_hsIdx = _.findIndex(_app.screeningData.changcis, {
                "hallCode": old_hall_colde.substring(5)
            });

            var sIdx = _.findIndex(_app.screeningData.changcis[old_hsIdx].screening, {
                "planCode": old_planCode
            });


            ccBlockParam._operate_which.$el.attr('data-hallid', hallCode);
            ccBlockParam._operate_which.$el.attr('data-begintime', scrData.beginTime);
            ccBlockParam._operate_which.$el.attr('data-endtime', scrData.endTime);

            ccBlockParam._operate_which.$el.appendTo("#" + hallCode).css({
                'left': _left,
                'top': 2
            });


            hall_screen_data.push(scrData);
            if (paiqi.afterPositionChanged && $.isFunction(paiqi.afterPositionChanged)) {
                var newScreeningInfo = {
                    hallCode: hallCode.substring(5),
                    screeningData: scrData
                };
                paiqi.afterPositionChanged('update', newScreeningInfo);
            }
        }
    });

    /**
     *设置连场,连场是数据的合并，起始时间只有一个，合并算的，已经设置过连场的不能再次设置
     */
    ee.on('set_lianchang', function ($el) {

        if (!$el.hasClass('lc_state') && $el.hasClass('unsubmit') && $el.attr('data-joinflag') == 'false') {
            var _hallid = paiqi._lcState.whichHall,
                hallId = $el.attr('data-hallid');
            if ((_hallid === hallId) || !_hallid) {
                $el.addClass('lc_state');
                var plancode = $el.attr('data-plancode');
                paiqi._lcState.whichHall = hallId;
                paiqi._lcState._lcData.push(plancode);
            }
        } else if ($el.hasClass('lc_state')) {
            var plancode = $el.attr('data-plancode');
            ee.trigger('cancel_set_lianchang', plancode);
        }
    });
    /**
     * 创建连场蒙板
     */
    ee.on('create_lianchang', function (lcData, hallCode) {
        readTemplate('tpls/create_lianchang.html').done(function (renderFunc) {
            var tmpData = _.clone(lcData);
            tmpData.hallCode = hallCode;
            var html = renderFunc(tmpData);
            $('#hall_' + hallCode).prepend(html);
            var _hsIdx = _.findIndex(_app.screeningData.changcis, {
                "hallCode": hallCode
            });
            //数据上的增加
            var _lcArr = _app.screeningData.changcis[_hsIdx]['lcData'];
            if (!_lcArr) {
                _lcArr = [];
            }
            _lcArr.push(lcData);
        })
    });
    /**
     * 移除已设置连场
     */
    ee.on('remove_lianchang', function (joinid, hallCode, $el) {

        if ($el) {
            $el.remove();
        } else {
            $('.filmInfo_area_mask[data-joinid="' + joinid + '"]').remove();
        }
        var screenings = _getScreeningByhallId(hallCode);

        //数据上的移除
        var _hsIdx = _.findIndex(_app.screeningData.changcis, {
            "hallCode": hallCode
        });

        var _lcArr = _app.screeningData.changcis[_hsIdx]['lcData'];
        var _lcIdx = _.findIndex(_lcArr, {
            "joinid": joinid
        });

        //连场上对应的场次数据也转换
        var selectedPlancodes = _lcArr[_lcIdx]["selectedPlanCodes"];
        _.each(selectedPlancodes, function (pc, i) {
            var _idx = _.findIndex(screenings, {
                "planCode": pc
            });
            var eachCC = screenings[_idx];

            eachCC["joinflag"] = "false";
            delete eachCC["joinid"];
            var tmpData = _.clone(eachCC);
            tmpData.hallCode = hallCode;
            ee.trigger('redraw_filmArea', tmpData, function (html) {
                $('.filmInfo_area[data-plancode="' + tmpData.planCode + '"]').replaceWith(html);
            });
        });

        _lcArr.splice(_lcIdx, 1);
    });


    /**
     *取消连场设置,清空缓存操作数据
     */
    ee.on('cancel_set_lianchang', function (which) {
        if (!which || which.length < 1) {
            for (var i = 0; i < paiqi._lcState._lcData.length; i++) {
                $('.filmInfo_area[data-plancode=' + paiqi._lcState._lcData[i] + ']').removeClass('lc_state');
            }
            paiqi._lcState = {};
        } else {
            $('.filmInfo_area[data-plancode=' + which + ']').removeClass('lc_state');
            var _idx = _.indexOf(paiqi._lcState._lcData, which);
            paiqi._lcState._lcData.splice(_idx, 1);
        }

    });

    /**
     * 根据planCode或者场次删除当前场次
     */
    ee.on('delete_changci_by_plancode', function ($filmArea, param) {
        //planCode
        var hallId = $filmArea.attr('data-hallid').substring(5);
        var screening = _getScreeningByhallId(hallId);
        var _idx = _.findIndex(screening, {
            "planCode": param
        });
        screening.splice(_idx, 1); //删除当前场次
        $filmArea.remove();
        notie.alert(1, '删除成功', 2);
    });
    /**
     * 停售某场次
     */
    ee.on('sale_stop_changciby_plancode_or_screenData', function ($filmArea, planCode) {
        $filmArea.removeClass('salecheck').addClass('salestop');
        var hallId = $filmArea.attr('data-hallid').substring(5);
        var screening = _getScreeningByhallId(hallId);
        var _idx = _.findIndex(screening, {
            "planCode": planCode
        });

        var _data = screening[_idx];
        _data.status = "salestop";
        var tmpData = _.clone(_data);
        tmpData.hallCode = hallId;
        ee.trigger('redraw_filmArea', tmpData, function (html) {
            $filmArea.replaceWith(html);
            notie.alert(3, planCode + '已停售', 2);
            tmpData = null;
        })

    });
    /**
     * 重绘场次模块,根据数据重绘，返回html，
     */
    ee.on('redraw_filmArea', function (newData, callback) {
        readTemplate('tpls/create_screening.html').done(function (renderFunc) {
            var html = renderFunc(newData);
            callback(html);
        });
    });


    /**
     *注册鼠标滑轮事件
     */
    $('#move_film').on('mousewheel', function (ev) {
        ev.preventDefault();
        if (ev.deltaY > 0) {
            document.getElementById('layoutScroll').scrollTop -= 30;
        } else {
            document.getElementById('layoutScroll').scrollTop += 30;
        }
    });

    /**
     * 根据关键词获得数组，数据为当前操作的场次数据
     * @param hallId
     * @param keyWord
     * @private
     */
    function _getArrayByKeyWord(hallId, keyWord) {
        var screening = _getScreeningByhallId(hallId);
        var returnArr = _.pluck(screening, keyWord);
        return returnArr;
    }

    /**
     * 根据hallId获得场次数据
     * @param hallId
     * @returns {*}
     * @private
     */
    function _getScreeningByhallId(hallId) {
        var _hsIdx = _.findIndex(_app.screeningData.changcis, {
            "hallCode": hallId
        });
        var screening = _app.screeningData.changcis[_hsIdx]['screening'];
        return screening;
    }

    /**
     * 校验是否能进行连场设置
     * @param hallId 影厅
     * @param selectedData 所选的数据
     */
    function checkIfCanBeSelected(hallId, selectedData) {
        var beginTimeArrs = _getArrayByKeyWord(hallId, 'beginTime');
        var beginTimeArrSorted = _.sortBy(beginTimeArrs, function (v) {
            return moment(v);
        });
        var screening = _getScreeningByhallId(hallId);

        var selectedArr = _.map(selectedData, function (plancode) {
            var _idx = _.findIndex(screening, {
                "planCode": plancode
            });
            return screening[_idx];
        });

        var _timeArr = _.pluck(selectedArr, 'beginTime');
        var _timeArrSorted = _.sortBy(_timeArr, function (v) {
            return moment(v);
        });
        //算第一个起始元素在原数组中的位置
        var startIdx = beginTimeArrSorted.indexOf(_timeArrSorted[0]);
        var result = true;
        for (var i = 0; i < _timeArrSorted.length; i++) {
            if (beginTimeArrSorted[startIdx + i] !== _timeArrSorted[i]) {
                result = false;
                break;
            }
        }
        return result;
    }

    //------>初始化配置的一些方法

    function initMovingSetting() {
        moveFilmParam = $.extend(true, {}, _moveFilmBoxDef, config.moveFilmBox);
    }

    function _initOperateScreeningCache() {
        ccBlockParam._operate_which = {
            inBack: null, //正在返回
            _mouseOri: null, //鼠标原位置，计算移动距离
            _elOri: null, //当前元素原来的坐标
            isMovable: false,
            $el: null, //当前操作元素
            $origiHall: null,
            originPos: null, //原在影厅中的坐标
            dropPos: null, //将要释放的坐标
            originData: null, //被操作的数据
        };
    }


    this.show_edit = function () {
        paiqi.editable = true;
        $('#ban_edit').hide();
    };
    this.band_edit = function () {
        if (!paiqi.editable) {
            $('#ban_edit').show();
        }
    };
    //设置拖拽的步进分钟数
    this.setStep = function (num) {
        moveFilmParam.step = num;
    };
    //返回全局的screening数据
    this.getScreeningData = function () {
        return _app.screeningData;
    };
    //获得连场设置数据
    this.getLCData = function () {
        //TODO 检测是否是合格的连场设置,将校验规则放在取数据的地方
        var returnData = {};
        if (paiqi._lcState.state) {
            var hallid = paiqi._lcState.whichHall;
            if (paiqi._lcState._lcData && paiqi._lcState._lcData.length > 1) {
                var canSet = checkIfCanBeSelected(hallid.substring(5), paiqi._lcState._lcData);
                if (canSet) {
                    returnData.whichHall = hallid.substring(5);
                    returnData._lcData = paiqi._lcState._lcData;
                    return returnData;
                }
            }
        }
        return null;
    };
    this.removeLianChang = function (isSuccessful, joinid, $el) {
        if (isSuccessful) {
            var hallCode = $el.attr('data-hallid').substring(5);
            ee.trigger('remove_lianchang', joinid, hallCode, $el);
        }
    }
    /**
     * 根据连场是否设置成功进行操作；删除数据等
     * @param isSuccessful
     */
    this.setLianChang = function (isSuccessful, stData, joinid) {
        if (isSuccessful) {
            var hallId = stData.whichHall,
                selectedData = stData._lcData;
            var screening = _getScreeningByhallId(hallId);
            var selectedArr = _.map(selectedData, function (plancode) {
                var _idx = _.findIndex(screening, {
                    "planCode": plancode
                });
                return screening[_idx];
            });
            var obj = {
                hallId: hallId,
                screenings: selectedArr
            };
            //screening数据上的操作
            _.each(obj.screenings, function (v, i) {
                v["joinflag"] = "true";
                v["joinid"] = joinid;
                var tmpData = _.clone(v);
                tmpData.hallCode = hallId;
                ee.trigger('redraw_filmArea', tmpData, function (html) {
                    $('.filmInfo_area[data-plancode="' + tmpData.planCode + '"]').replaceWith(html);
                });
            });

            //连场数据上的操作
            var sortedArr = _.sortBy(obj.screenings, function (v) {
                    return moment(v.beginTime);
                }),
                _len = sortedArr.length;
            var _tmp = {
                joinid: joinid,
                beginTime: sortedArr[0].beginTime,
                endTime: sortedArr[_len - 1].endTime,
                selectedPlanCodes: selectedData
            }
            ee.trigger('create_lianchang', _tmp, obj.hallId);
        }
    };

    this.setNewScreeningData = function (data) {
        //可能需要设置新增场次临时数据的其他属性
        $.extend(true, _app.tempData, data);
    };

}