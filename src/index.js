const garie_plugin = require('garie-plugin')
const path = require('path');
const config = require('../config');
const express = require('express');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');

function getResults(file, htmlFile) {
    var result = {};

    const regex = RegExp('x-grade: (.*)', 'i');

    const regexHTML = RegExp('<div class="score">.*?<span>(.*)</span></div>', 'i');

    var grade = regex.exec(file);

    const key = 'header_score';

    if (grade == null){
        console.log("Did not receive a score, will try to extract from HTML file");
        grade = regexHTML.exec(htmlFile);
    }

    if (grade == null){
        console.log("Did not receive a score, will set 0"); 
        console.log(file);
        result[key] = 0;
        return result
    }

    console.log("Received securityheaders.com score "+grade[1]);

    switch(grade[1]){
        case 'A+':
           result[key] = 100;
           break;
        case 'A':
           result[key] = 90;
           break;
        case 'B':
           result[key] = 80;
           break;
        case 'C':
           result[key] = 60;
           break;
        case 'D':
           result[key] = 40;
           break;
        case 'E':
           result[key] = 20;
           break;
        case 'F':
           result[key] = 10;
           break;
        default:
           result[key] = 0;
        }

    return result;
}

function getScore(file, result) {

    const regex = RegExp('Score: (.*)', 'i');

    const grade = regex.exec(file);

    const key = 'mozilla_score';

    if (grade == null){
        console.log("Did not receive a score, will set 0"); 
        console.log(file);
        result[key] = 0;
        return result
    }

    console.log("Received mozilla score "+grade[1]);

    result[key] = parseInt(grade[1]);

    return result;
}

const myGetFile = async (options) => {
    options.fileName = 'headers.txt';
    var securityheadersFile = await garie_plugin.utils.helpers.getNewestFile(options);
    securityheadersFile = securityheadersFile.toString('utf8')

    options.fileName = 'securityheaders.html'
    var securityheadersHTML = await garie_plugin.utils.helpers.getNewestFile(options);
    securityheadersHTML = securityheadersHTML.toString('utf8').replace(/\r?\n|\r/g, " ");

    options.fileName = 'observatory.txt'
    var mozillaFile = await garie_plugin.utils.helpers.getNewestFile(options);
    mozillaFile = mozillaFile.toString('utf8');

    var result = getResults(securityheadersFile, securityheadersHTML);

    result = getScore(mozillaFile, result);

    console.log("Will insert into the database: "+ JSON.stringify(result));

    return result;
}

const myGetData = async (item) => {
    const { url } = item.url_settings;
    return new Promise(async (resolve, reject) => {
        try {
            const { reportDir } = item;

            const options = { script: path.join(__dirname, './securityheaders.sh'),
                        url: url,
                        reportDir: reportDir,
                        params: [ ],
                        callback: myGetFile
                    }
            data = await garie_plugin.utils.helpers.executeScript(options);

            resolve(data);
        } catch (err) {
            console.log(`Failed to get data for ${url}`, err);
            reject(`Failed to get data for ${url}`);
        }
    });
};



console.log("Start");


const app = express();
app.use('/reports', express.static('reports'), serveIndex('reports', { icons: true }));

const main = async () => {
  garie_plugin.init({
    database:'securityheaders',
    getData:myGetData,
    app_name:'securityheaders',
    app_root: path.join(__dirname, '..'),
    config:config
  });
}

if (process.env.ENV !== 'test') {
  app.listen(3000, async () => {
    console.log('Application listening on port 3000');
    await main();
  });
}
