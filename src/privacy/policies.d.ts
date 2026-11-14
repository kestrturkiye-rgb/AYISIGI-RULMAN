export type Controller={name:string;address:string;email:string;brand:string;retention:string;transfers:string;updated:string};
export const legalPages:{slug:string;title:string}[];
export function legalSlug(path:string):string|null;
export function controllerDetails(settings?:Record<string,any>,company?:Record<string,any>):Controller;
export function policyDocument(slug:string,details:Controller):Record<string,any>;
export const storageInventory:string[][];
