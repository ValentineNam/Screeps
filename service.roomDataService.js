const roomDataService = {

    /**
     * Собирает актуальные данные по комнате и кладёт в Memory
     * @param {string} roomName 
     * @param {number} [forceUpdateTick=5] — обновлять каждые N тиков
     */
    updateRoomData(roomName, forceUpdateTick = 5) {
        const room = Game.rooms[roomName];
        if (!room) return;

        const mem = Memory.rooms[roomName] || {};
        const lastUpdated = mem.lastUpdated || 0;

        // Пропускаем обновление, если не прошло достаточно тиков
        if (Memory.stats.currTime - lastUpdated < forceUpdateTick) return;

        // Собираем данные
        mem.structures = this._getStructures(room);
        mem.spawns = this._getSpawns(room);
        mem.controller = this._getController(room);
        mem.droppedResources = this._getDroppedResources(room);
        mem.sources = this._getSources(room);
        mem.minerals = this._getMinerals(room);
        mem.enemies = this._getEnemies(room);
        mem.enemyStructures = this._getEnemyStructures(room);
        mem.stats = this._calculateStats(room, mem);
        mem.lastUpdated = Memory.stats.currTime;

        Memory.rooms[roomName] = mem;
    },

    _getStructures(room) {
        return room.find(FIND_STRUCTURES).map(s => ({
            id: s.id,
            type: s.structureType,
            pos: s.pos,
            hits: s.hits,
            energy: s.energy ? s.energy : null,
            store: s.store ? Object.assign({}, s.store) : null
        }));
    },

    _getSpawns(room) {
        return room.find(FIND_MY_SPAWNS).map(s => ({
            id: s.id,
            name: s.name,
            pos: s.pos,
            hits: s.hits,
            hitsMax: s.hitsMax,
            spawning: s.spawning ? {
                name: s.spawning.name,
                needTime: s.spawning.needTime,
                remainingTime: s.spawning.remainingTime,
                creep: s.spawning.creep ? s.spawning.creep.name : null,
                directions: s.spawning.directions
            } : null,
            store: Object.assign({}, s.store),
            storeCapacity: s.storeCapacity
        }));
    },

    _getController(room) {
        if (!room.controller) return null;
        
        return {
            id: room.controller.id,
            pos: room.controller.pos,
            level: room.controller.level,
            progress: room.controller.progress,
            progressTotal: room.controller.progressTotal,
            upgradeBlocked: room.controller.upgradeBlocked,
            reservation: room.controller.reservation ? {
                username: room.controller.reservation.username,
                ticksToEnd: room.controller.reservation.ticksToEnd
            } : null,
            owner: room.controller.owner ? {
                username: room.controller.owner.username
            } : null,
            isPowerEnabled: room.controller.isPowerEnabled,
            safeMode: room.controller.safeMode,
            safeModeAvailable: room.controller.safeModeAvailable,
            safeModeCooldown: room.controller.safeModeCooldown,
            sign: room.controller.sign ? {
                username: room.controller.sign.username,
                text: room.controller.sign.text,
                time: room.controller.sign.time,
                datetime: room.controller.sign.datetime
            } : null
        };
    },

    _getSources(room) {
        return room.find(FIND_SOURCES).map(s => ({
            id: s.id,
            pos: s.pos,
            energyCapacity: s.energyCapacity,
            energy: s.energy
        }));
    },

    _getMinerals(room) {
        return room.find(FIND_MINERALS).map(m => ({
            id: m.id,
            pos: m.pos,
            mineralType: m.mineralType,
            density: m.density,
            harvestAmount: m.harvestAmount
        }));
    },

    _getEnemies(room) {
        return room.find(FIND_HOSTILE_CREEPS).map(c => ({
            id: c.id,
            pos: c.pos,
            owner: c.owner.username,
            body: c.body.map(p => p.type),
            hits: c.hits
        }));
    },

    _getEnemyStructures(room) {
        return room.find(FIND_HOSTILE_STRUCTURES).map(s => ({
            id: s.id,
            type: s.structureType,
            pos: s.pos,
            owner: s.owner.username
        }));
    },

    _getDroppedResources(room) {
        return room.find(FIND_DROPPED_RESOURCES).map(r => ({
            id: r.id,
            pos: r.pos,
            resourceType: r.resourceType,
            amount: r.amount
        }));
    },

    _calculateStats(room, mem) {
        const structures = mem.structures || [];
        const sources = mem.sources || [];

        return {
            stage: this._determineStage(room, structures),
            totalEnergy: structures
                .filter(s => s.store)
                .reduce((sum, s) => sum + (s.store[RESOURCE_ENERGY] || 0), 0),
            sourceCount: sources.length,
            containerCount: structures.filter(s => s.type === STRUCTURE_CONTAINER).length,
            extensionCount: structures.filter(s => s.type === STRUCTURE_EXTENSION).length,
            towerCount: structures.filter(s => s.type === STRUCTURE_TOWER).length,
            controllerLevel: room.controller ? room.controller.level : 0
        };
    },

    _determineStage(room, structures) {
        // Новая логика стадий (см. BASE_STAGES в config.constants)
        if (!room || !room.controller) return 'stage0';

        const level = room.controller.level || 0;
        const energyCap = room.energyCapacityAvailable || 0;

        // Считаем количество links, labs и наличие терминала
        const linksCount = structures.filter(s => s.type === STRUCTURE_LINK).length;
        const labsCount = structures.filter(s => s.type === STRUCTURE_LAB).length;
        const hasTerminal = structures.some(s => s.type === STRUCTURE_TERMINAL);

        // stage5: 7 уровень и links >= 4
        if (level >= 7 && linksCount >= 4) return 'stage5';

        // stage4: 6 уровень и links = 3, 3 лаборатории и терминал
        if (level >= 6 && linksCount >= 3 && labsCount >= 3 && hasTerminal) return 'stage4';

        // stage3: 5 уровень и links = 2
        if (level >= 5 && linksCount >= 2) return 'stage3';

        // stage2: 2 - 5 уровень и максимум энергии 550 или больше
        if (level >= 2 && level <= 5 && energyCap >= 550) return 'stage2';

        // stage1: 0 - 2 уровень или максимум энергии в расширениях и спавне меньше 550
        if (level <= 2 || energyCap < 550) return 'stage1';

        // На всякий случай
        return 'stage1';
    }
};

module.exports = roomDataService;
