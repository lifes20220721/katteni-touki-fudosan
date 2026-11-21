import {readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const files = ['service-worker.js', ...readdirSync('src').filter(name => name.endsWith('.js')).map(name => 'src/' + name)];
for (const file of files) execFileSync(process.execPath, ['--check', file], {stdio: 'inherit'});
console.log(`Syntax checked: ${files.length} JavaScript files`);
