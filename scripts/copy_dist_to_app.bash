#!/bin/bash

yarn build
rsync -av dist/* ../epop-v2/epop/node_modules/@cpmech/simple-state/dist/
rsync -av dist/* ../epop-v2/epop-app/node_modules/@cpmech/simple-state/dist/
rsync -av dist/* ../epop-v2/epop-manager/node_modules/@cpmech/simple-state/dist/
