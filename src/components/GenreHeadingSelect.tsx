import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** A genre picker set in the mood-heading type: Bodoni capitals with a hairline chevron and the
 *  thin rule underneath. It only holds the choice for now; nothing on the page listens to it yet. */
export function GenreHeadingSelect({ genres }: { genres: readonly string[] }) {
  const [genre, setGenre] = useState("All genres");
  return <div className="genre-heading">
    <Select value={genre} onValueChange={setGenre}>
      <SelectTrigger className="genre-heading-trigger" aria-label="Choose a genre"><SelectValue /></SelectTrigger>
      <SelectContent className="genre-heading-menu">
        {["All genres", ...genres].map(g => <SelectItem className="genre-heading-option" key={g} value={g}>{g}</SelectItem>)}
      </SelectContent>
    </Select>
    <span className="genre-heading-rule" aria-hidden="true" />
  </div>;
}
