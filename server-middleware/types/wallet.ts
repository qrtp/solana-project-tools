// To parse this data:
//
//   import { Convert, Wallet } from "./file";
//
//   const wallet = Convert.toWallet(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface Wallet {
    nfts?: Nft[];
    splBalance?: number;
}

export interface Nft {
    key?: number;
    updateAuthority?: string;
    mint?: string;
    data?: Data;
    primarySaleHappened?: number;
    isMutable?: number;
    editionNonce?: null;
    attributes?: Attribute[];
}

export interface Attribute {
    trait_type?: string;
    value?: string;
}

export interface Data {
    name?: string;
    symbol?: string;
    uri?: string;
    sellerFeeBasisPoints?: number;
    creators?: Creator[];
}

export interface Creator {
    address?: string;
    verified?: number;
    share?: number;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toWallet(json: string): Wallet {
        return cast(JSON.parse(json), r("Wallet"));
    }

    public static walletToJson(value: Wallet): string {
        return JSON.stringify(uncast(value, r("Wallet")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any = ''): never {
    if (key) {
        throw Error(`Invalid value for key "${key}". Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
    }
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`,);
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) { }
        }
        return invalidValue(typs, val);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases, val);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue("array", val);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue("Date", val);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue("object", val);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, prop.key);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val);
    }
    if (typ === false) return invalidValue(typ, val);
    while (typeof typ === "object" && typ.ref !== undefined) {
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems") ? transformArray(typ.arrayItems, val)
                : typ.hasOwnProperty("props") ? transformObject(getProps(typ), typ.additional, val)
                    : invalidValue(typ, val);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "Wallet": o([
        { json: "nfts", js: "nfts", typ: u(undefined, a(r("Nft"))) },
        { json: "splBalance", js: "splBalance", typ: u(undefined, 0) },
    ], false),
    "Nft": o([
        { json: "key", js: "key", typ: u(undefined, 0) },
        { json: "updateAuthority", js: "updateAuthority", typ: u(undefined, "") },
        { json: "mint", js: "mint", typ: u(undefined, "") },
        { json: "data", js: "data", typ: u(undefined, r("Data")) },
        { json: "primarySaleHappened", js: "primarySaleHappened", typ: u(undefined, 0) },
        { json: "isMutable", js: "isMutable", typ: u(undefined, 0) },
        { json: "editionNonce", js: "editionNonce", typ: u(undefined, null) },
        { json: "attributes", js: "attributes", typ: u(undefined, a(r("Attribute"))) },
    ], false),
    "Attribute": o([
        { json: "trait_type", js: "trait_type", typ: u(undefined, "") },
        { json: "value", js: "value", typ: u(undefined, "") },
    ], false),
    "Data": o([
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "symbol", js: "symbol", typ: u(undefined, "") },
        { json: "uri", js: "uri", typ: u(undefined, "") },
        { json: "sellerFeeBasisPoints", js: "sellerFeeBasisPoints", typ: u(undefined, 0) },
        { json: "creators", js: "creators", typ: u(undefined, a(r("Creator"))) },
    ], false),
    "Creator": o([
        { json: "address", js: "address", typ: u(undefined, "") },
        { json: "verified", js: "verified", typ: u(undefined, 0) },
        { json: "share", js: "share", typ: u(undefined, 0) },
    ], false),
};
