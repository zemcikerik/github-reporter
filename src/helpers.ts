import { ChainingEventToEmbedsConverter, ChainingEventToEmbedsConverterConstructor, EventToEmbedsConverter } from "./embeds";

export function trimString(str: string, maxSize: number = 40): string {
    return str.length > maxSize
        ? `${str.substring(0, maxSize - 3)}...`
        : str;
}

export function createAndJoinChainingConverters(constructors: ChainingEventToEmbedsConverterConstructor[]): EventToEmbedsConverter {
    const converters: ChainingEventToEmbedsConverter[] = constructors.map(constructor => new constructor());

    for (let i = 0; i < constructors.length - 1; i++) {
        converters[i].setNextConverter(converters[i + 1]);
    }

    return converters[0];
}