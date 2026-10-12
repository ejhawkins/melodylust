-- Stylist AI search data: the article tracker and the approved artist list.
CREATE TABLE public.articles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tracker_id text UNIQUE,
  url text NOT NULL,
  publication text NOT NULL,
  published_at text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  categories text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'approved'
);
GRANT SELECT ON public.articles TO anon;
GRANT SELECT ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved articles are public" ON public.articles FOR SELECT TO anon, authenticated USING (status = 'approved');

INSERT INTO public.articles (tracker_id, url, publication, published_at, title, summary, categories) VALUES
('1', 'https://www.harpersbazaar.com.sg/fashion/gwen-stefani-still-rocks-her-iconic-no-doubt-outfit-25-years-later?ai-allowed=1', 'Harper''s BAZAAR', '2020-12-09', 'Gwen Stefani Still Rocks Her Iconic No Doubt Outfit 25 Years Later', 'Gwen Stefani marks 25 years of No Doubt''s feminist anthem ''Just a Girl'' by recreating her iconic 1995 music video fashion look—featuring a cropped red-and-blue striped tank top, baggy blue track pants, pompadour ponytail, and signature red lipstick.', ARRAY['Fashion','Celebrity Style']::text[]),
('2', 'https://www.ellecanada.com/fashion/celebrity-style/best-celebrity-looks-weekend-one-coachella-2024', 'ELLE Canada', '2024-04-15', 'The Best-Dressed Stars at Coachella Weekend One', 'Recaps standout celebrity looks from Weekend One of Coachella 2024, spotlighting No Doubt frontwoman Gwen Stefani performing in a distressed plaid punk-rock ensemble alongside special guest Olivia Rodrigo in a vintage ''I Heart ND'' tank top and studded belt.', ARRAY['Fashion','Celebrity Style','Festivals']::text[]),
('3', 'https://elle.in/coachella-fits/', 'ELLE India', '2024-04-15', 'Our Top 15 Coachella Fits From The First Weekend', 'Curates top festival fashion outfits from Coachella 2024, spotlighting Gwen Stefani''s funky plaid jumpsuit paired with glittery Dr. Martens boots, as well as Olivia Rodrigo joining No Doubt''s stage branded in the band''s initials.', ARRAY['Fashion','Celebrity Style','Music Festivals']::text[]),
('4', 'https://harpersbazaar.com.au/celebrities-at-coachella-2024/', 'Harper''s BAZAAR Australia', '2024-04-15', 'The best celebrity fashion at Coachella 2024', 'Highlights major celebrity fashion moments at Coachella 2024, featuring Gwen Stefani''s punk-rock festival style during No Doubt''s reunion set on stage with Olivia Rodrigo.', ARRAY['Fashion','Celebrity Style','Festivals']::text[]),
('5', 'https://www.harpersbazaar.mx/celebridades/usher-con-394-mil-cristales-en-su-traje-off-white-para-el-show-de-medio-tiempo-del-super-bowl', 'Harper''s BAZAAR en Español', '2024-02-11', 'Usher con 394 mil cristales en su traje Off White para el show de medio tiempo del Super Bowl', 'Explores Usher''s multi-outfit fashion wardrobe at the 2024 Super Bowl LVIII Halftime Show, detailing his initial white Dolce & Gabbana jewel-adorned look with Portofino kicks, a custom Jacquie Aiche diamond pendant, and an Off-White biker suit encrusted with 394,000 crystals paired with bespoke roller skates.', ARRAY['Fashion','Celebrities','Menswear']::text[]),
('6', 'https://esquiresg.com/met-gala-2024-best-menswear-looks-red-carpet/', 'Esquire Singapore', '2024-05-07', 'Met Gala 2024: Only the Best Menswear Looks', 'Highlights leading menswear looks at the 2024 Met Gala (''The Garden of Time''), featuring Usher in an all-black custom Alexander McQueen design by Seán McGirr with a dramatic cape, wide-brim hat, and single red rose.', ARRAY['Fashion','Menswear','Red Carpet']::text[]),
('7', 'https://esquire.com.au/best-met-gala-looks-menswear', 'Esquire Australia', '2026-05-04', 'The 100 best dressed men in Met Gala history', 'Chronicles iconic menswear moments throughout Met Gala history, including Usher''s 2023 Karl Lagerfeld tribute red-carpet look designed by Bianca Saunders.', ARRAY['Celebrity Fashion','Menswear','Red Carpet']::text[]),
('8', 'https://harpersbazaar.com.au/met-gala-2024-after-parties/', 'Harper''s BAZAAR Australia', '2024-05-07', 'The best looks at the 2024 Met Gala after parties', 'Details after-party attire from the 2024 Met Gala, spotlighting Usher hosting his ''Secret Garden'' themed after-party at the Times Square Edition.', ARRAY['Celebrity Fashion','Parties']::text[]),
('9', 'https://elle.in/stories/the-best-dressed-pop-girlies-at-glastonbury-2025-9452705', 'ELLE India', '2025-07-01', 'The Best-Dressed Pop Girlies At Glastonbury 2025', 'Rounds up festival looks from Glastonbury 2025: Charli XCX turned an Alexander McQueen skull scarf into a halter top, Doechii wore custom Vivienne Westwood and Joy Crookes wore a safety-pinned gown by Jawara Alleyne, alongside Olivia Rodrigo, Lorde, PinkPantheress and Gracie Abrams.', ARRAY['Fashion','Celebrity Style','Festivals']::text[]),
('10', 'https://elle.in/charli-xcx-audacious-style/', 'ELLE India', '2024-08-21', 'Examining Charli XCX''s Audacious Style Beyond The Brat Aesthetic', 'Traces Charli XCX''s wardrobe beyond the Brat era: a sparkly Balenciaga dress, a Saint Laurent leather jacket at the brand''s pre-Oscars party, a patchwork vintage T-shirt gown by Marni at the 2024 Met Gala, Gaultier couture at the 2023 Fashion Awards and a Coperni hoodie-and-skirt set in Paris.', ARRAY['Fashion','Celebrity Style']::text[]),
('11', 'https://www.harpersbazaar.mx/moda/moda-brat-los-esenciales-para-vestir-con-lo-aesthetic-de-charli-xcx', 'Harper''s BAZAAR en Español', '2024-08-06', 'Moda Brat: los esenciales para vestir con lo aesthetic de Charli XCX', 'A Spanish-language guide to dressing in the Brat aesthetic popularised by Charli XCX''s album, from its signature neon green to her suggestion that a white tank top with no bra can be enough; no designer is credited with dressing her.', ARRAY['Fashion','Trends']::text[]),
('12', 'https://esquiresg.com/kid-cudi-is-letting-it-all-go/', 'Esquire Singapore', '2023-09-01', 'Kid Cudi is Letting it All Go', 'An interview with Kid Cudi about his debut Calvin Klein campaign, his own clothing line Members of the Rage and the varsity jackets he makes and wears, and listening to Ratatat and MGMT on photo shoots.', ARRAY['Menswear','Celebrity','Campaigns']::text[]),
('13', 'https://esquiresg.com/mens-skirts-are-ready-for-the-mainstream/', 'Esquire Singapore', '2023-05-29', 'Men''s Skirts Are Ready for the Mainstream', 'Argues the skirt has reached mainstream menswear, citing Kid Cudi in a Nirvana T-shirt and black maxi skirt, A$AP Rocky in a Givenchy leather skirt, Jaden Smith in Louis Vuitton and Thom Browne''s skirted tailoring, with runway precedents from Jean Paul Gaultier, Raf Simons and Rick Owens.', ARRAY['Menswear','Trends']::text[]),
('14', 'https://elle.in/hm-channels-brat-for-its-a-w-2024-collection/', 'ELLE India', '2024-09-20', 'HM Channels Brat For Its A/W 2024 Collection', 'Announces H&M''s autumn/winter 2024 collection featuring Charli XCX, following the retailer''s earlier collaboration with designer Anamika Khanna.', ARRAY['Fashion','Campaigns']::text[]),
('15', 'https://elle.in/fashion/olivia-rodrigo-giving-us-peak-pop-girlie-fashion-9453361', 'ELLE India', '2025-07-14', 'Olivia Rodrigo Is Giving Us Peak Pop Girlie Fashion', 'Charts Olivia Rodrigo''s recent stage style: a custom Dilara Fındıkoğlu corset and mini skirt at Glastonbury 2025, a custom Michael Schmidt sparkle set on the Guts World Tour, and a plaid skirt with a band tee when she joined Paramore at Coachella 2024, with a photo of No Doubt''s Gwen Stefani from the same festival.', ARRAY['Fashion','Celebrity Style','Music']::text[]),
('16', 'https://elle.in/fashion/the-super-bowl-halftime-costume-evolution-11089170', 'ELLE India', '2026-02-09', 'The Evolution Of The Super Bowl Halftime Costume', 'Looks back at three decades of Super Bowl halftime wardrobes, from Diana Ross''s gold coat and Katy Perry''s Jeremy Scott costumes to Rihanna''s red jumpsuit and Usher performing shirtless at the 2024 show.', ARRAY['Fashion','Music','Performance']::text[]),
('17', 'https://elle.in/culture/charli-xcxs-electric-coachella-set-included-duets-with-billie-eilish-and-lorde-8960118', 'ELLE India', '2025-04-14', 'Charli XCX''s Electric Coachella Set Included Duets With Billie Eilish and Lorde', 'Recaps Charli XCX''s 2025 Coachella set, where Billie Eilish joined her for the live debut of the Guess remix and Lorde sang Girl, So Confusing; at a party beforehand Charli wore a mesh tank, long skirt and boots with a Chanel handbag.', ARRAY['Music','Festivals','Celebrity Style']::text[]),
('18', 'https://elle.in/article/top-15-fashion-moments-from-met-gala-2021-first-edition/', 'ELLE India', '2021-09-14', 'Top 15 Fashion Moments From Met Gala 2021 First Edition', 'Picks the standout looks of the 2021 Met Gala, including Billie Eilish''s Oscar de la Renta ball gown with Cartier diamond earrings, Lil Nas X in layered Versace, A$AP Rocky draped in an ERL quilt and Rihanna in Balenciaga.', ARRAY['Fashion','Red Carpet']::text[]),
('19', 'https://esquiresg.com/met-gala-2025-red-carpet-best-looks/', 'Esquire Singapore', '2025-05-06', 'Met Gala 2025: Only the Best Tailored Looks', 'Highlights the tailoring at the 2025 Met Gala, from Usher in Ralph Lauren Purple Label and Pharrell Williams in Louis Vuitton to Grace Wales Bonner dressing Lewis Hamilton and Omar Apollo, Ozwald Boateng''s patterned suiting, Bad Bunny in Prada and Doja Cat in Marc Jacobs.', ARRAY['Menswear','Red Carpet']::text[]),
('20', 'https://esquiresg.com/bad-bunny-superbowl-zara/', 'Esquire Singapore', '2026-02-10', 'Bad Bunny''s Superbowl Outfit Proved That Zara Has Outgrown the High Street', 'Argues that Bad Bunny''s all-Zara Super Bowl halftime look, a cream mock jersey with matching trousers, marks the high-street brand''s arrival, contrasting earlier headliners Rihanna in Loewe and Usher in Dolce & Gabbana; Lady Gaga appeared in a Luar dress.', ARRAY['Fashion','Menswear','Performance']::text[]),
('21', 'https://harpersbazaar.com/culture/art-books-music/a64675338/usher-getting-ready-met-gala-2025-interview', 'Harper''s Bazaar', '2025-05-06', 'Usher’s 2025 Met Gala Look Was Inspired by the Harlem Renaissance—and His Grandfather', 'Usher wore custom Ralph Lauren Purple Label designed in collaboration with Polo Ralph Lauren creative director James Jeter for the 2025 Met Gala.', ARRAY['Fashion','Red Carpet','Celebrity Style']::text[]),
('22', 'https://harpersbazaar.com/celebrity/latest/a64673268/usher-2025-met-gala-red-carpet-photos', 'Harper''s Bazaar', '2025-05-05', 'Usher’s 2025 Met Gala Scarf Was a Dandy Touch Done Right', 'Usher arrived at the 2025 Met Gala in a classic black three-piece suit from Ralph Lauren paired with a white scarf; the article also references his 2024 custom Alexander McQueen look by Seán McGirr and a Jacob & Co. watch.', ARRAY['Red Carpet','Celebrity Style','Fashion']::text[]),
('23', 'https://harpersbazaar.com/culture/art-books-music/a46719320/usher-rollerskating-halftime-show-flippers-2024', 'Harper''s Bazaar', '2024-02-11', 'How Usher’s Super Bowl LVIII Show Put Roller-Rink Culture on the World Stage', 'Usher wore custom Off-White during his Super Bowl LVIII halftime show, and his dancers wore pieces from an official Usher and Flipper’s capsule created with Liberty Ross.', ARRAY['Music','Campaigns','Fashion']::text[]),
('24', 'https://esquire.com/style/mens-fashion/a46662297/usher-skims-mens-campaign', 'Esquire', '2024-02-06', 'Usher Is the New Face of Skims. Yeah, Man.', 'Usher is the new face of Skims and fronts the Skims Mens campaign, appearing in a range of Skims apparel.', ARRAY['Campaigns','Menswear','Fashion']::text[]),
('25', 'https://esquire.com/style/mens-fashion/a60708764/usher-met-gala-2024', 'Esquire', '2024-05-06', 'Usher Gets Theatrical in McQueen at the Met Gala', 'Usher wore a theatrical custom Alexander McQueen cloak-and-tux ensemble on the 2024 Met Gala red carpet.', ARRAY['Red Carpet','Fashion','Menswear']::text[]),
('26', 'https://elle.com/culture/celebrities/a65356587/usher-life-lessons-interview-2025', 'ELLE', '2025-07-16', 'Usher on Childhood Scents, Oprah’s Wisdom, and His Philosophy on Love', 'Usher is the face of Ralph’s Club New York Eau de Parfum from Ralph Lauren Fragrances, according to the interview.', ARRAY['Campaigns','Music','Celebrity Style']::text[]);

CREATE TABLE public.artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL,
  disambiguation text,
  genres text[] NOT NULL DEFAULT '{}',
  image_url text,
  source text NOT NULL DEFAULT 'melodylust',
  source_id text,
  status text NOT NULL DEFAULT 'approved'
);
CREATE INDEX artists_normalized_name_idx ON public.artists (normalized_name text_pattern_ops);
GRANT SELECT ON public.artists TO anon;
GRANT SELECT ON public.artists TO authenticated;
GRANT ALL ON public.artists TO service_role;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved artists are public" ON public.artists FOR SELECT TO anon, authenticated USING (status = 'approved');

INSERT INTO public.artists (name, normalized_name, genres) VALUES
('David Bowie', 'david bowie', ARRAY['rock','glam rock','art pop']::text[]),
('Brian Eno', 'brian eno', ARRAY['ambient','electronic','art rock']::text[]),
('Iggy Pop', 'iggy pop', ARRAY['punk rock','proto-punk']::text[]),
('Debbie Harry', 'debbie harry', ARRAY['new wave','punk rock','pop']::text[]),
('Grace Jones', 'grace jones', ARRAY['disco','new wave','reggae']::text[]),
('Nile Rodgers', 'nile rodgers', ARRAY['disco','funk','soul']::text[]),
('Solange', 'solange', ARRAY['r&b','soul','alternative']::text[]),
('Dev Hynes', 'dev hynes', ARRAY['r&b','indie','pop']::text[]),
('FKA twigs', 'fka twigs', ARRAY['art pop','electronic','r&b']::text[]),
('Tyler, the Creator', 'tyler the creator', ARRAY['hip hop','rap']::text[]),
('Kali Uchis', 'kali uchis', ARRAY['r&b','soul','pop']::text[]),
('Gwen Stefani', 'gwen stefani', ARRAY['pop','ska','rock']::text[]),
('No Doubt', 'no doubt', ARRAY['ska','rock','pop']::text[]),
('Usher', 'usher', ARRAY['r&b','pop','soul']::text[]),
('Charli XCX', 'charli xcx', ARRAY['pop','electronic','hyperpop']::text[]),
('Olivia Rodrigo', 'olivia rodrigo', ARRAY['pop','pop rock']::text[]),
('Billie Eilish', 'billie eilish', ARRAY['pop','electropop']::text[]),
('Lorde', 'lorde', ARRAY['pop','indie']::text[]),
('Kid Cudi', 'kid cudi', ARRAY['hip hop','rap']::text[]),
('Bad Bunny', 'bad bunny', ARRAY['reggaeton','latin trap']::text[]),
('Rihanna', 'rihanna', ARRAY['pop','r&b']::text[]),
('A$AP Rocky', 'a ap rocky', ARRAY['hip hop','rap']::text[]),
('Doechii', 'doechii', ARRAY['hip hop','rap']::text[]),
('Pharrell Williams', 'pharrell williams', ARRAY['pop','hip hop','funk']::text[]),
('Doja Cat', 'doja cat', ARRAY['pop','hip hop','r&b']::text[]),
('Lil Nas X', 'lil nas x', ARRAY['hip hop','pop']::text[]),
('Jaden Smith', 'jaden smith', ARRAY['hip hop','rap']::text[]),
('Katy Perry', 'katy perry', ARRAY['pop']::text[]),
('Diana Ross', 'diana ross', ARRAY['soul','disco','motown']::text[]),
('Lady Gaga', 'lady gaga', ARRAY['pop','dance']::text[]),
('PinkPantheress', 'pinkpantheress', ARRAY['pop','uk garage']::text[]),
('Gracie Abrams', 'gracie abrams', ARRAY['pop','indie']::text[]),
('Joy Crookes', 'joy crookes', ARRAY['soul','r&b']::text[]),
('Paramore', 'paramore', ARRAY['rock','pop punk']::text[]),
('MGMT', 'mgmt', ARRAY['indie','psychedelic']::text[]),
('Ratatat', 'ratatat', ARRAY['electronic','instrumental']::text[]),
('Nirvana', 'nirvana', ARRAY['grunge','rock']::text[]);