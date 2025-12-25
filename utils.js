module.exports = {
    findClosestSource: (creep) => {
        return creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    },

    findAvailableSource: (creep, resourceType = RESOURCE_ENERGY) => {
        const targetRoomName = creep.memory.targetRoom;
        const room = Game.rooms[targetRoomName];

        if (!room) {
            console.log(`[findAvailableSource] Room ${targetRoomName} not found`);
            return null;
        }

        if (!room.controller || !room.controller.my) {
            console.log(`[findAvailableSource] Room ${targetRoomName} not owned`);
            return null;
        }

        if (!resourceType) {
            console.log(`[findAvailableSource] resourceType not defined for creep ${creep.name}, defaulting to ENERGY`);
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
            console.log(`[findAvailableSource] No sources found for ${resourceType} in ${targetRoomName}`);
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
                // Возвращаем ближайшую цель
                return creep.pos.findClosestByPath(targets);
            }
        }
        return null; // целей нет
    },
    
        // Поиск приоритетных зданий для передачи ресурсов
    findTowers: (creep) => {
        if (!creep.room) return null; // защита от отсутствия комнаты
    
        const priorityTypes = [
            STRUCTURE_TOWER,
            STRUCTURE_SPAWN,
            STRUCTURE_EXTENSION,
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
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => 
                    structure.structureType === type && 
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (targets.length > 0) {
                const target = creep.pos.findClosestByPath(targets);
                if (target) {
                    console.log(`Target for energy transfer: ${target.structureType} at ${target.pos}`);
                    return target;
                }
                // Если target == null, можно попробовать следующий тип или вернуть null
            }
        }
        return null;
    },
    
    findPriorityConstructionSite: (room) => {
        // const priorities = [
        //     FIND_STRUCTURES, // например, для ремонта (если есть)
        //     FIND_CONSTRUCTION_SITES, // для новых построек
        // ];

        // Для определения типа целей по приоритетам
        // Можно расширить список, например, искать расширения, дороги, стенки и т.д.
        // Для этого лучше искать по конкретным типам объектов
        const priorityTypes = [
            STRUCTURE_SPAWN,
            STRUCTURE_EXTENSION,
            STRUCTURE_TOWER,
            STRUCTURE_CONTAINER,
            STRUCTURE_STORAGE,
            STRUCTURE_RAMPART,
            STRUCTURE_WALL,
            STRUCTURE_ROAD,
            STRUCTURE_LINK,
            STRUCTURE_FACTORY,
            STRUCTURE_LAB,
            STRUCTURE_OBSERVER,
            STRUCTURE_NUKER,
            STRUCTURE_POWER_SPAWN,
            STRUCTURE_EXTRACTOR,
            STRUCTURE_TERMINAL,
            STRUCTURE_PORTAL,
            // добавьте нужные типы
        ];

        for (let type of priorityTypes) {
            const target = room.find(FIND_CONSTRUCTION_SITES, {
                filter: (site) => site.structureType === type
            });
            if (target.length > 0) {
                return target[0]; // возвращаем первый найденный по приоритету
            }
        }

        // Если ничего не найдено, возвращаем null
        return null;
    },

    findPriorityRepairTarget: (room) => {
        // 1. Особые правила для дорог: ремонтируем в первую очередь при HP < 2000
        const weakRoads = room.find(FIND_STRUCTURES, {
            filter: (s) =>
                s.structureType === STRUCTURE_ROAD &&
                s.hits < 2000 &&
                s.hits < s.hitsMax
        });
        
        if (weakRoads.length > 0) {
            // Выбираем самую повреждённую дорогу (минимальный процент оставшегося HP)
            return _.min(weakRoads, (s) => s.hits / s.hitsMax);
        }

        // 2. Пороговые значения для других структур
        const repairThresholds = {
            [STRUCTURE_WALL]: 5000,
            [STRUCTURE_RAMPART]: 10000,
            [STRUCTURE_EXTENSION]: 20000,
            [STRUCTURE_TOWER]: 15000,
            // Можно добавить другие пороги по необходимости
        };

        // 3. Приоритетные типы структур (в порядке важности ремонта)
        const priorityTypes = [
            STRUCTURE_EXTENSION,
            STRUCTURE_TOWER,
            STRUCTURE_CONTAINER,
            STRUCTURE_STORAGE,
            STRUCTURE_FACTORY,
            STRUCTURE_LAB,
            STRUCTURE_LINK,
            STRUCTURE_NUKER,
            STRUCTURE_POWER_SPAWN,
            STRUCTURE_OBSERVER,
            STRUCTURE_EXTRACTOR,
            STRUCTURE_TERMINAL,
            STRUCTURE_PORTAL,
            STRUCTURE_RAMPART,
            STRUCTURE_WALL,
            STRUCTURE_ROAD, // уже обработана выше, но оставляем для полноты
        ];

        // 4. Поиск цели по приоритетам
        for (const type of priorityTypes) {
            const threshold = repairThresholds[type] || Infinity;
            
            const targets = room.find(FIND_STRUCTURES, {
                filter: (s) =>
                    s.structureType === type &&
                    s.hits < s.hitsMax &&
                    s.hits <= threshold
            });

            if (targets.length > 0) {
                // Выбираем наиболее повреждённую структуру (минимальный остаток HP)
                return _.min(targets, (s) => s.hits);
            }
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
        return _.filter(Game.creeps, creep => {
            if (creep.memory.role !== role) return false;
            if (creep.memory.homeRoom !== homeRoom) return false;
            if (targetRoom && creep.memory.targetRoom !== targetRoom) return false;
            
            if (opts.resourceType && creep.memory.resourceType !== opts.resourceType) {
                return false;
            }
            
            return true;
        }).length;
    },


    creepsSum: (roomName) => _.filter(Game.creeps, (creep) => creep.memory.homeRoom === roomName).length,

    findResourceAndContainerPositions: (creep) => {
        const room = creep.room;
        const validPositions = [];
        const sourceRange = 2; // радиус поиска контейнеров от источника

        // 1. Получаем все источники
        const sources = room.find(FIND_SOURCES);
        if (sources.length === 0) {
            console.log(`${creep.name}: No sources in ${room.name}`);
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
                    console.log(`Проверка клетки (${pos.x},${pos.y}) относительно контейнера (${container.pos.x},${container.pos.y})`);

                    const look = room.lookAt(pos);
                    let isBlocked = false;
                    let isOccupied = false;

                    for (const item of look) {
                        // Логировать каждый элемент для диагностики
                        if (item.type) {
                            console.log(`  Item type: ${item.type}${item.structure ? ', structureType=' + item.structure.structureType : ''}`);
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
                        console.log(`Подходящая позиция: (${pos.x},${pos.y}), расстояние до источника: ${pos.getRangeTo(source)}`);
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
            console.log(`Найдена позиция: ${validPositions[0].pos.x}, ${validPositions[0].pos.y}`);
        } else {
            console.log(`${creep.name}: Не удалось найти подходящие позиции.`);
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
        const room = Game.rooms[roomName];
        if (!room) return false;
        return room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        }).length > 0;
    },

    getThreatLevel: (roomName) => {
        const room = Game.rooms[roomName];
        if (!room) return 0;

        let threat = 0;
        threat += room.find(FIND_HOSTILE_CREEPS).length * 10;
        
        if (room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_INVADER_CORE
        }).length > 0) {
            threat += 100;
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
            console.log('Ошибка: attackerPos не является RoomPosition');
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
    }

};