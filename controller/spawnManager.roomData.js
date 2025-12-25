const constants = require('./config.constants');
const utils = require('./utils');

const BODYPART_COST = constants.BODYPART_COST;
const BODIES = constants.CREEPS_BODIES;
const DESIRED = constants.DESIRED_COUNTS;

// → НОВОЕ: проверка наличия контейнера в комнате
function hasContainerInRoom(roomName) {
    // Используем кешированные данные из Memory.rooms
    const roomData = Memory.rooms && Memory.rooms[roomName];
    if (roomData && roomData.structures) {
        // Проверяем наличие контейнеров в закешированных структурах
        return roomData.structures.some(s => s.type === STRUCTURE_CONTAINER);
    }
    
    // Резервный вариант - обращение к игровому движку
    const room = Game.rooms[roomName];
    if (!room) return false;
    return room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
    }).length > 0;
}

// → НОВОЕ: оценка угрозы в комнате
function getThreatLevel(roomName) {
    // Используем кешированные данные из Memory.rooms
    const roomData = Memory.rooms && Memory.rooms[roomName];
    if (roomData) {
        let threat = 0;
        
        // Проверяем вражеских крипов из кеша
        if (roomData.enemies) {
            threat += roomData.enemies.length * 10;
        }
        
        // Проверяем вражеские структуры из кеша
        if (roomData.enemyStructures) {
            threat += roomData.enemyStructures.length * 5;
        }
        
        // Проверяем Invader Core из кеша
        if (roomData.structures) {
            const hasInvaderCore = roomData.structures.some(s => s.type === STRUCTURE_INVADER_CORE);
            if (hasInvaderCore) {
                threat += 100;
            }
        }
        
        return threat;
    }
    
    // Резервный вариант - обращение к игровому движку
    const room = Game.rooms[roomName];
    if (!room) return 0;

    let threat = 0;
    
    // Invader Core — максимальный приоритет
    if (room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_INVADER_CORE
    }).length > 0) {
        threat += 100;
    }

    // Враждебные крипы
    threat += room.find(FIND_HOSTILE_CREEPS).length * 10;
    
    // Другие враждебные структуры
    threat += room.find(FIND_STRUCTURES, {
        filter: s => !s.my && s.owner && s.structureType !== STRUCTURE_ROAD
    }).length * 5;

    return threat;
}

// Возвращает список контейнеров, находящихся в радиусе 2 от любого источника в комнате
function getSourceContainers(roomName) {
    // Используем кешированные данные из Memory.rooms
    const roomData = Memory.rooms && Memory.rooms[roomName];
    if (roomData && roomData.sources && roomData.structures) {
        // Ищем контейнеры возле источников в закешированных данных
        const sourcePositions = roomData.sources.map(s => new RoomPosition(s.pos.x, s.pos.y, roomName));
        const containers = roomData.structures
            .filter(s => s.type === STRUCTURE_CONTAINER)
            .map(s => Game.getObjectById(s.id))
            .filter(Boolean);
            
        const sourceContainers = [];
        for (const src of sourcePositions) {
            // Проверяем, доступна ли комната перед вызовом findInRange
            if (Game.rooms[roomName]) {
                try {
                    const nearby = src.findInRange(containers, 2);
                    for (const c of nearby) {
                        if (!sourceContainers.some(x => x.id === c.id)) sourceContainers.push(c);
                    }
                } catch (e) {
                    // Если комната недоступна, findInRange выбросит ошибку - просто возвращаем пустой массив
                    log('ERROR', `[getSourceContainers] Error accessing room ${roomName}: ${e.message}`, 'system');
                    return [];
                }
            } else {
                // Если комната недоступна в Game.rooms, возвращаем пустой массив
                return [];
            }
        }
        return sourceContainers;
    }
    
    // Резервный вариант - обращение к игровому движку
    const room = Game.rooms[roomName];
    if (!room) return [];
    const sources = room.find(FIND_SOURCES);
    const containers = [];
    for (const src of sources) {
        try {
            const nearby = src.pos.findInRange(FIND_STRUCTURES, 2, { filter: s => s.structureType === STRUCTURE_CONTAINER });
            for (const c of nearby) {
                if (!containers.some(x => x.id === c.id)) containers.push(c);
            }
        } catch (e) {
            // Если комната недоступна, findInRange выбросит ошибку - пропускаем этот источник
            continue;
        }
    }
    return containers;
}

function roomHasConstructionOrContainersOrRoads(roomName) {
    // Используем кешированные данные из Memory.rooms
    const roomData = Memory.rooms && Memory.rooms[roomName];
    if (roomData && roomData.structures) {
        // Проверяем наличие контейнеров и дорог в закешированных структурах
        const hasContainers = roomData.structures.some(s => s.type === STRUCTURE_CONTAINER);
        const hasRoads = roomData.structures.some(s => s.type === STRUCTURE_ROAD);
        
        if (hasContainers || hasRoads) return true;
    }
    
    // Для строительных площадок нужно проверить отдельно
    if (roomData && roomData.constructionSites && roomData.constructionSites.length > 0) {
        return true;
    }
    
    // Резервный вариант - обращение к игровому движку
    const room = Game.rooms[roomName];
    if (!room) return false;
    if (room.find(FIND_CONSTRUCTION_SITES).length > 0) return true;
    if (room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER }).length > 0) return true;
    if (room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_ROAD }).length > 0) return true;
    return false;
}

module.exports = {
    hasContainerInRoom,
    getThreatLevel,
    getSourceContainers,
    roomHasConstructionOrContainersOrRoads
};