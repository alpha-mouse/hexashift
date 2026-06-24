"use strict";

window.HX_I18N = window.HX_I18N || {};
window.HX_I18N.es = {
  'app.title':'Hexashift',
  'lang.label':'Idioma',
  'lang.name':'Español',

  /* Header */
  'header.howToPlay':'Cómo jugar',
  'theme.group':'Tema',
  'theme.light':'Tema claro',
  'theme.system':'Tema del sistema',
  'theme.dark':'Tema oscuro',

  /* Help panel */
  'help.region':'Cómo jugar',
  'help.heading':'Cómo jugar Hexashift',
  'help.goal':'<strong>Objetivo:</strong> Ordena los 24 triángulos de colores para que cada uno de los seis sectores triangulares grandes sea de un color sólido.',
  'help.moving':'<strong>Mover piezas:</strong> El tablero se divide en seis <em>mitades</em> (dos filas cada una) a lo largo de tres ejes. Haz clic en una flecha fuera del hexágono para deslizar esa mitad un triángulo a lo largo de su eje. Los triángulos que salen por un extremo aparecen por el otro.',
  'help.hovering':'<strong>Pasar el cursor</strong> sobre una flecha resalta los triángulos que se moverán.',
  'help.buttons':'<strong>Deshacer</strong> retrocede tus movimientos; <strong>Pista</strong> parpadea una flecha sugerida. <strong>Nueva partida</strong> genera un nuevo puzzle. Para reiniciar — <strong>recarga</strong> la página.',
  'help.difficulty':'<strong>La dificultad</strong> establece cuántos movimientos de mezcla se aplican al inicio — menos movimientos significa un puzzle más simple, más cerca del estado resuelto.',
  'help.share':'También puedes <strong>compartir un puzzle</strong> copiando el enlace al final — codifica el tablero exacto de inicio para que un amigo pueda intentar el mismo puzzle.',
  'help.letsPlay':'¡A jugar!',

  /* Board + HUD */
  'board.aria':'Tablero de Hexashift',
  'hud.moves':'Movimientos',
  'btn.new':'Nueva partida',
  'btn.undo':'Deshacer',
  'btn.hint':'Pista',
  'difficulty.label':'Dificultad',

  /* Share + footer */
  'share.label':'Comparte este puzzle',
  'share.copy':'Copiar enlace',
  'share.copied':'¡Copiado!',
  'footer.github':'GitHub',

  /* Win dialog */
  'win.heading':'¡Resuelto!',
  'win.playAgain':'Jugar de nuevo',
  'win.msg':(p)=>`Ordenaste el hexágono en ${p.moves} ${p.moves===1?'movimiento':'movimientos'}.`,

  /* Arrow tooltips */
  'half.Top':'superior',
  'half.Bottom':'inferior',
  'half.Upper-right':'superior derecha',
  'half.Upper-left':'superior izquierda',
  'half.Lower-left':'inferior izquierda',
  'half.Lower-right':'inferior derecha',
  'arrow.dir.right':'derecha',
  'arrow.dir.left':'izquierda',
  'arrow.dir.up':'arriba',
  'arrow.dir.down':'abajo',
  'arrow.title':(p)=>`Deslizar mitad ${p.half} hacia ${p.dir}`,

  /* Difficulty options */
  'difficulty.option':(p)=>`A ${p.n} del objetivo`,
};
