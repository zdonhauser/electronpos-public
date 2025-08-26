// globals.d.ts
export {};

declare global {
    declare namespace NodeJS {
        interface Process {
            resourcesPath: string;
        }
    }
    
}
