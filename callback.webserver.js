var http = require('http');
const {google} = require('googleapis');
const { default: magister, getSchools } = require('magister.js');
var moment = require('moment-business-days');
const fs = require('fs');

var secret = require('./secret')
const oauth2Client = new google.auth.OAuth2(
  '312564690694-duurunfnut127m50dh0j1ajlhe9oq598.apps.googleusercontent.com',
  secret.clientsecret,
  'http://localhost:8080'
);

http.createServer(function(req,res){
    req.params=params(req);
    login(req.params.code, req.params.login)
}).listen(8080);

const login = async function(code, login) {
  const {tokens} = await oauth2Client.getToken(code)
	oauth2Client.setCredentials(tokens);

	if(!fs.existsSync('db/'+school)){
		fs.mkdirSync('db/'+school);
		if(!fs.existsSync('db/'+school+'/'+username)){
			fs.mkdirSync('db/'+school+'/'+username);
		}
	} else {
		if(!fs.existsSync('db/'+school+'/'+username)){
			fs.mkdirSync('db/'+school+'/'+username);
		}
	}
	
	fs.writeFile('db/'+school+'/'+username+'/tokens.json', JSON.stringify(tokens), 'utf8', () => {
		console.log('Code saved at: db/'+school+'/'+username+'/tokens.json');
	});
	fs.writeFile('db/'+school+'/'+username+'/login.json', JSON.stringify(login), 'utf8', () => {
		console.log('Login saved at: db/'+school+'/'+username+'/login.json');
	});

  getSchools(school)
  	.then((schools) => schools[0])
  	.then((school) => magister({
  		school,
  		username: username,
  		password: password,
  	}))
  	.then((m) => {
  		m.appointments(day(-1), day(4))
  		.then((m => {
  			// pushCalendar(oauth2Client, m)
  		}))
  	}, (err) => {
  		console.error('something went wrong:', err);
  		});
}

function pushCalendar(auth, m) {
	// delEvents(auth)
	const calendar = google.calendar({version: 'v3', auth});
	for(var i = 0; m.length - 1 >= i; i++){
		if(!m[i].isCancelled){
			console.log(m[i].isCancelled)
			var event = {
				'summary': [m[i].classes[0]?toTitleCase(m[i].classes[0]):m[i].classes] + ' van ' + [m[i].teachers[0]?m[i].teachers[0].description:'niemand'],
				'location': isNaN(m[i].location)?m[i].location:'lokaal '+m[i].location,
				'description': m[i].annotation?m[i].annotation:m[i].description,
				'start': {
					'dateTime': m[i].start,
					'timeZone': 'Europe/Amsterdam',
				},
				'end': {
					'dateTime': m[i].end,
					'timeZone': 'Europe/Amsterdam',
				}
			};
			calendar.events.insert({
					auth: auth,
					calendarId: user.calendar.calendarid,
					resource: event,
				}, function(err, event) {
				if (err) {
					console.log('There was an error contacting the Calendar service: ' + err);
					return;
				}
			})
		}
	}
}

function delEvents(auth) {
	const calendar = google.calendar({version: 'v3', auth});
	calendar.events.list({
	  calendarId: user.calendar.calendarid,
	  singleEvents: true,
	  orderBy: 'startTime',
	}, (err, res) => {
	  if (err) return console.log('The API returned an error: ' + err);
	  const events = res.data.items;
	  if (events.length) {
		events.map((event, i) => {
		  calendar.events.delete({
			calendarId: user.calendar.calendarid,
			eventId: event.id
		  });
		});
	  } else {
		console.log('No upcoming events found.');
	  }
	});
}

var params=function(req){
	let q=req.url.split('?'),result={};
	if(q.length>=2){
			q[1].split('&').forEach((item)=>{
					 try {
						 result[item.split('=')[0]]=item.split('=')[1];
					 } catch (e) {
						 result[item.split('=')[0]]='';
					 }
			})
	}
	return result;
}

function day(extra) {
	if(!extra){extra = 0}
	extra = extra + 1
	return moment().businessAdd(extra)._d
}

function toTitleCase(str) {
	return str.replace(
			/\w\S*/g,
			function(txt) {
					return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
			}
	);
}