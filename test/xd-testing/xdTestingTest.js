"use strict"

/**
 * @type {Chai.Assert}
 */
var assert = require('chai').assert
var xdTesting = require('../../lib/index')
var templates = require('../../lib/templates')
var Flow = require('../../lib/flow/flow')
var q = require('q')

describe('xdTesting', function() {

    let test = this
    test.fixture = {
        xd_gallery: {
            url: 'http://localhost:8082/gallery.html'
        },
        basic_app: {
            url: 'http://localhost:8090/'
        }
    }

    // Reset config
    beforeEach(xdTesting.reset)
    afterEach(xdTesting.reset)

    describe('#reset', () => {
        it('should set baseUrl to null', () => {
            xdTesting.baseUrl = 'http://localhost/'
            xdTesting.reset()
            assert.equal(xdTesting.baseUrl, null)
        })

        it('should set appFramework to null', () => {
            xdTesting.appFramework = xdTesting.adapter.xdmvc
            xdTesting.reset()
            assert.equal(xdTesting.appFramework, null)
        })

        it('should set waitForTimeout to 60s', () => {
            xdTesting.waitForTimeout = 0
            xdTesting.reset()
            assert.equal(xdTesting.waitForTimeout, 60 * 1000)
        })
    })

    describe('command arguments @large', function () {
        it('are part of a step\'s command name', function () {
            let scenario = {A: templates.devices.chrome()}
            return xdTesting.multiremote(scenario).init()
                .url(test.fixture.basic_app.url)
                .click('#button')
                .checkpoint('check')
                .getFlow().then(flow => {
                    let steps = flow.steps()
                    let stepCommandNames = steps.map(step => step.commands)
                        .filter(commands => commands.length > 0)
                    assert.lengthOf(stepCommandNames, 3)
                })
                .end()
        })
    })

    describe('#getFlow @large', function () {
        it('returns the flow object', function () {
            let scenario = {A: templates.devices.chrome()}
            return xdTesting.multiremote(scenario).init()
                .url(test.fixture.basic_app.url)
                .click('#button')
                .checkpoint('end')
                .getFlow().then(flow => {
                    assert.instanceOf(flow, Flow)
                    assert.property(flow, 'devices')
                    assert.deepPropertyVal(flow, 'devices.A.deviceId', 'A')
                })
                .end()

        })
    })


    describe('app framework integration', () => {

        it('should load xdTesting.baseUrl after init @large', () => {
            let options = {
                A: templates.devices.chrome()
            }

            xdTesting.baseUrl = 'http://localhost/'

            return xdTesting.multiremote(options).init()
                .getUrl().then(url => assert.equal(url, xdTesting.baseUrl))
                .end()
        })

        it('should not load xdTesting.baseUrl if it\'s not set @large', () => {
            let options = {
                A: templates.devices.chrome()
            }

            xdTesting.baseUrl = null

            return xdTesting.multiremote(options).init()
                .getUrl().then(url => assert.equal(url, 'data:,'))
                .end()
        })

        describe('for XD-MVC', () => {

            // Define a custom adapter
            beforeEach(() => {
                xdTesting.appFramework = xdTesting.adapter.xdmvc
            })

            it('app property has devices @medium', () => {
                let options = {
                    A: templates.devices.chrome()
                }

                let devices = xdTesting.multiremote(options)
                let app = devices
                    .app()

                assert.property(app, 'devices')
                assert.isDefined(app.devices)

                return devices.end()
            })

            it('app property should have getEventCounter @medium', () => {
                let options = {
                    A: templates.devices.chrome()
                }

                let devices = xdTesting.multiremote(options)
                let app = devices
                    .app()

                assert.property(app, 'getEventCounter')
                assert.instanceOf(app.getEventCounter, Function)

                return devices.end()
            })

            it('should get the event counter @large', () => {
                let options = {
                    A: templates.devices.chrome()
                }
                return xdTesting.multiremote(options).init()
                    .url(test.fixture.xd_gallery.url)
                    .app().injectEventLogger()
                    .app().getEventCounter().then(counter => {
                        assert.property(counter, 'XDdisconnection')
                        assert.property(counter, 'XDconnection')
                        assert.property(counter, 'XDdevice')
                        assert.property(counter, 'XDroles')
                        assert.property(counter, 'XDsync')
                        assert.property(counter, 'XDserverReady')
                        assert.property(counter, 'XDothersRolesChanged')

                        assert.typeOf(counter['XDdisconnection'], 'number')
                        assert.typeOf(counter['XDconnection'], 'number')
                        assert.typeOf(counter['XDdevice'], 'number')
                        assert.typeOf(counter['XDroles'], 'number')
                        assert.typeOf(counter['XDsync'], 'number')
                        assert.typeOf(counter['XDserverReady'], 'number')
                        assert.typeOf(counter['XDothersRolesChanged'], 'number')
                    })
                    .end()

                    /**
                     * App property?
                     */

                    //// Pair devices via url
                    //.app.pairDevicesViaUrl()
                    // Get event counter
                    //.app.getEventCounter().then(counter => assert.equal(counter.XDconnection == 1))
                // Wait for the next event of a type
                //.app.waitForEvent('XDconnection')
                //// Wait until the event type counter equals a value
                //.app.waitForEventCount('XDconnection', 2)
                //// Custom command
                //.app.addCommand('pairDevicesViaGUI', function() {
                //    return this.click(...)
                //})
            })

            describe('pairDevicesViaUrl @large', () => {
                it('should pair a device with a other device', () => {
                    let options = {
                        A: templates.devices.chrome(),
                        B: templates.devices.chrome()
                    }
                    let urlA
                    return xdTesting.multiremote(options).init()
                        .app().pairDevicesViaURL(test.fixture.xd_gallery.url)
                        .getUrl().then((urlA, urlB) => {
                            assert.include(urlA, test.fixture.xd_gallery.url)
                            assert.strictEqual(urlA, urlB)
                        })
                        .end()
                })
            })

            describe('pairDevicesViaXDMVC @large', () => {
                it('should pair a device with a other device', () => {
                    let options = {
                        A: templates.devices.chrome(),
                        B: templates.devices.chrome()
                    }
                    let urlA
                    return xdTesting.multiremote(options).init()
                        .url(test.fixture.xd_gallery.url)
                        .app().pairDevicesViaXDMVC()
                        .app().getEventCounter().then((counterA, counterB) => {
                            assert.equal(counterA['XDconnection'], 1)
                            assert.equal(counterB['XDconnection'], 1)
                        })
                        .end()
                })
            })

            describe('waitForConnectedDevices @large', () => {
                it('for 0 connected devices should return immediately', () => {
                    let options = {
                        A: templates.devices.chrome()
                    }

                    return xdTesting.multiremote(options).init()
                        .url(test.fixture.xd_gallery.url)
                        .app().waitForConnectedDevices(0)
                        .end()
                })

                it('for 1 connected devices should return after connection', () => {
                    let options = {
                        A: templates.devices.chrome(),
                        B: templates.devices.chrome()
                    }

                    let queue = ''
                    let devices = xdTesting.multiremote(options).init()
                        .url(test.fixture.xd_gallery.url)
                        .then(() => queue += '0')

                    let waitFor = devices
                        .then(() => queue += '1')
                        .app().waitForConnectedDevices(1)
                        .then(() => queue += '3')

                    let trigger = devices
                        .then(() => q.delay(1000))
                        .then(() => queue += '2')
                        .app().pairDevicesViaXDMVC()

                    return waitFor
                        .then(() => assert.equal(queue, '0123'))
                        .end()
                })
            })

            describe('waitForEvent @large', () => {
                it('should wait for the next event of the given type', () => {
                    let options = {
                        A: templates.devices.chrome()
                    }

                    let queue = ''
                    let lastCounter
                    let devices = xdTesting.multiremote(options).init()
                        .url(test.fixture.xd_gallery.url)
                        .app().injectEventLogger()
                        .app().getEventCounter()
                        .then(counter => lastCounter = counter)
                        .then(() => queue += '0')
                        // Init a custom event counter
                        .execute(function() {
                            window.eventLogger.eventCounter['customEvent'] = 0
                        })
                        .then(() => queue += '1')

                    let waitFor = devices
                        .then(() => queue += '2')
                        .app().waitForEvent('customEvent')
                        .then(() => queue += '9')
                        .end()

                    let trigger = devices
                        .then(() => q.delay(1000))
                        .then(() => queue += '3')
                        .execute(function() {
                            window.eventLogger.eventCounter['customEvent'] = 1
                        })

                    return waitFor
                        .then(() => assert.equal(queue, '01239'))
                        .end()
                })
            })

            describe('waitForEventCount @large', () => {
                it('should wait for the amount of events', () => {
                    let options = {
                        A: templates.devices.chrome()
                    }

                    let queue = ''
                    let devices = xdTesting.multiremote(options).init()
                        .url(test.fixture.xd_gallery.url)
                        .app().injectEventLogger()
                        .then(() => queue += '0')
                        // Init a custom event counter
                        .execute(function() {
                            window.eventLogger.eventCounter['customEvent'] = 0
                        })
                        .then(() => queue += '1')

                    let waitFor = devices
                        .then(() => queue += '2')
                        .app().waitForEventCount('customEvent', 1)
                        .then(() => queue += '4')
                        .app().waitForEventCount('customEvent', 2)
                        .then(() => queue += '9')
                        .end()

                    let trigger = devices
                        .then(() => q.delay(1000))
                        .then(() => queue += '3')
                        .execute(function() {
                            window.eventLogger.eventCounter['customEvent'] = 1
                        })
                        .then(() => q.delay(1000))
                        .then(() => queue += '5')
                        .execute(function() {
                            window.eventLogger.eventCounter['customEvent'] = 2
                        })

                    return waitFor
                        .then(() => assert.equal(queue, '0123459'))
                        .end()
                })
            })

            describe('hooks', () => {
                it('should inject event logger after loading url', () => {
                    let options = {
                        A: templates.devices.chrome()
                    }

                    xdTesting.reset()
                    xdTesting.appFramework = xdTesting.adapter.xdmvc

                    return xdTesting.multiremote(options).init()
                        .url(test.fixture.xd_gallery.url)
                        .execute(function() {
                            return window.eventLogger;
                        })
                        .then(ret => assert.isDefined(ret))
                        .app().getEventCounter().then(counter => {
                            assert.isDefined(counter)
                        })
                        .end()
                })
            })
        })

    })
})
