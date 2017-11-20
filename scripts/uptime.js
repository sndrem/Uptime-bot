// Description:
//	This script checks a list of websites found in config/config.js and notifies the web admin via 
//	Slack if the sites are down. The bot runs a cronjob every minute to monitor the sites

// Configuration:
//	You will need to set a valid HUBOT_SLACK_TOKEN provided by the Slack API to run this bot

// Commands:
//	hubot which sites - Lists the sites you are currently wathing
//	check - Runs a check on all sites you are monitoring

const isReachable = require("is-reachable");
const CronJob = require('cron').CronJob;
const config = require("../config/config.js")


module.exports = function(bot) {
	const tz = "Europe/Oslo";
	new CronJob('* * * * *', checkSites, null, true, tz)

	console.log("Setting sites", config.sites);
	bot.brain.set("sites", config.sites || []);
	console.log("Sites set: ", bot.brain.get("sites"));

	bot.hear(/check/i, (res) => {
		const sites = bot.brain.get("sites") || [];
		console.log("Check sitenumbers: " + sites);
		if(sites.length === 0) {
			res.send("Det er ingen sider i databasen som skal sjekkes. Legg til en side med kommandoen add <url>");
			return;
		} 
		res.send(`Sjekker ${sites.length > 1 ? sites.length + ' sider' : sites.length + ' side'}`);
		checkSites(true);
	});

	bot.respond(/(which sites|ws)/i, (res) => {
		res.send(`Overvåker følgende sider: ${ bot.brain.get("sites") !== undefined ? bot.brain.get("sites").join(", ") : "Ingen. Legg til en side med kommandoen add <url>" }`)
	});

	bot.respond(/add (.*)/i, (res) => {
		if(res.match[1]) {
			const url = res.match[1];
			let sites = bot.brain.get("sites");
			console.log("Sites after add", sites);
			sites.push(url);
			bot.brain.set("sites", sites);
			res.send(`La til ${url}. Overvåker nå: ${sites.map(site => `${site}\n`)}`);
		} else {
			res.send(`Vennligst oppgi en url jeg skal overvåke.`)
		}
	})

	function checkSites(checkByCommand) {
		const sites = bot.brain.get("sites");
		if(sites.length <= 0) {
			bot.messageRoom(config.slackRoom, "Det er ingen sider i databasen som skal sjekkes.")
		} else {
			sites.forEach(site => {
				isReachable(site, {timeout: 15000}).then(reachable => {
					const now = new Date()
					let successFull = bot.brain.get("success");
					if(reachable) {
						
						if(checkByCommand) {
							bot.messageRoom(config.slackRoom, `:white_check_mark: ${site} is online at ${now}`);
							return;
						}

						if(successFull >= 60) {
							bot.messageRoom(config.slackRoom, `:white_check_mark: ${site} is online at ${now} and has been online for 60 minutes`);
							bot.brain.set("success", 0)
						} else {
							bot.brain.set("success", successFull++);
						}

					} else {
						bot.messageRoom(config.slackRoom, `${config.webAdminSlackName} :fire: ${site} is offline at ${now}. You should probably check it out :fire:`);
						bot.brain.set("success", 0);
					}
				})
			});
		}
	}
}

