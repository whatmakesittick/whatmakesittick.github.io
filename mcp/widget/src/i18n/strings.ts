import type { LanguageCode } from '../../../../src/core/i18n/languages.ts';

const en = {
  brand: 'What makes it tick',
  play: 'Play',
  pause: 'Pause',
  resetCamera: 'Reset camera',
  openOnSite: 'Open on site',
  openOnSiteShort: 'Site',
  fullscreen: 'Show the model full screen',
  exitFullscreen: 'Exit fullscreen',
  chapterIndex: (n: string, total: string) => `Chapter ${n} / ${total}`,
  prevChapter: 'Previous chapter',
  nextChapter: 'Next chapter',
  readMore: 'Read more',
  readLess: 'Show less',
  nextNamed: (chapter: string) => `Next: ${chapter}`,
  exploreMore: 'More explainers',
  count: (n: number) => `${n} explainers`,
  explainers: (n: number) => `${n} explainers`,
  watching: 'Watching',
  scrollLeft: 'Scroll left',
  scrollRight: 'Scroll right',
  close: 'Close',
  timeline: 'Timeline',
  chapters: 'Chapters',
  loading: {
    title: 'Building the 3D scene',
    body: 'The model is drawn in your browser.',
    progress: 'Loading 3D model',
  },
  noWebgl: {
    title: "3D isn't available here",
    body: "This chat can't run WebGL, so you're seeing a still. The chapters below still work.",
    cta: 'Open the 3D version',
    chip: 'Still image',
  },
  error: {
    title: "The 3D scene didn't load",
    body: "The model files couldn't be fetched. Check your connection and try again.",
    retry: 'Try again',
  },
  unknown: 'Pick an explainer',
  chapterOnSite: 'The full text of this chapter is on the site.',
};

type Widen<T> = T extends (...args: infer A) => string
  ? (...args: A) => string
  : T extends object
    ? { readonly [K in keyof T]: Widen<T[K]> }
    : string;

export type Strings = Widen<typeof en>;

export const CORE_KEYS = {
  brand: 'catalogue.title',
  play: 'controls.play',
  pause: 'controls.pause',
  resetCamera: 'controls.resetCamera',
  fullscreen: 'stage.expand',
  exploreMore: 'page.moreExplainers',
} as const satisfies Partial<Record<keyof Strings, string>>;

export type CoreKey = keyof typeof CORE_KEYS;

export type WidgetStrings = Omit<Strings, CoreKey>;

function ukExplainers(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} пояснення`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} пояснення`;
  return `${n} пояснень`;
}

const uk: WidgetStrings = {
  openOnSite: 'Відкрити на сайті',
  openOnSiteShort: 'Сайт',
  exitFullscreen: 'Вийти з повноекранного режиму',
  chapterIndex: (n, total) => `Розділ ${n} / ${total}`,
  prevChapter: 'Попередній розділ',
  nextChapter: 'Наступний розділ',
  readMore: 'Читати далі',
  readLess: 'Згорнути',
  nextNamed: (chapter) => `Далі: ${chapter}`,
  count: ukExplainers,
  explainers: ukExplainers,
  watching: 'Зараз відкрито',
  scrollLeft: 'Прокрутити ліворуч',
  scrollRight: 'Прокрутити праворуч',
  close: 'Закрити',
  timeline: 'Шкала часу',
  chapters: 'Розділи',
  loading: {
    title: 'Будуємо 3D-сцену',
    body: 'Модель малюється у вашому браузері.',
    progress: 'Завантаження 3D-моделі',
  },
  noWebgl: {
    title: '3D тут недоступне',
    body: 'Цей чат не підтримує WebGL, тому ви бачите статичне зображення. Розділи нижче працюють як завжди.',
    cta: 'Відкрити 3D-версію',
    chip: 'Статичне зображення',
  },
  error: {
    title: '3D-сцена не завантажилася',
    body: 'Не вдалося отримати файли моделі. Перевірте з’єднання й спробуйте ще раз.',
    retry: 'Спробувати ще раз',
  },
  unknown: 'Виберіть пояснення',
  chapterOnSite: 'Повний текст цього розділу є на сайті.',
};

const deExplainers = (n: number) => (n === 1 ? '1 Erklärung' : `${n} Erklärungen`);

const de: WidgetStrings = {
  openOnSite: 'Auf der Website öffnen',
  openOnSiteShort: 'Website',
  exitFullscreen: 'Vollbild beenden',
  chapterIndex: (n, total) => `Kapitel ${n} / ${total}`,
  prevChapter: 'Vorheriges Kapitel',
  nextChapter: 'Nächstes Kapitel',
  readMore: 'Weiterlesen',
  readLess: 'Weniger anzeigen',
  nextNamed: (chapter) => `Als Nächstes: ${chapter}`,
  count: deExplainers,
  explainers: deExplainers,
  watching: 'Wird angezeigt',
  scrollLeft: 'Nach links scrollen',
  scrollRight: 'Nach rechts scrollen',
  close: 'Schließen',
  timeline: 'Zeitleiste',
  chapters: 'Kapitel',
  loading: {
    title: '3D-Szene wird aufgebaut',
    body: 'Das Modell wird in Ihrem Browser gezeichnet.',
    progress: '3D-Modell wird geladen',
  },
  noWebgl: {
    title: '3D ist hier nicht verfügbar',
    body: 'Dieser Chat kann kein WebGL ausführen, deshalb sehen Sie ein Standbild. Die Kapitel unten funktionieren trotzdem.',
    cta: '3D-Version öffnen',
    chip: 'Standbild',
  },
  error: {
    title: 'Die 3D-Szene wurde nicht geladen',
    body: 'Die Modelldateien konnten nicht abgerufen werden. Prüfen Sie Ihre Verbindung und versuchen Sie es noch einmal.',
    retry: 'Noch einmal versuchen',
  },
  unknown: 'Wählen Sie eine Erklärung',
  chapterOnSite: 'Den vollständigen Text dieses Kapitels finden Sie auf der Website.',
};

const esExplainers = (n: number) => (n === 1 ? '1 explicación' : `${n} explicaciones`);

const es: WidgetStrings = {
  openOnSite: 'Abrir en el sitio',
  openOnSiteShort: 'Sitio',
  exitFullscreen: 'Salir de pantalla completa',
  chapterIndex: (n, total) => `Capítulo ${n} / ${total}`,
  prevChapter: 'Capítulo anterior',
  nextChapter: 'Capítulo siguiente',
  readMore: 'Leer más',
  readLess: 'Ver menos',
  nextNamed: (chapter) => `Siguiente: ${chapter}`,
  count: esExplainers,
  explainers: esExplainers,
  watching: 'Viendo ahora',
  scrollLeft: 'Desplazar a la izquierda',
  scrollRight: 'Desplazar a la derecha',
  close: 'Cerrar',
  timeline: 'Línea de tiempo',
  chapters: 'Capítulos',
  loading: {
    title: 'Montando la escena 3D',
    body: 'El modelo se dibuja en tu navegador.',
    progress: 'Cargando el modelo 3D',
  },
  noWebgl: {
    title: 'El 3D no está disponible aquí',
    body: 'Este chat no puede ejecutar WebGL, así que ves una imagen fija. Los capítulos de abajo siguen funcionando.',
    cta: 'Abrir la versión 3D',
    chip: 'Imagen fija',
  },
  error: {
    title: 'La escena 3D no se ha cargado',
    body: 'No se han podido descargar los archivos del modelo. Revisa tu conexión y vuelve a intentarlo.',
    retry: 'Volver a intentarlo',
  },
  unknown: 'Elige una explicación',
  chapterOnSite: 'El texto completo de este capítulo está en el sitio.',
};

const frExplainers = (n: number) => (n === 1 ? '1 explication' : `${n} explications`);

const fr: WidgetStrings = {
  openOnSite: 'Ouvrir sur le site',
  openOnSiteShort: 'Site',
  exitFullscreen: 'Quitter le plein écran',
  chapterIndex: (n, total) => `Chapitre ${n} / ${total}`,
  prevChapter: 'Chapitre précédent',
  nextChapter: 'Chapitre suivant',
  readMore: 'Lire la suite',
  readLess: 'Afficher moins',
  nextNamed: (chapter) => `Ensuite\u00a0: ${chapter}`,
  count: frExplainers,
  explainers: frExplainers,
  watching: 'En cours',
  scrollLeft: 'Faire défiler vers la gauche',
  scrollRight: 'Faire défiler vers la droite',
  close: 'Fermer',
  timeline: 'Chronologie',
  chapters: 'Chapitres',
  loading: {
    title: 'Construction de la scène 3D',
    body: 'Le modèle est dessiné dans votre navigateur.',
    progress: 'Chargement du modèle 3D',
  },
  noWebgl: {
    title: 'La 3D n’est pas disponible ici',
    body: 'Ce chat ne peut pas exécuter WebGL, vous voyez donc une image fixe. Les chapitres ci-dessous fonctionnent quand même.',
    cta: 'Ouvrir la version 3D',
    chip: 'Image fixe',
  },
  error: {
    title: 'La scène 3D ne s’est pas chargée',
    body: 'Impossible de récupérer les fichiers du modèle. Vérifiez votre connexion et réessayez.',
    retry: 'Réessayer',
  },
  unknown: 'Choisissez une explication',
  chapterOnSite: 'Le texte complet de ce chapitre se trouve sur le site.',
};

const ptExplainers = (n: number) => (n === 1 ? '1 explicação' : `${n} explicações`);

const pt: WidgetStrings = {
  openOnSite: 'Abrir no site',
  openOnSiteShort: 'Site',
  exitFullscreen: 'Sair da tela cheia',
  chapterIndex: (n, total) => `Capítulo ${n} / ${total}`,
  prevChapter: 'Capítulo anterior',
  nextChapter: 'Próximo capítulo',
  readMore: 'Ler mais',
  readLess: 'Mostrar menos',
  nextNamed: (chapter) => `A seguir: ${chapter}`,
  count: ptExplainers,
  explainers: ptExplainers,
  watching: 'Assistindo',
  scrollLeft: 'Rolar para a esquerda',
  scrollRight: 'Rolar para a direita',
  close: 'Fechar',
  timeline: 'Linha do tempo',
  chapters: 'Capítulos',
  loading: {
    title: 'Montando a cena 3D',
    body: 'O modelo é desenhado no seu navegador.',
    progress: 'Carregando o modelo 3D',
  },
  noWebgl: {
    title: 'O 3D não está disponível aqui',
    body: 'Este chat não consegue rodar WebGL, então você está vendo uma imagem estática. Os capítulos abaixo continuam funcionando.',
    cta: 'Abrir a versão 3D',
    chip: 'Imagem estática',
  },
  error: {
    title: 'A cena 3D não carregou',
    body: 'Não foi possível baixar os arquivos do modelo. Verifique sua conexão e tente de novo.',
    retry: 'Tentar de novo',
  },
  unknown: 'Escolha uma explicação',
  chapterOnSite: 'O texto completo deste capítulo está no site.',
};

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
  explainers: (n) => `${n} 篇图解`,
  watching: '正在观看',
  scrollLeft: '向左滚动',
  scrollRight: '向右滚动',
  close: '关闭',
  timeline: '时间轴',
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

export const STRINGS: { en: Strings } & Record<Exclude<LanguageCode, 'en'>, WidgetStrings> = {
  en,
  uk,
  de,
  es,
  fr,
  pt,
  ja,
  zh,
};

function lookup(source: unknown, path: string): string | undefined {
  const value = path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined,
      source,
    );
  return typeof value === 'string' && value !== '' ? value : undefined;
}

export function stringsFor(lang: LanguageCode, core?: object): Strings {
  const resolved = { ...STRINGS.en, ...STRINGS[lang] } as Record<string, unknown>;
  for (const [key, path] of Object.entries(CORE_KEYS)) {
    resolved[key] = lookup(core, path) ?? STRINGS.en[key as CoreKey];
  }
  return resolved as Strings;
}
