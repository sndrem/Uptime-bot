const isReachable = require("is-reachable");
const CronJob = require('cron').CronJob;
const SITES = require("../config/config.js")
const ROOM = "web-admin";


module.exports = function(bot) {
	const tz = "Europe/Oslo";
	new CronJob('* * * * *', checkSites, null, true, tz)
	//checkSites(SITES);

	bot.hear(/check/i, (res) => {
		res.send(`Sjekker ${SITES.length} side(r)`);
		checkSites();
	})

	function checkSites() {
		SITES.forEach(site => {
			isReachable(site).then(reachable => {
				const now = new Date()
				if(reachable) {
					bot.messageRoom(ROOM, `${site} is online at ${now}`);
				} else {
					bot.messageRoom(ROOM, `@sndrem :fire: ${site} is offline at ${now}. You should probably check it out :fire:`);
				}
			})
		});
	}
}

