
const constants = require('./config.constants');

module.exports = {
  // Общий поиск элемента по ключу и значению
  // Например, для поиска источника по id внутри массива sources
  find: (objType = 'rooms', key, value) => {
    if (!Memory[objType]) return undefined;
    for (const name in Memory[objType]) {
      const data = Memory[objType][name];

      if (Array.isArray(data)) {
        // Поиск внутри массива объектов по ключу
        const item = data.find(elem => elem[key] === value);
        if (item) return item;
      } else if (typeof data === 'object') {
        // Проверка сразу для объекта
        if (data[key] === value) return data;
      }
    }
    return undefined; // не найдено
  },

  // Находит все совпадения по ключу и значению в массиве
  findAll: (objType = 'rooms', key, value) => {
    const results = [];
    if (!Memory[objType]) return results;
    for (const name in Memory[objType]) {
      const data = Memory[objType][name];
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item[key] === value) {
            results.push(item);
          }
        }
      } else if (typeof data === 'object') {
        if (data[key] === value) results.push(data);
      }
    }
    return results;
  },

  // Добавляет новый объект в массив или обновляет существующий по id
  addOrUpdateItem: (objType = 'rooms', name, arrayKey, item) => {
    if (!Memory[objType]) return;
    if (!Memory[objType][name]) {
      // Создаем структуру если нет
      Memory[objType][name] = {};
    }
    if (!Array.isArray(Memory[objType][name][arrayKey])) {
      Memory[objType][name][arrayKey] = [];
    }
    const arr = Memory[objType][name][arrayKey];
    const index = arr.findIndex(elem => elem.id === item.id);
    if (index !== -1) {
      // Обновляем
      arr[index] = item;
    } else {
      // Добавляем
      arr.push(item);
    }
  },

  // Удаляет элемент из массива по id
  removeItem: (objType = 'rooms', name, arrayKey, id) => {
    if (!Memory[objType] || !Memory[objType][name]) return;
    const arr = Memory[objType][name][arrayKey];
    if (Array.isArray(arr)) {
      const index = arr.findIndex(e => e.id === id);
      if (index !== -1) {
        arr.splice(index, 1);
      }
    }
  },

  // Полностью очищает структуру (например, комнату или задачи)
  clear: (objType = 'rooms') => {
    delete Memory[objType];
  },

  // Устанавливает/обновляет всю структуру для конкретного объекта (например, для комнаты)
  set: (objType = 'rooms', name, data) => {
    if (!Memory[objType]) {
      Memory[objType] = {};
    }
    Memory[objType][name] = data;
  },

  // Восстанавливает память из базовой конфигурации
  reset: (baseMemory) => {
    // очищаем всё
    for (const objType in Memory) {
      delete Memory[objType];
    }
    // восстанавливаем базовые данные
    for (const objType in baseMemory) {
      Memory[objType] = baseMemory[objType];
    }
  }
};


// Как это использовать
// Добавить или обновить источник:

// js

// // пример добавления источника внутри комнаты 'W13S8'
// memUtils.addOrUpdateItem('rooms', 'W13S8', 'sources', {
//   id: 'id1',
//   coords: {x: 25, y: 25}
// });
// Найти источник по id:

// js

// const source = memUtils.find('rooms', 'id', 'id1');
// Удалить источник по id:

// js

// memUtils.removeItem('rooms', 'W13S8', 'sources', 'id1');
// Обновить всю комнату:

// js

// memUtils.set('rooms', 'W13S8', {
//   sources: [...],
//   spawns: [...],
//   // другие свойства
// });
// Итог
// Этот подход позволит вам гибко управлять структурой данных, независимо от того, храните ли вы структуру комнат, задачи, врагов или любые другие объекты.

// Если нужно, я могу помочь доработать функции или адаптировать под более сложные сценарии!
