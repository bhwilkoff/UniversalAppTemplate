// The Google Cloud project that the Meet add-on belongs to. Meet's
// add-ons SDK needs its project number (a number, not a secret: it is in
// every page that loads the add-on) before the side panel or the main
// stage can open. Ben fills it in after step 3 of
// tools/meet-addon/README.md; until then the add-on says it is not set up.
window.MEET_ADDON = {
  cloudProjectNumber: ''
};
