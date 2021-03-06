"use strict";

/**
 * @type Chai.Assert
 */
var assert = require('chai').assert;
var Step = require('../../lib/flow/step')
var Checkpoint = require('../../lib/flow/checkpoint')


describe('Checkpoint @small', function () {

    describe('prerequisites', function() {
        it('Array has #find method', function() {
            assert.deepEqual([1].find(item => true), 1)
        })
    })

    describe('#toJSON', function() {
        it('returns object with name property and array of step ids', function() {
            assert.deepEqual(
                {id: 0, name: 'checkpointName', steps: []},
                new Checkpoint(0, 'checkpointName').toJSON()
            )
        })
    })

    describe('#fromJSON', function() {
        it('restores Checkpoint generated by #toJSON', function() {
            let checkpoint = new Checkpoint(1, 'checkpointName')

            assert.deepEqual(checkpoint, Checkpoint.fromJSON(checkpoint.toJSON()));
        })

        it('restores Checkpoint with steps generated by #toJSON', function() {
            let checkpoint = (new Checkpoint(1, 'checkpointName')).addSteps([new Step(0, [], null)])

            assert.deepEqual(checkpoint, Checkpoint.fromJSON(checkpoint.toJSON()));
        })
    })

    describe('#steps', function() {
        it('returns step objects', function() {
            /**
             * @type {Step[]}
             */
            var steps = [
                new Step(0, [], new Buffer([])),
                new Step(1, [], new Buffer([])),
                new Step(2, [], new Buffer([]))
            ]

            let checkpoint = (new Checkpoint(0, 'checkpoint')).addSteps(steps);

            assert.deepEqual(checkpoint.steps, steps);
        })
    })
})

