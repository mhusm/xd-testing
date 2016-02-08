"use strict";

var assert = require('chai').assert;
var webdriverio = require('webdriverio');

/**
 * @type {Q}
 */
var q = require('q');

var debug = function() {
    if (false) {
        console.log.apply(console, arguments);
    }
};

var injectEventLogger = function() {

    var DEBUG = false;

    function EventLogger() {
        this.eventNames = ["XDdisconnection", "XDconnection", "XDdevice", "XDroles", "XDsync", "XDserverReady", "XDothersRolesChanged"];
        this.eventCounter = {};

        this.eventNames.forEach((function (event) {
            this.eventCounter[event] = 0;
            XDmvc.on(event, (function (sender) {
                this.eventCounter[event]++;
                if (DEBUG) {
                    console.log(event);
                    console.log(sender);
                    console.log(this.eventCounter);
                }
            }).bind(this))
        }).bind(this));
    }

    window.eventLogger = new EventLogger();
    return 0;
};

var getEventCounter = function() {
    return window.eventLogger.eventCounter;
};

var utility = {

    initWithDevices: function(devices) {

        var self = this;

        // Store id into device
        Object.keys(devices).forEach(function(id) {
            var dev = devices[id];
            debug(id, dev);
            dev["id"] = id;
            debug(id, dev);
        });

        debug(devices);

        self.deviceOptions = devices;

        // New browser instance with WebdriverIO
        self.devices = webdriverio.multiremote(self.deviceOptions);

        var tileWidth = Math.floor(1600 / self.devicesCount());

        return self.devices.init()
            .timeoutsAsyncScript(5 * 1000)
            .windowHandleSize({width: tileWidth, height: 600})
            .then(function () {
                // Align windows on screen
                var x = 0;
                Object.keys(self.deviceOptions).forEach(function (deviceName) {
                    self.devices.select(deviceName).windowHandlePosition({x: x, y: 0});
                    x += tileWidth;
                });
            });
    },

    pairDevicesViaURL: function() {
        var self = this;

        var deviceA = self.devices.select('A');

        return deviceA.url(self.baseUrl).then(function () {
            debug('A: init');
        }).execute(function () {
            return 1 + 2;
        }).then(function (ret) {
            assert.equal(ret.value, 3);
        }).execute(injectEventLogger).then(function () {
            debug('A: injected event logger');
        }).getUrl().then(function (url) {

            var allButA = Object.keys(self.deviceOptions).filter(function (deviceName) {
                return deviceName != 'A';
            });
            return multiAction(self.devices, allButA, function (device) {
                return device.url(url);
            }).then(function () {
                debug('init urls');

                return deviceA.waitUntil(function () {
                    return deviceA.execute(getEventCounter).then(function (ret) {
                        debug('A: got eventCounter: ');
                        debug(ret.value);
                        debug('devices.length:', self.devicesCount());
                        return ret.value.XDconnection == self.devicesCount() - 1;
                    });
                });
            });
        })
    },

    pairDevicesViaXDMVC: function() {
        var self = this;

        var deviceA = self.devices.select('A');

        // TODO wait for XD "initialized" event

        var allDevices = Object.keys(self.deviceOptions);

        return multiAction(self.devices, allDevices, (device) => {
            return device.url(self.baseUrl).then(function () {
                debug('init');
            }).execute(injectEventLogger).then(function () {
                debug('injected event logger');
            }).execute(function() {
                return XDmvc.deviceId;
            }).then(ret => ret.value);
        }).then(function(vals) {

            // Connect first device with all the others
            var connect = vals.slice(1).map(idOther => {
                
                // Omit first id, loop over the others
                return deviceA.execute(function (id) {
                    XDmvc.connectTo(id);
                }, idOther);
            });

            return q.all(connect).then(() => {
                return deviceA.waitUntil(function () {
                    return deviceA.execute(getEventCounter).then(function (ret) {
                        debug('A: got eventCounter: ');
                        debug(ret.value);
                        debug('devices.length:', self.devicesCount());
                        return ret.value.XDconnection == self.devicesCount() - 1;
                    });
                });
            });
        });
    },

    devicesCount : function() {
        var self = this;
        return Object.keys(self.deviceOptions).length;
    }
};

var templates = {
    chrome: function() {
        // Generate a new object
        return {
            name: 'Chrome',
            desiredCapabilities: {browserName: 'chrome'}
        };
    },
    nexus4: function() {
        // Generate a new object
        return {
            name: 'Nexus 4',
            desiredCapabilities: {browserName: 'chrome'}
        }
    }
};

/**
 * Resolve templates
 * @param config
 */
function normalizeConfig(config) {
    config['setups'].forEach(setup => {
        Object.keys(setup.devices).forEach(id => {
            var deviceConfig = setup.devices[id];
            if (typeof deviceConfig == "string" && templates[deviceConfig]) {
                // Replace template reference
                setup.devices[id] = templates[deviceConfig]();
            }
        })
    });
}

/**
 * @callback multiActionCallback
 * @param {WebdriverIO.Client} device
 */

/**
 * Executes callback on devices matching deviceNames.
 * Returns a promise.
 * @param devices
 * @param deviceIds
 * @param {multiActionCallback} callback
 * @returns Q.Promise<T[]>
 */
function multiAction (devices, deviceIds, callback) {
    var promises = [];
    debug(deviceIds);
    deviceIds.forEach(function(id) {
        var device = devices.select(id);
        debug('multiAction ' + id + ' ' + device.options.id, device.options);

        promises.push(callback(device));
    });
    return q.all(promises);
}

var screenshotPath = function(test, device) {
    return './screenshots/' + test.fullTitle() + ' - ' + device.options.id + ' ' + device.options.name + '.png';
};

var config = require(process.cwd() + '/xd-testing.json');
normalizeConfig(config);
var setups = config['setups'];


describe('XD-MVC Maps', function() {
    var self = this;

    // Set test timeout
    this.timeout(30 * 1000);

    self.deviceOptions = {};
    self.devices = {};
    self.baseUrl = "http://me.local:8000/maps.html";

    // Bind function to this reference
    self.pairDevicesViaURL = utility.pairDevicesViaURL.bind(self);
    self.pairDevicesViaXDMVC = utility.pairDevicesViaXDMVC.bind(self);
    self.devicesCount = utility.devicesCount.bind(self);
    var initWithDevices = utility.initWithDevices.bind(self);


    afterEach(function() {
        // Close browsers before completing a test
        return self.devices.end();
    });


    it('should pair via XDmvc.connectTo', function () {
        var devices = {A: templates.chrome(), B: templates.chrome()};
        return initWithDevices(devices).then(() => self.pairDevicesViaXDMVC()).then(() => {
            return self.devices.select('A').execute(function () {
                return XDmvc.getConnectedDevices().length;
            }).then(function (ret) {
                assert.equal(ret.value, 1);
            });
        });
    });

    var pairDevicesViaMapsGui = () => {
        var deviceA = self.devices.select('A');
        var deviceB = self.devices.select('B');

        var deviceIdA = deviceA.url(self.baseUrl).then(function () {
            debug('A: init');
        }).execute(injectEventLogger).then(function () {
            debug('A: injected event logger');
        }).execute(function () {
            return XDmvc.deviceId;
        }).then(function (ret) {
            return ret.value;
        });

        var deviceIdB = deviceB.url(self.baseUrl).then(function () {
            debug('B: init');
        }).execute(injectEventLogger).then(function () {
            debug('B: injected event logger');
        }).execute(function () {
            return XDmvc.deviceId;
        }).then(function (ret) {
            return ret.value;
        });

        return q.all([deviceIdA, deviceIdB]).then(function (vals) {
            // Both devices are ready
            var idA = vals[0];
            var idB = vals[1];

            return deviceA.click('#menu-button')
                .waitForVisible('//*[@id="availableDeviceList"]//*[@class="id"][text()="' + idB + '"]', 3000)
                .click('//*[@id="availableDeviceList"]//*[@class="id"][text()="' + idB + '"]')
                .waitUntil(function () {
                    return deviceA.execute(getEventCounter).then(function (ret) {
                        debug('A: got eventCounter: ');
                        debug(ret.value);
                        return ret.value.XDconnection == 1;
                    });
                });
        });
    };

    it('should pair via GUI', function() {
        var devices = {A: templates.chrome(), B: templates.chrome()};

        return initWithDevices(devices).then(() => {
            return pairDevicesViaMapsGui();
        });
    });


    describe('should sync the map center on mirrored devices', function() {

        setups.forEach(function(setup) {

            // Assemble setup name
            var setupName = Object.keys(setup.devices).map(function (key) {
                var dev = setup.devices[key];
                return dev.name;
            }).join(', ');

            it('on ' + setupName, function () {
                var test = this.test;

                var devices = setup.devices;

                return initWithDevices(devices).then(() => self.pairDevicesViaXDMVC()).then(() => {
                    var deviceA = self.devices.select('A');

                    var lastXDSyncCounts;

                    var allDevices = Object.keys(self.deviceOptions);
                    var passiveDevices = allDevices.filter((id) => id != 'A');

                    return multiAction(self.devices, passiveDevices, function(device) {
                        return device.execute(function() {
                            return eventLogger.eventCounter.XDsync;
                        }).then(ret => {
                            return {id: device.options.id, XDsync: ret.value};
                        });
                    }).then(function(values) {
                        // Store last sync counter
                        lastXDSyncCounts = {};
                        values.forEach(val => { lastXDSyncCounts[val.id] = val.XDsync });

                        // Adjust map location
                        return deviceA.execute(function () {
                            map.setCenter({lat: 47.3783569289, lng: 8.5487177968});
                        });
                    }).then(() => multiAction(self.devices, passiveDevices, device => {
                        return device.waitUntil(() => device.execute(function (lastSyncCounter) {
                            return eventLogger.eventCounter.XDsync > lastSyncCounter;
                        }, lastXDSyncCounts[device.options.id]))
                    })).then(() => multiAction(self.devices, passiveDevices, device =>
                        device.execute(function(id) {
                            return {
                                id: id,
                                XDsync: eventLogger.eventCounter.XDsync,
                                map_lat: map.getCenter().lat(),
                                map_lng: map.getCenter().lng()
                            };
                        }, device.options.id)
                    )).then(returns => {
                        return returns.map(ret => ret.value);
                    }).then(values => {

                        values.forEach(value => {
                            assert.isAbove(value.XDsync, lastXDSyncCounts[value.id], 'Number of syncs has not increased.');
                            assert.equal(value.map_lat.toFixed(10), 47.3783569289);
                            assert.equal(value.map_lng.toFixed(10), 8.5487177968);
                        });

                        return multiAction(self.devices, allDevices, device => {
                            return device.pause(1000).saveScreenshot(screenshotPath(test, device));
                        });
                    });
                });
            });
        });
    });

});

describe('XD-MVC Gallery', function() {
    var self = this;

    // Set test timeout
    this.timeout(30 * 1000);

    self.deviceOptions = {};
    self.devices = {};
    self.baseUrl = "http://me.local:8082/gallery.html";

    // Bind function to this reference
    self.pairDevicesViaURL = utility.pairDevicesViaURL.bind(self);
    self.devicesCount = utility.devicesCount.bind(self);
    var initWithDevices = utility.initWithDevices.bind(this);


    afterEach(function() {
        // Close browsers before completing a test
        return self.devices.end();
    });

    describe('eventLogger', function() {
        it ('should count XDconnection events', function() {


            return initWithDevices({A: templates.chrome(), B: templates.chrome()}).then(function() {
                return self.pairDevicesViaURL();
            }).then(function() {
                var deviceA = self.devices.select('A');
                return deviceA.execute(getEventCounter).then(function(ret) {
                    debug('A: got eventCounter: ');
                    debug(ret.value);
                    assert.equal(ret.value.XDconnection, self.devicesCount() - 1);
                });
            });
        });
    });

    it('should not share cookies across browser sessions', function () {

        return initWithDevices({A: templates.chrome(), B: templates.chrome()}).then(function() {
            return self.pairDevicesViaURL();
        }).then(function() {
            var deviceA = self.devices.select('A');
            var deviceB = self.devices.select('B');

            return deviceA.url(this.baseUrl).then(function () {
                return deviceB.url(self.baseUrl);
            }).setCookie({name: 'test_cookieA', value: 'A'})
            .getCookie('test_cookieA').then(function (cookie) {

                assert.notEqual(cookie, null);
                assert.equal(cookie.name, 'test_cookieA');
                assert.equal(cookie.value, 'A');

                return deviceB.setCookie({name: 'test_cookieB', value: 'B'})
                .getCookie('test_cookieB').then(function (cookie) {

                    assert.notEqual(cookie, null);
                    assert.equal(cookie.name, 'test_cookieB');
                    assert.equal(cookie.value, 'B');

                }).getCookie('test_cookieA').then(function (cookie) {
                    assert.equal(cookie, null);
                });
            });
        });
    });

    it('should not share local storage across browser sessions', function () {
        var getItem = function(key) {
            return localStorage.getItem(key);
        };

        var setItem = function(key, value) {
            localStorage.setItem(key, value);
        };

        return initWithDevices({A: templates.chrome(), B: templates.chrome()}).then(function() {
            return self.pairDevicesViaURL();
        }).then(function() {
            var deviceA = self.devices.select('A');
            var deviceB = self.devices.select('B');

            return deviceA.url(self.baseUrl).then(function () {
                return deviceB.url(self.baseUrl);
            }).execute(setItem, 'test_storageA', 'A')
            .execute(getItem, 'test_storageA').then(function (ret) {
                assert.equal(ret.value, 'A');

                return deviceB.execute(getItem, 'test_storageA').then(function (ret) {
                    return assert.equal(ret.value, null);
                });
            });
        });
    });

    describe('should show the selected image on the other devices', function () {

        setups.forEach(function(setup) {

            // Assemble setup name
            var setupName = Object.keys(setup.devices).map(key => setup.devices[key].name).join(', ');

            it('on ' + setupName, function() {

                var test = this.test;

                var imageUrlA;

                return initWithDevices(setup.devices).then(function() {
                    return self.pairDevicesViaURL();
                }).then(function() {
                    var deviceA = self.devices.select('A');

                    return deviceA.waitForVisible('h2.gallery-overview', 5000).then(function () {
                        //debug('A: h2.gallery-overview is visible');
                    }).click('//*[text()="Bike Tours"]').then(function () {
                        //debug('A: clicked Bike Tours');
                    }).waitForVisible('#gallery img:nth-of-type(1)').then(function () {
                        //debug('A: first image is visible');
                    }).click('#gallery img:nth-of-type(1)').then(function () {
                        //debug('A: clicked first image in galery');
                    }).waitForVisible('#image img').then(function () {
                        //debug('A: #image img is visible');
                    }).scroll(0, 10000).then(function () {
                        //debug('A: scrolled down to the end');
                    }).getAttribute('#image img', 'src').then(function (src) {
                        imageUrlA = src;
                        //debug('A: image src ' + src);
                    }).getUrl().then(function (url) {

                        // For all browsers but A
                        var allButA = Object.keys(self.deviceOptions).filter(function (deviceId) {
                            return deviceId != 'A';
                        });

                        debug(allButA);

                        return multiAction(self.devices, allButA, function (device) {
                            return device.waitForVisible('#image img', 3000);
                        }).then(function () {
                            return multiAction(self.devices, allButA, function (device) {
                                return device.getAttribute('#image img', 'src');
                            });
                        }).then(function (srcs) {
                            Object.keys(srcs).forEach(function (key) {
                                var src = srcs[key];
                                assert.equal(src, imageUrlA);
                            });

                            return multiAction(self.devices, allButA, function (device) {
                                return device.saveScreenshot(screenshotPath(test, device));
                            });
                        });
                    }).saveScreenshot(screenshotPath(test, deviceA));
                });
            });
        });
    });
});
