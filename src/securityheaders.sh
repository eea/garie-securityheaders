#!/usr/bin/env bash
echo "Start getting data"

echo "Getting data for: $1"

report_location=$2/$(date +"%FT%H%M%S+0000")

mkdir -p $report_location

url=$(echo $1 | awk -F[/:] '{print $4}')

# if null, will keep the old format
url=${url:-$1}

echo "mdn-http-observatory-scan $url > $report_location/mozilla-observatory.txt"

try=5

while [ $try -gt 0 ]; do

    mdn-http-observatory-scan $url > $report_location/mozilla-observatory.txt

    echo "Will extract the received score from mozilla observatory:"

    grep -i score:  $report_location/mozilla-observatory.txt

    if [ $(grep -ic score: $report_location/mozilla-observatory.txt) -eq 0 ]; then
         echo "Did not receive a score, will wait for 10 seconds, then retry"   
         sleep 10
	 try=$(( $try - 1 ))
    else
	 try=0
    fi
done





echo "Finished getting data for: $1"

exit 0

