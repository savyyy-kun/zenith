// Prompt bank access, answer matching, daily seeding, storage, judge, sharing.
import type { Prompt, Verdict, FlightLog, Stats } from "./types";
import { ROUNDS, fmtAlt, lastLandmark, zoneAt } from "./flight.ts";

/** Full prompt bank (ported from the original index.html BANK). Answers common → rare, "/" separates spellings. */
export const BANK: Prompt[] = ([
  ["Name a fruit","apple,banana,orange,strawberry,grape/grapes,mango,watermelon,pineapple,peach,pear,cherry,blueberry,kiwi,lemon,raspberry,plum,pomegranate,coconut,papaya,apricot,fig,guava,lychee/litchi,passion fruit,dragon fruit/pitaya,persimmon,kumquat,durian,starfruit/carambola,jackfruit,quince,rambutan,mangosteen"],
  ["Name a vegetable","carrot,broccoli,potato,tomato,lettuce,cucumber,onion,spinach,corn,pepper/bell pepper,peas/pea,celery,cauliflower,cabbage,garlic,zucchini/courgette,mushroom,eggplant/aubergine,asparagus,kale,beet/beetroot,radish,pumpkin,sweet potato,brussels sprouts/brussel sprouts,leek,turnip,artichoke,okra,parsnip,bok choy/pak choi,fennel,kohlrabi,rutabaga/swede"],
  ["Name a dog breed","labrador/lab/labrador retriever,golden retriever,german shepherd,poodle,bulldog,beagle,husky/siberian husky,chihuahua,pug,dachshund,rottweiler,corgi,boxer,great dane,doberman/dobermann,shih tzu,border collie/collie,dalmatian,pomeranian,yorkie/yorkshire terrier,greyhound,french bulldog/frenchie,pit bull,saint bernard/st bernard,maltese,shiba inu/shiba,akita,basset hound,bloodhound,whippet,samoyed,newfoundland,weimaraner,vizsla,basenji"],
  ["Name a country in Europe","france,germany,italy,spain,united kingdom/uk/england/britain/great britain,portugal,greece,netherlands/holland,sweden,switzerland,ireland,poland,norway,belgium,austria,denmark,finland,ukraine,russia,czech republic/czechia,hungary,croatia,romania,iceland,turkey,bulgaria,serbia,slovakia,slovenia,estonia,lithuania,latvia,luxembourg,albania,malta,belarus,monaco,moldova,montenegro,north macedonia/macedonia,bosnia/bosnia and herzegovina,andorra,liechtenstein,san marino"],
  ["Name a country in Africa","south africa,egypt,nigeria,kenya,morocco,ethiopia,ghana,tanzania,uganda,algeria,zimbabwe,madagascar,senegal,sudan,somalia,tunisia,libya,cameroon,congo/dr congo/democratic republic of the congo,rwanda,angola,zambia,mali,namibia,botswana,mozambique,ivory coast/cote d'ivoire,niger,chad,liberia,sierra leone,malawi,togo,benin,gabon,burkina faso,eritrea,mauritania,lesotho,djibouti,eswatini/swaziland,comoros"],
  ["Name a country in Asia","china,japan,india,south korea/korea,thailand,vietnam,indonesia,philippines,pakistan,singapore,malaysia,north korea,nepal,mongolia,bangladesh,sri lanka,iran,iraq,saudi arabia,afghanistan,cambodia,israel,kazakhstan,myanmar/burma,laos,uzbekistan,bhutan,jordan,qatar,united arab emirates/uae,lebanon,syria,yemen,oman,kuwait,maldives,kyrgyzstan,tajikistan,turkmenistan,brunei,bahrain,timor leste/east timor"],
  ["Name a musical instrument","guitar,piano,drums/drum,violin,flute,trumpet,saxophone/sax,cello,bass/bass guitar,clarinet,harp,ukulele,trombone,banjo,harmonica,tuba,keyboard,accordion,oboe,xylophone,viola,mandolin,bagpipes/bagpipe,tambourine,french horn,organ,bassoon,triangle,recorder,sitar,kazoo,didgeridoo,theremin,harpsichord,lute,ocarina,zither,marimba"],
  ["Name a sport","soccer/football,basketball,baseball,tennis,american football,hockey/ice hockey,golf,swimming,volleyball,boxing,cricket,rugby,running/track/athletics,cycling,skiing,wrestling,gymnastics,badminton,table tennis/ping pong,surfing,snowboarding,lacrosse,bowling,archery,fencing,rowing,karate,judo,softball,polo,water polo,handball,squash,darts,curling,pickleball,bobsled/bobsleigh,biathlon"],
  ["Name a color","red,blue,green,yellow,purple,orange,pink,black,white,brown,gray/grey,violet,turquoise,gold,silver,teal,maroon,magenta,cyan,indigo,beige,navy,lavender,crimson,tan,olive,coral,scarlet,burgundy,mauve,fuchsia,periwinkle,chartreuse,vermilion/vermillion,ochre,cerulean,taupe,puce"],
  ["Name an animal you'd see at a zoo","lion,elephant,giraffe,tiger,monkey,zebra,bear,gorilla,penguin,hippo/hippopotamus,rhino/rhinoceros,panda,kangaroo,crocodile,snake,flamingo,cheetah,leopard,wolf,camel,chimpanzee/chimp,koala,polar bear,orangutan,meerkat,otter,sloth,lemur,ostrich,peacock,red panda,tapir,capybara,okapi,anteater,binturong"],
  ["Name a pizza topping","pepperoni,cheese/mozzarella,mushroom/mushrooms,sausage,pineapple,onion/onions,bacon,olives/olive/black olives,pepper/peppers/green pepper/bell pepper,ham,chicken,tomato,basil,spinach,jalapeno/jalapenos,anchovies/anchovy,garlic,beef/ground beef,salami,artichoke,feta,prosciutto,arugula/rocket,egg,corn/sweetcorn,pesto,goat cheese,truffle,capers,eggplant/aubergine,potato,tuna"],
  ["Name something found in a kitchen","fridge/refrigerator,oven,stove,sink,microwave,knife,pan/frying pan,pot,fork,spoon,plate,toaster,cup/mug,dishwasher,blender,bowl,table,kettle,cutting board/chopping board,spatula,whisk,freezer,cabinet/cupboard,counter/countertop,glass,colander/strainer,grater,ladle,tongs,rolling pin,can opener/tin opener,peeler,oven mitt/oven glove,timer,corkscrew,mortar and pestle,garlic press"],
  ["Name a chemical element","oxygen,hydrogen,gold,carbon,iron,helium,nitrogen,silver,sodium,copper,calcium,uranium,neon,lithium,potassium,mercury,lead,zinc,aluminum/aluminium,chlorine,sulfur/sulphur,titanium,platinum,magnesium,silicon,plutonium,nickel,tin,argon,phosphorus,fluorine,iodine,cobalt,radium,tungsten,krypton,xenon,boron,arsenic,chromium,beryllium,bismuth,gallium,cesium/caesium,osmium,francium,yttrium"],
  ["Name a US state","california,texas,new york,florida,hawaii,alaska,washington,colorado,arizona,nevada,ohio,georgia,illinois,michigan,oregon,virginia,massachusetts,pennsylvania,new jersey,north carolina,tennessee,utah,montana,kansas,kentucky,louisiana,minnesota,wisconsin,maine,idaho,oklahoma,iowa,alabama,missouri,indiana,maryland,vermont,mississippi,south carolina,new mexico,wyoming,nebraska,arkansas,connecticut,west virginia,north dakota,south dakota,new hampshire,rhode island,delaware"],
  ["Name a capital city","paris,london,tokyo,washington/washington dc,rome,berlin,madrid,beijing,moscow,cairo,ottawa,canberra,athens,dublin,mexico city,seoul,new delhi/delhi,amsterdam,vienna,lisbon,bangkok,stockholm,oslo,buenos aires,brussels,copenhagen,havana,nairobi,warsaw,lima,helsinki,prague,budapest,brasilia,jakarta,manila,kyiv/kiev,hanoi,bogota,santiago,wellington,reykjavik,ankara,tehran,baghdad,riyadh,kathmandu,addis ababa,ulaanbaatar,montevideo,tbilisi,thimphu"],
  ["Name a bird","eagle,robin,sparrow,pigeon,owl,crow,parrot,duck,penguin,seagull/gull,hawk,chicken,blue jay/bluejay,swan,flamingo,cardinal,hummingbird,goose,ostrich,peacock,turkey,raven,dove,woodpecker,falcon,pelican,finch,canary,vulture,stork,heron,toucan,magpie,swallow,emu,albatross,kingfisher,puffin,kiwi,wren,starling,condor,cassowary,hoopoe"],
  ["Name a flower","rose,tulip,daisy,sunflower,lily,orchid,daffodil,carnation,lavender,poppy,violet,dandelion,lilac,peony,iris,marigold,hibiscus,jasmine,hydrangea,chrysanthemum,lotus,magnolia,pansy,buttercup,geranium,petunia,snapdragon,bluebell,begonia,azalea,foxglove,zinnia,gardenia,hyacinth,freesia,anemone,camellia,wisteria"],
  ["Name a board game","monopoly,chess,scrabble,checkers/draughts,clue/cluedo,risk,sorry,life/game of life,candy land,catan/settlers of catan,battleship,trouble,connect four/connect 4,operation,backgammon,trivial pursuit,chutes and ladders/snakes and ladders,pictionary,jenga,guess who,twister,mouse trap,stratego,ticket to ride,yahtzee,go,pandemic,parcheesi/ludo,mancala,othello/reversi,carcassonne,boggle,taboo,scattergories,azul,wingspan"],
  ["Name something you wear","shirt/t-shirt/tee,pants/trousers,shoes,hat,socks,jacket,dress,jeans,shorts,coat,sweater/jumper,underwear,skirt,scarf,gloves,belt,tie,boots,hoodie,glasses,watch,bra,sandals,suit,cap,vest,sunglasses,leggings,blouse,pajamas/pyjamas,mittens,tights,cardigan,overalls/dungarees,kilt,poncho,cummerbund,bow tie"],
  ["Name an ice cream flavor","vanilla,chocolate,strawberry,mint chocolate chip/mint/mint chip,cookie dough,cookies and cream/oreo,rocky road,pistachio,coffee,caramel/salted caramel,butter pecan,neapolitan,cherry,banana,peanut butter,mango,coconut,lemon,raspberry,birthday cake,fudge,rum raisin,bubblegum,hazelnut,green tea/matcha,cotton candy,pumpkin,maple walnut/maple,tiramisu,stracciatella,lavender,black sesame,ube"],
  ["Name a sea creature","shark,dolphin,whale,octopus,fish,jellyfish,crab,turtle/sea turtle,seal,starfish/sea star,squid,lobster,seahorse,stingray/ray,shrimp/prawn,eel,orca/killer whale,clownfish,sea lion,swordfish,manatee,walrus,otter/sea otter,oyster,clam,sea urchin/urchin,tuna,barracuda,narwhal,anglerfish,pufferfish/blowfish,manta ray,cuttlefish,sea cucumber,nudibranch,coelacanth"],
  ["Name a language","english,spanish,french,german,chinese/mandarin,italian,japanese,russian,portuguese,arabic,hindi,korean,latin,greek,dutch,swedish,polish,turkish,hebrew,vietnamese,thai,bengali,urdu,swahili,norwegian,danish,finnish,czech,hungarian,persian/farsi,tagalog/filipino,indonesian,punjabi,tamil,irish/gaelic,welsh,icelandic,esperanto,zulu,basque,quechua,navajo"],
  ["Name a job","doctor,teacher,lawyer,nurse,police officer/cop/police,firefighter/fireman,engineer,chef/cook,pilot,dentist,accountant,programmer/software engineer/developer,plumber,electrician,artist,farmer,scientist,writer/author,mechanic,waiter/waitress/server,actor/actress,carpenter,cashier,architect,journalist,vet/veterinarian,pharmacist,librarian,barber,baker,judge,astronaut,butcher,translator,surveyor,actuary,cartographer,sommelier,farrier"],
  ["Name a shape","circle,square,triangle,rectangle,oval,star,hexagon,pentagon,diamond/rhombus,octagon,heart,cube,sphere,cylinder,cone,pyramid,trapezoid/trapezium,parallelogram,crescent,ellipse,heptagon,decagon,nonagon,prism,kite,torus,dodecagon,tetrahedron,dodecahedron,icosahedron"],
  ["Name a breakfast food","eggs/egg,pancakes/pancake,cereal,bacon,toast,waffles/waffle,oatmeal/porridge,sausage,bagel,yogurt/yoghurt,muffin,french toast,croissant,hash browns,fruit,donut/doughnut,omelette/omelet,granola,biscuit/biscuits,smoothie,grits,avocado toast,crepe/crepes,burrito/breakfast burrito,scone,quiche,congee,shakshuka,kippers"],
  ["Name a kind of tree","oak,pine,maple,palm,birch,willow,apple,cherry,redwood,elm,cedar,spruce,fir,ash,walnut,sequoia,aspen,beech,cypress,eucalyptus,poplar,magnolia,sycamore,chestnut,hickory,olive,baobab,juniper,mahogany,banyan,teak,yew,larch,ginkgo,hawthorn,alder,hornbeam"],
  ["Name a card game","poker,blackjack/21,solitaire,go fish,uno,rummy/gin rummy/gin,war,hearts,spades,bridge,crazy eights,old maid,cribbage,snap,euchre,baccarat,pinochle,canasta,slapjack,whist,speed,bluff/cheat,president,pitch,skat,piquet"],
  ["Name a dinosaur","tyrannosaurus/t rex/tyrannosaurus rex,triceratops,velociraptor/raptor,stegosaurus,brontosaurus,pterodactyl,brachiosaurus,diplodocus,spinosaurus,ankylosaurus,allosaurus,apatosaurus,iguanodon,parasaurolophus,dilophosaurus,pachycephalosaurus,archaeopteryx,giganotosaurus,carnotaurus,compsognathus,utahraptor,deinonychus,therizinosaurus,baryonyx,gallimimus,oviraptor,styracosaurus"],
  ["Name a spice or herb","salt,pepper/black pepper,cinnamon,garlic,paprika,oregano,basil,cumin,ginger,thyme,rosemary,parsley,chili/chili powder/chilli,nutmeg,turmeric,cilantro/coriander,mint,sage,cloves/clove,dill,saffron,vanilla,cardamom,bay leaf/bay leaves,cayenne,mustard,fennel,tarragon,allspice,star anise/anise,sumac,marjoram,fenugreek,lovage"],
  ["Name a river","nile,amazon,mississippi,thames,danube,yangtze,ganges,seine,colorado,rhine,hudson,missouri,mekong,congo,volga,euphrates,tigris,jordan,indus,niger,zambezi,yellow/yellow river/huang he,rio grande,columbia,ohio,yukon,tiber,murray,orinoco,loire,elbe,po,dnieper,shannon,limpopo,irrawaddy"],
  ["Name a Greek god or goddess","zeus,poseidon,hades,athena,apollo,ares,aphrodite,hermes,hera,artemis,dionysus,hephaestus,demeter,persephone,eros,hestia,cronus/kronos,nike,helios,pan,gaia,hecate,nemesis,hypnos,morpheus,uranus/ouranos,thanatos,iris,selene,eris,tyche,nyx"],
  ["Name a Shakespeare play","romeo and juliet,hamlet,macbeth,othello,a midsummer nights dream/midsummer nights dream,king lear,tempest,julius caesar,much ado about nothing,twelfth night,merchant of venice,taming of the shrew,richard iii/richard 3/richard the third,as you like it,henry v/henry 5,antony and cleopatra,winters tale,measure for measure,comedy of errors,coriolanus,titus andronicus,cymbeline,pericles,timon of athens,troilus and cressida"],
  ["Name an organ in the human body","heart,brain,lungs/lung,liver,kidney/kidneys,stomach,skin,intestines/intestine,eyes/eye,bladder,pancreas,spleen,gallbladder,appendix,esophagus/oesophagus,thyroid,tongue,colon,uterus,thymus,pituitary/pituitary gland,adrenal gland/adrenals"],
  ["Name something you'd find at the beach","sand,water/ocean/sea,shells/seashells/shell/seashell,umbrella,towel,waves/wave,sun,crab,seagull/seagulls,sunscreen,surfboard,sandcastle,swimsuit,ball/beach ball,bucket,lifeguard,seaweed,chair/beach chair,boat,sunglasses,rocks,palm tree,cooler,kite,flip flops,pier,jellyfish,driftwood,dune/dunes,starfish,tide pool,volleyball,snorkel,boardwalk"],
  ["Name a way to get around","car,bus,train,plane/airplane/aeroplane,bike/bicycle,boat,truck,motorcycle/motorbike,taxi/cab,subway/metro,helicopter,ship,scooter,van,tram/streetcar,skateboard,ferry,horse,jet,rocket,canoe,limo/limousine,hot air balloon,kayak,tractor,submarine,segway,rickshaw,gondola,blimp/zeppelin,hovercraft,unicycle,sled/sleigh,monorail,funicular"],
  ["Name a mountain","everest,kilimanjaro,k2,fuji,matterhorn,denali/mckinley,mont blanc,rainier,olympus,vesuvius,etna,st helens,rushmore,aconcagua,whitney,elbrus,sinai,kangchenjunga,eiger,annapurna,lhotse,hood,cook/aoraki,ararat,kenya,shasta,makalu,nanga parbat,vinson,kosciuszko"],
  ["Name a famous painter","picasso,van gogh,da vinci/leonardo/leonardo da vinci,monet,michelangelo,rembrandt,dali/salvador dali,warhol,frida kahlo/kahlo,matisse,renoir,pollock,raphael,cezanne,vermeer,klimt,munch,okeeffe/georgia okeeffe,goya,botticelli,degas,manet,banksy,basquiat,kandinsky,caravaggio,magritte,hopper,rothko,turner,titian,gauguin,chagall,el greco,bosch,bruegel,hokusai,modigliani"],
  ["Name a currency","dollar,euro,pound,yen,peso,rupee,franc,yuan/renminbi,ruble/rouble,won,bitcoin,dinar,krona/krone/kroner,lira,real,rand,shekel,dirham,baht,riyal,zloty,ringgit,forint,dong,rupiah,shilling,naira,kwacha,lev,tenge,hryvnia,taka,colon,birr,quetzal"],
  ["Name a gemstone","diamond,ruby,emerald,sapphire,pearl,opal,amethyst,topaz,jade,garnet,turquoise,aquamarine,onyx,quartz,amber,peridot,moonstone,citrine,lapis lazuli/lapis,tanzanite,tourmaline,obsidian,agate,jasper,zircon,malachite,spinel,alexandrite,morganite"],
  ["Name a type of pasta","spaghetti,penne,macaroni,fettuccine,lasagna/lasagne,ravioli,linguine,rigatoni,fusilli/rotini,tortellini,angel hair/capellini,farfalle/bowtie/bow tie,gnocchi,ziti,orzo,tagliatelle,shells/conchiglie,orecchiette,pappardelle,bucatini,cannelloni/manicotti,vermicelli,cavatappi,ditalini,gemelli,paccheri,mafaldine,strozzapreti"],
  ["Name something in a classroom","desk,chair,whiteboard/board/blackboard/chalkboard,pencil,book/books/textbook,teacher,pen,computer/laptop,paper,student/students,clock,backpack/bag,marker/markers,projector,eraser/rubber,ruler,notebook,window,door,calculator,globe,map,scissors,glue,poster/posters,stapler,flag,chalk,bookshelf,pencil sharpener/sharpener,crayons/crayon,bin/trash can,protractor,abacus"],
  ["Name an insect","ant,bee,fly,butterfly,mosquito,beetle,ladybug/ladybird,grasshopper,cockroach/roach,wasp,dragonfly,moth,cricket,caterpillar,flea,termite,praying mantis/mantis,firefly/lightning bug,hornet,stick insect/stick bug,cicada,locust,gnat,earwig,aphid,weevil,stink bug,silverfish,mayfly,lacewing,katydid"],
  ["Name a dessert","cake,ice cream,pie,cookie/cookies,brownie/brownies,cheesecake,pudding,donut/doughnut,cupcake,chocolate,tiramisu,apple pie,creme brulee,mousse,macaron/macarons,churros/churro,tart,flan,sundae,eclair,baklava,cannoli,gelato,sorbet,trifle,pavlova,souffle,panna cotta,mochi,cobbler,profiterole/profiteroles,crumble,tres leches,gulab jamun,kulfi"],
  ["Name a mythical creature","dragon,unicorn,mermaid,vampire,werewolf,fairy,phoenix,bigfoot/sasquatch,centaur,griffin/gryphon,troll,giant,zombie,ghost,pegasus,goblin,elf,minotaur,cyclops,kraken,yeti,hydra,medusa/gorgon,ogre,leprechaun,sphinx,loch ness monster/nessie,gnome,banshee,chimera,cerberus,basilisk,siren,golem,kelpie,wendigo,chupacabra,kitsune,selkie"],
  ["Name a kind of weather","rain,snow,sun/sunny/sunshine,wind/windy,thunderstorm/thunder/storm,cloudy/clouds,fog/foggy,hail,tornado,hurricane,lightning,sleet,blizzard,drizzle,mist,heat wave/heatwave,frost,drought,monsoon,typhoon/cyclone,rainbow,humidity/humid,dust storm/sandstorm,freezing rain,haze,squall,derecho,graupel"],
  ["Name something in outer space","sun,moon,star/stars,planet/planets,earth,black hole,asteroid,comet,galaxy,mars,satellite,meteor,milky way,nebula,astronaut,iss/space station/international space station,jupiter,saturn,rocket,supernova,dust,pluto,quasar,dark matter,pulsar,exoplanet,neutron star,kuiper belt,oort cloud,magnetar"],
  ["Name a tool in a toolbox","hammer,screwdriver,wrench/spanner,pliers,saw,drill,tape measure/measuring tape,nails/nail,level/spirit level,screws/screw,chisel,utility knife/box cutter,allen key/allen wrench/hex key,sandpaper,clamp,file,duct tape/tape,crowbar,socket wrench/ratchet,mallet,wire cutters,stud finder,hacksaw,vise grips/vice grips,awl,plane,putty knife,caulk gun,plumb bob"],
  ["Name a famous scientist","einstein,newton,darwin,curie/marie curie,hawking,galileo,tesla,edison,da vinci,pasteur,bohr,feynman,oppenheimer,sagan,franklin/rosalind franklin,turing,faraday,kepler,copernicus,mendel,archimedes,planck,heisenberg,goodall,fleming,maxwell,lovelace,schrodinger,hubble,fermi,dirac,noether,meitner,lavoisier"],
  ["Name something cold","ice,snow,ice cream,freezer,winter,refrigerator/fridge,antarctica,popsicle/ice lolly,north pole/arctic,water,air conditioner/ac/air conditioning,igloo,glacier,iceberg,snowman,frost,penguin,steel/metal,wind,space,liquid nitrogen,dry ice,slushie/slush,hail,tundra,siberia,pluto,absolute zero"],
  ["Name something round","ball,circle,wheel,earth/globe/planet,sun,moon,orange,coin,plate,pizza,clock,tire/tyre,ring,donut/doughnut,button,marble,bubble,eye/eyeball,balloon,apple,pearl,pancake,cookie,frisbee,hula hoop,cd/disc/dvd,bowl,lid,manhole cover/manhole,compass,porthole,bagel,yoyo"],
] as [string, string][]).map(([q, list]) => ({ q, answers: list.split(",").map((a) => a.split("/")) }));

/* ---------- answer matching ---------- */
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and").replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/^(the|a|an|mount|mt) /, "").replace(/ /g, "");
const forms = (k: string) => [k, k.replace(/s$/, ""), k.replace(/es$/, "")].filter((x) => x.length > 1 || x === k);

function lev(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return 99;
  let p = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const c = [i];
    for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0));
    p = c;
  }
  return p[b.length];
}

const indexes = new WeakMap<Prompt, Map<string, number>>();
function index(p: Prompt) {
  let m = indexes.get(p);
  if (m) return m;
  m = new Map();
  p.answers.forEach((al, i) => al.forEach((a) => forms(norm(a)).forEach((f) => { if (!m!.has(f)) m!.set(f, i); })));
  indexes.set(p, m);
  return m;
}

/** Rough % of people who'd say answer i of n (Zipf-like: share ∝ 1/rank). */
const share = (i: number, n: number) => {
  let h = 0;
  for (let k = 1; k <= n; k++) h += 1 / k;
  return 100 / ((i + 1) * h);
};

function find(p: Prompt, raw: string) {
  const m = index(p), k = norm(raw);
  if (!k) return -1;
  for (const f of forms(k)) if (m.has(f)) return m.get(f)!;
  const tol = k.length >= 9 ? 2 : k.length >= 5 ? 1 : 0;
  if (!tol) return -1;
  let best = -1, bd = 99;
  for (const [key, i] of m) {
    if (key[0] !== k[0]) continue;
    const d = lev(k, key, tol);
    if (d <= tol && d < bd) { bd = d; best = i; }
  }
  return best;
}

/** Match raw input against a prompt's list (normalisation, plurals, typo tolerance). null = not on the list. */
export function matchAnswer(p: Prompt, raw: string): Verdict | null {
  const i = find(p, raw), n = p.answers.length;
  return i < 0 ? null : { name: p.answers[i][0], frac: i / (n - 1), source: "list", pct: share(i, n) };
}

/* ---------- judge ---------- */
type Judged = { valid: boolean; verdict?: Verdict };
const judged = new Map<string, Judged>();

/** Ask the NIM judge about an off-list answer. null = judge unavailable; {valid:false} = rejected. */
export async function judgeAnswer(p: Prompt, raw: string): Promise<{ valid: boolean; verdict?: Verdict } | null> {
  const url = process.env.NEXT_PUBLIC_JUDGE_URL;
  if (!url) return null;
  const key = p.q + "|" + norm(raw);
  const hit = judged.get(key);
  if (hit) return hit;
  const c = new AbortController(), t = setTimeout(() => c.abort(), 9000);
  try {
    const r = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: c.signal,
      body: JSON.stringify({ prompt: p.q, answer: raw, common: p.answers.slice(0, 4).map((a) => a[0]), rare: p.answers.slice(-4).map((a) => a[0]) }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (typeof j?.valid !== "boolean") return null;
    let out: Judged = { valid: false };
    if (j.valid) {
      if (typeof j.rarity !== "number" || !Number.isFinite(j.rarity)) return null;
      const rarity = Math.max(0, Math.min(100, j.rarity));
      out = { valid: true, verdict: { name: typeof j.name === "string" && j.name.trim() ? j.name.trim() : raw.trim(), frac: rarity / 100, source: "judge", rarity } };
    }
    judged.set(key, out);
    return out;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/* ---------- daily seeding ---------- */
const DAY = 86_400_000;
const LAUNCH_DAY = Date.UTC(2026, 10, 14) / DAY;
const dayIndex = (d: Date) => Math.floor(d.getTime() / DAY);
const mod = (a: number, n: number) => ((a % n) + n) % n;

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(xs: T[], rand: () => number) {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

// Each cycle of DPC days walks a seeded shuffle of BANK in slices of 7, so no repeats inside a cycle.
const DPC = Math.floor(BANK.length / ROUNDS);
const LAST = (DPC - 1) * ROUNDS; // start of a cycle's final slice
const rawCycle = (c: number) => shuffle(BANK.slice(), mulberry32(Math.imul(c, 0x9e3779b1) ^ 0x2e417)); // ponytail: seed is part of the contract; changing it reshuffles every past/future flight
function cycle(c: number) {
  const perm = rawCycle(c);
  // Cycle boundary: swap yesterday's prompts (previous cycle's raw final slice) out of today's first slice.
  // Only positions [ROUNDS, LAST) are swapped in, so this cycle's own final slice stays raw for tomorrow's check.
  const prev = new Set(rawCycle(c - 1).slice(LAST, LAST + ROUNDS));
  let j = ROUNDS;
  for (let i = 0; i < ROUNDS; i++) {
    if (!prev.has(perm[i])) continue;
    while (prev.has(perm[j])) j++;
    [perm[i], perm[j]] = [perm[j], perm[i]];
    j++;
  }
  return perm;
}

/** UTC date key YYYY-MM-DD for `d`. */
export function dateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}
/** Daily flight number: 1 on the launch date, +1 per UTC day. */
export function flightNumber(d: Date = new Date()): number {
  return dayIndex(d) - LAUNCH_DAY + 1;
}
/** The 7 prompts for a UTC day, identical for every player (seeded PRNG over BANK). */
export function dailyPrompts(d: Date = new Date()): Prompt[] {
  const day = dayIndex(d), slot = mod(day, DPC) * ROUNDS;
  return cycle(Math.floor(day / DPC)).slice(slot, slot + ROUNDS);
}
/** 7 random prompts for practice, avoiding recently seen ones. */
export function practicePrompts(): Prompt[] {
  let seen = new Set(get<string[]>("zenith.seen", []));
  let pool = BANK.filter((p) => !seen.has(p.q));
  if (pool.length < ROUNDS) { seen = new Set(); pool = BANK.slice(); }
  const pick = shuffle(pool, Math.random).slice(0, ROUNDS);
  pick.forEach((p) => seen.add(p.q));
  set("zenith.seen", [...seen]);
  return pick;
}
/** ms until the next UTC midnight (next flight). */
export function msUntilNextFlight(d: Date = new Date()): number {
  return (dayIndex(d) + 1) * DAY - d.getTime();
}

/* ---------- storage ---------- */
function get<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? fallback; } catch { return fallback; }
}
function set(k: string, v: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

const EMPTY: Stats = { flown: 0, bestKm: 0, streak: 0, lastDateKey: null };
const prevKey = (key: string) => dateKey(new Date(Date.parse(key) - DAY));
const finalKm = (log: FlightLog) => log.burns.at(-1)?.altitudeKm ?? 0;

/** Persisted daily log for a date key (survives reloads; one attempt per day). */
export function loadDaily(key: string): FlightLog | null {
  return get<FlightLog | null>("zenith.daily." + key, null);
}
export function saveDaily(log: FlightLog): void {
  if (log.dateKey) set("zenith.daily." + log.dateKey, log);
}
export function loadStats(): Stats {
  const s = { ...EMPTY, ...get<Partial<Stats>>("zenith.stats", {}) };
  // A streak only counts while it's still alive (flew today or yesterday).
  const today = dateKey();
  if (s.lastDateKey !== today && s.lastDateKey !== prevKey(today)) s.streak = 0;
  return s;
}
/** Record a finished flight into stats (best altitude, flights flown, daily streak). Returns updated stats. */
export function recordFlight(log: FlightLog): Stats {
  const s: Stats = { ...EMPTY, ...get<Partial<Stats>>("zenith.stats", {}) };
  if (!log.done) return s;
  if (log.mode === "daily") {
    if (!log.dateKey || s.lastDateKey === log.dateKey) return s; // already recorded
    s.streak = s.lastDateKey === prevKey(log.dateKey) ? s.streak + 1 : 1;
    s.lastDateKey = log.dateKey;
  }
  s.flown += 1;
  s.bestKm = Math.max(s.bestKm, finalKm(log));
  set("zenith.stats", s);
  return s;
}

/* ---------- sharing ---------- */
const SITE = "https://savyyy-kun.github.io/zenith/";
const glyph = (pts: number) => (pts <= 0 ? "·" : pts < 400 ? "▂" : pts < 700 ? "▅" : "█");

/** Plain-text share card for a finished flight (no answers revealed, spoiler-free). */
export function shareText(log: FlightLog): string {
  const km = finalKm(log);
  return [
    `Zenith · ${log.mode === "daily" ? `Flight ${log.flight}` : "Practice flight"}`,
    `${log.burns.map((b) => glyph(b.points)).join("")}  ${fmtAlt(km)}`,
    lastLandmark(km)?.label ?? zoneAt(km),
    SITE,
  ].join("\n");
}
