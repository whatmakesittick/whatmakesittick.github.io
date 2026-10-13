import type { WidgetStrings } from '../strings.ts';

const zh: WidgetStrings = {
  openOnSite: '在网站上打开',
  openOnSiteShort: '网站',
  exitFullscreen: '退出全屏',
  chapterIndex: (n, total) => `第 ${n} 章 / 共 ${total} 章`,
  prevChapter: '上一章',
  nextChapter: '下一章',
  readMore: '展开阅读',
  readLess: '收起',
  nextNamed: (chapter) => `下一章：${chapter}`,
  count: (n) => `${n} 篇图解`,
  watching: '正在观看',
  scrollLeft: '向左滚动',
  scrollRight: '向右滚动',
  chapters: '章节',
  loading: {
    title: '正在搭建 3D 场景',
    body: '模型会在你的浏览器里绘制。',
    progress: '正在加载 3D 模型',
  },
  noWebgl: {
    title: '这里无法显示 3D',
    body: '这个聊天无法运行 WebGL，所以你看到的是静态图。下面的章节照常可用。',
    cta: '打开 3D 版本',
    chip: '静态图',
  },
  error: {
    title: '3D 场景没有加载出来',
    body: '无法获取模型文件。请检查网络连接，然后重试。',
    retry: '重试',
  },
  unknown: '选择一篇图解',
  chapterOnSite: '这一章的完整内容在网站上。',
};

export default zh;
