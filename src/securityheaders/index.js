const fs = require('fs');
const path = require('path');
const flatten = require('flat');
const child_process = require('child_process');
const urlParser = require('url');
const crypto = require('crypto');
const isEmpty = require('lodash.isempty');
const logger = require('../utils/logger');


function pathNameFromUrl(url) {
  const parsedUrl = urlParser.parse(url),
    pathSegments = parsedUrl.pathname.split('/');

  pathSegments.unshift(parsedUrl.hostname);

  if (!isEmpty(parsedUrl.search)) {
    const md5 = crypto.createHash('md5'),
      hash = md5
        .update(parsedUrl.search)
        .digest('hex')
        .substring(0, 8);
    pathSegments.push('query-' + hash);
  }

  return pathSegments.filter(Boolean).join('-');
}

function reportDir(url) {
    return path.join(__dirname, '../../reports/securityheaders-results', pathNameFromUrl(url));
}


function getResults(file, htmlFile, result) {
    
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



const getSecHeadResult = (url = '') => {
    try {
        const folders = fs.readdirSync(reportDir(url));
        const newestFolder = folders[folders.length - 1];

        var result = {};
	    
        const folder = path.join(reportDir(url), newestFolder);
	
	console.log("Will try to read the results from: "+ folder);

	    
	const securityheadersFile = fs.readFileSync(path.join(folder, 'headers.txt'), "utf8");
   
        const securityheadersHTML =  fs.readFileSync(path.join(folder, 'securityheaders.html'), "utf8").replace(/\r?\n|\r/g, " ");

	getResults(securityheadersFile, securityheadersHTML, result);
	
        const mozillaFile = fs.readFileSync(path.join(folder, 'observatory.txt'), "utf8");

	getScore(mozillaFile, result);

	console.log("Will insert into the database: "+ JSON.stringify(result));

        return Promise.resolve(result);

    } catch (err) {
        console.log(err);
        const message = `Failed to get securityheaders file for ${url}`;
        logger.warn(message);
        return Promise.reject(message);
    }
};

const getData = async url => {
    return new Promise(async (resolve, reject) => {
        try {
            const child = child_process.spawn('bash', [path.join(__dirname, './securityheaders.sh'), url, reportDir(url)]);

            child.on('exit', async () => {
                logger.info(`Finished getting data for ${url}, trying to get the results`);
                const data = await getSecHeadResult(url);
                resolve(data);
            });

            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stderr);
        } catch (err) {
            logger.warn(`Failed to get data for ${url}`, err);
            reject(`Failed to get data for ${url}`);
        }
    });
};

module.exports = {
    getSecHeadResult,
    getData,
    getResults
};
