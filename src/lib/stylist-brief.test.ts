import { describe, expect, it } from "vitest";
import { briefLines, briefSchema, emptyBrief, isEmptyBrief, readBrief } from "./stylist-brief";

describe("stylist brief", () => {
  it("starts empty and treats an empty brief as no brief", () => {
    expect(isEmptyBrief(emptyBrief())).toBe(true);
    expect(readBrief(null)).toBeNull();
    expect(readBrief({})).toBeNull();
  });

  it("reads the Forest Green date-night brief as labelled lines, in a fixed order", () => {
    const b = readBrief({ occasions: ["Date night"], dressLevel: "Dressed up", leadColor: "Forest green", colorOn: ["Dress"],
      heel: "Mid", walkable: true, season: "Mild", layer: true })!;
    expect(briefLines(b)).toEqual([
      { label: "Occasion", value: "Date night" },
      { label: "Dress level", value: "Dressed up" },
      { label: "Lead colour", value: "Forest green on the dress" },
      { label: "Shoes", value: "Mid heel, made for walking" },
      { label: "Season", value: "Mild, bring a layer" },
    ]);
  });

  it("keeps half-answered questions readable", () => {
    expect(briefLines(readBrief({ walkable: true })!)).toEqual([{ label: "Shoes", value: "Made for walking" }]);
    expect(briefLines(readBrief({ colorOn: ["Top", "Accessories"] })!)).toEqual([{ label: "Lead colour", value: "On the top, accessories" }]);
    expect(briefLines(readBrief({ heel: "Flat", silhouettes: ["Fluid", "Fitted"], build: "Separates" })!)).toEqual([
      { label: "Silhouette", value: "Fitted · Fluid · separates" },
      { label: "Shoes", value: "Flat" },
    ]);
  });

  it("drops repeats, tidies the avoid line, and refuses anything off the list", () => {
    const b = briefSchema.parse({ occasions: ["Work", "Date night", "Work"], avoid: "  no   sequins \n" });
    expect(b.occasions).toEqual(["Date night", "Work"]);
    expect(b.avoid).toBe("no sequins");
    expect(briefSchema.safeParse({ dressLevel: "Pyjamas" }).success).toBe(false);
    expect(briefSchema.safeParse({ extra: 1 }).success).toBe(false);
    expect(briefSchema.safeParse({ avoid: "x".repeat(141) }).success).toBe(false);
    expect(readBrief({ dressLevel: "Pyjamas" })).toBeNull();
  });
});
