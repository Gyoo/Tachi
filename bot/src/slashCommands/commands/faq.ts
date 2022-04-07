import { SlashCommandBuilder } from "@discordjs/builders";
import deepmerge from "deepmerge";
import { BotConfig, ServerConfig } from "../../config";
import { CreateEmbed } from "../../utils/embeds";
import { SlashCommand } from "../types";

const NEUTRAL_FAQ_ENTRIES: Record<string, string> = {
	duplicates: `Scores on ${ServerConfig.name} are deduplicated based on your score and lamp (and some other things).
If you happen to get the exact same score twice, ${ServerConfig.name} will **ignore** the second one!
There are legitimate reasons for this -- it's very common for people to import the same scores twice through file uploads or import scripts.
For more info on why this is a fundamental limitation of ${ServerConfig.name}, check [the documentation](https://tachi.readthedocs.io/en/latest/user/score-oddities/#deduplication-false-positives-all-games).`,
	contribute: `Contributing to ${ServerConfig.name} in any way will get you the Contributor role, and a cool green name.\n
Contributors who save us hours (or more) of dev time, or are just generally really supportive will get the Significant Contributor role, and an even cooler orange name.
${ServerConfig.name} is an Open Source project. Feel free to read our [contribution guide](https://tachi.readthedocs.io/en/latest/contributing/), or just generally ask for stuff to help out with!`,
	docs: `Documentation for ${ServerConfig.name} is stored at https://tachi.rtfd.io.`,
	pbs: `A PB is all of your best scores on that specific chart joined together.
For most games, this means joining your best score with your best lamp.
Read more about this [here](https://tachi.readthedocs.io/en/latest/user/pbs-scores/)`,
	filter_directives: `Filter Directives are a fancy way of *filtering* rows inside a table.
They provide an advanced toolkit for users to perform complex queries on their data.
Read more about them [here](https://tachi.readthedocs.io/en/latest/user/filter-directives/)`,
	dans: `Dans are good as a milestone for your skill. However, focusing too much on dans can be massively detrimental to your skill as a player.\n
Playing a fixed set of charts all the time will not expose you to more things, and will generally slow down your improvement as a player. Furthermore, they're stressful, and designed to be played *just* at the cusp of what you can play.\n
In short. Don't play dans too much.`,
	orphans: `Importing scores for songs/charts we don't have in the database yet results in them becoming orphaned.
Orphaned scores stay in limbo until they find their 'parent' song or chart. When that's found, they're imported *exactly* as you had them originally! That way, you never lose scores.`,
};

// Server specific FAQ stuff.
const KTCHI_FAQ_ENTRIES: Record<string, string> = {
	kai_support: `Support for KAI based networks (FLO, EAG, MIN) is available, but we are waiting on APIs for more games on their end. At the moment, only IIDX and SDVX are supported.`,
	bokutachi: `Bokutachi is our public sister website for home games and simulators. Feel free to check out [the discord](${
		// Note: obfuscating this for obvious reasons so we don't get garbage bot spam.
		Buffer.from("aHR0cHM6Ly9kaXNjb3JkLmdnL3N3VkJUanhtUFk=", "base64")
	})`,
	sdvx_1259: `Automation Paradise is song ID 1259. It is not a real song, and it is not supported by ${ServerConfig.name}. Related autopara-only songs are not supported, either.`,
	invites: `To invite your friends, go to your profile and select 'Invites'. From there, you can create an invite code.
Your friend can then go to ${BotConfig.TACHI_SERVER_LOCATION} and sign up with the code! You can also invite them to the discord.`,
};

const BTCHI_FAQ_ENTRIES: Record<string, string> = {
	usc_hard_mode: `Hard Mode windows are not supported on ${ServerConfig.name}. Your scores **will be ignored** if they are played on non-standard windows.`,
	ir_login: `You **must** put your API Key in the password field for the Bokutachi IR, **NOT your real password!**. See instructions here: ${BotConfig.TACHI_SERVER_LOCATION}/dashboard/import/beatoraja-ir.
(This is because putting your real password in there is a security nightmare.)`,
};

let faqEntries = NEUTRAL_FAQ_ENTRIES;

if (ServerConfig.type !== "btchi") {
	faqEntries = deepmerge(faqEntries, KTCHI_FAQ_ENTRIES);
}

if (ServerConfig.type !== "ktchi") {
	faqEntries = deepmerge(faqEntries, BTCHI_FAQ_ENTRIES);
}

const choiceMap = new Map(Object.entries(faqEntries));

const command: SlashCommand = {
	info: new SlashCommandBuilder()
		.setName("faq")
		.setDescription("Retrieve various little bits of info.")
		.addStringOption((s) =>
			s
				.setName("entry")
				.setDescription("The FAQ entry to retrieve.")
				.setRequired(true)
				.addChoices(Object.keys(faqEntries).map((e) => [e, e]))
		)
		.toJSON(),
	exec: (interaction) => {
		const entry = interaction.options.getString("entry", true);

		const data = choiceMap.get(entry);

		if (!data) {
			return `This FAQ entry does not exist.`;
		}

		return CreateEmbed().setTitle(`FAQ: ${entry}`).setDescription(data);
	},
};

export default command;
