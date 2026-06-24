"use strict";

window.HX_I18N = window.HX_I18N || {};
window.HX_I18N.be = {
  'app.title':'Hexashift',
  'lang.label':'Мова',
  'lang.name':'Беларуская',

  /* Header */
  'header.howToPlay':'Як гуляць',
  'theme.group':'Тэма',
  'theme.light':'Светлая тэма',
  'theme.system':'Сістэмная тэма',
  'theme.dark':'Цёмная тэма',

  /* Help panel */
  'help.region':'Як гуляць',
  'help.heading':'Як гуляць у Hexashift',
  'help.goal':'<strong>Мэта:</strong> Расстаўце ўсе 24 каляровыя трохвугольнікі так, каб кожны з шасці вялікіх сектарных трохвугольнікаў быў адным суцэльным колерам.',
  'help.moving':'<strong>Перамяшчэнне фішак:</strong> Дошка падзелена на шэсць <em>палавін</em> (па два радкі кожная) уздоўж трох восяў. Націсніце на стрэлку за межамі шасцікутніка, каб зрушыць гэту палавіну на адзін трохвугольнік уздоўж восі. Трохвугольнікі, якія выходзяць за адзін канец, з\'яўляюцца з другога боку.',
  'help.hovering':'<strong>Навядзенне</strong> на стрэлку вылучае трохвугольнікі, якія будуць рухацца.',
  'help.buttons':'<strong>Адмяніць</strong> адкатвае вашы ходы; <strong>Падказка</strong> мігае прапанаванай стрэлкай. <strong>Новая гульня</strong> перамешвае новую задачу. Каб перазапусціць — <strong>абнавіце</strong> старонку.',
  'help.difficulty':'<strong>Складанасць</strong> вызначае колькасць крокаў перамешвання ў пачатку — менш крокаў азначае больш просты галаваломку, бліжэй да вырашанага стану.',
  'help.share':'Вы таксама можаце <strong>падзяліцца галаваломкай</strong>, скапіраваўшы спасылку ўнізе — яна кадуе дакладную пачатковую дошку, каб сябар мог паспрабаваць той жа набор.',
  'help.letsPlay':'Пагуляем!',

  /* Board + HUD */
  'board.aria':'Дошка Hexashift',
  'hud.moves':'Ходы',
  'btn.new':'Новая гульня',
  'btn.undo':'Адмяніць',
  'btn.hint':'Падказка',
  'difficulty.label':'Складанасць',

  /* Share + footer */
  'share.label':'Падзяліцца галаваломкай',
  'share.copy':'Капіраваць спасылку',
  'share.copied':'Скапіравана!',
  'footer.github':'GitHub',

  /* Win dialog */
  'win.heading':'Вырашана!',
  'win.playAgain':'Гуляць зноў',
  'win.msg':(p)=>{
    const n=p.moves;
    const form=n%10===1&&n%100!==11?'ход':n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'хады':'хадоў';
    return `Вы вырашылі галаваломку за ${n} ${form}.`;
  },

  /* Arrow tooltips */
  'half.Top':'верхні',
  'half.Bottom':'ніжні',
  'half.Upper-right':'верхне-правы',
  'half.Upper-left':'верхне-левы',
  'half.Lower-left':'ніжне-левы',
  'half.Lower-right':'ніжне-правы',
  'arrow.dir.right':'управа',
  'arrow.dir.left':'улева',
  'arrow.dir.up':'уверх',
  'arrow.dir.down':'уніз',
  'arrow.title':(p)=>`Перасунуць ${p.half} палавіну ${p.dir}`,

  /* Difficulty options */
  'difficulty.option':(p)=>{
    const n=p.n;
    const form=n%10===1&&n%100!==11?'крок':n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'крокі':'крокаў';
    return `На ${n} ${form}`;
  },
};
