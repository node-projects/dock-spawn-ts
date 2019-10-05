call npx webpack
call npx babel lib\es5\dock-spawn-ts.js --presets=@babel/preset-env>lib\es5\dock-spawn-ts-es5.js
call npx uglifyjs lib\es5\dock-spawn-ts-es5.js >lib\es5\dock-spawn-ts-es5-ugly.js 
del lib\es5\dock-spawn-ts.js
del lib\es5\dock-spawn-ts-es5.js
move lib\es5\dock-spawn-ts-es5-ugly.js lib\es5\dock-spawn-ts.js
pause