"use strict";

window.HX_I18N = window.HX_I18N || {};
window.HX_I18N.be = {
  'app.title':'Hexashift',
  'lang.label':'Мова',
  'lang.name':'Беларуская',

  /* Header */
  'header.howToPlay':'Як гуляць',
  'theme.group':'Тэма',
  'theme.light':'Сьветлая тэма',
  'theme.system':'Сыстэмная тэма',
  'theme.dark':'Цёмная тэма',

  /* Help panel */
  'help.region':'Як гуляць',
  'help.heading':'Як гуляць у Hexashift',
  'help.goal':'<strong>Мэта:</strong> Растаўце ўсе 24 каляровыя трохкутнікі так, каб кожны з шасьці вялікіх сэктарных трохкутнікаў быў адным суцэльным колерам.',
  'help.moving':'<strong>Перасоўваньне фішак:</strong> Дошка падзеленая на шэсьць <em>паловаў</em> (па два радкі кожная) уздоўж трох восяў. Націсьніце на стрэлку за межамі шасьцікутніка, каб зрушыць гэтую палову на адзін трохкутнік уздоўж восі. Трохкутнікі, якія выходзяць з аднаго краю, зьяўляюцца зь іншага боку.',
  'help.hovering':'<strong>Навядзеньне</strong> на стрэлку падсьвятляе трохкутнікі, якія будуць рухацца.',
  'help.keyboard':'<strong>Клявіятура:</strong> Націсьніце <strong>1</strong> альбо <strong>2</strong>, каб выбраць палову (пераключэньне супраць альбо па гадзіньнікавай стрэлцы); пасьля выкарыстоўвайце клявішы з стрэлкамі (<strong>←↑↓→</strong>), каб перасунуць яе; <strong>Escape</strong> скасоўвае выбар. Кожная стрэлка таксама мае сваю гарачую клявішу — навядзіце на яе, каб убачыць.',
  'help.buttons':'<strong>„Вярнуць“</strong> вяртае адну хаду назад; <strong>„Падказка“</strong> міргае прапанаванаю стрэлкаю. <strong>„Новая гульня“</strong> стварае новую галаваломку. Каб пачаць нанова — <strong>абнавіце</strong> старонку.',
  'help.difficulty':'<strong>Складанасьць</strong> вызначае колькасць крокаў зьмешваньня на пачатку — менш крокаў азначае прасьцейшую галаваломку, бліжэйшую да разьвязанага стану.',
  'help.share':'Вы таксама можаце <strong>падзяліцца галаваломкай</strong>, скапіяваўшы спасылку ўнізе — яна кадуе дакладны пачатковы выгляд дошкі, каб сябар мог паспрабаваць той самы набор.',
  'help.letsPlay':'Гуляйма!',

  /* Board + HUD */
  'board.aria':'Дошка Hexashift',
  'hud.moves':'Хады',
  'btn.new':'Новая гульня',
  'btn.undo':'Вярнуць',
  'btn.hint':'Падказка',
  'difficulty.label':'Складанасьць',

  /* Share + footer */
  'share.label':'Падзяліцца галаваломкай',
  'share.copy':'Скапіяваць спасылку',
  'share.copied':'Скапіявана!',
  'footer.github':'GitHub',

  /* Win dialog */
  'win.heading':'Разьвязана!',
  'win.playAgain':'Згуляць зноў',
  'win.msg':(p)=>{
    const n=p.moves;
    const form=n%10===1&&n%100!==11?'хаду':n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'хады':'ходаў';
    return `Вы разьвязалі галаваломку за ${n} ${form}.`;
  },

  /* Arrow tooltips */
  'half.Top':'верхнюю',
  'half.Bottom':'ніжнюю',
  'half.Upper-right':'верхне-правую',
  'half.Upper-left':'верхне-левую',
  'half.Lower-left':'ніжне-левую',
  'half.Lower-right':'ніжне-правую',
  'arrow.dir.right':'ўправа',
  'arrow.dir.left':'ўлева',
  'arrow.dir.up':'ўверх',
  'arrow.dir.down':'ўніз',
  'arrow.title':(p)=>`Перасунуць ${p.half} палову ${p.dir}${p.key?' ('+p.key+')':''}`,

  /* Difficulty options */
  'difficulty.option':(p)=>{
    const n=p.n;
    const form=n%10===1&&n%100!==11?'крок':n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'крокі':'крокаў';
    return `За ${n} ${form}`;
  },
};
