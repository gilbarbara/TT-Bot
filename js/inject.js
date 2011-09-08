setTimeout(function() {
	document.body.appendChild(document.createElement('script')).src=chrome.extension.getURL("js/topicbot.js?v="+Math.random());
}, 12000);