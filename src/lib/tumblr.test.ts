import { describe, expect, it } from "vitest";
import { formatDay, mapTumblrPosts } from "./tumblr";

// One Oct 2026, 00:00 UTC
const T0 = 1790812800;

const payload = {
  meta: { status: 200, msg: "OK" },
  response: {
    posts: [
      {
        id: 1,
        post_url: "https://melodylust.tumblr.com/post/1",
        type: "photo",
        timestamp: T0,
        tags: ["outfit", "belts"],
        content: [
          {
            type: "image",
            alt: "Navy argyle knit and a tartan skirt",
            media: [
              { url: "https://64.media/2048.jpg", width: 2048, height: 2560 },
              { url: "https://64.media/1280.jpg", width: 1280, height: 1600 },
              { url: "https://64.media/640.jpg", width: 640, height: 800 },
            ],
          },
          { type: "text", text: "Three belts, *one* opinion. [see it](https://example.com)" },
        ],
        summary: "Three belts, one opinion.",
      },
      {
        id: 2,
        post_url: "https://melodylust.tumblr.com/post/2",
        type: "text",
        timestamp: T0 - 86400,
        title: "The art of not trying too hard",
        body: "<p>A leather jacket. Your favourite jeans. &amp; a little attitude.</p>",
      },
      {
        id: 3,
        post_url: "https://melodylust.tumblr.com/post/3",
        type: "quote",
        timestamp: T0 - 172800,
        quote: "<p>Style is a way to say hello without speaking.</p>",
        source: '<a href="https://example.com">Apparel Arts</a>',
      },
      {
        id: 4,
        post_url: "https://melodylust.tumblr.com/post/4",
        type: "link",
        timestamp: T0 - 259200,
        link_url: "https://example.com",
        link_text: "Thrift finds",
        link_description: "<p>Six coats, one rail.</p>",
      },
      {
        id: 5,
        post_url: "https://melodylust.tumblr.com/post/5",
        type: "video",
        timestamp: T0 - 345600,
        video_thumbnail_url: "https://64.media/thumb.jpg",
        content: [{ type: "video" }],
      },
      { id: 6, type: "text", title: "A post with no address" },
    ],
  },
};

describe("mapTumblrPosts", () => {
  const posts = mapTumblrPosts(payload);

  it("drops entries without a link and keeps the rest in order", () => {
    expect(posts).toHaveLength(5);
    expect(posts.map((p) => p.id)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("picks a sensible image size and keeps the alt text", () => {
    const photo = posts[0];
    expect(photo?.image).toBe("https://64.media/640.jpg");
    expect(photo?.alt).toBe("Navy argyle knit and a tartan skirt");
    expect(photo?.type).toBe("photo");
  });

  it("strips formatting markers and link syntax from text", () => {
    const photo = posts[0];
    expect(photo?.excerpt).toContain("Three belts, one opinion");
    expect(photo?.excerpt).not.toMatch(/[*_[]/);
  });

  it("reads legacy HTML fields", () => {
    const text = posts[1];
    expect(text?.title).toBe("The art of not trying too hard");
    expect(text?.excerpt).toBe("A leather jacket. Your favourite jeans. & a little attitude.");
  });

  it("shows a quote in full", () => {
    expect(posts[2]?.excerpt).toBe("Style is a way to say hello without speaking.");
  });

  it("uses the link label as the title", () => {
    expect(posts[3]?.title).toBe("Thrift finds");
    expect(posts[3]?.excerpt).toBe("Six coats, one rail.");
  });

  it("falls back to the video thumbnail for an image", () => {
    expect(posts[4]?.image).toBe("https://64.media/thumb.jpg");
  });

  it("handles an empty or unexpected payload", () => {
    expect(mapTumblrPosts(null)).toEqual([]);
    expect(mapTumblrPosts({})).toEqual([]);
    expect(mapTumblrPosts({ response: { posts: "not an array" } })).toEqual([]);
  });
});

describe("formatDay", () => {
  it("renders a stable date regardless of the machine's timezone", () => {
    expect(formatDay(T0)).toBe("01 Oct 2026");
    expect(formatDay(T0 - 86400)).toBe("30 Sep 2026");
    expect(formatDay(0)).toBe("");
  });
});

describe("legacy HTML bodies", () => {
  const posts = mapTumblrPosts({
    response: {
      posts: [
        {
          id: 7,
          post_url: "https://melodylust.tumblr.com/post/7",
          type: "text",
          timestamp: T0,
          title: "",
          summary:
            '"Autumn is a second spring when every leaf is a flower."\nSept. 22 is the fall equinox.',
          body: '<div class="npf_row"><figure class="tmblr-full"><img src="https://64.media.tumblr.com/leaf.jpg" alt="Maple leaves on wet pavement"/><span class="tmblr-alt-text-helper">ALT</span></figure></div><p>&ldquo;Autumn is a second spring when every leaf is a flower.&rdquo;</p>',
        },
      ],
    },
  });

  it("keeps Tumblr's hidden ALT label out of the heading", () => {
    expect(posts[0]?.title).not.toContain("ALT");
    expect(posts[0]?.title).toContain("Autumn is a second spring");
  });

  it("never leaks raw entity codes into card text", () => {
    expect(posts[0]?.excerpt).not.toContain("&ldquo;");
    expect(posts[0]?.excerpt).toContain("fall equinox");
  });

  it("decodes the curly quotes inside the body markup", () => {
    const decoded = mapTumblrPosts({
      response: {
        posts: [
          {
            id: 71,
            post_url: "https://melodylust.tumblr.com/post/71",
            type: "text",
            timestamp: T0,
            body: "<p>&ldquo;Autumn is a second spring.&rdquo;</p>",
          },
        ],
      },
    });
    expect(decoded[0]?.title).toBe("\u201CAutumn is a second spring.\u201D");
  });

  it("finds the photo kept inline in the body", () => {
    expect(posts[0]?.image).toBe("https://64.media.tumblr.com/leaf.jpg");
    expect(posts[0]?.alt).toBe("Maple leaves on wet pavement");
  });
});

describe("entity decoding", () => {
  const posts = mapTumblrPosts({
    response: {
      posts: [
        {
          id: 8,
          post_url: "https://melodylust.tumblr.com/post/8",
          type: "text",
          timestamp: T0,
          title: "Caf&#233; au lait &amp; cr&ecirc;me",
          body: "<p>10&#8217;000 &mdash; sold out</p>",
        },
      ],
    },
  });

  it("decodes numeric and named entities", () => {
    expect(posts[0]?.title).toBe("Café au lait & crême");
    expect(posts[0]?.excerpt).toBe("10’000 — sold out");
  });

  it("leaves an unknown entity alone rather than losing text", () => {
    expect(mapTumblrPosts({ response: { posts: [{ id: 9, url: "https://x.tumblr.com/post/9", title: "&notreal;", body: "<p>ok</p>" }] } })[0]?.title).toBe("&notreal;");
  });
});

describe("credit-style summaries", () => {
  const posts = mapTumblrPosts({
    response: {
      posts: [
        {
          id: 10,
          post_url: "https://turnto-pg28.tumblr.com/post/10",
          type: "photo",
          timestamp: T0,
          summary:
            "Publication: Dior Magazine Photographer: Paolo Roversi Model: Iza Michalska and Estee Rammant",
          photos: [{ orig_size: { url: "https://64.media.tumblr.com/dior.jpg", width: 640, height: 800 } }],
        },
        {
          id: 11,
          post_url: "https://turnto-pg28.tumblr.com/post/11",
          type: "text",
          timestamp: T0,
          summary: "Three belts, one opinion. Wear the colour.",
        },
        { id: 12, post_url: "https://turnto-pg28.tumblr.com/post/12", type: "photo", timestamp: T0 },
      ],
    },
  });

  it("pulls a short heading out of a credit block", () => {
    expect(posts[0]?.title).toBe("Dior Magazine");
    expect(posts[0]?.excerpt).toContain("Photographer: Paolo Roversi");
    expect(posts[0]?.excerpt).not.toContain("Dior Magazine");
  });

  it("leaves an ordinary sentence as the heading", () => {
    expect(posts[1]?.title).toBe("Three belts, one opinion. Wear the colour.");
    expect(posts[1]?.excerpt).toBe("");
  });

  it("still names a captionless photo", () => {
    expect(posts[2]?.title).toBe("Photo");
  });

  it("keeps a one-letter magazine name as the heading", () => {
    const one = mapTumblrPosts({
      response: {
        posts: [
          {
            id: 13,
            post_url: "https://turnto-pg28.tumblr.com/post/13",
            type: "photo",
            timestamp: T0,
            summary:
              "Publication: V\nPhotographer: Ben Toms stylist: Robbie Spencer Model: Gemma Ward\nWho knew there were so many ways.",
          },
        ],
      },
    });
    expect(one[0]?.title).toBe("V");
    expect(one[0]?.excerpt).toContain("Photographer: Ben Toms");
    expect(one[0]?.excerpt).not.toContain("Publication");
  });
});

