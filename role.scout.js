const utils = require('./utils');
const { log } = utils;

// const SCAN_ROOMS = ['E17S7', 'E17S8', 'E18S8', 'E18S7', 'E19S7', 'E19S8', 'E19S9', 'E18S6', 'E19S6'];
// const SCAN_ROOMS = ['E19N1', 'E17N1', 'E17N2', 'E17N3', 'E16N2', 'E15N2', 'E13N1', 'E13N2', 'E14N3', 'E15N3', 'E13N3', 'E13N4', 'E13N5', 'E13N3', 'E13S1'];
const SCAN_ROOMS = ['E19S8', 'E17S7', 'E17S5', 'E19S4', 'E19S5', 'E19S6', 'E18S6'];

module.exports = {
    run: (creep) => {
        // 1. Инициализация памяти
        if (!creep.memory.scanIndex) creep.memory.scanIndex = 0;
        if (!creep.memory.state) creep.memory.state = 'moving';

        const state = creep.memory.state;
        const currentIndex = creep.memory.scanIndex;
        const targetRoomName = SCAN_ROOMS[currentIndex];
        const targetRoom = Game.rooms[targetRoomName];


        // Функция для получения случайного сообщения из массива
        function getRandomSignText(creep, controller) {
            if (!controller) {
                // Если контроллера нет, возвращаем стандартное сообщение
                return `${creep.name} was here!`;
            }
            
            // Если я контролирую комнату (являюсь владельцем)
            if (controller.my) {
                const ownedMessages = [
                    "This is the WAY!",
                    "Praise the Sun!",
                    "Beware of Trees!"
                ];
                return ownedMessages[Math.floor(Math.random() * ownedMessages.length)];
            }
            // Если контроллер зарезервирован кем-то
            else if (controller.reservation) {
                const reserverName = controller.reservation.username;
                const reservedMessages = [
                    `Hello, ${reserverName}!`,
                    "Reserved, but not signed yet.",
                    "This is the WAY!",
                    "Love is - you signed his/her room..."
                ];
                return reservedMessages[Math.floor(Math.random() * reservedMessages.length)];
            }
            // Если контроллер захвачен кем-то
            else if (controller.owner) {
                const claimedMessages = [
                    "Achievement unlocked: signed claimed controller",
                    "I come in peace!",
                    "Spies everywhere!"
                ];
                return claimedMessages[Math.floor(Math.random() * claimedMessages.length)];
            }
            // Если контроллер никем не контролируется
            else {
                const uncontrolledMessages = [
                    "Need more signs!",
                    "This is the WAY!",
                    `${creep.name} was here!`,
                    "Your ad could be here...",
                    "The best way to explain is to do it yourself.",
                    "Anything said three times becomes true."
                ];
                return uncontrolledMessages[Math.floor(Math.random() * uncontrolledMessages.length)];
            }
        }
        
        const SIGN_TEXT = targetRoom ? getRandomSignText(creep, targetRoom.controller) : `${creep.name} was here!`;


        // 2. Если комната недоступна — идём к границе
        if (!targetRoom && targetRoomName) {
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
        
        // Защита от застревания на границе комнаты
        const { x, y } = creep.pos;
        if (x === 0 || x === 49 || y === 0 || y === 49) {
            const centerPos = new RoomPosition(25, 25, creep.room.name);
            creep.moveTo(centerPos, {
                maxRooms: 1,
                reusePath: 5,
                visualizePathStyle: { stroke: '#ffff00' }
            });
            return;
        }

        // 3. Проверка контроллера
        if (!targetRoom || !targetRoom.controller) {
            log('WARN', `cannot sign ${targetRoomName}: no controller`, creep);
            creep.memory.state = 'moving';
            creep.memory.scanIndex++;
            return;
        }

        // 4. Проверка прав доступа
        if (targetRoom.controller && targetRoom.controller.my === false && targetRoom.controller.owner) {
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
                    log('WARN', `cannot find path to ${targetRoomName}. Switching to next room.`, creep);
                    creep.memory.scanIndex++;
                } else if (moveResult === ERR_NOT_FOUND) {
                    log('WARN', `target position not found in ${targetRoomName}. Switching to next room.`, creep);
                    creep.memory.scanIndex++;
                } else {
                    log('ERROR', `moveTo failed with code ${moveResult}. Switching to next room.`, creep);
                    creep.memory.scanIndex++;
                }
                return;
            }

            // 5.2. Проверяем расстояние до контроллера
            const controller = targetRoom.controller;
            const distance = creep.pos.getRangeTo(controller);
            
            if (distance > 1) {
                log('INFO', `is ${distance} tiles away from controller in ${targetRoomName}. Moving closer.`, creep);
                const moveResult = creep.moveTo(controller, {
                    visualizePathStyle: { stroke: '#ff00ff' },
                    range: 1,
                    reusePath: 5,
                    maxRooms: 1,
                    swampCost: 5,  // Reduce swamp cost to make movement through swamps more favorable
                    plainCost: 2   // Keep plain cost higher to maintain reasonable pathfinding
                });
                
                if (moveResult !== OK) {
                    log('WARN', `cannot move closer to controller: ${moveResult}`, creep);
                    // If we can't move to the controller after trying, increment scanIndex to move to next room
                    creep.memory.scanIndex++;
                    return;
                }
                return;
            }

            // 5.3. Пробуем подписать
            let result = ERR_NOT_FOUND;
            if (targetRoom.controller) {
                result = creep.signController(targetRoom.controller, SIGN_TEXT);
            }

            if (result === OK) {
                log('INFO', `marked ${targetRoomName} with signature: "${SIGN_TEXT}"`, creep);
                creep.memory.state = 'moving';
                creep.memory.scanIndex++;
                creep.say('signed!');
            }
            else if (result === ERR_BUSY) {
                let signOwner = 'unknown';
                if (targetRoom.controller.sign) {
                    signOwner = targetRoom.controller.sign.username;
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