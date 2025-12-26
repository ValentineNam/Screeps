const utils = require('./utils');
const { log } = utils;

// Import all roles
const roles = {
    builder: require('./role.builder'),
    remoteBuilder: require('./role.builder'),
    claimer: require('./role.claimer'),
    crawler: require('./role.crawler'),
    defender: require('./role.defender'),
    harvester: require('./role.harvester'),
    remoteHarvester: require('./role.remoteHarvester'),
    healer: require('./role.healer'),
    guardian: require('./role.guardian'),
    miner: require('./role.miner'),
    towerman: require('./role.towerman'),
    upgrader: require('./role.upgrader'),
    scout: require('./role.scout'),
    logist: require('./role.logist'),
    distributor: require('./role.distributor'),

    // squad_tank: require('./role.squadTank'),
    // squad_damager: require('./role.squadDamager'),
    // squad_ranger: require('./role.squadRanger'),
    // squad_healer: require('./role.squadHealer'),
};

const constants = require('./config.constants');

const towerManager = require('./controller.towerManager');
const spawnManager = require('./controller.spawnManager');
const missionManager = require('./controller.missionManager');
const linkManager = require('./controller.linkManager');

const state = require('./state');

const roomDataService = require('./service.roomDataService');
const statsService = require('./service.statsService');
const chemistryManager = require('./service.chemistryManager');

module.exports.loop = () => {
    const spawns = Object.values(Game.spawns);

    // 1. Инициализация памяти
    // Если Memory.rooms — не определён или является массивом (оставшийся от старых версий),
    // приводим его к объекту, чтобы использовать как map roomName -> data
    if (!Memory.rooms || Array.isArray(Memory.rooms)) Memory.rooms = {};
    if (!Memory.baseStates) Memory.baseStates = {};
    
    // Инициализация объекта stats для кеширования Memory.stats.currTime и других метрик
    if (!Memory.stats) Memory.stats = {};
    Memory.stats.currTime = Game.time;

    // Выводим список комнат, помеченных как homeRoom, при каждом 100-м тике для отладки
    if (Memory.stats.currTime % 100 === 0) {
        const claimerModule = require('./role.claimer');
        const homeRooms = claimerModule.getHomeRooms ? claimerModule.getHomeRooms() : [];
        log('INFO', `Комнаты, помеченные как homeRoom: ${homeRooms.join(', ')}`, 'System');
        log('INFO', `Текущий GCL уровень: ${Game.gcl.level}, количество комнат: ${Object.keys(Game.rooms).filter(name => Game.rooms[name].controller && Game.rooms[name].controller.my).length}`, 'System');
    }

    // 2. Обновляем данные по комнатам (раз в ~N тиков) — распределяем обновления по тикам,
    // чтобы не обновлять все комнаты одновременно и не создавать пиковой нагрузки на CPU.
    const roomNames = Object.keys(Game.rooms);
    if (roomNames.length > 0) {
        // Обновляем одну комнату за тик; с N комнатами каждая будет обновляться каждые N тиков.
        const roomToUpdate = roomNames[Memory.stats.currTime % roomNames.length];
        roomDataService.updateRoomData(roomToUpdate, 5);
        // Запускаем менеджер химии для этой комнаты (асинхронно: по одной комнате за тик)
        try { chemistryManager.run(roomToUpdate); } catch (e) { /* ignore */ }
        
        // Additional chemistry management tasks
        try {
            chemistryManager.handleLabTransfers(roomToUpdate);
            chemistryManager.processReadyReactions(roomToUpdate);
        } catch (e) { /* ignore */ }
    }

    // Глобальное распределение терминалов — запускаем раз в 20 тиков
    if (Memory.stats.currTime % 20 === 0) {
        try {
            chemistryManager.distributeTerminals();
            chemistryManager.scheduleProductionFromTargets(); // Schedule production based on target stocks
        } catch (e) { /* ignore */ }
    }

    // 3. Анализируем состояние комнат и сохраняем в state
    // Распределяем обновления по тикам, чтобы избежать пиковой нагрузки
    if (roomNames.length > 0) {
        // Обновляем только часть комнат за тик, распределяя по циклу
        // Каждые 5 тиков каждая комната будет обновлена (если комнат <= 5)
        // Если комнат больше 5, то каждая комната будет обновляться раз в Math.ceil(rooms/5) тиков
        const roomsPerTick = Math.max(1, Math.floor(roomNames.length / 5)); // максимум 5 комнат за тик
        const startIdx = (Memory.stats.currTime % 5) * roomsPerTick;
        const endIdx = Math.min(startIdx + roomsPerTick, roomNames.length);
        
        for (let i = startIdx; i < endIdx; i++) {
            const roomName = roomNames[i];
            const room = Game.rooms[roomName];
            const roomData = Memory.rooms[roomName] || {};
            const stats = roomData.stats || {};

            // Формируем новое состояние
            const newState = {
                stage: stats.stage || 'Unknown',
                controllerLevel: (room.controller && room.controller.level) || 0,
                hasEnemies: (roomData.enemies || []).length > 0,
                enemyCount: (roomData.enemies || []).length,
                totalEnergy: stats.totalEnergy || 0,
                sourceCount: stats.sourceCount || 0,
                containerCount: stats.containerCount || 0,
                towerCount: stats.towerCount || 0,
                isUnderAttack: (roomData.enemies || []).length >= 3,
                needsDefense: (roomData.enemies || []).length > 0 && stats.towerCount === 0,
                lastChecked: Memory.stats.currTime
            };

            // Сохраняем состояние через ваш state-модуль
            state.setState(roomName, newState, {
                updatedAt: Memory.stats.currTime,
                roomName: roomName
            });
        }
    }

    // 4. Управление спавнами
    for (const spawn of spawns) {
        const baseState = state.getState(spawn.room.name);
        spawnManager.run(spawn, baseState);
    }

    // 5. Выполнение ролей
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const role = creep.memory.role;
        if (roles[role]) {
            roles[role].run(creep);
        }
    }

    // 6. Управление башнями
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        towerManager.runTowers(room);
    }

    // 7. Статистика и очистка памяти
    statsService.printStats(spawns, Game.rooms, roles, constants, {
        roleOrder: [/* ваш порядок */]
    });

    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            log('INFO', `Deleted memory of dead creep: ${name}`, 'System');
        }
    }
};

// Добавляем функции логирования в глобальный объект для доступа из консоли
global.setLogLevel = (level, enabled = true) => {
    const utils = require('./utils');
    return utils.setLogLevel(level, enabled);
};

global.setLogLevels = (levels) => {
    const utils = require('./utils');
    return utils.setLogLevels(levels);
};

global.getLogLevels = () => {
    const utils = require('./utils');
    return utils.getLogLevels();
};

// memory
// Memory.rooms[roomName] = {
//     structures: [...],          // все строения (с фильтрацией)
//     sources: [...],           // источники энергии
//     minerals: [...],          // ресурсные источники (кремний, металл и т.п.)
//     enemies: [...],           // враги в комнате
//     enemyStructures: [...],     // вражеские постройки
//     stats: { ... },         // вычисленные метрики (stage, энергия и т.п.)
//     lastUpdated: Memory.stats.currTime     // метка времени для инвалидации
// };
