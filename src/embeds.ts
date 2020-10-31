import { ColorResolvable, EmbedFieldData, MessageEmbed } from 'discord.js';
import { trimString } from './helpers';

export interface EventToEmbedsConverter {
    convertToEmbed(event: any): MessageEmbed[] | null;
}

export interface ChainingEventToEmbedsConverter extends EventToEmbedsConverter {
    setNextConverter(converter: EventToEmbedsConverter): void;
}

export interface EventToEmbedsConverterConstructor {
    new(): EventToEmbedsConverter;
}

export interface ChainingEventToEmbedsConverterConstructor {
    new(): ChainingEventToEmbedsConverter;
}

export abstract class AbstractEventToEmbedsConverter implements EventToEmbedsConverter {

    constructor (protected color: ColorResolvable) 
    { }

    public abstract convertToEmbed(event: any): MessageEmbed[] | null;

    protected getRepositoryUrl(event: any): string {
        return `https://github.com/${event.repo.name}/`;
    }

    protected createEmbed(event: any, title: string, description: string, url: string): MessageEmbed {
        const actor: any = event.actor;
        const actorUrl: string = `https://github.com/${actor.login}/`;

        return new MessageEmbed()
            .setTitle(title)
            .setDescription(description)
            .setURL(url)
            .setColor(this.color)
            .setAuthor(actor.login, actor.avatar_url, actorUrl)
            .setTimestamp(Date.parse(event.created_at));
    }

}

export abstract class AbstractChainingEventToEmbedsConverter 
    extends AbstractEventToEmbedsConverter 
    implements ChainingEventToEmbedsConverter {

    protected nextConverter: EventToEmbedsConverter | undefined;

    constructor(color: ColorResolvable) {
        super(color);
    }

    protected abstract canConvert(event: any): boolean;
    protected abstract convert(event: any): MessageEmbed[];

    public convertToEmbed(event: any): MessageEmbed[] | null {
        return this.canConvert(event)
            ? this.convert(event)
            : this.nextConverter?.convertToEmbed(event) ?? null;
    }

    public setNextConverter(converter: EventToEmbedsConverter) {
        this.nextConverter = converter;
    }

}

export abstract class AbstractChainingSpecificEventToEmbedsConverter extends AbstractChainingEventToEmbedsConverter {

    constructor(protected supportedType: string, color: ColorResolvable) { 
        super(color);
    }

    protected canConvert(event: any): boolean {
        return event?.type === this.supportedType;
    }

}

export class PushConverter extends AbstractChainingSpecificEventToEmbedsConverter {

    constructor() {
        super('PushEvent', '#0099ff');
    }

    protected convert(event: any): MessageEmbed[] {
        const repoUrl: string = this.getRepositoryUrl(event);
        const description: string = `New commit in repository ${event.repo.name} was created!`;

        return event.payload.commits.map((commit: any) => 
            this.createEmbed(event, commit.message, description, repoUrl));
    }

}

export abstract class AbstractCreateConverter extends AbstractChainingEventToEmbedsConverter {

    constructor(private ref_type: string, color: ColorResolvable) {
        super(color);
    }

    protected canConvert(event: any): boolean {
        return event?.type === 'CreateEvent' && event?.payload.ref_type === this.ref_type;
    }

}

export class CreateRepositoryConverter extends AbstractCreateConverter {

    constructor() {
        super('repository', '#00ff55');
    }

    protected convert(event: any): MessageEmbed[] {
        const repoUrl: string = this.getRepositoryUrl(event);
        return [this.createEmbed(event, event.repo.name, 'New repository was created!', repoUrl)];
    }

}

export class CreateBranchConverter extends AbstractCreateConverter {

    constructor() {
        super('branch', '#00ffa6');
    }

    protected convert(event: any): MessageEmbed[] {
        const repoUrl: string = this.getRepositoryUrl(event);
        const description: string = `New branch in repository ${event.repo.name} was created!`;
        return [this.createEmbed(event, event.payload.ref, description, repoUrl)];
    }

}

export abstract class AbstractIssueConverter extends AbstractChainingEventToEmbedsConverter {

    constructor(private action: string, color: ColorResolvable) {
        super(color);
    }

    protected canConvert(event: any): boolean {
        return event?.type === 'IssuesEvent' && event?.payload.action === this.action;
    }

}

export class OpenIssueConverter extends AbstractIssueConverter {

    constructor() {
        super('opened', '#9900ff');
    }

    protected convert(event: any): MessageEmbed[] {
        const title: string = event.payload.issue.title;
        const issueUrl: string = event.payload.issue.html_url;
        const description: string = `New issue in repository ${event.repo.name} was opened!`;
        
        const bodyField: EmbedFieldData = {
            name: 'Issue Content',
            value: trimString(event.payload.issue.body, 128)
        }
    
        const embed: MessageEmbed = this.createEmbed(event, title, description, issueUrl);
        embed.addFields(bodyField);

        return [embed];
    }

}

export class CloseIssueConverter extends AbstractIssueConverter {

    constructor() {
        super('closed', '#ff0048');
    }

    protected convert(event: any): MessageEmbed[] {
        const title: string = event.payload.issue.title;
        const issueUrl: string = event.payload.issue.html_url;    
        const description: string = `Issue in repository ${event.repo.name} was closed!`;

        return [this.createEmbed(event, title, description, issueUrl)];
    }

}

export class ReopenIssueConverter extends AbstractIssueConverter {

    constructor() {
        super('reopened', '#ff00ea');
    }

    protected convert(event: any): MessageEmbed[] {
        const title: string = event.payload.issue.title;
        const issueUrl: string = event.payload.issue.html_url;
        const description: string = `Issue in repository ${event.repo.name} was reopened!`;
        
        return [this.createEmbed(event, title, description, issueUrl)];
    }

}

export class IssueCommentConverter extends AbstractChainingSpecificEventToEmbedsConverter {

    constructor() {
        super('IssueCommentEvent', '#ff00c8');
    }

    protected convert(event: any): MessageEmbed[] {
        const title: string = event.payload.issue.title;
        const description: string = `New comment was added to issue in repository ${event.repo.name}!`;
        const commentUrl: string = event.payload.comment.html_url;
    
        const bodyField: EmbedFieldData = { 
            name: 'Comment Text', 
            value: trimString(event.payload.comment.body, 128)
        };
    
        const embed: MessageEmbed = this.createEmbed(event, title, description, commentUrl);
        embed.addFields(bodyField);

        return [embed];
    }

}

export class ForkConverter extends AbstractChainingSpecificEventToEmbedsConverter {

    constructor() {
        super('ForkEvent', '#f2ff00');
    }

    protected convert(event: any): MessageEmbed[] {
        const title: string = event.payload.forkee.full_name;
        const description: string = `The repository ${event.repo.name} was forked into ${title}!`;
        const newRepoUrl: string = `https://github.com/${title}`;
    
        return [this.createEmbed(event, title, description, newRepoUrl)];
    }

}

export class WatchConverter extends AbstractChainingSpecificEventToEmbedsConverter {

    constructor() {
        super('WatchEvent', '#7a2d00');
    }

    protected convert(event: any): MessageEmbed[] {
        const title: string = event.repo.name;
        const description: string = `${event.actor.login} started stargazing the ${event.repo.name} repository!`;
        const repoUrl: string = this.getRepositoryUrl(event);
    
        return [this.createEmbed(event, title, description, repoUrl)];
    }

}

export class UnknownToConsoleConverter extends AbstractEventToEmbedsConverter {
    
    constructor() {
        super('DEFAULT');
    }

    public convertToEmbed(event: any): null {
        const actorName: string = event.actor.login;
        const eventType: string = event.type;
        const repoName: string = event.repo.name;
        console.warn(`Unknown event '${eventType}' in repository ${repoName} by ${actorName}`);
        return null;
    }

}

export const ALL_CHAINING_CONVERTER_CONSTRUCTORS: ChainingEventToEmbedsConverterConstructor[] = [
    PushConverter,
    CreateRepositoryConverter,
    CreateBranchConverter,
    OpenIssueConverter,
    CloseIssueConverter,
    ReopenIssueConverter,
    IssueCommentConverter,
    ForkConverter,
    WatchConverter
];
