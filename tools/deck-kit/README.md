# The deck kit

`assets/vendor/deck-kit.js` draws the main stage's slides. It is the deck from
[Tiny Little Office](https://github.com/aboard-io/tinylittleoffice) (MIT, Paul
Ford, Aboard), with the sheet and diagram apps a slide can hold, built into one
plain script because this site has no build step. Its license is at the top of
that file and must stay there.

`entry.ts` says what is taken and adds the Human Shaped colors. `build.sh`
rebuilds it from the commit it pins. Change that commit on purpose, then look
at real slides on the stage: the bundle is generated, so nobody edits it by hand.
