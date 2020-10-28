import { EmbedFieldData, MessageEmbed, TextChannel } from 'discord.js';


export function sendEmbeds(event: any, channel: TextChannel): Promise<any> {
    switch (event.type) {
        case 'PushEvent':
            return sendPushEmbeds(event, channel);

        case 'CreateEvent':
            return sendCreateEmbed(event, channel);

        case 'IssuesEvent':
            return sendIssueEmbed(event, channel);

        case 'IssueCommentEvent':
            return sendIssueCommentEmbed(event, channel);

        case 'ForkEvent':
            return sendForkEmbed(event, channel);

        case 'WatchEvent':
            return sendWatchEmbed(event, channel);

        default:
            return new Promise<any>(() => logUnknownEvent(event));
    }
}

function createEmbed(event: any, title: string, description: string, url: string, color: string, fields: EmbedFieldData[] | null = null): MessageEmbed {
    const actor: any = event.actor;
    const actorUrl: string = `https://github.com/${actor.login}/`;

    const embed: MessageEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setURL(url)
        .setColor(color)
        .setAuthor(actor.login, actor.avatar_url, actorUrl)
        .setTimestamp(Date.parse(event.created_at));

    if (fields !== null) {
        embed.addFields(fields);
    }

    return embed;
}

function getRepoUrl(event: any): string {
    return `https://github.com/${event.repo.name}/`;
}

function trimString(str: string, maxSize: number = 40): string {
    return str.length > maxSize
        ? `${str.substring(0, maxSize - 3)}...`
        : str;
}

function logUnknownEvent(event: any) {
    const actorName: string = event.actor.login;
    const eventType: string = event.type;
    const repoName: string = event.repo.name;
    const message: string = `Unknown event '${eventType}' in repository ${repoName} by ${actorName}`;
    console.warn(message);
}

async function sendPushEmbeds(event: any, channel: TextChannel): Promise<any> {
    const repoUrl: string = getRepoUrl(event);
    const description: string = `New commit in repository ${event.repo.name} was created!`;

    for (let commit of event.payload.commits) {
        const embed: MessageEmbed = createEmbed(event, commit.message, description, repoUrl, '#0099ff');
        await channel.send(embed);
    }
}

function sendCreateEmbed(event: any, channel: TextChannel): Promise<any> {
    const repoUrl: string = getRepoUrl(event);

    const embed: MessageEmbed = event.payload.ref_type === 'branch' 
        ? createNewBranchEmbed(event, repoUrl)
        : createNewRepositoryEmbed(event, repoUrl);

    return channel.send(embed); 
}

function createNewRepositoryEmbed(event: any, repoUrl: string): MessageEmbed {
    return createEmbed(event, event.repo.name, 'New repository was created!', repoUrl, '#00ff55');
}

function createNewBranchEmbed(event: any, repoUrl: string): MessageEmbed {
    const description: string = `New branch in repository ${event.repo.name} was created!`;
    return createEmbed(event, event.payload.ref, description, repoUrl, '#00ffa6');
}

function sendIssueEmbed(event: any, channel: TextChannel): Promise<any> {
    const embed: MessageEmbed | null = createIssueEmbed(event);

    if (embed === null) {
        return new Promise<any>(() => console.warn(`Unkown issue action ${event.payload.action}!`));
    }

    return channel.send(embed);
}

function createIssueEmbed(event: any): MessageEmbed | null {
    const title: string = event.payload.issue.title;
    const issueUrl: string = event.payload.issue.html_url;

    switch (event.payload.action) {
        case 'opened':
            return createOpenIssueEmbed(event, title, issueUrl);

        case 'closed':
            return createCloseIssueEmbed(event, title, issueUrl);

        case 'reopened':
            return createReopenIssueEmbed(event, title, issueUrl);

        default:
            return null;
    }
}

function createOpenIssueEmbed(event: any, title: string, issueUrl: string): MessageEmbed {
    const description: string = `New issue in repository ${event.repo.name} was opened!`;
    const bodyField: EmbedFieldData = {
        name: 'Issue Content',
        value: trimString(event.payload.issue.body, 128)
    }

    return createEmbed(event, title, description, issueUrl, '#9900ff', [ bodyField ]);
}

function createCloseIssueEmbed(event: any, title: string, issueUrl: string): MessageEmbed {
    const description: string = `Issue in repository ${event.repo.name} was closed!`;
    return createEmbed(event, title, description, issueUrl, '#ff0048');
}

function createReopenIssueEmbed(event: any, title: string, issueUrl: string): MessageEmbed {
    const description: string = `Issue in repository ${event.repo.name} was reopened!`;
    return createEmbed(event, title, description, issueUrl, '#9900ff');
}

function sendIssueCommentEmbed(event: any, channel: TextChannel): Promise<any> {
    const title: string = event.payload.issue.title;
    const description: string = `New comment was added to issue in repository ${event.repo.name}!`;
    const commentUrl: string = event.payload.comment.html_url;

    const bodyField: EmbedFieldData = { 
        name: 'Comment Text', 
        value: trimString(event.payload.comment.body, 128)
    };

    const embed: MessageEmbed = createEmbed(event, title, description, commentUrl, '#ff00c8', [ bodyField ]);
    return channel.send(embed);
}

function sendForkEmbed(event: any, channel: TextChannel): Promise<any> {
    const title: string = event.payload.forkee.full_name;
    const description: string = `The repository ${event.repo.name} was forked into ${title}!`;
    const newRepoUrl: string = `https://github.com/${title}`;

    const embed: MessageEmbed = createEmbed(event, title, description, newRepoUrl, '#f2ff00');
    return channel.send(embed);
}

function sendWatchEmbed(event: any, channel: TextChannel): Promise<any> {
    const title: string = event.repo.name;
    const description: string = `${event.actor.login} started stargazing the ${event.repo.name} repository!`;
    const repoUrl: string = getRepoUrl(event);

    const embed: MessageEmbed = createEmbed(event, title, description, repoUrl, '#7a2d00');
    return channel.send(embed);
}