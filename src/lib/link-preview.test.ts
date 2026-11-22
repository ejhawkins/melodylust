import { describe, expect, it } from "vitest";
import { parseLinkPreview } from "./link-preview";

describe("link preview", () => {
  it("reads the share card tags", () => {
    const html = `<html><head><title>Fallback</title>
      <meta property="og:title" content="Why every pop star wants a uniform again">
      <meta property="og:description" content="  Matching sets,   on repeat. ">
      <meta property="og:image" content="/img/uniform.jpg"><meta property="og:site_name" content="The Face"></head></html>`;
    expect(parseLinkPreview(html, "https://theface.com/style/uniform")).toEqual({
      url: "https://theface.com/style/uniform", title: "Why every pop star wants a uniform again",
      description: "Matching sets, on repeat.", image: "https://theface.com/img/uniform.jpg", site: "The Face",
    });
  });

  it("falls back to twitter tags, the page title and the host", () => {
    const html = `<head><title> Plain page </title><meta name="twitter:image" content="http://cdn.example.org/a.png"><meta name="description" content="About it"></head>`;
    expect(parseLinkPreview(html, "https://www.vogue.com/a")).toMatchObject({
      title: "Plain page", description: "About it", image: "https://cdn.example.org/a.png", site: "vogue.com",
    });
  });

  it("drops images that aren't web addresses", () => {
    expect(parseLinkPreview(`<meta property="og:image" content="javascript:alert(1)">`, "https://x.com/").image).toBe("");
    expect(parseLinkPreview(`<meta property="og:image" content="data:image/png;base64,AAAA">`, "https://x.com/").image).toBe("");
    expect(parseLinkPreview("<p>no head</p>", "https://x.com/")).toMatchObject({ title: "", image: "", site: "x.com" });
  });
});
