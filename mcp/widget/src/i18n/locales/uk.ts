import type { WidgetStrings } from '../strings.ts';

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

export default uk;
