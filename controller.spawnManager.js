const constants = require('./config.constants');
const nameGenerator = require('./service.nameGenerator');
const missionManager = require('./controller.missionManager');
const state = require('./state');
const utils = require('./utils');
const { log } = utils;

const getSpawnRules = require('./config.spawnRules');

const BODYPART_COST = constants.BODYPART_COST;
const BODIES = constants.CREEPS_BODIES;
const DESIRED = constants.DESIRED_COUNTS;

// Утилита: гарантирует, что в deps есть безопасные заглушки для ожидаемых helper'ов
function ensureDeps(deps) {
    const defaults = {
        pickBody: () => null,
        getRoomConfig: () => null,
        hasSufficientBaseCreeps: () => false,
        getSourceContainers: () => [],
        selectTargetRoom: () => null,
        countCreepsByRole: () => 0,
        getThreatLevel: () => 0,
        baseMemory: (role, ctx) => ({ role, homeRoom: ctx && ctx.roomName, targetRoom: ctx && ctx.roomName }),
        memoryFactories: {},
        RESOURCE_ENERGY: (typeof RESOURCE_ENERGY !== 'undefined') ? RESOURCE_ENERGY : 'energy',
        nameGenerator: { generateName: (prefix) => `${prefix || 'Creep'}_${(typeof Game !== 'undefined' && Game.time) ? Game.time : Date.now()}` }
    };

    const out = {};
    for (const k in defaults) {
        out[k] = (deps && typeof deps[k] !== 'undefined') ? deps[k] : defaults[k];
    }
    // копируем остальные переданные ключи (если есть)
    if (deps) {
        for (const k in deps) {
            if (!(k in out)) out[k] = deps[k];
        }
    }
    return out;
}

function pickBody(role, energy, energyCapacity, allowSmall = false, ctx = null) {
    let options = BODIES[role] || BODIES.worker;

    // Если options — объект (маппинг стадий), попробуем выбрать набор по стадии комнаты
    if (options && !Array.isArray(options)) {
        let chosen = null;
        try {
            const roomName = ctx && ctx.roomName;
            const memRoom = roomName && Memory.rooms && Memory.rooms[roomName];
            const stage = memRoom && memRoom.stats && memRoom.stats.stage;
            if (stage && options[stage]) {
                chosen = options[stage];
            }
        } catch (e) {
            // ignore
        }

        // Фоллбэк: попробуем проставить наиболее подходящий набор по убыванию стадии
        if (!chosen) {
            const fallbackStages = ['stage5', 'stage4', 'stage3', 'stage2', 'stage1', 'stage0'];
            for (const s of fallbackStages) {
                if (options[s]) { chosen = options[s]; break; }
            }
        }

        if (chosen) options = chosen; // заменяем на массив тел
        else options = BODIES.worker || [];
    }

    // Перебираем тела с самого большого (для поиска максимального под capacity)
    for (let i = options.length - 1; i >= 0; i--) {
        const body = options[i];
        const cost = body.reduce((sum, part) => sum + BODYPART_COST[part], 0);

        // Проверяем по максимуму энергии в комнате (energyCapacity)
        if (cost <= energyCapacity) {
            // Проверяем по доступной энергии (energy)
            if (cost <= energy) {
                // Если тело не самое маленькое (i>0) или маленькие разрешены - возвращаем
                if (i > 0 || allowSmall) {
                    return body;
                }
            } else {
                // Если энергии сейчас не хватает (cost > energy), то можно выбрать тело,
                // только если allowSmall разрешен и это маленькое тело (i == 0)
                if (allowSmall && i === 0) {
                    return body;
                }
                // Иначе подождём, пока накопится энергия
            }
        }
        // Если тело дороже capacity - идём к меньшему размеру
    }
    return null;
}

function baseMemory(role, ctx) {
  return {
    role,
    homeRoom: ctx.roomName,
    targetRoom: ctx.roomName,
    missionId: null
  };
}

const memoryFactories = {
    builder: (ctx) => baseMemory('builder', ctx),
    
    claimer: (ctx) => baseMemory('claimer', ctx),

    crawler: (ctx) => baseMemory('crawler', ctx),

    defender: (ctx) => {
        const routePoints = [];

        return {
            ...baseMemory('defender', ctx),
        };
    },

    guardian: (ctx) => {
        const routePoints = [];
        
        return {
            ...baseMemory('guardian', ctx),
            routePoints,
            routeIndex: 0
        };
    },

    harvester: (ctx) => ({
        ...baseMemory('harvester', ctx),
        resourceType: RESOURCE_ENERGY
    }),


    healer: (ctx) => baseMemory('healer', ctx),

    miner: (ctx) => ({
        ...baseMemory('miner', ctx),
        resourceType: RESOURCE_ENERGY
    }),

    scout: (ctx) => baseMemory('scout', ctx),

    towerman: (ctx) => baseMemory('towerman', ctx),

    upgrader: (ctx) => baseMemory('upgrader', ctx),

    // -- squad roles --
    squadDamager: (ctx) => baseMemory('squadDamager', ctx),

    squadHealer: (ctx) => baseMemory('squadHealer', ctx),
    
    squadRanger: (ctx) => baseMemory('squadRanger', ctx),
    
    squadTank: (ctx) => baseMemory('squadTank', ctx)
};

function getRoomConfig(roomName) {
    return DESIRED.find(cfg => cfg.homeRoom === roomName);
}

function countCreepsByRole(role, homeRoom, targetRoom = null) {
    if (!role || !homeRoom) return 0; // Защита от undefined

    // Count active creeps
    let cnt = _.filter(Game.creeps, creep => {
        if (creep.memory.role !== role) return false;
        if (creep.memory.homeRoom !== homeRoom) return false;
        if (targetRoom && creep.memory.targetRoom !== targetRoom) return false;
        return true;
    }).length;

    // Include pending reservations (spawn intents) recorded in Memory.spawnPending
    try {
        pruneSpawnPending();
        if (Memory.spawnPending && Memory.spawnPending[homeRoom]) {
            const pend = Memory.spawnPending[homeRoom].filter(e => e.role === role && (!targetRoom || e.targetRoom === targetRoom));
            cnt += pend.length;
        }
    } catch (e) {
        // ignore errors reading Memory
    }

    return cnt;
}

// Удаляем устаревшие pending-записи
function pruneSpawnPending() {
    if (!Memory.spawnPending) return;
    const now = (typeof Game !== 'undefined' && Game.time) ? Game.time : Date.now();
    const maxAge = 200; // ticks
    for (const roomName in Memory.spawnPending) {
        const arr = Memory.spawnPending[roomName];
        if (!Array.isArray(arr)) continue;
        Memory.spawnPending[roomName] = arr.filter(e => (now - (e.time || 0)) <= maxAge);
        if (Memory.spawnPending[roomName].length === 0) delete Memory.spawnPending[roomName];
    }
}

/**
 * Проверяет, достаточно ли harvester и upgrader в комнате.
 * @param {string} roomName
 * @param {number} [harvesterRatio=0.8] — доля от желаемого количества harvester
 * @param {number} [upgraderRatio=0.6] — доля от желаемого количества upgrader
 * @returns {boolean} true, если покрытие достаточно
 */
function hasSufficientBaseCreeps(roomName) {
    const config = getRoomConfig(roomName);
    if (!config) return false;

    // Берём пороги из конфигурации, если заданы
    const harvesterRatio = config.baseCoverage.harvesterRatio || 0.8;
    const upgraderRatio = config.baseCoverage.upgraderRatio || 0.6;

    const desiredHarvester = config.creeps.harvester || 0;
    const desiredUpgrader = config.creeps.upgrader || 0;

    const currentHarvester = countCreepsByRole('harvester', roomName);
    const currentUpgrader = countCreepsByRole('upgrader', roomName);

    const enoughHarvester = currentHarvester >= Math.ceil(desiredHarvester * harvesterRatio);
    const enoughUpgrader = currentUpgrader >= Math.ceil(desiredUpgrader * upgraderRatio);

    return enoughHarvester && enoughUpgrader;
}

function selectTargetRoom(homeRoom, role) {
    const config = getRoomConfig(homeRoom);
    if (!config) {
        log('ERROR', `Нет конфигурации для комнаты ${homeRoom}`, 'spawnManager');
        return null;
    }

    if (!config.remoteCreeps || !config.remoteCreeps[role]) {
        log('ERROR', `Нет remoteCreeps.${role} для комнаты ${homeRoom}`, 'spawnManager');
        return null;
    }

    const { rooms } = config.remoteCreeps[role];
    if (!rooms || rooms.length === 0) {
        log('ERROR', `Пустой список rooms для ${role} в ${homeRoom}`, 'spawnManager');
        return null;
    }

    // Находим комнату с минимальным количеством крипов данной роли
    const roomStats = rooms.map(room => ({
        room,
        count: countCreepsByRole(role, homeRoom, room)
    }));

    const minCount = Math.min(...roomStats.map(s => s.count));
    return roomStats.find(s => s.count === minCount).room;
}

// → НОВОЕ: проверка наличия контейнера в комнате
function hasContainerInRoom(roomName) {
    // Используем кешированные данные из Memory.rooms
    const roomData = Memory.rooms && Memory.rooms[roomName];
    if (roomData && roomData.structures) {
        // Проверяем наличие контейнеров в закешированных структурах
        return roomData.structures.some(s => s.type === STRUCTURE_CONTAINER);
    }
    
    // Резервный вариант - обращение к игровому движку
    const room = Game.rooms[roomName];
    if (!room) return false;
    return room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
    }).length > 0;
}

// → НОВОЕ: оценка угрозы в комнате
function getThreatLevel(roomName) {
    // Используем кешированные данные из Memory.rooms
    const roomData = Memory.rooms && Memory.rooms[roomName];
    if (roomData) {
        let threat = 0;
        
        // Проверяем вражеских крипов из кеша
        if (roomData.enemies) {
            threat += roomData.enemies.length * 10;
        }
        
        // Проверяем вражеские структуры из кеша
        if (roomData.enemyStructures) {
            threat += roomData.enemyStructures.length * 5;
        }
        
        // Проверяем Invader Core из кеша
        if (roomData.structures) {
            const hasInvaderCore = roomData.structures.some(s => s.type === STRUCTURE_INVADER_CORE);
            if (hasInvaderCore) {
                threat += 100;
            }
        }
        
        return threat;
    }
    
    // Резервный вариант - обращение к игровому движку
    const room = Game.rooms[roomName];
    if (!room) return 0;

    let threat = 0;
    
    // Invader Core — максимальный приоритет
    if (room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_INVADER_CORE
    }).length > 0) {
        threat += 100;
    }

    // Враждебные крипы
    threat += room.find(FIND_HOSTILE_CREEPS).length * 10;
    
    // Другие враждебные структуры
    threat += room.find(FIND_STRUCTURES, {
        filter: s => !s.my && s.owner && s.structureType !== STRUCTURE_ROAD
    }).length * 5;

    return threat;
}

// Возвращает список контейнеров, находящихся в радиусе 2 от любого источника в комнате
function getSourceContainers(roomName) {
    // Используем кешированные данные из Memory.rooms
    const roomData = Memory.rooms && Memory.rooms[roomName];
    if (roomData && roomData.sources && roomData.structures) {
        // Ищем контейнеры возле источников в закешированных данных
        const sourcePositions = roomData.sources.map(s => new RoomPosition(s.pos.x, s.pos.y, roomName));
        const containers = roomData.structures
            .filter(s => s.type === STRUCTURE_CONTAINER)
            .map(s => Game.getObjectById(s.id))
            .filter(Boolean);
            
        const sourceContainers = [];
        for (const src of sourcePositions) {
            const nearby = src.findInRange(containers, 2);
            for (const c of nearby) {
                if (!sourceContainers.some(x => x.id === c.id)) sourceContainers.push(c);
            }
        }
        return sourceContainers;
    }
    
    // Резервный вариант - обращение к игровому движку
    const room = Game.rooms[roomName];
    if (!room) return [];
    const sources = room.find(FIND_SOURCES);
    const containers = [];
    for (const src of sources) {
        const nearby = src.pos.findInRange(FIND_STRUCTURES, 2, { filter: s => s.structureType === STRUCTURE_CONTAINER });
        for (const c of nearby) {
            if (!containers.some(x => x.id === c.id)) containers.push(c);
        }
    }
    return containers;
}

// Запись решения о спавне в Memory (ограниченный журнал)
function recordSpawnDecision(roomName, entry) {
    if (!Memory.spawnLastDecision) Memory.spawnLastDecision = {};
    if (!Memory.spawnLastDecision[roomName]) Memory.spawnLastDecision[roomName] = [];
    const log = Memory.spawnLastDecision[roomName];
    log.push(entry);

    // Переменные лимитов: берем из констант, если доступны
    const maxPerRoom = (constants && constants.SPAWN_LOG_MAX_ENTRIES_PER_ROOM) ? constants.SPAWN_LOG_MAX_ENTRIES_PER_ROOM : 20;
    const maxRooms = (constants && constants.SPAWN_LOG_MAX_ROOMS) ? constants.SPAWN_LOG_MAX_ROOMS : 10;

    // Оставляем последние maxPerRoom записей в комнате
    if (log.length > maxPerRoom) log.splice(0, log.length - maxPerRoom);

    // Если комнат в журнале стало слишком много — удаляем старейшую по времени запись (по earliest time)
    const rooms = Object.keys(Memory.spawnLastDecision);
    if (rooms.length > maxRooms) {
        let oldestRoom = null;
        let oldestTime = Infinity;
        for (const r of rooms) {
            const arr = Memory.spawnLastDecision[r];
            if (!arr || arr.length === 0) continue;
            // используем время первой записи как признак давности
            const t = arr[0].time || 0;
            if (t < oldestTime) {
                oldestTime = t;
                oldestRoom = r;
            }
        }
        if (oldestRoom) {
            delete Memory.spawnLastDecision[oldestRoom];
        }
    }
}

function attemptSpawn(spawn, body, name, mem, ctx, role, reason) {
    const roomName = ctx && ctx.roomName ? ctx.roomName : (spawn && spawn.room && spawn.room.name ? spawn.room.name : 'unknown');
    // Ensure pending structure exists and add reservation before actual spawn call
    if (!Memory.spawnPending) Memory.spawnPending = {};
    if (!Memory.spawnPending[roomName]) Memory.spawnPending[roomName] = [];
    Memory.spawnPending[roomName].push({ time: (typeof Game !== 'undefined' && Game.time) ? Game.time : Date.now(), role: role || (mem && mem.role), targetRoom: mem && mem.targetRoom, name: name });

    const res = spawn.spawnCreep(body, name, { memory: mem });
    if (res === OK) {
        const cost = body.reduce((s, p) => s + (BODYPART_COST[p] || 0), 0);
        const entry = {
            time: (typeof Game !== 'undefined' && Game.time) ? Game.time : Date.now(),
            role: mem && mem.role ? mem.role : role,
            reason: reason || 'spawn',
            targetRoom: mem && mem.targetRoom ? mem.targetRoom : roomName,
            energy: ctx && ctx.energy ? ctx.energy : null,
            energyCapacity: ctx && ctx.energyCapacity ? ctx.energyCapacity : null,
            bodyCost: cost
        };
        recordSpawnDecision(roomName, entry);
        log('INFO', `[spawnManager:${roomName}] Spawned ${entry.role} (${reason || 'spawn'}) ${name} -> ${entry.targetRoom} cost=${cost}`, 'system');
        // keep the pending entry as a representation of an in-progress spawn (will be pruned later)
        return true;
    } else {
        // неуспех — удаляем pending запись и логируем ошибку
        try {
            const arr = Memory.spawnPending && Memory.spawnPending[roomName];
            if (arr && arr.length) {
                const idx = arr.findIndex(e => e.name === name && e.role === (role || (mem && mem.role)));
                if (idx >= 0) arr.splice(idx, 1);
            }
        } catch (e) {}
        log('ERROR', `Failed to spawn ${role || (mem && mem.role) || name}: ${res}`, 'system');
        
        return false;
    }
}

function roomHasConstructionOrContainersOrRoads(roomName) {
    // Используем кешированные данные из Memory.rooms
    const roomData = Memory.rooms && Memory.rooms[roomName];
    if (roomData && roomData.structures) {
        // Проверяем наличие контейнеров и дорог в закешированных структурах
        const hasContainers = roomData.structures.some(s => s.type === STRUCTURE_CONTAINER);
        const hasRoads = roomData.structures.some(s => s.type === STRUCTURE_ROAD);
        
        if (hasContainers || hasRoads) return true;
    }
    
    // Для строительных площадок нужно проверить отдельно
    if (roomData && roomData.constructionSites && roomData.constructionSites.length > 0) {
        return true;
    }
    
    // Резервный вариант - обращение к игровому движку
    const room = Game.rooms[roomName];
    if (!room) return false;
    if (room.find(FIND_CONSTRUCTION_SITES).length > 0) return true;
    if (room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER }).length > 0) return true;
    if (room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_ROAD }).length > 0) return true;
    return false;
}

function tryLocalFillPhase(spawn, ctx, allowSmall) {
    const roomName = ctx.roomName;
    const config = getRoomConfig(roomName);
    if (!config) return false;
    if (spawn.spawning) return false;

    const desired = config.creeps || {};

    // Порядок заполнения: добавили guardian (с 3+ стадии) и healer (с 4+ стадии)
    const rolesOrder = [
        'harvester',
        'miner',
        'upgrader',
        'builder',
        'distributor',
        'towerman',
        'logist',
        'claimer',
        'guardian',   // ← новая роль
        'healer'      // ← новая роль
    ];

    for (const role of rolesOrder) {
        if (spawn.spawning) break;
        const current = countCreepsByRole(role, roomName);
        let want = desired[role] || 0;

        // ... (предыдущие проверки для harvester, miner и др. остаются без изменений)

        if (role === 'guardian') {
            // Порождаем guardian только если стадия >= 3
            const stage = Memory.rooms && Memory.rooms[roomName] &&
                Memory.rooms[roomName].stats && Memory.rooms[roomName].stats.stage;
            let stageNum = null;
            if (typeof stage === 'string') {
                const m = stage.match(/stage(\d+)/);
                if (m) stageNum = parseInt(m[1], 10);
            } else if (typeof stage === 'number') {
                stageNum = stage;
            }
            if (!stageNum || stageNum < 3) {
                continue; // пропускаем guardian если стадия меньше 3
            }

            // Дополнительно: проверяем наличие хотя бы одного defender/guardian для координации
            const defenders = Game.rooms[roomName].find(FIND_MY_CREEPS, {
                filter: c => ['defender', 'guardian'].includes(c.memory.role)
            });
            if (!defenders || defenders.length === 0) {
                want = 0; // не порождаем healer, если нет защитников
            }
        }

        if (role === 'healer') {
            // Порождаем healer только если стадия >= 4
            const stage = Memory.rooms && Memory.rooms[roomName] &&
                Memory.rooms[roomName].stats && Memory.rooms[roomName].stats.stage;
            let stageNum = null;
            if (typeof stage === 'string') {
                const m = stage.match(/stage(\d+)/);
                if (m) stageNum = parseInt(m[1], 10);
            } else if (typeof stage === 'number') {
                stageNum = stage;
            }
            if (!stageNum || stageNum < 4) {
                continue; // пропускаем healer если стадия меньше 4
            }

            // Проверяем наличие защитников/guardians — healer должен их поддерживать
            const defenders = Game.rooms[roomName].find(FIND_MY_CREEPS, {
                filter: c => ['defender', 'guardian'].includes(c.memory.role)
            });
            if (!defenders || defenders.length === 0) {
                want = 0; // не порождаем healer без защитников
            }

            // Также проверяем наличие Storage (для доступа к энергии)
            const room = Game.rooms[roomName];
            if (!room || !room.storage) {
                continue;
            }
        }

        if (current < want) {
            // Выбираем тело в зависимости от роли
            const bodyRole = role === 'logist' ? 'logist' :
                           role === 'towerman' ? 'towerman' :
                           role === 'miner' ? 'miner' :
                           role === 'claimer' ? 'claimer' :
                           role === 'distributor' ? 'distributor' :
                           role === 'guardian' ? 'guardian' :     // ← добавляем guardian
                           role === 'healer' ? 'healer' :       // ← добавляем healer
                           role;

            const body = pickBody(bodyRole, ctx.energy, ctx.energyCapacity, allowSmall, ctx);
            if (!body) continue;

            // Получаем фабрику памяти для роли
            const memFactory = memoryFactories[role];
            const mem = memFactory ? memFactory(ctx) : baseMemory(role, ctx);

            // Специальные настройки памяти
            if (role === 'miner') mem.targetRoom = roomName;
            if (role === 'distributor') {
                mem.targetRoom = roomName;
            }
            if (role === 'guardian') {
                mem.targetRoom = roomName;  // для guardian задаём targetRoom
                mem.role = 'guardian';     // явно указываем роль
            }
            if (role === 'healer') {
                mem.targetRoom = roomName;    // для healer задаём targetRoom
                mem.role = 'healer';       // явно указываем роль
            }

            const name = nameGenerator.generateName(role.charAt(0).toUpperCase() + role.slice(1));
            if (attemptSpawn(spawn, body, name, mem, ctx, role, 'local_fill')) return true;
        }
    }

    return false;
}


// Фаза: после локального заполнения — приоритетная замена для remote: crawler, miner, remoteBuilder,
// если ничего не нужно — потом defender и claimer
function tryRemoteReplacementPhase(spawn, ctx) {
    const roomName = ctx.roomName;
    const config = getRoomConfig(roomName);
    if (!config || !config.remoteCreeps) return false;
    if (spawn.spawning) return false;

    const remoteCfg = config.remoteCreeps;

    // 1) Crawler replacement
    if (remoteCfg.crawler && remoteCfg.crawler.rooms) {
        for (const target of remoteCfg.crawler.rooms) {
            if (!Game.rooms[target]) continue;
            const containers = Game.rooms[target].find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER && _.some(s.store, (amt) => amt > 0) });
            const current = countCreepsByRole('crawler', roomName, target);
            const desired = remoteCfg.crawler.count || 0;
            if (containers.length > 0 && current < desired) {
                const body = pickBody('logist', ctx.energy, ctx.energyCapacity, false, ctx);
                if (!body) continue;
                const mem = memoryFactories.crawler ? memoryFactories.crawler(ctx) : baseMemory('crawler', ctx);
                mem.targetRoom = target;
                const name = nameGenerator.generateName('Crawler');
                if (attemptSpawn(spawn, body, name, mem, ctx, 'crawler', 'remote_replacement')) return true;
            }
        }
    }

    // 2) Remote miner replacement
    if (remoteCfg.miner && remoteCfg.miner.rooms) {
        for (const target of remoteCfg.miner.rooms) {
            if (!Game.rooms[target]) continue;
            const sourceContainers = getSourceContainers(target);
            const desiredPerRoom = remoteCfg.miner.count || sourceContainers.length || 0;
            const desired = Math.min(sourceContainers.length, desiredPerRoom || sourceContainers.length);
            const current = countCreepsByRole('miner', roomName, target);
            if (desired > 0 && current < desired) {
                const body = pickBody('miner', ctx.energy, ctx.energyCapacity, false, ctx);
                if (!body) continue;
                const mem = baseMemory('miner', ctx);
                mem.targetRoom = target;
                mem.resourceType = (config.remoteCreeps.miner && config.remoteCreeps.miner.resources && config.remoteCreeps.miner.resources[0]) || RESOURCE_ENERGY;
                const name = nameGenerator.generateName('Miner');
                if (attemptSpawn(spawn, body, name, mem, ctx, 'miner', 'remote_replacement')) return true;
            }
        }
    }

    // 3) Remote builder replacement
    if (remoteCfg.remoteBuilder && remoteCfg.remoteBuilder.rooms) {
        for (const target of remoteCfg.remoteBuilder.rooms) {
            if (!Game.rooms[target]) continue;
            if (!roomHasConstructionOrContainersOrRoads(target)) continue;
            const current = countCreepsByRole('remoteBuilder', roomName, target);
            const desired = remoteCfg.remoteBuilder.count || 0;
            if (current < desired) {
                const body = pickBody('worker', ctx.energy, ctx.energyCapacity, false, ctx);
                if (!body) continue;
                const mem = baseMemory('remoteBuilder', ctx);
                mem.targetRoom = target;
                const name = nameGenerator.generateName('RemoteBuilder');
                if (attemptSpawn(spawn, body, name, mem, ctx, 'remoteBuilder', 'remote_replacement')) return true;
            }
        }
    }

    // 4) Если ничего из выше не нужно — порождаем удалённых защитников и клаймеров
    if (remoteCfg.defender && remoteCfg.defender.rooms) {
        for (const target of remoteCfg.defender.rooms) {
            const threat = getThreatLevel(target);
            if (threat <= 0) continue;
            const current = countCreepsByRole('defender', roomName, target);
            const desired = remoteCfg.defender.count || 0;
            if (current < desired) {
                const body = pickBody('defender', ctx.energy, ctx.energyCapacity, false, ctx);
                if (!body) continue;
                const mem = baseMemory('defender', ctx);
                mem.targetRoom = target;
                const name = nameGenerator.generateName('Defender');
                if (attemptSpawn(spawn, body, name, mem, ctx, 'defender', 'remote_replacement')) return true;
            }
        }
    }

    if (remoteCfg.claimer && remoteCfg.claimer.rooms) {
        for (const target of remoteCfg.claimer.rooms) {
            const current = countCreepsByRole('claimer', roomName, target);
            const desired = remoteCfg.claimer.count || 0;
            if (current < desired) {
                const body = pickBody('claimer', ctx.energy, ctx.energyCapacity, false, ctx);
                if (!body) continue;
                const mem = baseMemory('claimer', ctx);
                mem.targetRoom = target;
                const name = nameGenerator.generateName('Claimer');
                if (attemptSpawn(spawn, body, name, mem, ctx, 'claimer', 'remote_replacement')) return true;
            }
        }
    }

    return false;
}

function selectTargetRoom(homeRoom, role) {
    const config = getRoomConfig(homeRoom);
    if (!config) {
        log('ERROR', `Нет конфигурации для комнаты ${homeRoom}`, 'spawnManager');
        return null;
    }

    if (!config.remoteCreeps || !config.remoteCreeps[role]) {
        log('ERROR', `Нет remoteCreeps.${role} для комнаты ${homeRoom}`, 'spawnManager');
        return null;
    }

    const { rooms } = config.remoteCreeps[role];
    if (!rooms || rooms.length === 0) {
        log('ERROR', `Пустой список rooms для ${role} в ${homeRoom}`, 'spawnManager');
        return null;
    }

    // Фильтруем комнаты по условиям
    let candidateRooms = [...rooms];

    // Для краулеров: только комнаты с контейнером (любым)
    if (role === 'crawler') {
        candidateRooms = candidateRooms.filter(r => hasContainerInRoom(r));
        if (candidateRooms.length === 0) {
            log('INFO', `Нет комнат с контейнером для crawler`, 'spawnManager');
            return null;
        }
    }

    // Считаем количество крипов по комнатам
    const roomStats = candidateRooms.map(room => ({
        room,
        count: countCreepsByRole(role, homeRoom, room),
        threat: getThreatLevel(room) // добавляем уровень угрозы
    }));

    // Приоритет: сначала по угрозе (для defender), затем по минимальному количеству крипов
    if (role === 'defender') {
        // Сортируем: сначала по угрозе, потом по количеству крипов
        roomStats.sort((a, b) => {
            if (b.threat !== a.threat) return b.threat - a.threat;
            return a.count - b.count;
        });
    } else {
        // Для остальных: сортируем по количеству крипов (от меньшего к большему)
        roomStats.sort((a, b) => a.count - b.count);
    }

    return roomStats[0].room;
}

// SPAWN_RULES previously defined inline here; rules have been moved to `config.spawnRules.js`.
// The module exports a factory function which accepts helper dependencies and returns the rules array.

// → НОВОЕ: сортировка правил по приоритету
function sortRulesByPriority(rules) {
    return rules.sort((a, b) => {
        const priorityA = a.priority || 0;
        const priorityB = b.priority || 0;
        return priorityB - priorityA; // убывание: выше приоритет — раньше в списке
    });
}

// ФАЗЫ SPAWN'а: выделяем в отдельные функции для пошагового рефакторинга
function tryLocalPhase(spawn, ctx, allowSmall) {
    const roomName = ctx.roomName;
    const config = getRoomConfig(roomName);
    if (!config) return false;

    if (spawn.spawning) return false;
    // 1) Если в комнате меньше 5 крипов — обеспечиваем минимум харвестеров
    if (ctx.localCreepsCount < 5) {
        const currentHarvesters = countCreepsByRole('harvester', roomName);
        // Count only miners that target this room (exclude remote miners owned by this controller)
        const currentMiners = countCreepsByRole('miner', roomName, roomName);
        const currentUpgraders = countCreepsByRole('upgrader', roomName);
        const hasContainers = hasContainerInRoom(roomName);
        log('WARN', `: ${roomName} localCounts harv=${currentHarvesters} miner=${currentMiners} upg=${currentUpgraders} localTotal=${ctx.localCreepsCount} containers=${hasContainers} energy=${ctx.energy}/${ctx.energyCapacity} allowSmall=${allowSmall}`, 'spawnManager');

        // a) Если харвестеров меньше 2 — спавним харвестера
        if (currentHarvesters < 2) {
            const body = pickBody('worker', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
            if (body) {
                const mem = memoryFactories.harvester ? memoryFactories.harvester(ctx) : baseMemory('harvester', ctx);
                const name = nameGenerator.generateName('Harvester');
                if (attemptSpawn(spawn, body, name, mem, ctx, 'harvester', 'priority_harvester')) return true;
            }
        }

        // b) Если есть враги в комнате — первыми спавним защитников
        const roomObj = Game.rooms[roomName];
        const enemyCount = roomObj ? roomObj.find(FIND_HOSTILE_CREEPS).length : 0;
        if (enemyCount > 0) {
            const currentDefenders = countCreepsByRole('defender', roomName);
            const desiredDefenders = (config.creeps && config.creeps.defender) ? config.creeps.defender : 0;
            if (currentDefenders < desiredDefenders) {
                const body = pickBody('defender', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
                if (body) {
                    const mem = memoryFactories.defender ? memoryFactories.defender(ctx) : baseMemory('defender', ctx);
                    const name = nameGenerator.generateName('Defender');
                    if (attemptSpawn(spawn, body, name, mem, ctx, 'defender', 'priority_defender')) return true;
                }
            }
        }

        // c) Если минимум 2 харвестера и есть контейнеры — обеспечиваем минимум 2 майнеров (или до конфигурированного)
        if (currentHarvesters >= 2 && hasContainers) {
            const configuredDesiredMiners = (config.creeps && config.creeps.miner) ? config.creeps.miner : 0;
            const sourceContainers = getSourceContainers(roomName);
            const availableSlots = sourceContainers.length || 0;
            // Желаем минимум 2 майнера, но не больше, чем контейнеров и не больше конфигурации
            const desiredMiners = Math.min(configuredDesiredMiners || 2, Math.max(2, availableSlots));
            if (currentMiners < desiredMiners) {
                const body = pickBody('miner', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
                if (body) {
                    const mem = memoryFactories.miner ? memoryFactories.miner(ctx) : baseMemory('miner', ctx);
                    mem.targetRoom = roomName;
                    mem.resourceType = (config.localMinerResources && config.localMinerResources[0]) || RESOURCE_ENERGY;
                    const name = nameGenerator.generateName('Miner');
                    if (attemptSpawn(spawn, body, name, mem, ctx, 'miner', 'priority_miner')) return true;
                }
            }
        }

        // d) Если нет контейнеров / или не хватает апгрейдеров — спавним апгрейдера до желаемого или до cap 5 крипов
        if (!hasContainers) {
            const currentUpgraders2 = countCreepsByRole('upgrader', roomName);
            const desiredUpgraders = (config.creeps && config.creeps.upgrader) ? config.creeps.upgrader : 0;
            if (ctx.localCreepsCount < 5 && currentUpgraders2 < desiredUpgraders) {
                const body = pickBody('worker', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
                if (body) {
                    const mem = memoryFactories.upgrader ? memoryFactories.upgrader(ctx) : baseMemory('upgrader', ctx);
                    const name = nameGenerator.generateName('Upgrader');
                    if (attemptSpawn(spawn, body, name, mem, ctx, 'upgrader', 'priority_upgrader')) return true;
                }
            }
        }
    }

    return false;
}

function tryDefensePhase(spawn, ctx, allowSmall) {
    const roomName = ctx.roomName;
    const config = getRoomConfig(roomName);
    if (!config) return false;
    if (spawn.spawning) return false;

    const roomObj = Game.rooms[roomName];
    const enemyCount = roomObj ? roomObj.find(FIND_HOSTILE_CREEPS).length : 0;
    const currentDefenders = countCreepsByRole('defender', roomName);
    const desiredDefenders = (config.creeps && config.creeps.defender) ? config.creeps.defender : 0;
        if (enemyCount > currentDefenders && currentDefenders < desiredDefenders) {
        const body = pickBody('defender', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
        if (body) {
            const mem = memoryFactories.defender ? memoryFactories.defender(ctx) : baseMemory('defender', ctx);
            const name = nameGenerator.generateName('Defender');
            if (attemptSpawn(spawn, body, name, mem, ctx, 'defender', 'defense')) return true;
        }
    }
    return false;
}

function tryRemotePhase(spawn, ctx, allowSmall) {
    const roomName = ctx.roomName;
    const config = getRoomConfig(roomName);
    if (!config || !config.remoteCreeps) return false;
    if (spawn.spawning) return false;

    const remoteCfg = config.remoteCreeps;

    // 3.1 CRAWLER: идём по списку rooms и спавним crawler там, где есть контейнеры с энергией
    if (remoteCfg.crawler && remoteCfg.crawler.rooms) {
        for (const target of remoteCfg.crawler.rooms) {
            if (!Game.rooms[target]) continue; // не видим комнату
            // контейнеры с энергией
            const containers = Game.rooms[target].find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER && _.some(s.store, (amt) => amt > 0) });
            const current = countCreepsByRole('crawler', roomName, target);
            const desired = remoteCfg.crawler.count || 0;
            if (containers.length > 0 && current < desired) {
                // Для remote ролей не разрешаем микровариантов
                const allowSmallForRemote = false;
                let body = pickBody('logist', ctx.energy, ctx.energyCapacity, allowSmallForRemote, ctx);
                if (!body) {
                    log('INFO', `Skip crawler -> no body fits in ${roomName} (energy ${ctx.energy}/${ctx.energyCapacity})`, 'spawnManager');
                    continue;
                }
                const mem = memoryFactories.crawler ? memoryFactories.crawler(ctx) : baseMemory('crawler', ctx);
                mem.targetRoom = target;
                const name = nameGenerator.generateName('Crawler');
                if (attemptSpawn(spawn, body, name, mem, ctx, 'crawler', 'remote_priority')) return true;
            }
        }
    }

    // 3.2 REMOTE BUILDER: по списку rooms — если там стройки или контейнеры/дороги
    if (remoteCfg.remoteBuilder && remoteCfg.remoteBuilder.rooms) {
        for (const target of remoteCfg.remoteBuilder.rooms) {
            if (!Game.rooms[target]) continue;
            if (!roomHasConstructionOrContainersOrRoads(target)) continue;
            const current = countCreepsByRole('remoteBuilder', roomName, target);
            const desired = remoteCfg.remoteBuilder.count || 0;
            if (current < desired) {
                const body = pickBody('worker', ctx.energy, ctx.energyCapacity, false, ctx);
                if (body) {
                    const mem = baseMemory('remoteBuilder', ctx);
                    mem.targetRoom = target;
                    const name = nameGenerator.generateName('RemoteBuilder');
                    if (attemptSpawn(spawn, body, name, mem, ctx, 'remoteBuilder', 'remote_priority')) return true;
                }
            }
        }
    }

    // 3.3 REMOTE MINER: создаём майнеров по количеству контейнеров возле источников
    if (remoteCfg.miner && remoteCfg.miner.rooms) {
        for (const target of remoteCfg.miner.rooms) {
            if (!Game.rooms[target]) continue;
            const sourceContainers = getSourceContainers(target);
            const desiredPerRoom = remoteCfg.miner.count || sourceContainers.length || 0;
            const desired = Math.min(sourceContainers.length, desiredPerRoom || sourceContainers.length);
            const current = countCreepsByRole('miner', roomName, target);
            if (desired > 0 && current < desired) {
                const body = pickBody('miner', ctx.energy, ctx.energyCapacity, false, ctx);
                if (body) {
                    const mem = baseMemory('miner', ctx);
                    mem.targetRoom = target;
                    mem.resourceType = (config.remoteCreeps.miner && config.remoteCreeps.miner.resources && config.remoteCreeps.miner.resources[0]) || RESOURCE_ENERGY;
                    const name = nameGenerator.generateName('Miner');
                    if (attemptSpawn(spawn, body, name, mem, ctx, 'miner', 'remote_priority')) return true;
                }
            }
        }
    }

    // 3.4 REMOTE DEFENDERS: равномерно по списку комнат
    if (remoteCfg.defender && remoteCfg.defender.rooms) {
        for (const target of remoteCfg.defender.rooms) {
            // Спавним удалённых защитников только если в целевой комнате есть угроза
            const threat = getThreatLevel(target);
            if (threat <= 0) continue; // пропускаем комнату без угрозы
            const current = countCreepsByRole('defender', roomName, target);
            const desired = remoteCfg.defender.count || 0;
            if (current < desired) {
                const body = pickBody('defender', ctx.energy, ctx.energyCapacity, false, ctx);
                if (body) {
                    const mem = baseMemory('defender', ctx);
                    mem.targetRoom = target;
                    const name = nameGenerator.generateName('Defender');
                    if (attemptSpawn(spawn, body, name, mem, ctx, 'defender', 'remote_priority')) return true;
                }
            }
        }
    }

    // 3.5 CLAIMER: создаём клаймеров для резерва
    if (remoteCfg.claimer && remoteCfg.claimer.rooms) {
        for (const target of remoteCfg.claimer.rooms) {
            const current = countCreepsByRole('claimer', roomName, target);
            const desired = remoteCfg.claimer.count || 0;
            if (current < desired) {
                const body = pickBody('claimer', ctx.energy, ctx.energyCapacity, false, ctx);
                if (body) {
                    const mem = baseMemory('claimer', ctx);
                    mem.targetRoom = target;
                    const name = nameGenerator.generateName('Claimer');
                    if (attemptSpawn(spawn, body, name, mem, ctx, 'claimer', 'remote_priority')) return true;
                }
            }
        }
    }

    return false;
}

// Фаза: проход по декларативным правилам SPAWN_RULES (сохранённая старая логика)
function tryRulesPhase(spawn, ctx, allowSmall) {
    if (spawn.spawning) return false;
    const roomName = ctx.roomName;
    const SPAWN_RULES = getSpawnRules(ensureDeps({
        pickBody,
        getRoomConfig,
        hasSufficientBaseCreeps,
        getSourceContainers,
        selectTargetRoom,
        countCreepsByRole,
        getThreatLevel,
        baseMemory,
        memoryFactories,
        RESOURCE_ENERGY,
        nameGenerator
    }));
    const sortedRules = sortRulesByPriority([...SPAWN_RULES]);

    for (const rule of sortedRules) {
        if (spawn.spawning) break;

        if (rule.condition(ctx)) {
            const ruleAllowSmall = allowSmall && !rule.isRemote;
            const body = rule.body(ctx, ruleAllowSmall);
            if (!body) continue;

            const name = nameGenerator.generateName(
                rule.role.charAt(0).toUpperCase() + rule.role.slice(1)
            );

            const mem = rule.memory(ctx);
            if (attemptSpawn(spawn, body, name, mem, ctx, rule.role, 'rule')) return true;
            break; // один спавн за тик
        }
    }

    return false;
}

module.exports = {
    run: (spawn, baseState) => {
        const roomName = spawn.room.name;
        const config = getRoomConfig(roomName);
        
        if (!config) return; // Нет конфигурации для комнаты

        // Вспомогательная функция: считаем только локальных крипов (homeRoom === targetRoom)
        const countLocalCreeps = (roomName) => {
            return _.filter(Game.creeps, creep => {
                return (
                    creep.memory.homeRoom === roomName &&
                    creep.memory.targetRoom === roomName
                );
            }).length;
        };

        const ctx = {
            roomName,
            state: baseState,
            energy: spawn.room.energyAvailable,
            energyCapacity: spawn.room.energyCapacityAvailable,
            localCreepsCount: countLocalCreeps(roomName),
        };

        // Теперь allowSmall зависит только от локальных крипов и capacity
        const allowSmall = ctx.localCreepsCount < 5 || ctx.energyCapacity <= 300;

        // Запускаем фазы по порядку:
        // 1) Local initial (min harvesters / miners / upgraders)
        // 2) Defense immediate (fallback)
        // 3) Remote priority pass (crawler, remoteBuilder, miner; defenders only if threat)
        // 4) Local fill (bring local counts up to DESIRED)
        // 5) Remote replacement (crawler/miner/builder replacements, else defender/claimer)
        // 6) Rules fallback
        if (tryLocalPhase(spawn, ctx, allowSmall)) return;
        if (tryDefensePhase(spawn, ctx, allowSmall)) return;
        if (tryRemotePhase(spawn, ctx, allowSmall)) return;
        if (tryLocalFillPhase(spawn, ctx, allowSmall)) return;
        if (tryRemoteReplacementPhase(spawn, ctx)) return;

        // Фаза: правила SPAWN_RULES (декларативные/старые правила)
        if (tryRulesPhase(spawn, ctx, allowSmall)) return;
    }
};


// JSON.stringify(Memory.spawnLastDecision && Memory.spawnLastDecision['E17S5'] || [], null, 2)