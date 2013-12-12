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

require_once(PLUGIN_DIR . 'gcmap.inc.php');

function plugin_gcmapposmod_init()
{
  plugin_gcmap_init();
}
?>
