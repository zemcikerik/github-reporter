import { ColorResolvable, EmbedFieldData, MessageEmbed, TextChannel } from 'discord.js';
import { trimString } from './helpers';

export interface EventToEmbedsConverter {
    convertToEmbed(event: any): MessageEmbed[] | null;
}

export interface ChainingEventToEmbedsConverter extends EventToEmbedsConverter {
    setNextConverter(converter: EventToEmbedsConverter): void;
}

export interface ChainingEventToEmbedsConverterConstructor {
    new(): ChainingEventToEmbedsConverter;
}

export abstract class AbstractChainingEventToEmbedsConverter implements ChainingEventToEmbedsConverter {

    protected nextConverter: EventToEmbedsConverter | undefined;

    constructor (protected color: ColorResolvable) 
    { }

    protected abstract canConvert(event: any): boolean;
    protected abstract convert(event: any): MessageEmbed[];

    public convertToEmbed(event: any): MessageEmbed[] | null {
        return this.canConvert(event)
            ? this.convert(event)
            : this.nextConverter?.convertToEmbed(event) ?? null;
    }
    
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

export class CreateRepositoryConverter extends AbstractChainingEventToEmbedsConverter {

    constructor() {
        super('#00ff55');
    }

    protected canConvert(event: any): boolean {
        return event?.type === 'CreateEvent' && event?.payload.ref_type === 'repository';
    }

    protected convert(event: any): MessageEmbed[] {
        const repoUrl: string = this.getRepositoryUrl(event);
        return [this.createEmbed(event, event.repo.name, 'New repository was created!', repoUrl)];
    }

}

export class CreateBranchConverter extends AbstractChainingEventToEmbedsConverter {

    constructor() {
        super('#00ffa6');
    }

    protected canConvert(event: any): boolean {
        return event?.type === 'CreateEvent' && event?.payload.ref_type === 'branch';
    }

    protected convert(event: any): MessageEmbed[] {
        const repoUrl: string = this.getRepositoryUrl(event);
        const description: string = `New branch in repository ${event.repo.name} was created!`;
        return [this.createEmbed(event, event.payload.ref, description, repoUrl)];
    }

}

export class OpenIssueConverter extends AbstractChainingEventToEmbedsConverter {

    constructor() {
        super('#9900ff');
    }

    protected canConvert(event: any): boolean {
        return event?.type === 'IssuesEvent' && event?.payload.action === 'opened';
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

export class CloseIssueConverter extends AbstractChainingEventToEmbedsConverter {

    constructor() {
        super('#ff0048');
    }

    protected canConvert(event: any): boolean {
        return event?.type === 'IssuesEvent' && event?.payload.action === 'closed';
    }

    protected convert(event: any): MessageEmbed[] {
        const title: string = event.payload.issue.title;
        const issueUrl: string = event.payload.issue.html_url;    
        const description: string = `Issue in repository ${event.repo.name} was closed!`;

        return [this.createEmbed(event, title, description, issueUrl)];
    }

}

export class ReopenIssueConverter extends AbstractChainingEventToEmbedsConverter {

    constructor() {
        super('#ff00ea');
    }

    protected canConvert(event: any): boolean {
        return event?.type === 'IssuesEvent' && event?.payload.action === 'reopened';
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