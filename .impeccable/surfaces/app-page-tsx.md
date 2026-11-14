---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/practice/page.tsx"]
---

# Zenith game surface (daily flight + practice)

Scope: the whole game app (`app/page.tsx` daily, `app/practice/page.tsx` unlimited). Visitor mode: Experience — the player is inside the game; the interface recedes behind the flight.

Audience/job: casual daily-puzzle players on phones, one ~3-minute flight a day, share the result. Constraints: PRODUCT.md. Must not echo krillion.io (no ocean/depth, no pixel font, no pixel-bordered glow buttons, no mascot, no vertical scrolling depth-marker strip).

## Direction contract

THESIS: You are the flight director of today's mission. Every answer is a burn command and a live trajectory plot climbs on a log-altitude axis from the pad to the Moon. Refuses the category default of a centered card with an input, a timer bar and a row of tiles.

OWN-WORLD: Dim flight-control room. Console black #0b0f14 ground with faint graticule; phosphor bone #e8e3d3 ink; burn orange #ff6b2c owns every live/active state and every burn segment; telemetry teal #7fd1c7 draws traces, gridlines and data. Barlow Condensed uppercase for labels and the prompt, Barlow for body, JetBrains Mono only for numeric telemetry. Hairline console rules, square bezels, no rounded cards, no glass, no glow halos.

STORY: The player understands in one look that rarer answers fly higher (altitude axis with real landmarks: Everest, Kármán line, ISS, GEO, Moon), believes each score is fair (crowd-to-nobody rarity readout after every burn), and launches today's flight, then shares the flight log.

FIRST VIEWPORT: Full-bleed trajectory plot owns ~70% of the screen: log altitude Y axis on the left, landmark gridlines labeled at the right edge, mission elapsed time X axis with 7 burn slots. Top bar: FLIGHT №, T-minus clock (mono, large), altitude readout. Bottom console strip: the prompt at poster scale in condensed caps, a command line input with a "Burn" key. Home state: same plot, empty, with today's flight number, three rule lines and a primary "Begin countdown" key on the console strip; "Practice" as the secondary key.

FORM: Mission Control launch telemetry console — my top-ranked grounded candidate (IMPECCABLE'S PICK, #1 on my ordered list), chosen over the roll. Seed key efd984b9.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: the burn — on an accepted answer the trace climbs from the current point to the new altitude as an orange burn segment drawn along the path (stroke-dashoffset), landmark gridlines it crosses flash teal → bone with their label, then the trace coasts teal. A miss draws a flat dashed coast segment.
Motion grammar: exponential ease-out, one authored moment per burn; reduced-motion jumps to end states.
