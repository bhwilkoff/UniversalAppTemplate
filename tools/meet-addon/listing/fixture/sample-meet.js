// A stand-in for Google's Meet add-ons SDK, for the Marketplace screenshots
// only (tools/mark/make_listing.py). The side panel gets a sample meeting
// code; the main stage gets the view named in its address (?scene=), built
// with the add-on's own AddonLib so it is what the panel would send. After
// the panel draws, ?tab= opens one of its activities. SAMPLE DATA.
(function () {
  var params = new URLSearchParams(location.search);
  var now = Date.now();
  var VIEWS = {
    welcome: { mode: 'welcome', part: null, welcome: { cohort: 'Human-shaped software, a sample cohort', week: 2, title: 'Prove it',
      challenge: 'Put the first screen of your app on a real device, and bring back one decision your values changed.',
      first: { name: 'Arrive', what: 'One line each in the chat: what you shipped this week, or where you are stuck.' } } },
    check: { mode: 'check', part: { key: 'show', name: 'Show what you brought back', endsAt: now + 22 * 60000 },
      prompt: 'How sure are you that your first screen does what you wrote down?',
      choices: ['Sure, I tried it', 'Mostly', 'Not yet', 'I am stuck'],
      count: { total: 6, rows: [{ label: 'Sure, I tried it', count: 2, share: 33 }, { label: 'Mostly', count: 3, share: 50 }, { label: 'Not yet', count: 1, share: 17 }, { label: 'I am stuck', count: 0, share: 0 }] } },
    item: { mode: 'item', part: { key: 'show', name: 'Show what you brought back', endsAt: now + 18 * 60000 },
      who: 'Rosa', what: 'Her app, running at example.org/bird-log', note: 'The first screen, running on my phone.' }
  };
  var listeners = [];
  var side = {
    on: function () {},
    getMeetingInfo: function () { return Promise.resolve({ meetingCode: 'abc-defg-hij' }); },
    startActivity: function () { return Promise.resolve(); },
    notifyMainStage: function () { return Promise.resolve(); },
    endActivity: function () { return Promise.resolve(); }
  };
  var stage = {
    on: function (name, fn) {
      if (name !== 'frameToFrameMessage') return;
      listeners.push(fn);
      var view = VIEWS[params.get('scene') || 'welcome'];
      setTimeout(function () { fn({ payload: window.AddonLib.stageMessage(view) }); }, 200);
    },
    notifySidePanel: function () { return Promise.resolve(); }
  };
  window.meet = { addon: { createAddonSession: function () {
    return Promise.resolve({ createSidePanelClient: function () { return Promise.resolve(side); },
                             createMainStageClient: function () { return Promise.resolve(stage); } });
  } } };

  var tab = params.get('tab');
  if (tab) {
    var tries = 0;
    var t = setInterval(function () {
      var b = Array.prototype.find.call(document.querySelectorAll('[data-launcher] button'), function (x) { return x.textContent.trim().indexOf(tab) === 0; });
      if (b || ++tries > 40) { clearInterval(t); if (b) b.click(); }
    }, 100);
  }
})();
