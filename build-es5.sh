npx webpack
npx babel lib/es5/dock-spawn-ts.js --presets=@babel/preset-env>lib/es5/dock-spawn-ts-es5.js
npx uglifyjs lib/es5/dock-spawn-ts-es5.js >lib/es5/dock-spawn-ts-es5-ugly.js
rm lib/es5/dock-spawn-ts.js
rm lib/es5/dock-spawn-ts-es5.js
mv lib/es5/dock-spawn-ts-es5-ugly.js lib/es5/dock-spawn-ts.js
