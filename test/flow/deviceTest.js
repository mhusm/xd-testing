"use strict";

/**
 * @type Chai.Assert
 */
var assert = require('chai').assert;
var Device = require('../../lib/flow/device');
var Checkpoint = require('../../lib/flow/checkpoint');

describe('Device @small', function () {
    describe('#toJSON', function() {
        it('returns object with deviceOptions and checkpoints', function() {
            assert.deepEqual(
                {deviceOptions: {id: 'A'}, checkpoints: []},
                new Device({id: 'A'}).toJSON()
            )

            assert.equal(
                JSON.stringify({deviceOptions: {id: 'A'}, checkpoints: []}),
                JSON.stringify(new Device({id: 'A'}).toJSON())
            )
        })
    })

    describe('#fromJSON', function() {
        it('restores Device generated by #toJSON', function() {
            let device = new Device({id: 'A'})

            assert.deepEqual(device, Device.fromJSON(device.toJSON()));
        })

        it('restores Device with steps generated by #toJSON', function() {
            let device = new Device({id: 'A'}).addCheckpoints([new Checkpoint(0, 'name')])

            assert.deepEqual(device, Device.fromJSON(device.toJSON()));
        })
    })

    describe('#addStep', function() {
        // TODO write test
        it('adds the step to the unfinished checkpoint')
    })

    describe('#addCheckpoint', function() {
        // TODO write test
        it('adds the checkpoint to the checkpoints array')

        // TODO write test
        it('adds steps from the unfinished checkpoint to the given checkpoint')

        // TODO write test
        it('clears the steps from the unfinished checkpoint')
    })

})