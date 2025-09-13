const utils = require('./utils');

function padLabel(label, width = 16) {
    // Минимум 2 пробела, но выравнивание вправо по числу
    const minSpaces = 2;
    const spaces = Math.max(width - label.length, minSpaces);
    return label + ' '.repeat(spaces);
}

module.exports.printStats = (spawns, rooms, roles, constants) => {
    // Общая энергия по всем комнатам
    let totalEnergy = 0;
    let totalEnergyCapacity = 0;
    for (const roomName in rooms) {
        const room = rooms[roomName];
        totalEnergy += room.energyAvailable;
        totalEnergyCapacity += room.energyCapacityAvailable;
    }
    console.log(`[${Game.time}]Tick ${Game.time} | Общая энергия: ${totalEnergy} из ${totalEnergyCapacity}`);

    // По каждому спавну — энергия
    for (const spawn of spawns) {
        const room = spawn.room;
        console.log(`[${Game.time}]Spawn: ${spawn.name}`);
        console.log(`[${Game.time}]Энергия: ${room.energyAvailable} из ${room.energyCapacityAvailable}`);
    }

    // Каждый 10-й тик — крипов по ролям для каждой комнаты/спавна
    if (Game.time % 10 === 0) {
        console.log(`Game.gcl.level: ${Game.gcl.level}`);
        for (const spawn of spawns) {
            const room = spawn.room;
            console.log(`[${Game.time}]Spawn: ${spawn.name}`);
            console.log(`[${Game.time}]Энергия: ${room.energyAvailable} из ${room.energyCapacityAvailable}`);

            // Крипы, относящиеся к этой комнате (по homeRoom)
            const creepsInRoom = Object.values(Game.creeps).filter(
                c => c.memory.homeRoom === room.name
            );
            console.log(`[${Game.time}]Creeps:          ${creepsInRoom.length}`);
            for (const role of Object.keys(roles)) {
                const label = padLabel(role.charAt(0).toUpperCase() + role.slice(1) + 's:');
                const count = creepsInRoom.filter(c => c.memory.role === role).length;
                console.log(`[${Game.time}]${label}${count}`);
            }
            if (!(spawn === spawns[spawns.length - 1])) {
                console.log(`[${Game.time}]#####################`);   
            }
        }
    }
    console.log(`[${Game.time}]#########################################################################`);
};
