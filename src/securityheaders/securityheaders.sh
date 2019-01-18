#!/usr/bin/env bash
echo "Start getting data"

echo "Getting data for: $1"

report_location=$2/$(date +"%FT%H%M%S+0000")

mkdir -p $report_location

SECURITY_URL=${SECURITY_URL:-"https://securityheaders.com"}

try=10

while [ $try -gt 0 ]; do

    curl -I -X HEAD  "$SECURITY_URL/?q=$1&followRedirects=on" > $report_location/headers.txt

    echo "Will extract the received grade:"
    grep -iE 'x-grade: [A-Z]\+?' $report_location/headers.txt

    if [ $(grep -iEc 'x-grade: [A-Z]\+?' $report_location/headers.txt) -eq 0 ]; then
         echo "Did not receive a grade, will wait for 10 seconds, then retry"   
         sleep 10
	 try=$(( $try - 1 ))
    else
	 try=0
    fi
done

curl  -H "Content-Type:text/html"  "$SECURITY_URL/?q=$1&followRedirects=on&hide=on" > $report_location/securityheaders.html

observatory $1 --zero --format=report > $report_location/observatory.txt

echo "Received from mozilla observatory:"

grep -i score  $report_location/observatory.txt

echo "Finished getting data for: $1"

exit 0

