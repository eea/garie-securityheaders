# Garie securityheaders plugin

<p align="center">
  <p align="center">Tool to gather securityheaders metrics and supports CRON jobs.<p>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT"></a>
  </p>
</p>

**Highlights**

The `garie-securityheaders` plugin utilizes both **SecurityHeaders.com** and **Mozilla’s HTTP Observatory** to provide website security analysis. 

**Security Headers Score**

-   Poll for http://securityheaders.com/ score on any website and stores the data into InfluxDB
    *  A+ - 100
    *  A  - 90
    *  B  - 80
    *  C  - 60
    *  D  - 40
    *  E  - 20
    *  F  - 10
    *  R  - 0
-   Saves security reports as HTML for reference.
-   Setup within minutes

**Mozilla HTTP Observatory Score**

- Uses [Mozilla’s HTTP Observatory](https://developer.mozilla.org/en-US/observatory) to perform a **security analysis** of website headers
- Runs **`mdn-http-observatory-scan`** to scan a website
- Extracts the **security score** and **grade**, storing them in the database

## Overview of garie-securityheaders

Garie-securityheaders was developed as a plugin for the [Garie](https://github.com/boyney123/garie) architecture.

[Garie](https://github.com/boyney123/garie) is an out the box web performance toolkit, and `garie-securityheaders` is a plugin that generates and stores securityheaders data into `InfluxDB`.

`Garie-securityheaders` can also run independently outside the `Garie` environment as a standalone tool.

If your interested in an out the box solution that supports multiple performance tools like `securityheaders`, `google-speed-insight` and `lighthouse` then checkout [Garie](https://github.com/boyney123/garie).

If you want to run `garie-securityheaders` as a standalone tool, follow the instructions below.

## Getting Started

### Prerequisites

-   Docker installed

### Running garie-securityheaders

You can get setup with the basics in a few minutes.

First clone the repo.

```sh
git clone git@github.com:eea/garie-securityheaders.git
```

Next setup you're config. Edit the `config.json` and add websites to the list.

```javascript
{
  "plugins":{
        "securityheaders":{
            "cron": "0 */4 * * *",
            "maxCpus": 1,
            "requestDelay": 1000
        }
    },
  "urls": [
    {
      "url": "https://www.eea.europa.eu/"
    },
    {
      "url": "https://biodiversity.europa.eu/"
    },
    {
      "url": "https://www.eionet.europa.eu/gemet/en/themes/"
    },
    {
      "url": "https://webq2test.eionet.europa.eu/"
    }
  ]
}
```

Once you finished edited your config, lets setup our environment.

```sh
docker-compose up
```

This will build your copy of `garie-securityheaders` and run the application.

On start garie-securityheaders will start to gather performance metrics for the websites added to the `config.json`.

## config.json

| Property | Type                | Description                                                                          |
| -------- | ------------------- | ------------------------------------------------------------------------------------ |
| `plugins.securityheaders.cron`   | `string` (optional) | Cron timer. Supports syntax can be found [here].(https://www.npmjs.com/package/cron) |
| `plugins.securityheaders.maxCpus`   | `number` (optional) | Limits CPU usage for security scans |
| `plugins.securityheaders.requestDelay`   | `number` (optional) | Delay (ms) between requests |
| `plugins.securityheaders.retry`   | `object` (optional) | Configuration how to retry the failed tasks |
| `plugins.securityheaders.retry.after`   | `number` (optional, default 30) | Minutes before we retry to execute the tasks |
| `plugins.securityheaders.retry.times`   | `number` (optional, default 3) | How many time to retry to execute the failed tasks |
| `plugins.securityheaders.retry.timeRange`   | `number` (optional, default 360) | Period in minutes to be checked in influx, to know if a task failed |
| `plugins.securityheaders.max_age_of_report_files`   | `number` (optional, default 365) | Maximum age (in days) for all the files. Any older file will be deleted. |
| `plugins.securityheaders.delete_files_by_type`   | `object` (optional, no default) | Configuration for deletion of custom files. (e.g. mp4 files)  |
| `plugins.securityheaders.delete_files_by_type.type`   | `string` (required for 'delete_files_by_type') | The type / extension of the files we want to delete. (e.g. "mp4"). |
| `plugins.securityheaders.delete_files_by_type.age`   | `number` (required for 'delete_files_by_type') | Maximum age (in days) of the custom files. Any older file will be deleted. |
| `urls`   | `object` (required) | Config for lighthouse. More detail below |

**urls object**

| Property | Type                | Description                         |
| -------- | ------------------- | ----------------------------------- |
| `url`    | `string` (required) | Url to get securityheaders metrics for. |

For more information please go to the [garie-plugin](https://github.com/eea/garie-plugin) repo.


