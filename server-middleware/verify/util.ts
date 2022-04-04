const xss = require("xss")

// safety to ensure large data isn't stored
const maxStringLength = 255

// converts a string to camel case
export function toCamelCase(str: string) {
    // Lower cases the string
    return str.toLowerCase()
        // Replaces any - or _ characters with a space 
        .replace(/[-_]+/g, ' ')
        // Removes any non alphanumeric characters 
        .replace(/[^\w\s]/g, '')
        // Uppercases the first character in each group immediately following a space 
        // (delimited by spaces) 
        .replace(/ (.)/g, function ($1) { return $1.toUpperCase(); })
        // Removes spaces 
        .replace(/ /g, '');
}

// trims whitespace, sanitizes and strips any XSS threats
export function getFieldValue(v: string) {
    var sanitizedVal = xss(v.trim())
    if (sanitizedVal.length > maxStringLength) {
        sanitizedVal = sanitizedVal.substring(0, maxStringLength)
    }
    return sanitizedVal
}