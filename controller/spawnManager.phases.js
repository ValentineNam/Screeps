const constants = require('./config.constants');
const nameGenerator = require('./service.nameGenerator');
const getSpawnRules = require('./config.spawnRules');
const BODYPART_COST = constants.BODYPART_COST;
const spawnManagerCore = require('./spawnManager.core');
const creepCounting = require('./spawnManager.creepCounting');
const roomData = require('./spawnManager.roomData');

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
        console.log(`[spawnManager:${roomName}] Spawned ${entry.role} (${reason || 'spawn'}) ${name} -> ${entry.targetRoom} cost=${cost}`);
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
        console.log(`Failed to spawn ${role || (mem && mem.role) || name}: ${res}`);
        return false;
    }
}

function tryLocalFillPhase(spawn, ctx, allowSmall) {
    const roomName = ctx.roomName;
    const config = creepCounting.getRoomConfig(roomName);
    if (!config) return false;
    if (spawn.spawning) return false;

    const desired = config.creeps || {};

    // Порядок заполнения: добавили guardian (с 3+ стадии) и healer (с 4+ стадии)
    // Изменим порядок, чтобы сначала спавнить miners и distributors, если есть контейнеры возле источников
    const rolesOrder = [
        'miner',
        'distributor',
        'harvester',
        'upgrader',
        'builder',
        'towerman',
        'logist',
        'claimer',
        'guardian',   // ← новая роль
        'healer'      // ← новая роль
    ];

    // Проверяем, есть ли контейнеры возле источников
    const sourceContainers = Game.rooms[roomName] ? roomData.getSourceContainers(roomName) : [];
    const hasSourceContainers = sourceContainers.length > 0;
    
    // Определяем, сколько минимум нужно miners и distributors
    const configuredDesiredMiners = (config.creeps && config.creeps.miner) ? config.creeps.miner : 0;
    const configuredDesiredDistributors = (config.creeps && config.creeps.distributor) ? config.creeps.distributor : 0;
    const desiredMiners = Math.min(configuredDesiredMiners || 2, Math.max(2, sourceContainers.length));
    const desiredDistributors = configuredDesiredDistributors || 1; // по умолчанию хотя бы 1 distributor
    
    // Определяем, есть ли неэнергетические ресурсы для logist
    const room = Game.rooms[roomName];
    const hasNonEnergyResources = room && room.storage ?
        _.some(room.storage.store, (amt, res) => res !== RESOURCE_ENERGY && amt > 0) : false;
    
    // Проверяем контейнеры на наличие неэнергетических ресурсов
    if (!hasNonEnergyResources && room) {
        const containers = room.find(FIND_STRUCTURES, {
            filter: (s) =>
                s.structureType === STRUCTURE_CONTAINER &&
                _.some(s.store, (amt, res) => res !== RESOURCE_ENERGY && amt > 0)
        });
        hasNonEnergyResources = containers.length > 0;
    }

    for (const role of rolesOrder) {
        if (spawn.spawning) break;
        const current = creepCounting.countCreepsByRole(role, roomName);
        let want = desired[role] || 0;

        // Проверяем, нужно ли спавнить harvester
        if (role === 'harvester') {
            // Не спавним харвестеров, если есть контейнеры возле источников и miners/distributors уже на нужном уровне
            if (hasSourceContainers) {
                const currentMiners = creepCounting.countCreepsByRole('miner', roomName, roomName);
                const currentDistributors = creepCounting.countCreepsByRole('distributor', roomName);
                
                // Если miners и distributors уже на нужном уровне, не спавним харвестеров
                if (currentMiners >= desiredMiners && currentDistributors >= desiredDistributors) {
                    want = 0;
                }
            }
        }
        
        // Проверяем, нужно ли спавнить logist
        if (role === 'logist') {
            // Не спавним logist, если нет неэнергетических ресурсов
            if (!hasNonEnergyResources) {
                want = 0;
            }
        }

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

            const body = spawnManagerCore.pickBody(bodyRole, ctx.energy, ctx.energyCapacity, allowSmall, ctx);
            if (!body) continue;

            // Получаем фабрику памяти для роли
            const memFactory = spawnManagerCore.memoryFactories[role];
            const mem = memFactory ? memFactory(ctx) : spawnManagerCore.baseMemory(role, ctx);

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
    const config = creepCounting.getRoomConfig(roomName);
    if (!config || !config.remoteCreeps) return false;
    if (spawn.spawning) return false;

    const remoteCfg = config.remoteCreeps;

    // 1) Crawler replacement
    if (remoteCfg.crawler && remoteCfg.crawler.rooms) {
        for (const target of remoteCfg.crawler.rooms) {
            if (!Game.rooms[target]) continue;
            const containers = Game.rooms[target].find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER && _.some(s.store, (amt) => amt > 0) });
            const current = creepCounting.countCreepsByRole('crawler', roomName, target);
            const desired = remoteCfg.crawler.count || 0;
            if (containers.length > 0 && current < desired) {
                const body = spawnManagerCore.pickBody('logist', ctx.energy, ctx.energyCapacity, false, ctx);
                if (!body) continue;
                const mem = spawnManagerCore.memoryFactories.crawler ? spawnManagerCore.memoryFactories.crawler(ctx) : spawnManagerCore.baseMemory('crawler', ctx);
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
            // Проверяем, доступна ли комната перед вызовом getSourceContainers
            const sourceContainers = Game.rooms[target] ? roomData.getSourceContainers(target) : [];
            const desiredPerRoom = remoteCfg.miner.count || sourceContainers.length || 0;
            const desired = Math.min(sourceContainers.length, desiredPerRoom || sourceContainers.length);
            const current = creepCounting.countCreepsByRole('miner', roomName, target);
            if (desired > 0 && current < desired) {
                const body = spawnManagerCore.pickBody('miner', ctx.energy, ctx.energyCapacity, false, ctx);
                if (!body) continue;
                const mem = spawnManagerCore.baseMemory('miner', ctx);
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
            if (!roomData.roomHasConstructionOrContainersOrRoads(target)) continue;
            const current = creepCounting.countCreepsByRole('remoteBuilder', roomName, target);
            const desired = remoteCfg.remoteBuilder.count || 0;
            if (current < desired) {
                const body = spawnManagerCore.pickBody('worker', ctx.energy, ctx.energyCapacity, false, ctx);
                if (!body) continue;
                const mem = spawnManagerCore.baseMemory('remoteBuilder', ctx);
                mem.targetRoom = target;
                const name = nameGenerator.generateName('RemoteBuilder');
                if (attemptSpawn(spawn, body, name, mem, ctx, 'remoteBuilder', 'remote_replacement')) return true;
            }
        }
    }

    // 4) Если ничего из выше не нужно — порождаем удалённых защитников и клаймеров
    if (remoteCfg.defender && remoteCfg.defender.rooms) {
        for (const target of remoteCfg.defender.rooms) {
            const threat = roomData.getThreatLevel(target);
            if (threat <= 0) continue;
            const current = creepCounting.countCreepsByRole('defender', roomName, target);
            const desired = remoteCfg.defender.count || 0;
            if (current < desired) {
                const body = spawnManagerCore.pickBody('defender', ctx.energy, ctx.energyCapacity, false, ctx);
                if (!body) continue;
                const mem = spawnManagerCore.baseMemory('defender', ctx);
                mem.targetRoom = target;
                const name = nameGenerator.generateName('Defender');
                if (attemptSpawn(spawn, body, name, mem, ctx, 'defender', 'remote_replacement')) return true;
            }
        }
    }

    if (remoteCfg.claimer && remoteCfg.claimer.rooms) {
        for (const target of remoteCfg.claimer.rooms) {
            const current = creepCounting.countCreepsByRole('claimer', roomName, target);
            const desired = remoteCfg.claimer.count || 0;
            if (current < desired) {
                const body = spawnManagerCore.pickBody('claimer', ctx.energy, ctx.energyCapacity, false, ctx);
                if (!body) continue;
                const mem = spawnManagerCore.baseMemory('claimer', ctx);
                mem.targetRoom = target;
                const name = nameGenerator.generateName('Claimer');
                if (attemptSpawn(spawn, body, name, mem, ctx, 'claimer', 'remote_replacement')) return true;
            }
        }
    }

    return false;
}

function selectTargetRoom(homeRoom, role) {
    const config = creepCounting.getRoomConfig(homeRoom);
    if (!config) {
        console.log(`[spawnManager] Нет конфигурации для комнаты ${homeRoom}`);
        return null;
    }

    if (!config.remoteCreeps || !config.remoteCreeps[role]) {
        console.log(`[spawnManager] Нет remoteCreeps.${role} для комнаты ${homeRoom}`);
        return null;
    }

    const { rooms } = config.remoteCreeps[role];
    if (!rooms || rooms.length === 0) {
        console.log(`[spawnManager] Пустой список rooms для ${role} в ${homeRoom}`);
        return null;
    }

    // Фильтруем комнаты по условиям
    let candidateRooms = [...rooms];

    // Для краулеров: только комнаты с контейнером (любым)
    if (role === 'crawler') {
        candidateRooms = candidateRooms.filter(r => roomData.hasContainerInRoom(r));
        if (candidateRooms.length === 0) {
            console.log(`[spawnManager] Нет комнат с контейнером для crawler`);
            return null;
        }
    }

    // Считаем количество крипов по комнатам
    const roomStats = candidateRooms.map(room => ({
        room,
        count: creepCounting.countCreepsByRole(role, homeRoom, room),
        threat: roomData.getThreatLevel(room) // добавляем уровень угрозы
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
    const config = creepCounting.getRoomConfig(roomName);
    if (!config) return false;

    if (spawn.spawning) return false;
    // 1) Если в комнате меньше 5 крипов — обеспечиваем базовое покрытие
    if (ctx.localCreepsCount < 5) {
        const currentHarvesters = creepCounting.countCreepsByRole('harvester', roomName);
        // Count only miners that target this room (exclude remote miners owned by this controller)
        const currentMiners = creepCounting.countCreepsByRole('miner', roomName, roomName);
        const currentUpgraders = creepCounting.countCreepsByRole('upgrader', roomName);
        const hasContainers = roomData.hasContainerInRoom(roomName);
        console.log(`[spawnManager:${roomName}] localCounts harv=${currentHarvesters} miner=${currentMiners} upg=${currentUpgraders} localTotal=${ctx.localCreepsCount} containers=${hasContainers} energy=${ctx.energy}/${ctx.energyCapacity} allowSmall=${allowSmall}`);

        // Проверяем, есть ли контейнеры возле источников
        const sourceContainers = Game.rooms[roomName] ? roomData.getSourceContainers(roomName) : [];
        const hasSourceContainers = sourceContainers.length > 0;
        
        // Определяем, сколько минимум нужно miners и distributors
        const configuredDesiredMiners = (config.creeps && config.creeps.miner) ? config.creeps.miner : 0;
        const configuredDesiredDistributors = (config.creeps && config.creeps.distributor) ? config.creeps.distributor : 0;
        const desiredMiners = Math.min(configuredDesiredMiners || 2, Math.max(2, sourceContainers.length));
        const desiredDistributors = configuredDesiredDistributors || 1; // по умолчанию хотя бы 1 distributor
        
        // Сначала спавним харвестеров для базовой поставки энергии
        if (currentHarvesters < 2) {
            const body = spawnManagerCore.pickBody('worker', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
            if (body) {
                const mem = spawnManagerCore.memoryFactories.harvester ? spawnManagerCore.memoryFactories.harvester(ctx) : spawnManagerCore.baseMemory('harvester', ctx);
                const name = nameGenerator.generateName('Harvester');
                if (attemptSpawn(spawn, body, name, mem, ctx, 'harvester', 'priority_harvester')) return true;
            }
        }
        
        // Затем спавним апгрейдеров
        const desiredUpgraders = (config.creeps && config.creeps.upgrader) ? config.creeps.upgrader : 0;
        if (currentUpgraders < desiredUpgraders) {
            const body = spawnManagerCore.pickBody('worker', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
            if (body) {
                const mem = spawnManagerCore.memoryFactories.upgrader ? spawnManagerCore.memoryFactories.upgrader(ctx) : spawnManagerCore.baseMemory('upgrader', ctx);
                const name = nameGenerator.generateName('Upgrader');
                if (attemptSpawn(spawn, body, name, mem, ctx, 'upgrader', 'priority_upgrader')) return true;
            }
        }
        
        // Если есть контейнеры возле источников, спавним miners и distributors
        if (hasSourceContainers) {
            // Спавним miners до желаемого уровня
            if (currentMiners < desiredMiners) {
                const body = spawnManagerCore.pickBody('miner', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
                if (body) {
                    const mem = spawnManagerCore.memoryFactories.miner ? spawnManagerCore.memoryFactories.miner(ctx) : spawnManagerCore.baseMemory('miner', ctx);
                    mem.targetRoom = roomName;
                    mem.resourceType = (config.localMinerResources && config.localMinerResources[0]) || RESOURCE_ENERGY;
                    const name = nameGenerator.generateName('Miner');
                    if (attemptSpawn(spawn, body, name, mem, ctx, 'miner', 'priority_miner')) return true;
                }
            }
            
            // Затем спавним distributors до желаемого уровня
            const currentDistributors = creepCounting.countCreepsByRole('distributor', roomName);
            if (currentMiners >= desiredMiners && currentDistributors < desiredDistributors) {
                const body = spawnManagerCore.pickBody('logist', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
                if (body) {
                    const mem = spawnManagerCore.memoryFactories.distributor ? spawnManagerCore.memoryFactories.distributor(ctx) : spawnManagerCore.baseMemory('distributor', ctx);
                    mem.targetRoom = roomName;
                    const name = nameGenerator.generateName('Distributor');
                    if (attemptSpawn(spawn, body, name, mem, ctx, 'distributor', 'priority_distributor')) return true;
                }
            }
        }

        // b) Если есть враги в комнате — первыми спавним защитников
        const roomObj = Game.rooms[roomName];
        const enemyCount = roomObj ? roomObj.find(FIND_HOSTILE_CREEPS).length : 0;
        if (enemyCount > 0) {
            const currentDefenders = creepCounting.countCreepsByRole('defender', roomName);
            const desiredDefenders = (config.creeps && config.creeps.defender) ? config.creeps.defender : 0;
            if (currentDefenders < desiredDefenders) {
                const body = spawnManagerCore.pickBody('defender', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
                if (body) {
                    const mem = spawnManagerCore.memoryFactories.defender ? spawnManagerCore.memoryFactories.defender(ctx) : spawnManagerCore.baseMemory('defender', ctx);
                    const name = nameGenerator.generateName('Defender');
                    if (attemptSpawn(spawn, body, name, mem, ctx, 'defender', 'priority_defender')) return true;
                }
            }
        }
    }
    // Если в комнате >= 5 крипов, используем оптимизированную логику
    else {
        const currentHarvesters = creepCounting.countCreepsByRole('harvester', roomName);
        // Count only miners that target this room (exclude remote miners owned by this controller)
        const currentMiners = creepCounting.countCreepsByRole('miner', roomName, roomName);
        const currentUpgraders = creepCounting.countCreepsByRole('upgrader', roomName);
        const hasContainers = roomData.hasContainerInRoom(roomName);

        // Проверяем, есть ли контейнеры возле источников
        const sourceContainers = Game.rooms[roomName] ? roomData.getSourceContainers(roomName) : [];
        const hasSourceContainers = sourceContainers.length > 0;
        
        // Определяем, сколько минимум нужно miners и distributors
        const configuredDesiredMiners = (config.creeps && config.creeps.miner) ? config.creeps.miner : 0;
        const configuredDesiredDistributors = (config.creeps && config.creeps.distributor) ? config.creeps.distributor : 0;
        const desiredMiners = Math.min(configuredDesiredMiners || 2, Math.max(2, sourceContainers.length));
        const desiredDistributors = configuredDesiredDistributors || 1; // по умолчанию хотя бы 1 distributor
        
        // Если есть контейнеры возле источников, сначала спавним miners и distributors
        if (hasSourceContainers) {
            // Спавним miners до желаемого уровня
            if (currentMiners < desiredMiners) {
                const body = spawnManagerCore.pickBody('miner', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
                if (body) {
                    const mem = spawnManagerCore.memoryFactories.miner ? spawnManagerCore.memoryFactories.miner(ctx) : spawnManagerCore.baseMemory('miner', ctx);
                    mem.targetRoom = roomName;
                    mem.resourceType = (config.localMinerResources && config.localMinerResources[0]) || RESOURCE_ENERGY;
                    const name = nameGenerator.generateName('Miner');
                    if (attemptSpawn(spawn, body, name, mem, ctx, 'miner', 'priority_miner')) return true;
                }
            }
            
            // Затем спавним distributors до желаемого уровня
            const currentDistributors = creepCounting.countCreepsByRole('distributor', roomName);
            if (currentMiners >= desiredMiners && currentDistributors < desiredDistributors) {
                const body = spawnManagerCore.pickBody('logist', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
                if (body) {
                    const mem = spawnManagerCore.memoryFactories.distributor ? spawnManagerCore.memoryFactories.distributor(ctx) : spawnManagerCore.baseMemory('distributor', ctx);
                    mem.targetRoom = roomName;
                    const name = nameGenerator.generateName('Distributor');
                    if (attemptSpawn(spawn, body, name, mem, ctx, 'distributor', 'priority_distributor')) return true;
                }
            }
            
            // Только если miners и distributors на нужном уровне, и если все еще нужно больше апгрейдеров, спавним апгрейдеров
            if (currentMiners >= desiredMiners && currentDistributors >= desiredDistributors) {
                const desiredUpgraders = (config.creeps && config.creeps.upgrader) ? config.creeps.upgrader : 0;
                if (currentUpgraders < desiredUpgraders) {
                    const body = spawnManagerCore.pickBody('worker', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
                    if (body) {
                        const mem = spawnManagerCore.memoryFactories.upgrader ? spawnManagerCore.memoryFactories.upgrader(ctx) : spawnManagerCore.baseMemory('upgrader', ctx);
                        const name = nameGenerator.generateName('Upgrader');
                        if (attemptSpawn(spawn, body, name, mem, ctx, 'upgrader', 'priority_upgrader')) return true;
                    }
                }
            }
        } else {
            // Если контейнеров возле источников нет - спавним харвестеров и апгрейдеров как обычно
            const desiredUpgraders = (config.creeps && config.creeps.upgrader) ? config.creeps.upgrader : 0;
            if (currentUpgraders < desiredUpgraders) {
                const body = spawnManagerCore.pickBody('worker', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
                if (body) {
                    const mem = spawnManagerCore.memoryFactories.upgrader ? spawnManagerCore.memoryFactories.upgrader(ctx) : spawnManagerCore.baseMemory('upgrader', ctx);
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
    const config = creepCounting.getRoomConfig(roomName);
    if (!config) return false;
    if (spawn.spawning) return false;

    const roomObj = Game.rooms[roomName];
    const enemyCount = roomObj ? roomObj.find(FIND_HOSTILE_CREEPS).length : 0;
    const currentDefenders = creepCounting.countCreepsByRole('defender', roomName);
    const desiredDefenders = (config.creeps && config.creeps.defender) ? config.creeps.defender : 0;
        if (enemyCount > currentDefenders && currentDefenders < desiredDefenders) {
        const body = spawnManagerCore.pickBody('defender', ctx.energy, ctx.energyCapacity, allowSmall, ctx);
        if (body) {
            const mem = spawnManagerCore.memoryFactories.defender ? spawnManagerCore.memoryFactories.defender(ctx) : spawnManagerCore.baseMemory('defender', ctx);
            const name = nameGenerator.generateName('Defender');
            if (attemptSpawn(spawn, body, name, mem, ctx, 'defender', 'defense')) return true;
        }
    }
    return false;
}

function tryRemotePhase(spawn, ctx, allowSmall) {
    const roomName = ctx.roomName;
    const config = creepCounting.getRoomConfig(roomName);
    if (!config || !config.remoteCreeps) return false;
    if (spawn.spawning) return false;

    const remoteCfg = config.remoteCreeps;

    // 3.1 CRAWLER: идём по списку rooms и спавним crawler там, где есть контейнеры с энергией
    if (remoteCfg.crawler && remoteCfg.crawler.rooms) {
        for (const target of remoteCfg.crawler.rooms) {
            if (!Game.rooms[target]) continue; // не видим комнату
            // контейнеры с энергией
            const containers = Game.rooms[target].find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER && _.some(s.store, (amt) => amt > 0) });
            const current = creepCounting.countCreepsByRole('crawler', roomName, target);
            const desired = remoteCfg.crawler.count || 0;
            if (containers.length > 0 && current < desired) {
                // Для remote ролей не разрешаем микровариантов
                const allowSmallForRemote = false;
                let body = spawnManagerCore.pickBody('logist', ctx.energy, ctx.energyCapacity, allowSmallForRemote, ctx);
                if (!body) {
                    console.log(`Skip crawler -> no body fits in ${roomName} (energy ${ctx.energy}/${ctx.energyCapacity})`);
                    continue;
                }
                const mem = spawnManagerCore.memoryFactories.crawler ? spawnManagerCore.memoryFactories.crawler(ctx) : spawnManagerCore.baseMemory('crawler', ctx);
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
            if (!roomData.roomHasConstructionOrContainersOrRoads(target)) continue;
            const current = creepCounting.countCreepsByRole('remoteBuilder', roomName, target);
            const desired = remoteCfg.remoteBuilder.count || 0;
            if (current < desired) {
                const body = spawnManagerCore.pickBody('worker', ctx.energy, ctx.energyCapacity, false, ctx);
                if (body) {
                    const mem = spawnManagerCore.baseMemory('remoteBuilder', ctx);
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
            // Проверяем, доступна ли комната перед вызовом getSourceContainers
            const sourceContainers = Game.rooms[target] ? roomData.getSourceContainers(target) : [];
            const desiredPerRoom = remoteCfg.miner.count || sourceContainers.length || 0;
            const desired = Math.min(sourceContainers.length, desiredPerRoom || sourceContainers.length);
            const current = creepCounting.countCreepsByRole('miner', roomName, target);
            if (desired > 0 && current < desired) {
                const body = spawnManagerCore.pickBody('miner', ctx.energy, ctx.energyCapacity, false, ctx);
                if (body) {
                    const mem = spawnManagerCore.baseMemory('miner', ctx);
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
            const threat = roomData.getThreatLevel(target);
            if (threat <= 0) continue; // пропускаем комнату без угрозы
            const current = creepCounting.countCreepsByRole('defender', roomName, target);
            const desired = remoteCfg.defender.count || 0;
            if (current < desired) {
                const body = spawnManagerCore.pickBody('defender', ctx.energy, ctx.energyCapacity, false, ctx);
                if (body) {
                    const mem = spawnManagerCore.baseMemory('defender', ctx);
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
            const current = creepCounting.countCreepsByRole('claimer', roomName, target);
            const desired = remoteCfg.claimer.count || 0;
            if (current < desired) {
                const body = spawnManagerCore.pickBody('claimer', ctx.energy, ctx.energyCapacity, false, ctx);
                if (body) {
                    const mem = spawnManagerCore.baseMemory('claimer', ctx);
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
    const SPAWN_RULES = getSpawnRules(spawnManagerCore.ensureDeps({
        pickBody: spawnManagerCore.pickBody,
        getRoomConfig: creepCounting.getRoomConfig,
        hasSufficientBaseCreeps: creepCounting.hasSufficientBaseCreeps,
        getSourceContainers: roomData.getSourceContainers,
        selectTargetRoom: selectTargetRoom,
        countCreepsByRole: creepCounting.countCreepsByRole,
        getThreatLevel: roomData.getThreatLevel,
        baseMemory: spawnManagerCore.baseMemory,
        memoryFactories: spawnManagerCore.memoryFactories,
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
    tryLocalPhase,
    tryDefensePhase,
    tryRemotePhase,
    tryLocalFillPhase,
    tryRemoteReplacementPhase,
    tryRulesPhase,
    attemptSpawn,
    recordSpawnDecision,
    selectTargetRoom
};