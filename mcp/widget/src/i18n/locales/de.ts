import type { WidgetStrings } from '../strings.ts';

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
  watching: 'Wird angezeigt',
  scrollLeft: 'Nach links scrollen',
  scrollRight: 'Nach rechts scrollen',
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

export default de;
