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
        sourceId: constants.LINKS_ID.Spawn1.sourceId,
        targetId: constants.LINKS_ID.Spawn1.targetId,
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
            'harvester', 'upgrader', 'builder', 'defender', 'guardian', 'healer', 'towerman', 'claimer', 'hardvester'
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
