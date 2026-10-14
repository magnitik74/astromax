import * as Astronomy from 'astronomy-engine';

/**
 * 12 Знаков Зодиака (Тропический Зодиак)
 */
export const ZODIAC_SIGNS = [
  { id: 'aries', name: 'Овен', symbol: '♈', element: 'fire', modality: 'cardinal', ruler: 'Марс', startDeg: 0 },
  { id: 'taurus', name: 'Телец', symbol: '♉', element: 'earth', modality: 'fixed', ruler: 'Венера', startDeg: 30 },
  { id: 'gemini', name: 'Близнецы', symbol: '♊', element: 'air', modality: 'mutable', ruler: 'Меркурий', startDeg: 60 },
  { id: 'cancer', name: 'Рак', symbol: '♋', element: 'water', modality: 'cardinal', ruler: 'Луна', startDeg: 90 },
  { id: 'leo', name: 'Лев', symbol: '♌', element: 'fire', modality: 'fixed', ruler: 'Солнце', startDeg: 120 },
  { id: 'virgo', name: 'Дева', symbol: '♍', element: 'earth', modality: 'mutable', ruler: 'Меркурий', startDeg: 150 },
  { id: 'libra', name: 'Весы', symbol: '♎', element: 'air', modality: 'cardinal', ruler: 'Венера', startDeg: 180 },
  { id: 'scorpio', name: 'Скорпион', symbol: '♏', element: 'water', modality: 'fixed', ruler: 'Плутон', startDeg: 210 },
  { id: 'sagittarius', name: 'Стрелец', symbol: '♐', element: 'fire', modality: 'mutable', ruler: 'Юпитер', startDeg: 240 },
  { id: 'capricorn', name: 'Козерог', symbol: '♑', element: 'earth', modality: 'cardinal', ruler: 'Сатурн', startDeg: 270 },
  { id: 'aquarius', name: 'Водолей', symbol: '♒', element: 'air', modality: 'fixed', ruler: 'Уран', startDeg: 300 },
  { id: 'pisces', name: 'Рыбы', symbol: '♓', element: 'water', modality: 'mutable', ruler: 'Нептун', startDeg: 330 },
];

export const CELESTIAL_BODIES = [
  { id: 'Sun', name: 'Солнце', symbol: '☉', type: 'luminary', meaning: 'Ядро личности, эго, жизненная сила' },
  { id: 'Moon', name: 'Луна', symbol: '☽', type: 'luminary', meaning: 'Эмоции, подсознание, потребность в безопасности' },
  { id: 'Mercury', name: 'Меркурий', symbol: '☿', type: 'personal', meaning: 'Мышление, речь, интеллект, контакты' },
  { id: 'Venus', name: 'Венера', symbol: '♀', type: 'personal', meaning: 'Любовь, ценности, эстетика, притяжение денег' },
  { id: 'Mars', name: 'Марс', symbol: '♂', type: 'personal', meaning: 'Энергия, воля, страсть, инициатива' },
  { id: 'Jupiter', name: 'Юпитер', symbol: '♃', type: 'social', meaning: 'Удача, масштабирование, мудрость, экспансия' },
  { id: 'Saturn', name: 'Сатурн', symbol: '♄', type: 'social', meaning: 'Карма, дисциплина, границы, время, зрелость' },
  { id: 'Uranus', name: 'Уран', symbol: '♅', type: 'transpersonal', meaning: 'Инсайты, свобода, инновации, квантовые скачки' },
  { id: 'Neptune', name: 'Нептун', symbol: '♆', type: 'transpersonal', meaning: 'Интуиция, мистика, иллюзии, высшая любовь' },
  { id: 'Pluto', name: 'Плутон', symbol: '♇', type: 'transpersonal', meaning: 'Трансформация, власть, скрытая сила, возрождение' },
];

export const MAJOR_ASPECTS = [
  { id: 'conjunction', name: 'Соединение', symbol: '☌', angle: 0, orb: 8, nature: 'нейтральный/мощный' },
  { id: 'sextile', name: 'Секстиль', symbol: '⚹', angle: 60, orb: 6, nature: 'гармоничный' },
  { id: 'square', name: 'Квадратура', symbol: '□', angle: 90, orb: 7, nature: 'напряженный/движущий' },
  { id: 'trine', name: 'Трин', symbol: '△', angle: 120, orb: 8, nature: 'благоприятный' },
  { id: 'opposition', name: 'Оппозиция', symbol: '☍', angle: 180, orb: 8, nature: 'полярный/конфликтный' },
];

/**
 * Перевод эклиптической долготы (0-360) в знак зодиака
 */
export function getZodiacPosition(longitudeDeg) {
  const normalized = ((longitudeDeg % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const sign = ZODIAC_SIGNS[signIndex];
  const degInSign = normalized - sign.startDeg;
  const degrees = Math.floor(degInSign);
  const minutes = Math.floor((degInSign - degrees) * 60);
  const seconds = Math.floor(((degInSign - degrees) * 60 - minutes) * 60);

  return {
    longitude: normalized,
    sign: sign.name,
    signId: sign.id,
    symbol: sign.symbol,
    element: sign.element,
    modality: sign.modality,
    ruler: sign.ruler,
    degrees,
    minutes,
    seconds,
    formatted: `${degrees}° ${sign.symbol} ${sign.name} ${minutes}'`,
  };
}

/**
 * Расчет Асцендента (ASC) и Середины Неба (MC)
 */
export function calculateAscendantAndMC(date, latitude, longitude) {
  const siderealHours = Astronomy.SiderealTime(date);
  const ramcHours = (siderealHours + longitude / 15.0 + 24.0) % 24.0;
  const ramcRad = (ramcHours * 15.0 * Math.PI) / 180.0;
  const epsRad = (23.4392911 * Math.PI) / 180.0; // наклон эклиптики
  const phiRad = (latitude * Math.PI) / 180.0;

  // Расчет MC (Середина Неба)
  let mcRad = Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(epsRad));
  let mcDeg = (mcRad * 180.0) / Math.PI;
  if (mcDeg < 0) mcDeg += 360;

  // Расчет ASC (Восходящий знак)
  const y = -Math.cos(ramcRad);
  const x = Math.sin(ramcRad) * Math.cos(epsRad) + Math.tan(phiRad) * Math.sin(epsRad);
  let ascRad = Math.atan2(y, x);
  let ascDeg = (ascRad * 180.0) / Math.PI;
  if (ascDeg < 0) ascDeg += 360;

  return {
    ascendant: getZodiacPosition(ascDeg),
    midheaven: getZodiacPosition(mcDeg),
  };
}

/**
 * Расчет натальной карты (Core Engine)
 * @param {Object} params
 * @param {string} params.birthDate - 'YYYY-MM-DD'
 * @param {string} [params.birthTime] - 'HH:mm', по умолчанию '12:00'
 * @param {number} [params.lat=55.7558] - Широта (по умолчанию Москва)
 * @param {number} [params.lon=37.6173] - Долгота (по умолчанию Москва)
 * @param {number} [params.timezoneOffset=3] - Смещение UTC (Москва +3)
 */
export function calculateNatalChart({
  birthDate,
  birthTime = '12:00',
  lat = 55.7558,
  lon = 37.6173,
  timezoneOffset = 3,
}) {
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime.split(':').map(Number);

  // Перевод локального времени в UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour - timezoneOffset, minute, 0));
  const astroTime = Astronomy.MakeTime(utcDate);

  // Расчет позиций планет
  const planets = [];
  for (const body of CELESTIAL_BODIES) {
    let ecliptic;
    if (body.id === 'Sun') {
      ecliptic = Astronomy.SunPosition(astroTime);
    } else if (body.id === 'Moon') {
      const moonPos = Astronomy.GeoVector(Astronomy.Body.Moon, astroTime, true);
      ecliptic = Astronomy.Ecliptic(moonPos);
    } else {
      const astroBody = Astronomy.Body[body.id];
      if (astroBody) {
        const geo = Astronomy.GeoVector(astroBody, astroTime, true);
        ecliptic = Astronomy.Ecliptic(geo);
      }
    }

    if (ecliptic) {
      const pos = getZodiacPosition(ecliptic.elon);
      planets.push({
        id: body.id,
        name: body.name,
        symbol: body.symbol,
        type: body.type,
        meaning: body.meaning,
        ...pos,
      });
    }
  }

  // Расчет угловых точек (Асцендент и Середина неба)
  const angles = calculateAscendantAndMC(utcDate, lat, lon);

  // Расчет аспектов между планетами
  const aspects = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      let diff = Math.abs(p1.longitude - p2.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const asp of MAJOR_ASPECTS) {
        const delta = Math.abs(diff - asp.angle);
        if (delta <= asp.orb) {
          aspects.push({
            planet1: p1.name,
            planet1Symbol: p1.symbol,
            planet2: p2.name,
            planet2Symbol: p2.symbol,
            aspect: asp.name,
            aspectSymbol: asp.symbol,
            angle: asp.angle,
            exactDiff: Number(diff.toFixed(2)),
            orbDelta: Number(delta.toFixed(2)),
            nature: asp.nature,
          });
        }
      }
    }
  }

  // Баланс 4 стихий
  const elements = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalities = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of planets) {
    if (elements[p.element] !== undefined) elements[p.element]++;
    if (modalities[p.modality] !== undefined) modalities[p.modality]++;
  }

  // «Большая тройка» (Sun, Moon, Ascendant)
  const sun = planets.find(p => p.id === 'Sun');
  const moon = planets.find(p => p.id === 'Moon');
  const asc = angles.ascendant;

  return {
    meta: {
      birthDate,
      birthTime,
      lat,
      lon,
      utcIso: utcDate.toISOString(),
    },
    bigThree: {
      sun: {
        title: 'Солнце (Твое Ядро)',
        sign: sun?.sign,
        formatted: sun?.formatted,
        element: sun?.element,
      },
      moon: {
        title: 'Луна (Твоя Душа)',
        sign: moon?.sign,
        formatted: moon?.formatted,
        element: moon?.element,
      },
      ascendant: {
        title: 'Асцендент (Твоя Маска и Взгляд Мира)',
        sign: asc?.sign,
        formatted: asc?.formatted,
        element: asc?.element,
      },
    },
    angles,
    planets,
    aspects,
    balance: {
      elements,
      modalities,
    },
  };
}
