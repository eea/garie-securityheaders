const garie_plugin = require('garie-plugin')
const path = require('path');
const config = require('../config');
const UserAgent = require('user-agents');
const fs = require('fs');
const { chromium } = require('playwright');

const SECURITY_URL = "https://securityheaders.com/";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function convertGradeToScore(grade) {
  const scoreMapping = {
    "A+": 100,
    A: 90,
    B: 80,
    C: 60,
    D: 40,
    E: 20,
    F: 10,
  };
  return scoreMapping[grade] || 0;
}

async function getSecurityHeadersScore(url, newestFullPath, reportDir) {
  console.log(`[SecurityHeaders] Fetching score for: ${url}`);
  const browser = await chromium.launch({ headless: true });
  const userAgent = new UserAgent();
  let grade = null;

  const context = await browser.newContext({ userAgent: userAgent.toString() });
  const page = await context.newPage();
  const securityheaders_url = `${SECURITY_URL}?q=${url}&followRedirects=on&hide=on`;

  await page.goto(securityheaders_url, { waitUntil: "domcontentloaded", timeout: 15000 })
    .catch(error => {
      throw new Error(`Failed to load page: ${error.message}`);
    });

  const scoreElement = await page.$(".score span");
  if (scoreElement) {
    grade = await page.evaluate(el => el.textContent.trim(), scoreElement);
  }

  if (!grade || grade.trim().length === 0) {
    throw (`Did not receive a grade for ${url}`);
  }

  const htmlContent = await page.content();
    const updatedHtmlContent = htmlContent.replace(/(href|src)="(\/[^"]+)"/g,
      (_, attr, relativeUrl) => `${attr}="${new URL(relativeUrl, SECURITY_URL).href}"`);

    const tmpPath = path.join(newestFullPath, 'tmp');
    if (!fs.existsSync(tmpPath)) {
      fs.mkdirSync(tmpPath, { recursive: true });
    }
    fs.writeFileSync(path.join(tmpPath, 'securityheaders.html'), updatedHtmlContent, 'utf8');

  await executeMoveScript(url, reportDir, newestFullPath);
  await browser.close();

  console.log(`[SecurityHeaders] Grade: ${grade} (Score: ${convertGradeToScore(grade)})`);
  return convertGradeToScore(grade);
}


async function executeMoveScript(url, reportDir, newestFullPath) {
  const mvOptions = {
    script: path.join(__dirname, './mv_scraped_page.sh'),
    url: url,
    reportDir: reportDir,
    params: [newestFullPath],
    callback: () => { }
  };
  await garie_plugin.utils.helpers.executeScript(mvOptions);
}

function getMozillaScore(file, result) {
  const key = 'mozilla_score';
  const jsonContent = JSON.parse(file);

  if (!jsonContent || !jsonContent.scan) {
      throw(`Did not receive a Mozilla Http Observatory score`);
  }

  const score = jsonContent?.scan?.score;
  const grade = jsonContent?.scan?.grade;

  const normalizedScore = (grade === 'A+') ? 100 : score;

  console.log("[Mozilla Http Observatory] Score: " + normalizedScore);

  if (result === undefined) {
      result = {};
  }

  result[key] = normalizedScore;

  return result;
}

const myGetFile = async (options) => {
  const { url } = options;
  const { reportDir } = options;

  let result = {};
  let failedTests = 0;
  let report_folder_name = 'securityheaders-results'
  if (reportDir.indexOf('/on-demand/') > -1) {
    report_folder_name = path.join('on-demand', report_folder_name)
  }
  
  const newestDir = await garie_plugin.utils.helpers.newestDir({
    report_folder_name: report_folder_name,
    url: url,
    app_root: path.join(__dirname, ".."),
  });

  const newestFullPath = path.join(
    __dirname,
    "..",
    "reports",
    report_folder_name,
    garie_plugin.utils.helpers.pathNameFromUrl(url),
    newestDir
  );

  // Get MDN HTTP Observatory score
  options.fileName = 'mozilla-observatory.txt'
  var mozillaFile = await garie_plugin.utils.helpers.getNewestFile(options);
  mozillaFile = mozillaFile.toString('utf8');

  try {
    result = getMozillaScore(mozillaFile, result);
  } catch (err) {
    console.log("[Mozilla Http Observatory] Test failed:", err);
    failedTests++;
  }

  // Get SecurityHeaders score
  try {
    const score = await getSecurityHeadersScore(url, newestFullPath, reportDir);
    result["header_score"] = score;
  } catch (err) {
    console.log("[SecurityHeaders] Test failed:", err);
    failedTests++;
  }


  if (failedTests === 2) {
    console.log(`Both tests failed for ${url}`);
    throw(`Both tests failed for ${url}`);
  }

  if (failedTests > 0) {
    console.log(`One of the tests failed for ${url}`);
    console.log("Resubmit the task");
    result['partial_success'] = true;
  }

  console.log("Will insert into the database: "+ JSON.stringify(result));

  return result;
};

const myGetData = async (item) => {
  const { url } = item.url_settings;
  const requestDelay = config.plugins.securityheaders.requestDelay || 0;

  return new Promise(async (resolve, reject) => {
    try {
      await sleep(requestDelay);
      const { reportDir } = item;
      const options = {
        script: path.join(__dirname, './securityheaders.sh'),
        url: url,
        reportDir: reportDir,
        params: [],
        callback: myGetFile,
      };
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
