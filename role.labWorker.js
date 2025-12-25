/**
 * role.labWorker.js
 * Lab worker: manages chemical reactions in the laboratory
 * This role handles moving resources from terminal to labs and running reactions
 */

module.exports = {
    // Main run function that orchestrates everything
    run: function(creep) {
        const roomName = creep.room.name;
        if (!Memory.chemistry || !Memory.chemistry.rooms || !Memory.chemistry.rooms[roomName]) return;
        const roomMem = Memory.chemistry.rooms[roomName];
        const tasks = roomMem.tasks;
        if (!tasks || !tasks.length) return;

        // First, try to process ready reactions if creep is in a room with labs
        this.processReadyReactions(roomName);

        // Check if creep has a current task
        if (!creep.memory.task) {
            // Look for a transfer task to handle
            const transferTask = tasks.find(t =>
                t.type === 'transfer' &&
                t.status === 'pending' &&
                (t.to.startsWith('lab:') || t.to === 'terminal' || t.to === 'storage')
            );
            
            if (transferTask) {
                creep.memory.task = transferTask.id;
            } else {
                // Look for a staged produce task that has its transfer subtasks done
                const produce = tasks.find(t => t.type === 'produce' && t.status === 'staged');
                if (produce) {
                    // check if all transfer subtasks referencing this production id are done
                    const subtasks = tasks.filter(t => t.meta && t.meta.forProduction === produce.id && t.type === 'transfer');
                    const allDone = subtasks.length > 0 && subtasks.every(s => s.status === 'done');
                    if (allDone) {
                        // mark produce as ready_for_lab
                        produce.status = 'ready_for_lab';
                        produce.readyAt = Game.time;
                    }
                }
                return; // No task to handle right now
            }
        }

        // Execute the current task
        const task = tasks.find(t => t.id === creep.memory.task);
        if (!task) {
            delete creep.memory.task;
            return;
        }

        // Handle transfer task
        if (task.type === 'transfer') {
            this.handleTransferTask(creep, task, roomMem);
        }
    },
    
    // Process ready_for_lab tasks and initiate lab reactions
    processReadyReactions: function(roomName) {
        const room = Game.rooms[roomName];
        if (!room) return;
        
        if (!Memory.chemistry || !Memory.chemistry.rooms || !Memory.chemistry.rooms[roomName]) return;
        const roomMem = Memory.chemistry.rooms[roomName];
        const tasks = roomMem.tasks;
        if (!tasks || !tasks.length) return;
        
        // Find ready_for_lab tasks
        const readyTasks = tasks.filter(t => t.type === 'produce' && t.status === 'ready_for_lab');
        
        for (const task of readyTasks) {
            const compound = task.compound;
            const recipe = require('config.chemistry').RECIPES[compound];
            
            if (!recipe || !recipe.inputs) {
                task.status = 'failed';
                task.failedReason = 'no_recipe';
                continue;
            }
            
            // Get available labs in the room
            const labs = room.find(FIND_MY_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_LAB
            }).sort((a, b) => a.id.localeCompare(b.id)); // Sort to have consistent assignment
           
            if (labs.length >= 3) {
                const inputLab1 = labs[0];
                const inputLab2 = labs[1];
                const outputLab = labs[2];
                
                // Check if input labs have the required resources
                const inputResources = Object.keys(recipe.inputs);
                if (inputResources.length >= 2) {
                    const input1 = inputResources[0];
                    const input2 = inputResources[1];
                    const amount1 = recipe.inputs[input1];
                    const amount2 = recipe.inputs[input2];
                    
                    // Check if input labs have required resources
                    if (inputLab1.mineralType === input1 && inputLab1.mineralAmount >= amount1 &&
                        inputLab2.mineralType === input2 && inputLab2.mineralAmount >= amount2) {
                        
                        // Run the reaction
                        const reactionResult = inputLab1.runReaction(inputLab2, outputLab);
                        if (reactionResult === OK) {
                            task.status = 'in_progress';
                            task.startedAt = Game.time;
                        } else {
                            // Could not start reaction, keep in ready state
                            task.status = 'ready_for_lab';
                        }
                    }
                } else if (inputResources.length === 1) {
                    // Special case for reactions that require only one input (like X + X -> Y)
                    const input1 = inputResources[0];
                    const amount1 = recipe.inputs[input1];
                    
                    // Check if both input labs have the same resource
                    if (inputLab1.mineralType === input1 && inputLab1.mineralAmount >= amount1 &&
                        inputLab2.mineralType === input1 && inputLab2.mineralAmount >= amount1) {
                        
                        // Run the reaction with same input
                        const reactionResult = inputLab1.runReaction(inputLab2, outputLab);
                        if (reactionResult === OK) {
                            task.status = 'in_progress';
                            task.startedAt = Game.time;
                        } else {
                            task.status = 'ready_for_lab';
                        }
                    }
                }
            }
        }
    },

    handleTransferTask: function(creep, task, roomMem) {
        // Find the source and target structures
        let source, target;
        
        if (task.from === 'storage') {
            source = creep.room.storage;
        } else if (task.from === 'terminal') {
            source = creep.room.terminal;
        }
        
        if (task.to === 'terminal') {
            target = creep.room.terminal;
        } else if (task.to === 'storage') {
            target = creep.room.storage;
        } else if (task.to.startsWith('lab:')) {
            const labId = task.to.substring(4); // Remove 'lab:' prefix
            target = Game.getObjectById(labId);
        }

        // Check if we have the resource
        if (creep.store.getUsedCapacity(task.resource) === 0) {
            // Need to withdraw from source
            if (source && source.store && source.store[task.resource] && source.store[task.resource] > 0) {
                const result = creep.withdraw(source, task.resource, Math.min(task.amount, creep.store.getFreeCapacity()));
                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#ffffff'}});
                }
                return;
            }
        } else {
            // Need to deposit to target
            if (target) {
                const result = creep.transfer(target, task.resource);
                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
                } else if (result === OK) {
                    // Update task amount
                    task.amount -= creep.store[task.resource];
                    
                    if (task.amount <= 0) {
                        task.status = 'done';
                        task.doneAt = Game.time;
                        delete creep.memory.task;
                    } else {
                        // Need to get more resources
                        delete creep.memory.task;
                    }
                }
                return;
            }
        }
    }
};
