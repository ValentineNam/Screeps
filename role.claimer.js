const baseRole = require('./role.base');
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
            console.log(`${creep.name}: Контроллер в ${targetRoom} уже захвачен игроком: ${controller.owner.username}`);
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
        //             console.log(`${creep.name} движется к контроллеру для установки подписи`);
        //         } else {
        //             console.log(`Ошибка при установке подписи: ${signResult}`);
        //         }
        //     }
        // }


        // 7. Попытка захвата — если не удаётся, обязательно пытаемся резервировать контроллер каждый тик,
        // чтобы поддерживать резерв непрерывно (не ждать, пока он закончится до 0)
        const claimResult = creep.claimController(controller);

        if (claimResult === OK) {
            console.log(`${creep.name} успешно захватил комнату ${targetRoom}`);
            return; // После захвата можно выйти
        }

        if (claimResult === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
            return;
        }

        // Если не удалось захватить (по любой причине, например GCL), пробуем резервировать.
        const reserveResult = creep.reserveController(controller);
        if (reserveResult === OK) {
            console.log(`${creep.name} обновил/установил резерв контроллера в ${targetRoom} (reserve)`);
            return;
        }

        if (reserveResult === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, { visualizePathStyle: { stroke: '#00ff00' } });
            return;
        }

        // Другие случаи — логируем, но не останавливаем попытки в следующих тиках
        console.log(`${creep.name}: не смог выполнить reserveController (claimResult=${claimResult}, reserveResult=${reserveResult})`);
    }
};
