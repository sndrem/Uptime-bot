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

	// Need this callback otherwise the brain is wiped before responses start ticking in
	bot.brain.on("connected", () => {
		bot.brain.set("sites", config.sites || []);
	});

	bot.hear(/check/i, (res) => {
		const sites = bot.brain.get("sites") || [];
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
			sites.push(url);
			bot.brain.set("sites", sites);
			res.send(`La til ${url}.\nOvervåker nå: ${sites.map(site => `${site}\n`)}`);
		} else {
			res.send(`Vennligst oppgi en url jeg skal overvåke.`)
		}
	});

	bot.respond(/del (.*)/i, (res) => {
		if(res.match[1]) {
			const url = res.match[1];
			let sites = bot.brain.get("sites");
			let siteToDelete = sites.find(s => s === url);
			if(siteToDelete) {
				const updatedSites = sites.filter(s => s !== url);
				bot.brain.set("sites", updatedSites);
				res.send(`${url} er nå fjernet fra databasen. Overvåker nå ${updatedSites.join(", ")}`)	
			} else {
				res.send(`Fant ingen sider med url: ${url}. Enten eksisterer den ikke, eller så har du skrevet feil url.
					Jeg overvåker foreløpig følgende sider: ${sites.join(", ")}`);
			}
			
		} else {
			res.send("Vennligst oppgi en url jeg skal slutte å følge.")
		}
	});

	bot.respond(/sonos say (.*)/i, (res) => {
		bot.http(`http://192.168.1.61:5005/stue/say/${res.match[1]}`).get((err, response, body) => {
			console.log("Error", err);
			console.log("res", response);
			console.log("Body", body);
			res.send(body);
		})
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
							bot.messageRoom(config.slackRoom, `:white_check_mark: ${site} er online: ${now}`);
							return;
						}

						if(successFull >= 60) {
							bot.messageRoom(config.slackRoom, `:white_check_mark: ${site} er online: ${now} and har vært online i 60 minutter`);
							bot.brain.set("success", 0)
						} else {
							bot.brain.set("success", successFull++);
						}

					} else {
						bot.messageRoom(config.slackRoom, `${config.webAdminSlackName} :fire: ${site} er offline: ${now}. Du bør finne ut hvorfor :fire:`);
						bot.brain.set("success", 0);
					}
				})
			});
		}
	}
}

