/**
 * Modification of the original command from WebdriverIO.
 * Queries `getAbortWait` to abort waits early. Used to wait for the first
 * device/browser to display an element within any/implicit context.
 *
 * This wait command is your universal weapon if you want to wait on
 * something. It expects a condition and waits until that condition
 * is fulfilled with an truthy value. A condition can be either a promise
 * or a command that returns a promise.
 *
 * A common example is to wait until a certain element contains a certain
 * text.
 *
 * <example>
 :example.html
 <div id="someText">I am some text</div>
 <script>
 setTimeout(function() {
        $('#someText').html('I am now different');
      }, 1000);
 </script>

 :waitUntil.js
 client.waitUntil(function() {
      return this.getText('#someText').then(function(text) {
        return text === 'I am now different'
      });
    });
 * </example>
 *
 *
 * @param {Function|Promise} condition  condition to wait on
 * @param {Number=}          timeout    timeout in ms (default: 500)
 * @param {Number=}          interval   interval between condition checks (default: 250)
 *
 * @uses utility/pause
 * @type utility
 *
 */

var q = require('q'),
    ErrorHandler = require('webdriverio/lib/utils/ErrorHandler.js'),
    reject = function(d) {
        d.reject(new ErrorHandler.CommandError('Promise never resolved with an truthy value'));
    };
var AbortedWaitError = require('../abortedWaitError')

function waitUntilPrivate(condition, timeout, interval, starttime) {
    var self = this,
        defer = q.defer(),
        promise;

    if(typeof condition === 'function') {
        promise = condition.call(this);
    } else if(q.isPromiseAlike(condition)) {
        promise = condition;
    } else {
        throw new ErrorHandler.CommandError('waitUntil condition needs to be a promise or a function that returns a promise');
    }

    var now = new Date().getTime();
    var timeLeft = timeout - (now - starttime);
    timeLeft = timeLeft < 0 ? 0 : timeLeft;

    var abortWait = this.getAbortWait()
    if (abortWait === true) {
        // Abort the waitUntil and signal it with an AbortedWaitError
        defer.reject(new AbortedWaitError())
        return defer.promise;
    }

    if(!timeLeft) {
        reject(defer);
        return defer.promise;
    }

    var timeoutId = setTimeout(function() {
        reject(defer);
    }, timeLeft < 0 ? 0 : timeLeft);

    promise.then(function(res) {
        clearTimeout(timeoutId);

        if(!res) {
            if(q.isPromiseAlike(condition)) {
                defer.reject(new ErrorHandler.CommandError('Promise was fulfilled with a falsy value'));
            }
            return defer.resolve(self.pause(interval)
                .then(waitUntilPrivate.bind(self, condition, timeout, interval, starttime)));
        }

        defer.resolve(res);

    }, function(err) {
        clearTimeout(timeoutId);

        defer.reject(new ErrorHandler.CommandError('Promise was fulfilled but got rejected with the following reason: ' + err));

    });

    return defer.promise;

}

module.exports = function waitUntil(condition, timeout, interval) {
    /*!
     * ensure that timeout and interval are set properly
     */
    if (typeof timeout !== 'number') {
        timeout = this.options.waitforTimeout;
    }

    if (typeof interval !== 'number') {
        interval = this.options.waitforInterval;
    }

    var startTime = new Date().getTime();

    return waitUntilPrivate.call(this, condition, timeout, interval, startTime);
};
