const constants = require('./config.constants');
const DESIRED_COUNTS = constants.DESIRED_COUNTS;


function isAllowedClaimRoom(roomName) {
    for (const zone of DESIRED_COUNTS) {
        if (zone.homeRoom === roomName) return true;
        if (zone.remoteCreeps && zone.remoteCreeps.claimer && zone.remoteCreeps.claimer.rooms) {
            if (zone.remoteCreeps.claimer.rooms.includes(roomName)) {
                return true;
            }
        }
    }
    return false;
}

module.exports = {
    run: (creep) => {
        const targetRoomName = 'E17S5';

        // Инициализация памяти
        if (!creep.memory.targetRoom) creep.memory.targetRoom = targetRoomName;
        if (!creep.memory.enteredTargetRoom) creep.memory.enteredTargetRoom = false;

        const targetRoom = creep.memory.targetRoom;

        // Проверка доступности комнаты
        const roomStatus = Game.map.getRoomStatus(targetRoom);
        if (roomStatus.status === 'invalid' || roomStatus.status === 'closed') {
            console.log(`${creep.name}: Комната ${targetRoom} недоступна (статус: ${roomStatus.status})`);
            return;
        }


        // Этап 1: Вход в комнату (только если ещё не вошли)
        if (!creep.memory.enteredTargetRoom) {
            if (creep.room.name !== targetRoom) {
                const targetPos = new RoomPosition(25, 25, targetRoom);
                creep.moveTo(targetPos, {
                    maxRooms: 20,
                    reusePath: 10,
                    serializePath: true,
                    ignoreCreeps: true,
                    visualizePathStyle: { stroke: '#ffaa00' }
                });
                return;
            } else {
                // Успешно вошли в комнату
                creep.memory.enteredTargetRoom = true;
                console.log(`${creep.name}: Вошёл в комнату ${targetRoom}`);
            }
        }

        // Этап 2: Движение к контроллеру (уже внутри комнаты)
        if (creep.memory.enteredTargetRoom && creep.room.name === targetRoom) {
            const controller = creep.room.controller;
            if (!controller) {
                console.log(`В комнате ${creep.room.name} нет контроллера!`);
                return;
            }

            if (creep.pos.getRangeTo(controller) > 1) {
                creep.moveTo(controller, {
                    range: 1,
                    maxRooms: 1,          // Запрещаем выход из комнаты!
                    reusePath: 5,
                    ignoreCreeps: true,
                    visualizePathStyle: { stroke: '#ffffff' }
                });
            } else {
                // 3. Получаем контроллер
                const controller = creep.room.controller;
                if (!controller) {
                    console.log(`В комнате ${creep.room.name} нет контроллера!`);
                    return;
                }

                // 4. Проверяем расстояние до контроллера
                if (creep.pos.getRangeTo(controller) > 1) {
                    creep.moveTo(controller.pos, { visualizePathStyle: { stroke: '#ffffff' } });
                    return;
                }

                // 5. Проверяем статус контроллера
                if (controller.owner) {
                    console.log(`Контроллер в ${targetRoom} уже захвачен игроком: ${controller.owner.username}`);
                    return;
                }

                // 6. Устанавливаем/обновляем подпись комнаты (если мы владелец или есть резерв)
                if (controller.my || (controller.reservation && controller.reservation.username === creep.owner.username)) {
                    const signText = `База: ${targetRoom} | Владелец: ${creep.owner.username}`;
                    
                    // Обновляем подпись, если её нет или осталось меньше 100 тиков
                    if (!creep.room.sign || creep.room.sign.time < Game.time + 100) {
                        const signResult = creep.room.sign.set(signText);
                        if (signResult === OK) {
                            console.log(`Подпись обновлена в ${targetRoom}`);
                        } else {
                            console.log(`Ошибка при установке подписи: ${signResult}`);
                        }
                    }
                }

                // 7. Попытка захвата
                const claimResult = creep.claimController(controller);
                
                if (claimResult === OK) {
                    console.log(`${creep.name} успешно захватил комнату ${targetRoom}`);
                    return; // После захвата можно выйти
                }
                
                if (claimResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
                    return;
                }

                // 8. Если захват не удался — пробуем зарезервировать (на каждом тике!)
                if ([ERR_GCL_NOT_ENOUGH, ERR_INVALID_TARGET].includes(claimResult)) {
                    const reserveResult = creep.reserveController(controller);
                    
                    if (reserveResult === OK) {
                        console.log(`${creep.name} обновил/установил резерв контроллера в ${targetRoom}`);
                        // НЕ возвращаемся! Продолжаем цикл для повторного резервирования на следующем тике
                    } else if (reserveResult === ERR_NOT_IN_RANGE) {
                        creep.moveTo(controller, { visualizePathStyle: { stroke: '#00ff00' } });
                        return;
                    } else {
                        console.log(`${creep.name} не смог зарезервировать контроллер: ${reserveResult}`);
                    }
                    
                    // Важно: не ставим return здесь — чтобы продолжать попытки на каждом тике
                }

                // 9. Другие ошибки
                else {
                    console.log(`${creep.name} ошибка при захвате: ${claimResult}`);
                }
            }
        }
    }
};
