/**
 * Astra Vedic Astrology Engine (Движок Ведической Астрологии «АСТРА»)
 * Zero external paid APIs, 100% local, high precision mathematical calculations.
 * Standard: Lahiri Ayanamsa (Chitrapaksha), Sidereal Zodiac (Nirayana).
 */

const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;

const ZODIAC_SIGNS = [
  { id: 'aries', ru: 'Овен', en: 'Aries', sanskrit: 'Меша', element: 'Огонь', ruler: 'Марс' },
  { id: 'taurus', ru: 'Телец', en: 'Taurus', sanskrit: 'Вришабха', element: 'Земля', ruler: 'Венера' },
  { id: 'gemini', ru: 'Близнецы', en: 'Gemini', sanskrit: 'Митхуна', element: 'Воздух', ruler: 'Меркурий' },
  { id: 'cancer', ru: 'Рак', en: 'Cancer', sanskrit: 'Карка', element: 'Вода', ruler: 'Луна' },
  { id: 'leo', ru: 'Лев', en: 'Leo', sanskrit: 'Симха', element: 'Огонь', ruler: 'Солнце' },
  { id: 'virgo', ru: 'Дева', en: 'Virgo', sanskrit: 'Канья', element: 'Земля', ruler: 'Меркурий' },
  { id: 'libra', ru: 'Весы', en: 'Libra', sanskrit: 'Тула', element: 'Воздух', ruler: 'Венера' },
  { id: 'scorpio', ru: 'Скорпион', en: 'Scorpio', sanskrit: 'Вришчика', element: 'Вода', ruler: 'Марс / Кету' },
  { id: 'sagittarius', ru: 'Стрелец', en: 'Sagittarius', sanskrit: 'Дхану', element: 'Огонь', ruler: 'Юпитер' },
  { id: 'capricorn', ru: 'Козерог', en: 'Capricorn', sanskrit: 'Макара', element: 'Земля', ruler: 'Сатурн' },
  { id: 'aquarius', ru: 'Водолей', en: 'Aquarius', sanskrit: 'Кумбха', element: 'Воздух', ruler: 'Сатурн / Раху' },
  { id: 'pisces', ru: 'Рыбы', en: 'Pisces', sanskrit: 'Мина', element: 'Вода', ruler: 'Юпитер' }
];

const NAKSHATRAS = [
  { num: 1, ru: 'Ашвини', ruler: 'Кету', symbol: 'Голова коня', deity: 'Ашвины' },
  { num: 2, ru: 'Бхарани', ruler: 'Венера', symbol: 'Йони', deity: 'Яма' },
  { num: 3, ru: 'Криттика', ruler: 'Солнце', symbol: 'Пламя', deity: 'Агни' },
  { num: 4, ru: 'Рохини', ruler: 'Луна', symbol: 'Колесница', deity: 'Брахма' },
  { num: 5, ru: 'Мригашира', ruler: 'Марс', symbol: 'Олень', deity: 'Сома' },
  { num: 6, ru: 'Ардра', ruler: 'Раху', symbol: 'Слеза', deity: 'Рудра' },
  { num: 7, ru: 'Пунарвасу', ruler: 'Юпитер', symbol: 'Лук и стрелы', deity: 'Адити' },
  { num: 8, ru: 'Пушья', ruler: 'Сатурн', symbol: 'Цветок лотоса', deity: 'Брихаспати' },
  { num: 9, ru: 'Ашлеша', ruler: 'Меркурий', symbol: 'Змея', deity: 'Сарпы' },
  { num: 10, ru: 'Магха', ruler: 'Кету', symbol: 'Трон', deity: 'Питри' },
  { num: 11, ru: 'Пурва Пхалгуни', ruler: 'Венера', symbol: 'Гамак', deity: 'Бхага' },
  { num: 12, ru: 'Уттара Пхалгуни', ruler: 'Солнце', symbol: 'Ложе', deity: 'Арьяман' },
  { num: 13, ru: 'Хаста', ruler: 'Луна', symbol: 'Кисть руки', deity: 'Савитар' },
  { num: 14, ru: 'Читра', ruler: 'Марс', symbol: 'Жемчужина', deity: 'Тваштар' },
  { num: 15, ru: 'Свати', ruler: 'Раху', symbol: 'Росток', deity: 'Ваю' },
  { num: 16, ru: 'Вишакха', ruler: 'Юпитер', symbol: 'Триумфальная арка', deity: 'Индра-Агни' },
  { num: 17, ru: 'Анурадха', ruler: 'Сатурн', symbol: 'Лотос', deity: 'Митра' },
  { num: 18, ru: 'Джьештха', ruler: 'Меркурий', symbol: 'Талисман', deity: 'Индра' },
  { num: 19, ru: 'Мула', ruler: 'Кету', symbol: 'Корни', deity: 'Ниррити' },
  { num: 20, ru: 'Пурва Ашадха', ruler: 'Венера', symbol: 'Веер', deity: 'Апас' },
  { num: 21, ru: 'Уттара Ашадха', ruler: 'Солнце', symbol: 'Бивни слона', deity: 'Вишвадевы' },
  { num: 22, ru: 'Шравана', ruler: 'Луна', symbol: 'Ухо', deity: 'Вишну' },
  { num: 23, ru: 'Дханишта', ruler: 'Марс', symbol: 'Барабан', deity: 'Васу' },
  { num: 24, ru: 'Шатабхиша', ruler: 'Раху', symbol: 'Круг со 100 звездами', deity: 'Варуна' },
  { num: 25, ru: 'Пурва Бхадрапада', ruler: 'Юпитер', symbol: 'Меч', deity: 'Аджа Экапад' },
  { num: 26, ru: 'Уттара Бхадрапада', ruler: 'Сатурн', symbol: 'Змея глубин', deity: 'Ахирбудхнья' },
  { num: 27, ru: 'Ревати', ruler: 'Меркурий', symbol: 'Рыба', deity: 'Пушан' }
];

function normalizeDeg(deg) {
  let d = deg % 360.0;
  if (d < 0) d += 360.0;
  return d;
}

// 1. Julian Day (JD) calculation (UT)
function getJulianDay(year, month, day, hour, minute = 0, second = 0) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const dayFrac = (hour + minute / 60.0 + second / 3600.0) / 24.0;
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + dayFrac + B - 1524.5;
}

// 2. Lahiri Ayanamsa for Julian Centuries T
function getLahiriAyanamsa(T) {
  // Ayanamsa at J2000 = 23° 51' 25" = 23.856944°
  // Precession rate: ~50.29 arcseconds per tropical year
  return 23.856944 + (1.396562 * T) + (0.000308 * T * T);
}

// 3. Obliquity of the Ecliptic
function getTrueObliquity(T) {
  return 23.43929111 - (0.013004167 * T);
}

// 4. Greenwich Mean Sidereal Time (degrees)
function getGMST(jd, T) {
  const d = jd - 2451545.0;
  let gmst = 280.46061837 + (360.98564736629 * d) + (0.000387933 * T * T);
  return normalizeDeg(gmst);
}

// 5. Sun Tropical Longitude (Jean Meeus algorithm)
function getSunLongitude(T) {
  const L0 = 280.46646 + 36000.76983 * T;
  const M = 357.52911 + 35999.05029 * T;
  const Mrad = normalizeDeg(M) * DEG2RAD;
  const C = (1.914602 - 0.004817 * T) * Math.sin(Mrad) + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) + 0.000289 * Math.sin(3 * Mrad);
  return normalizeDeg(L0 + C);
}

// 6. Moon Tropical Longitude (High Precision Perturbations)
function getMoonLongitude(T) {
  const Lprime = 218.3164477 + 481267.88123421 * T;
  const D = 297.8501921 + 445267.1114034 * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mprime = 134.9633964 + 477198.8675055 * T;
  const F = 93.2720950 + 483202.0175233 * T;

  const Drad = normalizeDeg(D) * DEG2RAD;
  const Mrad = normalizeDeg(M) * DEG2RAD;
  const Mprad = normalizeDeg(Mprime) * DEG2RAD;
  const Frad = normalizeDeg(F) * DEG2RAD;

  // Major periodic terms
  let l = Lprime
    + 6.288774 * Math.sin(Mprad)
    + 1.274027 * Math.sin(2 * Drad - Mprad)
    + 0.658314 * Math.sin(2 * Drad)
    + 0.213618 * Math.sin(2 * Mprad)
    - 0.185116 * Math.sin(Mrad)
    - 0.114332 * Math.sin(2 * Frad)
    + 0.058793 * Math.sin(2 * Drad - 2 * Mprad)
    + 0.057066 * Math.sin(2 * Drad - Mrad - Mprad)
    + 0.053322 * Math.sin(2 * Drad + Mprad)
    + 0.046100 * Math.sin(2 * Drad - Mrad);

  return normalizeDeg(l);
}

// 7. Rahu (Mean Lunar Node)
function getRahuLongitude(T) {
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T;
  return normalizeDeg(omega);
}

// 8. Ascendant (Lagna) in Vedic Astrology
function getAscendant(jd, T, lat, lon) {
  const gmst = getGMST(jd, T);
  const lst = normalizeDeg(gmst + lon); // Local Sidereal Time in degrees
  const eps = getTrueObliquity(T) * DEG2RAD;
  const phi = lat * DEG2RAD;
  const ramc = lst * DEG2RAD;

  // Standard ascendant formula: tan(Asc) = cos(RAMC) / (-sin(RAMC)*cos(eps) - tan(phi)*sin(eps))
  const y = Math.cos(ramc);
  const x = -Math.sin(ramc) * Math.cos(eps) - Math.tan(phi) * Math.sin(eps);
  let asc = Math.atan2(y, x) * RAD2DEG;
  return normalizeDeg(asc);
}

// 9. Coordinate to Vedic Sign, Degree, Nakshatra
function toVedicPosition(tropicalLong, ayanamsa) {
  const siderealLong = normalizeDeg(tropicalLong - ayanamsa);
  const signIndex = Math.floor(siderealLong / 30.0);
  const degreeInSign = siderealLong % 30.0;

  // Nakshatra: 27 nakshatras, each 13°20' (13.3333333°)
  const nakshatraIndex = Math.floor(siderealLong / (360.0 / 27.0));
  const nakshatraFrac = (siderealLong % (360.0 / 27.0)) / (360.0 / 27.0);
  const pada = Math.floor(nakshatraFrac * 4) + 1;

  const sign = ZODIAC_SIGNS[signIndex];
  const nakshatra = NAKSHATRAS[nakshatraIndex];

  return {
    siderealDegree: siderealLong,
    signIndex: signIndex,
    signRu: sign.ru,
    signSanskrit: sign.sanskrit,
    degreeInSign: degreeInSign,
    degreeStr: `${Math.floor(degreeInSign)}° ${Math.floor((degreeInSign % 1) * 60)}'`,
    nakshatraRu: nakshatra.ru,
    nakshatraNum: nakshatra.num,
    nakshatraRuler: nakshatra.ruler,
    pada: pada
  };
}

/**
 * Calculate Complete Vedic Natal Chart (Кундали / Джанма Патрика)
 * @param {Object} input - { year, month, day, hour, minute, lat, lon, timezoneOffsetHours }
 */
function calculateNatalChart({ year, month, day, hour, minute = 0, lat, lon, tz = 3 }) {
  // Convert local time to UTC
  const utcHour = hour - tz;
  const jd = getJulianDay(year, month, day, utcHour, minute);
  const T = (jd - 2451545.0) / 36525.0;
  const ayanamsa = getLahiriAyanamsa(T);

  // 1. Ascendant (Лагна)
  const tropAsc = getAscendant(jd, T, lat, lon);
  const lagna = toVedicPosition(tropAsc, ayanamsa);

  // 2. Planets
  const tropSun = getSunLongitude(T);
  const tropMoon = getMoonLongitude(T);
  const tropRahu = getRahuLongitude(T);
  const tropKetu = normalizeDeg(tropRahu + 180.0);

  const sun = toVedicPosition(tropSun, ayanamsa);
  const moon = toVedicPosition(tropMoon, ayanamsa);
  const rahu = toVedicPosition(tropRahu, ayanamsa);
  const ketu = toVedicPosition(tropKetu, ayanamsa);

  // 3. 12 Vedic Houses (Bhava Chalita - Equal Sign from Lagna)
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const houseSignIndex = (lagna.signIndex + i) % 12;
    const sign = ZODIAC_SIGNS[houseSignIndex];
    houses.push({
      houseNumber: i + 1,
      signRu: sign.ru,
      signSanskrit: sign.sanskrit,
      ruler: sign.ruler
    });
  }

  // 4. Determine which house each planet occupies
  function getHouseNumber(planetSignIndex) {
    return ((planetSignIndex - lagna.signIndex + 12) % 12) + 1;
  }

  sun.house = getHouseNumber(sun.signIndex);
  moon.house = getHouseNumber(moon.signIndex);
  rahu.house = getHouseNumber(rahu.signIndex);
  ketu.house = getHouseNumber(ketu.signIndex);

  return {
    meta: {
      calculatedAt: new Date().toISOString(),
      system: 'Vedic Sidereal (Nirayana)',
      ayanamsaName: 'Lahiri (Chitrapaksha)',
      ayanamsaValue: `${Math.floor(ayanamsa)}° ${Math.floor((ayanamsa % 1) * 60)}' ${Math.floor((((ayanamsa % 1) * 60) % 1) * 60)}"`,
      coordinates: { lat, lon },
      julianDay: jd.toFixed(4)
    },
    lagna: {
      title: 'Лагна (Восходящий знак / Асцендент)',
      ...lagna
    },
    planets: {
      sun: { ru: 'Сурья (Солнце)', ...sun },
      moon: { ru: 'Чандра (Луна)', ...moon },
      rahu: { ru: 'Раху (Северный Узел)', ...rahu },
      ketu: { ru: 'Кету (Южный Узел)', ...ketu }
    },
    houses: houses
  };
}

/**
 * Calculate Vedic Tithi (Лунный день), Paksha, Illumination and Transits for any Date
 */
function getVedicTithi(date = new Date()) {
  const jd = getJulianDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes());
  const T = (jd - 2451545.0) / 36525.0;
  const ayanamsa = getLahiriAyanamsa(T);
  const tropSun = getSunLongitude(T);
  const tropMoon = getMoonLongitude(T);
  const sun = toVedicPosition(tropSun, ayanamsa);
  const moon = toVedicPosition(tropMoon, ayanamsa);

  // Vedic Tithi: angular distance from Sun to Moon divided by 12 degrees
  let delta = normalizeDeg(tropMoon - tropSun);
  const tithiNum = Math.min(30, Math.max(1, Math.floor(delta / 12.0) + 1));
  const isShukla = tithiNum <= 15;
  const paksha = isShukla ? 'Шукла Пакша (Растущая)' : 'Кришна Пакша (Убывающая)';
  const illumination = Math.round(((1 - Math.cos(delta * DEG2RAD)) / 2) * 100);

  let phaseName = 'Растущая Луна';
  if (tithiNum === 1) phaseName = 'Новолуние';
  else if (tithiNum === 15) phaseName = 'Полнолуние';
  else if (tithiNum === 30) phaseName = 'Новолуние';
  else if (isShukla) phaseName = 'Растущая Луна';
  else phaseName = 'Убывающая Луна';

  return {
    tithiNum,
    paksha,
    isShukla,
    phaseName,
    illumination,
    deltaDeg: delta,
    sun,
    moon,
    ayanamsa
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateNatalChart,
    getJulianDay,
    getLahiriAyanamsa,
    getSunLongitude,
    getMoonLongitude,
    toVedicPosition,
    getVedicTithi,
    ZODIAC_SIGNS,
    NAKSHATRAS
  };
}

if (typeof window !== 'undefined') {
  window.calculateNatalChart = calculateNatalChart;
  window.getJulianDay = getJulianDay;
  window.getLahiriAyanamsa = getLahiriAyanamsa;
  window.getSunLongitude = getSunLongitude;
  window.getMoonLongitude = getMoonLongitude;
  window.toVedicPosition = toVedicPosition;
  window.getVedicTithi = getVedicTithi;
  window.ZODIAC_SIGNS = ZODIAC_SIGNS;
  window.NAKSHATRAS = NAKSHATRAS;
}

// Run demonstration if called directly
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  console.log('--- Testing Astra Vedic Natal Calculator ---');
  // Example birth: 15 July 1995, 14:30 Moscow (55.7558 N, 37.6173 E, UTC+3)
  const chart = calculateNatalChart({
    year: 1995,
    month: 7,
    day: 15,
    hour: 14,
    minute: 30,
    lat: 55.7558,
    lon: 37.6173,
    tz: 3
  });

  console.log(JSON.stringify(chart, null, 2));
  console.log('--- Testing Today Vedic Tithi ---');
  console.log(getVedicTithi(new Date()));
}
