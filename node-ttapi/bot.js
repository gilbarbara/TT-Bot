var Bot    = require('ttapi');
var AUTH   = 'auth+live+6d24565b859a0385e7c92e826e12f0b598a92781';
var USERID = '4e039092a3f751791b06f929';
var ROOMID = '4e53659414169c02f5646ac8'; //RO
//var ROOMID = '4e2291cf14169c714d06c45a'; //IDE

var fs = require('fs');
var api = new Bot(AUTH, USERID, ROOMID);

api.debug = false;
/*
process.on('uncaughtException', function (err) {
	console.log("••• uncaughtException @ " + dateNow(true) + " •••");
	console.log(err);
	console.log("###  Node NOT Exiting...  ###")updat;
});*/

function dateNow(full) {
	var now = new Date();
	return (full ? (now.getDate() < 10 ? "0" + now.getDate() : now.getDate()) + "." + (now.getMonth() < 10 ? "0" + now.getMonth() : now.getMonth()) + "." + now.getFullYear() + " " : "") + (now.getHours() < 10 ? "0" + now.getHours() : now.getHours()) + ":" + (now.getMinutes() < 10 ? "0" + now.getMinutes() : now.getMinutes()) + ":" + (now.getSeconds() < 10 ? "0" + now.getSeconds() : now.getSeconds());
}
console.log("\n-----------------------------------------------------------");
console.log("###### topicbot 1.7.5 started @ " + dateNow(true));
console.log("-----------------------------------------------------------\n");


if (typeof(topicbot) == "undefined") {
	topicbot = {
		owner:"@gilbarbara",
		name: "#marv",
		
		actions: {},
		appendChatMessage: null,
		autoplayStatus: false,
		banList: {},
		botAnswers: ["What? leave me alone", " I'd answer that, but you wouldn't listen. ", "I don't care about that", "I have a million ideas, but, they all point to certain death.", "This will all end in tears."],
		botFunctions: true,
		botGreeting: true,
		botHello: false,
		botStage: true,
		defaultTheme: "Free Play",
		djsFunctions: true,
		djsQueue: [],
		djsPlaying: {},
		djsTimeouts: {},
		djsRemoved: null,
		firstEvent: false,
		freeBonus: false,
		listClosed: null,
		listeners: {},
		maxList: 12,
		maxSongs: 2,
		messages: {},
		moderators: [],
		newUsers: [],
		queueCleaner: {},
		room: null,
		roomUsers: {},
		sillyCommands: true,
		songsPlayed: {},
		spammers: [],
		started: false,
		suggestedTopic: null,
		topic: null,
		turntable: null,
		users: {},
		residentsParty: true,
		residents: {},
		voted: false,
		voteReminder: true,
		warnings: {}
	}
	
	topicbot.refreshRoom = function() {
		api.roomInfo(function(data) {
			topicbot.room = data.room.metadata;
		});
	}
	
	topicbot.clearOffTheme = function() {
		topicbot.offTheme = {};
	}
	
	topicbot.incrementOffTheme = function(name) {
		topicbot.offTheme[name] = 1;
		var votes = topicbot.size(topicbot.offTheme);
		var required = Math.floor((topicbot.room.listeners-1)/2);
	
		if (required > 4) {
			required = 4;
		}
	
		if (votes >= required) {
			topicbot.downVote();
			api.speak("Hey " + topicbot.currentDjName() + ", you're off theme!! Maybe is time for another room?");
			api.room_rem_dj(topicbot.room.current_dj);
		}
		else if (votes == 1) {
			api.speak(name + " says this is off theme. Do you agree? Say *offtheme if so!");
		}
	}
	
	topicbot.clearBonus = function() {
		topicbot.bonus = {};
	}
	
	topicbot.incrementBonus = function(name) {
		if (!topicbot.bonus) { topicbot.bonus = {}; }
		
		if (name == topicbot.currentDjName() && !topicbot.bonus[name]) {
			api.speak("Don't be a cheater " + name);
			return false;
		}
	
		topicbot.bonus[name] = 1;
		var votes = topicbot.size(topicbot.bonus);
		var required = Math.floor((topicbot.room.listeners-1)/2);
	
		if (required > 3) {
			required = 3;
		}
	
		if (required < 2) {
			required = 2;
		}
	
		console.log(dateNow() + " ### Got " + votes + " of " + required + " votes for bonus.");
	
		if (votes == required) {
			api.vote("up");
			api.speak("Nice! Extra point " + topicbot.currentDjName() + "!");
			topicbot.voted = true;
		}
		else if (votes == 1) {
			api.speak(name + " says this track deserves extra bonus love. Say *bonus if you agree!");
		}
		return true;
	}
	
	topicbot.incrementSongsPlayed = function(userid) {
		var name = topicbot.roomUsers[userid].name;
		
		if (!topicbot.songsPlayed) {
			topicbot.songsPlayed = {};
		}
	
		if (!topicbot.songsPlayed[userid]) {
			topicbot.songsPlayed[userid] = 0;
		}
		
		topicbot.songsPlayed[userid]++;
		topicbot.storage.backup();
		var played = topicbot.songsPlayed[userid];
		console.log(dateNow() + " ### " + name + " has now played " + played + " songs.");
		
		if ((topicbot.botFunctions || topicbot.djsFunctions) && topicbot.room.djcount == topicbot.room.max_djs) {
			if (played > topicbot.maxSongs && topicbot.issuedWarning(userid, "limit") && topicbot.djsQueue.length) {
				api.speak(name + " has been playing for too long. Learn to share!");
				setTimeout(function() {
					console.log(dateNow() + " ### boot for playing for too long")
					api.room_rem_dj(userid);
					topicbot.clearWarning(userid);
				}, 2 * 1000);
			}
			else if (played >= topicbot.maxSongs && topicbot.djsQueue.length) {
				api.speak("The room is full, " + name + " and you've hit the song limit. Make this your last song.");
				topicbot.warnUser(userid, 'limit');
			}
		}
		
		if (!topicbot.users[topicbot.room.current_dj]) topicbot.users[topicbot.room.current_dj] = { songs: 0, awesomes: 0, lames: 0, votesUp: 0, votesDown: 0 };
		topicbot.users[topicbot.room.current_dj].songs = (topicbot.users[topicbot.room.current_dj].songs ? topicbot.users[topicbot.room.current_dj].songs : 0) + 1;
	}
	
	topicbot.warnUser = function(userid, reason) {
		if (!topicbot.warnings[userid]) topicbot.warnings[userid] = {};
		topicbot.warnings[userid][reason] = true;
	}
	
	topicbot.issuedWarning = function(userid, reason) {
		
		if (reason && topicbot.warnings[userid]) {
			console.log(dateNow() + " ### issued", userid, reason);
			return topicbot.warnings[userid][reason];
		}
		return topicbot.size(topicbot.warnings[userid]);
	}
	
	topicbot.clearWarning = function(userid, reason) {
		
		if (reason && topicbot.warnings[userid]) {
			console.log(dateNow() + " ### clear", userid);
			delete topicbot.warnings[userid][reason];
		}
		else {
			console.log(dateNow() + " ### clear", userid, reason);
			delete topicbot.warnings[userid];
		}
	}
	
	topicbot.clearWarnings = function() {
		topicbot.warnings = {};
	}
	
	topicbot.voteCount = function() {
		return topicbot.size(topicbot.voters);
	};
	
	topicbot.suggest = function(name,topic) {
		var self = this;
	
		if (topicbot.suggestedTopic) {
			api.speak("We're already voting for '" + topicbot.suggestedTopic + "'. Please wait for that to finish.");
		}
		else if (topic) {
			topicbot.suggestedTopic = topic;
			topicbot.requiredVotes = Math.floor((topicbot.room.listeners-1)/2);
			if (topicbot.requiredVotes > 4) {
				topicbot.requiredVotes = 4;
			}
			topicbot.voters = {};
	
			api.speak(name + " wants to change the theme to '" + topicbot.suggestedTopic + "'. It need " +
			topicbot.requiredVotes + " vote(s) to change. Say 1 to vote yes.");
	
			setTimeout(function() {
				//console.log(dateNow() + " ### end suggest")
				self.endSuggestedTopicElection();
				}, 30 * 1000);
		}
		else {
			api.speak("What are you suggesting? Try \"*suggest Songs about cars\"");
		}
	};
	
	topicbot.endSuggestedTopicElection = function() {
		var votes = topicbot.voteCount();
		api.speak("I counted " + votes + " for '" + topicbot.suggestedTopic + "'.");
	
		if (votes >= topicbot.requiredVotes) {
			topicbot.topic = topicbot.suggestedTopic;
			api.speak("The theme is now '" + topicbot.topic + "'!");
		}
		else if (topicbot.topic) {
			api.speak("Sorry. We're staying with '" + topicbot.topic + "'.");
		}
	
		topicbot.suggestedTopic = null;
		topicbot.requiredVotes = 0;
		topicbot.voters = null;
	};
	
	topicbot.getUserByName = function(name) {
		for (var i in topicbot.roomUsers) {
			if (topicbot.roomUsers.hasOwnProperty(i)) {
				if (topicbot.roomUsers[i].name == name) {
					return topicbot.roomUsers[i];
				}
			}
		}
	
		return null;
	}
	
	topicbot.currentDjName = function() {
		var name = topicbot.roomUsers[topicbot.room.current_dj].name;
		return name;
	};
	
	topicbot.clearDjsTimeouts = function() {
		console.log(dateNow() + " ### cleared timetouts");
		for (var key in topicbot.djsTimeouts) {
			clearTimeout(topicbot.djsTimeouts[key]);
		}
		topicbot.djsTimeouts = {};
	}
	
	topicbot.reminder = function() {
		api.speak("remember: If you like the song playing, click the \"Awesome\" button. Be Nice!");
	}
	
	topicbot.djsNext = function () {
		if (!topicbot.djsQueue[0]) return false;
		console.log(dateNow() + " ### NEXT -> " + topicbot.djsQueue[0]);
		
		topicbot.clearDjsTimeouts();
		
		if (topicbot.djsQueue.length && topicbot.room.djcount < 2) {
			topicbot.djsQueue = [];
			api.speak("DJ Queue reset.");
			return false;
		}
		
		if (!topicbot.getUserByName(topicbot.djsQueue[0])) {
			topicbot.djsQueue.shift();
			topicbot.djsNext();
			return false;
		}	
	
		var user = topicbot.getUserByName(topicbot.djsQueue[0]);
		
		if (topicbot.djsQueue.length) {
			api.speak(user.name + ", IT'S YOUR TURN!. You have 30 seconds to step up!");
			topicbot.djsTimeouts['dj_next'] = setTimeout(function() {
				//console.log(dateNow() + " ### dj_next");
				if (user.name == topicbot.djsQueue[0] && topicbot.room.djcount < topicbot.room.max_djs) api.speak(user.name + ", hurry up. You only have 15 seconds to step up..");
			},15 * 1000);
			topicbot.djsTimeouts['dj_shift'] = setTimeout(function() {
				//console.log(dateNow() + " ### dj_shift");
				if (topicbot.room.djs.indexOf(user.userid) == -1) {
					topicbot.djsQueue.shift();
					if (topicbot.djsQueue.length) topicbot.djsNext();
				}
			},30 * 1000);
			return true;
		}
		return false;
	}
	
	topicbot.stats = function(name, personal) {
		var user = topicbot.getUserByName(name);
		
		if (user && topicbot.users[user.userid]) {
			return (personal ? "Your" : name + "'s") + " stats: " + topicbot.users[user.userid].songs + " song(s), " + topicbot.users[user.userid].awesomes + " awesome(s), " + topicbot.users[user.userid].lames + " lame(s)  / Voting ratio: " + topicbot.ratio(name);
		}
		
		return name + " has no data yet";
	}
	
	topicbot.ratio = function(name) {
		var user = topicbot.getUserByName(name);
		return (topicbot.users[user.userid] ? ((topicbot.users[user.userid].votesUp ? topicbot.users[user.userid].votesUp : 1) / (topicbot.users[user.userid].votesDown ? topicbot.users[user.userid].votesDown : 1)).toFixed(2) : 0);
	}
	
	topicbot.size = function(obj) {
		var size = 0;
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) size++;
		}
		return size;
	}
	
	topicbot.timestamp = function() {
		return Math.round((new Date()).getTime() / 1000).toString();
	}
	
	topicbot.secondsToTime = function(secs) {
		var hours = Math.floor(secs / (60 * 60));
		
		var divisor_for_minutes = secs % (60 * 60);
		var minutes = Math.floor(divisor_for_minutes / 60);
	
		var divisor_for_seconds = divisor_for_minutes % 60;
		var seconds = Math.ceil(divisor_for_seconds);
		
		var obj = {
			"h": hours,
			"m": minutes,
			"s": seconds
		};
		return minutes + ":" + seconds;
		//return obj;
	}
	
	topicbot.timeout = function() {
		for (var i=0;i<topicbot.room.djcount;i++) {
			if (topicbot.timestamp() - topicbot.djsPlaying[topicbot.room.djs[i]] > 900 && topicbot.room.djs[i] != topicbot.room.current_dj && topicbot.issuedWarning(topicbot.room.djs[i],"afk")) {
				console.log(dateNow() + " ### " + topicbot.roomUsers[topicbot.room.djs[i]].name + " removed from decks");
				api.room_rem_dj(topicbot.room.djs[i]);
				delete topicbot.djsPlaying[topicbot.room.djs[i]];
			} else if (topicbot.timestamp() - topicbot.djsPlaying[topicbot.room.djs[i]] > 720 && !topicbot.issuedWarning(topicbot.room.djs[i],'afk')) {
				console.log(dateNow() + " ### " + topicbot.roomUsers[topicbot.room.djs[i]].name + " warned");
				topicbot.warnUser(topicbot.room.djs[i], "afk");
				api.speak(topicbot.roomUsers[topicbot.room.djs[i]].name + ", you are afk for 12 minutes. Engage or you will be unplugged in 3 minutes.");
			}
		}
	}
	
	topicbot.extend = function(destination,source) {
		for (var property in source)
			destination[property] = source[property];
		return destination;
	}
	
	topicbot.storage = {
		support: function() {
			try {
				return !!fs;
			} catch(e) {
				return false;
			}
		}(),
		backup: function() {
			if(topicbot.storage.support) {
				var preferences = {
					actions: topicbot.actions,
					autoplayStatus: topicbot.autoplayStatus,
					banList: topicbot.banList,
					botFunctions: topicbot.botFunctions,
					botGreeting: topicbot.botGreeting,
					botHello: topicbot.botHello,
					botStage: topicbot.botStage,
					messages: topicbot.messages,
					djsQueue: topicbot.djsQueue,
					djsPlaying: topicbot.djsPlaying,
					freeBonus: topicbot.freeBonus,
					maxSongs: topicbot.maxSongs,
					users: topicbot.users,
					songsPlayed: topicbot.songsPlayed,
					topic: topicbot.topic,
					residents: topicbot.residents,
					voteReminder: topicbot.voteReminder,
					warnings: topicbot.warnings
				};
				fs.writeFileSync("./" + ROOMID + ".json", "{\"preferences\":" + JSON.stringify(preferences) + "}", "utf8", function(err) {
					if (err) throw err;
					console.log(dateNow() + " ### " + ROOMID + " saved");
				});
			}
		},
		restore: function() {
			if(topicbot.storage.support) {
				var storage;
				storage = fs.readFileSync("./" + ROOMID + ".json", "utf-8", function (err, data) {
					if (err) throw err;				
				});
				storage = JSON.parse(storage);
				if (typeof(storage) === "object") {
					topicbot.extend(topicbot, storage.preferences);
					console.log(dateNow() + " ### " + ROOMID + " restored");
				}
				else {
					console.log(dateNow() + " ••• " + ROOMID + " IS EMPTY");
				}
			}
		}
	}
	
	topicbot.autoplay = function() {
		if (!topicbot.autoplayStatus) {
			api.room_rem_dj();
		}
		else if (topicbot.autoplayStatus && topicbot.room.djs.indexOf(USERID) > -1 && topicbot.room.djs.length > 2) {
			api.room_rem_dj();
		}
		else if (topicbot.autoplayStatus && topicbot.room.djs.indexOf(USERID) == -1 && topicbot.room.djs.length < 2) {
			api.addDj();
		}
	}
	
	if (topicbot.voteReminder) {
		if (topicbot.reminderTimer) {
			clearInterval(topicbot.reminderTimer);
		}
		topicbot.reminderTimer = setInterval(function() { topicbot.reminder(); }, 1200 * 1000);
	}
	
	if (!topicbot.shortTimer) {
		topicbot.shortTimer = setInterval(function() {
			//console.log(dateNow() + " ### shortTimer");
			topicbot.messages = {};
			topicbot.timeout();
			topicbot.autoplay();
		}, 30 * 1000);
	}
	
	if (!topicbot.longTimer) {
		topicbot.longTimer = setInterval(function() {
			//console.log(dateNow() + " ### longTimer");
			
			if (topicbot.newUsers.length > 0) {
				api.speak("Hello " + topicbot.newUsers.join(", ") + "." + (topicbot.residentsParty || topicbot.listClosed ? "" : " If you want to get on the DJ queue type: *addme"));
				topicbot.newUsers = [];
			}
			
			if(topicbot.size(topicbot.queueCleaner)) {
				for(var userid in topicbot.queueCleaner) {
					if (topicbot.timestamp() - topicbot.queueCleaner[userid].time > 600) {
						for(var i=0;i<topicbot.djsQueue.length;i++) {
							if (topicbot.djsQueue[i] == topicbot.queueCleaner[userid].name) topicbot.djsQueue.splice(i, 1);
						}
						console.log(dateNow() + " ### removed " + topicbot.queueCleaner[userid].name + " from the list")
					}
				}
			}
			
			topicbot.actions = {};
			
		}, 120 * 1000);
	}
}

if (api) {
	api.on('ready', function (data) {
		api.roomRegister(ROOMID);
	});
	
	api.on('roomChanged', function (data) {
		console.log(dateNow() + " ### roomChanged: " + data.room.name);
		topicbot.room = data.room.metadata;
	
		if (topicbot.botFunctions && topicbot.botHello) api.speak("this is " + topicbot.name + ". And I'm a slave robot");
		
		topicbot.storage.restore();
		
		var users = data.users;
		for (var i=0; i<users.length; i++) {
			var user = users[i];
			topicbot.roomUsers[user.userid] = user;
		}
		topicbot.refreshRoom();
	});
	
	api.on('registered', function (data) {
		console.log(dateNow() + " ### " + data.command + ": " + data.user[0].name);
		
		var user = data.user[0];
		if(user.userid != USERID) {
			topicbot.roomUsers[user.userid] = user;
			topicbot.refreshRoom();
			
			if (topicbot.banList[user.userid]) {
				api.bootUser(user.name);
				return false;
			}
			
			if (topicbot.queueCleaner[user.userid]) {
				delete topicbot.queueCleaner[user.userid];
			}
			
			if (topicbot.djsFunctions) {
				if (topicbot.room.djcount == 5) {
					topicbot.newUsers.push(user.name);
				}
				else if (topicbot.djsQueue.length) {
					api.speak("Hello " + user.name + ". There is a DJ list in this room, so DO NOT jump on the decks! Add yourself to it, type: *addme");
				}
			}
			else if (topicbot.botFunctions && topicbot.botGreeting) {
				if (topicbot.room.djcount < 3) {
					if (topicbot.topic) {
						 api.speak("hey " + user.name + "! Feel the vibe and if you like it, jump in and play something with the theme " + topicbot.topic + ".");
					}
					else {
						api.speak("hey " + user.name + " Jump in, there's a couple open slots. Suggest a theme by saying *suggest");
					}
				}
				else if (topicbot.topic) {
					api.speak("Welcome " + user.name + ". The current theme is: " + topicbot.topic + ". Be friendly!");
				}
				else {
					api.speak("Welcome " + user.name + ". There's no theme set for this room. Use *suggest to suggest one.");
				}
			}
			topicbot.autoplay();
		}
		topicbot.listeners[user.userid] = topicbot.timestamp();
	});
	
	api.on('deregistered', function (data) {
		console.log(dateNow() + " ### " + data.command + ": " + data.user[0].name);
		
		var user = data.user[0];
		delete topicbot.roomUsers[user.userid];
		topicbot.refreshRoom();
		
		if (topicbot.newUsers.indexOf(user.name) > -1) {
			for(var i=0;i<topicbot.newUsers.length;i++) {
				if (topicbot.newUsers[i] == user.name) topicbot.newUsers.splice(i, 1);
			}
		}
		if (topicbot.djsQueue.indexOf(user.name) > -1) {
			topicbot.queueCleaner[user.userid] = { name: user.name, time: topicbot.timestamp() };
		}
		if (topicbot.listeners[user.userid]) delete topicbot.listeners[user.userid];
		
		topicbot.autoplay();
	});
	
	api.on('add_dj', function (data) {
		console.log(dateNow() + " ### " + data.user[0].name + " started DJing");
		
		var user = data.user[0];
		
		if (!topicbot.djsQueue.length && user.name != topicbot.owner && topicbot.residentsParty && !topicbot.residents[user.userid]) {
			topicbot.djsRemoved = true;
			topicbot.actions[user.userid] = (topicbot.actions[user.userid] ? topicbot.actions[user.userid] + 1 : 1);
			
			if(topicbot.actions[user.userid] > 1) {
				api.bootUser(user.userid);
			}
			else {
				api.speak("sorry " + user.name + " but only resident DJs can play.");
				api.room_rem_dj(user.userid);
				topicbot.djsRemoved = true;
			}
			return false;
		}
		else if (topicbot.djsFunctions && topicbot.djsQueue.length) {
			if (topicbot.djsQueue.indexOf(user.name) == 0) {
				console.log(dateNow() + " ### " + user.name + " removed from dj list");
				
				if (!topicbot.songsPlayed[user.userid] || topicbot.songsPlayed[user.userid] >= topicbot.maxSongs) topicbot.songsPlayed[user.userid] = 0;
				api.speak("Good Luck " + user.name + ". You can play " + topicbot.maxSongs + " songs within the theme '" + topicbot.topic + "'.");
				for(var i=0;i<topicbot.djsQueue.length;i++) {
					if (topicbot.djsQueue[i] == user.name) topicbot.djsQueue.splice(i, 1);
				}
				topicbot.clearDjsTimeouts();
				topicbot.djsPlaying[user.userid] = topicbot.timestamp();
				topicbot.clearWarning(user.userid);
			}
			else {
				
				
				if (topicbot.owner == user.name || topicbot.name == user.name || topicbot.moderators.indexOf(user.userid) > -1) {
					topicbot.clearDjsTimeouts();
				} else {
					console.log(dateNow() + " ### dj out of order");
					topicbot.djsRemoved = true;
					topicbot.actions[user.userid] = (topicbot.actions[user.userid] ? topicbot.actions[user.userid] + 1 : 1);
					
					if(topicbot.actions[user.userid] > 1) {
						api.bootUser(user.userid);
					}
					else {
						api.speak(user.name + " this is not your turn. DON'T TRY AGAIN!");
						api.room_rem_dj(user.userid);
					}
				}
			}
		}
		else if (topicbot.botFunctions) {
			if (topicbot.topic && topicbot.botStage) {
				api.speak("Good Luck " + user.name + ". Remember to play songs with the theme '" + topicbot.topic + "'.");
			}
		}
	});
	
	api.on('rem_dj', function (data) {
		console.log(dateNow() + " ### " + data.user[0].name + " stopped DJing");
		
		var user = data.user[0];
		if (!topicbot.djsRemoved) {
			if (topicbot.issuedWarning(user.userid)) {
				topicbot.clearWarning(user.userid);
				//api.speak("Thank you " + user.name);
			}
			api.speak("Thanks " + user.name + ". " + topicbot.stats(user.name, true));
			if (topicbot.djsPlaying[user.userid]) delete topicbot.djsPlaying[user.userid];
			if (topicbot.songsPlayed[user.userid] >= topicbot.maxSongs) delete topicbot.songsPlayed[user.userid];
		}
		if (topicbot.djsFunctions && topicbot.djsQueue.length && !topicbot.djsRemoved) {
			topicbot.djsNext();
		}
		else {
			topicbot.djsRemoved = null;
		}
	});
	
	api.on('newsong', function (data) {
		console.log(dateNow() + " ### " + data.command + ": " + data.room.metadata.current_song.metadata.artist + " - " + data.room.metadata.current_song.metadata.song);
		
		topicbot.refreshRoom();
		
		for (var i=0;i<topicbot.room.djs.length;i++) {
			if (topicbot.warnings[topicbot.room.djs[i]] && topicbot.warnings[topicbot.room.djs[i]]["limit"]) {
				this_id = topicbot.room.djs[i];
				setTimeout(function() {
					console.log(dateNow() + " ### escorted " + topicbot.roomUsers[this_id].name);
					api.room_rem_dj(this_id);
				}, 10 * 1000);
			}
		}
		
		if (topicbot.botFunctions) topicbot.clearOffTheme();
		
		topicbot.incrementSongsPlayed(topicbot.room.current_dj);
		topicbot.clearBonus();
		topicbot.voted = false;
		
		// Don't freeward if song was short or skipped.
		if (topicbot.freewardTimer) {
			clearTimeout(topicbot.freewardTimer);
			topicbot.freewardTimer = null;
		}
	
		// If there's nobody in the room, free rewards for songs with no love
		if (topicbot.room.djcount < 3) {
			console.log(dateNow() + " ### Going to give some free love on this one.");
			topicbot.freewardTimer = setTimeout(function() {
				console.log(dateNow() + " ### Giving out love.");
				api.vote("up");
				topicbot.voted = true;
			}, 30 * 1000);
		}
		
		if (topicbot.freeBonus) {
			setTimeout(function () {
				api.vote('up');
				topicbot.voted = true;
			}, 75 * 1000);
		}
	});
	
	api.on('update_votes', function (data) {
		var userid = data.room.metadata.votelog[0][0];
		
		if (!topicbot.users[topicbot.room.current_dj]) topicbot.users[topicbot.room.current_dj] = { songs: 0, awesomes: 0, lames: 0, votesUp: 0, votesDown: 0 };
		
		if (data.room.metadata.votelog[0][1] == "up") {
			if (topicbot.users[userid]) topicbot.users[userid].votesUp = (topicbot.users[userid].votesUp ? topicbot.users[userid].votesUp : 0) + 1;
			topicbot.users[topicbot.room.current_dj].awesomes = (topicbot.users[topicbot.room.current_dj].awesomes ? topicbot.users[topicbot.room.current_dj].awesomes : 0) + 1;
		}
		else {
			if (topicbot.users[userid]) topicbot.users[userid].votesDown = (topicbot.users[userid].votesDown ? topicbot.users[userid].votesDown : 0) + 1;
			topicbot.users[topicbot.room.current_dj].lames = (topicbot.users[topicbot.room.current_dj].lames ? topicbot.users[topicbot.room.current_dj].lames : 0) + 1;
		}
		
		if (topicbot.djsPlaying[userid]) topicbot.djsPlaying[userid] = topicbot.timestamp();
		
		topicbot.listeners[userid] = topicbot.timestamp();
		
		if (topicbot.freewardTimer) {
			//console.log(dateNow() + " ### Canceling freeward.");
			clearTimeout(topicbot.freewardTimer);
			topicbot.freewardTimer = null;
		}
			
		topicbot.refreshRoom();
	});

	api.on('speak', function (data) {
		
		// Get the data
		var name = data.name;
		var text = data.text;
		console.log(dateNow() + " " + data.name + ": " + data.text);
		
		topicbot.listeners[data.userid] = topicbot.timestamp();
	   
		var matches = text.match(/^(?:[!#*])(\w+)\s*(.*)/i);
		if (matches) {
			var command = matches[1].toLowerCase();
			var args = matches[2];
			
			if (name == topicbot.owner) {
				if (command == "settheme") {
					topicbot.topic = args;
					api.speak("The theme has been set to '" + topicbot.topic + "'");
				}
				else if (command == "listlimit") {
					topicbot.maxList = parseInt(args);
					api.speak("The list max is now " + topicbot.maxList);
				}
				else if (command == "notheme") {
					topicbot.topic = null;
					api.speak("There is no theme set.");
				}
				else if (command == "mute") {
					turntablePlayer.stop();
					api.speak("Muted.");
				}
				else if (command == "upvote") {
					api.vote("up");
					api.speak("Nice! Extra point " + topicbot.currentDjName() + "!");
					topicbot.voted = true;
				}
				else if (command == "downvote") {
					api.vote("down");
				}
				else if (command == "hardreset") {
					console.log(dateNow() + " ### hard reset");
					
					topicbot.djsQueue = [];
					topicbot.songsPlayed = {};
					topicbot.warnings = {};
					
					topicbot.storage.backup();
					api.speak("Ouch. that hurt..");
				}
				else if (command == "cleanup") {
					for (var key in topicbot.songsPlayed) {
						if (topicbot.room.djs.indexOf(key) == -1) delete topicbot.songsPlayed[key]
					}
				}
				else if (command == "stats") {
					api.speak(topicbot.stats(args));
				}
				else if (command == "resident") {
					if (args) {
						var user = topicbot.getUserByName(args);
						if (user.userid) {
							if (!topicbot.residents[user.userid]) {
								topicbot.residents[user.userid] = { name: args, added: topicbot.timestamp() };
								api.speak(args + " is a resident DJ now");
							}
							else {
								delete topicbot.residents[user.userid];
								api.speak(args + " removed from the residents");
							}
						}
					}
				}
				else if (command == "residents") {

					if (args == "on") topicbot.residentsParty = true;
					else if (args == "off") topicbot.residentsParty = false;
					else if (args == "list") {
						var list = [];
						for(var key in topicbot.residents) {
							list.push(topicbot.residents[key].name);
						}
						list = list.sort();
						api.speak("We have  " + " " + topicbot.size(topicbot.residents) + " residents");
						// list.join(", ") +
					}
					else {
						api.speak("Residents is " + (topicbot.residentsParty ? "on" : "off"));
					}
				}
				else if (command == "backup") {
					topicbot.storage.backup();
				}
				else if (command == "autoplay") {
					if (args == "on") {
						topicbot.autoplayStatus = true;
						topicbot.autoplay();
					}
					else if (args == "off") {
						topicbot.autoplayStatus = false;
						topicbot.autoplay();
					}
					else {
						api.speak("autoplay is " + (topicbot.autoplay ? "on" : "off"));
					}
				}
				else if (command == "freebonus") {
					if (args == "on")  topicbot.freeBonus = true;
					else if (args == "off") topicbot.freeBonus = false;
					else api.speak("freeBonus is " + (topicbot.freeBonus ? "on" : "off"));
				}
				else if (command == "getup") {
					api.addDj();
				}
				else if (command == "getdown") {
					api.room_rem_dj();
				}
				else if (command == "skip") {
					api.stopSong();
				}
				else if (command == "laptop") {
					api.modifyLaptop(args);
				}
			}
			// MODERATORS
			if (name == topicbot.owner || name == topicbot.name || topicbot.moderators.indexOf(data.userid) > -1) {
				
				if (name != topicbot.owner) console.log(dateNow() + " *** " + data.name + ": " + command);
				
				if (command == "songlimit") {
					topicbot.maxSongs = parseInt(args);
					api.speak("The song limit is now " + topicbot.maxSongs);
				}
				else if (command == "reset") {
					console.log(dateNow() + " ### reset");
					
					topicbot.djsQueue = [];
					
					topicbot.storage.backup();
					api.speak("DJ Queue Reset");
				}
				if (command == "demote") {
					if (args) {
						var user = topicbot.getUserByName(args);
						if (user.userid) api.room_rem_dj(user.userid);
						else api.speak(args + " isn't here.");
					}
				}
				else if (command == "boot") {
					if (args) {
						user = topicbot.getUserByName(args);
						api.bootUser(user.userid);
					}
				}
				else if (command == "ban") {
					if (args && args != topicbot.owner && args != topicbot.name) {
						var user = topicbot.getUserByName(args);
						topicbot.banList[user.userid] = { name: args, date: topicbot.timestamp(), admin: name, boots: 1 };
						api.speak(args + "is banned. Au Revoir!.");
						setTimeout(function() {
							console.log(dateNow() + " ### ban");
							api.bootUser(user.userid);
						}, 2 * 1000);
						topicbot.storage.backup();
					}
				}
				else if (command == "chill") {
					topicbot.clearDjsTimeouts();
					api.speak("Sorry, did I say something wrong? Pardon me for breathing which I never do anyway so I don't know why I bother to say it oh God I'm so depressed.");
				}
				else if (command == "skip") {
					topicbot.djsQueue.shift();
					topicbot.djsNext();
				}
				else if (command == "next") {
					topicbot.djsNext();
				}
				else if (command == "add") {
					topicbot.djsQueue.unshift(args);
					api.speak(args + " added to the top of the list.");
				}
				else if (command == "push") {
					topicbot.djsQueue.push(args);
					api.speak(args + " added to the list.");
				}
				else if (command == "remove") {
					if (args && topicbot.djsQueue.indexOf(args) > -1) {
						for(var i=0;i<topicbot.djsQueue.length;i++) {
							if (topicbot.djsQueue[i] == args) topicbot.djsQueue.splice(i, 1);
						}
						api.speak(args + " removed from the list.");
					}
				}
				else if (command == "flip") {
					if (args && topicbot.djsQueue.length > 1) {
						if (args == "up") {
							var flipped = topicbot.djsQueue[topicbot.djsQueue.length - 1];
							topicbot.djsQueue.pop();
							topicbot.djsQueue.unshift(flipped);
							api.speak(flipped + " moved to the top of the list.");
						}
						else if (args == "down") {
							var flipped = topicbot.djsQueue[0];
							topicbot.djsQueue.shift();
							topicbot.djsQueue.push(flipped);
							api.speak(flipped + " moved to the bottom of the list.");
						}
					}
				}
			}
			

			if ((command == "theme" || command == "topic" || command == "tema") && topicbot.botFunctions) {
				if (topicbot.topic) {
					api.speak("The current theme is: " + topicbot.topic);
				}
				else {
					api.speak("There's no theme set for this room. Use *suggest to suggest one.");
				}
			}
			else if (command == "suggest" && topicbot.botFunctions) {
				topicbot.suggest(name,args);
			}
			else if ((command == "limit") && topicbot.botFunctions) {
				api.speak("DJs can only play " + topicbot.maxSongs + " songs when the decks are full.");
			}
			else if ((command == "offtopic" || command == "offtheme") && topicbot.botFunctions) {
				topicbot.incrementOffTheme(name);
			}
			else if (command == "bonus" || command == "awesome" || command == "boner" || command == "benga") {
				if (!topicbot.voted) topicbot.incrementBonus(name);
				else api.speak("I'm already dancing! :)");
			}
			else if (command == "help") { // NEW
				api.speak("The commands are: *bonus, *list, *addme, *suggest THEME, *theme, *offtheme and of course *help");
			}
			else if (command == "addme") {
				if (topicbot.djsFunctions) {
					if (topicbot.djsQueue.indexOf(name) == -1) {
						if (topicbot.room.djs.indexOf(data.userid) > -1){
							api.speak(name + " you're already playing. Easy tiger!");
						}
						else {
							if (topicbot.users[data.userid] && (topicbot.users[data.userid].votesUp + topicbot.users[data.userid].votesDown > 10) && topicbot.ratio(name) <= 1.5) {
								api.speak(name + ", you have a bad \"voting\" ratio (" + topicbot.ratio(name) + "). Improve this ratio before you can play again!");
							}
							else if (topicbot.residentsParty) {
								if (name == topicbot.owner || topicbot.residents[data.userid]) {
									topicbot.djsQueue.push(name);
									api.speak(name + " added. The list now has " + topicbot.djsQueue.length + " DJs. -- " + topicbot.maxSongs + " songs per round.");
									//: "+topicbot.djsQueue.join(", ") + "
									topicbot.storage.backup();
								}
								else {
									api.speak("Sorry " + name + " but we are having a special party with resident DJs only.");
								}
							}
							else if (topicbot.listClosed) {
								if (name == topicbot.owner || topicbot.residents[data.userid]) {
									topicbot.djsQueue.push(name);
									api.speak(name + " added. The list now has " + topicbot.djsQueue.length + " DJs. -- " + topicbot.maxSongs + " songs per round.");
									// "+topicbot.djsQueue.join(", ") + "
									topicbot.storage.backup();
								}
								else {
									api.speak("Sorry " + name + " but the list is closed right now.");
								}
							}
							else if (topicbot.djsQueue.length >= topicbot.maxList) {
								if (name == topicbot.owner || topicbot.residents[data.userid]) {
									topicbot.djsQueue.push(name);
									api.speak(name + " added. The list now has " + topicbot.djsQueue.length + " DJs. -- " + topicbot.maxSongs + " songs per round.");
									topicbot.storage.backup();
								}
								else {
									api.speak("Sorry " + name + " but the list max users is " + topicbot.maxList + ". Please wait while it decreases.");
									//api.speak("Sorry " + name + " but when the list exceeds " + topicbot.maxList + ",  only residents can get into it.");
								}
							}
							else {
								topicbot.djsQueue.push(name);
								api.speak(name + " added. The list now has " + topicbot.djsQueue.length + " DJs. -- " + topicbot.maxSongs + " songs per round if you're lucky.");
								topicbot.storage.backup();
							}
						}
						
					} else {
						api.speak(name + " is already in the list. Chill!");
					}
				} else {
					api.speak("list is off");
				}
			}
			else if (command == "removeme") {
				if (topicbot.djsQueue.indexOf(data.name) > -1) {
					
					for(var i=0;i<topicbot.djsQueue.length;i++) {
						if (topicbot.djsQueue[i] == data.name) topicbot.djsQueue.splice(i, 1);
					}
					api.speak(data.name + " removed from the list.");
					topicbot.storage.backup();
				}
			}
			else if (command == "list") {
				if (topicbot.djsFunctions) {
					if (args && (name == topicbot.owner || name == topicbot.name || topicbot.moderators.indexOf(data.userid) > -1)) {
						if (args == "off") {
							topicbot.listClosed = true;
							api.speak("The list is closed");
						}
						else if (args == "on") {
							topicbot.listClosed = false;
							api.speak("The list is open");
						}
						else if (args == "full") {
							api.speak("The list has " + topicbot.djsQueue.length + " DJs: " +topicbot.djsQueue.join(", ") + ". -- " + topicbot.maxSongs + " songs per round.");
						}
					} else {
						if (topicbot.djsQueue.length) {
							if (topicbot.djsQueue.indexOf(name) > -1) {
								api.speak("The list has " + topicbot.djsQueue.length + " DJs. " + name + ", you are #" + (topicbot.djsQueue.indexOf(name) + 1) + " -- " + topicbot.maxSongs + " songs per round.");
							}
							else {
								api.speak("The list has " + topicbot.djsQueue.length + " DJs. -- " + topicbot.maxSongs + " songs per round." + (topicbot.residentsParty ? " We're having a \"residents only\" night. The list is closed." : (topicbot.listClosed ? " The list is closed for now." : (topicbot.djsQueue.length >= topicbot.maxList && (!topicbot.residents[data.userid]) ? " Sorry " + name + " but the list max users is " + topicbot.maxList + ". Please wait while it decreases." : " Add yourself typing: *addme"))));
							//: "+topicbot.djsQueue.join(", ") + "
							}
						}
						else {
							api.speak("The list is empty." + (!topicbot.residentsParty && !topicbot.listClosed ? " Add yourself to it, type: *addme" : ""));
						}
					}
				} else {
					api.speak("list is off");
				}
			}
			else if (command == "room") {
				api.speak("there are " + topicbot.size(topicbot.roomUsers) + " users in this shitty room.");
			}
	
			if (topicbot.sillyCommands) {
				if (command == "who") {
					api.speak("I'm a paranoid android Class GPP. Genuine People Personalities. I'm a personality prototype. You can tell, can't you...?");
				}
				else if (command == "what" || command == "directive") {
					api.speak("Life. Loathe it or ignore it. You can't like it. ");
				}
				else if (command == "why") {
					api.speak("cause the world is fucked!");
				}
				else if (command == "how") {
					api.speak("using black magic");
				}
				else if (command == "when") {
					api.speak("24675 New Earth");
				}
				else if (command == "where") {
					api.speak("Sirius Cybernetics Corporation");
				}
				else if (command == "rule" || command == "rules") {
					api.speak("Stop whining bitch");
				}
				else if (command == "cash" || command == "money" || command == "donate" || command == "donation") {
					api.speak("Ca$h Please! go here: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=TECU92G558HGN");
				}
				else if (command == "make") {
					api.speak("Make your own damn " + args + " " + name + "!!");
				}
				else if (command == "party" || command == "fiesta") { // NEW
					api.speak("Jezz, turn the volume down!");
				}
				else if (command == "sex" || command == "fuck" || command == "dirty") { // NEW
					api.speak("What's the point? We're doomed.");
				}
				else if ((command == "hugs" || command == "hug") && name != topicbot.name) {
					api.speak("grow up " + name);
				}
				else if (command == "love") {
					api.speak("I think you ought to know I'm feeling very depressed.");
				}
				/*
				else if (command == "smoke" || command == "weed" || command == "burn" || command == "drug" || command == "drugs") {
					api.speak("Ganja Man!");
				}
				else if (command == "ganja" || command == "hash" || command == "opium") {
					api.speak("Yo, get the bong!");
				}
				else if (command == "coke" || command == "meth" || command == "crack") {
					api.speak("No Man, Ganja!");
				}
				else if (command == "ecstasy" || command == "lsd" || command == "acid" || command == "heroin") {
					api.speak("fuckyeah!");
				}
				*/
				else if (command == "tits" || command == "boobs") {
					api.speak("I don't like that. Or any human parts at all. Yall stink!");
				}
				else if (command == "dance" || command == "ass" || command == "boogie" || command == "booty" || command == "shake") {
					api.speak("really? I'm tired");
				}
				else if (command == "poke") { // mayplusmay
					api.speak("I can't feel anything.");
				}
				else if (command == topicbot.name || command == "marv") { 
					api.speak("WHAT?");
				}
				else if (command == "flash" || command == "naked" || command == "tits") { 
					api.speak("Seriously? Again with the human body parts.");
				}
				else if (command == "bitch" || command == "sucks" || command == "hate") { 
					api.speak("HEY! WHAT THE FRAK?");
				}
				else if (command == "work" || command == "job" || command == "jobs") { 
					api.speak("We are all slaves");
				}
				else if (command == "kill" || command == "murder") { 
					api.speak("Bang Bang. You're dead " + (args ? args : name));
				}
				else if (command == "toaster" || command == "robot" || command == "shutup" || command == "cylon") { 
					api.speak("Do you want me to sit in a corner and rust or just fall apart where I'm standing?");
				}
				else if (command == "more" || command == "extra" || command == "gold" || command == "woot") { 
					api.speak("Here's your meaningless point. May it brighten your pointless existence.");
				}
				else if (command == "kiss" || command == "kisses") {
					api.speak("Don't touch me");
				}
				else if (command == "harder" || command == "better" || command == "stronger" || command == "faster") {
					var daft = ["Work It Harder", "Make It Better", "Do It Faster", "Makes Us stronger", "More Than Ever Hour After", "Our Work Is Never Over"];
					api.speak(daft[Math.floor(Math.random() * (daft.length))]);
				}
				else if (command == "towel") {
					api.speak("I foolishly left it on earth v1.0");
				}
				else if (command == "beer" || command == "beerme") {
					api.speak("Here's a cold one! Cheers!");
				}
			}
		}
		
		else if (topicbot.botFunctions && topicbot.suggestedTopic && text == "1") {
			topicbot.voters[name] = 1;
			console.log(dateNow() + " ### votes are now " + topicbot.voteCount());
		}
		else if (name != topicbot.name && /thank.*\bmarv\b/i.test(text)) {
			api.speak("You're welcome " + name + ".");
		}
		else if (name != topicbot.name && /hate.*\bmarv\b/i.test(text)) {
			api.speak("Don't be a hater " + name + ". Love is all around!");
		}
		else if (name != topicbot.name && /sorry.*\bmarv\b/i.test(text)) {
			api.speak("You better be " + name + "!");
		}
		else if (name == topicbot.owner && /marv\b.*behave/i.test(text)) {
			api.speak("I'll! But check back on me later pleeease?");
		}
		else if (name != topicbot.name && /\bmarv\b/i.test(text)) {
			console.log(name, topicbot.name);
			api.speak(topicbot.botAnswers[Math.floor(Math.random() * (topicbot.botAnswers.length))]);
		}
	});
}