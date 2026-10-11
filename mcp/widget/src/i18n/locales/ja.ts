import type { WidgetStrings } from '../strings.ts';

const ja: WidgetStrings = {
  openOnSite: 'サイトで開く',
  openOnSiteShort: 'サイト',
  exitFullscreen: '全画面を終了',
  chapterIndex: (n, total) => `第${n}章 / 全${total}章`,
  prevChapter: '前の章',
  nextChapter: '次の章',
  readMore: '続きを読む',
  readLess: '閉じる',
  nextNamed: (chapter) => `次は：${chapter}`,
  count: (n) => `${n}本の解説`,
  explainers: (n) => `${n}本の解説`,
  watching: '表示中',
  scrollLeft: '左へスクロール',
  scrollRight: '右へスクロール',
  close: '閉じる',
  timeline: 'タイムライン',
  chapters: '章',
  loading: {
    title: '3Dシーンを準備しています',
    body: 'モデルはお使いのブラウザで描画されます。',
    progress: '3Dモデルを読み込み中',
  },
  noWebgl: {
    title: 'ここでは3Dを表示できません',
    body: 'このチャットではWebGLが使えないため、静止画を表示しています。下の章はそのまま読めます。',
    cta: '3D版を開く',
    chip: '静止画',
  },
  error: {
    title: '3Dシーンを読み込めませんでした',
    body: 'モデルのファイルを取得できませんでした。接続を確認して、もう一度お試しください。',
    retry: 'もう一度試す',
  },
  unknown: '解説を選んでください',
  chapterOnSite: 'この章の全文はサイトで読めます。',
};

export default ja;
