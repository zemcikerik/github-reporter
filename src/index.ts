import { defer, from, interval, of, zip } from 'rxjs';
import { filter, map, mergeMap, repeat, tap } from 'rxjs/operators';
import { MessageEmbed } from 'discord.js';

import { FileConfiguration } from './configuration';
import { Discord } from './discord';
import { GitHub } from './github';

import { ALL_CHAINING_CONVERTER_CONSTRUCTORS, EventToEmbedsConverter, UnknownToConsoleConverter } from './embeds';
import { createAndJoinChainingConverters } from './helpers';
import { CommandHandler, TestCommandHandler } from './commands';
import { resolve as resolvePath } from 'path';


const config: FileConfiguration = new FileConfiguration(resolvePath(__dirname, '../bot-config.json'));
const discord: Discord = new Discord(config);
const github: GitHub = new GitHub(config);

const commandHandler: CommandHandler = new TestCommandHandler(discord, config);
const converter: EventToEmbedsConverter = createAndJoinChainingConverters(ALL_CHAINING_CONVERTER_CONSTRUCTORS, UnknownToConsoleConverter);

config.load()
.then(async () => {
    await discord.init();

    config.onChange$.subscribe(async _ => await config.save());

    defer(() => of(config.delayBetweenRequests))
    .pipe(
        mergeMap(delay => 
            zip(
                defer(() => from(config.people)),
                interval(delay)
            )
        ),
        tap(person => console.log(person)),
        map(([person, _]) => person),
        mergeMap(person => github.getNewestEvents(person)),
        map(event => converter.convertToEmbed(event)),
        filter(embeds => embeds !== null),
        mergeMap(embeds => from(<MessageEmbed[]> embeds)),
        repeat()
    )
    .subscribe({
        next: async embed => await discord.sendEmbed(embed),
        error: err => console.error(err)
    });

    discord.onCommand$.subscribe({
        next: async command => await commandHandler.handleCommand(command),
        error: err => console.error(err)
    })
})
.catch(err => console.error(err));
