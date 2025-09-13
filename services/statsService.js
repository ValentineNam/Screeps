const utils = require('./utils');

// Определите желаемый порядок ролей (можно менять)
const DEFAULT_ROLE_ORDER = [
    'builder',
    'claimer',
    'defender',
    'guardian',
    'harvester',
    'healer',
    'towerman',
    'upgrader',
    'hardvester'
];

function padLabel(label, padTo = 16) {
    // Автоматический паддинг: минимум 2 пробела, цифры всегда на одной позиции
    const minSpaces = 2;
    const spaces = Math.max(padTo - label.length, minSpaces);
    return label + ' '.repeat(spaces);
}

function getRoleOrder(roles, customOrder) {
    if (customOrder && Array.isArray(customOrder)) {
        // Вернуть только те роли, которые реально есть
        return customOrder.filter(role => roles[role]);
    }
    // По алфавиту, если порядок не задан
    return Object.keys(roles).sort();
}

module.exports.printStats = (spawns, rooms, roles, constants, opts = {}) => {
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
        const roleOrder = getRoleOrder(roles, opts.roleOrder || DEFAULT_ROLE_ORDER);

        for (const spawn of spawns) {
            const room = spawn.room;
            console.log(`[${Game.time}]Spawn: ${spawn.name}`);
            console.log(`[${Game.time}]Энергия: ${room.energyAvailable} из ${room.energyCapacityAvailable}`);

            // Крипы, относящиеся к этой комнате (по homeRoom)
            const creepsInRoom = Object.values(Game.creeps).filter(
                c => c.memory.homeRoom === room.name
            );
            console.log(`[${Game.time}]Creeps:      ${creepsInRoom.length}`);

            // Автоматический расчет ширины для паддинга
            const maxLabelLength = Math.max(
                ...roleOrder.map(role => (role.charAt(0).toUpperCase() + role.slice(1) + 's:').length),
                8 // "Creeps:" длина
            );
            for (const role of roleOrder) {
                if (!roles[role]) continue;
                const label = padLabel(role.charAt(0).toUpperCase() + role.slice(1) + 's:', maxLabelLength);
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
