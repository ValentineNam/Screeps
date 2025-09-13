const roles = {
    builder: require('./roles/role.builder'),
    claimer: require('./roles/role.claimer'),
    defender: require('./roles/role.defender'),
    guardian: require('./roles/role.guardian'),
    // hardvester: require('./roles/role.hardvester'),
    harvester: require('./roles/role.harvester'),
    healer: require('./roles/role.healer'),
    towerman: require('./roles/role.towerman'),
    upgrader: require('./roles/role.upgrader'),
};

const constants = require('./configs/constants');

const towerManager = require('./controllers/towerManager');
const spawnManager = require('./controllers/spawnManager');

const statsService = require('./services/statsService');

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

    // --- Управление башнями ---
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        towerManager.runTowers(room);
    }

    // --- Вывод статистики ---
    statsService.printStats(spawns, Game.rooms, roles, constants);

     // --- Очистка памяти умерших крипов ---  
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log(`Deleted memory of dead creep: ${name}`);
        }
    }
}
