import type { WidgetStrings } from '../strings.ts';

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
  watching: 'Viendo ahora',
  scrollLeft: 'Desplazar a la izquierda',
  scrollRight: 'Desplazar a la derecha',
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

export default es;
