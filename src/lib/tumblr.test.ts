import { describe, expect, it } from 'vitest';
import { mapTumblrRss } from './tumblr';

const esc = (html: string) => html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Shaped like turnto-pg28.tumblr.com/rss: escaped HTML, several photos, then credits and a note.
const editorial = `<item><title>Publication: Dior MagazinePhotographer: Paolo RoversiModel: Iza...</title><description>${esc(
  '<img src="https://64.media.tumblr.com/a/tumblr_one_500.jpg"/><br/> <br/><img src="https://64.media.tumblr.com/b/tumblr_two_500.jpg"/><br/> <br/>' +
    '<h3 style="text-align: center;"><b>Publication:</b> Dior Magazine<br/><b>Photographer:</b> Paolo Roversi<br/><b><b>Model:</b> Iza Michalska </b></h3>\n\n' +
    '<p><!-- more --></p>\n\n<p>Pensive. I really like the oxford blood lip &amp; statement brows.</p>\n\n' +
    '<iframe width="500" height="315" src="https://www.youtube.com/embed/x" frameborder="0"></iframe>\n\n' +
    '<p style="display:none;">Can’t see the content? Visit the actual post!</p>',
)}</description><link>https://turnto-pg28.tumblr.com/post/614215563078729728</link><guid>https://turnto-pg28.tumblr.com/post/614215563078729728</guid><pubDate>Wed, 01 Apr 2020 13:20:07 -0400</pubDate><category>fashion</category><category>dior</category></item>`;

const cdata = `<item><title>Spring</title><description><![CDATA[<img src="https://64.media.tumblr.com/c/tumblr_three_500.jpg"/><h3><b>Publication:</b> Vogue Paris<br/><b>Stylist:</b> Emmanuelle Alt</h3>]]></description><link>https://turnto-pg28.tumblr.com/post/42/spring-issue</link><pubDate>Mon, 30 Mar 2020 12:20:04 -0400</pubDate></item>`;

const textOnly = `<item><title>Notes</title><description>${esc('<p>Words only, no picture.</p>')}</description><link>https://turnto-pg28.tumblr.com/post/7</link><pubDate>Fri, 06 Mar 2020 12:20:58 -0500</pubDate></item>`;

const feed = (...items: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>pg28</title><link>https://turnto-pg28.tumblr.com/</link>${items.join('')}</channel></rss>`;

describe('mapTumblrRss', () => {
  it('turns an editorial post into a card: first photo, publication as title, credits and note as excerpt', () => {
    const [post] = mapTumblrRss(feed(editorial));
    expect(post).toMatchObject({
      id: '614215563078729728',
      url: 'https://turnto-pg28.tumblr.com/post/614215563078729728',
      type: 'photo',
      title: 'Dior Magazine',
      image: 'https://64.media.tumblr.com/a/tumblr_one_500.jpg',
      timestamp: Date.parse('Wed, 01 Apr 2020 13:20:07 -0400') / 1000,
      tags: ['fashion', 'dior'],
    });
    expect(post?.excerpt).toContain('Photographer: Paolo Roversi');
    expect(post?.excerpt).toContain('oxford blood lip & statement brows');
  });

  it('leaves out comments, video embeds and hidden notes', () => {
    const [post] = mapTumblrRss(feed(editorial));
    expect(post?.excerpt).not.toMatch(/Can’t see the content|youtube|more/);
  });

  it('reads CDATA descriptions and post links that carry a slug', () => {
    const [post] = mapTumblrRss(feed(cdata));
    expect(post).toMatchObject({ id: '42', title: 'Vogue Paris', image: 'https://64.media.tumblr.com/c/tumblr_three_500.jpg' });
    expect(post?.excerpt).toBe('Stylist: Emmanuelle Alt');
  });

  it('keeps text posts without a photo, so the page can choose to show only images', () => {
    const posts = mapTumblrRss(feed(editorial, textOnly, cdata));
    expect(posts.map(p => p.id)).toEqual(['614215563078729728', '7', '42']);
    expect(posts[1]).toMatchObject({ type: 'text', image: null });
  });

  it('reads a heading that Tumblr\'s editor split into pieces', () => {
    const broken = `<item><description>${esc('<img src="https://64.media.tumblr.com/d/tumblr_four_500.jpg"/><br/> <br/><p><</p>\n\n<p>h3><b>Publication:</b> Elle\n<br/><b>Photographer:</b> Jason Kibbler')}</description><link>https://turnto-pg28.tumblr.com/post/9</link></item>`;
    const [post] = mapTumblrRss(feed(broken));
    expect(post).toMatchObject({ title: 'Elle', excerpt: 'Photographer: Jason Kibbler' });
  });

  it('returns nothing for an empty or unreadable feed', () => {
    expect(mapTumblrRss('')).toEqual([]);
    expect(mapTumblrRss('<html>Not found</html>')).toEqual([]);
  });
});
