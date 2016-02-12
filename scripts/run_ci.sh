#!/usr/bin/env bash

set -e # Abort on error
set -u # Abort on uninitialized variable usage

PROJECT_ROOT=$(git rev-parse --show-toplevel)

# Run gallery
echo "Run gallery app"
cd ${PROJECT_ROOT}/testapp/XD-MVC/Examples/Gallery
node gallery-polymer.js &
GALLERY_PID=$!
echo $GALLERY_PID

# Run maps
echo "Run gallery app"
cd ${PROJECT_ROOT}/testapp/XD-MVC/Examples/Maps
node server.js &
MAPS_PID=$!
echo $MAPS_PID

# Setup selenium server
cd ${PROJECT_ROOT}
echo "Start selenium sever"
./start_selenium.sh &
SELENIUM_PID=$!
echo $SELENIUM_PID

echo "Generate config file"
./lib/generate-config.js

# Run the tests
echo "Run tests"
npm test

# Kill background processes
set +e # Ignore process kill errors
kill $GALLERY_PID
kill $MAPS_PID
kill $SELENIUM_PID
