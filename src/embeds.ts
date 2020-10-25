import { MessageEmbed, TextChannel } from 'discord.js';


export function sendEmbeds(event: any, channel: TextChannel): Promise<any> {
    switch (event.type) {
        case 'PushEvent':
            return sendPushEmbeds(event, channel);

        case 'CreateEvent':
            return sendCreateEmbed(event, channel);

        default:
            return new Promise<any>(() => { console.warn(`Unknown event ${event.type}!`) });
    }
}

function createEmbed(event: any, title: string, description: string, url: string, color: string): MessageEmbed {
    const actor: any = event.actor;

    return new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setURL(url)
        .setColor(color)
        .setAuthor(actor.login, actor.avatar_url)
        .setTimestamp(Date.parse(event.created_at));
}

function getRepoUrl(event: any): string {
    return `https://github.com/${event.repo.name}/`;
}

async function sendPushEmbeds(event: any, channel: TextChannel): Promise<any> {
    const repoUrl: string = getRepoUrl(event);

    for (let commit of event.payload.commits) {
        const embed: MessageEmbed = createEmbed(event, commit.message, 'New commit!', repoUrl, '#0099ff');
        await channel.send(embed);
    }
}

function sendCreateEmbed(event: any, channel: TextChannel): Promise<any> {
    const repoUrl = getRepoUrl(event);
    const embed: MessageEmbed = createEmbed(event, event.repo.name, 'New repository!', repoUrl, '#00ff55');
    return channel.send(embed); 
}