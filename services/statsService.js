const utils = require('./utils');

module.exports.printStats = (spawns, rooms, roles, constants) => {
    // Считаем крипов по ролям
    const counts = {};
    for (const role of Object.keys(roles)) {
        counts[role] = _.filter(Game.creeps, c => c.memory.role === role).length;
    }

    // Общая энергия по всем комнатам
    let totalEnergy = 0;
    let totalEnergyCapacity = 0;
    for (const roomName in rooms) {
        const room = rooms[roomName];
        totalEnergy += room.energyAvailable;
        totalEnergyCapacity += room.energyCapacityAvailable;
    }

    // Выводим статистику по каждому спавну
    for (const spawn of spawns) {
        console.log(`Spawn: ${spawn.name}`);
    }
    console.log(`Tick ${Game.time} | Общая энергия: ${totalEnergy} из ${totalEnergyCapacity}`);

    if (Game.time % 10 === 0) {
        console.log(`Game.gcl.level: ${Game.gcl.level}`);
        console.log(`Creeps:      ${Object.keys(Game.creeps).length}`);
        for (const role of Object.keys(roles)) {
            const label = role.charAt(0).toUpperCase() + role.slice(1) + 's';
            console.log(`${label}:  ${counts[role]}`);
        }
    }
    console.log(`#########################################################################`);
};