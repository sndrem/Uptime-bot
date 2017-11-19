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
				const successFull = bot.brain.get("success");
				if(reachable ) {
					if(successFull >= 60) {
						bot.messageRoom(ROOM, `${site} is online at ${now} and has been online for 60 minutes`);
						bot.brain.set("success", 0)
					} else {
						bot.brain.set("success", successFull++);
					}

				} else {
					bot.messageRoom(ROOM, `@sndrem :fire: ${site} is offline at ${now}. You should probably check it out :fire:`);
					bot.brain.set("success", 0);
				}
			})
		});
	}
}

