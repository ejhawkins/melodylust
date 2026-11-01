-- More varied designer radio: independents, Japanese and Belgian avant-garde, London club and emerging labels.
-- Their priorities fall between the big houses' (which end in 0), so each daily batch of 10 mixes the two.

update public.designers as designer
set radio_priority = seed.priority
from (values
  ('raf-simons', 995),
  ('comme-des-garcons', 985),
  ('walesbonner', 975),
  ('ann-demeulemeester', 965),
  ('martine-rose', 955),
  ('undercover', 945),
  ('marc-jacobs', 935),
  ('vivienne-westwood', 925),
  ('yohji-yamamoto', 915),
  ('thom-browne', 905),
  ('helmut-lang', 895),
  ('marine-serre', 885),
  ('telfar', 875),
  ('simone-rocha', 865),
  ('issey-miyake', 855),
  ('craig-green', 845),
  ('coperni', 835),
  ('off-white', 825),
  ('junya-watanabe', 815),
  ('j-w-anderson', 805)
) as seed(source_id, priority)
where designer.source = 'vogue-runway'
  and designer.source_id = seed.source_id;
