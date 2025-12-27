module.exports = function(deps) {
    const {
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
    } = deps;

    const rules = [
        { role: 'harvester', bodyRole: 'worker', priority: 100 },
        { role: 'miner', bodyRole: 'miner', priority: 99  },
        { role: 'upgrader', bodyRole: 'worker', priority: 96 },
        { role: 'builder', bodyRole: 'worker', priority: 94  },
        { role: 'defender', bodyRole: 'defender', priority: 70  },
        { role: 'guardian', bodyRole: 'guardian', priority: 71  },
        { role: 'towerman', bodyRole: 'worker', priority: 60  },
        { role: 'healer', bodyRole: 'healer', priority: 59  },
        { role: 'claimer', bodyRole: 'claimer', priority: 30  },
        { role: 'scout', bodyRole: 'scout', priority: 5  },

        // 1. Local miners
        {
            role: 'miner',
            bodyRole: 'miner',
            priority: 95,
            condition: (ctx) => {
                const config = getRoomConfig(ctx.roomName);
                if (!config) return false;
                if (!hasSufficientBaseCreeps(ctx.roomName)) return false;
                const targetRoom = ctx.roomName;
                // Проверяем, доступна ли комната перед вызовом getSourceContainers
                const sourceContainers = Game.rooms[targetRoom] ? getSourceContainers(targetRoom) : [];
                if (sourceContainers.length === 0) return false;
                const currentMiners = countCreepsByRole('miner', ctx.roomName, targetRoom);
                const configuredLocalMiners = (config.localCreeps && config.localCreeps.miner && typeof config.localCreeps.miner.count === 'number')
                    ? config.localCreeps.miner.count
                    : ((config.creeps && typeof config.creeps.miner === 'number') ? config.creeps.miner : 0);
                const maxMiners = Math.min(
                    sourceContainers.length,
                    configuredLocalMiners
                );
                return currentMiners < maxMiners;
            },
            memory: (ctx) => {
                const cfg = getRoomConfig(ctx.roomName) || {};
                const localRes = cfg.localMinerResources && cfg.localMinerResources.length ? cfg.localMinerResources : [RESOURCE_ENERGY];
                return {
                    role: 'miner',
                    homeRoom: ctx.roomName,
                    targetRoom: ctx.roomName,
                    resourceType: localRes[0]
                };
            },
            body: (ctx, allowSmall) => pickBody('miner', ctx.energy, ctx.energyCapacity, allowSmall, ctx)
        },

        // 2. Remote miners
        {
            role: 'miner',
            bodyRole: 'miner',
            isRemote: true,
            priority: 93,
            condition: (ctx) => {
                const config = getRoomConfig(ctx.roomName);
                if (!config) return false;
                if (!hasSufficientBaseCreeps(ctx.roomName)) return false;
                const targetRoom = selectTargetRoom(ctx.roomName, 'miner');
                if (!targetRoom) return false;
                // Проверяем, доступна ли комната перед вызовом getSourceContainers
                const sourceContainers = Game.rooms[targetRoom] ? getSourceContainers(targetRoom) : [];
                if (sourceContainers.length === 0) return false;
                const currentMiners = countCreepsByRole('miner', ctx.roomName, targetRoom);
                const maxMiners = Math.min(
                    sourceContainers.length,
                    (config.remoteCreeps && config.remoteCreeps.miner && config.remoteCreeps.miner.count) ? config.remoteCreeps.miner.count : 0
                );
                return currentMiners < maxMiners;
            },
            memory: (ctx) => {
                const base = baseMemory('miner', ctx);
                base.targetRoom = selectTargetRoom(ctx.roomName, 'miner');
                const cfg = getRoomConfig(ctx.roomName) || {};
                const resources = (cfg.remoteCreeps && cfg.remoteCreeps.miner && cfg.remoteCreeps.miner.resources) ? cfg.remoteCreeps.miner.resources : [RESOURCE_ENERGY];
                base.resourceType = _.sample(resources);
                return base;
            },
            body: (ctx, allowSmall) => pickBody('miner', ctx.energy, ctx.energyCapacity, allowSmall, ctx)
        },

        {
            role: 'logist',
            bodyRole: 'logist',
            priority: 85,
            condition: (ctx) => {
                // Don't spawn logist for rooms below stage4 (extractor/advanced tasks)
                const memRoom = (Memory.rooms && Memory.rooms[ctx.roomName]) ? Memory.rooms[ctx.roomName] : null;
                const stageVal = memRoom && memRoom.stats && memRoom.stats.stage;
                let stageNum = null;
                if (stageVal) {
                    if (typeof stageVal === 'number') stageNum = stageVal;
                    else if (typeof stageVal === 'string') {
                        const m = stageVal.match(/\d+/);
                        if (m) stageNum = parseInt(m[0], 10);
                    }
                }
                if (!stageNum || stageNum < 4) return false;

                const room = Game.rooms[ctx.roomName];
                if (!room) return false;
                const storage = room.storage;
                if (!storage) return false;
                
                // Проверяем, есть ли неэнергетические ресурсы в storage
                const hasNonEnergyInStorage = _.some(storage.store, (amt, res) => res !== RESOURCE_ENERGY && amt > 0);
                
                // Проверяем, есть ли неэнергетические ресурсы в контейнерах
                const containers = room.find(FIND_STRUCTURES, {
                    filter: (s) =>
                        s.structureType === STRUCTURE_CONTAINER &&
                        _.some(s.store, (amt, res) => res !== RESOURCE_ENERGY && amt > 0)
                });
                
                // Если нет неэнергетических ресурсов нигде, не спавним logist
                if (!hasNonEnergyInStorage && containers.length === 0) return false;
                
                // Use provided helper to count logist (includes pending reservations)
                const currentLogists = countCreepsByRole('logist', ctx.roomName);
                const cfg = getRoomConfig(ctx.roomName) || {};
                const desiredLogists = (cfg.creeps && typeof cfg.creeps.logist === 'number') ? cfg.creeps.logist : 0;
                return currentLogists < desiredLogists;
            },
            memory: (ctx) => ({
                role: 'logist',
                homeRoom: ctx.roomName,
                targetRoom: ctx.roomName,
                state: 'collecting'
            })
        },
        {
            role: 'distributor',
            bodyRole: 'logist',
            priority: 80,
            condition: (ctx) => {
                // 1. Проверка стадии комнаты (минимум стадия 2)
                const memRoom = (Memory.rooms && Memory.rooms[ctx.roomName]) ? Memory.rooms[ctx.roomName] : null;
                const stageVal = memRoom && memRoom.stats && memRoom.stats.stage;
                let stageNum = null;

                if (stageVal) {
                    if (typeof stageVal === 'number') stageNum = stageVal;
                    else if (typeof stageVal === 'string') {
                        const m = stageVal.match(/\d+/);
                        if (m) stageNum = parseInt(m[0], 10);
                    }
                }
                if (!stageNum || stageNum < 2) return false;

                // 2. Проверка наличия комнаты и Storage
                const room = Game.rooms[ctx.roomName];
                if (!room) return false;
                const storage = room.storage;
                if (!storage) return false;

                // 3. Проверка наличия Spawn/Extension, которые нуждаются в энергии
                const needEnergyStructures = room.find(FIND_MY_STRUCTURES, {
                    filter: (s) =>
                        (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (needEnergyStructures.length === 0) return false;

                // 4. Сравнение текущего количества с желаемым
                const currentDistributors = countCreepsByRole('distributor', ctx.roomName);
                const cfg = getRoomConfig(ctx.roomName) || {};
                const desiredDistributors = (cfg.creeps && typeof cfg.creeps.distributor === 'number')
                    ? cfg.creeps.distributor
                    : 0;

                return currentDistributors < desiredDistributors;
            },
            memory: (ctx) => ({
                role: 'distributor',
                homeRoom: ctx.roomName,
                targetRoom: ctx.roomName,
                state: 'collecting'
            })
        },
        // Chemistry helpers: couriers and labWorkers (spawn only when chemistry tasks exist)
        {
            role: 'courier',
            bodyRole: 'logist',
            priority: 82,
            condition: (ctx) => {
                try {
                    const config = creepCounting.getRoomConfig(ctx.roomName);
                    if (!config) return false;
                    
                    // Check if there are pending transfer tasks in chemistry
                    const mem = (Memory.chemistry && Memory.chemistry.rooms && Memory.chemistry.rooms[ctx.roomName]) ? Memory.chemistry.rooms[ctx.roomName] : null;
                    if (!mem || !mem.tasks) return false;
                    
                    const hasPendingTransfers = mem.tasks.some(t => t.type === 'transfer' && t.status === 'pending');
                    if (!hasPendingTransfers) return false;
                    
                    // Use the standard counting method to respect configured limits
                    const currentCount = creepCounting.countCreepsByRole('courier', ctx.roomName);
                    const desiredCount = (config.creeps && typeof config.creeps.courier === 'number')
                        ? config.creeps.courier
                        : 0;
                    
                    return currentCount < desiredCount;
                } catch (e) { return false; }
            },
            memory: (ctx) => ({ role: 'courier', homeRoom: ctx.roomName, targetRoom: ctx.roomName, state: 'transport' })
        },

        {
            role: 'labWorker',
            bodyRole: 'worker',
            priority: 81,
            condition: (ctx) => {
                try {
                    const config = creepCounting.getRoomConfig(ctx.roomName);
                    if (!config) return false;
                    
                    // Check if there are chemistry tasks that need lab workers
                    const mem = (Memory.chemistry && Memory.chemistry.rooms && Memory.chemistry.rooms[ctx.roomName]) ? Memory.chemistry.rooms[ctx.roomName] : null;
                    if (!mem || !mem.tasks) return false;
                    
                    const hasLabTasks = mem.tasks.some(t => t.type === 'produce' && ['staged','ready_for_lab','in_progress'].includes(t.status));
                    if (!hasLabTasks) return false;
                    
                    // Use the standard counting method to respect configured limits
                    const currentCount = creepCounting.countCreepsByRole('labWorker', ctx.roomName);
                    const desiredCount = (config.creeps && typeof config.creeps.labWorker === 'number')
                        ? config.creeps.labWorker
                        : 0;
                    
                    return currentCount < desiredCount;
                } catch (e) { return false; }
            },
            memory: (ctx) => ({ role: 'labWorker', homeRoom: ctx.roomName, state: 'lab' })
        },

        // Remote roles
        { role: 'crawler', bodyRole: 'logist', isRemote: true, priority: 89 },
        { role: 'remoteBuilder', bodyRole: 'worker', isRemote: true, priority: 84 },

        {
            role: 'remoteHarvester',
            bodyRole: 'worker',
            isRemote: true,
            priority: 80,
            condition: (ctx) => {
                const config = getRoomConfig(ctx.roomName);
                if (!config) return false;
                if (!hasSufficientBaseCreeps(ctx.roomName)) return false;
                const targetRoom = selectTargetRoom(ctx.roomName, 'remoteHarvester');
                if (!targetRoom) return false;
                const currentCount = countCreepsByRole('remoteHarvester', ctx.roomName, targetRoom);
                const desiredCount = (config.remoteCreeps && config.remoteCreeps.remoteHarvester && config.remoteCreeps.remoteHarvester.count) ? config.remoteCreeps.remoteHarvester.count : 0;
                return currentCount < desiredCount;
            },
            memory: (ctx) => {
                const base = baseMemory('remoteHarvester', ctx);
                base.targetRoom = selectTargetRoom(ctx.roomName, 'remoteHarvester');
                base.resourceType = RESOURCE_ENERGY;
                return base;
            },
            body: (ctx, allowSmall) => pickBody('worker', ctx.energy, ctx.energyCapacity, allowSmall, ctx)
        },

        { role: 'defender', bodyRole: 'defender', isRemote: true, priority: 50 },
        { role: 'claimer', bodyRole: 'claimer', isRemote: true }

    ];

    // Postprocess: attach default condition/memory/body where missing and wrap remote checks
    return rules.map(rule => ({
        ...rule,
        condition: rule.condition || ((ctx) => {
            const config = getRoomConfig(ctx.roomName);
            if (!config) return false;
            if (!['harvester', 'upgrader'].includes(rule.role)) {
                if (!hasSufficientBaseCreeps(ctx.roomName)) return false;
            }
            let currentCount = 0;
            let desiredCount = 0;
            if (rule.isRemote) {
                const targetRoom = selectTargetRoom(ctx.roomName, rule.role);
                if (!targetRoom) return false;
                currentCount = countCreepsByRole(rule.role, ctx.roomName, targetRoom);
                desiredCount = (config.remoteCreeps && config.remoteCreeps[rule.role] && config.remoteCreeps[rule.role].count) ? config.remoteCreeps[rule.role].count : 0;
                if (rule.role === 'defender') {
                    const threat = getThreatLevel ? getThreatLevel(targetRoom) : 0;
                    if (threat === 0 && currentCount >= 1) return false;
                }
            } else {
                currentCount = countCreepsByRole(rule.role, ctx.roomName);
                desiredCount = (getRoomConfig(ctx.roomName).creeps && getRoomConfig(ctx.roomName).creeps[rule.role]) || 0;
            }
            return currentCount < desiredCount;
        }),
        memory: rule.memory || ((ctx) => {
            const base = baseMemory(rule.role, ctx);
            if (rule.isRemote) base.targetRoom = selectTargetRoom(ctx.roomName, rule.role);
            return base;
        }),
        body: rule.body || ((ctx, allowSmall) => pickBody(rule.bodyRole, ctx.energy, ctx.energyCapacity, allowSmall, ctx))
    }));
};
