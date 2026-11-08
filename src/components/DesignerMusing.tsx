/** "Fashion Designer Musing": the issue's opening essay, set as a three-column magazine excerpt
 *  straight after the cover — why Melody Lust starts with music before the records below. */
export function DesignerMusing() {
  return (
    <section className="musing" id="musing" aria-labelledby="musing-title">
      <header className="musing-head">
        <h2 id="musing-title" className="musing-title">Fashion Designer <em>Musing</em></h2>
      </header>
      <div className="musing-columns">
        <p className="musing-lede">
          Every styling app solves the same problem: what should I buy. They measure you, match you, optimize you, and hand back a grid of products with nothing behind it. Nothing you’d save. Nothing you’d feel. Just fit.
        </p>
        <blockquote className="musing-pull" aria-hidden="true">
          <p>“The only data about you that’s actually about you.”</p>
        </blockquote>
        <p>
          Music has been fashion’s muse for sixty years — every subculture worth naming got its uniform from a sound. Melody Lust puts that back in the machine. We start with what you listen to, because it’s the only data about you that’s actually about you.<span className="musing-end" aria-hidden="true" />
        </p>
      </div>
    </section>
  );
}
