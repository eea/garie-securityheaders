const garie_plugin = require('garie-plugin')
const path = require('path');
const config = require('../config');
const scrape = require('website-scraper');

function getResults(file, htmlFile) {
    var result = {};

    const regex = RegExp('x-grade: (.*)', 'i');

    const regexHTML = RegExp('<div class="score">.*?<span>(.*)</span></div>', 'i');

    var grade = regex.exec(file);

    const key = 'header_score';

    if ((grade == null) || (grade[1].includes("Please use an API Key"))){
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
  const key = 'mozilla_score';

  try {
      const jsonContent = JSON.parse(file);

      if (!jsonContent || !jsonContent.scan) {
          throw new Error('Invalid data format: Score not found');
      }

      const score = jsonContent?.scan?.score;
      const grade = jsonContent?.scan?.grade;
      const normalizedScore = (grade === 'A+') ? 100 : score;

      if (result == undefined) {
          result = {};
      }

      result[key] = normalizedScore;

      console.log("Received Mozilla Observatory score: " + score);

  } catch (error) {
      console.log(`Error parsing JSON or extracting score: ${error.message}`);
  }

  return result;
}

const myGetFile = async (options) => {
    const { url } = options;
    const { reportDir } = options;

    options.fileName = 'headers.txt';
    var securityheadersFile = await garie_plugin.utils.helpers.getNewestFile(options);
    securityheadersFile = securityheadersFile.toString('utf8')

    options.fileName = 'securityheaders.html'

    let report_folder_name = 'securityheaders-results'
    if (reportDir.indexOf('/on-demand/') > -1) {
      report_folder_name = path.join('on-demand', report_folder_name)
    }
    const newestDir = await garie_plugin.utils.helpers.newestDir({'report_folder_name':report_folder_name, url:url, app_root:path.join(__dirname, '..')});

    const newestFullPath = path.join(__dirname, '..', 'reports', report_folder_name, garie_plugin.utils.helpers.pathNameFromUrl(url), newestDir);

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

    var result;
    var failedtests_cnt = 0;
    try {
        result = getResults(securityheadersFile, securityheadersHTML);
    }
    catch (err){
        failedtests_cnt++;
    }
    try {
        result = getScore(mozillaFile, result);
    }
    catch (err){
        failedtests_cnt++;
    }
    if (failedtests_cnt == 2){
        console.log(`Both tests failed for ${url}`);
        throw(`Both tests failed for ${url}`);
    }
    if (failedtests_cnt > 0){
        console.log(`One of the tests failed for ${url}`);
        console.log(`Resubmit the task`);
        result['partial_success'] = true;
    }

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

const main = async () => {
  try{
    const { app } = await garie_plugin.init({
      db_name:'securityheaders',
      getData:myGetData,
      plugin_name:'securityheaders',
      report_folder_name:'securityheaders-results',
      app_root: path.join(__dirname, '..'),
      config:config,
      onDemand: true
    });
    app.listen(3000, () => {
      console.log('Application listening on port 3000');
    });
  }
  catch(err){
    console.log(err);
  }
}

if (process.env.ENV !== 'test') {
  main();
}
