/**
 * The cover's plum-and-orange duotone as an SVG gradient map: each pixel's luminance mixes the shadow colour (dark) into the
 * light colour (bright). The colours come from --cover-duo-shadow / --cover-duo-light through the .cover-duo-* classes, and a
 * photo opts in with `filter: url(#<id>)`. The svg is sized to nothing rather than display: none, which would switch it off.
 */
export function DuotoneFilter({ id }: { id: string }) {
  return (
    <svg className="cover-duotone" focusable="false" aria-hidden="true">
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0" result="lum" />
        <feComponentTransfer in="lum" result="inv"><feFuncR type="table" tableValues="1 0" /><feFuncG type="table" tableValues="1 0" /><feFuncB type="table" tableValues="1 0" /></feComponentTransfer>
        <feFlood className="cover-duo-light" result="light" />
        <feFlood className="cover-duo-shadow" result="shadow" />
        <feComposite in="lum" in2="light" operator="arithmetic" k1="1" result="lit" />
        <feComposite in="inv" in2="shadow" operator="arithmetic" k1="1" result="shade" />
        <feComposite in="lit" in2="shade" operator="arithmetic" k2="1" k3="1" />
      </filter>
    </svg>
  );
}
