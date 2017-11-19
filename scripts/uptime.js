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
const ROOM = "web-admin";


module.exports = function(bot) {
	const tz = "Europe/Oslo";
	new CronJob('* * * * *', checkSites, null, true, tz)

	bot.hear(/check/i, (res) => {
		res.send(`Sjekker ${config.sites.length > 1 ? config.sites.length + ' sider' : config.sites.length + ' side'}`);
		checkSites(true);
	});

	bot.respond(/which sites/i, (res) => {
		res.send(`Overvåker følgende sider: ${ config.sites.join(", ") }`)
	})

	function checkSites(checkByCommand) {
		config.sites.forEach(site => {
			isReachable(site, {timeout: 10000}).then(reachable => {
				const now = new Date()
				let successFull = bot.brain.get("success");
				if(reachable) {
					
					if(checkByCommand) {
						bot.messageRoom(ROOM, `:white_check_mark: ${site} is online at ${now}`);
						return;
					}

					if(successFull >= 60) {
						bot.messageRoom(ROOM, `:white_check_mark: ${site} is online at ${now} and has been online for 60 minutes`);
						bot.brain.set("success", 0)
					} else {
						bot.brain.set("success", successFull++);
					}

				} else {
					bot.messageRoom(ROOM, `${config.webAdminSlackName} :fire: ${site} is offline at ${now}. You should probably check it out :fire:`);
					bot.brain.set("success", 0);
				}
			})
		});
	}
}

