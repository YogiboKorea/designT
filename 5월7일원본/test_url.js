const https = require('https');
const urls = [
  'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/resources.json',
  'https://static.imgly.com/@imgly/background-removal-data/1.7.0/dist/resources.json',
  'https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.7.0/dist/resources.json',
  'https://unpkg.com/@imgly/background-removal-data@1.7.0/dist/resources.json'
];

urls.forEach(url => {
  https.get(url, res => {
    console.log(url + ' -> ' + res.statusCode);
  }).on('error', e => console.log(url + ' -> Error: ' + e.message));
});
