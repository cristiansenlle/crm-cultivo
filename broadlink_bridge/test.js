const broadlink = require('node-broadlink');

console.log('Discovering...');
const b = broadlink.discover();

b.on('deviceReady', (dev) => {
    console.log('Device ready!', dev.model);
});

console.log('Returned from discover:', typeof b, typeof b.on);
