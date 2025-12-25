const SCAN_ROOMS = ['E17S7', 'E17S8', 'E16S8', 'E15S8', 'E14S8', 'E14S7', 'E15S7', 'E13S7', 'E13S8']; //'E19S8', 'E17S5', 'E17S4', 

module.exports = {
    run: (creep) => {
        // 1. Инициализация памяти
        if (!creep.memory.scanIndex) creep.memory.scanIndex = 0;
        if (!creep.memory.state) creep.memory.state = 'moving';

        const state = creep.memory.state;
        const currentIndex = creep.memory.scanIndex;
        const targetRoomName = SCAN_ROOMS[currentIndex];
        const targetRoom = Game.rooms[targetRoomName];


        const SIGN_TEXT = `Scout: ${creep.name} was here!`;


        // 2. Если комната недоступна — идём к границе
        if (!targetRoom) {
            const targetPos = new RoomPosition(25, 25, targetRoomName);
            const result = creep.moveTo(targetPos, {
                visualizePathStyle: { stroke: '#00ffff' },
                maxRooms: 50,
                reusePath: 5,
            });

            if (result === OK) {
                log('INFO', `moving to border of ${targetRoomName}`, creep);
            } else if (result === ERR_NO_PATH || result === ERR_NOT_FOUND) {
                log('WARN', `cannot reach ${targetRoomName}. Switching to next room.`, creep);
                creep.memory.scanIndex++;
            }
            return;
        }

        // 3. Проверка контроллера
        if (!targetRoom.controller) {
            log('WARN', `cannot sign ${targetRoomName}: no controller`, creep);
            creep.memory.state = 'moving';
            creep.memory.scanIndex++;
            return;
        }

        // 4. Проверка прав доступа
        if (targetRoom.controller.my === false && targetRoom.controller.owner) {
            log('WARN', `cannot sign ${targetRoomName}: controlled by ${targetRoom.controller.owner.username}`, creep);
            creep.memory.state = 'moving';
            creep.memory.scanIndex++;
            return;
        }

        // 5. Логика состояний
        if (state === 'moving') {
            creep.memory.state = 'signing';
            log('INFO', `attempting to mark ${targetRoomName}`, creep);
        }
        else if (state === 'signing') {
            // 5.1. Проверяем, что крип в нужной комнате
            if (creep.room.name !== targetRoomName) {
                log('WARN', `not in ${targetRoomName} (currently in ${creep.room.name}). Moving inside.`, creep);
                
                const entryPos = new RoomPosition(25, 25, targetRoomName);
                const moveResult = creep.moveTo(entryPos, {
                    visualizePathStyle: { stroke: '#ff9900' },
                    reusePath: 3,
                    maxRooms: 50,
                });

                if (moveResult === OK) {
                    log('INFO', `started moving to ${targetRoomName}`, creep);
                } else if (moveResult === ERR_NO_PATH) {
                    log('WARN', `cannot find path to ${targetRoomName}. Will retry.`, creep);
                } else if (moveResult === ERR_NOT_FOUND) {
                    log('WARN', `target position not found in ${targetRoomName}`, creep);
                } else {
                    log('ERROR', `moveTo failed with code ${moveResult}`, creep);
                }
                return;
            }

            // 5.2. Проверяем расстояние до контроллера
            const controller = targetRoom.controller;
            const distance = creep.pos.getRangeTo(controller);

            if (distance > 0) {
                log('INFO', `is ${distance} tiles away from controller in ${targetRoomName}. Moving closer.`, creep);
                const moveResult = creep.moveTo(controller, {
                    visualizePathStyle: { stroke: '#ff00ff' },
                    range: 0,
                    reusePath: 5,
                    maxRooms: 1
                });

                if (moveResult !== OK) {
                    log('WARN', `cannot move closer to controller: ${moveResult}`, creep);
                }
                return;
            }

            // 5.3. Пробуем подписать
            let result = ERR_NOT_FOUND;
            if (targetRoom.sign) {
                result = targetRoom.sign.set(SIGN_TEXT);
            }

            if (result === OK) {
                log('INFO', `marked ${targetRoomName} with signature: "${SIGN_TEXT}"`, creep);
                creep.memory.state = 'moving';
                creep.memory.scanIndex++;
            }
            else if (result === ERR_BUSY) {
                let signOwner = 'unknown';
                if (targetRoom.sign) {
                    signOwner = targetRoom.sign.username;
                }
                if (signOwner === Game.cpu.shard) {
                    log('INFO', `updating own signature in ${targetRoomName}`, creep);
                } else {
                    log('WARN', `skipping ${targetRoomName} (signed by ${signOwner})`, creep);
                }
                creep.memory.state = 'moving';
                creep.memory.scanIndex++;
            }
            else {
                log('WARN', `failed to sign ${targetRoomName}: ${result}. Distance: ${distance}. Controller pos: ${controller.pos}`, creep);
            }
        }

        // 6. Цикл обхода
        if (creep.memory.scanIndex >= SCAN_ROOMS.length) {
            creep.memory.scanIndex = 0;
            log('INFO', `completed full scan cycle. Restarting.`, creep);
        }
    }
};