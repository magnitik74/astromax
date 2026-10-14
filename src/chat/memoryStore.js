/**
 * AstroMAX Persistent & In-Memory Context Store
 * Stores user profiles, onboarding states, birth data, and dialogue memory for 24/7 Astrologer.
 */

export class MemoryStore {
  constructor() {
    this.users = new Map();
  }

  /**
   * Получение или создание профиля пользователя
   * @param {string|number} userId
   */
  getUser(userId) {
    const id = String(userId);
    if (!this.users.has(id)) {
      this.users.set(id, {
        id,
        state: 'START', // START -> WAITING_BIRTH_DATE -> WAITING_BIRTH_TIME -> WAITING_CITY -> READY
        profile: {
          name: '',
          birthDate: null,
          birthTime: '12:00',
          city: 'Москва',
          lat: 55.7558,
          lon: 37.6173,
          timezoneOffset: 3,
        },
        natalChart: null,
        history: [], // [{ role: 'user'|'assistant', content, timestamp }]
        lifeContext: {
          relationshipStatus: '',
          keyWorries: [],
          lastTarotCard: null,
          recentTopics: [],
        },
        usage: {
          questionsToday: 0,
          freeQuestionsLimit: 5,
          isSubscriber: false,
          lastActive: new Date().toISOString(),
        },
      });
    }
    return this.users.get(id);
  }

  /**
   * Обновление состояния онбординга
   */
  setState(userId, state) {
    const user = this.getUser(userId);
    user.state = state;
    user.usage.lastActive = new Date().toISOString();
    return user;
  }

  /**
   * Обновление натальных данных
   */
  updateProfile(userId, partialProfile) {
    const user = this.getUser(userId);
    user.profile = { ...user.profile, ...partialProfile };
    return user;
  }

  /**
   * Сохранение рассчитанной натальной карты
   */
  setNatalChart(userId, chart) {
    const user = this.getUser(userId);
    user.natalChart = chart;
    return user;
  }

  /**
   * Добавление сообщения в историю (с ограничением окна памяти до 12 последних реплик)
   */
  addMessage(userId, role, content) {
    const user = this.getUser(userId);
    user.history.push({ role, content, timestamp: new Date().toISOString() });
    if (user.history.length > 12) {
      user.history.shift(); // Оставляем окно контекста в пределах лимитов
    }
    return user;
  }

  /**
   * Фиксация жизненного контекста (отношения, тревоги, темы)
   */
  addLifeContext(userId, key, value) {
    const user = this.getUser(userId);
    if (Array.isArray(user.lifeContext[key])) {
      if (!user.lifeContext[key].includes(value)) {
        user.lifeContext[key].push(value);
      }
    } else {
      user.lifeContext[key] = value;
    }
    return user;
  }
}

export const globalMemoryStore = new MemoryStore();
