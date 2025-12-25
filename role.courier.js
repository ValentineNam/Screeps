/**
 * role.courier.js
 * Simple courier role: picks transfer tasks from Memory.chemistry and executes them.
 * Works with tasks of form: { type: 'transfer', resource, amount, from: 'storage'|'terminal'|'lab', to: 'terminal'|'lab'|'storage', status }
 */

const chemistry = require('service.chemistryManager');

module.exports = {
    run: function(creep) {
        const roomName = creep.room.name;
        if (!Memory.chemistry || !Memory.chemistry.rooms || !Memory.chemistry.rooms[roomName]) return;
        const tasks = Memory.chemistry.rooms[roomName].tasks;
        if (!tasks || !tasks.length) return;

        // find assigned or pending transfer task
        let task = tasks.find(t => t.type === 'transfer' && (t.status === 'assigned' && t.assignedTo === creep.name));
        if (!task) task = tasks.find(t => t.type === 'transfer' && t.status === 'pending');
        if (!task) return;

        // if taking a pending task, assign it
        if (task.status === 'pending') {
            task.status = 'assigned';
            task.assignedTo = creep.name;
        }

        const from = task.from;
        const to = task.to;
        const resource = task.resource;
        const amount = Math.min(task.amount || 0, creep.store.getFreeCapacity(resource) || creep.store.getFreeCapacity());

        // helper to get structure by role
        const getStruct = (role) => {
            if (role === 'storage') return creep.room.storage;
            if (role === 'terminal') return creep.room.terminal;
            // lab:<id> or lab index
            if (role && role.indexOf && role.indexOf('lab') === 0) {
                // role example: 'lab:ID'
                const parts = role.split(':');
                if (parts[1]) return Game.getObjectById(parts[1]);
            }
            return null;
        };

        const src = getStruct(from);
        const dst = getStruct(to);

        // If creep empty and source present -> withdraw
        if (_.sum(creep.store) === 0) {
            if (!src) {
                // can't find source -> fail task
                task.status = 'failed';
                task.failedReason = 'no_source';
                return;
            }
            // withdraw as much as possible
            const have = (src.store && src.store[resource]) || 0;
            const take = Math.min(have, creep.store.getFreeCapacity());
            if (take <= 0) {
                task.status = 'failed';
                task.failedReason = 'no_resource_at_source';
                return;
            }
            if (creep.withdraw(src, resource, take) === ERR_NOT_IN_RANGE) {
                creep.moveTo(src, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
            return;
        }

        // If creep has resource, deliver to destination
        if (!dst) {
            task.status = 'failed';
            task.failedReason = 'no_destination';
            return;
        }
        if (creep.transfer(dst, resource) === ERR_NOT_IN_RANGE) {
            creep.moveTo(dst, {visualizePathStyle: {stroke: '#00aaff'}});
            return;
        }

        // on success, reduce amount and mark done if depleted
        task.amount = Math.max(0, (task.amount || 0) - (_.sum(creep.store) || 0));
        // empty creep after transfer
        // (creep.transfer already moved carried resource)

        if (!task.amount || task.amount <= 0) {
            task.status = 'done';
            task.doneAt = Game.time;
        }
    }
};
