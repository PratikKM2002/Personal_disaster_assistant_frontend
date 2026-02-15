const { exec } = require('child_process');

exec('netstat -ano | findstr :8000', (err, stdout) => {
    if (err) return console.log('No process found on 8000');

    const lines = stdout.split('\n');
    const killPids = [];

    lines.forEach(line => {
        if (line.includes('LISTENING') || line.includes('TIME_WAIT')) { // kill all just in case
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid) && pid !== '0') {
                killPids.push(pid);
            }
        }
    });

    const uniquePids = [...new Set(killPids)];
    uniquePids.forEach(pid => {
        console.log(`Killing PID ${pid}`);
        exec(`taskkill /PID ${pid} /F`, (kErr, kOut) => {
            if (kErr) console.error(kErr.message);
            else console.log(kOut);
        });
    });
});
