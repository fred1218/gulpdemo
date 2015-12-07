/**ceshi!
 * 对时间轴相关的操作
 * @param {Object} time_ruler_opt
 */
var TimeRuler = function(time_ruler_opt) {
	this.oriConfig = time_ruler_opt;
	this.rulerEl = time_ruler_opt.rulerEl;
	this.start = time_ruler_opt.start ? time_ruler_opt.start : 6; //从几点开始
	this.total = 24; //一共显示(static)24小时
	this.systemDate = time_ruler_opt.systemDate ? time_ruler_opt.systemDate : new Date; //显示系统时间轴
	this.space = time_ruler_opt.space ? time_ruler_opt.space : 10;
	this.perPix = time_ruler_opt.per_pix ? time_ruler_opt.per_pix : 1; //1px是1分钟
	this.queryDate = time_ruler_opt.queryDate ? time_ruler_opt.queryDate : moment().format('YYYY-MM-DD'); //传入的开始日期

	this.startDate = null; //算出来的开始时间
	this.endDate = null; //算出来的结束时间

	var qd = moment(this.queryDate);

	this.startDate = qd.clone();

	this.startDate.hours(this.start); //日期不变，起始时间变成this.start
	this.endDate = this.startDate.clone();
	this.endDate.add(1, 'days');
}

/**
 * left:90px的时候是start点整，起始点
 * 根据系统时间和起始时间算出间距传给#system_time
 * @param {Object} callback
 */
TimeRuler.prototype.drawRuler = function(callback) {

	var totalMins = 60 * this.total;
	var total_length = totalMins / this.perPix; //24小时占多宽
	$(this.rulerEl).css('width', total_length);
	var ruler_html = "";
	var _tpm_start = this.start,
		_tmp_show = 0;
	for (var i = 0; i <= total_length; i++) {
		var _tmpMins = i * this.perPix;
		if (_tmpMins == 0) {
			ruler_html += '<div class="first_line"></div>';
		} else if (_tmpMins % this.space == 0) {
			//每半个小时1中线
			if (_tmpMins % 30 == 0) {
				//每1个小时1长线
				if (_tmpMins % 60 == 0) {
					_tpm_start++;
					if (_tpm_start >= 24) {
						if (_tpm_start == 24) {
							_tmp_show = this.endDate.format('MM-DD');
						} else {
							_tmp_show = _tpm_start - 24;
						}

					} else {
						_tmp_show = _tpm_start;
					}
					ruler_html += '<div class="long_line" style="margin-left: ' + i + 'px;"><p class="ruler_num ' + (typeof(_tmp_show) == 'string' ? 'ruler_date' : '') + '">' + _tmp_show + '</p></div>';

				} else {
					ruler_html += '<div class="middle_line" style="margin-left: ' + i + 'px;"></div>';
				}
			} else {
				ruler_html += '<div class="short_line" style="margin-left: ' + i + 'px;"></div>';
			}
		}
	}
	$(this.rulerEl).empty().html(ruler_html);
	var nowd = moment(this.systemDate);
	if (nowd.isBetween(this.startDate, this.endDate, "minute")) {
		var sub_mins = nowd.diff(this.startDate, 'minutes');
		callback(sub_mins / this.perPix);
	}
}

/**
 * 根据相对于时间轴的长度显示当前时间YYYY-MM-DD hh:mm
 * @param {Object} relativeLength
 * @param {Object} callback
 */
TimeRuler.prototype.getCurrentTime = function(relativeLength, callback) {
	var _total_mins = relativeLength * this.perPix;
	var _tmpMd = this.startDate.clone();
	_tmpMd.add(_total_mins, 'm');

	if (callback && $.isFunction(callback)) {
		callback(_tmpMd);
	}

	return _tmpMd;
}

/**
 * 根据传入时间算出距离起始点的distance是多少
 * @param {Object} paramTime
 */
TimeRuler.prototype.getRelativeLeft = function(paramTime) {
	var iTime = moment(paramTime);
	var sub_mins = iTime.diff(this.startDate, 'minutes');
	return sub_mins / this.perPix;



}