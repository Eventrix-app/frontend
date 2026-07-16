const fs = require('fs');
const path = require('path');

const imagePath = path.join(__dirname, 'assets', 'Offline.png');
const outputPath = path.join(__dirname, 'offline-base64.txt');

const data = fs.readFileSync(imagePath);
fs.writeFileSync(outputPath, data.toString('base64'));

console.log('Done. Base64 written to offline-base64.txt');
console.log('File size:', data.length, 'bytes');