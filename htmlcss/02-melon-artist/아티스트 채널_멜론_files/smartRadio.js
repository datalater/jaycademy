(function($) {
	//============================================================
	// import
	// Egde 브라우저용 popup 제거 버전.

	var isMelonLogin = MELON.WEBSVC.Auth.isMelonLogin;

	var loginPopupLayerd = MELON.WEBSVC.POC.login.loginPopupLayerd;

	var playSmartRadio = MELON.WEBSVC.POC.play.playSmartRadio;
	var goWeplyerSmartRadio = MELON.WEBSVC.POC.play.goWeplyerSmartRadio;

	//============================================================
	// 상수

	var WEB_PATH = '/smartradio';

	var MENU_ID = '22000000';

	// 플레이어 재생 파라미터 구분자
	var PARAM_DELIM = '';
	var PARAM_END = ':';

	// 연대 기본값
	var DEFAULT_YEARS_ACTIVE = "1950|1960|1970|1980|1990|2000|2010|2020|";

	//============================================================
	// private 함수

	/**
	 * Ajax 호출
	 * @param displayName 표시 한글명
	 * @param url 서비스 URL
	 * @param params HTTP 파라미터
	 * @return Promise.done(function(result) {성공시 호출})
	 *                .fail(function(result) {실패시 호출})
	 */
	var ajaxForJson = function(displayName, url, params) {
		return $.ajax({
			url: url,
			data: params,
			dataType: 'json'
		}).then(
			function(result) {
				if (result.success) {
					return result;
				} else {
					if (displayName) {
						alert(displayName+'에 실패하였습니다.');
					}
					return $.Deferred().reject(result);
				}
			},
			function() {
				if (displayName) {
					alert(displayName+' 중 에러가 발생하였습니다.');
				}
				return {success: false};
			}
		);
	};

	/**
	 * 레이어를 컨테이너에 로드 (표시는 안함)
	 * @param html 레이어 HTML
	 * @return $레이어
	 */
	var loadLayer = function(html) {
		// 레이어 컨테이너 획득 (없으면 생성)
		var $layers = $('#smartRadioLayers');
		if ($layers.length == 0) {
			$layers = $('<div>').attr({id:'smartRadioLayers'}).appendTo(document.body);
		}

		// 기존 레이어 제거
		$layers.empty();

		// 레이어를 컨테이너에 추가
		var $layer = $('<div>').html(html).children().appendTo($layers);

		return $layer.not('script');
	};

	/**
	 * Ajax로 가져온 레이어를 컨테이너에 로드 (표시는 안함)
	 * @param url 레이어 URL
	 * @param params HTTP 파라미터
	 * @return Promise.done(function($layer) {로드 성공시 호출})
	 *                .fail(function() {로드 실패시 호출})
	 */
	var loadAjaxLayer = function(url, params) {
		var deferred = $.Deferred();

		// 레이어 서비스 Ajax 호출
		$.get(url, params, function(html) {
			try {
				// 레이어를 컨테이너에 로드
				var $layer = loadLayer(html);
				deferred.resolve($layer);
			} catch (e) {
				deferred.reject();
			}
	  	}).fail(function() {
	  		deferred.reject();
	  	});

		return deferred.promise();
	};

	/**
	 * 플레이어 실행
	 * @param options 재생 옵션 = {
	 *            channelId: 채널ID,
	 *            recmChannel: 추천 채널 여부 (true/false)
	 *            artistId: 아티스트ID,
	 *            moreArtist: 유사 아티스트 포함 여부 (Y/N)
	 *            genreCode: 장르코드,
	 *            yearsActive: 연대들 (구분자:|)
	 *        }
	 */
	var executePlayer = function(options) {

		// 플레이 시 Tablet의 경우 무조건 팝업띄움 OP2015-7472[SR] Tablet 내 PC web 이용시 안내팝업
		if(MELON.WEBSVC.POC.isTablet()){
			MELON.WEBSVC.POC.tabletGuidePop();
			return;
		}
		
		// 옵션 기본값
		options = $.extend({
			yearsActive: DEFAULT_YEARS_ACTIVE
		}, options||{});

		var itemFlg, itemId, yearsActive;

		if ( MENU_ID == '' || typeof MENU_ID == 'undefined') {
			MENU_ID = '22000000';
		}

		if (options.channelId) {
			if (options.recmChannel) {
				// 추천 채널 재생 파라미터 (비로그인 사용자용)
				itemFlg = 11;
				itemId = options.channelId;
				yearsActive = options.yearsActive;
			} else {
				// 일반 채널 재생 파라미터
				itemFlg = 8;
				itemId = options.channelId;
				yearsActive = '';
			}
		} else if (options.artistId) {
			// R:유사아티스트포함, O:입력아티스트만
			var moreArtistCode = options.moreArtist == 'Y' ? 'R' : 'O';

			// 아티스트 재생 파라미터 (비로그인 사용자용)
			itemFlg = 9;
			itemId = moreArtistCode + '*' + options.artistId;
			yearsActive = moreArtistCode + '*' + options.yearsActive;

		} else if (options.genreCode) {
			// 장르 재생 파라미터 (비로그인 사용자용)
			itemFlg = 10;
			itemId = options.genreCode;
			yearsActive = options.yearsActive;
		} else {
			alert('executePlayer() : 파라미터가 올바르지 않습니다.');
		}

		var param = itemId + PARAM_DELIM + itemFlg + PARAM_DELIM + yearsActive + PARAM_DELIM + MENU_ID + PARAM_DELIM + PARAM_END;

		if (isMelonLogin()) {
			// 로그인 상태이면, MAC인 경우 웹플레이어, MAC이 아닌 경우 PC플레이어 호출
			playSmartRadio(MENU_ID, param);
		} else {
			// 비로그인 상태이면, 웹플레이어 호출
			goWeplyerSmartRadio(param);
		}
	};

	//============================================================
	// 스마트라디오

	var smartRadio = window.smartRadio = {};

	/**
	 * 스마트라디오 메인페이지 URL
	 * @param params HTTP 파라미터
	 * @return URL
	 */
	smartRadio.mainPage = function(params) {
		params = params || {};
		return WEB_PATH + '/index.htm?' + $.param(params);
	};

	/**
	 * 내 채널 재생
	 * @param channelId 채널ID
	 */
	smartRadio.playMyChannel = function(channelId, menuId) {

		// 플레이 시 Tablet의 경우 무조건 팝업띄움 OP2015-7472[SR] Tablet 내 PC web 이용시 안내팝업
		if(MELON.WEBSVC.POC.isTablet()){
			MELON.WEBSVC.POC.tabletGuidePop();
			return;
		}
		
		MENU_ID = menuId;

		// 로그인 상태이면
		if (isMelonLogin()) {
			// 채널정보 조회
			smartRadio.informChannelInfo(channelId).done(function(channelInfo) {
				if (channelInfo) {
					// 스마트라디오 페이지이면,
					if (smartRadio.mode) {
						if (smartRadio.mode != 'artist' && smartRadio.mode != 'genre') {
							alert('비정상적인 모드 : '+smartRadio.mode);
							return;  // 무한 자동재생 방지
						}

						// 재생하려는 모드
						var newMode = null;
						switch (channelInfo.channelGubun) {
							case 'A': newMode = 'artist'; break;
							case 'G': newMode = 'genre';  break;
							default: alert('비정상적인 채널구분 : '+channelInfo.channelGubun); return;  // 무한 자동재생 방지
						}

						// 현재 모드가 재생하려는 모드와 일치하면,
						if (smartRadio.mode == newMode) {
							if (smartRadio.onPlayMyChannel) {
								smartRadio.onPlayMyChannel(channelInfo);
							}

							// 플레이어 실행
							executePlayer({channelId: channelId});
						// 현재 모드가 재생하려는 모드와 다르면,
						} else {
							// 스마트라디오 페이지로 이동후 자동재생
							location.href = smartRadio.mainPage({channelId: channelId, autoPlay: 'Y'});
						}
					// 외부 페이지이면,
					} else {
						// 플레이어 실행
						executePlayer({channelId: channelId});
					}
				} else {
					alert('채널이 존재하지 않습니다.');
				}
			});
		// 비로그인 상태이면
		} else {
			// 로그인 후 리다이렉트할 URL
			var loginReturnURL;
			if (smartRadio.mode) {
				// 스마트라디오 페이지인 경우
				loginReturnURL = smartRadio.mainPage({channelId: channelId, autoPlay: 'Y'});
			} else {
				// 외부 페이지인 경우
				loginReturnURL = location.href;
			}

			// 레이어 : 로그아웃 상태 알림
			layers.logoutNotice(loginReturnURL, function() {
				// 로그아웃 상태로 듣기 버튼 클릭시, 플레이어 실행
				executePlayer({channelId: channelId});
			});
		}
	};

	/**
	 * 아티스트 재생
	 * @param artistId 아티스트ID
	 * @param moreArtist 유사 아티스트 포함 여부 (Y/N)
	 */
	smartRadio.playArtist = function(artistId, moreArtist, menuId) {

		// 플레이 시 Tablet의 경우 무조건 팝업띄움 OP2015-7472[SR] Tablet 내 PC web 이용시 안내팝업
		if(MELON.WEBSVC.POC.isTablet()){
			MELON.WEBSVC.POC.tabletGuidePop();
			return;
		}
		
		MENU_ID =  menuId;

		// 추천곡 개수 조회
		smartRadio.informRecmSongSize({
			artistIds: artistId+'|',
			moreArtist: moreArtist
		}).done(function(result) {
			// 로그인 상태이면
			if (isMelonLogin()) {
				// 아티스트 채널 등록 서비스 Ajax 호출
				ajaxForJson('아티스트 채널 등록', WEB_PATH+'/insertChannelbyArtist.json', {
					artistId: artistId,
					moreArtist: moreArtist
				}).done(function(result) {
					// 내 채널 재생
					smartRadio.playMyChannel(result.channelId, menuId);
				});
			// 비로그인 상태이면
			} else {
				// 로그인 후 리다이렉트할 URL
				var loginReturnURL;
				if (smartRadio.mode) {
					$('.play_box .sim_atist p').text('입력한 아티스트만 재생 중');
					$('.sim_atist').show();
					$('.play_box .sr').hide();
					$('.atist_unit').show();
					// 스마트라디오 페이지인 경우
					//비로그인 시 입력한 아티스트만 재생
					loginReturnURL = smartRadio.mainPage({artistId: artistId, moreArtist: moreArtist, autoPlay: 'N'});
				} else {
					// 외부 페이지인 경우
					loginReturnURL = location.href;
				}

				// 레이어 : 로그아웃 상태 알림
				layers.logoutNotice(loginReturnURL, function() {
					// 로그아웃 상태로 듣기 버튼 클릭시, 플레이어 실행
					//executePlayer({artistId: artistId, moreArtist: moreArtist});
					//요건변경 moreArtist 삭제
					executePlayer({artistId: artistId});
				});
			}
		}).fail(function(result) {
			alert('해당하는 아티스트로는 추천곡이 없습니다.');
		});
	};

	/**
	 * 장르 재생
	 * @param genreCode 장르코드
	 * @param yearsActive 연대들 (구분자:|)
	 */
	smartRadio.playGenre = function(genreCode, yearsActive) {

		// 플레이 시 Tablet의 경우 무조건 팝업띄움 OP2015-7472[SR] Tablet 내 PC web 이용시 안내팝업
		if(MELON.WEBSVC.POC.isTablet()){
			MELON.WEBSVC.POC.tabletGuidePop();
			return;
		}
		
		// 추천곡 개수 조회
		smartRadio.informRecmSongSize({
			genreCode: genreCode,
			yearsActive: yearsActive
		}).done(function(result) {
			// 로그인 상태이면
			if (isMelonLogin()) {
				// 장르 채널 등록 서비스 Ajax 호출
				ajaxForJson('장르 채널 등록', WEB_PATH+'/insertChannelbyGenre.json', {
					genreCode: genreCode,
					yearsActive: yearsActive
				}).done(function(result) {
					// 내 채널 재생
					smartRadio.playMyChannel(result.channelId);
				});
			// 비로그인 상태이면
			} else {
				// 로그인 후 리다이렉트할 URL
				var loginReturnURL;
				if (smartRadio.mode) {
					// 스마트라디오 페이지인 경우
					loginReturnURL = smartRadio.mainPage({genreCode: genreCode, yearsActive: yearsActive, autoPlay: 'Y'});
				} else {
					// 외부 페이지인 경우
					loginReturnURL = location.href;
				}
				// 레이어 : 로그아웃 상태 알림
				layers.logoutNotice(loginReturnURL, function() {
					// 로그아웃 상태로 듣기 버튼 클릭시, 플레이어 실행
					executePlayer({genreCode: genreCode, yearsActive: yearsActive});
				});
			}
		}).fail(function() {
			alert('현재 채널에서 재생가능한 곡이 없습니다.');
		});
	};

	/**
	 * 추천 채널 재생
	 * @param channelId 채널ID
	 * @param artistIds 아티스트ID들 (구분자:|)
	 * @param yearsActive 연대들 (구분자:|)
	 */
	smartRadio.playRecmChannel = function(channelId, artistIds, yearsActive) {

		// 플레이 시 Tablet의 경우 무조건 팝업띄움 OP2015-7472[SR] Tablet 내 PC web 이용시 안내팝업
		if(MELON.WEBSVC.POC.isTablet()){
			MELON.WEBSVC.POC.tabletGuidePop();
			return;
		}
		
		// 로그인 상태이면
		if (isMelonLogin()) {
			var searchFlg = "N";
			var artistIdsArr = artistIds.split('|');
			if (artistIdsArr.length > 2){
				searchFlg = "Y";
			}

			// 추천 채널 복사 등록 서비스 Ajax 호출
			ajaxForJson('추천 채널 등록', WEB_PATH+'/insertChannelbyRecmChannel.json', {
				channelId: channelId,
				searchFlg: searchFlg
			}).done(function(result) {
				// 내 채널 재생
				smartRadio.playMyChannel(result.channelId);
			});
		// 비로그인 상태이면
		} else {
			// 로그인 후 리다이렉트할 URL
			var loginReturnURL;
			if (smartRadio.mode) {
				// 스마트라디오 페이지인 경우
				loginReturnURL = smartRadio.mainPage({channelId: channelId, recmChannel: 'Y', autoPlay: 'Y'});
			} else {
				// 외부 페이지인 경우
				loginReturnURL = location.href;
			}

			// 레이어 : 로그아웃 상태 알림
			layers.logoutNotice(loginReturnURL, function() {
				// 로그아웃 상태로 듣기 버튼 클릭시, 플레이어 실행
				executePlayer({channelId: channelId, yearsActive: yearsActive, recmChannel: true});
			});
		}
	};

	/**
	 * 일반 채널 재생
	 * @param channelId 채널ID
	 */
	smartRadio.playNormalChannel = function(channelId) {

		// 플레이 시 Tablet의 경우 무조건 팝업띄움 OP2015-7472[SR] Tablet 내 PC web 이용시 안내팝업
		if(MELON.WEBSVC.POC.isTablet()){
			MELON.WEBSVC.POC.tabletGuidePop();
			return;
		}
		
		// 로그인 상태이면
		if (isMelonLogin()) {
			// 일반 채널 복사 등록 서비스 Ajax 호출
			ajaxForJson('일반 채널 등록', WEB_PATH+'/insertChannelbyChannel.json', {
				channelId: channelId
			}).done(function(result) {
				// 내 채널 재생
				smartRadio.playMyChannel(result.channelId);
			});
		// 비로그인 상태이면
		} else {
			// 로그인 후 리다이렉트할 URL
			var loginReturnURL;
			if (smartRadio.mode) {
				// 스마트라디오 페이지인 경우
				loginReturnURL = smartRadio.mainPage({channelId: channelId, autoPlay: 'Y'});
			} else {
				// 외부 페이지인 경우
				loginReturnURL = location.href;
			}

			// 레이어 : 로그아웃 상태 알림
			layers.logoutNotice(loginReturnURL, function() {
				// 로그아웃 상태로 듣기 버튼 클릭시, 플레이어 실행
				executePlayer({channelId: channelId});

			});
		}
	};

	/**
	 * 추천 채널 목록 조회
	 * @param styleCode 스타일코드
	 * @return Promise.done(function(result) {성공시 호출})
	 *                .fail(function(result) {실패시 호출})
	 */
	smartRadio.listRecmChannels = function(styleCode) {
		// 추천 채널 목록 조회 서비스 Ajax 호출
		return $.get(WEB_PATH+'/listRecmChannels.htm', {styleCode: styleCode});
	};

	/**
	 * 오늘의 추천 라디오 조회
	 * @return Promise.done(function(result) {성공시 호출})
	 *                .fail(function(result) {실패시 호출})
	 */
	smartRadio.informTodayRecmRadio = function() {
		// 오늘의 추천 라디오 조회 서비스 Ajax 호출
		return ajaxForJson('오늘의 추천 라디오 조회', WEB_PATH+'/informTodayRecmRadio.json');
	};

	/**
	 * 채널정보 조회
	 * @param channelId 채널ID
	 * @return Promise.done(function(result) {성공시 호출})
	 *                .fail(function(result) {실패시 호출})
	 */
	smartRadio.informChannelInfo = function(channelId) {
		// 채널정보 조회 서비스 Ajax 호출
		return ajaxForJson('채널정보 조회', WEB_PATH+'/informChannelInfo.json', {channelId: channelId});
	};

	/**
	 * 유사 아티스트 조회
	 * @param artistId 아티스트ID
	 * @return Promise.done(function(result) {성공시 호출})
	 *                .fail(function(result) {실패시 호출})
	 */
	smartRadio.listSimilarArtists = function(artistId) {
		// 유사 아티스트 조회 서비스 Ajax 호출
		return ajaxForJson('유사 아티스트 조회', WEB_PATH+'/listSimilarArtists.json', {artistId: artistId});
	};

	/**
	 * 아티스트 검색어 제안 조회
	 * @param searchWord 검색어
	 * @return Promise.done(function(result) {성공시 호출})
	 *                .fail(function(result) {실패시 호출})
	 */
	smartRadio.listArtistSearchSuggest = function(searchWord) {
		// 아티스트 검색어 제안 조회 서비스 Ajax 호출
		return ajaxForJson('', WEB_PATH+'/listArtistSearchSuggest.json', {
			searchWord: encodeURIComponent(searchWord)
		});
	};

	/**
	 * 추천곡 개수 조회
	 * @param params HTTP 파라미터
	 * @return Promise.done(function(result) {추천곡이 있으면 호출})
	 *                .fail(function(result) {추천곡이 없거나, 조회 실패시 호출})
	 */
	smartRadio.informRecmSongSize = function(params) {
		// 추천곡 개수 조회 서비스 Ajax 호출
		return ajaxForJson('추천곡 개수 조회', WEB_PATH+'/informRecmSongSize.json', params).then(
			function(result) {
				var recmSongSize = result.recmSongSize;
				if (recmSongSize > 0) {
					return result;
				} else {
					result.recmSongSize = 0;
					return $.Deferred().reject(result);
				}
			},
			function(result) {
				result.recmSongSize = 0;
				return result;
			}
		);
	};

	/**
	 * 채널정보 수정
	 * @param params HTTP 파라미터
	 * @return Promise.done(function(result) {성공시 호출})
	 *                .fail(function(result) {실패시 호출})
	 */
	smartRadio.updateChannelInfo = function(params) {
		// 채널정보 수정 서비스 Ajax 호출
		return ajaxForJson('채널정보 수정', WEB_PATH+'/updateChannelInfo.json', params);
	};

	/**
	 * 채널 플레이시간 수정
	 * @param channelId 채널ID
	 * @return Promise.done(function(result) {성공시 호출})
	 *                .fail(function(result) {실패시 호출})
	 */
	smartRadio.updateChannelPlayTime = function(channelId) {
		// 채널 플레이시간 수정 서비스 Ajax 호출
		return ajaxForJson('채널 플레이시간 수정', WEB_PATH+'/updateChannelPlayTime.json', {channelId: channelId});
	};

	/**
	 * 채널 삭제
	 * @param channelId 채널ID
	 * @return Promise.done(function(result) {성공시 호출})
	 *                .fail(function(result) {실패시, 취소시 호출})
	 */
	smartRadio.deleteChannel = function(channelId) {
		if (!channelId) {
			alert('채널ID가 없습니다.');
			return $.Deferred().reject().promise();
		}

		if (confirm('해당 채널을 삭제하시겠습니까?')) {
			// 채널 삭제 서비스 Ajax 호출
			return ajaxForJson('채널 삭제', WEB_PATH+'/deleteChannel.json', {channelId: channelId});
		} else {
			return $.Deferred().reject().promise();
		}
	};

	/**
	 * 동명이인 아티스트 확인 레이어
	 * @param params HTTP 파라미터
	 * @param onSelected 아티스트 선택시 콜백 = function(artistId, artistName) {...}
	 */
	smartRadio.layerSameNameArtists = function(params, onSelected) {
		params = params || {};
		params.onSelected = 'smartRadio.onSameNameArtistSelected';

		var $showingLayer = null;

		// 아티스트 선택시
		smartRadio.onSameNameArtistSelected = function(artistId, artistName) {
			// 콜백 호출
			onSelected(artistId, artistName);

			// 레이어 닫기
			if ($showingLayer) $showingLayer.modal('hide');
		};

		// 동명이인 아티스트 확인 레이어 로드
		loadAjaxLayer(WEB_PATH+'/listSameNameArtists.htm', params).done(function($layer) {
			// 레이어에 script 외의 엘리먼트가 있으면, 레이어 표시
			if ($layer.children().not('script').length > 0) {
				$layer.modal();
				$showingLayer = $layer;
			}
	  	});
	};

	//============================================================
	// 레이어

	var layers = smartRadio.layers = {};

	/**
	 * 레이어 : 브라우저 기능제한 안내
	 * @return Promise.done(function($layer) {로드 성공시 호출})
	 *                .fail(function() {로드 실패시 호출})

	layers.invalidBrowser = function() {
		return loadAjaxLayer(WEB_PATH+'/layers.htm', {
			layerType: 'invalidBrowser'
		}).done(function($layer) {
			$layer.on('modalshown', function(){
				// 닫기 버튼에 포커스
				$layer.find('button.btn_emphs02_small').focus();
			}).modal();
		});
	};
	 */

	/**
	 * 레이어 : 랜딩페이지
	 * @param landingTitle 랜딩페이지 제목
	 * @param landingDetail 랜딩페이지 상세
	 * @param onPlay 채널듣기 버튼 콜백 = function() {...}
	 * @return Promise.done(function($layer) {로드 성공시 호출})
	 *                .fail(function() {로드 실패시 호출})
	 */
	layers.landingPage = function(landingTitle, landingDetail, onPlay) {
		return loadAjaxLayer(WEB_PATH+'/layers.htm', {
			layerType: 'landingPage',
			mode: smartRadio.mode
		}).done(function($layer) {
			$layer.find('.landingTitle').html(landingTitle);
			$layer.find('.landingDetail').html(landingDetail);

			// 채널듣기 버튼 클릭시
			$layer.find('.btnPlay').click(function() {
				// 레이어 닫고, 콜백 호출
				$layer.modal('hide');
				onPlay();
				return false;
	    	});

			$layer.on('modalshown', function(){
				// 채널듣기 버튼에 포커스
				$layer.find('.btnPlay').focus();
			}).modal();
		});
	};

	/**
	 * 레이어 : 로그아웃 상태 알림
	 * @param loginReturnURL 로그인 리턴 URL
	 * @param onLogoutPlay 로그아웃 상태로 듣기 버튼 콜백 = function() {...}
	 */
	layers.logoutNotice = function(loginReturnURL, onLogoutPlay) {

//		$('.play_box .sim_atist p').text('입력한 아티스트만 재생 중');
//		$('.sim_atist').show();
//		$('.play_box .sr').hide();
//		$('.atist_unit').show();
		return loadAjaxLayer(WEB_PATH+'/layers.htm', {
			layerType: 'logoutNotice'
		}).done(function($layer) {
			// 로그아웃 상태로 듣기 버튼 클릭시
			$layer.find('.btnLogoutPlay').click(function() {
				// 레이어 닫고, 콜백 호출
				$layer.modal('hide');
				onLogoutPlay();
				return false;
	    	});

			// 로그인 버튼 클릭시
			$layer.find('.btnLogin').click(function() {
				// 레이어 닫고, 로그인 레이어 띄움
				$layer.modal('hide');
				loginPopupLayerd(loginReturnURL);
				return false;
	    	});
			$layer.modal();
		});
	};
})(jQuery);