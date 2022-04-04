export function getHodlerFilePath(name: any) {
    return `./server-middleware/hodlers-${name}.json`
}

export function getConfigFilePath(name: any) {
    return `./config/prod-${name}.json`
}

export function getVoteFilePath(project: any) {
    return `./config/vote-${project}.json`
}

export function getVoteResultsFilePath(project: any, id: any) {
    return `./config/vote-results-${project}-${id}.json`
}

export function getPublicKeyFilePath(address: any) {
    return `./config/publicKey-${address}.json`
}

export function getSalesFilePath(updateAuthority: any) {
    return `sales-${updateAuthority}-console.json`
}

export function getSalesTrackerLockPath() {
    return "sales-tracker-running"
}

export function getSalesTrackerSuccessPath() {
    return "sales-tracker-success"
}

export function getRevalidationSuccessPath() {
    return "revalidation-success"
}