/**
 * GradeUp Study - Master Subject & Chapter Taxonomy & Canonicalization Engine
 * 
 * Ensures consistent, unified Subject and Chapter naming across all OCR, PDF Imports,
 * AI Question Generators, and Manual Entries, preventing fragmented variants like:
 * - Subject: "History" vs "Indian History" vs "General History" vs "History GK" -> Canonical: "History"
 * - Chapter: "Mauryan Empire" vs "MAuryan Dynesty" vs "The Mauryas" vs "Maurya Dynasty" -> Canonical: "Mauryan Empire"
 */

export interface CanonicalChapter {
  id: string;
  name: string;
  aliases: string[];
  subtopics?: string[];
}

export interface CanonicalSubject {
  id: string;
  name: string;
  category: 'General Studies' | 'Aptitude' | 'Language' | 'State GK' | 'Technical';
  aliases: string[];
  chapters: CanonicalChapter[];
}

export const MASTER_CANONICAL_TAXONOMY: CanonicalSubject[] = [
  {
    id: 'history',
    name: 'History',
    category: 'General Studies',
    aliases: [
      'indian history',
      'general history',
      'history gk',
      'itihas',
      'bharat ka itihas',
      'bharatiya itihas',
      'ancient and medieval history',
      'modern history',
      'ancient history',
      'medieval history',
      'history of india',
      'complete history'
    ],
    chapters: [
      {
        id: 'indus-valley',
        name: 'Indus Valley Civilization',
        aliases: [
          'harappan civilization',
          'harappa civilization',
          'sindhu ghati sabhyata',
          'indus civilization',
          'ivc',
          'harappa',
          'mohenjodaro'
        ]
      },
      {
        id: 'vedic-period',
        name: 'Vedic Period & Early Literature',
        aliases: [
          'vedic age',
          'vedic civilization',
          'early vedic',
          'later vedic',
          'rigvedic period',
          'vedic kal',
          'vedic sanskriti'
        ]
      },
      {
        id: 'buddhism-jainism',
        name: 'Buddhism & Jainism',
        aliases: [
          'buddhist and jain literature',
          'buddhism',
          'jainism',
          'gautam buddha',
          'mahavira',
          'buddha and mahavira',
          'religious movements'
        ]
      },
      {
        id: 'mahajanapadas',
        name: 'Mahajanapadas & Magadha Empire',
        aliases: [
          '16 mahajanapadas',
          'sixteen mahajanapadas',
          'rise of magadha',
          'hanyanka dynasty',
          'shishunaga dynasty',
          'nanda dynasty'
        ]
      },
      {
        id: 'mauryan-empire',
        name: 'Mauryan Empire',
        aliases: [
          'mauryan dynasty',
          'mauryan dynesty',
          'the mauryas',
          'maurya empire',
          'maurya dynasty',
          'maurya vansh',
          'maurya kaal',
          'chandragupta maurya',
          'ashoka the great',
          'chanakya and kautilya',
          'mauryan period'
        ]
      },
      {
        id: 'post-maurya',
        name: 'Post-Mauryan Period & Sungas/Kushans',
        aliases: [
          'post mauryan',
          'shunga dynasty',
          'kushan empire',
          'kanva dynasty',
          'satavahanas',
          'kanishka'
        ]
      },
      {
        id: 'gupta-empire',
        name: 'Gupta Empire & Golden Age',
        aliases: [
          'gupta dynasty',
          'gupt vansh',
          'gupt kaal',
          'gupta period',
          'chandragupta i',
          'samudragupta',
          'chandragupta ii',
          'golden age of india'
        ]
      },
      {
        id: 'harsha-south-dynasties',
        name: 'Harshavardhana & Southern Dynasties',
        aliases: [
          'harshavardhana',
          'vardhana dynasty',
          'cholas',
          'chalukyas',
          'pallavas',
          'rashtrakutas',
          'chola empire'
        ]
      },
      {
        id: 'delhi-sultanate',
        name: 'Delhi Sultanate',
        aliases: [
          'slave dynasty',
          'mamluk dynasty',
          'khilji dynasty',
          'tughlaq dynasty',
          'sayyid dynasty',
          'lodi dynasty',
          'delhi sultanat',
          'sultanate period'
        ]
      },
      {
        id: 'mughal-empire',
        name: 'Mughal Empire',
        aliases: [
          'mughal dynasty',
          'mughal period',
          'the mughals',
          'mughal kaal',
          'babar',
          'humayun',
          'akbar',
          'jahangir',
          'shah jahan',
          'aurangzeb'
        ]
      },
      {
        id: 'bhakti-sufi',
        name: 'Bhakti & Sufi Movements',
        aliases: [
          'bhakti movement',
          'sufi movement',
          'bhakti and sufi saints',
          'kabir',
          'guru nanak',
          'mirabai'
        ]
      },
      {
        id: 'maratha-vijayanagara',
        name: 'Maratha & Vijayanagara Empires',
        aliases: [
          'maratha empire',
          'chhatrapati shivaji',
          'peshwas',
          'vijayanagar empire',
          'bahmani kingdom',
          'krishnadevaraya'
        ]
      },
      {
        id: 'advent-europeans',
        name: 'Advent of Europeans & British Expansion',
        aliases: [
          'arrival of europeans',
          'east india company',
          'battle of plassey',
          'battle of buxar',
          'carnatic wars',
          'anglo maratha wars',
          'anglo mysore wars'
        ]
      },
      {
        id: 'revolt-1857',
        name: 'Revolt of 1857',
        aliases: [
          '1857 revolt',
          'first war of indian independence',
          'sepoy mutiny',
          '1857 ki kranti',
          'mutiny of 1857'
        ]
      },
      {
        id: 'socio-religious-reform',
        name: 'Socio-Religious Reform Movements',
        aliases: [
          '19th century reforms',
          'raja ram mohan roy',
          'brahmo samaj',
          'arya samaj',
          'ramakrishna mission',
          'jyotirao phule',
          'social reform movements'
        ]
      },
      {
        id: 'national-movement-early',
        name: 'Indian National Movement (1885–1918)',
        aliases: [
          'formation of inc',
          'indian national congress',
          'moderate and extremist phase',
          'partition of bengal 1905',
          'swadeshi movement',
          'home rule movement',
          'early freedom struggle'
        ]
      },
      {
        id: 'gandhian-era',
        name: 'Gandhian Era & Freedom Struggle (1919–1947)',
        aliases: [
          'gandhian phase',
          'non-cooperation movement',
          'civil disobedience movement',
          'quit india movement',
          'rowlatt act',
          'jallianwala bagh',
          'subhas chandra bose and ina',
          'indian independence 1947'
        ]
      },
      {
        id: 'viceroys-constitutional-acts',
        name: 'Governor Generals, Viceroys & British Acts',
        aliases: [
          'governor generals of india',
          'viceroys of india',
          'regulating act',
          'charter acts',
          'government of india act 1935',
          'morley minto reforms',
          'montagu chelmsford'
        ]
      },
      {
        id: 'world-history',
        name: 'World History',
        aliases: [
          'french revolution',
          'american revolution',
          'industrial revolution',
          'world war 1',
          'world war 2',
          'renaissance',
          'un and international bodies'
        ]
      }
    ]
  },
  {
    id: 'polity',
    name: 'Polity',
    category: 'General Studies',
    aliases: [
      'indian polity',
      'general polity',
      'indian constitution',
      'constitution of india',
      'samvidhan',
      'polity and governance',
      'civics',
      'constitutional law',
      'indian political system'
    ],
    chapters: [
      {
        id: 'constitutional-framework',
        name: 'Making of Constitution & Preamble',
        aliases: [
          'constituent assembly',
          'preamble of constitution',
          'sources of indian constitution',
          'features of constitution',
          'samvidhan nirman'
        ]
      },
      {
        id: 'fundamental-rights-duties',
        name: 'Fundamental Rights, Duties & DPSP',
        aliases: [
          'fundamental rights',
          'fundamental duties',
          'dpsp',
          'directive principles',
          'article 12 to 35',
          'article 36 to 51',
          'article 51a',
          'mool adhikar'
        ]
      },
      {
        id: 'union-executive',
        name: 'Union Executive (President, Vice-President, PM & Council)',
        aliases: [
          'president of india',
          'prime minister',
          'council of ministers',
          'attorney general',
          'union executive',
          'rashtrapati',
          'pradhan mantri'
        ]
      },
      {
        id: 'parliament',
        name: 'Union Legislature & Parliament',
        aliases: [
          'parliament of india',
          'lok sabha',
          'rajya sabha',
          'speaker of lok sabha',
          'parliamentary procedures',
          'bills and budget',
          'sansad'
        ]
      },
      {
        id: 'judiciary',
        name: 'Judiciary (Supreme Court & High Courts)',
        aliases: [
          'supreme court of india',
          'high courts',
          'subordinate courts',
          'judicial review',
          'public interest litigation (pil)',
          'nyaypalika'
        ]
      },
      {
        id: 'state-government',
        name: 'State Government & Legislature',
        aliases: [
          'governor',
          'chief minister',
          'state legislative assembly',
          'vidhan sabha',
          'vidhan parishad',
          'advocate general'
        ]
      },
      {
        id: 'panchayati-raj',
        name: 'Local Governance & Panchayati Raj',
        aliases: [
          'panchayati raj system',
          '73rd amendment',
          '74th amendment',
          'municipalities',
          'gram panchayat',
          'local self government'
        ]
      },
      {
        id: 'constitutional-bodies',
        name: 'Constitutional & Statutory Bodies',
        aliases: [
          'election commission of india',
          'upsc',
          'cag',
          'finance commission',
          'niti aayog',
          'nhrc',
          'cbi and cvc'
        ]
      },
      {
        id: 'amendments-articles',
        name: 'Important Amendments, Schedules & Articles',
        aliases: [
          'constitutional amendments',
          'important articles',
          'schedules of constitution',
          'emergency provisions',
          'article 352 356 360'
        ]
      }
    ]
  },
  {
    id: 'geography',
    name: 'Geography',
    category: 'General Studies',
    aliases: [
      'indian geography',
      'world geography',
      'physical geography',
      'general geography',
      'bhoogol',
      'geography gk',
      'geography of india'
    ],
    chapters: [
      {
        id: 'physical-geography-universe',
        name: 'Solar System, Universe & Earth Motions',
        aliases: [
          'solar system',
          'earth structure',
          'latitudes and longitudes',
          'rotation and revolution',
          'planets and universe'
        ]
      },
      {
        id: 'geomorphology',
        name: 'Geomorphology & Landforms',
        aliases: [
          'interior of the earth',
          'plate tectonics',
          'volcanoes and earthquakes',
          'rocks and minerals',
          'mountains and plateaus',
          'landforms'
        ]
      },
      {
        id: 'climatology-atmosphere',
        name: 'Atmosphere, Climate & Weather',
        aliases: [
          'layers of atmosphere',
          'atmospheric pressure and winds',
          'cyclones and anticyclones',
          'humidity and precipitation',
          'climate zones'
        ]
      },
      {
        id: 'oceanography',
        name: 'Oceanography & Water Bodies',
        aliases: [
          'ocean currents',
          'tides and waves',
          'ocean relief',
          'salinity of oceans',
          'major oceans and seas'
        ]
      },
      {
        id: 'physiography-india',
        name: 'Physiography & Relief of India',
        aliases: [
          'himalayas and northern plains',
          'peninsular plateau',
          'coastal plains and islands',
          'major mountain peaks and passes in india'
        ]
      },
      {
        id: 'drainage-rivers-india',
        name: 'Drainage Systems & Rivers of India',
        aliases: [
          'rivers of india',
          'himalayan rivers',
          'peninsular rivers',
          'ganga river system',
          'indus river system',
          'brahmaputra river system',
          'lakes and waterfalls in india',
          'river valley projects and dams'
        ]
      },
      {
        id: 'climate-monsoon-india',
        name: 'Climate, Monsoons & Soils of India',
        aliases: [
          'indian monsoon',
          'seasons in india',
          'types of soils in india',
          'alluvial soil',
          'black soil',
          'soil erosion and conservation'
        ]
      },
      {
        id: 'natural-vegetation-agriculture',
        name: 'Vegetation, Agriculture & Minerals in India',
        aliases: [
          'forests in india',
          'major crops in india',
          'mineral resources of india',
          'energy resources and power plants'
        ]
      },
      {
        id: 'world-continents',
        name: 'World Continents, Oceans & World Geography',
        aliases: [
          'continents of the world',
          'major mountain ranges of world',
          'major rivers of world',
          'world deserts and straits'
        ]
      }
    ]
  },
  {
    id: 'general-science',
    name: 'General Science',
    category: 'General Studies',
    aliases: [
      'science',
      'science & technology',
      'samanya vigyan',
      'everyday science',
      'general science gk',
      'basic science'
    ],
    chapters: [
      {
        id: 'physics-mechanics-units',
        name: 'Physics: Units, Motion & Mechanics',
        aliases: [
          'si units and measurements',
          'motion and force',
          'newtons laws of motion',
          'work power and energy',
          'gravitation',
          'pressure and surface tension',
          'mechanics'
        ]
      },
      {
        id: 'physics-light-optics-sound',
        name: 'Physics: Optics, Sound & Waves',
        aliases: [
          'reflection and refraction',
          'lenses and mirrors',
          'sound waves and speed of sound',
          'electromagnetic spectrum',
          'human eye and defects'
        ]
      },
      {
        id: 'physics-electricity-magnetism',
        name: 'Physics: Heat, Electricity & Magnetism',
        aliases: [
          'heat and thermodynamics',
          'electric current and circuits',
          'ohms law',
          'magnetism and magnetic effects',
          'modern physics'
        ]
      },
      {
        id: 'chemistry-matter-reactions',
        name: 'Chemistry: Matter, Atoms & Reactions',
        aliases: [
          'states of matter',
          'atomic structure',
          'periodic table',
          'chemical bonding',
          'chemical reactions and equations'
        ]
      },
      {
        id: 'chemistry-acids-bases-metals',
        name: 'Chemistry: Acids, Bases, Salts & Metals',
        aliases: [
          'acids bases and salts',
          'ph scale',
          'metals and non-metals',
          'alloys and metallurgy',
          'carbon and its compounds',
          'chemistry in everyday life'
        ]
      },
      {
        id: 'biology-cell-genetics',
        name: 'Biology: Cell Biology & Genetics',
        aliases: [
          'cell structure and organelles',
          'mitosis and meiosis',
          'dna and rna',
          'heredity and evolution',
          'classification of living organisms'
        ]
      },
      {
        id: 'biology-human-physiology',
        name: 'Biology: Human Anatomy & Physiology',
        aliases: [
          'digestive system',
          'circulatory system and blood',
          'respiratory system',
          'nervous system and brain',
          'endocrine system and hormones',
          'excretory and skeletal system'
        ]
      },
      {
        id: 'biology-diseases-nutrition',
        name: 'Biology: Nutrition, Vitamins & Human Diseases',
        aliases: [
          'vitamins and minerals',
          'deficiency diseases',
          'infectious and viral diseases',
          'bacterial and protozoan diseases',
          'immunity and vaccines'
        ]
      },
      {
        id: 'biology-plant-physiology',
        name: 'Biology: Plant Morphology & Ecology',
        aliases: [
          'photosynthesis in plants',
          'plant tissues and hormones',
          'reproduction in plants',
          'ecology and ecosystem'
        ]
      }
    ]
  },
  {
    id: 'himachal-pradesh-gk',
    name: 'Himachal Pradesh GK',
    category: 'State GK',
    aliases: [
      'hp gk',
      'himachal gk',
      'hp general knowledge',
      'himachal pradesh general knowledge',
      'himachal history and culture',
      'hp state gk',
      'himachal pradesh'
    ],
    chapters: [
      {
        id: 'hp-history',
        name: 'HP: History & Princely States',
        aliases: [
          'history of himachal pradesh',
          'princely states of himachal',
          'trigarta and kuluta',
          'gorkha wars and british in hp',
          'freedom struggle in himachal',
          'praja mandal movement'
        ]
      },
      {
        id: 'hp-geography-rivers',
        name: 'HP: Geography, Rivers & Mountains',
        aliases: [
          'rivers of himachal pradesh',
          'beas satluj ravi chenab yamuna',
          'mountain passes of hp',
          'peaks and glaciers of himachal',
          'lakes and hot water springs in hp',
          'climate and forests of himachal'
        ]
      },
      {
        id: 'hp-culture-temples',
        name: 'HP: Culture, Fairs, Festivals & Temples',
        aliases: [
          'temples and architecture of hp',
          'fairs and festivals of himachal',
          'kullu dussehra',
          'mandi shivratri',
          'minjar fair',
          'folk dances and music of hp',
          'customs and dresses of himachal'
        ]
      },
      {
        id: 'hp-tribes-demography',
        name: 'HP: Tribes, Castes & Demographics',
        aliases: [
          'tribes of himachal pradesh',
          'gaddi gujjar kinnaura pangwala',
          'languages and dialects of hp',
          'demography and census of himachal'
        ]
      },
      {
        id: 'hp-districts-administration',
        name: 'HP: Districts, Economy & Administration',
        aliases: [
          'districts of himachal pradesh',
          'shimla kangra mandi kullu chamba sirmour',
          'administrative setup of hp',
          'hydroelectric projects in hp',
          'agriculture and horticulture in hp',
          'economy and budget of himachal pradesh'
        ]
      }
    ]
  },
  {
    id: 'economy',
    name: 'Economy',
    category: 'General Studies',
    aliases: [
      'indian economy',
      'economics',
      'general economy',
      'arthshastra',
      'economic and social development',
      'macroeconomics'
    ],
    chapters: [
      {
        id: 'national-income-gdp',
        name: 'National Income, GDP & Economic Growth',
        aliases: [
          'gdp gnp nnp ndp',
          'national income calculation',
          'economic growth and development',
          'sectors of economy (primary, secondary, tertiary)'
        ]
      },
      {
        id: 'banking-rbi-monetary-policy',
        name: 'Banking System, RBI & Monetary Policy',
        aliases: [
          'reserve bank of india',
          'monetary policy instruments',
          'repo rate reverse repo crr slr',
          'commercial banks and nbfc',
          'inflation and money supply'
        ]
      },
      {
        id: 'budget-fiscal-policy-taxation',
        name: 'Budget, Fiscal Policy & Taxation',
        aliases: [
          'union budget of india',
          'direct and indirect taxes',
          'gst in india',
          'fiscal deficit and revenue deficit',
          'finance commission'
        ]
      },
      {
        id: 'poverty-unemployment-schemes',
        name: 'Poverty, Unemployment & Welfare Schemes',
        aliases: [
          'poverty estimation committees',
          'types of unemployment',
          'government social welfare schemes',
          'human development index (hdi)'
        ]
      },
      {
        id: 'economic-planning-foreign-trade',
        name: 'Planning, NITI Aayog & Foreign Trade',
        aliases: [
          'five year plans in india',
          'niti aayog structure',
          'balance of payments (bop)',
          'fdi and fpi',
          'wto imf and world bank'
        ]
      }
    ]
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    category: 'Aptitude',
    aliases: [
      'quantitative aptitude',
      'quant',
      'maths',
      'math',
      'elementary mathematics',
      'ankganit',
      'arithmetic'
    ],
    chapters: [
      {
        id: 'number-system-simplification',
        name: 'Number System, HCF & LCM, Simplification',
        aliases: [
          'number system',
          'hcf and lcm',
          'simplification and bodmas',
          'fractions and decimals',
          'surds and indices',
          'divisibility rules'
        ]
      },
      {
        id: 'percentage-profit-loss',
        name: 'Percentage, Profit, Loss & Discount',
        aliases: [
          'percentage',
          'profit and loss',
          'discount and marked price',
          'partnership'
        ]
      },
      {
        id: 'simple-compound-interest',
        name: 'Simple & Compound Interest',
        aliases: [
          'simple interest',
          'compound interest',
          'si and ci difference',
          'installments'
        ]
      },
      {
        id: 'ratio-proportion-average',
        name: 'Ratio & Proportion, Average & Age Problems',
        aliases: [
          'ratio and proportion',
          'averages',
          'problems on ages',
          'alligation and mixture'
        ]
      },
      {
        id: 'time-work-pipes',
        name: 'Time & Work, Pipes & Cisterns',
        aliases: [
          'time and work',
          'work and wages',
          'pipes and cisterns',
          'efficiency based problems'
        ]
      },
      {
        id: 'speed-time-distance',
        name: 'Speed, Time, Distance, Trains & Boats',
        aliases: [
          'speed time and distance',
          'problems on trains',
          'boats and streams',
          'races and games'
        ]
      },
      {
        id: 'mensuration-2d-3d',
        name: 'Mensuration (2D & 3D Geometry)',
        aliases: [
          'area and perimeter of 2d shapes',
          'surface area and volume of 3d solids',
          'circle triangle rectangle cylinder sphere cone'
        ]
      },
      {
        id: 'data-interpretation',
        name: 'Data Interpretation (DI) & Statistics',
        aliases: [
          'bar graphs and pie charts',
          'line charts and tables',
          'mean median mode',
          'probability and permutations'
        ]
      }
    ]
  },
  {
    id: 'reasoning',
    name: 'Reasoning',
    category: 'Aptitude',
    aliases: [
      'logical reasoning',
      'general intelligence',
      'reasoning ability',
      'mental ability',
      'tarka shakti',
      'verbal and non-verbal reasoning'
    ],
    chapters: [
      {
        id: 'analogy-classification-series',
        name: 'Analogy, Classification & Series',
        aliases: [
          'number series',
          'letter and symbol series',
          'semantic analogy',
          'odd one out',
          'classification'
        ]
      },
      {
        id: 'coding-decoding-blood-relations',
        name: 'Coding-Decoding & Blood Relations',
        aliases: [
          'coding and decoding',
          'blood relation puzzles',
          'coded relations'
        ]
      },
      {
        id: 'direction-order-ranking',
        name: 'Direction Sense, Order & Ranking',
        aliases: [
          'direction and distance',
          'order and ranking test',
          'comparison test'
        ]
      },
      {
        id: 'syllogism-venn-diagrams',
        name: 'Syllogism, Venn Diagrams & Logic',
        aliases: [
          'syllogism statements and conclusions',
          'logical venn diagrams',
          'statement and assumptions',
          'assertion and reason'
        ]
      },
      {
        id: 'seating-arrangement-puzzles',
        name: 'Seating Arrangements & Puzzles',
        aliases: [
          'linear seating arrangement',
          'circular seating arrangement',
          'floor and schedule puzzles'
        ]
      },
      {
        id: 'clock-calendar-dice',
        name: 'Clock, Calendar & Dice/Cube',
        aliases: [
          'clock problems',
          'calendar questions',
          'cube and dice'
        ]
      },
      {
        id: 'non-verbal-reasoning',
        name: 'Non-Verbal Reasoning & Mirror Images',
        aliases: [
          'mirror and water images',
          'paper folding and cutting',
          'embedded figures',
          'figure completion',
          'pattern series'
        ]
      }
    ]
  },
  {
    id: 'english',
    name: 'English',
    category: 'Language',
    aliases: [
      'general english',
      'english language',
      'english grammar',
      'basic english',
      'english comprehension'
    ],
    chapters: [
      {
        id: 'english-grammar-parts-of-speech',
        name: 'Grammar: Parts of Speech & Articles',
        aliases: [
          'noun pronoun adjective verb adverb',
          'prepositions and conjunctions',
          'articles a an the',
          'subject-verb agreement'
        ]
      },
      {
        id: 'english-tenses-voice-narration',
        name: 'Tenses, Active-Passive Voice & Direct-Indirect',
        aliases: [
          'tenses and conditional sentences',
          'active and passive voice',
          'direct and indirect speech / narration'
        ]
      },
      {
        id: 'english-vocabulary-synonyms-antonyms',
        name: 'Vocabulary: Synonyms, Antonyms & One Word',
        aliases: [
          'synonyms and antonyms',
          'one word substitution',
          'homonyms and spellings',
          'word power'
        ]
      },
      {
        id: 'english-idioms-phrases',
        name: 'Idioms, Phrases & Phrasal Verbs',
        aliases: [
          'idioms and phrases',
          'phrasal verbs',
          'common english expressions'
        ]
      },
      {
        id: 'english-error-detection-sentence-improvement',
        name: 'Spotting Errors & Sentence Improvement',
        aliases: [
          'spotting errors',
          'sentence correction',
          'fill in the blanks'
        ]
      },
      {
        id: 'english-comprehension-para-jumbles',
        name: 'Reading Comprehension & Para Jumbles',
        aliases: [
          'reading comprehension passages',
          'cloze test',
          'sentence rearrangement and para jumbles'
        ]
      }
    ]
  },
  {
    id: 'hindi',
    name: 'Hindi',
    category: 'Language',
    aliases: [
      'general hindi',
      'hindi vyakaran',
      'samanya hindi',
      'hindi language',
      'hindi grammar'
    ],
    chapters: [
      {
        id: 'hindi-varn-sandhi-samman',
        name: 'वर्ण विचार, वर्तनी, संधि एवं समास',
        aliases: [
          'varn vichar aur vartani',
          'sandhi vichhed',
          'samas aur uske bhed',
          'varnamala'
        ]
      },
      {
        id: 'hindi-shabd-bhed',
        name: 'शब्द भेद (तत्सम-तद्भव, देशज-विदेशज)',
        aliases: [
          'tatsam aur tadbhav',
          'deshaj aur videshaj shabd',
          'upsarg aur pratyay',
          'shabd rachna'
        ]
      },
      {
        id: 'hindi-sangya-sarvanam-kriya',
        name: 'संज्ञा, सर्वनाम, विशेषण, क्रिया एवं काल',
        aliases: [
          'sangya sarvanam visheshan',
          'kriya aur kriya visheshan',
          'ling vachan aur karak',
          'kaal aur vachya'
        ]
      },
      {
        id: 'hindi-paryayvachi-vilom',
        name: 'पर्यायवाची, विलोम एवं अनेकार्थी शब्द',
        aliases: [
          'paryayvachi shabd',
          'vilom shabd',
          'anekarthi shabd',
          'yugm shabd'
        ]
      },
      {
        id: 'hindi-muhavare-lokoktiyan',
        name: 'मुहावरे, लोकोक्तियाँ एवं वाक्यांश के लिए एक शब्द',
        aliases: [
          'muhavare aur lokoktiyan',
          'vakyansh ke liye ek shabd',
          'kahavatein'
        ]
      },
      {
        id: 'hindi-vakya-shuddhi-sahitya',
        name: 'वाक्य शुद्धि, अपठित गद्यांश एवं प्रमुख साहित्यकार',
        aliases: [
          'vakya shuddhi',
          'apatith gadyansh',
          'hindi sahitya aur rachnakar',
          'ras chhand alankar'
        ]
      }
    ]
  },
  {
    id: 'environment-ecology',
    name: 'Environment & Ecology',
    category: 'General Studies',
    aliases: [
      'environment',
      'ecology',
      'paryavaran',
      'environmental studies',
      'biodiversity and conservation'
    ],
    chapters: [
      {
        id: 'ecology-biodiversity',
        name: 'Ecosystems, Food Chains & Biodiversity',
        aliases: [
          'ecosystem and trophic levels',
          'biodiversity hotspots in india',
          'endangered species and red data book'
        ]
      },
      {
        id: 'national-parks-wildlife',
        name: 'National Parks, Wildlife Sanctuaries & Biosphere Reserves',
        aliases: [
          'national parks in india',
          'wildlife sanctuaries',
          'tiger reserves and elephant corridors',
          'ramsar wetland sites'
        ]
      },
      {
        id: 'pollution-climate-change',
        name: 'Pollution, Climate Change & Environmental Laws',
        aliases: [
          'air water soil pollution',
          'greenhouse effect and global warming',
          'environment protection act 1986',
          'cop summits and climate agreements'
        ]
      }
    ]
  },
  {
    id: 'current-affairs',
    name: 'Current Affairs',
    category: 'General Studies',
    aliases: [
      'current events',
      'samayiki',
      'daily current affairs',
      'national and international affairs',
      'yearly current affairs'
    ],
    chapters: [
      {
        id: 'national-events-schemes',
        name: 'National Affairs, Summits & Government Schemes',
        aliases: [
          'national events',
          'new government schemes and portals',
          'national summits and conferences'
        ]
      },
      {
        id: 'international-affairs-indices',
        name: 'International Affairs, Summits & Global Indices',
        aliases: [
          'global summits g20 brics asean',
          'india ranking in world indices',
          'international treaties and agreements'
        ]
      },
      {
        id: 'sports-awards-appointments',
        name: 'Sports, Awards, Honors & Key Appointments',
        aliases: [
          'olympics asian games world cups',
          'padma awards bharat ratna nobel prizes',
          'new constitutional and global appointments',
          'obituaries and books in news'
        ]
      },
      {
        id: 'defense-science-space',
        name: 'Defense Exercises, ISRO & Space Missions',
        aliases: [
          'isro missions chandrayaan aditya',
          'military exercises and defense missiles',
          'science and tech innovations'
        ]
      }
    ]
  },
  {
    id: 'computer-awareness',
    name: 'Computer Awareness',
    category: 'Technical',
    aliases: [
      'computer knowledge',
      'basic computer',
      'computer fundamentals',
      'it and computer literacy',
      'computer science'
    ],
    chapters: [
      {
        id: 'computer-hardware-architecture',
        name: 'Computer Architecture, Hardware & Memory',
        aliases: [
          'cpu input and output devices',
          'ram rom and secondary storage',
          'generation of computers',
          'motherboard and ports'
        ]
      },
      {
        id: 'software-os-ms-office',
        name: 'Operating Systems & MS Office (Word, Excel, PPT)',
        aliases: [
          'windows and linux os',
          'ms word shortcuts and features',
          'ms excel formulas and charts',
          'ms powerpoint'
        ]
      },
      {
        id: 'networking-internet-security',
        name: 'Internet, Networking & Cyber Security',
        aliases: [
          'lan wan man and ip address',
          'osi model and protocols (http, tcp, ftp)',
          'viruses malware and firewalls',
          'cyber laws and email'
        ]
      },
      {
        id: 'shortcuts-file-extensions',
        name: 'Keyboard Shortcuts, File Extensions & Abbreviations',
        aliases: [
          'important shortcut keys',
          'file formats and extensions',
          'computer abbreviations and terms'
        ]
      }
    ]
  }
];

/**
 * Normalizes a text string for fuzzy alias comparison.
 */
function cleanStringForMatching(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates string similarity (Dice / Bigram Coefficient).
 */
function stringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const clean1 = cleanStringForMatching(s1);
  const clean2 = cleanStringForMatching(s2);
  if (clean1 === clean2) return 1.0;
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    const minLen = Math.min(clean1.length, clean2.length);
    const maxLen = Math.max(clean1.length, clean2.length);
    if (minLen / maxLen > 0.6) return 0.88;
  }

  const getBigrams = (str: string) => {
    const s = str.replace(/\s+/g, '');
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      set.add(s.substring(i, i + 2));
    }
    return set;
  };

  const b1 = getBigrams(clean1);
  const b2 = getBigrams(clean2);
  if (b1.size === 0 || b2.size === 0) return 0;

  let intersection = 0;
  b1.forEach((bg) => {
    if (b2.has(bg)) intersection++;
  });

  return (2.0 * intersection) / (b1.size + b2.size);
}

/**
 * Canonicalizes a Subject name to a standard Master Subject name.
 * Prevents duplicates like "History" vs "Indian History" vs "General History" -> returns "History".
 */
export function canonicalizeSubject(rawSubject?: string | null): string {
  if (!rawSubject || typeof rawSubject !== 'string') {
    return 'General Studies';
  }

  const inputClean = cleanStringForMatching(rawSubject);
  if (!inputClean) return 'General Studies';

  // 1. Direct match with canonical subject name
  for (const subj of MASTER_CANONICAL_TAXONOMY) {
    if (cleanStringForMatching(subj.name) === inputClean) {
      return subj.name;
    }
  }

  // 2. Direct match with subject aliases
  for (const subj of MASTER_CANONICAL_TAXONOMY) {
    for (const alias of subj.aliases) {
      if (cleanStringForMatching(alias) === inputClean) {
        return subj.name;
      }
    }
  }

  // 3. RegEx patterns for common prefixes/suffixes
  // History
  if (/\b(history|itihas|bharat ka itihas|ancient india|medieval india|modern india)\b/i.test(rawSubject)) {
    return 'History';
  }
  // Polity
  if (/\b(polity|constitution|samvidhan|civics|governance|parliament)\b/i.test(rawSubject)) {
    return 'Polity';
  }
  // Geography
  if (/\b(geography|bhoogol|bhugol|physical geography|indian geography)\b/i.test(rawSubject)) {
    return 'Geography';
  }
  // Science
  if (/\b(science|vigyan|physics|chemistry|biology|botany|zoology)\b/i.test(rawSubject)) {
    return 'General Science';
  }
  // HP GK
  if (/\b(himachal|hp gk|hp general|himachal pradesh)\b/i.test(rawSubject)) {
    return 'Himachal Pradesh GK';
  }
  // Economics
  if (/\b(economy|economics|arthshastra|gdp|banking)\b/i.test(rawSubject)) {
    return 'Economy';
  }
  // Mathematics
  if (/\b(math|maths|mathematics|arithmetic|quantitative|quant|ankganit)\b/i.test(rawSubject)) {
    return 'Mathematics';
  }
  // Reasoning
  if (/\b(reasoning|mental ability|intelligence|tarka|tark)\b/i.test(rawSubject)) {
    return 'Reasoning';
  }
  // English
  if (/\b(english|grammar|vocabulary|comprehension)\b/i.test(rawSubject)) {
    return 'English';
  }
  // Hindi
  if (/\b(hindi|vyakaran|sahitya|bhasha)\b/i.test(rawSubject)) {
    return 'Hindi';
  }
  // Environment
  if (/\b(environment|ecology|paryavaran|biodiversity)\b/i.test(rawSubject)) {
    return 'Environment & Ecology';
  }
  // Current Affairs
  if (/\b(current|affairs|samayiki|events|news)\b/i.test(rawSubject)) {
    return 'Current Affairs';
  }
  // Computer
  if (/\b(computer|it|cyber|hardware|software)\b/i.test(rawSubject)) {
    return 'Computer Awareness';
  }

  // 4. Fuzzy Similarity matching
  let bestMatch = rawSubject.trim();
  let maxScore = 0.55;

  for (const subj of MASTER_CANONICAL_TAXONOMY) {
    const score = stringSimilarity(inputClean, subj.name);
    if (score > maxScore) {
      maxScore = score;
      bestMatch = subj.name;
    }
    for (const alias of subj.aliases) {
      const aScore = stringSimilarity(inputClean, alias);
      if (aScore > maxScore) {
        maxScore = aScore;
        bestMatch = subj.name;
      }
    }
  }

  return bestMatch;
}

/**
 * Canonicalizes a Chapter name to a standard Master Chapter name under a given Subject.
 * Prevents variants like "Mauryan Empire" vs "MAuryan Dynesty" vs "The Mauryas" -> returns "Mauryan Empire".
 */
export function canonicalizeChapter(rawChapter?: string | null, subjectName?: string | null): string {
  if (!rawChapter || typeof rawChapter !== 'string') {
    return 'General';
  }

  const rawClean = rawChapter.trim();
  if (!rawClean || rawClean.toLowerCase() === 'general' || rawClean.toLowerCase() === 'all') {
    return 'General';
  }

  const inputClean = cleanStringForMatching(rawClean);
  const matchedSubject = subjectName ? canonicalizeSubject(subjectName) : null;

  // Search in matched subject first, or across all subjects
  const searchPool = matchedSubject
    ? MASTER_CANONICAL_TAXONOMY.filter((s) => s.name.toLowerCase() === matchedSubject.toLowerCase())
    : MASTER_CANONICAL_TAXONOMY;

  // 1. Direct Name Match
  for (const subj of searchPool) {
    for (const chap of subj.chapters) {
      if (cleanStringForMatching(chap.name) === inputClean) {
        return chap.name;
      }
    }
  }

  // 2. Direct Alias Match
  for (const subj of searchPool) {
    for (const chap of subj.chapters) {
      for (const alias of chap.aliases) {
        if (cleanStringForMatching(alias) === inputClean) {
          return chap.name;
        }
      }
    }
  }

  // 3. Known specific regex patterns for high-frequency exam chapters
  // Mauryan Empire / Dynasty
  if (/maurya/i.test(rawClean)) {
    return 'Mauryan Empire';
  }
  // Gupta Empire / Period
  if (/gupta|gupt\b/i.test(rawClean) && !/dasgupta/i.test(rawClean)) {
    return 'Gupta Empire & Golden Age';
  }
  // Indus Valley / Harappan
  if (/indus|harappa|mohenjo|sindhu ghati/i.test(rawClean)) {
    return 'Indus Valley Civilization';
  }
  // Vedic Age
  if (/vedic|rigved/i.test(rawClean)) {
    return 'Vedic Period & Early Literature';
  }
  // Buddhism / Jainism
  if (/buddh|jain|mahavir/i.test(rawClean)) {
    return 'Buddhism & Jainism';
  }
  // Delhi Sultanate / Slave / Khilji / Tughlaq / Lodi
  if (/sultanat|mamluk|khilji|tughlaq|sayyid|lodi/i.test(rawClean)) {
    return 'Delhi Sultanate';
  }
  // Mughal Empire
  if (/mughal|akbar|babar|babur|humayun|shah jahan|aurangzeb/i.test(rawClean)) {
    return 'Mughal Empire';
  }
  // 1857 Revolt
  if (/1857|sepoy mutiny|kranti/i.test(rawClean)) {
    return 'Revolt of 1857';
  }
  // Freedom Struggle / Gandhian Era
  if (/gandhi|non-cooperation|civil disobedience|quit india/i.test(rawClean)) {
    return 'Gandhian Era & Freedom Struggle (1919–1947)';
  }
  // Fundamental Rights / Duties / DPSP
  if (/fundamental right|fundamental dut|dpsp|mool adhikar/i.test(rawClean)) {
    return 'Fundamental Rights, Duties & DPSP';
  }
  // Parliament / Lok Sabha / Rajya Sabha
  if (/parliament|lok sabha|rajya sabha|sansad/i.test(rawClean)) {
    return 'Union Legislature & Parliament';
  }
  // Rivers / Drainage
  if (/river|drainage|dam|lake|ganga|indus|brahmaputra|nadi/i.test(rawClean)) {
    return 'Drainage Systems & Rivers of India';
  }

  // 4. Fuzzy Similarity Match across chapters
  let bestChapter = rawClean;
  let maxScore = 0.58;

  for (const subj of searchPool) {
    for (const chap of subj.chapters) {
      const score = stringSimilarity(inputClean, chap.name);
      if (score > maxScore) {
        maxScore = score;
        bestChapter = chap.name;
      }
      for (const alias of chap.aliases) {
        const aScore = stringSimilarity(inputClean, alias);
        if (aScore > maxScore) {
          maxScore = aScore;
          bestChapter = chap.name;
        }
      }
    }
  }

  return bestChapter;
}

/**
 * Standardizes a question's Subject and Chapter taxonomy in one call.
 */
export function normalizeQuestionTaxonomy(question: {
  subject?: string | null;
  chapter?: string | null;
  topic?: string | null;
}): {
  subject: string;
  chapter: string;
  topic: string;
} {
  const stdSubject = canonicalizeSubject(question.subject);
  const stdChapter = canonicalizeChapter(question.chapter, stdSubject);
  const stdTopic = question.topic && question.topic.trim() ? question.topic.trim() : stdChapter;

  return {
    subject: stdSubject,
    chapter: stdChapter,
    topic: stdTopic,
  };
}

/**
 * Retrieves list of all canonical subjects for dropdown selectors.
 */
export function getAllCanonicalSubjectNames(): string[] {
  return MASTER_CANONICAL_TAXONOMY.map((s) => s.name);
}

/**
 * Retrieves list of canonical chapters for a chosen subject name.
 */
export function getCanonicalChaptersForSubject(subjectName: string): string[] {
  const stdSubject = canonicalizeSubject(subjectName);
  const found = MASTER_CANONICAL_TAXONOMY.find(
    (s) => s.name.toLowerCase() === stdSubject.toLowerCase()
  );
  if (found) {
    return found.chapters.map((c) => c.name);
  }
  return [];
}
