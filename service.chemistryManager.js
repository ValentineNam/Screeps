/**
 * Minimal Chemistry Manager (Variant B starter)
 * Responsibilities:
 * - maintain Memory.chemistry tasks per room
 * - move excess base minerals from storage -> terminal (so they can be sent/traded)
 * - accept manual production requests via enqueueProduction(room, compound, amount, inputs)
 * - translate production requests into transfer tasks (deliver inputs to labs/terminal)
 *
 * This is intentionally lightweight: it handles staging and transfer tasks. Actual lab
 * reaction orchestration can be expanded later (lab.runReaction usage, cooldown handling, pairs).
 */

const CHEM_CONFIG = require('config.chemistry');

const ensureRoomMemory = (roomName) => {
    if (!Memory.chemistry) Memory.chemistry = { rooms: {} };
    if (!Memory.chemistry.rooms[roomName]) Memory.chemistry.rooms[roomName] = { tasks: [] };
    return Memory.chemistry.rooms[roomName];
};

const uid = (prefix) => (prefix || 't') + Game.time + '_' + Math.floor(Math.random()*10000);

module.exports = {
    enqueueProduction(roomName, compound, amount, inputs) {
        const roomMem = ensureRoomMemory(roomName);
        roomMem.tasks.push({
            id: uid('prod'),
            type: 'produce',
            compound,
            amount: amount || 0,
            inputs: inputs || {}, // object resource->amount
            status: 'pending',
            createdAt: Game.time
        });
        return true;
    },

    // run per room from main loop: stages transfer tasks and creates transfer tasks for produce
    run(roomName) {
        const room = Game.rooms[roomName];
        if (!room) {
            // not visible
            return;
        }
        // Only operate chemistry for owned rooms. If this room is not owned, remove any chemistry memory for it
        if (!room.controller || !room.controller.my) {
            if (Memory.chemistry && Memory.chemistry.rooms && Memory.chemistry.rooms[roomName]) {
                delete Memory.chemistry.rooms[roomName];
            }
            return;
        }
        const roomMem = ensureRoomMemory(roomName);

        // 1) Move surplus base minerals from storage to terminal (so they can be sent or used)
        try {
            const storage = room.storage;
            const terminal = room.terminal;
            if (storage && terminal) {
                CHEM_CONFIG.BASE_MINERALS.forEach(res => {
                    const have = (storage.store && storage.store[res]) || 0;
                    const keep = CHEM_CONFIG.DEFAULT_BASE_STOCK || DEFAULT_BASE_STOCK;
                    if (have > keep) {
                        const amount = have - keep;
                        // push a transfer task if not already present for same resource
                        const exists = roomMem.tasks.some(t => t.type === 'transfer' && t.resource === res && t.from === 'storage' && t.to === 'terminal' && (t.status === 'pending' || t.status === 'assigned'));
                        if (!exists) {
                            roomMem.tasks.push({
                                id: uid('tr'),
                                type: 'transfer',
                                resource: res,
                                amount: amount,
                                from: 'storage',
                                to: 'terminal',
                                status: 'pending',
                                createdAt: Game.time
                            });
                        }
                    }
                });
            }
        } catch (e) { /* ignore visibility issues */ }

        // 2) Translate produce tasks into transfer tasks for inputs (simple staging)
        roomMem.tasks.filter(t => t.type === 'produce' && t.status === 'pending').forEach(prod => {
            // check inputs presence in storage or terminal
            const inputs = prod.inputs || {};
            const needTasks = [];
            Object.keys(inputs).forEach(res => {
                const need = inputs[res] * prod.amount;
                // create a transfer task to move from storage -> terminal (or to 'lab' later)
                needTasks.push({
                    id: uid('tr'),
                    type: 'transfer',
                    resource: res,
                    amount: need,
                    from: 'storage',
                    to: 'terminal',
                    status: 'pending',
                    meta: { forProduction: prod.id }
                });
            });
            // mark produce task as staged and append transfer subtasks
            if (needTasks.length) {
                prod.status = 'staged';
                prod.stagedAt = Game.time;
                roomMem.tasks.push(...needTasks);
            } else {
                // no inputs specified -> mark as failed
                prod.status = 'failed';
                prod.failedReason = 'no_inputs';
            }
        });
        
        // 2.5) Check staged production tasks and mark them as ready_for_lab if transfer tasks are complete
        roomMem.tasks.filter(t => t.type === 'produce' && t.status === 'staged').forEach(prod => {
            // check if all transfer subtasks referencing this production id are done
            const subtasks = roomMem.tasks.filter(t => t.meta && t.meta.forProduction === prod.id && t.type === 'transfer');
            const allDone = subtasks.length > 0 && subtasks.every(s => s.status === 'done');
            if (allDone) {
                // mark produce as ready_for_lab
                prod.status = 'ready_for_lab';
                prod.readyAt = Game.time;
            }
        });

        // 3) Prune old completed tasks (keep simple)
        roomMem.tasks = roomMem.tasks.filter(t => {
            if (!t || !t.status) return false;
            if (t.status === 'done') return false;
            if (t.status === 'failed' && (Game.time - (t.createdAt || Game.time)) > 1000) return false;
            return true;
        });

            // 3.5) Execute any pending terminal_send tasks from this room (perform terminal.send)
            roomMem.tasks.filter(t => t.type === 'terminal_send' && t.status === 'pending').forEach(task => {
                const terminal = room.terminal;
                if (!terminal) {
                    task.status = 'failed';
                    task.failedReason = 'no_terminal';
                    return;
                }
                const have = terminal.store && terminal.store[task.resource] ? terminal.store[task.resource] : 0;
                if (have < task.amount) {
                    // not enough resource in terminal to send now
                    return;
                }
                // attempt to send
                const res = terminal.send(task.resource, task.amount, task.toRoom);
                if (res === OK) {
                    task.status = 'done';
                    task.doneAt = Game.time;
                } else {
                    task.lastError = res;
                    // if terminal cooldown or other transient error, leave pending
                    if ([ERR_TIRED, ERR_NOT_ENOUGH_RESOURCES, ERR_INVALID_ARGS].includes(res)) {
                        // leave for next tick
                    } else {
                        task.status = 'failed';
                        task.failedReason = res;
                    }
                }
            });
            
        // 4) Handle movement of resources from terminal to labs for ready reactions
        this.handleLabTransfers(roomName);
    },

    // Simple helper to list pending tasks for a room
    getPendingTasks(roomName) {
        if (!Memory.chemistry || !Memory.chemistry.rooms || !Memory.chemistry.rooms[roomName]) return [];
        return (Memory.chemistry.rooms[roomName].tasks || []).filter(t => t.status === 'pending');
    }
    ,
    // return lab structures in the room (array of StructureLab)
    findLabs(roomName) {
        const room = Game.rooms[roomName];
        if (!room) return [];
        return room.find(FIND_MY_STRUCTURES, { filter: s => s.structureType === STRUCTURE_LAB });
    },

    // create transfer task to move resource from terminal -> specific lab (labId)
    addLabTransfer(roomName, labId, resource, amount, forProductionId) {
        const roomMem = ensureRoomMemory(roomName);
        roomMem.tasks.push({
            id: uid('tr'),
            type: 'transfer',
            resource,
            amount,
            from: 'terminal',
            to: 'lab:' + labId,
            status: 'pending',
            createdAt: Game.time,
            meta: { forProduction: forProductionId }
        });
    },

    // Check if a room has labs and can produce compounds
    canProduce(roomName) {
        const labs = this.findLabs(roomName);
        return labs.length >= 3; // Need at least 3 labs for reactions
    },

    // Get available labs in a room (not currently used for reactions)
    getAvailableLabs(roomName) {
        const room = Game.rooms[roomName];
        if (!room) return [];
        
        const allLabs = this.findLabs(roomName);
        // Filter out labs that are already involved in reactions or have cooldown
        // Labs are available if they have no mineral type (empty) or have no cooldown (ready to work)
        return allLabs.filter(lab => (lab.mineralType === null && lab.mineralAmount === 0) || lab.cooldown === 0);
    },

    // Schedule production based on target stocks
    scheduleProductionFromTargets() {
        for (const roomName in CHEM_CONFIG.TARGET_STOCKS) {
            const targets = CHEM_CONFIG.TARGET_STOCKS[roomName];
            const room = Game.rooms[roomName];
            
            if (!room || !room.terminal || !this.canProduce(roomName)) {
                continue;
            }

            for (const compound in targets) {
                const targetAmount = targets[compound];
                
                // Check current amount in storage and terminal
                const currentInTerminal = room.terminal.store[compound] || 0;
                const currentInStorage = room.storage ? (room.storage.store[compound] || 0) : 0;
                const currentTotal = currentInTerminal + currentInStorage;
                
                if (currentTotal < targetAmount) {
                    const needToProduce = targetAmount - currentTotal;
                    
                    // Check if we have the recipe
                    const recipe = CHEM_CONFIG.RECIPES[compound];
                    if (recipe && recipe.inputs) {
                        // Check if we have enough base resources
                        let hasEnoughResources = true;
                        
                        for (const inputResource in recipe.inputs) {
                            const neededAmount = recipe.inputs[inputResource] * needToProduce;
                            const inputInTerminal = room.terminal.store[inputResource] || 0;
                            const inputInStorage = room.storage ? (room.storage.store[inputResource] || 0) : 0;
                            const totalInput = inputInTerminal + inputInStorage;
                            if (totalInput < neededAmount) {
                                hasEnoughResources = false;
                                break;
                            }
                        }
                   
                        if (hasEnoughResources) {

                            // Schedule production
                            this.enqueueProduction(roomName, compound, needToProduce, recipe.inputs);
                        }
                    }
                }
            }
        }
    },

    // Process ready_for_lab tasks and initiate lab reactions
    processReadyReactions(roomName) {
        const room = Game.rooms[roomName];
        if (!room) return;

        const roomMem = ensureRoomMemory(roomName);
        if (!roomMem || !roomMem.tasks) return;

        // Find ready_for_lab tasks
        const readyTasks = roomMem.tasks.filter(t => t.type === 'produce' && t.status === 'ready_for_lab');
        for (const task of readyTasks) {
            const compound = task.compound;
            const recipe = CHEM_CONFIG.RECIPES[compound];
            
            if (!recipe || !recipe.inputs) {
                task.status = 'failed';
                task.failedReason = 'no_recipe';
                continue;
            }

            // Get available labs
            const availableLabs = this.getAvailableLabs(roomName);
            if (availableLabs.length < 3) {
                // Not enough labs available, skip for now
                continue;
            }
       
            // Try to find input labs and output lab
            const inputLabs = availableLabs.slice(0, 2); // First 2 labs for inputs
            const outputLab = availableLabs[2]; // 3rd lab for output

            // Check if input labs have the required resources
            const inputResources = Object.keys(recipe.inputs);
            if (inputResources.length >= 2) {
                const input1 = inputResources[0];
                const input2 = inputResources[1];
                const amount1 = recipe.inputs[input1];
                const amount2 = recipe.inputs[input2];

                // Check if input labs have the right resources or are empty and can be filled
                const lab1Ok = (inputLabs[0].mineralType === input1 && inputLabs[0].mineralAmount >= amount1) ||
                              (inputLabs[0].mineralType === null && inputLabs[0].mineralAmount === 0);
                const lab2Ok = (inputLabs[1].mineralType === input2 && inputLabs[1].mineralAmount >= amount2) ||
                              (inputLabs[1].mineralType === null && inputLabs[1].mineralAmount === 0);

                if (lab1Ok && lab2Ok) {
                    // Perform the reaction
                    const result1 = inputLabs[0].runReaction(inputLabs[1], outputLab);
                    if (result1 === OK) {
                        task.status = 'in_progress';
                        task.startedAt = Game.time;
                        
                        // Mark these labs as busy by updating their status in memory if needed
                        // In Screeps, labs automatically become busy when running reactions
                    } else {
                        // Could not start reaction, mark as pending
                        task.status = 'ready_for_lab';
                    }
                }
            } else if (inputResources.length === 1) {
                // Special case for reactions that require only one input (like X + X -> Y)
                const input1 = inputResources[0];
                const amount1 = recipe.inputs[input1];
                
                // Check if both input labs have the same resource
                const lab1Ok = (inputLabs[0].mineralType === input1 && inputLabs[0].mineralAmount >= amount1) ||
                              (inputLabs[0].mineralType === null && inputLabs[0].mineralAmount === 0);
                const lab2Ok = (inputLabs[1].mineralType === input1 && inputLabs[1].mineralAmount >= amount1) ||
                              (inputLabs[1].mineralType === null && inputLabs[1].mineralAmount === 0);

                if (lab1Ok && lab2Ok) {
                    // Perform the reaction with same input
                    const result1 = inputLabs[0].runReaction(inputLabs[1], outputLab);
                    if (result1 === OK) {
                        task.status = 'in_progress';
                        task.startedAt = Game.time;
                    } else {
                        task.status = 'ready_for_lab';
                    }
                }
            }
        }
    },
    
    // schedule a terminal -> terminal send task (terminal.send)
    addTerminalSend(roomName, toRoom, resource, amount) {
        const roomMem = ensureRoomMemory(roomName);
        roomMem.tasks.push({
            id: uid('ts'),
            type: 'terminal_send',
            resource,
            amount,
            toRoom,
            status: 'pending',
            createdAt: Game.time
        });
    },

    // Distribute surplus resources between terminals across visible rooms
    distributeTerminals() {
        const pack = (CHEM_CONFIG.DEFAULT_SEND_PACK) ? CHEM_CONFIG.DEFAULT_SEND_PACK : 1000;
        // gather terminals with stocks
        // Only consider terminals in rooms you own
        const terminals = Object.values(Game.rooms)
            .filter(r => r.controller && r.controller.my)
            .map(r => r.terminal)
            .filter(t => t);
        if (!terminals || terminals.length === 0) return;

        // build map room->resource->amount
        const roomStocks = {};
        terminals.forEach(t => {
            if (!t) return;
            const rn = t.room.name;
            roomStocks[rn] = roomStocks[rn] || {};
            Object.keys(t.store || {}).forEach(res => {
                roomStocks[rn][res] = (roomStocks[rn][res] || 0) + (t.store[res] || 0);
            });
        });

        // for each resource in base minerals or present in any terminal, find donors and receivers
        const resources = new Set(CHEM_CONFIG.BASE_MINERALS.concat([]));
        terminals.forEach(t => Object.keys(t.store || {}).forEach(r => resources.add(r)));

        resources.forEach(res => {
            // list donor rooms with surplus > pack
            const donors = Object.keys(roomStocks).filter(rn => (roomStocks[rn][res] || 0) > (CHEM_CONFIG.DEFAULT_BASE_STOCK || 5000) + pack);
            if (donors.length === 0) return;
            // list receivers: rooms that have target compounds using this resource and currently have stock < DEFAULT_BASE_STOCK
            const receivers = Object.keys(roomStocks).filter(rn => {
                const current = (roomStocks[rn][res] || 0);
                const desiredMin = CHEM_CONFIG.DEFAULT_BASE_STOCK || 5000;
                // check if this room has target compounds needing this base resource
                const targets = (CHEM_CONFIG.TARGET_STOCKS && CHEM_CONFIG.TARGET_STOCKS[rn]) ? CHEM_CONFIG.TARGET_STOCKS[rn] : null;
                let roomNeeds = false;
                if (targets) {
                    Object.keys(targets).forEach(comp => {
                        const recipe = (CHEM_CONFIG.RECIPES && CHEM_CONFIG.RECIPES[comp]) ? CHEM_CONFIG.RECIPES[comp] : null;
                        if (recipe && recipe.inputs && Object.keys(recipe.inputs).indexOf(res) !== -1) {
                            roomNeeds = true;
                        }
                    });
                }
                return roomNeeds && current < desiredMin;
            });
            if (receivers.length === 0) return;

            // sort receivers by ascending stock
            receivers.sort((a,b) => (roomStocks[a][res] || 0) - (roomStocks[b][res] || 0));

            donors.forEach(dn => {
                let available = (roomStocks[dn][res] || 0) - (CHEM_CONFIG.DEFAULT_BASE_STOCK || 5000);
                while (available >= pack && receivers.length > 0) {
                    const target = receivers.shift();
                    // create send task on donor room
                    this.addTerminalSend(dn, target, res, pack);
                    available -= pack;
                    roomStocks[dn][res] -= pack;
                    roomStocks[target][res] = (roomStocks[target][res] || 0) + pack;
                }
            });
        });
    },
    
    // Handle movement of resources from terminal to labs for ready reactions
    handleLabTransfers(roomName) {
        const room = Game.rooms[roomName];
        if (!room || !room.terminal) return;
        
        const roomMem = ensureRoomMemory(roomName);
        if (!roomMem || !roomMem.tasks) return;
        
        // Find ready_for_lab tasks that need resources moved to labs
        const readyTasks = roomMem.tasks.filter(t => t.type === 'produce' && t.status === 'ready_for_lab');
        
        for (const task of readyTasks) {
            const recipe = CHEM_CONFIG.RECIPES[task.compound];
            if (!recipe || !recipe.inputs) continue;
            
            // Get available labs
            const availableLabs = this.getAvailableLabs(roomName);
            if (availableLabs.length < 3) continue; // Need at least 3 labs for reaction
            
            // Assign input labs for the reaction
            const inputLabs = availableLabs.slice(0, 2); // First 2 labs for inputs
            const outputLab = availableLabs[2]; // 3rd lab for output
            
            // Check if input labs are empty or have the right resources
            const inputResources = Object.keys(recipe.inputs);
            if (inputResources.length >= 2) {
                const input1 = inputResources[0];
                const input2 = inputResources[1];
                const amount1 = recipe.inputs[input1];
                const amount2 = recipe.inputs[input2];
                
                // Check if labs have correct resources or are empty
                if ((inputLabs[0].mineralType === input1 || inputLabs[0].mineralType === null) &&
                    (inputLabs[1].mineralType === input2 || inputLabs[1].mineralType === null)) {
                    
                    // Check if terminal has the required resources
                    const terminal = room.terminal;
                    const hasInput1 = (terminal.store[input1] || 0) >= amount1;
                    const hasInput2 = (terminal.store[input2] || 0) >= amount2;
                    
                    if (hasInput1 && hasInput2) {
                        // Create transfer tasks to move resources to labs if needed
                        const needsTransfer1 = inputLabs[0].mineralType !== input1 || inputLabs[0].mineralAmount < amount1;
                        const needsTransfer2 = inputLabs[1].mineralType !== input2 || inputLabs[1].mineralAmount < amount2;
                        
                        if (needsTransfer1) {
                            // Check if a transfer task for this lab doesn't already exist
                            const existingTask1 = roomMem.tasks.some(t =>
                                t.type === 'transfer' &&
                                t.to === 'lab:' + inputLabs[0].id &&
                                t.resource === input1
                            );
                            if (!existingTask1) {
                                this.addLabTransfer(roomName, inputLabs[0].id, input1, amount1, task.id);
                            }
                        }
                        
                        if (needsTransfer2) {
                            // Check if a transfer task for this lab doesn't already exist
                            const existingTask2 = roomMem.tasks.some(t =>
                                t.type === 'transfer' &&
                                t.to === 'lab:' + inputLabs[1].id &&
                                t.resource === input2
                            );
                            if (!existingTask2) {
                                this.addLabTransfer(roomName, inputLabs[1].id, input2, amount2, task.id);
                            }
                        }
                    }
                }
            }
        }
    }
};
