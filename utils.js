/**
 * Logging system with configurable levels
 */

// Define log levels
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

// Initialize log levels configuration in Memory
if (!Memory.logs) {
    Memory.logs = {
        ERROR: true,
        WARN: true,
        INFO: false,
        DEBUG: false
    };
}

/**
 * Log a message if the specified log level is enabled
 * @param {string} level - The log level (ERROR, WARN, INFO, DEBUG)
 * @param {string} message - The message to log
 * @param {string|RoomObject} [source] - Optional source (room name or creep/structure reference)
 */
function log(level, message, source = null) {
    // Check if this log level is enabled
    if (!Memory.logs[level]) {
        return;
    }

    // Format the message with source if provided
    let formattedMessage = message;
    if (source) {
        if (typeof source === 'string') {
            formattedMessage = `[${source}] ${message}`;
        } else if (source.name) {
            formattedMessage = `[${source.name}] ${message}`;
        } else if (source.pos) {
            formattedMessage = `[${source.pos.roomName}] ${message}`;
        } else {
            formattedMessage = `[${source}] ${message}`;
        }
    }

    // Output the log based on level
    switch (level) {
        case 'ERROR':
            console.log(`[${level}] ${formattedMessage}`);
            break;
        case 'WARN':
            console.log(`[${level}] ${formattedMessage}`);
            break;
        case 'INFO':
            console.log(`[${level}] ${formattedMessage}`);
            break;
        case 'DEBUG':
            console.log(`[${level}] ${formattedMessage}`);
            break;
        default:
            console.log(`[${level}] ${formattedMessage}`);
    }
}

/**
 * Set log level enabled/disabled
 * @param {string} level - The log level to set
 * @param {boolean} enabled - Whether the level should be enabled (default: true)
 */
function setLogLevel(level, enabled = true) {
    if (LOG_LEVELS.hasOwnProperty(level)) {
        Memory.logs[level] = enabled;
        log('INFO', `Log level ${level} set to ${enabled}`, 'System');
    } else {
        log('ERROR', `Invalid log level: ${level}`, 'System');
    }
}

/**
 * Set multiple log levels at once
 * @param {Object} levels - Object with level names as keys and boolean values
 */
function setLogLevels(levels) {
    for (const [level, enabled] of Object.entries(levels)) {
        if (LOG_LEVELS.hasOwnProperty(level)) {
            Memory.logs[level] = enabled;
        } else {
            log('ERROR', `Invalid log level: ${level}`, 'System');
        }
    }
    log('INFO', `Log levels updated: ${JSON.stringify(levels)}`, 'System');
}

/**
 * Get current log level configuration
 */
function getLogLevels() {
    return Memory.logs;
}

module.exports = {
    findClosestSource: (creep) => {
        return creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    },

    findAvailableSource: (creep, resourceType = RESOURCE_ENERGY) => {
        const targetRoomName = creep.memory.targetRoom;
        const room = Game.rooms[targetRoomName];

        if (!room) {
            log('WARN', `[findAvailableSource] Room ${targetRoomName} not found`, 'System');
            return null;
        }

        if (!room.controller || !room.controller.my) {
            log('WARN', `[findAvailableSource] Room ${targetRoomName} not owned`, 'System');
            return null;
        }

        if (!resourceType) {
            log('WARN', `[findAvailableSource] resourceType not defined for creep ${creep.name}, defaulting to ENERGY`, creep);
            resourceType = RESOURCE_ENERGY;
        }

        let candidates = [];

        // 1. Собираем все доступные источники
        if (resourceType === RESOURCE_ENERGY) {
            candidates = room.find(FIND_SOURCES);
        } else {
            const minerals = room.find(FIND_MINERALS, {
                filter: (m) => m.mineralType === resourceType
            });

            candidates = minerals.filter(mineral => {
                const extractor = room.lookForAt(LOOK_STRUCTURES, mineral.pos).find(
                    s => s.structureType === STRUCTURE_EXTRACTOR
                );
                return extractor && mineral.mineralAmount > 0; // проверяем наличие ресурса
            });
        }

        if (candidates.length === 0) {
            log('WARN', `[findAvailableSource] No sources found for ${resourceType} in ${targetRoomName}`, 'System');
            return null;
        }

        // 2. Оцениваем нагрузку на каждый источник
        const sourceScores = candidates.map(source => {
            // Считаем крипов: на источнике + рядом (в радиусе 2 клеток)
            const nearbyCreeps = room.find(FIND_CREEPS, {
                filter: c => c.pos.getRangeTo(source.pos) <= 2 &&
                            c.memory.state === 'harvesting' &&
                            (c.memory.sourceId === source.id ||
                            !c.memory.sourceId)
            });

            // Базовый штраф за расстояние (чтобы не все шли к самому близкому)
            const distancePenalty = creep.pos.getRangeTo(source) * 0.1;

            return {
                source: source,
                score: nearbyCreeps.length + distancePenalty
            };
        });

        // 3. Выбираем источник с минимальным score (наименьшая нагрузка + разумное расстояние)
        const bestSource = sourceScores.reduce((prev, curr) => {
            return (curr.score < prev.score) ? curr : prev;
        }).source;

        return bestSource;
    },

    // Поиск приоритетных зданий для передачи ресурсов
    findPriorityTarget: (creep) => {
        const priorityTypes = [
            STRUCTURE_SPAWN,
            STRUCTURE_EXTENSION,
            STRUCTURE_TOWER,
            STRUCTURE_STORAGE,
            STRUCTURE_CONTAINER,
            STRUCTURE_LINK,
            STRUCTURE_FACTORY,
            STRUCTURE_LAB,
            STRUCTURE_NUKER,
            STRUCTURE_POWER_SPAWN,
            STRUCTURE_OBSERVER,
            STRUCTURE_TERMINAL,
            STRUCTURE_PORTAL,
            // добавьте другие по необходимости
        ];

        for (let type of priorityTypes) {
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) =>
                    structure.structureType === type &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (targets.length > 0) {
                return creep.pos.findClosestByPath(targets);
            }
        }

        // Если приоритетных структур нет, ищем ближайшее хранилище
        const storage = creep.room.storage;
        if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            return storage;
        }

        // Если нет хранилища, ищем ближайший терминал
        const terminal = creep.room.terminal;
        if (terminal && terminal.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            return terminal;
        }

        // Если нет приоритетных структур, ищем спавн или экстеншн с наименьшей энергией
        const spawnsAndExtensions = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                (structure.structureType === STRUCTURE_SPAWN ||
                 structure.structureType === STRUCTURE_EXTENSION) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (spawnsAndExtensions.length > 0) {
            // Сортируем по заполненности (сначала менее заполненные)
            spawnsAndExtensions.sort((a, b) =>
                a.store.getFreeCapacity(RESOURCE_ENERGY) - b.store.getFreeCapacity(RESOURCE_ENERGY)
            );
            return creep.pos.findClosestByPath(spawnsAndExtensions);
        }

        // Если нет подходящих структур, возвращаем null
        return null;
    },

    findPriorityConstructionSite: (room) => {
        const priorityTypes = [
            STRUCTURE_SPAWN,
            STRUCTURE_EXTENSION,
            STRUCTURE_TOWER,
            STRUCTURE_STORAGE,
            STRUCTURE_CONTAINER,
            STRUCTURE_LINK,
            STRUCTURE_FACTORY,
            STRUCTURE_LAB,
            STRUCTURE_NUKER,
            STRUCTURE_POWER_SPAWN,
            STRUCTURE_OBSERVER,
            STRUCTURE_TERMINAL,
            STRUCTURE_PORTAL,
        ];

        for (let type of priorityTypes) {
            const sites = room.find(FIND_CONSTRUCTION_SITES, {
                filter: (site) => site.structureType === type
            });
            if (sites.length > 0) {
                return sites[0]; // Возвращаем первый сайт приоритетного типа
            }
        }

        // Если приоритетных нет, возвращаем любой
        const allSites = room.find(FIND_CONSTRUCTION_SITES);
        return allSites.length > 0 ? allSites[0] : null;
    },

    findPriorityRepairTarget: (room) => {
        // 1. Контроллер - приоритет 1
        if (room.controller && room.controller.hits < room.controller.hitsMax * 0.8) {
            return room.controller;
        }

        // 2. Стены и рампы с низким HP - приоритет 2
        const wallsAndRamparts = room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                (structure.structureType === STRUCTURE_RAMPART ||
                 structure.structureType === STRUCTURE_WALL) &&
                structure.hits < structure.hitsMax * 0.1 // менее 10% прочности
        });

        if (wallsAndRamparts.length > 0) {
            // Возвращаем самую повреждённую
            return _.min(wallsAndRamparts, (s) => s.hits);
        }

        // 3. Приоритетные структуры (без стен и рамп)
        const priorityTypes = [
            STRUCTURE_SPAWN,
            STRUCTURE_EXTENSION,
            STRUCTURE_TOWER,
            STRUCTURE_STORAGE,
            STRUCTURE_CONTAINER,
            STRUCTURE_LINK,
            STRUCTURE_FACTORY,
            STRUCTURE_LAB,
            STRUCTURE_NUKER,
            STRUCTURE_POWER_SPAWN,
            STRUCTURE_OBSERVER,
            STRUCTURE_TERMINAL,
        ];

        for (let type of priorityTypes) {
            const structures = room.find(FIND_STRUCTURES, {
                filter: (structure) =>
                    structure.structureType === type &&
                    structure.hits < structure.hitsMax * 0.8 // менее 80% прочности
            });

            if (structures.length > 0) {
                // Выбираем наиболее повреждённую структуру (минимальный остаток HP)
                return _.min(structures, (s) => s.hits);
            }
        }

        // 4. Остальные структуры
        const allStructures = room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                structure.hits < structure.hitsMax * 0.5 && // менее 50% прочности
                structure.structureType !== STRUCTURE_RAMPART &&
                structure.structureType !== STRUCTURE_WALL
        });

        if (allStructures.length > 0) {
            // Выбираем наиболее повреждённую структуру (минимальный остаток HP)
            return _.min(allStructures, (s) => s.hits);
        }

        return null; // Нет целей для ремонта
    },
    
    findContainerWithEnergy: (creep, minEnergy = 150) => {
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                structure.structureType === STRUCTURE_CONTAINER &&
                structure.store.getUsedCapacity(RESOURCE_ENERGY) >= minEnergy
            });
        if (containers.length > 0) {
            return creep.pos.findClosestByPath(containers);
        }
        return null;
    },

    findNearestContainerWithEnergy: (creep, minEnergy = 0) => {
        // Используем кешированные данные из Memory.rooms
        const targetRoom = creep.memory.targetRoom || creep.room.name;
        const roomData = Memory.rooms && Memory.rooms[targetRoom];
        
        if (roomData && roomData.structures) {
            // Ищем контейнеры с энергией в закешированных структурах
            const cachedContainers = roomData.structures
                .filter(s => s.type === STRUCTURE_CONTAINER && s.store && (s.store[RESOURCE_ENERGY] || 0) >= minEnergy)
                .map(s => Game.getObjectById(s.id))
                .filter(Boolean);
                
            if (cachedContainers.length > 0) {
                return creep.pos.findClosestByPath(cachedContainers);
            }
        }
        
        // Резервный вариант - обращение к игровому движку
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                structure.structureType === STRUCTURE_CONTAINER &&
                structure.store.getUsedCapacity(RESOURCE_ENERGY) >= minEnergy
        });
        if (containers.length > 0) {
            return creep.pos.findClosestByPath(containers);
        }
        return null;
    },
    
    findClosestWounded: (creep) => {
        return creep.pos.findClosestByPath(FIND_MY_CREEPS, {
            filter: (c) => c.hits < c.hitsMax && c.id !== creep.id
        });
    },


    moveToWounded: (creep, target) => {
        if (target) {
            if (creep.heal(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#00ff00'}});
            }
        }
    },

    countCreepsByRoleAndRoom: (role, roomName) => _.filter(Game.creeps, c => c.memory.role === role && c.memory.homeRoom === roomName).length,

    countCreepsByRole: (role, homeRoom, targetRoom, opts = {}) => {
        // Используем кешированные данные из Memory для уменьшения обращений к Game.creeps
        if (!Memory.creepCounts) Memory.creepCounts = {};
        const resourceType = opts.resourceType || 'any';
        const cacheKey = `${role}_${homeRoom}_${targetRoom || 'any'}_${resourceType}`;
        const cached = Memory.creepCounts[cacheKey];
        
        // Кешируем результат на 5 тиков
        if (cached && cached.tick && Game.time - cached.tick < 5) {
            return cached.count;
        }
        
        const count = _.filter(Game.creeps, creep => {
            if (creep.memory.role !== role) return false;
            if (creep.memory.homeRoom !== homeRoom) return false;
            if (targetRoom && creep.memory.targetRoom !== targetRoom) return false;
            
            if (opts.resourceType && creep.memory.resourceType !== opts.resourceType) {
                return false;
            }
            
            return true;
        }).length;
        
        // Сохраняем в кеш
        Memory.creepCounts[cacheKey] = {
            count: count,
            tick: Game.time
        };
        
        return count;
    },


    creepsSum: (roomName) => _.filter(Game.creeps, (creep) => creep.memory.homeRoom === roomName).length,

    findResourceAndContainerPositions: (creep) => {
        const room = creep.room;
        const validPositions = [];
        const sourceRange = 2; // радиус поиска контейнеров от источника

        // 1. Получаем все источники
        const sources = room.find(FIND_SOURCES);
        if (sources.length === 0) {
            log('WARN', `No sources in ${room.name}`, creep);
            return null;
        }

        for (const source of sources) {
            // 2. Ищем контейнеры в радиусе `sourceRange` от источника
            const nearbyContainers = room.lookForAtArea(
                LOOK_STRUCTURES,
                source.pos.y - sourceRange,
                source.pos.x - sourceRange,
                source.pos.y + sourceRange,
                source.pos.x + sourceRange,
                true
            ).filter(item =>
                item.structureType === STRUCTURE_CONTAINER &&
                !item.structure.destroyed &&
                item.pos.getRangeTo(source) <= sourceRange
            );

            for (const container of nearbyContainers) {
                // 3. Проверяем 8 соседних клеток (включая диагонали)
                const offsets = [
                    [1, 0], [-1, 0], [0, 1], [0, -1],
                    [1, 1], [-1, -1], [1, -1], [-1, 1]
                ];

                for (const [dx, dy] of offsets) {
                    const pos = new RoomPosition(
                        container.pos.x + dx,
                        container.pos.y + dy,
                        room.name
                    );

                    // 4. Границы комнаты
                    if (pos.x < 0 || pos.x > 49 || pos.y < 0 || pos.y > 49) continue;

                    // Логируем каждую проверяемую клетку
                    log('DEBUG', `Проверка клетки (${pos.x},${pos.y}) относительно контейнера (${container.pos.x},${container.pos.y})`, creep);

                    const look = room.lookAt(pos);
                    let isBlocked = false;
                    let isOccupied = false;

                    for (const item of look) {
                        // Логировать каждый элемент для диагностики
                        if (item.type) {
                            log('DEBUG', `  Item type: ${item.type}${item.structure ? ', structureType=' + item.structure.structureType : ''}`, creep);
                        }

                        // a) Стены и непроходимые terrain
                        if (item.type === 'terrain') {
                            if (item.terrain === 'wall' || item.terrain === 'swamp') {
                                isBlocked = true;
                                break;
                            }
                        }

                        // b) Структуры (кроме дорог и контейнеров)
                        if (item.structure) {
                            const structureType = item.structure.structureType;
                            if (![
                                STRUCTURE_ROAD,
                                STRUCTURE_CONTAINER
                            ].includes(structureType)) {
                                isBlocked = true;
                                break;
                            }
                        }

                        // c) Крипы (включая самого creep, если он ещё не сдвинулся)
                        if (item.type === 'creep' && item.creep.id !== creep.id) {
                            isOccupied = true;
                        }

                        // d) Строительные площадки
                        if (item.type === 'constructionSite') {
                            isBlocked = true;
                            break;
                        }

                        // e) Упавшие ресурсы (можно игнорировать)
                    }

                    // Если клетка свободна и не занята
                    if (!isBlocked && !isOccupied) {
                        // Логируем подходящую позицию
                        log('DEBUG', `Подходящая позиция: (${pos.x},${pos.y}), расстояние до источника: ${pos.getRangeTo(source)}`, creep);
                        validPositions.push({
                            pos,
                            rangeToSource: pos.getRangeTo(source),
                            rangeToCreep: pos.getRangeTo(creep.pos)
                        });
                    }
                }
            }
        }

        // 6. Сортируем: сначала ближе к источнику, потом к creep
        validPositions.sort((a, b) => {
            if (a.rangeToSource !== b.rangeToSource) {
                return a.rangeToSource - b.rangeToSource;
            }
            return a.rangeToCreep - b.rangeToCreep;
        });

        // 7. Логирование результата для отладки
        if (validPositions.length > 0) {
            log('INFO', `Найдена позиция: ${validPositions[0].pos.x}, ${validPositions[0].pos.y}`, creep);
        } else {
            log('WARN', `Не удалось найти подходящие позиции.`, creep);
        }

        // Возвращаем лучшую позицию или null
        return validPositions.length > 0 ? validPositions[0].pos : null;
    },

    countCreepsByRole: (role, homeRoom, targetRoom = null) => {
        return _.filter(Game.creeps, creep => {
            if (creep.memory.role !== role) return false;
            if (creep.memory.homeRoom !== homeRoom) return false;
            return !targetRoom || creep.memory.targetRoom === targetRoom;
        }).length;
    },

    hasContainerInRoom: (roomName) => {
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
    },

    getThreatLevel: (roomName) => {
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
        threat += room.find(FIND_HOSTILE_CREEPS).length * 10;
        
        if (room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_INVADER_CORE
        }).length > 0) {
            threat += 10;
        }

        return threat;
    },

    getSourcesInRoom: (roomName, resourceType) => {
        const room = Game.rooms[roomName];
        if (!room) return [];

        if (resourceType === RESOURCE_ENERGY) {
            return room.find(FIND_SOURCES);
        } else {
            return room.find(FIND_MINERALS, {
                filter: mineral => mineral.mineralType === resourceType
            });
        }
    },

    getSourceContainers: (roomName, sources) => {
        const room = Game.rooms[roomName];
        if (!room) return [];

        return room.find(FIND_STRUCTURES, {
            filter: structure =>
                structure.structureType === STRUCTURE_CONTAINER &&
                sources.some(source =>
                    structure.pos.isNearTo(source)
                )
        });
    },

    // utils.js

    /**
     * Получает конфигурацию комнаты из DESIRED_COUNTS по имени комнаты
     * @param {string} roomName - Имя комнаты (например, 'E19S8')
     * @returns {object|null} Конфигурация комнаты или null, если не найдена
     */
    getRoomConfig: (roomName, desiredCount) => {
        const config = desiredCount.find(item => item.homeRoom === roomName);
        return config || null;
    },

    sortEnemiesByHealParts: (enemies, attackerPos) => {
        // 1. Фильтруем валидных врагов (убираем undefined/null)
        const validEnemies = enemies.filter(enemy => enemy && enemy.pos);

        // 2. Проверяем attackerPos
        if (!attackerPos || !attackerPos.isRoomPosition) {
            log('ERROR', 'Ошибка: attackerPos не является RoomPosition', 'System');
            return validEnemies; // возвращаем без сортировки по дистанции
        }

        return validEnemies.sort((a, b) => {
            // 3. Считаем количество HEAL-частей
            const healA = a.body.filter(p => p.type === HEAL).length;
            const healB = b.body.filter(p => p.type === HEAL).length;

            if (healA !== healB) {
                return healB - healA; // приоритет: больше HEAL → выше
            }

            // 4. Если HEAL одинаково — сортируем по дистанции
            const distA = attackerPos.getRangeTo(a.pos);
            const distB = attackerPos.getRangeTo(b.pos);

            return distA - distB;
        });
    },

    // 🔧 Функция сортировки врагов по приоритету
    sortEnemiesByPriority: (enemies) => {
        return enemies.sort((a, b) => {
            // Приоритет 1: крипы с HEAL
            const hasHealA = a.body.some(part => part.type === HEAL) || false;
            const hasHealB = b.body.some(part => part.type === HEAL) || false;
            if (hasHealA && !hasHealB) return -1;
            if (!hasHealA && hasHealB) return 1;

            // Приоритет 2: крипы с RANGED_ATTACK или ATTACK
            const hasAttackA = a.body.some(part =>
                part.type === RANGED_ATTACK || part.type === ATTACK) || false;
            const hasAttackB = b.body.some(part =>
                part.type === RANGED_ATTACK || part.type === ATTACK) || false;
            if (hasAttackA && !hasAttackB) return -1;
            if (!hasAttackA && hasAttackB) return 1;

            // Приоритет 3: крипы с CLAIM
            const hasClaimA = a.body.some(part => part.type === CLAIM) || false;
            const hasClaimB = b.body.some(part => part.type === CLAIM) || false;
            if (hasClaimA && !hasClaimB) return -1;
            if (!hasClaimA && hasClaimB) return 1;

            // Приоритет 4: структуры (у них нет body, поэтому проверяем тип)
            const isStructureA = !a.body;
            const isStructureB = !b.body;
            if (isStructureA && !isStructureB) {
                // Если оба — структуры, сортируем по HP (сначала более опасные/крупные)
                return b.hits - a.hits;
            }
            if (isStructureA) return 1;  // структуры ниже крипов
            if (isStructureB) return -1; // структуры ниже крипов

            // Если все проверки не дали результата — считаем равными
            return 0;
        });
    },
    
    // Export logging functions
    log,
    setLogLevel,
    setLogLevels,
    getLogLevels,
    LOG_LEVELS
};