// No require statement needed as utils is not used in this file

// Определите желаемый порядок ролей (можно менять)
const DEFAULT_ROLE_ORDER = [
    'harvester',
    'miner',
    'upgrader',
    'crawler',
    'defender',
    'towerman',
    'distributor',
    'logist',
    'courier',
    'labWorker',
    'guardian',
    'healer',
    'claimer',
    'remoteHarvester'
];

function padLabel(label, padTo = 6) {
    // Автоматический паддинг: дополняем до нужной длины
    const spaces = Math.max(padTo - label.length, 0);
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

// Функция для создания таблицы с количеством крипов по ролям в каждой комнате
function printCreepStatsTable(rooms, roles, opts = {}) {
    const roleOrder = getRoleOrder(roles, opts.roleOrder || DEFAULT_ROLE_ORDER);
    
    // Получаем только комнаты, которые контролируются игроком (claimed/owned)
    const roomNames = Object.keys(rooms).filter(roomName => {
        const room = Game.rooms[roomName];
        return room && room.controller && room.controller.my;
    });
    
    // Создаем заголовок таблицы
    let table = '+------' + '+------'.repeat(roleOrder.length) + '+------+\n';
    let header = '|ROOM  |';
    
    for (const role of roleOrder) {
        // Сокращаем название роли до 6 символов, если нужно
        let roleName = role.charAt(0).toUpperCase() + role.slice(1);
        if (roleName.length > 6) {
            roleName = roleName.substring(0, 6);
        } else if (roleName.length < 6) {
            roleName = padLabel(roleName, 6);
        }
        header += roleName + '|';
    }
    header += 'SUMM  |';
    table += header + '\n';
    table += '+------' + '+------'.repeat(roleOrder.length) + '+------+\n';
    
    // Для каждой комнаты подсчитываем количество крипов по ролям
    for (const roomName of roomNames) {
        const creepsInRoom = Object.values(Game.creeps).filter(
            c => c.memory.homeRoom === roomName
        );
        
        let row = '|' + padLabel(roomName, 6) + '|';
        let roomTotal = 0;
        
        for (const role of roleOrder) {
            const count = creepsInRoom.filter(c => c.memory.role === role).length;
            row += padLabel(count.toString(), 6) + '|';
            roomTotal += count;
        }
        
        // Добавляем общее количество крипов в комнате
        row += padLabel(roomTotal.toString(), 6) + '|';
        table += row + '\n';
        table += '+------' + '+------'.repeat(roleOrder.length) + '+------+\n';
    }
    
    console.log(table);
}

// Функция для создания таблицы с энергией в комнатах
function printEnergyStatsTable(rooms) {
    // Создаем заголовок таблицы
    let table = '+------+------+------+\n';
    table += '|ROOM  |Energy|Capaci|\n';
    table += '+------+------+------+\n';
    
    // Подсчитываем общую энергию только для owned комнат
    let totalEnergy = 0;
    let totalCapacity = 0;
    
    // Фильтруем только те комнаты, которые контролируются игроком
    const ownedRooms = Object.keys(rooms).filter(roomName => {
        const room = Game.rooms[roomName];
        return room && room.controller.my;
    });
    
    for (const roomName of ownedRooms) {
        const room = rooms[roomName];
        totalEnergy += room.energyAvailable;
        totalCapacity += room.energyCapacityAvailable;
    }
    
    // Добавляем строку "ALL"
    table += '|' + padLabel('ALL', 6) + '|' +
             padLabel(totalEnergy.toString(), 6) + '|' +
             padLabel(totalCapacity.toString(), 6) + '|\n';
    table += '+------+------+------+\n';
    
    // Добавляем строки для каждой комнаты
    for (const roomName of ownedRooms) {
        const room = rooms[roomName];
        table += '|' + padLabel(roomName, 6) + '|' +
                 padLabel(room.energyAvailable.toString(), 6) + '|' +
                 padLabel(room.energyCapacityAvailable.toString(), 6) + '|\n';
        table += '+------+------+------+\n';
    }
    
    console.log(table);
}

// Обновляем статистику крипов в Memory.stats (асинхронно, с задержкой на 1 тик)
function updateCreepStatsInMemory(rooms, roles, opts = {}) {
    const roleOrder = getRoleOrder(roles, opts.roleOrder || DEFAULT_ROLE_ORDER);
    // Фильтруем только те комнаты, которые контролируются игроком
    const roomNames = Object.keys(rooms).filter(roomName => {
        const room = Game.rooms[roomName];
        return room && room.controller && room.controller.my;
    });
    
    // Инициализируем Memory.stats, если нужно
    if (!Memory.stats) {
        Memory.stats = {};
    }
    
    // Для каждой комнаты подсчитываем количество крипов по ролям
    for (const roomName of roomNames) {
        const creepsInRoom = Object.values(Game.creeps).filter(
            c => c.memory.homeRoom === roomName
        );
        
        // Создаем объект для хранения статистики по комнате
        const roomStats = {};
        let roomTotal = 0;
        
        for (const role of roleOrder) {
            const count = creepsInRoom.filter(c => c.memory.role === role).length;
            roomStats[role] = count;
            roomTotal += count;
        }
        
        roomStats.total = roomTotal;
        
        // Сохраняем статистику в Memory.stats
        if (!Memory.stats.rooms) {
            Memory.stats.rooms = {};
        }
        Memory.stats.rooms[roomName] = roomStats;
    }
}

module.exports.printStats = (spawns, rooms, roles, opts = {}) => {
    // Обновляем статистику крипов в памяти раз в 10 тиков, но со сдвигом на 1 (на тик 9, 19, 29 и т.д.)
    if ((Memory.stats.currTime + 1) % 10 === 0) {
        updateCreepStatsInMemory(rooms, roles, opts);
    }
    
    // Выводим таблицу с энергией каждый тик
    console.log(`Tick: ${Memory.stats.currTime}`);
    printEnergyStatsTable(rooms);
    
    // Каждый 10-й тик выводим таблицу с крипами
    if (Memory.stats.currTime % 10 === 0) {
        console.log(`Game.gcl.level: ${Game.gcl.level}`);
        printCreepStatsTable(rooms, roles, opts);
    }
};