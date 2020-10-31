import { ChainingEventToEmbedsConverter, 
    ChainingEventToEmbedsConverterConstructor, 
    EventToEmbedsConverter, 
    EventToEmbedsConverterConstructor } from "./embeds";

export function trimString(str: string, maxSize: number = 40): string {
    return str.length > maxSize
        ? `${str.substring(0, maxSize - 3)}...`
        : str;
}

export function createAndJoinChainingConverters(constructors: ChainingEventToEmbedsConverterConstructor[],
    endingConstructor: EventToEmbedsConverterConstructor): EventToEmbedsConverter {
    const converters: ChainingEventToEmbedsConverter[] = constructors.map(constructor => new constructor());

    for (let i = 0; i < converters.length - 1; i++) {
        converters[i].setNextConverter(converters[i + 1]);
    }

    converters[converters.length - 1].setNextConverter(new endingConstructor());
    return converters[0];
}
