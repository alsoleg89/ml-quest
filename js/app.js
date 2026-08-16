/* ML Quest — routes + boot */
'use strict';

App.route('map', Views.map);
App.route('day/:id', Views.day);
App.route('lesson/:id', Views.lesson);
App.route('quiz/:id', Views.quiz);
App.route('ex/:id', Views.exercise);
App.route('cards', Views.cards);
App.route('review/:deck/:n', Views.review);
App.route('bank', Views.bank);
App.route('boss/:id', Views.boss);
App.route('dojo', Views.dojo);
App.route('case/:id', Views.caseView);
App.route('play', Views.playground);
App.route('qa', Views.qa);

window.addEventListener('error', e => {
  if (e.message && e.message.includes('Script error')) return; // opaque CDN errors
  console.error(e);
});

App.boot();
