var wikiURL;

var map = null;

var markerManager = null;

var gcmapGeo = null;

var markerObjs = null;

var prevNewPlace = null;

var editMode = false;

var request = null;

function gcmap_modify_toggle() {
  if (markerObjs == null) return;

  if (editMode) {
    for (var i in markerObjs) {
      markerObjs[i].disableDragging();
    }
    document.getElementById('gcmap_modify_message').innerHTML = "";
    editMode = false;
  } else {
    for (var i in markerObjs) {
      markerObjs[i].enableDragging();
    }
    document.getElementById('gcmap_modify_message').innerHTML = "位置修正モード オン";
    editMode = true;
  }
}

// クイックジャンプ用コード
function gcmap_op_quickjmp(groupId) {
  var groups = document.getElementsByTagName('p');
  //document.getElementById('gcmap_message').innerHTML = groups.length;
  for (var i = 0; i < groups.length; i++) {
    var group = groups.item(i);
    if(group.getAttribute('name') == 'gcmap_quickjmp_group') {
      var openButton = document.getElementById('open_' + group.id);
      if(group.id == ('gcmap_quickjmp_group_' + groupId)) {
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
  document.getElementById('gcmap_message').innerHTML = "検索中";
  gcmapGeo.getLatLng(
    address,
    function(point) {
      if (!point) {
        document.getElementById('gcmap_message').innerHTML = address + "<br />見つかりませんでした";
      } else {
        map.setCenter(point, 13);
        document.getElementById('gcmap_message').innerHTML = address;
      }
    }
  );
  return false;
}

// URLエンコード (ecl.js使用)
function myencodeURL(str) {
  return EscapeEUCJP(str).replace("/\\s/g", "%20");
}

function openCreateWindow() {
  var ocForm = document.gcmapform;
  if(ocForm.lng.value == '' || ocForm.lat.value == '' || prevNewPlace == null) {
    document.getElementById('gcmap_message').innerHTML = "地図をクリックして位置を指定してください";
    return false;
  }
  if(ocForm.gcname.value == '') {
    document.getElementById('gcmap_message').innerHTML = "店名を入力してください";
    return false;
  }
  window.open(
    wikiURL+'?cmd=gcmapnew&lng='+ocForm.lng.value+
    '&lat='+ocForm.lat.value+
    '&gcname='+myencodeURL(ocForm.gcname.value)+
    '&page=gcmap/'+myencodeURL(ocForm.gcname.value),
    '_blank');
  document.getElementById('gcmap_message').innerHTML = "";
  return false;
}

function gcReload() {
  loadMarkers();
}

function Holder(gcname, page, loc, comm, marker) {
  this.gcname = gcname;
  this.page   = page;
  this.loc    = loc;
  this.comm   = comm;
  this.marker = marker;
  this.drawn  = false;
}

Holder.prototype.getMessage = function() {
  return '<a href="' + wikiURL + '?' + this.page + '" target="_blank"><strong>' + this.gcname + '</strong></a>' +
    (this.loc ? '<br><small>' + this.loc + '</small>' : '') +
    (this.comm ? '<br><br><div width="320px"><small>' + this.comm + '</small></div>' : '');
}

Holder.prototype.getMarker = function() {
  return this.marker;
}

Holder.prototype.isDrawn = function() {
  return this.drawn;
}

Holder.prototype.setDrawn = function(drawn) {
  this.drawn = drawn;
}

Holder.prototype.showInfoWindow = function() {
  this.getMarker().openInfoWindowHtml(this.getMessage(), {maxWidth: 320, noCloseOnClick: true});
}

Holder.prototype.disableDragging = function() {
  this.marker.disableDragging();
}

Holder.prototype.enableDragging = function() {
  this.marker.enableDragging();
}

function gcOpenAllBalloon() {
  for (var i in markerObjs) {
    markerObjs[i].showInfoWindow();
  }
}

function updateMarkers() {
  if (markerObjs == null) return;

  var area = map.getBounds();
  for (var i = 0; i < markerObjs.length; i++) {
    var marker = markerObjs[i].getMarker();
    var drawn = markerObjs[i].isDrawn();
    if (!area.containsLatLng(marker.getLatLng())) {
      if (drawn) {
	map.removeOverlay(marker);
	markerObjs[i].setDrawn(false);
      }
    } else {
      if (!drawn) {
	map.addOverlay(marker);
	markerObjs[i].setDrawn(true);
      }
    }
  }
}

function drawMarkers() {
  if (markerObjs == null) return;

  map.clearOverlays();

  var area = map.getBounds();
  for (var i = 0; i < markerObjs.length; i++) {
    var marker = markerObjs[i].getMarker();
    if (!area.containsLatLng(marker.getLatLng())) continue;

    map.addOverlay(marker);
    markerObjs[i].setDrawn(true);
  }
}

function loadMarkers() {
  document.getElementById('gcmap_message').innerHTML = "load";

  request.open("GET", wikiURL+'?cmd=gcmap', true);
  request.onreadystatechange = function() {
    if (request.readyState == 4) {
      document.getElementById('gcmap_message').innerHTML = "drawing";
      var xmlDoc = request.responseXML;
      var markers = xmlDoc.documentElement.getElementsByTagName("m");

      markerObjs = new Array();
      for (var i = 0; i < markers.length; i++) {
        var gcname = markers[i].getAttribute("name");
        var page   = markers[i].getAttribute("page");
        var loc    = markers[i].getAttribute("loc");
        var comm   = markers[i].getAttribute("comm");

	var lat = parseFloat(markers[i].getAttribute("lat"));
	var lng = parseFloat(markers[i].getAttribute("lng"));

        var icon = new GIcon(G_DEFAULT_ICON);
	if (markers[i].getAttribute("recomm") != null) {
	    icon.image = "http://gmaps-samples.googlecode.com/svn/trunk/markers/blue/blank.png";
	}

        var point = new GLatLng(lat, lng, false);

        var marker = new GMarker(point, {draggable: true, title: gcname, icon: icon});
	marker.disableDragging();
        var mobj = new Holder(gcname, page, loc, comm, marker);

        GEvent.bind(marker, 'click', mobj,
                    function() {
                      this.getMarker().openInfoWindowHtml(this.getMessage(), {maxWidth: 320});
                    });
        GEvent.bind(marker, 'dragend', mobj,
                    function() {
                      this.marker.openInfoWindowHtml(
                        '<strong>' + this.gcname + '</strong><br>' +
                        'をこの位置に修正する場合は、<br>' +
                        '<a href="'+wikiURL+'?cmd=gcmapposmod&page='+this.page+'&lng='+this.marker.getPoint().lng()+'&lat='+this.marker.getPoint().lat()+'" target="_blank"><strong>ここ</strong></a>をクリックしてWikiを開き、<br>' +
                        '更新してください');
                    });

        markerObjs.push(mobj);
      }

      drawMarkers();

      document.getElementById('gcmap_message').innerHTML = "";
    }
  }
  document.getElementById('gcmap_message').innerHTML = "ロード中";
  request.send(null);
  document.getElementById('gcmap_message').innerHTML = "ロード中2";
}

function init(lat, lng, zoom) {
  request = GXmlHttp.create();

  gcmapGeo = new GClientGeocoder();

  map = new GMap2(document.getElementById("gcmapdiv"));
  map.addMapType(G_PHYSICAL_MAP);
  var mapControl = new GHierarchicalMapTypeControl();
  map.addControl(mapControl);
  map.addControl(new GLargeMapControl());
  map.setCenter(new GLatLng(lat, lng), zoom);

  markerManager = new MarkerManager(map);

  loadMarkers();

  GEvent.addListener(map, "zoom", updateMarkers);
  GEvent.addListener(map, "moveend", updateMarkers);

  GEvent.addListener(map, 'click', function(overlay, point) {
    if (overlay) {
      if (prevNewPlace != overlay) {
        map.removeOverlay(prevNewPlace);
        prevNewPlace = null;
      }
    } else if (point) {
      document.gcmapform.lng.value = point.lng();
      document.gcmapform.lat.value = point.lat();

      var mobj = new Object();
      var newPlace = new GMarker(point, {title: "この位置を登録", draggable: true});
      mobj.marker = newPlace;

      GEvent.bind(newPlace, 'click', mobj,
        function() {
          this.marker.openInfoWindowHtml(
            'この位置に店を追加するには<br>' +
            '「店名」欄に店の名前を入力し<br>' +
            '「新規登録」ボタンを押してください');
        });
      GEvent.bind(newPlace, 'dragend', mobj,
        function() {
          document.gcmapform.lng.value = this.marker.getPoint().lng();
          document.gcmapform.lat.value = this.marker.getPoint().lat();
        });

      if (prevNewPlace != null) {
        map.removeOverlay(prevNewPlace);
      }
      map.addOverlay(newPlace);
      prevNewPlace = newPlace;
    }
  });
}

function init_mini(lat, lng) {
  //document.getElementById('gcmap_message').innerHTML = "初期化中";
  request = GXmlHttp.create();

  gcmapGeo = new GClientGeocoder();

  map = new GMap2(document.getElementById("gcmapdiv"));
  map.addControl(new GSmallMapControl());
  var point = new GLatLng(lat, lng);
  map.setCenter(point, 16);

  markerManager = new MarkerManager(map, 15);

  map.addOverlay(new GMarker(point));
}

//  LocalWords:  markerObjs
