#!/usr/bin/env node
"use strict"

var q = require('q')
var fs = require('fs')
var fsp = require('fs-promise')
var path = require('path')
var Flow = require('./../lib/flow/flow')
var Mustache = require('mustache')

var express = require('express')
var app = express()

app.get('/', function (req, res) {
    const FLOW_DIRECTORY = path.join(process.cwd(), 'flows');

    // Read files from query
    let selectedFiles = req.query['files'] || []
    // Make absolute file names
    let absoluteFileName = file => path.join(FLOW_DIRECTORY, file)
    let absoluteFileNames = selectedFiles.map(absoluteFileName)


    let allFiles = fs.readdirSync(FLOW_DIRECTORY)
        .filter(filename => fs.statSync(path.join(FLOW_DIRECTORY, filename)).isFile() && path.extname(filename) == '.json')

    console.log('files:', selectedFiles)

    // Load templates
    let template = fs.readFileSync(path.join(__dirname, 'views/layout.mustache'), 'utf-8')
    let partials = {
        'flow_selection': fs.readFileSync(path.join(__dirname, 'views/flow_selection.mustache'), 'utf-8'),
        'display_options': fs.readFileSync(path.join(__dirname, 'views/display_options.mustache'), 'utf-8')
    }

    let iconType = {
        'phone': 'Mobile',
        'tablet': 'Tablet',
        'desktop': 'Desktop'
    }
    let view = {
        'selectedFile': selectedFiles[0],
        'allFiles': allFiles.map(file => {
            let flow = Flow.load(absoluteFileName(file))
            return {
                name: file,
                flow: flow,
                status: flow.checkpoints().find(checkpoint => checkpoint.name === 'ERROR') === undefined
                    ? "" : "error"
            }
        }),
        'flowDirectory': FLOW_DIRECTORY,
        'messages': [],
        'flows': [],
        'checkpoints': [],
        'selected-file-class': function() {
            return this.name === selectedFiles[0] ? 'selected-file' : ''
        },
        'compared-file-class': function() {
            return this.name === selectedFiles[1] ? 'selected-file' : ''
        },
        'flow-cardinality-class': function() {
            return this.flows.length === 1 ? 'flow-single' : 'flow-multiple'
        },
        'flow-status-icon': function() {
            let iconClass = {
                'error': 'error fa fa-exclamation-triangle'
            }[this.status]
            return iconClass ? '<i class="' + iconClass + '"></i>' : ''
        },
        'img': function() {
            return function(value, render) {
                let rendered = render(value) + ""
                let length = rendered.length
                return length > 0 ? ('<img src="data:image/png;base64,' + rendered + '">') : ''
            }
        },
        'device-title': function() {
            let faType = iconType[this.type]
            let screenSize = null
            if (this.width && this.height) {
                screenSize = this.width + "x" + this.height
            }

            let title = this.name
            title += faType ? ', ' + faType : ''
            title += screenSize ? ', ' + screenSize : ''

            return title
        },
        'device-icon': function() {
            let faType = iconType[this.type]
            return faType ? '<i class="fa fa-' + faType.toLowerCase() + '" aria-hidden="true"></i>' : ''
        }
    }

    q.all(absoluteFileNames.map(fileName => fsp.access(fileName, fs.F_OK)
        .then(() => {
            console.log("Flow.load(fileName)", fileName)
            let flow = Flow.load(fileName)

            view.flows.push({
                devices: flow.deviceArray(),
                grid: flow.grid()
            })

            view.checkpoints = view.checkpoints.concat(flow.checkpoints().map(c => c.name))
        }, err => {
            let message = "Error loading file. " + (err.path || "")
            console.log(message)
            view.messages.push(message)
            res.status(404)
        })
    )).then(() => {
        // Filter duplicates
        view.checkpoints = view.checkpoints.filter((value, index, self) => {
            // Is the first value in the array
            return self.indexOf(value) === index
        })

        // Render template
        let html = Mustache.render(template, view, partials)

        res.send(html)
    }).catch(err => {
        let message = "An error occured. " + err.message
        console.log(message)
        view.messages.push(message)
        res.status(500)
    })
});

app.use('/public', express.static(path.join(__dirname, '/public')))
app.use('/bower_components', express.static(path.join(__dirname, '/bower_components')))

app.listen(3000, function () {
    console.log('Listening on port 3000.')
})
