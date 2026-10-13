import type { WidgetStrings } from '../strings.ts';

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
  watching: 'En cours',
  scrollLeft: 'Faire défiler vers la gauche',
  scrollRight: 'Faire défiler vers la droite',
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

export default fr;
