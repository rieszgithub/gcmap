var wikiURL;

var map = null;

var markerManager = null;

var gcmapGeo = null;

var markers = null;

var miniMarker = null;

var prevNewPlace = null;

var openInfo = null;

var editMode = false;

var dblclick = false;

var movedMarker = null;

function drawStatus(message) {
  document.getElementById('gcmap_message').innerHTML = message;
}

function drawModifyStatus(message) {
  document.getElementById('gcmap_modify_message').innerHTML = message;
}

function gcmap_modify_toggle() {
  if (markers == null) return;

  if (editMode) {
    if (movedMarker) {
      movedMarker.get("model").revertMove();
      movedMarker = null;
    }

    if (openInfo) {
      openInfo.close();
      openInfo = null;
    }

    for (var i in markers) {
      markers[i].setDraggable(false);
    }
    drawModifyStatus("");
    editMode = false;
  } else {
    for (var i in markers) {
      markers[i].setDraggable(true);
    }
    drawModifyStatus("位置修正モード オン");
    editMode = true;
  }

  return false;
}

// クイックジャンプ用コード
function gcmap_op_quickjmp(groupId) {
  var groups = document.getElementsByTagName('p');
  for (var i = 0; i < groups.length; i++) {
    var group = groups.item(i);
    if (group.getAttribute('name') == 'gcmap_quickjmp_group') {
      var openButton = document.getElementById('open_' + group.id);
      if (group.id == ('gcmap_quickjmp_group_' + groupId)) {
        group.style.display              = 'block';
        openButton.style.backgroundColor = '#E8E8E8';
        openButton.style.color           = 'black';
      } else {
        group.style.display              = 'none';
        openButton.style.backgroundColor = 'transparent';
        openButton.style.color           = 'black';
      }
    }
  }
}

function gcmap_geojmp() {
  var address = document.getElementById("gcmap_search_address").value;

  drawStatus(address + "<br />検索中");

  gcmapGeo.geocode(
    {address: address},
    geocodeComplete);

  return false;
}

function geocodeComplete(results, status) {
  if (status == google.maps.GeocoderStatus.ZERO_RESULTS) {
    drawStatus("見つかりませんでした");
  } else if (status == google.maps.GeocoderStatus.OK) {
    var geometry = results[0].geometry;
    map.fitBounds(geometry.viewport);

    drawStatus(results[0].formatted_address);
  } else {
    drawStatus("エラーが発生しました");
  }
}

// URLエンコード (ecl.js使用)
function myencodeURL(str) {
  return EscapeEUCJP(str).replace("/\\s/g", "%20");
}

function openCreateWindow() {
  var ocForm = document.gcmapform;

  if (ocForm.lng.value == '' || ocForm.lat.value == '' || prevNewPlace == null) {
    drawStatus("地図をクリックして位置を指定してください");
    return false;
  }

  if (ocForm.gcname.value == '') {
    drawStatus("店名を入力してください");
    return false;
  }

  window.open(
    wikiURL + '?cmd=gcmapnew&lng=' + ocForm.lng.value+
    '&lat=' + ocForm.lat.value+
    '&gcname=' + myencodeURL(ocForm.gcname.value) +
    '&page=gcmap/' + myencodeURL(ocForm.gcname.value),
    '_blank');

  drawStatus("");

  return false;
}

function gcReload() {
  loadMarkers();
}

function CustomMarkerModel(marker, gcname, page, loc, comm, originalPosition) {
  this.marker = marker;

  this.gcname = gcname;
  this.page = page;
  this.loc = loc;
  this.comm = comm;
  this.originalPosition = originalPosition;
}

CustomMarkerModel.prototype._getMessage = function() {
  return '<a href="' + wikiURL + '?' + this.page + '" target="_blank"><strong>' + this.gcname + '</strong></a>' +
    (this.loc ? '<br><small>' + this.loc + '</small>' : '') +
    (this.comm ? '<br><br><div width="320px"><small>' + this.comm + '</small></div>' : '');
}

CustomMarkerModel.prototype.getMoveMessage = function() {
  return '<strong>' + this.gcname + '</strong><br>' +
      'をこの位置に修正する場合は、<br>' +
      '<a href="' + wikiURL + '?cmd=gcmapposmod&page=' + this.page +
      '&lng=' + this.marker.getPosition().lng() +
      '&lat=' + this.marker.getPosition().lat() +
      '" target="_blank"><strong>ここ</strong></a>をクリックしてWikiを開き、<br>' +
      '更新してください';
}

CustomMarkerModel.prototype.revertMove = function() {
  this.marker.setPosition(this.originalPosition);
}

CustomMarkerModel.prototype.showInfoWindow = function() {
  var info = new google.maps.InfoWindow();
  info.setContent(this._getMessage());
  info.setOptions({maxWidth: 320});
  info.open(map, this.marker);
  return info;
}

function gcOpenAllBalloon() {
  for (var i in markers) {
    markers[i].get("model").showInfoWindow();
  }
}

function updateMarkers() {
  if (markers == null) return;

  var area = map.getBounds();

  for (var i = 0; i < markers.length; i++) {
    var marker = markers[i];
    if (area.contains(marker.getPosition())) {
      if (!marker.getMap()) {
	marker.setMap(map);
      }
    } else {
      if (marker.getMap()) {
	marker.setMap(null);
      }
    }
  }
}

function drawMarkers() {
  if (markers == null) return;

  var area = map.getBounds();
  for (var i = 0; i < markers.length; i++) {
    var marker = markers[i];
    if (area.contains(marker.getPosition())) {
      marker.setMap(map);
    } else {
      marker.setMap(null);
    }
  }
}

function loadMarkers() {
  drawStatus("ロード開始");

  $.ajax({
    url: wikiURL + '?cmd=gcmap',
    type: "GET",
    dataType: "xml",
    error: function() {
      drawStatus("ロードに失敗しました");
    },
    success: loadMarkersComplete});
}

function createMarker(markerDescription) {
  var gcname = markerDescription.getAttribute("name");
  var page   = markerDescription.getAttribute("page");
  var loc    = markerDescription.getAttribute("loc");
  var comm   = markerDescription.getAttribute("comm");

  var lat = parseFloat(markerDescription.getAttribute("lat"));
  var lng = parseFloat(markerDescription.getAttribute("lng"));

  var icon = {
    scaledSize: {width: 14, height: 22}
  };
  if (markerDescription.getAttribute("recomm") != null) {
    icon.url = "map/blueblank.png";
  } else {
    icon.url = "map/redblank.png";
  }

  var point = new google.maps.LatLng(lat, lng, false);

  var marker = new google.maps.Marker(
      {position: point, title: gcname, draggable: false});
  marker.set("model", new CustomMarkerModel(marker, gcname, page, loc, comm, point));
  marker.addListener(
    "click",
    function() {
      if (openInfo) {
        openInfo.close();
      }

      if (movedMarker && movedMarker !== this) {
        movedMarker.get("model").revertMove();
      }
      movedMarker = this;

      openInfo = this.get("model").showInfoWindow();
    });

  marker.addListener(
    "dragend",
    function() {
      if (openInfo) {
        openInfo.close();
      }

      if (movedMarker && movedMarker !== this) {
        movedMarker.get("model").revertMove();
      }
      movedMarker = this;

      var info = new google.maps.InfoWindow();
      info.setContent(this.get("model").getMoveMessage());
      info.open(map, this);

      openInfo = info;
    });

  markers.push(marker);
}

function loadMarkersComplete(xmlDoc) {
  drawStatus("ロード完了。描画中");

  if (openInfo) {
    openInfo.close();
    openInfo = null;
  }

  if (editMode) {
    gcmap_modify_toggle();
  }

  if (movedMarker) {
    movedMarker.setMap(null);
    movedMarker = null;
  }

  if (prevNewPlace) {
    prevNewPlace.setMap(null);
    prevNewPlace = null;
  }

  if (markers) {
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(null);
    }
  }
  markers = [];

  var markerDescriptions = xmlDoc.documentElement.getElementsByTagName("m");
  for (var i = 0; i < markerDescriptions.length; i++) {
    createMarker(markerDescriptions[i]);
  }

  drawMarkers();

  drawStatus("描画完了");
}

function clickHandler(e) {
  if (dblclick) {
    dblclick = false;
    return;
  }

  if (movedMarker) {
    movedMarker.get("model").revertMove();
    movedMarker = null;
  }

  var position = e.latLng;
  document.gcmapform.lng.value = position.lng();
  document.gcmapform.lat.value = position.lat();

  var newPlace = new google.maps.Marker(
    {position: position,
     draggable: true});

  var info = new google.maps.InfoWindow();
  info.setContent(
    'この位置に店を追加するには<br>' +
      '「店名」欄に店の名前を入力し<br>' +
      '「新規登録」ボタンを押してください');
  info.addListener(
    "closeclick",
    function(p) {
      p.setMap(null);
    }.bind(info, newPlace));
  info.open(map, newPlace);

  newPlace.addListener(
    "dragend",
    function() {
      var position = this.getPosition();
      document.gcmapform.lng.value = position.lng();
      document.gcmapform.lat.value = position.lat();
    });

  if (prevNewPlace != null) {
    prevNewPlace.setMap(null);
  }
  prevNewPlace = newPlace;

  if (openInfo) {
    openInfo.close();
  }

  newPlace.setMap(map);
}

function init(lat, lng, zoom) {
  gcmapGeo = new google.maps.Geocoder();

  var mapOptions = {
    zoomControlOptions: {
      style: google.maps.ZoomControlStyle.LARGE
    }
  };
  map = new google.maps.Map(document.getElementById("gcmapdiv"), mapOptions);
  map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
  map.setCenter(new google.maps.LatLng(lat, lng));
  map.setZoom(zoom);

  loadMarkers();

  map.addListener("bounds_changed", updateMarkers);
  map.addListener("dragend", updateMarkers);
  map.addListener("resize", updateMarkers);
  map.addListener("zoom_changed", updateMarkers);

  map.addListener(
    "dblclick",
    function(e) {
      dblclick = true;
    });

  map.addListener(
    "click",
    function(e) {
      dblclick = false;
      setTimeout(clickHandler, 500, e);
    });
}

function init_mini(lat, lng) {
  gcmapGeo = new google.maps.Geocoder();

  var mapOptions = {
    zoomControlOptions: {
      style: google.maps.ZoomControlStyle.SMALL
    }
  };
  map = new google.maps.Map(document.getElementById("gcmapdiv"), mapOptions);
  var position = new google.maps.LatLng(lat, lng);
  map.setCenter(position);
  map.setZoom(16);

  miniMarker = new google.maps.Marker(
    {position: position});
  miniMarker.setMap(map);
}
