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
        const targetRoomName = 'E19N1';


        // Инициализация памяти
        if (!creep.memory.targetRoom) {
            creep.memory.targetRoom = creep.room.name;
        }
        if (!creep.memory.state) {
            creep.memory.state = 'claim';
        }

        // const targetRoom = targetRoomName;

        // -- отправить в комнату --
        // const targetRoomName = creep.memory.homeRoom == 'E19S8' ? 'E18S8' : creep.memory.homeRoom; // целевая комната
        // // Запоминаем целевую комнату в памяти, чтобы не задавать каждый раз
        if (!creep.memory.targetRoom) {
            creep.memory.targetRoom = targetRoomName;
        }

        // if (creep.memory.targetRoom !== targetRoomName) {
        //     creep.memory.targetRoom = targetRoomName;
        // }

        const targetRoom = creep.memory.targetRoom;

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
            console.log(`${creep.name}: Комната ${targetRoom} не разрешена для claimer. Прекращаем действия.`);
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

        // 6. Устанавливаем/обновляем подпись комнаты
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
        //             console.log(`${creep.name} движется к контроллеру для установки подписи`);
        //         } else {
        //             console.log(`Ошибка при установке подписи: ${signResult}`);
        //         }
        //     }
        // }


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

        // 8. Попытка зарезервировать контроллер
        if ([ERR_GCL_NOT_ENOUGH, ERR_INVALID_TARGET].includes(claimResult)) {
            const reserveResult = creep.reserveController(controller);
            
            if (reserveResult === OK) {
                console.log(`${creep.name} обновил/установил резерв контроллера в ${targetRoom}`);
                // Тут не делайте return, чтобы продолжить в следующий тик
            } else if (reserveResult === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { visualizePathStyle: { stroke: '#00ff00' } });
                // Не делайте return, чтобы попытка повторилась снова
            } else {
                console.log(`${creep.name} не смог зарезервировать контроллер: ${reserveResult}`);
                // Аналогично, не делайте return, чтобы попытки продолжались
            }
            // Важно: не делайте return
        }

        // 9. Другие ошибки
        else {
            console.log(`${creep.name} ошибка при захвате: ${claimResult}`);
        }
    }
};
