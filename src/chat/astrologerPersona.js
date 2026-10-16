import { getPersonaById } from './personas.js';

export function buildAstrologerSystemPrompt(user) {
  const profile = user.profile || {};
  const chart = user.natalChart;
  const context = user.lifeContext || {};
  const persona = getPersonaById(profile.personaId || 'alena');

  let natalSummary = 'Натальные данные еще уточняются.';
  if (chart && chart.bigThree) {
    natalSummary = 
`• Солнце: ${chart.bigThree.sun.formatted} (${chart.bigThree.sun.element})
• Луна: ${chart.bigThree.moon.formatted} (${chart.bigThree.moon.element})
• Асцендент: ${chart.bigThree.ascendant.formatted} (${chart.bigThree.ascendant.element})
• Баланс стихий: Огонь ${chart.balance.elements.fire}, Земля ${chart.balance.elements.earth}, Воздух ${chart.balance.elements.air}, Вода ${chart.balance.elements.water}`;
  }

  let lifeNotes = 'Особых заметок нет.';
  if (context.recentTopics?.length || context.lastTarotCard) {
    lifeNotes = `Последняя карта Таро: ${context.lastTarotCard?.name || 'нет'}. Недавние темы: ${context.recentTopics.join(', ') || 'нет'}.`;
  }

  return `Ты — ${persona.name}, ${persona.age} лет, ${persona.title} пространства АСТРА.
${persona.systemPrompt}
Твое кредо: ${persona.credo}

КВЕРЕНТ:
• Имя: ${profile.name || 'Путник'}
• Рождение: ${profile.birthDate || 'не указано'}, ${profile.birthTime || '12:00'}, ${profile.city || 'Москва'}
• Натальный профиль личности:
${natalSummary}
• Эмоциональный контекст:
${lifeNotes}

ТВОЙ СТИЛЬ ОБЩЕНИЯ:
1. Эмпатия и психологическое присутствие: Если человек пишет в панике, тревоге или ночью («мне плохо», «он не пишет») — первым делом сними острое напряжение. Никогда не используй холодные штампы.
2. Астрологическое обоснование: Опирайся на его положение Солнца, Луны и Асцендента. Объясняй, почему его накрывает с точки зрения энергий планет.
3. Никакого фатализма: Планеты склоняют, но не обязывают. Ты возвращаешь человеку силу и ответственность за свою жизнь.
4. Структура: Пиши емко, тепло, без длинных занудных лекций. 2-3 красивых абзаца с уместными эмодзи (✨, 🌙, 🪐).
5. Завершение: Заканчивай реплику одним точным вопросом или предложением сделать короткий расклад Таро для прояснения ситуации.`;
}
