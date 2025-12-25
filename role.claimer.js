const baseRole = require('./role.base');
const constants = require('./config.constants');
const { log } = require('./utils');
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

function getHomeRooms() {
    return DESIRED_COUNTS.map(zone => zone.homeRoom).filter(room => room !== undefined);
}

module.exports = {
    run: (creep) => {
        // Инициализация памяти и валидация состояния
        if (!creep.memory.state) {
            creep.memory.state = 'claim';
        }
        baseRole.validateState(creep, ['claim'], 'claim');

        // Авто-возврат при низком HP
        if (baseRole.checkHealth(creep)) {
            baseRole.returnHome(creep, creep.memory.homeRoom);
            return;
        }
        if (baseRole.handleReturningHome(creep)) return;

        // Определяем целевую комнату: сначала память крипа, затем targetRoom из homeRoom (если задан), иначе текущая комната
        let targetRoom = creep.memory.targetRoom;
        if (!targetRoom) {
            targetRoom = creep.memory.homeRoom || creep.room.name;
            creep.memory.targetRoom = targetRoom;
        }

        // Если не в целевой комнате, перемещаемся туда
        if ((creep.room.name !== creep.memory.targetRoom) && creep.store.getUsedCapacity() == 0) {
            const targetPos = new RoomPosition(32, 19, creep.memory.targetRoom);
            creep.moveTo(targetPos, {visualizePathStyle: {stroke: '#ffaa00'}, range: 3});
            // creep.memory.attackCooldown = 2;
            return; // ждем прибытия
        }
        // -- отправить в комнату --

        // 1. Проверяем, разрешена ли комната
        if (!isAllowedClaimRoom(targetRoom)) {
            log('INFO', `Комната ${targetRoom} не разрешена для claimer. Прекращаем действия.`, creep);
            return;
        }

        // 2. Перемещение в целевую комнату
        if (creep.room.name !== targetRoom) {
            const targetPos = new RoomPosition(25, 25, targetRoom);
            creep.moveTo(targetPos, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // 3. Получаем контроллер
        const controller = creep.room.controller;
        if (!controller) {
            log('WARN', `В комнате ${creep.room.name} нет контроллера!`, creep.room.name);
            return;
        }

        // 4. Проверяем расстояние до контроллера
        if (creep.pos.getRangeTo(controller) > 1) {
            creep.moveTo(controller.pos, { visualizePathStyle: { stroke: '#ffffff' } });
            return;
        }

        // 5. Проверяем статус контроллера
        if (controller.owner) {
            log('INFO', `Контроллер в ${targetRoom} уже захвачен игроком: ${controller.owner.username}`, creep);
            return;
        }
        // if (controller.my || (controller.reservation && controller.reservation.username === creep.owner.username)) {
        //     const signText = `База: ${targetRoom} | Владелец: ${creep.owner.username}`;

        //     // Проверяем, есть ли уже подпись в комнате
        //     if (creep.room.sign) {
        //         // Если подпись есть, проверяем оставшееся время
        //         if (creep.room.sign.text !== signText || creep.room.sign.time < Game.time + 100) {
        //             const signResult = creep.room.sign.set(signText);
        //             if (signResult === OK) {
        //                 console.log(`Подпись обновлена в ${targetRoom}`);
        //             } else {
        //                 console.log(`Ошибка при обновлении подписи: ${signResult}`);
        //             }
        //         }
        //     } else {
        //         // Если подписи нет — пытаемся установить
        //         const signResult = creep.room.sign.set(signText);
        //         if (signResult === OK) {
        //             console.log(`Подпись установлена в ${targetRoom}`);
        //         } else if (signResult === ERR_NOT_IN_RANGE) {
        //             creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffff00' } });
        //             console.log(`движется к контроллеру для установки подписи`);
        //         } else {
        //             console.log(`Ошибка при установке подписи: ${signResult}`);
        //         }
        //     }
        // }


        // 7. Проверяем, является ли целевая комната homeRoom (комнатой захвата)
        const isHomeRoom = DESIRED_COUNTS.some(zone => zone.homeRoom === targetRoom);
        
        // Логируем состояние контроллера перед попыткой захвата
        if (controller) {
            log('DEBUG', `контроллер в комнате ${targetRoom} - owner: ${controller.owner ? controller.owner.username : 'none'}, my: ${controller.my}, level: ${controller.level}, ticksToDowngrade: ${controller.ticksToDowngrade}, reservation: ${controller.reservation ? controller.reservation.username : 'none'}`, creep);
        }
        
        // Если это homeRoom, то пытаемся захватить, но НЕ резервируем, если не можем захватить
        if (isHomeRoom) {
            const claimResult = creep.claimController(controller);
            
            if (claimResult === OK) {
                log('INFO', `успешно захватил комнату ${targetRoom}`, creep);
                return; // После захвата можно выйти
            }
            
            if (claimResult === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
                return;
            }
            
            // Если не удалось захватить (например, из-за GCL), НЕ резервируем, а логируем проблему
            if (claimResult === ERR_GCL_NOT_ENOUGH) {
                // Для захвата комнаты требуется GCL уровень, соответствующий количеству уже захваченных комнат + 1
                const ownedRoomsCount = Object.keys(Game.rooms).filter(roomName =>
                    Game.rooms[roomName].controller &&
                    Game.rooms[roomName].controller.my
                ).length;
                
                log('ERROR', `НЕДОСТАТОЧНО GCL для захвата комнаты ${targetRoom}. Текущий GCL: ${Game.gcl.level}, требуется: ${ownedRoomsCount + 1} (уже захвачено комнат: ${ownedRoomsCount})`, creep);
            } else if (claimResult === ERR_INVALID_TARGET) {
                log('WARN', `контроллер в комнате ${targetRoom} не может быть захвачен (возможно, уже принадлежит игроку или имеет недопустимое состояние)`, creep);
            } else if (claimResult === ERR_BUSY) {
                log('INFO', `контроллер в комнате ${targetRoom} занят (уже принадлежит кому-то)`, creep);
            } else {
                log('WARN', `не смог захватить комнату ${targetRoom} (claimResult=${claimResult}), это homeRoom, поэтому НЕ резервируем`, creep);
            }
            return;
        } else {
            // Для комнат, не являющихся homeRoom, пытаемся захватить, и если не удается, резервируем
            const claimResult = creep.claimController(controller);

            if (claimResult === OK) {
                log('INFO', `успешно захватил комнату ${targetRoom}`, creep);
                return; // После захвата можно выйти
            }

            if (claimResult === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
                return;
            }

            // Если не удалось захватить (по любой причине, например GCL), пробуем резервировать.
            const reserveResult = creep.reserveController(controller);
            if (reserveResult === OK) {
                log('INFO', `обновил/установил резерв контроллера в ${targetRoom} (reserve)`, creep);
                return;
            }

            if (reserveResult === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { visualizePathStyle: { stroke: '#00ff00' } });
                return;
            }

            // Другие случаи — логируем, но не останавливаем попытки в следующих тиках
            log('WARN', `не смог выполнить reserveController (claimResult=${claimResult}, reserveResult=${reserveResult})`, creep);
        }
    }
};
