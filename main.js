const roles = {
    builder: require('./role.builder'),
    claimer: require('./role.claimer'),
    defender: require('./role.defender'),
    guardian: require('./role.guardian'),
    // hardvester: require('./role.hardvester'),
    harvester: require('./role.harvester'),
    healer: require('./role.healer'),
    towerman: require('./role.towerman'),
    upgrader: require('./role.upgrader'),
};

const constants = require('./constants');

const towerManager = require('./towerManager');
const spawnManager = require('./spawnManager');
const linkManager = require('./linkManager');

const statsService = require('./statsService');

module.exports.loop = () => {
    const spawns = Object.values(Game.spawns);

    for (const spawn of spawns) {
        spawnManager.run(spawn);
    }
    // --- Выполнение ролей ---

    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const role = creep.memory.role;
        if (roles[role]) {
            roles[role].run(creep);
        }
    }

    // --- Передача энергии в башни ---
    linkManager.run({
        sourceId: '68c038b470da6d0069d3c36c',
        targetId: '68c026df04d00b0044561955',
        range: 10,
        tickInterval: 50
    });

    // --- Управление башнями ---
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        towerManager.runTowers(room);
    }

    // --- Вывод статистики ---
    statsService.printStats(spawns, Game.rooms, roles, constants, {
        roleOrder: [
            'harvester', 'upgrader', 'builder', 'defender', 'guardian', 'healer', 'logist', 'towerman', 'claimer', 'hardvester'
        ]
    });

     // --- Очистка памяти умерших крипов ---  
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log(`Deleted memory of dead creep: ${name}`);
        }
    }
};
