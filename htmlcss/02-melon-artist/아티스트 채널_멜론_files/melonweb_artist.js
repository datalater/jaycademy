/*!
 * @author 김승일
 * @email comahead@vi-nyl.com
 * @description 멜론 프레임웍
 */
;(function($, WEBSVC, PBPGN, undefined) {
	var Class = WEBSVC.Class,
		View = PBPGN.View;

	WEBSVC.define('PBPGN.Timeline', function() {
		/**
		 * 아티스트 상세 타임라인
		 * @class MELON.PBPGN.Timeline
		 * @extends MELON.PBPGN.View
		 */
		var Timeline = Class(/** @lends MELON.PBPGN.Timeline# */{
			$extend: View,
			name: 'timeline',
			defaults: {
				arrowHeight: 48,	// 40 + 8    : 아이콘의 사이즈
				boxTopMargin: 24	// 박스간의 간격
			},
			/**
			 * @constructor
			 */
			initialize: function(el, options) {
				var me = this;

				if(me.supr(el, options) === false) { return; }

				// 각 아이템이 배치될 위치(좌 or 우)를 결정할 때 기준이 되는 값 :
				// 좌우에 차례로 배치되면서 각 아이템의 top+height를 계속 더해간다.(좌측에 배치되면 left에, 우측에 배치되면 right에)
				me.measure = {
					left: 0,      // 왼쪽 높이
					center: 0,    // 가운데부분 높이
					right: 0      // 오른쪽부분 높이
				};

				// 배치 시작
				me.update();
			},
			/**
			 * 요소들을 배치
			 * @param {Integer} start 몇번째 항목부터 배치할 것인가...더보기를 했을 때, ajax로 가져온 항목들을 append한 후, 새로 append된 아이템부터 배치하기 위함
			 */
			update: function(start) {
				// 몇번째 항목부터 배치할 것인가...더보기를 했을 때, ajax로 가져온 항목들을 append한 후, 새로 append된 아이템부터 배치하기 위함
				// (이미 배치된 항목을 다시 배치할 필요는 없음)
				start = start || 0;

				var me = this,
					$items = me.$el.find('>ul>li').filter(function(i){ return i >= start; }),		// 새로 추가된 항목을 필터링
					items = [],
					measure = me.measure,
					ARROW_HEIGHT = me.options.arrowHeight,		// 아이콘의 높이
					BOX_TOP_MARGIN = me.options.boxTopMargin;	// 박스간의 간격

				// UI요소가 차지하는 화면상의 사이즈를 계산하기 위해선 display가 none이 아니어야 되므로,
				// 대신 visibility:hidden으로 해놓고, display:block으로 변경
				me.$el.css('visibility', 'hidden').show();
				if(start === 0) {
					// 첫항목부터 배치되어야 하는 경우, 배치값을 초기화.
					measure.left = measure.center = measure.right = 0;
				}

				// 각각 li 항목의 좌우위치와 높이, 그리고 그에따른 아이콘 위치를 계산해서 items에 담는다.(아직 배치전)
				$items.each(function(i){
					var $li = $(this),
						boxHeight = $li.show().height(),
						align, targetTopOffset, arrowTopOffset;

					align = (measure.left <= measure.right) ? 'left' : 'right';
					targetTopOffset = measure[align];
					arrowTopOffset = Math.max(measure.center - targetTopOffset, 0);

					items.push({
						$target: $li.hide(),		// 대상
						css: align,					// 위치
						top: targetTopOffset,		// top 위치
						arrowTop: arrowTopOffset	// 아이콘 위치
					});

					measure[align] += boxHeight + BOX_TOP_MARGIN;	// 좌측, 우측의 위치별로 최종 top를 저장(다음 항목의 top를 계산하기 위해)
					measure.center = targetTopOffset + arrowTopOffset + ARROW_HEIGHT;	// 중앙쪽에 최종 top를 저장(다음 항목의 top를 계산하기 위해)
				});

				// 위에서 계산 위치를 바탕으로 실제로 배치(top css)
				$.each(items, function(i, item){
					item.$target.removeClass('lc_left lc_right')
						.addClass('lc_'+item.css)		// 좌 or 우
						.css({'top': item.top})			// top 설정
						.fadeIn('slow')
						.find('div.wrap_icon').css({'top': item.arrowTop});	// 아이콘
				});

				// 가장밑에 배치된 항목을 기준으로 컨테이너 높이를 지정
				me.$el.css({'visibility': '', height: Math.max(measure.left, measure.right)});
				me.trigger('completed');	// 완료 이벤트를 발생
			}
		});

		WEBSVC.bindjQuery(Timeline, 'timeline');
		return Timeline;
	});


})(jQuery, MELON.WEBSVC, MELON.PBPGN);

$(function() {
	var WEBSVC = MELON.WEBSVC,
		addComma = WEBSVC.number.addComma;

	// 아티스트 좋아요 바인딩
	WEBSVC.ArtistList.init();

	// 상단 팬맺기: 좋아요 버튼의 마크업이 특이한 케이스인 경우, 별도 처리를 해주어야 됨(단, 서버호출 부분은 WEBSVC.ArtistList에 있는 걸 사용)
	$('button.btn_join_fan02').on('click', function(){
		/*if(!WEBSVC.Auth.isMelonLogin()){
			alert('로그인 후에 이용해 주세요.');
			return; // or login redirect
		}*/

		var $btn = $(this),
			isJoin = $btn.hasClass('on'), doJoin = !isJoin,
			artistNo = $btn.attr('data-artist-no'),
			defer;

		if(isJoin) {
			defer = WEBSVC.ArtistList.leave(artistNo);		// 팬끊기 서버 호출에 대한 결과
		} else {
			defer = WEBSVC.ArtistList.join(artistNo);		// 팬맺기 서버 호출에 대한 결과
		}

		defer.done(function(json) {
			if(json.result === true) {
				$btn[doJoin ? 'addClass' : 'removeClass']('on').attr('title', json.data.title + (doJoin ? ' 팬맺기 취소' : ' 팬맺기'));
				// 숫자 영역이 엘리먼트로 감싸져 있지 않아 텍스트노드를 직접 변환
				var $cnt = $btn.parent().contents()
					.filter(function() {
						return this.nodeType == 3 && $.trim(this.nodeValue).length > 0;
					});
				if($cnt.length){
					$cnt[0].nodeValue = addComma(json.data.count)+'명';
					$btn.parent().hide().show();
				}
			} else {
				alert(json.errorMessage);
			}
		}).fail(function(msg) {
			alert(msg);
		});

	});
	// 공통의 팬맺기
	$('div.fan_area button.btn_fan_b').on('click', function(){
		// 로그인 체크
		if(!MELON.WEBSVC.POC.login.isMelonLogin()) {
			MELON.WEBSVC.POC.login.loginPopupLayerd('');
			return;
		}

		var $btn = $(this),
			isJoin = $btn.hasClass('on'), doJoin = !isJoin,
			artistNo = $btn.attr('data-artist-no'),
			menuId = $btn.attr('data-artist-menuId'),
			title = $btn.attr('title').split(' 팬맺기'),
			$target = (function(){
				var $cnt = $btn.next('span.cnt_fan');
				if($cnt.length){
					return $cnt;
				}
				var targetId = $btn.attr('data-target-id');
				if(!targetId) { return $(); }
				targetId = targetId.substr(0, 1) === '#' ? targetId : '#' + targetId;
				return $(targetId);
			})(),
			defer, event;

		// 팬맺기 취소할값들만 TRUE값을 줌
		var checkCancen = $btn.attr('data-artist-cancel');
		if(checkCancen){
			WEBSVC.ArtistList.canCancel = true;
		}

		$btn.trigger((event = $.Event('joinbefore')), [artistNo, doJoin]);
		if(event.isDefaultPrevented()){ return; }

		if(isJoin && WEBSVC.ArtistList.canCancel) {
//			if(!confirm('팬 맺은 아티스트를 취소하시겠습니까? ')) { return; }
//			defer = WEBSVC.ArtistList.leave(artistNo,menuId);
			//confirm창 레이어드로 변경
			WEBSVC.confirm2('팬 맺은 아티스트를 취소하시겠습니까?').on('ok', function(){
				likeM(WEBSVC.ArtistList.leave(artistNo,menuId));
			})
			.on('cancel', function(){
				return false;
			});
		} else {
			//if(!confirm("팬을 맺으시겠습니까?")){ return; }
			if(!isMelonLogin()) {//로그인전이라면
                MELON.WEBSVC.loginLayer({userid: 'melon'});
                return defer;
            }else{
            	//WEBSVC.alert2('팬이 되었습니다.</br>마이뮤직에서 확인하세요.',{opener :$btn, removeOnClose:true, overlayNotClose:true});
//                defer = WEBSVC.ArtistList.join(artistNo,menuId);
            	likeM(WEBSVC.ArtistList.join(artistNo,menuId));
                $(".commerceBanner2").hide();
            }
		}

		function likeM(defer) {
			var defer = defer;
			defer.done(function(json) {
				var tmpl = WEBSVC.ArtistList.template.button[$btn.attr('data-tmpl-name') || 'normal'],
				caption = '';
				if(json.result === true) {
					$btn.trigger((event = $.Event('joinchanged')), [artistNo, title[0], doJoin, json.data.SUMMCNT.toString().replace(/(\d)(?=(?:\d{3})+$)/g, "$1,")]);
					if(event.isDefaultPrevented()){ return; }

					if(WEBSVC.ArtistList.canCancel) {
						caption = (doJoin ? '팬맺기 취소' : '팬맺기');
					} else {
						caption = "팬입니다.";
						//var $span = $('<span type="button" class="btn_small02 confmlk_frend on disabled" tabIndex="0" title="'+json.data.title+' 친구입니다"><span><span><span class="icon"></span> 친구</span></span></span>');
						//$btn.replaceWith($span);
						//$span.focus();
						//var $span = $('<span type="button" class="btn_small02 confmlk_frend on disabled" tabIndex="0" title="'+json.data.title+' 친구입니다">'+$btn.html()+'</span>');
						$btn.prop('disabled', true).addClass('disabled').attr('tabIndex',0);
					}

					$btn[doJoin ? 'addClass' : 'removeClass']('on').attr('title', title[0] + ' ' + caption)
						.html(tmpl.replace(/\{TXT\}/g, caption));
					//2013.11.18
					$target.html('<span>'+json.data.SUMMCNT.toString().replace(/(\d)(?=(?:\d{3})+$)/g, "$1,")+'</span>');

					doJoin && WEBSVC.alert2('팬이 되었습니다.</br><a href="javascript:melon.menu.goMyMusicMain();" class="fc_strong">마이뮤직</a>에서 확인하세요.',{opener :$btn, removeOnClose:true, overlayNotClose:true});//140603_수정
					// 성공후..
					$.ajax({
						url: '/artist/topLikeUserList.htm',
						data: {
							contsId : artistNo,
							viewPage : '1'
						},
						async : false
					}).done(function(html) {
						$('#artistTopLikeUserLayer').html(html);
					});
				} else {
					alert(json.errorMessage);
					//토큰 유효성체크 
					if(json.tockenValid != undefined && json.tockenValid == false){
						var pocId = MELON.WEBSVC.POC.getPocId();
						if('WP42' == pocId){
							try {
								MelonAPI.window("forceLogout", "");
							} catch(e) {
							}
						}else{
							location.href = json.returnUrl;
						}
					}
				}
			}).fail(function(msg){
				alert(msg || '예상치 못한 이유로 작업이 중단되었습니다.');
			});
		}
	});
});

//start: 20140208 : mhover

//end: 20140208 : mhover