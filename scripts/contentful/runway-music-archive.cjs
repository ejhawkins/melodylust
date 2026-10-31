// Runway Music Archive content model: designers, the shows they made, and the songs those shows played.
// Run once against a new space (it creates the three content types; it doesn't touch entries):
//   npx contentful-cli login
//   npx contentful-cli space migration --space-id <space id> scripts/contentful/runway-music-archive.cjs
// The site reads published songs through src/lib/runway-archive.functions.ts.

const https = [{ regexp: { pattern: '^https://\\S+$' }, message: 'A full https:// link.' }];

module.exports = function (migration) {
  const designer = migration.createContentType('runwayDesigner')
    .name('Designer')
    .description('A creative director. The photo shows in the player’s portrait circle, credited as its licence asks.')
    .displayField('name');
  designer.createField('name').name('Name').type('Symbol').required(true).validations([{ unique: true }]);
  designer.createField('wikipedia').name('Wikipedia link').type('Symbol').required(true).validations(https);
  designer.createField('photo').name('Photo').type('Link').linkType('Asset')
    .validations([{ linkMimetypeGroup: ['image'] }]);
  designer.createField('photoCredit').name('Photo credit').type('Symbol');
  designer.createField('photoLicence').name('Photo licence').type('Symbol');
  designer.createField('photoSource').name('Photo source link').type('Symbol').validations(https);
  designer.changeFieldControl('photoCredit', 'builtin', 'singleLine', { helpText: 'The photographer, e.g. Cory M. Grenier. Leave empty for your own photos.' });
  designer.changeFieldControl('photoLicence', 'builtin', 'singleLine', { helpText: 'e.g. CC BY-SA 2.0' });
  designer.changeFieldControl('photoSource', 'builtin', 'urlEditor', { helpText: 'The Wikimedia Commons file page, for example.' });

  const show = migration.createContentType('runwayShow')
    .name('Show')
    .description('One runway show: house, season and the designers behind it, with its first looks on Tagwalk.')
    .displayField('name');
  show.createField('name').name('Name').type('Symbol').required(true);
  show.createField('house').name('House').type('Symbol').required(true);
  show.createField('season').name('Season').type('Symbol').required(true);
  show.createField('year').name('Year').type('Integer').required(true).validations([{ range: { min: 1950, max: 2100 } }]);
  show.createField('designers').name('Designers').type('Array').required(true)
    .validations([{ size: { min: 1 } }])
    .items({ type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['runwayDesigner'] }] });
  show.createField('looks').name('First looks on Tagwalk').type('Array')
    .validations([{ size: { max: 5 } }])
    .items({ type: 'Symbol', validations: https });
  show.changeFieldControl('name', 'builtin', 'singleLine', { helpText: 'For finding it here, e.g. Prada SS21 Womenswear.' });
  show.changeFieldControl('season', 'builtin', 'singleLine', { helpText: 'As the player shows it: Spring/Summer, Fall/Winter, Resort, Summer…' });
  show.changeFieldControl('looks', 'builtin', 'listInput', { helpText: 'Up to five Tagwalk look links, in runway order, separated by commas. Links only: the player never shows Tagwalk’s photos.' });

  const song = migration.createContentType('runwaySong')
    .name('Song')
    .description('A song a show played, as the player queues it.')
    .displayField('title');
  song.createField('title').name('Title').type('Symbol').required(true);
  song.createField('version').name('Version').type('Symbol');
  song.createField('artist').name('Artist').type('Symbol').required(true);
  song.createField('category').name('Category').type('Symbol').required(true)
    .validations([{ in: ['A', 'B', 'C', 'D'] }]);
  song.createField('bpm').name('BPM').type('Integer').validations([{ range: { min: 1, max: 300 } }]);
  song.createField('spotify').name('Spotify track link').type('Symbol').required(true)
    .validations([{ regexp: { pattern: '(^|track[/:])[A-Za-z0-9]{22}($|[?#/])' }, message: 'A Spotify track link, e.g. https://open.spotify.com/track/…' }]);
  song.createField('show').name('Show').type('Link').linkType('Entry').required(true)
    .validations([{ linkContentType: ['runwayShow'] }]);
  song.createField('sources').name('Sources').type('Array')
    .items({ type: 'Symbol', validations: https });
  song.createField('order').name('Order').type('Integer');
  song.changeFieldControl('version', 'builtin', 'singleLine', { helpText: 'The release’s version, e.g. Prada SS21 Womenswear Version. Leave empty for the original.' });
  song.changeFieldControl('category', 'builtin', 'radio', { helpText: 'A Industrial · B Electro-pulse · C Post-punk · D Spatial' });
  song.changeFieldControl('sources', 'builtin', 'listInput', { helpText: 'Where you read that the show played it, separated by commas.' });
  song.changeFieldControl('order', 'builtin', 'numberEditor', { helpText: 'Lower plays first; songs without one follow, oldest first.' });
};
