mkdir -p pub
cat src/observable.js src/content.js src/layout.js src/map-model.js src/kinetic.connector.js src/kinetic.idea.js src/kinetic-mediator.js src/map-toolbar-widget.js src/image-export-widget.js > pub/mapjs-compiled.js
if [ -d "../mindmup/public" ]; then
 cp pub/mapjs-compiled.js ../mindmup/public
fi
