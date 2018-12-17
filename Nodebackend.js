const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});

//This is the hosted backend on GCP
//I redacted the auth keys

exports.uberdata = functions.https.onRequest((req, res) => {


  cors(req, res, () => {




   var dr = {};
   var run = require('request');
   console.log("Start");
var temp=req.query.code;
var request = require("request");
var options = { method: 'POST',
  url: 'https://login.uber.com/oauth/v2/token',
  qs:
   { client_id: 'KEY',
     client_secret: 'KEY',
     grant_type: 'authorization_code',
     redirect_uri: 'https://wustlcse204.github.io/09-final-project-jake-nathanson/review',
     code: temp },
 };
var obj;
var token;
request(options, function (error, response, body) {
  if (error) throw new Error(error);
  //console.log(body);
  obj = String(body);
  obj = JSON.parse(obj);
  if(obj.error=="invalid_grant"){

    return  res.status(200).send("invalid_grant");

  }

  obj = obj.access_token;
  token = obj;
  //console.log(obj);
  name();
  history();
});


function name(){
  var bearer='Bearer '+token;
  //console.log(bearer);
  var options = { method: 'GET',
  url: 'https://api.uber.com/v1.2/me',
  headers:
   { 'Postman-Token': '7c0762d6-1490-402c-9dc5-c0ba8a4da784',
     'cache-control': 'no-cache',
     Authorization: bearer } };
request(options, function (error, response, body) {
  if (error) throw new Error(error);
  //console.log(body);
  var firstname = JSON.parse(String(body)).first_name;
  var lastname = JSON.parse(String(body)).last_name;
  var name = firstname+" "+lastname;
  dr['full_name']=name;
  //console.log(name);
  //return  res.status(200).send(name);

});
}
var totalHistory = [];
var t18;
var t17;
function history(){

  var request = require("request");
  var bearer='Bearer '+token;
  //var totalHistory = [];
  var responseHistory;
  var responseHistorylength;
  var options = { method: 'GET',
  url: 'https://api.uber.com/v1.2/history',
  qs: { limit: '50', offset: '0' },
  headers:
   { 'Postman-Token': 'ad9ceca8-cc5a-4b42-ab16-e1c519a72965',
     'cache-control': 'no-cache',
     Authorization: bearer} };

request(options, function (error, response, body) {
  if (error) throw new Error(error);
  responseHistory = JSON.parse(String(body)).history;
  responseHistorylength = responseHistory.length;
  totalHistory = totalHistory.concat(responseHistory);
  //count = JSON.parse(String(body)).count;
  //console.log(responseHistory);
  var stringy = JSON.stringify(responseHistory);
  //console.log(JSON.stringify(responseHistory));
  //console.log(responseHistorylength);
  getMore();
});


var totalMiles;
//LETS RUN SOME BIG DATA
function dataAnalysis(){

  //TOTAL MILES TRAVELED IN LIFETIME
  var totalMiles = totalHistory.reduce(function (accumulator, totalHistory) {
  return accumulator + totalHistory.distance;
   }, 0);
  //console.log(totalMiles);
  dr['lifetime_miles']=totalMiles;



  //LETS SEGMENT DATA BY UNIX TIMESTAMP INTO 2017 and 2018
  var cities18 = [];
  var cityCount = {};
  var total18 =[];
  var total17 =[];
  for (i = 0; i < totalHistory.length; i++) {

      if(totalHistory[i].start_time>1514768400)
      {total18.push(totalHistory[i]);
       cities18.push(totalHistory[i].start_city.display_name);
      }
      else if (totalHistory[i].start_time>1483228800){
        total17.push(totalHistory[i]);
      }
}
//Lets see which cities and how many
cities18.forEach(c => {if (cityCount[c] === undefined) {cityCount[c] = 1} else  {cityCount[c] +=1}});
//console.log(cityCount);
dr['city_count']=cityCount;
//Add Total Amount of Rides to Output
dr['total_ridecount']=totalHistory.length;
dr['ridecount_2018']=total18.length;
dr['ridecount_2017']=total17.length;




//amount of miles in 2018
var miles18=0;
//LETS CALCULATE AMOUNT OF MINUTES SPENT IN A RIDE 2018 add it to the ride object and running ticker of miles for later
for (i=0; i < total18.length; i++){
  miles18 = miles18+total18[i].distance;
  var timelong = total18[i].end_time-total18[i].start_time;
  var duration = timelong/60;
  total18[i].duration = duration;
}
dr['miles_2018']=miles18;
dr['avg_miles_2018']=miles18/total18.length;

//amount of miles in 2017
var miles17=0;
//LETS CALCULATE AMOUNT OF MINUTES SPENT IN A RIDE 2017 add it to the ride object and running ticker of miles
for (i=0; i < total17.length; i++){
  miles17 = miles17+total17[i].distance;
  var timelong = total17[i].end_time-total17[i].start_time;
  var duration = timelong/60;
  total17[i].duration = duration;
}
dr['miles_2017']=miles17;
//LETS CALCULATE TOTAL AMOUNT OF MINUTES SPENT IN A RIDE 2018 STYLE
var minutes2018 = total18.reduce(function (accumulator, total18) {
return accumulator + total18.duration;
 }, 0);
//LETS CALCULATE TOTAL AMOUNT OF MINUTES SPENT IN A RIDE 2017 STYLE
var minutes2017 = total17.reduce(function (accumulator, total17) {
return accumulator + total17.duration;
 }, 0);
dr['minutes_2018']= minutes2018;
dr['avg_minutes_2018']= minutes2018/total18.length;

dr['minutes_2017']= minutes2017;
var max=0;
var min=0;
for (i=0; i < total18.length-1; i++){
  if((total18[i].start_time-total18[i+1].end_time)>max){
    max = ((total18[i].start_time-total18[i+1].end_time));
  }
  //SET MIN ON FIRST CASE
  if(i==0){min=(total18[i].start_time-total18[i+1].end_time);}
  //SET MIN
  if((total18[i].start_time-total18[i+1].end_time)<0){

  }else if((total18[i].start_time-total18[i+1].end_time)<min){
    min = ((total18[i].start_time-total18[i+1].end_time));
  }

}
dr['max_days_between_trips']=max/(3600*24);

dr['min_hours_between_trips']=(min/(3600));

//LETS SORT
total18.sort(function (a, b) {
  return parseFloat(a.duration) - parseFloat(b.duration);
});

//LETS FIND Shortest/Longest TRIP Duration
var shortestDuration = total18[0].duration;
var sdcity = total18[0].start_city.display_name;
var lp = total18.length-1;
var longestDuration =total18[lp].duration;
var ldcity = total18[lp].start_city.display_name;
dr['shortestDuration_minutes18']=shortestDuration;
dr['shortestDuration_city18']=sdcity;
dr['longestDuration_minutes18']=longestDuration;
dr['longestDuration_city18']=ldcity;

total18.sort(function (a, b) {
  return parseFloat(a.distance) - parseFloat(b.distance);
});
var shortestDistance = total18[0].distance;
dr['shortest_miles2018']=shortestDistance;
var longestDistance=total18[lp].distance;
dr['longest_miles2018']=longestDistance;
//Push to GCALENDER
var datedada = [];
for (i=0; i < total18.length; i++){
  var temparray = [];
  var date = new Date(total18[i].start_time*1000);
  temparray.push(total18[i].start_time);
  var duration =total18[i].duration;
  temparray.push(duration);
  datedada.push(temparray);
}
// console.log(datedada);
// //
dr['Cal']=datedada;

  return  res.status(200).send(JSON.stringify(dr));
  //return  res.status(200).send(String(totalMiles)+" Total Miles and In 2018, Took "+String(total18.length)+"Shortest Trip"+String(shortestDuration)+"Was in"+String(sdcity)+"Longest Trip "+String(longestDuration)+"Was in "+String(ldcity));
}


var x = 50;
function getMore(){

  if (responseHistorylength==0){
    var sendit = JSON.stringify(totalHistory);
    //console.log(JSON.stringify(totalHistory));
    //return  res.status(200).send(sendit);
    dataAnalysis();
  }

  var options1 = { method: 'GET',
    url: 'https://api.uber.com/v1.2/history',
    qs: { limit: '50', offset: x },
    headers:
     { 'Postman-Token': 'ad9ceca8-cc5a-4b42-ab16-e1c519a72965',
       'cache-control': 'no-cache',
       Authorization: bearer} };

  request(options1, function (error, response, body) {
         if (error) throw new Error(error);
          responseHistory = JSON.parse(String(body)).history;
          totalHistory = totalHistory.concat(responseHistory);
          responseHistorylength = responseHistory.length;
          //console.log(x);
          x = x+50;
          //console.log(x);
          getMore();
       });

}
}
//Returned Variables


// var totalMiles = totalHistory.reduce(function (accumulator, totalHistory) {
// return accumulator + totalHistory.distance;
// }, 0);
// console.log(totalMiles);
//return  res.status(200).send(String(sendy));

});

 });
