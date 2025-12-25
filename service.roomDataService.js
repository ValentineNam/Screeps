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
        if (Game.time - lastUpdated < forceUpdateTick) return;

        // Собираем данные
        mem.structures = this._getStructures(room);
        mem.sources = this._getSources(room);
        mem.minerals = this._getMinerals(room);
        mem.enemies = this._getEnemies(room);
        mem.enemyStructures = this._getEnemyStructures(room);
        mem.stats = this._calculateStats(room, mem);
        mem.lastUpdated = Game.time;

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
        const energy = room.energyCapacityAvailable;
        const controller = room.controller;

        if (energy < 550) return 'Stage1';
        if (controller && controller.level >= 3 && controller.level <= 5) return 'Stage2';
        if (controller && controller.level >= 6) return 'Stage3';
        return 'Unknown';
    }
};

module.exports = roomDataService;
