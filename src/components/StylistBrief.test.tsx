import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { StylistBriefFields, StylistBriefPanel } from "./StylistBrief";
import { emptyBrief, readBrief, type StylistBrief } from "@/lib/stylist-brief";

afterEach(cleanup);

function Harness({ onBrief }: { onBrief: (b: StylistBrief) => void }) {
  const [b, setB] = useState(emptyBrief);
  return <StylistBriefFields value={b} onChange={next => { setB(next); onBrief(next); }} />;
}

describe("stylist brief", () => {
  it("toggles answers on and off, one heel at a time", () => {
    let brief = emptyBrief();
    render(<Harness onBrief={b => { brief = b; }} />);
    fireEvent.click(screen.getByRole("button", { name: "Date night" }));
    fireEvent.click(screen.getByRole("radio", { name: "Forest green" }));
    fireEvent.click(screen.getByRole("radio", { name: "Mid" }));
    fireEvent.click(screen.getByRole("radio", { name: "High" }));
    fireEvent.click(screen.getByRole("switch", { name: "Made for walking" }));
    expect(brief).toMatchObject({ occasions: ["Date night"], leadColor: "Forest green", heel: "High", walkable: true });
    fireEvent.click(screen.getByRole("radio", { name: "High" }));
    fireEvent.click(screen.getByRole("button", { name: "Date night" }));
    expect(brief).toMatchObject({ occasions: [], heel: null });
  });

  it("shows only the answered questions on the board", () => {
    render(<StylistBriefPanel brief={readBrief({ occasions: ["Date night"], leadColor: "Forest green", colorOn: ["Dress"], layer: true })!} />);
    expect(screen.getByRole("heading", { name: "Stylist brief" })).toBeTruthy();
    expect(screen.getByText("Forest green on the dress")).toBeTruthy();
    expect(screen.getByText("Bring a layer")).toBeTruthy();
    expect(screen.queryByText("Dress level")).toBeNull();
    expect(screen.queryByText("Shoes")).toBeNull();
  });
});
