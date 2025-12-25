# Архитектура Spawn Manager

## Обзор
Spawn Manager был рефакторирован из одного большого файла в модульную систему для улучшения читаемости, поддержки и расширяемости кода.

## Структура модулей

### 1. `spawnManager.js` (основной интерфейс)
- Главная точка входа для системы спавна
- Объединяет все модули в единый интерфейс
- Сохраняет обратную совместимость с остальной системой

### 2. `spawnManager.core.js`
- Основная логика управления спавном
- Функция `run` - главный цикл спавна
- Базовые утилиты: `pickBody`, `baseMemory`, `memoryFactories`

### 3. `spawnManager.roomData.js`
- Функции для работы с данными комнат
- `hasContainerInRoom` - проверка наличия контейнеров
- `getThreatLevel` - оценка угрозы в комнате
- `getSourceContainers` - поиск контейнеров возле источников
- `roomHasConstructionOrContainersOrRoads` - проверка наличия строительных работ

### 4. `spawnManager.creepCounting.js`
- Функции для подсчета и управления крипами
- `countCreepsByRole` - подсчет крипов по ролям
- `getRoomConfig` - получение конфигурации комнаты
- `hasSufficientBaseCreeps` - проверка достаточности базовых крипов
- `selectTargetRoom` - выбор целевой комнаты для крипов

### 5. `spawnManager.phases.js`
- Реализация различных фаз спавна
- `tryLocalPhase` - локальная фаза спавна
- `tryDefensePhase` - фаза обороны
- `tryRemotePhase` - фаза удаленного спавна
- `tryLocalFillPhase` - фаза заполнения локальных потребностей
- `tryRemoteReplacementPhase` - фаза замены удаленных крипов
- `tryRulesPhase` - фаза спавна по декларативным правилам
- `attemptSpawn` - попытка спавна крипа

## Преимущества модульной архитектуры

1. **Читаемость**: Каждый модуль имеет четко определенную ответственность
2. **Поддержка**: Легче находить и исправлять ошибки в конкретных компонентах
3. **Тестирование**: Можно тестировать каждый модуль отдельно
4. **Расширяемость**: Легко добавлять новые функции в соответствующие модули
5. **Повторное использование**: Модули могут использоваться в других частях системы

## Зависимости между модулями

- `spawnManager.core.js` использует: `spawnManager.roomData.js`, `spawnManager.creepCounting.js`, `spawnManager.phases.js`
- `spawnManager.phases.js` использует: `spawnManager.roomData.js`, `spawnManager.creepCounting.js`, `spawnManager.core.js`
- `spawnManager.js` объединяет все модули в единый интерфейс

## Использование

Для использования Spawn Manager в других частях системы:
```javascript
const spawnManager = require('./controller/spawnManager');
spawnManager.run(spawn, baseState);
```

Или для использования отдельных функций:
```javascript
const { countCreepsByRole } = require('./controller/spawnManager');
const count = countCreepsByRole('harvester', 'E19S8');