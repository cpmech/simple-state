#!/bin/bash

yarn build
rsync -av dist/* ../epop-v2/epop/node_modules/@cpmech/simple-state/dist/*
