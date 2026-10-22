const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TIDB_URL =
  process.env.TIDB_DATABASE_URL ||
  'mysql://arirv837sN9hvn9.root:nOCFk8DjGTJKN5lA@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict';

console.log('\x1b[36m%s\x1b[0m', '⚡ Opening Prisma Studio connected to Deployed TiDB Cloud...');

const env = { ...process.env, DATABASE_URL: TIDB_URL };
const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const child = spawn(cmd, ['prisma', 'studio'], {
  stdio: 'inherit',
  env,
  shell: true,
  cwd: path.join(__dirname, '..'),
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
