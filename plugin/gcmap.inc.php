<?php
/*
 * PukiWiki gcmapプラグイン
 *
 * CopyRight 2005 Gulfweed GPL2
 * http://gulfweed.starlancer.org/
 *
 * 変更履歴:
 *  2005.08.04: プロトタイプ
 *
 * PukiWiki BugTrackプラグイン を参考に作成
 */

function plugin_gcmap_init()
{
  global $script;
  
  if($script == 'http://m.is2004.net/') {
    define('PLUGIN_GCMAP_APIKEY', 'ABQIAAAAOUYRkdyaHieW3_I3Hb1y4RRYlcO6cb13U8Yz-ENngYFN5a_XYhTS5r8YGBm1A_i9rrfmLBphKe98Zg');
  } else if($script == 'http://is2004.starlancer.org/gourmet/') {
    define('PLUGIN_GCMAP_APIKEY', 'ABQIAAAAOUYRkdyaHieW3_I3Hb1y4RSMrOIIFPQ0c9606AYCvDLjECvr0hQbiAYbgoooO9gQ6B1Ga_Q-AnXSJg');
  }
  
  $messages = array(
		    '_gcmap_plugin_gcname'    => '店名',
		    '_gcmap_plugin_latitude'  => '緯度',
		    '_gcmap_plugin_longitude' => '経度',
		    '_gcmap_plugin_location'  => '場所',
		    '_gcmap_plugin_comment'   => 'コメント',
		    '_gcmap_plugin_recomm'    => '推薦'
		    );
  set_plugin_messages($messages);
}

function plugin_gcmapnew_action()
{
  global $vars;
  if (PKWK_READONLY) die_message('PKWK_READONLY prohibits editing');
  
  $page = isset($vars['page']) ? $vars['page'] : '';
  
  check_editable($page, true, true);
  
  $postdata = @join('', get_source($page));
  if ($postdata == '') {
    $postdata = "*" . $vars[gcname] . "\n";
    $postdata .= "#gcmapmini\n";
    $postdata .= "-店名: " . $vars[gcname] . "\n";
    $postdata .= "//-緯度: " . $vars[lat] . "\n";
    $postdata .= "//-経度: " . $vars[lng] . "\n";
    $postdata .= "-場所: " . $vars[loc] . "\n";
    $postdata .= "-コメント: " . $vars[comment] . "\n";
    $postdata .= "----\n";
  }
  
  return array('msg'=>$_title_edit, 'body'=>edit_form($page, $postdata));
}

function plugin_gcmapposmod_action()
{
  global $vars;
  if (PKWK_READONLY) die_message('PKWK_READONLY prohibits editing');
  
  $page = isset($vars['page']) ? $vars['page'] : '';
  
  check_editable($page, true, true);
  
  //$postdata = @join('', get_source($page));
  $postdata = '';
  $src = get_source($page);
  foreach($src as $line) {
    if(preg_match('/\/\/-緯度:.*/', $line)) {
      $postdata .= "//-緯度: " . $vars[lat] . "\n";
    } else if(preg_match('/\/\/-経度:.*/', $line)) {
      $postdata .= "//-経度: " . $vars[lng] . "\n";
    } else {
      $postdata .= $line;
    }
  }
  
  return array('msg'=>$_title_edit, 'body'=>edit_form($page, $postdata));
}

function plugin_gcmapmini_convert()
{
  global $script, $vars;
  
  $APIKey = PLUGIN_GCMAP_APIKEY;
  
  list($gcname, $latitude, $longitude, $location, $comment, $recomm) = plugin_gcmap_pageinfo($vars['page']);
  $qSJIS = urlencode(mb_convert_encoding($gcname, "Shift_JIS", "auto"));
  $qUJIS = urlencode(mb_convert_encoding($gcname, "EUC-JP", "auto"));
  $qUTF8 = urlencode(mb_convert_encoding($gcname, "UTF-8", "auto"));
  
  return <<<EOD
    <div id="gcmapdiv" style="width: 400px; height: 300px"><noscript>Java Script をオンにして下さい</noscript></div>
    <a href="http://www.google.co.jp/search?q=$qUJIS&ie=EUC-JP">Google</a> / 
    <a href="http://gsearch.gnavi.co.jp/rest/search.php?key=$qUJIS">ぐるなび</a> / 
    <a href="http://r.tabelog.com/japan/0/0/lst/?sw=$qUTF8">食べログ</a>
    <script src="http://maps.google.co.jp/maps?file=api&amp;v=2&amp;key=$APIKey" type="text/javascript" charset="UTF-8"></script>
    <script src="http://gmaps-utility-library.googlecode.com/svn/trunk/markermanager/release/src/markermanager.js"></script>
    <script src="map/gcmap.js" type="text/javascript" charset="UTF-8"></script>
    <script src="map/ecl.js" type="text/javascript"></script>
    <script type="text/javascript" charset="EUC-JP">
    //<![CDATA[
    function load() {
      if(GBrowserIsCompatible()) {
        wikiURL = '$script';
        init_mini($latitude, $longitude);
      }
    }
    window.onload = load;
    window.unload = GUnload;
    //]]>
    </script>
EOD;
}

function plugin_gcmap_pageinfo($page, $no = NULL)
{
  $source = get_source($page);
  
  //$body = join("\n", $source);
  $gcname = $latitude = $longitude = $location = $comment = $recomm = '';
  $itemlist = array();
  foreach(array('gcname', 'latitude', 'longitude', 'location', 'comment', 'recomm') as $item) {
    $itemname = '_gcmap_plugin_' . $item;
    global $$itemname;
    $itemname = $$itemname;
    foreach($source as $body) {
      if (preg_match("/(-|\\/\\/-)\s*$itemname\s*:\s*(.*)\s*/", $body, $matches)) {
	$$item = htmlspecialchars($matches[2]);
      }
    }
  }
  
  return array($gcname, $latitude, $longitude, $location, $comment, $recomm);
}

function plugin_gcmap_action()
{
  $data = array();
  $pattern = 'gcmap/';
  $pattern_len = strlen($pattern);
  foreach (get_existpages() as $page) {
    if (strpos($page, $pattern) === 0) {
      $line = array(rawurlencode($page));
      $line = array_merge($line, plugin_gcmap_pageinfo($page));
      array_push($data, $line);
    }
  }
  
  $table_html = "";
  foreach ($data as $line) {
    list($page, $gcname, $latitude, $longitude, $location, $comment, $recomm) = $line;
    if($gcname == '' || $latitude == '' || $longitude == '') continue;
    $row = sprintf("<m page=\"%s\" name=\"%s\" lat=\"%s\" lng=\"%s\"",
		   htmlspecialchars($page),
		   htmlspecialchars($gcname),
		   htmlspecialchars($latitude),
		   htmlspecialchars($longitude));
    if($location != '') $row .= " loc=\"" . htmlspecialchars($location) . "\"";
    if($comment != '') $row .= " comm=\"" . htmlspecialchars($comment) . "\"";
    if($recomm != '') $row .= " recomm=\"" . htmlspecialchars($recomm) . "\"";
    $row .= "/>\n";
    $table_html .= $row;
  }
  
  pkwk_common_headers();
  header('Content-type: application/xml');
  print "<?xml version=\"1.0\" encoding=\"EUC-JP\" ?>\n";
  print "<d>\n";
  print $table_html;
  print "</d>\n";
  
  exit;
}

function plugin_gcmaplarge_convert()
{
  global $script, $vars;
  
  $APIKey = PLUGIN_GCMAP_APIKEY;
  
  $options = func_num_args() == 3 ? func_get_args() : array(35.681840, 139.739227, 12);
  $latitude  = $options[0];
  $longitude = $options[1];
  $zoom      = $options[2];
  
  return <<<EOD
    <link rel="stylesheet" href="map/gcmaplarge.css" type="text/css" charset="Shift_JIS" />
    
    <table border="0" cellspacing="0" cellpadding="4" width="100%">
    <tr>
    <td valign="top"><div id="gcmapdiv" style="width: 100%; height: 480px"><noscript>Java Script をオンにして下さい</noscript></div></td>
    <td valign="top" width="260px">
    
    <h3>クイックジャンプ</h3>
    <p class="gcmap_quickjmp">
      <a class="open_gcmap_quickjmp_group" href="javascript:gcmap_op_quickjmp('Hongo')"    id="open_gcmap_quickjmp_group_Hongo">本郷</a>
      <a class="open_gcmap_quickjmp_group" href="javascript:gcmap_op_quickjmp('Komaba')"   id="open_gcmap_quickjmp_group_Komaba">駒場</a>
      <a class="open_gcmap_quickjmp_group" href="javascript:gcmap_op_quickjmp('Akiba')"    id="open_gcmap_quickjmp_group_Akiba">秋葉原</a>
      <a class="open_gcmap_quickjmp_group" href="javascript:gcmap_op_quickjmp('Bukuro')"   id="open_gcmap_quickjmp_group_Bukuro">池袋</a>
      <a class="open_gcmap_quickjmp_group" href="javascript:gcmap_op_quickjmp('Shinjuku')" id="open_gcmap_quickjmp_group_Shinjuku">新宿</a>
      <a class="open_gcmap_quickjmp_group" href="javascript:gcmap_op_quickjmp('BayArea')"  id="open_gcmap_quickjmp_group_BayArea">Bay Area</a>
    </p>
    <p class="gcmap_quickjmp_group" name="gcmap_quickjmp_group" id="gcmap_quickjmp_group_Hongo" style="display:none">
      <a href="javascript:map.setCenter(new GLatLng(35.7129, 139.7594), 16)">正門</a>&nbsp;
      <a href="javascript:map.setCenter(new GLatLng(35.7070, 139.7605), 16)">本三</a>&nbsp;
      <a href="javascript:map.setCenter(new GLatLng(35.7178, 139.7651), 16)">根津</a>&nbsp;
      <a href="javascript:map.setCenter(new GLatLng(35.7078, 139.7729), 16)">上野広小路</a>&nbsp;
      <a href="javascript:map.setCenter(new GLatLng(35.7225, 139.7527), 16)">白山</a>
    </p>
    <p class="gcmap_quickjmp_group" name="gcmap_quickjmp_group" id="gcmap_quickjmp_group_Komaba" style="display:none">
      <a href="javascript:map.setCenter(new GLatLng(35.6596, 139.6852), 16)">駒場</a>&nbsp;
      <a href="javascript:map.setCenter(new GLatLng(35.6582, 139.7017), 16)">渋谷</a>
    </p>
    <p class="gcmap_quickjmp_group" name="gcmap_quickjmp_group" id="gcmap_quickjmp_group_Akiba" style="display:none">
      <a href="javascript:map.setCenter(new GLatLng(35.6958, 139.7581), 16)">神保町</a>&nbsp;
      <a href="javascript:map.setCenter(new GLatLng(35.7040, 139.7543), 16)">水道橋</a>&nbsp;
      <a href="javascript:map.setCenter(new GLatLng(35.6973, 139.7647), 16)">御茶ノ水</a>&nbsp;
      <a href="javascript:map.setCenter(new GLatLng(35.6983, 139.7712), 16)">秋葉原</a>
    </p>
    <p class="gcmap_quickjmp_group" name="gcmap_quickjmp_group" id="gcmap_quickjmp_group_Bukuro" style="display:none">
      <a href="javascript:map.setCenter(new GLatLng(35.7298, 139.7111), 16)">池袋</a>
    </p>
    <p class="gcmap_quickjmp_group" name="gcmap_quickjmp_group" id="gcmap_quickjmp_group_Shinjuku" style="display:none">
      <a href="javascript:map.setCenter(new GLatLng(35.6903, 139.7001), 16)">新宿</a>
    </p>
    <p class="gcmap_quickjmp_group" name="gcmap_quickjmp_group" id="gcmap_quickjmp_group_BayArea" style="display:none">
      <a href="javascript:map.setCenter(new GLatLng(37.378342, -122.031326), 11)">Sunnyvale</a>
    </p>
    
    <h3>表示</h3>
    <p>
      <form name="gcmapsearchform" onsubmit="return gcmap_geojmp()" onreset="return false">
        住所: <input type="text" value="" id="gcmap_search_address" />
        <input type="button" onclick="return gcmap_geojmp()" value="検索">
      </form>
    </p>
    <p>
      <a href="javascript:gcReload()">マーカーをリロード</a><br />
    </p>
    <p>
      <!--<a href="javascript:gcOpenAllBalloon()">バルーンをすべて開く</a><br />-->
    </p>
    
    <h3>新規登録</h3>
    <p>
      <form name="gcmapform" onsubmit="return openCreateWindow()" onreset="return false">
        店名: <input type="text" name="gcname" value=""/>
        <input type="hidden" name="lng" value=""/>
        <input type="hidden" name="lat" value=""/>
        <input type="button" onclick="return openCreateWindow()" value="新規登録"/>
      </form>
    </p>
    
    <h3>修正</h3>
    <p>
      <form>
        <input type="button" onclick="return gcmap_modify_toggle()" value="位置修正モード">
        <p id="gcmap_modify_message"></p>
      </form>
    </p>
    
    <p id="gcmap_message"></p>
    
    </td></tr>
    
    <tr><td colspan="2">
    <p class="gcmap_copyright">
      Powered by <a href="http://maps.google.co.jp/">Google マップ</a><br />
      gcmap plugin for PukiWiki &copy; 2007 <a href="http://gulfweed.starlancer.org/">Gulfweed</a><br />
    </p>
    </td></tr></table>
    
    <meta http-equiv="X-UA-Compatible" content="IE=EmulateIE7" />
    <script src="http://maps.google.co.jp/maps?file=api&amp;v=2&amp;key=$APIKey" type="text/javascript" charset="UTF-8"></script>
    <script src="http://gmaps-utility-library.googlecode.com/svn/trunk/markermanager/release/src/markermanager.js"></script>
    <script src="map/ecl.js" type="text/javascript"></script>
    <script src="map/gcmap.js" type="text/javascript" charset="UTF-8"></script>
    <script type="text/javascript" charset="EUC-JP">
    //<![CDATA[
    function resize() {
      document.getElementById('gcmapdiv').style.height = (document.documentElement.clientHeight * 0.9) + 'px';
    }
    function load() {
      resize();
      if(GBrowserIsCompatible()) {
        wikiURL = '$script';
        init($latitude, $longitude, $zoom);
        gcmap_op_quickjmp('Hongo');
        document.getElementById('gcmap_quickjmp_group_Hongo').style.display = 'block';
      }
    }
    window.onload = load;
    window.unload = GUnload;
    window.onresize = resize;
    //]]>
    </script>
EOD;
}

?>
