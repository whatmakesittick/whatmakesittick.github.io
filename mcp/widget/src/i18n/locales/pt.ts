import type { WidgetStrings } from '../strings.ts';

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
  watching: 'Assistindo',
  scrollLeft: 'Rolar para a esquerda',
  scrollRight: 'Rolar para a direita',
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

export default pt;
