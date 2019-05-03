const garie_plugin = require('garie-plugin')
const path = require('path');
const config = require('../config');
const express = require('express');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');
const scrape = require('website-scraper');

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

    if ((grade == null) || (grade[1].trim().length == 0)){
        console.log(`Did not receive a score for ${url}`);
        throw(`Did not receive a score for ${url}`);
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
        console.log(`Did not receive a score for ${url}`);
        throw(`Did not receive a score for ${url}`);
    }

    console.log("Received mozilla score "+grade[1]);

    result[key] = parseInt(grade[1]);

    return result;
}

const myGetFile = async (options) => {
    const { url } = options;
    const { reportDir } = options;

    options.fileName = 'headers.txt';
    var securityheadersFile = await garie_plugin.utils.helpers.getNewestFile(options);
    securityheadersFile = securityheadersFile.toString('utf8')

    options.fileName = 'securityheaders.html'

    const newestDir = await garie_plugin.utils.helpers.newestDir({'report_folder_name':'securityheaders-results', url:url, app_root:path.join(__dirname, '..')});

    const newestFullPath = path.join(__dirname, '..', 'reports', 'securityheaders-results', garie_plugin.utils.helpers.pathNameFromUrl(url), newestDir);

    const securityheaders_url = "https://securityheaders.com/?q="+url+"&followRedirects=on&hide=on"
    const scrape_options = {
            urls: [{url: securityheaders_url, filename: options.fileName},],
            directory: newestFullPath + '/tmp'
        };

    const html_result = await scrape(scrape_options);

    const mv_options = {
            script: path.join(__dirname, './mv_scraped_page.sh'),
            url: url,
            reportDir: reportDir,
            params: [newestFullPath],
            callback: function(){}
        }
    await garie_plugin.utils.helpers.executeScript(mv_options);

    var securityheadersHTML = await garie_plugin.utils.helpers.getNewestFile(options);
    securityheadersHTML = securityheadersHTML.toString('utf8').replace(/\r?\n|\r/g, " ");

    options.fileName = 'mozilla-observatory.txt'
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
  return new Promise(async (resolve, reject) => {
    try{
      await garie_plugin.init({
        db_name:'securityheaders',
        getData:myGetData,
        plugin_name:'securityheaders',
        report_folder_name:'securityheaders-results',
        app_root: path.join(__dirname, '..'),
        config:config
      });
    }
    catch(err){
      reject(err);
    }
  });
}

if (process.env.ENV !== 'test') {
  const server = app.listen(3000, async () => {
    console.log('Application listening on port 3000');
    try{
      await main();
    }
    catch(err){
      console.log(err);
      server.close();
    }
  });
}
