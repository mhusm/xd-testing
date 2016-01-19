"use strict";

// Node.js tests
if (typeof module == "object" && typeof require == "function") {
    var buster = require("buster");
}

var webdriverio = require('webdriverio');


var assert = buster.referee.assert;
//var expect = buster.referee.expect;
//var refute = buster.referee.refute;

//buster.spec.expose(); // Make BDD functions global

buster.testCase("XD-MVC Example Gallery", {

    setUp: function() {

        this.baseUrl = "http://me.local:8082/gallery.html";

        // Set timeout
        this.timeout = 1000 * 60; // 60s

        // New browser instance with WebdriverIO
        var options = {desiredCapabilities: {browserName: 'chrome'}};
        var clientA = webdriverio.remote(options);
        var clientB = webdriverio.remote(options);

        var browserA = this.browserA = clientA.init()
            .windowHandleSize({width: 800, height: 800})
            .windowHandlePosition({x: 0, y: 0});
        var browserB = this.browserB = clientB.init()
            .windowHandleSize({width: 800, height: 800})
            .windowHandlePosition({x: 800, y: 0});

    },

    tearDown: function() {
        // Close browser before completing a test
        this.browserA.endAll();
        //this.browserB.end();

        return true;
    },

    '//async test closes browser windows after test': function(done) {
        setTimeout(function() {
            assert.isTrue(true);
            done();
        }, 5000);
    },

    'test second device shows selected image': function(done) {

        var self = this;

        console.log("start");

        var imageUrlA;

        this.browserA.url(this.baseUrl).then(function () {
            console.log('A: initialized');
            // Wait until application is loaded

        }).getUrl().then(function (url) {
            console.log('A: url ' + url);
            self.browserB.url(url).then(function () {
                console.log('B: url ' + url);
            });
        }).waitForVisible('h2.gallery-overview').then(function () {
            console.log('A: h2.gallery-overview is visible');
        }).click('//*[text()="Bike Tours"]').then(function () {
            console.log('A: clicked Bike Tours');
        }).pause(3000).then(function () {
            console.log('A: waited for 3000ms');
        }).waitForVisible('#gallery img:nth-of-type(1)').then(function () {
            console.log('A: first image is visible');
        }).click('#gallery img:nth-of-type(1)').then(function () {
            console.log('A: clicked first image in galery');
        }).waitForVisible('#image img').then(function () {
            console.log('A: #image img is visible');
        }).scroll(0, 1000).then(function() {
            console.log('A: scrolled down to the end');
        }).getAttribute('#image img', 'src').then(function (src) {
            imageUrlA = src;
            console.log('A: image src ' + src);
        }).getUrl().then(function (url) {
            self.browserB.waitForVisible('#image img', 3000).then(function () {
                console.log('B: image found');
            }).pause(3000).then(function () {
                console.log('B: waited for 3000ms');
            }).getAttribute('#image img', 'src').then(function (src) {
                console.log('A: imageUrlA ' + imageUrlA);
                console.log('B: image src ' + src);

                assert.equals(src, imageUrlA);

                if (src == imageUrlA) {
                    console.log('SUCCESS, images are equal!');
                } else {
                    console.log('ERROR! different images.');
                }
                self.browserA.saveScreenshot('.screenshots/browserA.png', function (err, screenshot, response) {
                    console.log('A: save screenshot');
                    console.log('err: ' + err);
                })
            }).saveScreenshot('./screenshots/browserB.png', function (err, screenshot, response) {
                console.log('B: save screenshot');
                console.log('err: ' + err);

                // Tell test runner we're done with the async test
                done();
            });
        });
    },

    '//goes to Google': function() {
        var driver = this.webdriver.driver;
        var browser = this.browser;

        return browser.url('http://www.google.com').then(function() {
            return browser.title();
        }).then(function(title) {
            assert.equals(title, 'Google');

            return browser.elementByName('q');
        }).then(function(input) {
            return input.type('webdriver');
        }).then(function() {
            return browser.elementByName('btnG');
        }).then(function(button) {
            return button.click();
        }).then(function() {
            var defer = (driver.Q || browser.Q).defer();

            browser.waitForCondition('document.title === "webdriver - Google Search"', 5000, defer.resolve);

            return defer.promise;
        }).then(function() {
            return browser.title();
        }).then(function(title) {
            assert.equals(title, 'webdriver - Google Search');
        });
    }
});
