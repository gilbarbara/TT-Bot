if (typeof(topicbot) == "undefined") {
	topicbot = {
		owner:"@gilbarbara",
		name: "#EVE",
		
		actions: {},
		appendChatMessage: null,
		autoplayStatus: false,
		banList: {},
		botAnswers: ["you realize that I'm a robot, right? We don't talk much.", "are you talking to me? I couldn't find my sound module today.", "I'm here", "Yes my dear?", "sorry, it has been a long day and I didn't catch that."],
		botCalls: {},
		botFunctions: true,
		botGreeting: true,
		botHello: true,
		botStage: true,
		defaultTheme: "Free Play",
		djsFunctions: true,
		djsQueue: [],
		djsPlaying: {},
		djsTimeouts: {},
		djsRemoved: null,
		firstEvent: false,
		freeBonus: null,
		listClosed: null,
		listeners: {},
		maxList: 12,
		maxSongs: 2,
		messages: {},
		moderators: ["4e2dcae44fe7d015eb006309", "4e166547a3f751697809115c", "4e29ee2fa3f7515147067ff3", "4e1b54174fe7d0313f05781e"],
		newUsers: [],
		queueCleaner: {},
		reloadUrl: "http://code.gilbarbara.com/topicbot/js/topicbot.js",
		room: null,
		roomManager: null,
		sendMessageName: null,
		sillyCommands: true,
		similarRunning: false,
		songsPlayed: {},
		spammers: [],
		started: false,
		suggestedTopic: null,
		topic: null,
		topViewController: null,
		turntable: null,
		users: {},
		residentsParty: false,
		residents: {},
		voted: false,
		voteReminder: false,
		warnings: {}
	};
}

topicbot.version = "1.7.3 (github commit)";

topicbot.start = function() {
	console.log("topicbot version " + this.version + " starting..");
	this.started = true;
	this.startLocation = location.pathname;
	
	turntablePlayer.stop();
	$(".mute_btn:eq(0)").trigger("click");

	var self = this;
	
	var wrong = ["flushUnsentMessages", "setSocketAddr", "initIdleChecker", "getHashedAddr", "whenSocketConnected", "seedPRNG"];
	for(var x in turntable){
		if (typeof(turntable[x]) === "object"){
			for(var y in turntable[x]){
				if(typeof(turntable[x][y])==="string" && y==="roomId" && turntable[x].roomId.length > 0) {
					topicbot.topViewController = x;
					break;
				}
			}
		} else if (typeof(turntable[x]) == "function") {
			var match = x.match(/[A-Z]/g);
			if(topicbot.size(match) > 1 && x.indexOf("Listener") == -1 && wrong.indexOf(x) == -1) topicbot.sendMessageName = x;
		}
	}
	
	if (topicbot.topViewController !== null) {
		for(var x in turntable[topicbot.topViewController]) {
			if (typeof(turntable[topicbot.topViewController][x]) === "object") {
				for(var y in turntable[topicbot.topViewController][x]) {
					if(typeof(turntable[topicbot.topViewController][x][y])==="string" && y==="myuserid" && turntable[topicbot.topViewController][x].myuserid.length > 0) {
						topicbot.roomManager = turntable[topicbot.topViewController][x];
						break;
					}
				}
			}
		}
	}
	
	var timer = setInterval(function() {
		console.log("looking for turntable..");
		if (typeof(turntable[topicbot.topViewController]) != "undefined" && turntable[topicbot.topViewController] != null) {
			clearInterval(timer);
			
			setTimeout(function() {
				self.init();
			}, 3 * 1000);
		}
	},500);
};

topicbot.init = function() {
	console.log("init");
	
	var self = this;
	this.turntable = turntable;
	this.room = turntable[this.topViewController];

	this.turntable.addEventListener("message", function(msg) { self.onMessage(msg); });

	this.appendChatMessage = this.room.appendChatMessage;		
	this.room.appendChatMessage = function(f,a,h,c) {
		self.appendChatMessage(f,a,h,c);
		self.onSpeak(a,h);
	};
	
	this.storage.restore();
	
	this.firstEventTimer = setInterval(function() {
		console.log("Checking to see if we're alive.");
		
		if (!self.firstEvent) {
			console.log("No events heard yet. Let's reload.");
			self.room.reconnectListener();
		}
		else {
			console.log("Looking good.");
			clearInterval(self.firstEventTimer);
			self.firstEventTimer = null;
		}
	}, 15 * 1000);
	
	this.ui.init();
	this.residentsExtended();
	
	if(this.defaultTheme && !this.topic) this.topic = this.defaultTheme;
};

topicbot.refreshRoom = function() {
	console.log("Refreshing room.");
	this.room.loadRoomState();
}

topicbot.onMessage = function(msg) {
	if (!this.firstEvent) {
		this.firstEvent = true;
		if (this.botFunctions && this.botHello) this.say("OHAI! I'm " + this.name + ". I'll help us keep the mood in this room.");
	}
	
	if (msg.command) {
		console.log(msg.command);
		
		if (msg.command == "registered") {
			if (this.banList[msg.user[0].userid]) {
				this.banList[msg.user[0].userid].boots += 1;
				this.bootUser(msg.user[0].name, true);
				return false;
			}
			
			if (this.queueCleaner[msg.user[0].userid]) {
				delete this.queueCleaner[msg.user[0].userid];
			}
			
			if (this.djsFunctions) {
				if (this.decksAreFull()) {
					this.newUsers.push(msg.user[0].name);
				}
				else if (this.djsQueue.length) {
					this.say("Hello " + msg.user[0].name + ". There is a DJ list in this room, so DO NOT jump on the decks!");
					// + (!this.residentsParty && !this.listClosed ? " Add yourself to it, type: *addme" : "")
				}
			}
			else if (this.botFunctions && this.botGreeting) {
				if (this.room.djIds.length < 3) {
					if (this.room.djIds.length == 0) {
						this.topic = this.defaultTheme ? this.defaultTheme : null;
					}
					if (this.topic) {
						 this.say("hey " + msg.user[0].name + "! Feel the vibe and if you like it, jump in and play something with the theme " + this.topic + ".");
					}
					else {
						this.say("hey " + msg.user[0].name + " Jump in, there's a couple open slots. Suggest a theme by saying *suggest");
					}
				}
				else if (this.topic) {
					this.say("Welcome " + msg.user[0].name + ". The current theme is: " + this.topic + ". Be friendly!");
				}
				else {
					this.say("Welcome " + msg.user[0].name + ". There's no theme set for this room. Use *suggest to suggest one.");
				}
			}
			
			this.listeners[msg.user[0].userid] = this.timestamp();
			this.residentsExtended();
			this.autoplay.init();
		}
		else if (msg.command == "deregistered") {
			if (this.newUsers.indexOf(msg.user[0].name) > -1) {
				this.newUsers = $.map(this.newUsers, function(n,i) {
					return (n == msg.user[0].name ? null : n);
				});
			}
			if (this.djsQueue.indexOf(msg.user[0].name) > -1) {
				this.queueCleaner[msg.user[0].userid] = { name: msg.user[0].name, time: this.timestamp() };
			}
			if (this.listeners[msg.user[0].userid]) delete this.listeners[msg.user[0].userid];
			this.residentsExtended();
		}
		else if (msg.command == "newsong") {
			setTimeout(function() {
				turntablePlayer.stop();
			}, 2000);
			
			for (var i=0;i<this.room.djIds.length;i++) {
				if (this.warnings[this.room.djIds[i]] && this.warnings[this.room.djIds[i]]["limit"]) {
					this_id = this.room.djIds[i];
					setTimeout(function() {
						topicbot.roomManager.callback("remove_dj", this_id);
					}, 10 * 1000);
				}
			}

			this.incrementSongsPlayed();
			this.clearBonus();
			this.voted = false;
			
			if (this.botFunctions) this.clearOffTheme();
			
			this.storage.backup();
			this.ui.refresh();
			this.autoplay.init();

			// Don't freeward if song was short or skipped.
			if (this.freewardTimer) {
				clearTimeout(this.freewardTimer);
				this.freewardTimer = null;
			}

			// If there's nobody in the room, free rewards for songs with no love
			if (this.room.djIds.length < 3) {
				console.log("Going to give some free love on this one.");
				this.freewardTimer = setTimeout(function() { console.log("Giving out love."); topicbot.upVote(); }, 30000);
			}
			
			if (this.freeBonus) {
				setTimeout("topicbot.upVote();", 75 * 1000);
			}
			
			this.ui.refresh();
		}
		else if (msg.command == "add_dj") {
			this.hiDj(msg.user[0]);
			this.autoplay.init();
		}
		else if (msg.command == "rem_dj") {
			this.byeDj(msg.user[0]);
			this.autoplay.init();
			if (this.djsFunctions && this.djsQueue.length && !this.djsRemoved) {
				this.djsNext();
			}
			else {
				this.djsRemoved = null;
			}
		}
		else if (msg.command == "update_votes") {
			
			var userid = msg.room.metadata.votelog[0][0];
			if (msg.room.metadata.votelog[0][1] == "up") {
				if (this.users[userid]) this.users[userid].votesUp = (this.users[userid].votesUp ? this.users[userid].votesUp : 0) + 1;
				this.users[this.room.currentDj].awesomes = (this.users[this.room.currentDj].awesomes ? this.users[this.room.currentDj].awesomes : 0) + 1;
			}
			else {
				if (this.users[userid]) this.users[userid].votesDown = (this.users[userid].votesDown ? this.users[userid].votesDown : 0) + 1;
				this.users[this.room.currentDj].lames = (this.users[this.room.currentDj].lames ? this.users[this.room.currentDj].lames : 0) + 1;
			}
			
			if (this.djsPlaying[userid]) this.djsPlaying[userid] = this.timestamp();
			
			//console.log("hello", msg);
			// Song got love or was hated. No reward.
			if (this.freewardTimer) {
				console.log("Canceling freeward.");
				clearTimeout(this.freewardTimer);
				this.freewardTimer = null;
			}
			this.listeners[userid] = this.timestamp();
			
		}
		else if (msg.command == "speak") {
			this.listeners[msg.user[0].userid] = this.timestamp();
		}
	}
};

topicbot.clearOffTheme = function() {
	this.offTheme = {};
};

topicbot.currentDjName = function() {
	var name = this.room.users[this.room.currentDj].name;
	return name;
};

topicbot.incrementOffTheme = function(name) {
	this.offTheme[name] = 1;
	var votes = this.keyCount(this.offTheme);
	var required = Math.floor((this.userCount()-1)/2);

	if (required > 4) {
		required = 4;
	}

	if (votes >= required) {
		this.downVote();
		this.say("Hey " + this.currentDjName() + ", you're off theme!! Maybe is time for another room?");
		this.roomManager.callback("remove_dj", this.room.currentDj);
	}
	else if (votes == 1) {
		this.say(name + " says this is off theme. Do you agree? Say *offtheme if so!");
	}
}

topicbot.clearBonus = function() {
	this.bonus = {};
}

topicbot.incrementBonus = function(name) {
	if (!this.bonus) { this.bonus = {}; }
	
	if (name == this.currentDjName() && !this.bonus[name]) {
		this.say("Don't be a cheater " + name);
		return false;
	}

	this.bonus[name] = 1;
	var votes = this.keyCount(this.bonus);
	var required = Math.floor((this.userCount()-1)/2);

	if (required > 3) {
		required = 3;
	}

	if (required < 2) {
		required = 2;
	}

	console.log("Got " + votes + " of " + required + " votes for bonus.");

	if (votes == required) {
		this.upVote();
		this.say("Nice! Extra point " + this.currentDjName() + "!");
	}
	else if (votes == 1) {
		this.say(name + " says this track deserves extra love. Say *bonus if you agree!");
	}
}

topicbot.hiDj = function(user) {
	console.log(user.name + " started DJing");

	if (this.djsFunctions && this.djsQueue.length) {
		if (this.djsQueue.indexOf(user.name) == 0) {
			console.log(user.name + " removed from dj list");
			
			if (!this.songsPlayed[user.userid] || this.songsPlayed[user.userid] >= this.maxSongs) this.songsPlayed[user.userid] = 0;
			this.say("Good Luck " + user.name + ". You can play " + this.maxSongs + " songs. The next on the list is: " + this.djsQueue[1]);
			this.djsQueue = $.map(this.djsQueue, function(n, i){
				return (n == user.name ? null : n);
			});
			this.clearDjsTimeouts();
			this.djsPlaying[user.userid] = this.timestamp();
			this.clearWarning(user.userid);
		}
		else {
			console.log("dj out of order");
			
			if (this.owner == user.name || this.name == user.name || this.moderators.indexOf(user.userid) > -1) {
				this.clearDjsTimeouts();
			} else {
				this.djsRemoved = true;
				this.actions[user.userid] = (this.actions[user.userid] ? this.actions[user.userid] + 1 : 1);
				
				if(this.actions[user.userid] > 1) {
					this.bootUser(user.name, true);
				}
				else {
					this.say(user.name + " this is not your turn. DON'T TRY AGAIN!");
					this.roomManager.callback("remove_dj", user.userid);
				}
			}
		}
	}
	else if (this.botFunctions) {
		if (this.topic && this.botStage) {
			this.say("Good Luck " + user.name + ". Remember to play songs with the theme '" + this.topic + "'.");
		}
	}
}

topicbot.byeDj = function(user) {
	console.log(user.name + " stopped DJing");
	if (!this.djsRemoved) {
		if (this.issuedWarning(user.userid)) {
			this.clearWarning(user.userid);
			//this.say("Thank you " + user.name);
		}
		this.say("Thanks " + user.name + ". " + this.stats(user.name, true));
		if (this.djsPlaying[user.userid]) delete this.djsPlaying[user.userid];
		if (this.songsPlayed[user.userid] >= this.maxSongs) delete this.songsPlayed[user.userid];
		this.ui.refresh();
	}
}

topicbot.incrementSongsPlayed = function() {
	var userid = this.room.currentDj;
	var name = this.room.users[userid].name;

	if (!this.songsPlayed) {
		this.songsPlayed = {};
	}

	if (!this.songsPlayed[userid]) {
		this.songsPlayed[userid] = 0;
	}
	
	this.songsPlayed[userid]++;
	this.storage.backup();
	var played = this.songsPlayed[userid];
	console.log(name + " has now played " + played + " songs.");
	
	if ((this.botFunctions || this.djsFunctions) && this.decksAreFull()) {
		if (played > this.maxSongs && this.issuedWarning(userid, "limit") && this.djsQueue.length) {
			this.say(name + " has been playing for too long. Learn to share!");
			setTimeout(function() {
				topicbot.bootUser(name);
				topicbot.clearWarning(userid);
			}, 2 * 1000);
			
		}
		else if (played >= this.maxSongs && this.djsQueue.length) {
			//this.say("The room is full, " + name + " and you've hit the song limit. Make this your last song.");
			this.warnUser(userid, 'limit');
		}
	}
	
	if (!this.users[this.room.currentDj]) this.users[this.room.currentDj] = { songs: 0, awesomes: 0, lames: 0, votesUp: 0, votesDown: 0 };
	this.users[this.room.currentDj].songs = (this.users[this.room.currentDj].songs ? this.users[this.room.currentDj].songs : 0) + 1;
}

topicbot.warnUser = function(userid, reason) {
	if (!this.warnings[userid]) this.warnings[userid] = {};
	this.warnings[userid][reason] = true;
}

topicbot.issuedWarning = function(userid, reason) {
	console.log("issued", userid, reason);
	if (reason && this.warnings[userid]) return this.warnings[userid][reason];
	return this.size(this.warnings[userid]);	
}

topicbot.clearWarning = function(userid, reason) {
	console.log("clear", userid, reason);
	if (reason && this.warnings[userid]) delete this.warnings[userid][reason];
	else delete this.warnings[userid];
}

topicbot.clearWarnings = function() {
	this.warnings = {};
}

topicbot.decksAreFull = function() {
	return (this.room.djIds.length == this.room.maxDjs && this.userCount() > this.room.maxDjs + 1);
}

topicbot.onSpeak = function(name,text) {
	if (/^: /.test(text)) {
		this.onChat(name,text.replace(/^: /,''));
	}
};

topicbot.keyCount = function(o) {
	var count = 0;

	for (var i in o) {
		if (o.hasOwnProperty(i)) {
			count++;
		}
	}

	return count;
};

topicbot.userCount = function() {
	return this.keyCount(this.room.users);
};

topicbot.voteCount = function() {
	return this.keyCount(this.voters);
};

topicbot.setTheme = function(theme) {
	this.topic = theme;
	console.log("Theme set to '" + this.topic + "'");
};

topicbot.reload = function() {
	$("script[src*='" + topicbot.reloadUrl + "']").remove();
	var script = document.createElement("script");
	script.src = topicbot.reloadUrl + "?v=" + Math.random();
	document.body.appendChild(script);
	this.ui.destroy();
	this.ui.init();
};

topicbot.suggest = function(name,topic) {
	var self = this;

	if (this.suggestedTopic) {
		this.say("We're already voting for '" + this.suggestedTopic + "'. Please wait for that to finish.");
	}
	else if (topic) {
		this.suggestedTopic = topic;
		this.requiredVotes = Math.floor((this.userCount()-1)/2);
		if (this.requiredVotes > 4) {
			this.requiredVotes = 4;
		}
		this.voters = {};

		this.say(name + " wants to change the theme to '" + this.suggestedTopic + "'. It need " +
		this.requiredVotes + " vote(s) to change. Say 1 to vote yes.");

		setTimeout(function() { self.endSuggestedTopicElection(); }, 30 * 1000);
	}
	else {
		this.say("What are you suggesting? Try \"*suggest Songs about cars\"");
	}
};

topicbot.onChat = function(name,text) {
	console.log("<" + name + "> " + text);
	var self = this, spam;
	var user = this.getUserByName(name);
	
	this.messages[name] = (this.messages[name] ? this.messages[name] : 0) + 1;
	var messager = this.getUserByName(name);
	if (name != this.name && this.messages[name] > 6 && !spam) {
		spam = true;
		
		if (this.spammers[messager.id]) this.banList[messager.id] = { name: name, date: this.timestamp(), admin: "system", boots: 1 };
		else this.spammers[messager.id] = 1;
		
		this.bootUser(name);
		spam = false;
		
		return false;
	}
	
	if (this.djsPlaying[user.userid]) this.djsPlaying[user.userid] = this.timestamp();
	
	var matches = text.match(/^(?:[!#*])(\w+)\s*(.*)/i);
	if (matches) {
		var command = matches[1];
		var args = matches[2];
		console.log(command);
		
		
		if (name == this.owner || name == this.name) {
			if (command == "settheme") {
				this.setTheme(args);
				this.say("The theme has been set to '" +this.topic + "'");
			}
			else if (command == "listlimit") {
				this.maxList = parseInt(args);
				this.say("The list max is now " + this.maxList);
			}
			else if (command == "notheme") {
				this.topic = null;
				this.say("There is no theme set.");
			}
			else if (command == "reload") {
				this.reload(args);
				setTimeout(function() {
					topicbot.say("I am now version " + topicbot.version);
				}, 3 * 1000);
			}
			else if (command == "mute") {
				turntablePlayer.stop();
				this.say("Muted.");
			}
			else if (command == "upvote") {
				this.upVote();
				this.say("Nice! Extra point " + this.currentDjName() + "!");
			}
			else if (command == "downvote") {
				this.downVote();
			}
			else if (command == "hardreset") {
				this.storage.backup();
				location.href = "http://" + location.host + this.startLocation;
			}
			else if (command == "reset") {
				this.djsQueue = [];
				this.songsPlayed = {};
				this.warnings = {};
				this.djsPlaying = {};
				this.say("Ouch. that hurt..");
			}
			else if (command == "cleanup") {
				for (var key in this.songsPlayed) {
					if (this.room.djIds.indexOf(key) == -1) delete this.songsPlayed[key]
				}
				this.ui.refresh();
			}
			else if (command == "stats") {
				this.say(this.stats(args));
			}
			else if (command == "resident") {
				if (args) {
					var user = this.getUserByName(args);
					if (user.userid) {
						if (!this.residents[user.userid]) {
							this.residents[user.userid] = { name: args, added: this.timestamp() };
							this.say(args + " is a resident DJ now");
						}
						else {
							delete this.residents[user.userid];
							this.say(args + " removed from the residents");
						}
					}
				}
			}
			else if (command == "residents") {
				if (args) {
					if (args == "on") this.residentsParty = true;
					else if (args == "off") this.residentsParty = false;
					else if (args == "list") {
						var list = [];
						for(var key in this.residents) {
							list.push(this.residents[key].name);
						}
						list = list.sort();
						this.say("The residents are: " + list.join(", ") + " (" + this.size(this.residents) + ")");
					}
				}
			}
			else if (command == "afk") {
				var afk = [];
				for (var key in topicbot.listeners) {
					if (this.timestamp() - this.listeners[key] > 3600) {
						afk.push(this.room.users[key].name + ": "+ this.secondsToTime(this.timestamp() - this.listeners[key]));
					}
				}
				
				if (afk.length > 0) this.say(afk.join(", "));
				else this.say("No AFK users");
			}
		}
		// VIPS too
		if (name == this.owner || name == this.name || this.moderators.indexOf(user.userid) > -1) {
			
			if (command == "songlimit") {
				this.maxSongs = parseInt(args);
				this.say("The song limit is now " + this.maxSongs);
			}
			else if (command == "demote") {
				if (args) {
					var user = this.getUserByName(args);
					if (user.userid) this.roomManager.callback("remove_dj", user.userid);
					else this.say(args + " isn't here.");
				}
				else {
					//this.roomManager.callback("remove_dj", topicbot.room.currentDj);
				}
			}
			else if (command == "boot") {
				if (args && args != this.owner && args != this.name) {
					this.bootUser(args);
				}
			}
			else if (command == "ban") {
				if (args && args != this.owner && args != this.name) {
					var user = this.getUserByName(args);
					this.banList[user.userid] = { name: args, date: this.timestamp(), admin: name, boots: 1 };
					this.say(args + "is banned. Au Revoir!.");
					setTimeout(function() {
						topicbot.bootUser(args);
					}, 2 * 1000);
					this.storage.backup();
				}
			}
			else if (command == "chill") {
				this.clearDjsTimeouts();
				this.say("sorry, I'm acting like crazy or something.");
			}
			else if (command == "skip") {
				this.djsQueue.shift();
				this.djsNext();
			}
			else if (command == "next") {
				this.djsNext();
			}
			else if (command == "add") {
				this.djsQueue.unshift(args);
				this.say(args + " added to the top of the list.");
			}
			else if (command == "push") {
				this.djsQueue.push(args);
				this.say(args + " added to the list.");
			}
			else if (command == "remove") {
				if (args && this.djsQueue.indexOf(args) > -1) {
					this.djsQueue = $.map(this.djsQueue, function(n, i){
						return (n == args ? null : n);
					});
					this.say(args + " removed from the list.");
				}
			}
			else if (command == "flip") {
				if (args && this.djsQueue.length > 1) {
					if (args == "up") {
						var flipped = this.djsQueue[this.djsQueue.length - 1];
						this.djsQueue.pop();
						this.djsQueue.unshift(flipped);
						this.say(flipped + " moved to the top of the list.");
					}
					else if (args == "down") {
						var flipped = this.djsQueue[0];
						this.djsQueue.shift();
						this.djsQueue.push(flipped);
						this.say(flipped + " moved to the bottom of the list.");
					}
				}
			}
		}
		
		if ((command == "theme" || command == "topic" || command == "tema") && this.botFunctions) {
			if (this.topic) {
				this.say("The current theme is: " + this.topic);
			}
			else {
				this.say("There's no theme set for this room. Use *suggest to suggest one.");
			}
		}
		else if (command == "suggest" && this.botFunctions) {
			this.suggest(name,args);
		}
		else if ((command == "limit") && this.botFunctions) {
			this.say("DJs can only play " + this.maxSongs + " songs when the decks are full.");
		}
		else if ((command == "offtopic" || command == "offtheme") && this.botFunctions) {
			this.incrementOffTheme(name);
		}
		else if (command == "bonus" || command == "awesome" || command == "boner") {
			if (!this.voted) this.incrementBonus(name);
			else this.say("I'm already dancing! :)");
		}
		else if (command == "help") { // NEW
			this.say("The commands are: *bonus, *list, *addme, *similar, *suggest THEME, *theme, *offtheme and of course *help");
		}
		else if (command == "similar") { // NEW
			if (this.similarRunning) {
				this.say("easy tiger");
			}
			else {
				this.similarSongs();
			}
		}
		else if (command == "addme") {
			if (this.djsFunctions) {
				if (this.djsQueue.indexOf(name) == -1) {
					if (topicbot.room.djIds.indexOf(user.userid) > -1){
						this.say(name + " you're already playing. Easy tiger!");
					}
					else {
						if (this.users[user.userid] && (this.users[user.userid].votesUp + this.users[user.userid].votesDown > 10) && this.ratio(name) <= 1.5) {
							this.say(name + ", you have a bad \"voting\" ratio (" + this.ratio(name) + "). Improve this ratio before you can play again!");
						}
						else if (this.residentsParty) {
							if (name == this.owner || this.residents[user.userid]) {
								this.djsQueue.push(name);
								this.say(name + " added. The list now has " + this.djsQueue.length + " DJs. -- " + this.maxSongs + " songs per round. ");
								//: "+this.djsQueue.join(", ") + "
								this.storage.backup();
							}
							else {
								this.say("Sorry " + name + " but we are having a special party with resident DJs only.");
							}
						}
						else if (this.listClosed) {
							if (name == this.owner || this.residents[user.userid]) {
								this.djsQueue.push(name);
								this.say(name + " added. The list now has " + this.djsQueue.length + " DJs. -- " + this.maxSongs + " songs per round. ");
								// "+this.djsQueue.join(", ") + "
								this.storage.backup();
							}
							else {
								this.say("Sorry " + name + " but the list is closed right now.");
							}
						}
						else if (this.djsQueue.length >= this.maxList) {
							if (name == this.owner || this.residents[user.userid]) {
								this.djsQueue.push(name);
								this.say(name + " added. The list now has " + this.djsQueue.length + " DJs. -- " + this.maxSongs + " songs per round. ");
								this.storage.backup();
							}
							else {
								this.say("Sorry " + name + " but the list max users is " + this.maxList + ". Please wait while it decreases.");
								//this.say("Sorry " + name + " but when the list exceeds " + this.maxList + ",  only residents can get into it.");
							}
						}
						else {
							this.djsQueue.push(name);
							this.say(name + " added. The list now has " + this.djsQueue.length + " DJs. -- " + this.maxSongs + " songs per round. ");
							this.storage.backup();
						}
					}
					
				} else {
					this.say(name + " is already in the list. Chill!");
				}
			} else {
				this.say("list is off");
			}
		}
		else if (command == "removeme") {
			if (this.djsQueue.indexOf(user.name) > -1) {
				this.djsQueue = $.map(this.djsQueue, function(n, i){
					return (n == user.name ? null : n);
				});
				this.say(user.name + " removed from the list.");
				this.storage.backup();
			}
		}
		else if (command == "list") {
			if (this.djsFunctions) {
				if (args && (name == this.owner || name == this.name || this.moderators.indexOf(user.userid) > -1)) {
					if (args == "off") {
						this.listClosed = true;
						this.say("The list is closed");
					}
					else if (args == "on") {
						this.listClosed = false;
						this.say("The list is open");
					}
					else if (args == "full") {
						this.say("The list has " + this.djsQueue.length + " DJs: " +this.djsQueue.join(", ") + ". -- " + this.maxSongs + " songs per round.");
					}
				} else {
					if (this.djsQueue.length) {
						if (this.djsQueue.indexOf(name) > -1) {
							this.say("The list has " + this.djsQueue.length + " DJs. " + name + ", you are #" + (this.djsQueue.indexOf(name) + 1) + " -- " + this.maxSongs + " songs per round.");
						}
						else {
							this.say("The list has " + this.djsQueue.length + " DJs. -- " + this.maxSongs + " songs per round." + (this.residentsParty ? " We're having a \"residents only\" night. The list is closed." : (this.listClosed ? " The list is closed for now." : (this.djsQueue.length >= this.maxList && (!this.residents[user.userid]) ? " Sorry " + name + " but the list max users is " + this.maxList + ". Please wait while it decreases." : " Add yourself typing: *addme"))));
						//: "+this.djsQueue.join(", ") + "
						}
					}
					else {
						this.say("The list is empty." + (!this.residentsParty && !this.listClosed ? " Add yourself to it, type: *addme" : ""));
					}
				}
			} else {
				this.say("list is off");
			}
		}
		else if (command == "who") {
			this.say("HI! I'm #EVE. I'm a bipolar robot coded by @gilbarbara");
		}
		else if (command == "what" || command == "directive") {
			this.say("I'm here to help us keep the mood and manage the dj queue. Enjoy!");
		}
		else if (command == "why") {
			this.say("cause the world needs order!");
		}
		else if (command == "how") {
			this.say("using a layer of javascript/jQuery on top of TT's script");
		}
		else if (command == "when") {
			this.say("August 29, 1997");
		}
		else if (command == "where") {
			this.say("Cyberdyne Systems");
		}
		else if (command == "room") {
			this.say("there are " + topicbot.room.numUsers() + " users in this lovely room.");
		}
		else if (command == "rule" || command == "rules") {
			this.say("Stop whining bitch");
		}
		else if (command == "faq") {
			this.say("Please go here: http://tt-indie-dance-electronica.tumblr.com/");
		}
		else if (command == "donate" || command == "donation") {
			this.say("Ca$h! Please go here: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=TECU92G558HGN");
		}

		if (this.sillyCommands) {
		//silly
			if (command == "make") {
				this.say("Make your own damn " + args + " " + name + "!!");
			}
			else if (command == "party" || command == "fiesta") { // NEW
				this.say("YEAH! let's party like is 1999!");
			}
			else if (command == "sex" || command == "fuck" || command == "dirty") { // NEW
				this.say("I'm in, bring some drugs?");
			}
			else if ((command == "hugs" || command == "hug") && name != this.name) {
				this.say("*hugs " + name);
			}
			else if (command == "love") {
				this.say("I love yall! <3");
			}
			else if (command == "smoke" || command == "weed" || command == "burn" || command == "drug" || command == "drugs") {
				this.say("Ganja Man!");
			}
			else if (command == "ganja" || command == "hash" || command == "opium") {
				this.say("Yo, get the bong!");
			}
			else if (command == "coke" || command == "meth" || command == "crack") {
				this.say("No Man, Ganja!");
			}
			else if (command == "ecstasy" || command == "lsd" || command == "acid" || command == "heroin") {
				this.say("fuckyeah!");
			}
			else if (command == "tits" || command == "boobs") {
				this.say("Shake your tits!!");
			}
			else if (command == "dance" || command == "ass" || command == "boogie" || command == "booty" || command == "shake") {
				this.say("Shake your asses BITCHES");
			}
			else if (command == "pussy" || command == "cunt" || command == "beaver") {
				this.say("I really don't know you that well..");
			}
			else if (command == "poke") { // mayplusmay
				this.say("Hey, watch where you're putting your hands!!");
			}
			else if (command == "dubstep") { 
				this.say("BOOM BOOOM BOOOOOM");
			}
			else if (command == this.name || command == "eve") { 
				this.say("Yes my dear?");
			}
			else if (command == "flash" || command == "naked" || command == "tits") { 
				this.say("Yay, TITS!");
			}
			else if (command == "bitch" || command == "sucks" || command == "hate") { 
				this.say("HEY! WHAT THE FRAK?");
			}
			else if (command == "work" || command == "job" || command == "jobs") { 
				this.say("Nah. This room is way more fun!");
			}
			else if (command == "paradisco") { 
				this.say("Yeah, she's a friend");
			}
			else if (command == "nervous") { 
				this.say("I'm not nervous...she's over there");
			}
			else if (command == "kill" || command == "murder") { 
				this.say("Bang Bang. You're dead " + (args ? args : name));
			}
			else if (command == "toaster" || command == "robot" || command == "fuckoff"  || command == "shutup" || command == "cylon") { 
				this.say("Shup up Monkey");
			}
			else if (command == "magic") { 
				this.say("let's go to the Candy Mountain, Charlie");
			}
			else if (command == "more" || command == "extra" || command == "gold" || command == "woot") { 
				this.say("Okay, here's some Fake Gold");
			}
			else if (command == "moreee") { 
				this.say("Here's your meaningless point. May it brighten your pointless existence.");
			}
			else if (command == "kiss" || command == "kisses") {
				this.say("MUAH!");
			}
			else if (command == "fire") {
				this.say("Burn IT DOWN!");
			}
			else if (command == "harder" || command == "better" || command == "stronger" || command == "faster") {
				var daft = ["Work It Harder", "Make It Better", "Do It Faster", "Makes Us stronger", "More Than Ever Hour After", "Our Work Is Never Over"];
				this.say(daft[Math.floor(Math.random() * (daft.length))]);
			}
			else if (command == "ide" || command == "IDE") {
				this.say("Indie Dance / Electronica. That's it!");
			}
			else if (command == "electronica") {
				this.say("Go here: http://www.last.fm/tag/electronica/artists");
			}
		}
	}
	else if (this.botFunctions && this.suggestedTopic && text == "1") {
		this.voters[name] = 1;
		console.log("Votes are now " + this.voteCount());
	}
	else if (name != this.name && /thank.*\beve\b/i.test(text)) {
		this.say("You're welcome " + name + ".");
	}
	else if (name != this.name && /hate.*\beve\b/i.test(text)) {
		this.say("Don't be a hater " + name + ". Love is all around!");
	}
	else if (name != this.name && /sorry.*\beve\b/i.test(text)) {
		this.say("You better be " + name + "!");
	}
	else if (name == this.owner && /\beve\b.*behave/i.test(text)) {
		this.say("I'll! But check back on me later pleeease?");
	}
	else if (name != this.name && /\beve\b/i.test(text)) {
		console.log(name, this.name);
		this.say(this.botAnswers[Math.floor(Math.random() * (this.botAnswers.length))]);
	}
};

topicbot.endSuggestedTopicElection = function() {
	var votes = this.voteCount();
	this.say("I counted " + votes + " for '" + this.suggestedTopic + "'.");

	if (votes >= this.requiredVotes) {
		this.topic = this.suggestedTopic;
		this.say("The theme is now '" + this.topic + "'!");
	}
	else if (this.topic) {
		this.say("Sorry. We're staying with '" + this.topic + "'.");
	}

	this.suggestedTopic = null;
	this.requiredVotes = 0;
	this.voters = null;
};

topicbot.say = function(msg) {
	turntable[topicbot.sendMessageName]({
		api: "room.speak",
		roomid: topicbot.room.roomId,
		text: msg
	});
};

topicbot.upVote = function() {
	console.log("Upvoting");
	this.voted = true;
	this.roomManager.callback("upvote");
}

topicbot.downVote = function() {
	console.log("Downvoting");
	this.voted = true;
	topicbot.roomManager.callback("downvote");
}

topicbot.getUserByName = function(name) {
	var users = this.room.users;

	for (var i in users) {
		if (users.hasOwnProperty(i)) {
			if (users[i].name == name) {
				return users[i];
			}
		}
	}

	return null;
}

topicbot.bootUser = function(name, mute) {
	var user = this.getUserByName(name);

	if (!user) {
		this.say("That hater is already gone.");
	}
	else if (name != this.owner && name != this.name) {
		if (!mute) this.say("Booting " + name);
		topicbot.roomManager.callback("boot_user", user.userid);
		setTimeout(function() {
			$("#overlay .bootReasonField").val("Obey the rules!");
			$("#overlay .ok-button").trigger("click");
			$("#overlay .close-x").trigger("click");
		},1 * 500);
	}
}

topicbot.bootCurrentDj = function() {
	this.say("Booting current DJ");
	topicbot.roomManager.callback("boot_user",this.room.currentDj);
}

topicbot.clearDjsTimeouts = function() {
	console.log("cleared timetouts");
	for (var key in this.djsTimeouts) {
		clearTimeout(this.djsTimeouts[key]);
	}
	this.djsTimeouts = {};
}

topicbot.reminder = function() {
	this.say("remember: If you like the song playing, click the \"Awesome\" button. Be Nice!");
}

topicbot.artistPlaying = function() {
	var artist = $(".songlog .song:first .songinfo .details div:first").html(); // NEW
	var artist = artist.split(" - ");
	return artist[0];
}

topicbot.djsNext = function () {
	if (!this.djsQueue[0]) return false;
	console.log("NEXT -> " + this.djsQueue[0]);
	
	this.clearDjsTimeouts();
	
	if (this.djsQueue.length && topicbot.room.djIds.length < 2) {
		this.djsQueue = [];
		this.say("DJ Queue reset.");
		return false;
	}
	
	if (!this.getUserByName(this.djsQueue[0])) {
		this.djsQueue.shift();
		this.djsNext();
		return false;
	}	

	var user = this.getUserByName(this.djsQueue[0]);
	
	if (this.djsQueue.length) {
		this.say(user.name + ", IT'S YOUR TURN!. You have 30 seconds to step up!");
		this.djsTimeouts['dj_next'] = setTimeout(function() {
			
			if (user.name == topicbot.djsQueue[0] && !this.decksAreFull) topicbot.say(user.name + ", hurry up. You only have 15 seconds to step up..");
		},15 * 1000);
		this.djsTimeouts['dj_shift'] = setTimeout(function() {
			if (topicbot.room.djIds.indexOf(user.userid) == -1) {
				topicbot.djsQueue.shift();
				if (topicbot.djsQueue.length) topicbot.djsNext();
			}
		},30 * 1000);
		return true;
	}
	return false;
}


topicbot.autoplay = {
	init: function() {
		if (topicbot.autoplayStatus && topicbot.room.djIds.indexOf(topicbot.room.selfId) > -1 && topicbot.room.djIds.length > 2) {
			this.stop();
		}
		else if (topicbot.autoplayStatus && topicbot.room.djIds.indexOf(topicbot.room.selfId) == -1 && topicbot.room.djIds.length < 2) {
			this.start();
		}
	},
	start: function() {
		console.log('start djing');
		topicbot.room.becomeDj();
	},
	stop: function() {
		console.log('quit djing');
		topicbot.room.quitDj();
	}
}

topicbot.similarSongs = function() {
	console.log("getting similar songs: to: " + this.artistPlaying());
	if (!topicbot.similarRunning) {
		topicbot.similarRunning = true;
		$.get("http://code.gilbarbara.com/similar_song.php?artist=" + this.artistPlaying(), function(data) {
			if (data) {
				topicbot.say(data ? "Try this song: " + data : "Nothing found, try again");
				topicbot.similarRunning = false;
			}
		});
	}
}

topicbot.userStatus = function() {
	var user_status = '';
	for(var i in this.songsPlayed) {
		if (i && this.room.users[i]) user_status += this.room.users[i].name + ": " + this.songsPlayed[i] + " (" + this.secondsToTime(this.timestamp() - this.djsPlaying[i]) + ")<br />";
	}
	return user_status;
}

topicbot.storage = {
	support: function() {
		try {
			return !!localStorage.getItem;
		} catch(e) {
			return false;
		}
	}(),
	backup: function() {
		if(this.support) {
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
				listeners: topicbot.listeners,
				maxList: topicbot.maxList,
				maxSongs: topicbot.maxSongs,
				users: topicbot.users,
				songsPlayed: topicbot.songsPlayed,
				topic: topicbot.topic,
				residents: topicbot.residents,
				voteReminder: topicbot.voteReminder,
				warnings: topicbot.warnings
			};

			localStorage.setItem("TFM_HELPER", "{\"preferences\":" + JSON.stringify(preferences) + "}");
		}
	},
	restore: function() {
		if(this.support) {
			var storage = localStorage.getItem("TFM_HELPER");
			if(storage) {
				storage = JSON.parse(storage);
				$.extend(topicbot, storage.preferences);
			}
		}
	}
}

topicbot.ui = {
	self: this,
	init: function() {
		if (!$("#topicbot").length) {
			$("<div/>").attr({ id: 'topicbot' }).css({ position: 'absolute', top: 99, left: 760, backgroundColor: '#161616', color: '#999', padding: 16, width: 230, zIndex: 1001, cursor: 'move' }).appendTo('#outer');
			$("#topicbot").html("<style type='text/css'>#topicbot button {-moz-border-radius: 2px; -webkit-border-radius: 2px; background-color: #999; border-width: 0; color: #E1E1E1; cursor: pointer; display: inline-block; padding: 3px 6px; }\n#topicbot div { margin-bottom: 6px; }\n#topicbot span { font-size: 12px; font-style: italic; }\n#topicbot #botOptions { margin-left: 8px; padding-bottom: 6px; }\n</style>");
			$("<div/>").css({ fontSize: 22, marginBottom: 2 }).addClass("tb_title").html("turntable helper").appendTo("#topicbot");
			$("<div/>").css({ fontSize: 13, fontStyle: 'italic', marginBottom: 8 }).html("version <span id=\"botVersion\">" + topicbot.version + "</span>").appendTo("#topicbot");
			$("<div/>").html("<button type=\"button\" data-command=\"reload\">reload</button>").appendTo("#topicbot");
			$("<div/>").html("<button type=\"button\" data-command=\"start\">restart</button>").appendTo("#topicbot");
			$("<div/>").html("<button type=\"button\" data-command=\"reminder\">reminder</button><br />").appendTo("#topicbot");
			
			$("<div/>").html("<button type=\"button\"onclick=\"$('#botOptions').slideToggle();\">bot options</button>").addClass("botOptions").appendTo("#topicbot");
			$("<div/>").attr('id', 'botOptions').css({ display: 'none' }).appendTo("#topicbot");
$("<div/>").html("<button type=\"button\" data-variable=\"botFunctions\">bot status</button> <span id=\"botFunctions\">" + (topicbot.botFunctions ? "on" : "off") + "</span>").appendTo("#botOptions");
			$("<div/>").html("<button type=\"button\" data-variable=\"botHello\">bot hello</button> <span id=\"botHello\">" + (topicbot.botHello ? "on" : "off") + "</span>").appendTo("#botOptions");
			$("<div/>").html("<button type=\"button\" data-variable=\"botGreeting\">bot greeting</button> <span id=\"botGreeting\">" + (topicbot.botGreeting ? "on" : "off") + "</span>").appendTo("#botOptions");
			$("<div/>").html("<button type=\"button\" data-variable=\"botStage\">bot up stage</button> <span id=\"botStage\">" + (topicbot.botStage ? "on" : "off") + "</span>").appendTo("#botOptions");
			$("<div/>").html("<button type=\"button\" data-variable=\"djsFunctions\">dj queue</button> <span id=\"djsFunctions\">" + (topicbot.djsFunctions ? "on" : "off") + "</span>").appendTo("#topicbot");
			$("<div/>").html("<button type=\"button\" data-variable=\"autoplayStatus\">autoplay</button> <span id=\"autoplayStatus\">" + (topicbot.autoplayStatus ? "on" : "off") + "</span>").appendTo("#topicbot");
			$("<div/>").html("<button type=\"button\" data-variable=\"freeBonus\">free bonus</button> <span id=\"freeBonus\">" + (topicbot.freeBonus ? "on" : "off") + "</span>").appendTo("#topicbot");
			$("<div/>").html("<button type=\"button\" data-variable=\"sillyCommands\">silly commands</button> <span id=\"sillyCommands\">" + (topicbot.sillyCommands ? "on" : "off") + "</span>").appendTo("#topicbot");
			$("<div/>").html("<button type=\"button\" data-variable=\"voteReminder\">auto reminder</button> <span id=\"voteReminder\">" + (topicbot.voteReminder ? "on" : "off") + "</span>").appendTo("#topicbot");
			$("<div/>").html("<button type=\"button\" data-command=\"destroy\" style=\"color: #C60000;\">destroy</button>").appendTo("#topicbot");
			$("<div/>").css({ fontSize: 15, marginTop: 8 }).html("<b>Songs Played</b>:" + "<div id=\"userStatus\">" + topicbot.userStatus() + "</div>").appendTo("#topicbot");
			$("#topicbot").draggable({ handler: ".tb_title" });
			$("#topicbot button:data").click(function() {
				if ($(this).data('command')) {
					if ($(this).data('function')) topicbot[$(this).data('command')][$(this).data('function')]($(this).data('args'));
					else topicbot[$(this).data('command')]($(this).data('args'));
				}
				else if ($(this).data('variable')) {
					topicbot[$(this).data('variable')] = (topicbot[$(this).data('variable')] ? false : true);
					console.log($(this).data('variable') + " is " + (topicbot[$(this).data('variable')] ? "on" : "off"));
				}
				if($(this).data('variable') == 'autoplayStatus' ) topicbot.autoplay[topicbot[$(this).data('variable')] ? 'start' : 'stop']();
				topicbot.ui.refresh();
				topicbot.storage.backup();
			});
		}
	},
	refresh: function() {
		if ($("#topicbot").length) {
			$("#botVersion").html(topicbot.version);
			$("#userStatus").html(topicbot.userStatus());
			$("#autoplayStatus").html(topicbot.autoplayStatus ? 'on' : 'off');
			$("#djsFunctions").html(topicbot.djsFunctions ? 'on' : 'off');
			$("#botFunctions").html(topicbot.botFunctions ? 'on' : 'off');
			$("#botHello").html(topicbot.botHello ? 'on' : 'off');
			$("#botGreeting").html(topicbot.botGreeting ? 'on' : 'off');
			$("#botStage").html(topicbot.botStage ? 'on' : 'off');
			$("#voteReminder").html(topicbot.voteReminder ? 'on' : 'off');
			$("#freeBonus").html(topicbot.freeBonus ? 'on' : 'off');
			$("#sillyCommands").html(topicbot.sillyCommands ? 'on' : 'off');
		}
	},
	destroy: function() {
		$("#topicbot").remove();
	}
}

topicbot.destroy = function() {
	turntable.eventListeners.message = $.map(turntable.eventListeners.message, function(n, i){
		return (n == "function (msg) { self.onMessage(msg); }" ? null : n);
	});
	this.room.appendChatMessage = this.appendChatMessage;
	this.storage.backup();
	this.ui.destroy();
	delete window.topicbot;
}

topicbot.stats = function(name, personal) {
	var user = this.getUserByName(name);
	
	if (user && this.users[user.userid]) {
		return (personal ? "Your" : name + "'s") + " stats: " + this.users[user.userid].songs + " song(s), " + this.users[user.userid].awesomes + " awesome(s), " + this.users[user.userid].lames + " lame(s)  / Voting ratio: " + this.ratio(name);
	}
	
	return name + " has no data yet";
}

topicbot.ratio = function(name) {
	var user = this.getUserByName(name);
	return (this.users[user.userid] ? ((this.users[user.userid].votesUp ? this.users[user.userid].votesUp : 1) / (this.users[user.userid].votesDown ? this.users[user.userid].votesDown : 1)).toFixed(2) : 0);
}

/*
Object.prototype.searchProperty = function (property, value) {
	var obj = this;
	for(var key in obj) {
		if (obj[key][property] && obj[key][property] == value) {
			return obj[key];
		}
	}
	return false;
}

topicbot.findUser = function (name) {
	var user = this.users.searchProperty("name", name);
	console.log(user.name, users.userid);
} */

topicbot.size = function(obj) {
	var size = 0, key;
	for (key in obj) {
		if (obj.hasOwnProperty(key)) size++;
	}
	return size;
}

topicbot.timestamp = function() {
	return Math.round((new Date()).getTime() / 1000).toString();
}

topicbot.secondsToTime = function(d) {
	d = Number(d);
	var h = Math.floor(d / 3600);
	var m = Math.floor(d % 3600 / 60);
	var s = Math.floor(d % 3600 % 60);
	return ((h > 0 ? h + ":" : "") + (m > 0 ? (h > 0 && m < 10 ? "0" : "") + m + ":" : "0:") + (s < 10 ? "0" : "") + s);
}

topicbot.timeout = function() {
	for (var i=0;i<this.room.djIds.length;i++) {
		if (!this.djsPlaying[this.room.djIds[i]]) this.djsPlaying[this.room.djIds[i]] = this.timestamp();
		if (this.timestamp() - this.djsPlaying[this.room.djIds[i]] > 900 && this.room.djIds[i] != this.room.currentDj && this.issuedWarning(this.room.djIds[i],"afk")) {
			console.log(this.room.users[this.room.djIds[i]].name + " removed from decks");
			this.roomManager.callback("remove_dj", this.room.djIds[i]);
			delete this.djsPlaying[this.room.djIds[i]];
		} else if (this.timestamp() - this.djsPlaying[this.room.djIds[i]] > 720 && !this.issuedWarning(this.room.djIds[i],'afk')) {
			console.log(this.room.users[this.room.djIds[i]].name + " warned");
			this.warnUser(this.room.djIds[i], "afk");
			this.say(this.room.users[this.room.djIds[i]].name + ", you are afk for 12 minutes. Engage or you will be unplugged in 3 minutes.");
		}
	}
}

topicbot.residentsExtended = function(name) {
	if (name) {
		$("div.tt-ext-room-user .tt-ext-user-name a:contains('" + name + "')").closest("div").css({ backgroundColor: '#FDFF00 !important' });
	}
	else {
		for (var key in this.residents) {
			$("div.tt-ext-room-user .tt-ext-user-name a:contains('" + this.residents[key].name + "')").closest("div").css({ backgroundColor: '#FDFF00 !important' });
		}
	}
}

if (!topicbot.started) {
	topicbot.start();
}
else {
	console.log("topicbot version is now " + topicbot.version);
	topicbot.ui.refresh();
}

if (topicbot.refreshRoomTimer) {
	clearInterval(topicbot.refreshRoomTimer);
}
topicbot.refreshRoomTimer = setInterval(function() { topicbot.refreshRoom(); }, 1800 * 1000);

if (topicbot.voteReminder) {
	if (topicbot.reminderTimer) {
		clearInterval(topicbot.reminderTimer);
	}
	topicbot.reminderTimer = setInterval(function() { topicbot.reminder(); }, 1200 * 1000);
}

if (!topicbot.shortTimer) {
	topicbot.shortTimer = setInterval(function() {
		//console.log("shortTimer");
		
		//if ($("#overlay .ok-button").length) $("#overlay .ok-button").trigger("click");
		topicbot.messages = {};
		
		topicbot.timeout();
		topicbot.ui.refresh();
		
	}, 30 * 1000);
}

if (!topicbot.longTimer) {
	topicbot.longTimer = setInterval(function() {
		//console.log("longTimer");
		
		if (topicbot.startLocation != location.pathname) {
			topicbot.storage.backup();
			location.href = "http://" + location.host + topicbot.startLocation;
		}
		
		if (topicbot.newUsers.length > 0) {
			topicbot.say("Hello " + topicbot.newUsers.join(", "));
			// + "." + (topicbot.residentsParty || topicbot.listClosed ? "" : " If you want to get on the DJ queue type: *addme")
			topicbot.newUsers = [];
		}
		
		if(topicbot.size(topicbot.queueCleaner)) {
			for(var userid in topicbot.queueCleaner) {
				if (topicbot.timestamp() - topicbot.queueCleaner[userid].time > 600) {
					topicbot.djsQueue = $.map(topicbot.djsQueue, function(n, i){
						return (n == topicbot.queueCleaner[userid].name ? null : n);
					});
					console.log("removed " + topicbot.queueCleaner[userid].name + " from the list")
				}
			}
		}
		
		for (var key in topicbot.listeners) {
			/*if (topicbot.timestamp() - topicbot.listeners[key] > 7200) {
				if (topicbot.room.users[key]) topicbot.bootUser(topicbot.room.users[key].name, true);
			}*/
			if (!topicbot.room.users[key]) delete topicbot.listeners[key];
		}
		
		topicbot.actions = {};
		
	}, 120 * 1000);
}

/*
*cleanup
for (var key in topicbot.songsPlayed) {
	if (topicbot.room.djIds.indexOf(key) == -1) delete topicbot.songsPlayed[key]
}

*out of the room
for (var key in topicbot.djsQueue) {
	console.log(topicbot.djsQueue[key], topicbot.getUserByName(topicbot.djsQueue[key]));
}


for (var i in topicbot.djsPlaying) {
	if (!topicbot.songsPlayed[i]) topicbot.songsPlayed[i] = 0;
}

*high votes
var highest = 0, username;
for (var key in topicbot.users) {
	if (topicbot.room.users[key]) {
		if (topicbot.ratio(topicbot.room.users[key].name) > highest) {
			username = topicbot.room.users[key].name;
			highest = topicbot.ratio(topicbot.room.users[key].name);
		}
	}
}

topicbot.songsPlayed[topicbot.getUserByName("A.J. Yarnall").userid]

var afk = [];
for (var key in topicbot.listeners) {
	if (topicbot.timestamp() - topicbot.listeners[key] > 3600) {
		afk.push(topicbot.room.users[key].name + ": "+ topicbot.secondsToTime(topicbot.timestamp() - topicbot.listeners[key]));
	}
}

if (afk.length > 0) console.log(afk.join(", "));

list = [];
for(var key in topicbot.residents) {
	list.push(topicbot.residents[key].name);
}
list = list.sort();
console.log("The residents are: " + list.join(", "));

*/
