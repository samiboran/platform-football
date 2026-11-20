/**
 * English translations — every English string in the game lives here.
 *
 * Key = the Turkish text exactly as the code draws it (any case; it is
 * normalised with the pixel font's Turkish uppercasing before lookup).
 * Value = English, written in CAPITALS. The pixel font has A–Z, 0–9 and
 * ` :-.!?/()=+|%,` only — no apostrophes or quotes.
 *
 * Composite strings are split on separators (double space, ": ", " - ",
 * " = ", ", "...) and leading/trailing numbers, so usually only the pieces
 * need an entry. Names (Tiago, Kiala...) and team codes stay as they are.
 *
 * Adding text to the game: add its Turkish → English pair here. In dev
 * builds, untranslated strings drawn while in English collect in
 * `window.__i18nMissing`.
 */
export const EN: Record<string, string> = {
  // --- Common buttons ---------------------------------------------------------
  'GERİ': 'BACK',
  'OYNA': 'PLAY',
  'DEVAM': 'CONTINUE',
  'TAMAM': 'DONE',
  'TAMAM!': 'DONE!',
  'EVET': 'YES',
  'HAYIR': 'NO',
  'ANA MENÜ': 'MAIN MENU',
  'MAÇA BAŞLA': 'KICK OFF',
  'YENİDEN BAŞLA': 'RESTART',
  'YAKINDA': 'SOON',
  'SEÇ': 'SELECT',
  'SEÇİLİ': 'SELECTED',
  'TAK': 'EQUIP',
  'TAKILI': 'EQUIPPED',
  'ÇIKAR': 'REMOVE',
  'BOŞ': 'EMPTY',
  'MAX': 'MAX',
  'ATLA': 'SKIP',

  // --- index.html (translated in main.ts) ---------------------------------------
  'YÜKLENİYOR': 'LOADING...',
  'TELEFONU YAN ÇEVİR': 'TURN YOUR PHONE SIDEWAYS',

  // --- Main menu / hub ----------------------------------------------------------
  'KARAKTER': 'PLAYER',
  'KARAKTERLER': 'PLAYERS',
  'LİG': 'LEAGUE',
  'EKİPMAN': 'GEAR',
  'AYAR': 'SETUP',
  'AYARLAR': 'SETTINGS',
  'ÖZELLİKLER': 'PERKS',
  'ELEMENT': 'ELEMENT',
  'ÇIKILSIN MI?': 'QUIT GAME?',
  'TAM': 'FULL',

  // --- Characters -------------------------------------------------------------
  'HIZ': 'SPEED',
  'ŞUT': 'SHOT',
  'GÜÇ': 'BODY',
  'ÖZEL': 'SPECIAL',
  'Hızlı / elektrik': 'FAST / ELECTRIC',
  'Güçlü / iri': 'STRONG / BIG',
  'Dengeli': 'BALANCED',
  'Zayıf şut, kaotik': 'WEAK SHOT, CHAOTIC',
  'Capoeira ters vuruşu (ginga çalımı)': 'CAPOEIRA BACK KICK (GINGA DRIBBLE)',
  'Gambeta — dar alanda top kontrolü': 'GAMBETA - CLOSE BALL CONTROL',
  'Poşet top — havada öngörülemez sapar': 'BAG BALL - SWERVES WILDLY IN THE AIR',
  'Ritimli zamanlama — doğru anda basınca power bonusu': 'RHYTHM TIMING - POWER BONUS ON THE BEAT',

  // --- Perks (config/progression.ts) -----------------------------------------
  'Çevik': 'NIMBLE',
  'Isınmış': 'WARMED UP',
  'Duvar': 'THE WALL',
  'İkinci Nefes': 'SECOND WIND',
  'Dash bekleme 0.75 sn': 'DASH COOLDOWN 0.75 S',
  'Maça 1 enerjiyle başla': 'START WITH 1 ENERGY',
  'Parry penceresi +3 kare': 'PARRY WINDOW +3 FRAMES',
  'Pasif enerji her 4 sn': 'PASSIVE ENERGY EVERY 4 S',
  'YENİ ÖZELLİK': 'NEW PERK',

  // --- Equipment (config/equipment.ts) -----------------------------------------
  'PABUÇ': 'SHOES',
  'KOL BANDI': 'ARMBAND',
  'SAÇ BANDI': 'HEADBAND',
  'Eski Pabuç': 'OLD SHOES',
  'Koşu Pabucu': 'RUNNERS',
  'Krampon': 'STUDS',
  'Yaylı Pabuç': 'SPRING SHOES',
  'Bantsız': 'NO BAND',
  'Kaptan Bandı': 'CAPTAIN BAND',
  'Golcü Bandı': 'STRIKER BAND',
  'Açık Kafa': 'BARE HEAD',
  'Falso Bandı': 'CURVE BAND',
  'Ters Kep': 'BACKWARDS CAP',
  'Etkisi yok': 'NO EFFECT',
  'Falso': 'CURVE',
  'Dash bekl.': 'DASH CD',

  // --- Stadiums (config/stadiums.ts; the card splits "Country — Place") -------
  'SAHAYI SEÇ': 'PICK A PITCH',
  'RAKİP': 'RIVAL',
  'Standart': 'STANDARD',
  'Çim Saha': 'GRASS PITCH',
  'Brezilya': 'BRAZIL',
  'Kum Sahil': 'SAND BEACH',
  'Arjantin': 'ARGENTINA',
  'Potrero': 'POTRERO',
  'Kenya': 'KENYA',
  'Toprak Saha': 'DIRT PITCH',
  'Kongo': 'CONGO',
  'Müzikli Sokak': 'MUSIC STREET',
  'Efektsiz saha, PvP ve 2v2 sahası': 'NO EFFECTS, PVP AND 2V2 PITCH',
  'Kum saha, top daha az seker': 'SAND, THE BALL BOUNCES LESS',
  'Engebeli toprak, dar alan hissi': 'BUMPY DIRT, TIGHT SPACE',
  'Toprak saha, rüzgar topu etkiler': 'DIRT, WIND PUSHES THE BALL',
  'Müzikli sokak, ritim görsele yansır': 'MUSIC STREET, THE BEAT SHOWS',

  // --- Difficulty / settings ----------------------------------------------------
  'KOLAY': 'EASY',
  'ORTA': 'MEDIUM',
  'ZOR': 'HARD',
  'KÜÇÜK': 'SMALL',
  'BÜYÜK': 'LARGE',
  'SAĞ EL': 'RIGHT HAND',
  'SOL EL': 'LEFT HAND',
  'TÜRKÇE': 'TÜRKÇE',
  'ENGLISH': 'ENGLISH',
  'AÇIK': 'ON',
  'KAPALI': 'OFF',
  'VARSAYILAN': 'DEFAULTS',
  'SES EFEKTLERİ': 'SOUND FX',
  'MÜZİK': 'MUSIC',
  'TİTREŞİM': 'VIBRATION',
  'NİŞAN ÇİZGİSİ': 'AIM LINE',
  'TUŞ BOYUTU': 'BUTTON SIZE',
  'TUŞ ŞEFFAFLIĞI': 'BUTTON OPACITY',
  'EL DÜZENİ': 'HANDEDNESS',
  'DİL': 'LANGUAGE',
  'ÖNİZLEME': 'PREVIEW',

  // --- Match HUD ------------------------------------------------------------------
  'ENERJİ': 'ENERGY',
  'DURAKLATILDI': 'PAUSED',
  'GOL!': 'GOAL!',
  'TEKRAR': 'REPLAY',
  'SÜPER HAREKET!': 'SUPER MOVE!',
  'RÖVAŞATA!': 'BICYCLE KICK!',
  'FALSO!': 'CURVE!',
  'YILDIRIM ŞUT!': 'LIGHTNING SHOT!',
  'ALEV ŞUT!': 'FIRE SHOT!',
  'RÜZGAR ŞUT!': 'WIND SHOT!',
  'TOPRAK ŞUT!': 'EARTH SHOT!',
  'YILDIRIM ŞUT': 'LIGHTNING SHOT',
  'ALEV ŞUT': 'FIRE SHOT',
  'RÜZGAR ŞUT': 'WIND SHOT',
  'TOPRAK ŞUT': 'EARTH SHOT',
  'MÜKEMMEL PARRY!': 'PERFECT PARRY!',
  'PARRY!': 'PARRY!',
  'Zıpla': 'JUMP',
  'Özel': 'SPECIAL',
  'Aksiyon': 'ACTION',
  'Dash': 'DASH',
  'Hareket': 'MOVE',
  'Space': 'SPACE',
  'Shift': 'SHIFT',
  'Sol tık': 'L-CLICK',
  'Sağ tık': 'R-CLICK',
  'Şut/Tut': 'SHOOT/CATCH',
  'Duraklat': 'PAUSE',

  // --- Result -------------------------------------------------------------------
  'KAZANDIN!': 'YOU WIN!',
  'KAYBETTİN': 'YOU LOST',
  'BERABERE': 'DRAW',
  'RÖVANŞ': 'REMATCH',
  'ALTIN': 'GOLD',
  'ELMAS': 'GEMS',
  'XP': 'XP',
  'DÜNYA ŞAMPİYONU!': 'WORLD CHAMPION!',
  'LİGDE İLERLEMEK İÇİN KAZAN': 'WIN TO MOVE UP THE LEAGUE',
  'AŞAMA BONUSU': 'STAGE BONUS',
  'SONRAKİ MAÇ': 'NEXT MATCH',
  'TEKRAR DENE': 'TRY AGAIN',

  // --- League (config/league.ts) ----------------------------------------------------
  'SOKAK DÜNYA KUPASI': 'STREET WORLD CUP',
  'Mahalle': 'BLOCK',
  'Sokak arası': 'BACK STREETS',
  'Şehir': 'CITY',
  'Şehir turnuvası': 'CITY CUP',
  'Kıta': 'CONTINENT',
  'Kıta kupası': 'CONTINENTAL CUP',
  'Dünya Finali': 'WORLD FINAL',
  'Sokak Dünya Kupası': 'STREET WORLD CUP',
  'ŞAMPİYONSUN!': 'CHAMPION!',
  'YENİ SEZONA BAŞLA': 'START A NEW SEASON',
  'YENİ SEZON': 'NEW SEASON',
  'SIRADAKİ': 'NEXT',
  'SAHA': 'PITCH',

  // --- Tutorial (config/tutorial.ts) ------------------------------------------------
  'EĞİTİM': 'TUTORIAL',
  'EĞİTİM TAMAM!': 'TUTORIAL DONE!',
  'ARTIK SOKAK DÜNYA KUPASINA HAZIRSIN': 'NOW YOU ARE READY FOR THE STREET WORLD CUP',
  'HAVADA YUKARI/AŞAĞI DASH UNUTMA': 'DO NOT FORGET THE UP/DOWN AIR DASH',
  'HAREKET': 'MOVE',
  'ZIPLA': 'JUMP',
  'DASH': 'DASH',
  'POWER ŞUT': 'POWER SHOT',
  'LOB': 'LOB',
  'TUT / PARRY': 'CATCH / PARRY',
  'FALSO': 'CURVE',
  'RÖVAŞATA': 'BICYCLE KICK',
  'SOL TARAFTA PARMAĞINI KAYDIR: SAĞA-SOLA VE YUKARI-AŞAĞI YÜRÜ':
    'SLIDE YOUR THUMB ON THE LEFT: WALK LEFT-RIGHT AND UP-DOWN',
  'WASD (YA DA OKLAR) İLE SAĞA-SOLA VE YUKARI-AŞAĞI YÜRÜ': 'WALK LEFT-RIGHT AND UP-DOWN WITH WASD (OR ARROWS)',
  'ZIPLA TUŞUNA BAS': 'PRESS THE JUMP BUTTON',
  'SPACE İLE ZIPLA': 'JUMP WITH SPACE',
  'JOYSTICK İLE BİR YÖN SEÇ, DASH TUŞUNA BAS (1 ENERJİ)': 'PICK A DIRECTION, PRESS DASH (1 ENERGY)',
  'BİR YÖNE BASARKEN SHIFT = DASH (1 ENERJİ)': 'HOLD A DIRECTION + SHIFT = DASH (1 ENERGY)',
  'TOPA GİT, AKSİYON TUŞUNA DOKUN. JOYSTICK YÖNÜ = ŞUT YÖNÜ':
    'GO TO THE BALL, TAP ACTION. JOYSTICK DIRECTION = SHOT DIRECTION',
  'TOPA GİT, SOL TIK = ŞUT. HAREKET YÖNÜ = ŞUT YÖNÜ': 'GO TO THE BALL, LEFT CLICK = SHOOT. MOVE DIRECTION = SHOT DIRECTION',
  'AKSİYONU BASILI TUT, BIRAK: BARIN TAMAMI HARCANIR': 'HOLD ACTION, RELEASE: USES THE WHOLE BAR',
  'SOL TIKI BASILI TUT, BIRAK: BARIN TAMAMI HARCANIR': 'HOLD LEFT CLICK, RELEASE: USES THE WHOLE BAR',
  'JOYSTICK GERİ (KENDİ KALENE) + AKSİYON = LOB': 'JOYSTICK BACK (TO YOUR GOAL) + ACTION = LOB',
  'A (GERİ) BASILIYKEN SOL TIK = LOB': 'HOLD A (BACK) + LEFT CLICK = LOB',
  'TOP GELİRKEN AKSİYONA BAS = TUT. TAM TEMAS ANINDA = MÜKEMMEL PARRY':
    'PRESS ACTION AS THE BALL COMES = CATCH. RIGHT AT CONTACT = PERFECT PARRY',
  'TOP GELİRKEN SOL TIK = TUT. TAM TEMAS ANINDA = MÜKEMMEL PARRY':
    'LEFT CLICK AS THE BALL COMES = CATCH. RIGHT AT CONTACT = PERFECT PARRY',
  'TOPLA ZIPLA, HAVADA YUKARI/AŞAĞI DASH, SONRA AKSİYON': 'JUMP WITH THE BALL, AIR DASH UP/DOWN, THEN ACTION',
  'TOPLA SPACE, HAVADA W/S + SHIFT, SONRA SOL TIK': 'SPACE WITH THE BALL, IN THE AIR W/S + SHIFT, THEN LEFT CLICK',
  'HAVADAKİ TOPA ZIPLA, ÖZEL TUŞUNA BAS (TAM BAR)': 'JUMP TO A HIGH BALL, PRESS SPECIAL (FULL BAR)',
  'HAVADAKİ TOPA SPACE İLE ZIPLA, SAĞ TIK = ÖZEL (TAM BAR)': 'SPACE TO JUMP TO A HIGH BALL, RIGHT CLICK = SPECIAL (FULL BAR)',
};

/** Regex rules for text with a variable part. `tr` translates a sub-piece. */
export const EN_PATTERNS: [RegExp, (m: RegExpMatchArray, tr: (s: string) => string) => string][] = [
  // Power cut-in second line: "GÜÇ 2"
  [/^GÜÇ (\d)$/, (m) => `POWER ${m[1]}`],
  // League stage cleared: "ŞEHİR TAMAM!"
  [/^(.+) TAMAM!$/, (m, tr) => `${tr(m[1])} CLEARED!`],
  // Tutorial step done: "ŞUT  TAMAM!" handled by the double-space splitter.
];
